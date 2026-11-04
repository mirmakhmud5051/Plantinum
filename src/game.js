import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { byId, TOOLS } from "./catalog.js";
import { clamp, createEntity, advanceGrowth, isPlaceable } from "./state.js";
import { BOX, entityVoxels, voxelMesh } from "./voxels.js";
import { World } from "./world.js";
import { GardenAudio } from "./audio.js";
import { GroundShadows } from "./ground-shadows.js";
import { graphicsProfile, QUALITY_LEVELS } from "./graphics.js";
import { t } from "./i18n.js";
import { usesCompactLayout } from "./layout.js";
import { BED_HEIGHT, bedAt, gardenSurface } from "./garden-layout.js";
export const EYE_HEIGHT = 1.68;

export class GardenGame extends EventTarget {
  constructor(container, state) {
    super();
    this.container = container;
    this.state = state;
    this.tool = "plant";
    this.plant = "smaragd";
    this.shape = "sphere";
    this.rotation = 0;
    this.meshes = new Map();
    this.history = [];
    this.keys = new Set();
    this.mode = "free";
    this.selected = null;
    this.moving = null;
    this.particles = [];
    this.joystick = { x: 0, y: 0 };
    this.panelOpen = false;
    this.paused = false;
    this.running = true;
    this.elapsed = 0;
    this.mobile = matchMedia("(pointer: coarse)").matches;
    this.autoQuality = null;
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
      alpha: false,
    });
    const gl = this.renderer.getContext(),
      debug = gl.getExtension("WEBGL_debug_renderer_info"),
      gpu = debug ? String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)) : "";
    this.software = /swiftshader|llvmpipe|software|microsoft basic/i.test(gpu);
    this.graphics = this.getGraphicsProfile();
    this.low = this.graphics.low;
    this.renderer.setPixelRatio(this.graphics.pixelRatio);
    this.renderer.shadowMap.enabled = this.graphics.shadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.domElement.setAttribute(
      "aria-label",
      t("Interactive 3D garden. Click to plant. Drag to look around."),
    );
    this.renderer.domElement.tabIndex = 0;
    container.append(this.renderer.domElement);
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#e8e2c8");
    this.scene.fog = new THREE.Fog("#e8e2c8", 28, 115);
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 260);
    this.camera.position.fromArray(state.view.position);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.fromArray(state.view.target);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.09;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 80;
    this.controls.maxPolarAngle = Math.PI * 0.475;
    this.controls.minPolarAngle = 0.1;
    this.controls.screenSpacePanning = false;
    this.controls.panSpeed = 0.75;
    this.hemi = new THREE.HemisphereLight(0xf5fcff, 0x7b9560, 2);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xffe9c5, 3.5);
    this.sun.position.set(-15, 26, 14);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.setScalar(this.graphics.shadowSize);
    Object.assign(this.sun.shadow.camera, {
      left: -24,
      right: 24,
      top: 24,
      bottom: -24,
      near: 0.1,
      far: 90,
    });
    this.sun.shadow.normalBias = 0.04;
    this.sun.shadow.bias = -0.0003;
    this.sun.shadow.radius = 3;
    this.scene.add(this.sun, this.sun.target);
    this.lanternLights = Array.from({ length: 4 }, () => {
      const light = new THREE.PointLight(0xffd79c, 0, 7, 1.6);
      this.scene.add(light);
      return light;
    });
    this.world = new World(this.scene, this.low, this.graphics.radius);
    state.entities.forEach((e) => this.rebuild(e));
    this.groundShadows = new GroundShadows(this.scene);
    this.groundShadows.update(state.entities);
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.18);
    this.groundPoint = new THREE.Vector3();
    this.bedPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -BED_HEIGHT);
    this.bedPoint = new THREE.Vector3();
    this.pointerInside = false;
    this.selectionBox = new THREE.Box3Helper(new THREE.Box3(), 0xf5f1c7);
    this.selectionBox.visible = false;
    this.scene.add(this.selectionBox);
    const ringGeo = new THREE.RingGeometry(0.42, 0.47, 32);
    ringGeo.rotateX(-Math.PI / 2);
    this.ring = new THREE.Mesh(
      ringGeo,
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      }),
    );
    this.ring.visible = false;
    this.scene.add(this.ring);
    this.audio = new GardenAudio();
    this.audio.volume = state.settings.volume;
    this.createGhost();
    this.bindInput();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
    if (state.view.mode === "walk" || state.view.styleVersion !== 2) {
      this.setCamera("walk");
      if (state.view.mode === "walk" && state.view.walkPosition)
        this.camera.position.fromArray(state.view.walkPosition);
      this.camera.position.set(
        clamp(this.camera.position.x, -state.bounds + 1, state.bounds - 1),
        EYE_HEIGHT,
        clamp(this.camera.position.z, -state.bounds + 1, state.bounds - 1),
      );
      this.yaw = Number(state.view.yaw) || 0;
      this.pitch = clamp(Number.isFinite(state.view.pitch) ? state.view.pitch : -0.12, -1.35, 1.35);
      this.walkZoom = clamp(Number.isFinite(state.view.walkZoom) ? state.view.walkZoom : 1, 0.65, 1.4);
      this.resize();
    }
    this.clock = new THREE.Clock();
    this.lastChunk = 0;
    this.lastStats = 0;
    this.growthTick = 0;
    this.frameTimes = [];
    this.renderer.setAnimationLoop(() => this.frame());
    this.contextLost = (e) => {
      e.preventDefault();
      this.emit(
        "error",
        "3D rendering was interrupted. Reload the page to restore your saved garden.",
      );
    };
    this.renderer.domElement.addEventListener(
      "webglcontextlost",
      this.contextLost,
    );
  }
  emit(type, detail) {
    if (type === "change") this.groundShadows?.update(this.state.entities);
    if (type === "notice" || type === "error") detail = t(detail);
    this.dispatchEvent(new CustomEvent(type, { detail }));
  }
  resize() {
    const w = this.container.clientWidth,
      h = this.container.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.fov = this.mode === "walk"
      ? Math.min(90, Math.max(40, (w < h ? 74 : 60) * (this.walkZoom || 1)))
      : w / h < 0.8 ? 58 : 38;
    this.camera.setViewOffset(
      w,
      h,
      this.mode === "free" && this.panelOpen && !usesCompactLayout() ? -145 : 0,
      0,
      w,
      h,
    );
    this.camera.updateProjectionMatrix();
  }
  snapshot() {
    this.history.push(JSON.stringify(this.state.entities));
    if (this.history.length > 35) this.history.shift();
    this.emit("history", this.history.length);
  }
  undo() {
    if (!this.history.length) {
      this.emit("notice", "Your next change will appear here.");
      return;
    }
    this.cancelMove();
    this.state.entities = JSON.parse(this.history.pop());
    this.meshes.forEach((m) => {
      this.scene.remove(m);
      m.dispose();
    });
    this.meshes.clear();
    this.state.entities.forEach((e) => this.rebuild(e));
    this.select(null);
    this.emit("history", this.history.length);
    this.emit("change");
    this.emit("notice", "One little step back. Change undone.");
  }
  rebuild(entity) {
    const old = this.meshes.get(entity.id);
    if (old) {
      this.scene.remove(old);
      old.dispose();
    }
    const mesh = voxelMesh(entityVoxels(entity));
    mesh.userData.entityId = entity.id;
    mesh.position.set(entity.x, gardenSurface(entity.x, entity.z), entity.z);
    mesh.rotation.y = entity.rotation;
    const scale = byId(entity.type).category?.length
      ? 0.2 + 0.8 * entity.growth
      : 1;
    mesh.scale.setScalar(scale);
    this.meshes.set(entity.id, mesh);
    this.scene.add(mesh);
    return mesh;
  }
  createGhost() {
    if (this.ghost) {
      this.scene.remove(this.ghost);
      this.ghost.dispose();
      this.ghost.material.dispose();
    }
    const source = this.moving || this.copyTemplate;
    const type = source?.type || this.plant,
      material = new THREE.MeshLambertMaterial({
        transparent: true,
        opacity: 0.43,
        depthWrite: false,
      });
    this.ghost = voxelMesh(
      entityVoxels(
        {
          type,
          seed: source?.seed ?? 17,
          shape: source?.shape || "natural",
          growth: source?.growth ?? 1,
          removed: source?.removed || [],
        },
        { preview: !source },
      ),
      material,
    );
    this.ghost.castShadow = false;
    if (source && byId(type).category) this.ghost.scale.setScalar(0.2 + 0.8 * source.growth);
    this.ghost.receiveShadow = false;
    this.ghost.visible = false;
    this.scene.add(this.ghost);
  }
  setPlant(id) {
    this.cancelMove();
    this.copyTemplate = null;
    this.plant = id;
    if (this.mobile) {
      this.pointer.set(0, 0);
      this.pointerInside = true;
    }
    this.setTool("plant");
    this.createGhost();
    this.emit("plant", id);
  }
  setTool(id) {
    if (this.moving && id !== "move") this.cancelMove();
    this.tool = id;
    this.ghost.visible = false;
    this.ring.visible = false;
    this.emit("tool", id);
  }
  setShape(shape) {
    this.shape = shape;
    this.setTool("shape");
  }
  select(entity) {
    this.selected = entity;
    this.selectionBox.visible = !!entity;
    this.emit("select", entity);
  }
  rotate() {
    if (this.moving || this.tool === "plant") {
      this.rotation += Math.PI / 2;
      if (this.ghost) this.ghost.rotation.y = this.rotation;
      this.emit("notice", "Rotated 90°");
    } else if (this.selected) {
      this.snapshot();
      this.selected.rotation += Math.PI / 2;
      this.rebuild(this.selected);
      this.emit("change");
    } else
      this.emit(
        "notice",
        "Select an object first, or choose a plant to place.",
      );
  }
  copySelected() {
    if (!this.selected) {
      this.emit("notice", "Click an object first to make a copy.");
      return;
    }
    const template = structuredClone(this.selected);
    this.setPlant(template.type);
    this.copyTemplate = template;
    this.rotation = template.rotation;
    this.createGhost();
    this.emit(
      "notice",
      `Ready to plant another ${byId(this.selected.type).name}.`,
    );
  }
  cancelMove() {
    if (this.moving) {
      const mesh = this.meshes.get(this.moving.id);
      if (mesh) mesh.visible = true;
      this.moving = null;
      this.createGhost();
    }
  }
  getGround() {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const raised = this.bedPlane && this.raycaster.ray.intersectPlane(this.bedPlane, this.bedPoint);
    if (raised && bedAt(raised.x, raised.z)) return this.groundPoint.copy(raised);
    return this.raycaster.ray.intersectPlane(this.ground, this.groundPoint);
  }
  entityHit() {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(
      [...this.meshes.values()].filter((m) => m.visible),
      true,
    );
    return hits[0];
  }
  updatePointer(event) {
    const r = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(
      ((event.clientX - r.left) / r.width) * 2 - 1,
      (-(event.clientY - r.top) / r.height) * 2 + 1,
    );
    this.pointerInside = true;
  }
  updateGhost() {
    this.pending = null;
    if (
      !(this.tool === "plant" || this.moving) ||
      !this.pointerInside
    ) {
      this.ghost.visible = false;
      this.ring.visible = false;
      return;
    }
    if (!this.getGround()) {
      this.ghost.visible = false;
      this.ring.visible = false;
      return;
    }
    const x = Math.round(this.groundPoint.x * 2) / 2,
      z = Math.round(this.groundPoint.z * 2) / 2;
    const ok = this.canPlace(x, z);
    this.ghost.visible = true;
    this.ghost.position.set(x, gardenSurface(x, z), z);
    this.ghost.rotation.y = this.rotation;
    this.ghost.material.color.set(ok ? 0xd2ffd0 : 0xf08075);
    this.ring.visible = true;
    this.ring.position.set(x, gardenSurface(x, z) + 0.055, z);
    this.ring.material.color.set(ok ? 0xfaf9d4 : 0xe87167);
    this.pending = { x, z, ok };
  }
  canPlace(x, z) {
    const p = byId(this.moving?.type || this.plant);
    if (
      p &&
      !p.category &&
      ["stone-path", "wood-path", "bridge"].includes(p.kind)
    )
      return (
        Math.abs(x) < this.state.bounds &&
        Math.abs(z) < this.state.bounds &&
        !this.state.entities.some(
          (e) =>
            e.id !== this.moving?.id && Math.hypot(x - e.x, z - e.z) < 0.45,
        )
      );
    return isPlaceable(
      x,
      z,
      this.state.entities,
      this.state.bounds,
      this.moving?.id,
    );
  }
  act() {
    if (this.paused) return;
    if (this.tool === "plant" || this.moving) this.updateGhost();
    const hit = this.entityHit(),
      entity = hit
        ? this.state.entities.find((e) => e.id === hit.object.userData.entityId)
        : null;
    if (this.moving) {
      if (!this.pending?.ok) {
        this.emit("notice", "Find a free patch of earth for this plant.");
        return;
      }
      this.snapshot();
      const e = this.moving;
      e.x = this.pending.x;
      e.z = this.pending.z;
      e.rotation = this.rotation;
      this.moving = null;
      this.rebuild(e);
      this.createGhost();
      this.select(e);
      this.audio.effect("move");
      this.emit("change");
      this.emit("notice", "A fresh spot to put down roots.");
      return;
    }
    if (this.tool === "plant") {
      if (entity) {
        this.select(entity);
        this.emit(
          "notice",
          `${byId(entity.type).name} selected. Choose a gardening tool to care for it.`,
        );
        return;
      }
      this.updateGhost();
      if (!this.pending?.ok) {
        this.emit(
          "notice",
          "Choose an open spot. Paths and ponds need a little room.",
        );
        return;
      }
      this.snapshot();
      const { x, z } = this.pending,
        p = byId(this.plant),
        e = createEntity(this.plant, x, z, p.category ? 0.35 : 1);
      if (this.copyTemplate) {
        const { id, x: nextX, z: nextZ } = e;
        Object.assign(e, structuredClone(this.copyTemplate), { id, x: nextX, z: nextZ });
      }
      e.rotation = this.rotation;
      this.state.entities.push(e);
      this.rebuild(e);
      this.select(e);
      this.burst(new THREE.Vector3(x, 0.3, z), p.color, 12);
      this.audio.effect("plant");
      this.emit("planted", e);
      this.emit("change");
      this.emit(
        "notice",
        `${p.name} planted. A little water will help it grow.`,
      );
      return;
    }
    if (!entity) {
      this.select(null);
      this.emit(
        "notice",
        TOOLS.find((t) => t.id === this.tool)?.hint ||
          "Choose a plant to care for.",
      );
      return;
    }
    this.select(entity);
    const p = byId(entity.type);
    if (["water", "hose"].includes(this.tool)) {
      if (!p.category) {
        this.emit("notice", "Water is for your living plants.");
        return;
      }
      this.snapshot();
      const list =
        this.tool === "hose"
          ? this.state.entities.filter(
              (e) =>
                byId(e.type).category &&
                Math.hypot(e.x - entity.x, e.z - entity.z) < 4,
            )
          : [entity];
      list.forEach((e) => {
        e.water = 1;
        e.growth = clamp(e.growth + 0.07, 0, 1);
        this.rebuild(e);
        this.burst(new THREE.Vector3(e.x, 1, e.z), "#a1d9e7", 18);
      });
      this.audio.effect(this.tool);
      this.emit("watered", entity);
      this.emit(
        "notice",
        list.length > 1
          ? `${list.length} plants watered. Happy roots, happy garden.`
          : "A refreshing drink. Your plant is growing!",
      );
    } else if (this.tool === "trim") {
      if (!p.category) {
        this.emit("notice", "Choose a leafy plant to trim.");
        return;
      }
      const voxel = hit.object.userData.voxels[hit.instanceId];
      if (!voxel?.leaf) {
        this.emit("notice", "Aim for a leaf to trim it.");
        return;
      }
      this.snapshot();
      entity.removed.push(voxel.id);
      this.burst(hit.point, p.color, 9);
      this.rebuild(entity);
      this.audio.effect("trim");
      this.emit("notice", "A fresh cut. Room for new growth.");
    } else if (this.tool === "shape") {
      if (
        !["bush", "hedge", "column", "conifer", "flowerbush"].includes(p.kind)
      ) {
        this.emit("notice", "Choose a shrub or evergreen for a topiary shape.");
        return;
      }
      this.snapshot();
      entity.shape = this.shape;
      entity.removed = [];
      this.rebuild(entity);
      this.burst(new THREE.Vector3(entity.x, 1, entity.z), p.color, 30);
      this.audio.effect("shape");
      this.emit(
        "notice",
        `${this.shape[0].toUpperCase() + this.shape.slice(1)} topiary. A little living sculpture.`,
      );
    } else if (this.tool === "move") {
      this.moving = entity;
      this.rotation = entity.rotation;
      this.meshes.get(entity.id).visible = false;
      this.createGhost();
      this.emit("notice", "Choose a new spot. R rotates · Esc cancels.");
      return;
    } else if (this.tool === "remove") {
      this.snapshot();
      this.state.entities = this.state.entities.filter(
        (e) => e.id !== entity.id,
      );
      const mesh = this.meshes.get(entity.id);
      this.scene.remove(mesh);
      mesh.dispose();
      this.meshes.delete(entity.id);
      this.burst(new THREE.Vector3(entity.x, 0.5, entity.z), "#baa27d", 12);
      this.select(null);
      this.audio.effect("remove");
      this.emit("notice", "Cleared a little space. Undo can bring it back.");
    } else if (this.tool === "saw") {
      if (!p.category) {
        this.emit("notice", "Choose a plant to prune.");
        return;
      }
      this.snapshot();
      entity.growth = Math.max(0.15, entity.growth - 0.2);
      entity.removed = [];
      this.rebuild(entity);
      this.burst(hit.point, p.color, 18);
      this.audio.effect("saw");
      this.emit("notice", "Pruned back. Fresh growth is on its way.");
    }
    this.emit("select", this.selected);
    this.emit("change");
  }
  burst(position, color, count) {
    const material = new THREE.MeshBasicMaterial({ color });
    for (let i = 0; i < count; i++) {
      let p = this.particles.find((p) => !p.alive);
      if (!p) {
        p = { mesh: new THREE.Mesh(BOX, material), alive: false };
        this.scene.add(p.mesh);
        this.particles.push(p);
      } else p.mesh.material = material;
      p.mesh.position.copy(position);
      p.mesh.scale.setScalar(0.055 + Math.random() * 0.045);
      p.mesh.visible = true;
      p.alive = true;
      p.life = 0.7 + Math.random() * 0.6;
      p.maxLife = p.life;
      p.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        1.4 + Math.random() * 1.2,
        (Math.random() - 0.5) * 2,
      );
    }
    // All particles in a burst share a material; dispose after their last use.
    this.effectMaterials ??= [];
    this.effectMaterials.push({ material, until: this.elapsed + 2 });
  }
  setCamera(mode = this.mode === "free" ? "walk" : "free") {
    this.cancelMove();
    this.mode = mode;
    if (mode === "walk") {
      this.freeView = {
        position: this.camera.position.clone(),
        target: this.controls.target.clone(),
      };
      this.camera.position.set(-0.9, EYE_HEIGHT, 6.5);
      this.yaw = 0;
      this.pitch = -0.12;
      this.walkZoom = 1;
      this.controls.enabled = false;
      this.camera.rotation.order = "YXZ";
      this.camera.rotation.set(this.pitch, 0, 0);
    } else {
      this.controls.enabled = true;
      this.camera.rotation.order = "XYZ";
      this.camera.position.copy(
        this.freeView?.position || new THREE.Vector3(23, 24, 29),
      );
      this.controls.target.copy(this.freeView?.target || new THREE.Vector3());
      this.controls.update();
    }
    this.resize();
    this.camera.updateMatrixWorld();
    this.emit("camera", mode);
    this.emit(
      "notice",
      mode === "walk"
        ? "Take a stroll. WASD to walk · drag to look around."
        : "A bird’s-eye view. Drag to orbit · scroll to zoom.",
    );
  }
  home() {
    if (this.mode !== "walk") this.setCamera("walk");
    this.camera.position.set(-0.9, EYE_HEIGHT, 6.5);
    this.yaw = 0;
    this.pitch = -0.12;
    this.walkZoom = 1;
    this.resize();
    this.emit("notice", "Home, sweet garden.");
  }
  zoom(factor) {
    if (this.mode === "walk") {
      this.walkZoom = clamp((this.walkZoom || 1) * factor, 0.65, 1.4);
      this.resize();
      return;
    }
    const offset = this.camera.position.clone().sub(this.controls.target);
    offset.multiplyScalar(factor);
    offset.clampLength(5, 80);
    this.camera.position.copy(this.controls.target).add(offset);
    this.controls.update();
  }
  bindInput() {
    const canvas = this.renderer.domElement;
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    this.activePointers = new Set();
    this.touchPoints = new Map();
    canvas.addEventListener("pointerdown", (e) => {
      this.activePointers.add(e.pointerId);
      this.touchPoints.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.activePointers.size > 1) this.multiTouch = true;
      if (this.mode === "walk" && this.touchPoints.size === 2) {
        const [a, b] = [...this.touchPoints.values()];
        this.pinchDistance = Math.hypot(a.x - b.x, a.y - b.y);
        this.pinchZoom = this.walkZoom || 1;
      }
      this.down = {
        x: e.clientX,
        y: e.clientY,
        button: e.button,
        id: e.pointerId,
        dragged: false,
      };
      if (this.mode === "walk") canvas.setPointerCapture(e.pointerId);
      this.previous = { x: e.clientX, y: e.clientY };
      this.updatePointer(e);
      if (this.state.settings.sound && !this.audio.enabled)
        this.audio.setEnabled(true, this.state.settings.volume).catch(() => {});
    });
    canvas.addEventListener("pointermove", (e) => {
      this.updatePointer(e);
      if (this.touchPoints.has(e.pointerId))
        this.touchPoints.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.mode === "walk" && this.multiTouch && this.touchPoints.size === 2) {
        const [a, b] = [...this.touchPoints.values()];
        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        if (distance > 1 && this.pinchDistance > 1) {
          this.walkZoom = clamp(this.pinchZoom * this.pinchDistance / distance, 0.65, 1.4);
          this.resize();
        }
      }
      if (
        this.down?.id === e.pointerId &&
        Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y) >= 7
      )
        this.down.dragged = true;
      if (
        this.mode === "walk" &&
        this.down?.id === e.pointerId &&
        !this.multiTouch
      ) {
        this.yaw -= (e.clientX - this.previous.x) * 0.004;
        this.pitch = clamp(
          this.pitch - (e.clientY - this.previous.y) * 0.004,
          -1.35,
          1.35,
        );
        this.previous = { x: e.clientX, y: e.clientY };
      }
    });
    canvas.addEventListener("pointerup", (e) => {
      if (
        !this.multiTouch &&
        this.down?.id === e.pointerId &&
        !this.down.dragged &&
        Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y) < 7 &&
        e.button === 0
      ) {
        this.updatePointer(e);
        this.act();
      }
      this.activePointers.delete(e.pointerId);
      this.touchPoints.delete(e.pointerId);
      if (this.activePointers.size === 0) this.multiTouch = false;
      if (this.down?.id === e.pointerId) this.down = null;
      if (this.mode === "walk" && canvas.hasPointerCapture(e.pointerId))
        canvas.releasePointerCapture(e.pointerId);
    });
    const cancelPointer = (e) => {
      this.activePointers.delete(e.pointerId);
      this.touchPoints.delete(e.pointerId);
      if (!this.activePointers.size) this.multiTouch = false;
      if (this.down?.id === e.pointerId) this.down = null;
    };
    canvas.addEventListener("pointercancel", cancelPointer);
    canvas.addEventListener("lostpointercapture", cancelPointer);
    canvas.addEventListener("wheel", (e) => {
      if (this.mode === "walk" && !this.paused) {
        e.preventDefault();
        this.zoom(Math.exp(e.deltaY * 0.001));
      }
    }, { passive: false });
    canvas.addEventListener("pointerleave", () => {
      this.pointerInside = false;
      this.down = null;
    });
    this.onKeyDown = (e) => {
      if (
        e.target.matches("input,select,textarea") ||
        document.querySelector("dialog[open]")
      )
        return;
      this.keys.add(e.code);
      if (
        ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
          e.code,
        )
      )
        e.preventDefault();
      if (e.repeat) return;
      const n = Number(e.key);
      if (n >= 1 && n <= 8) this.setTool(TOOLS[n - 1].id);
      if (e.code === "KeyC") this.setCamera();
      if (e.code === "KeyR") this.rotate();
      if (e.code === "KeyE" || e.code === "Space") {
        this.pointer.set(0, 0);
        this.pointerInside = true;
        this.updateGhost();
        this.act();
      }
      if (e.code === "Escape") {
        this.cancelMove();
        this.select(null);
      }
      if ((e.ctrlKey || e.metaKey) && e.code === "KeyZ") {
        e.preventDefault();
        this.undo();
      }
    };
    this.onKeyUp = (e) => this.keys.delete(e.code);
    this.onBlur = () => {
      this.keys.clear();
      this.activePointers.clear();
      this.touchPoints.clear();
      this.multiTouch = false;
      this.down = null;
      this.pointerInside = false;
      this.joystick = { x: 0, y: 0 };
    };
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
  }
  moveCamera(dt) {
    const side =
        (this.keys.has("KeyD") ? 1 : 0) -
        (this.keys.has("KeyA") ? 1 : 0) +
        this.joystick.x,
      forward =
        (this.keys.has("KeyW") ? 1 : 0) -
        (this.keys.has("KeyS") ? 1 : 0) -
        this.joystick.y;
    if (this.mode === "walk") {
      this.camera.rotation.set(this.pitch, this.yaw, 0, "YXZ");
      if (side || forward) {
        const v = new THREE.Vector3(side, 0, -forward)
          .normalize()
          .applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw)
          .multiplyScalar(dt * (this.keys.has("ShiftLeft") ? 8 : 3.5));
        this.camera.position.add(v);
        this.camera.position.x = clamp(
          this.camera.position.x,
          -this.state.bounds + 1,
          this.state.bounds - 1,
        );
        this.camera.position.z = clamp(
          this.camera.position.z,
          -this.state.bounds + 1,
          this.state.bounds - 1,
        );
        this.camera.position.y = EYE_HEIGHT;
      }
    } else {
      if (side || forward) {
        const dir = this.camera.getWorldDirection(new THREE.Vector3());
        dir.y = 0;
        dir.normalize();
        const right = new THREE.Vector3().crossVectors(
          dir,
          new THREE.Vector3(0, 1, 0),
        );
        const delta = dir
          .multiplyScalar(forward)
          .add(right.multiplyScalar(side))
          .multiplyScalar(dt * (this.keys.has("ShiftLeft") ? 15 : 8));
        this.controls.target.add(delta);
        this.camera.position.add(delta);
      }
      this.controls.target.x = clamp(
        this.controls.target.x,
        -this.state.bounds + 2,
        this.state.bounds - 2,
      );
      this.controls.target.z = clamp(
        this.controls.target.z,
        -this.state.bounds + 2,
        this.state.bounds - 2,
      );
      this.controls.update();
    }
  }
  getGraphicsProfile() {
    return graphicsProfile(
      this.state.settings.quality === "auto" && this.autoQuality
        ? this.autoQuality : this.state.settings.quality,
      { mobile: this.mobile, software: this.software, pixelRatio: devicePixelRatio },
    );
  }
  applyQuality() {
    this.graphics = this.getGraphicsProfile();
    this.low = this.graphics.low;
    this.renderer.setPixelRatio(this.graphics.pixelRatio);
    this.renderer.shadowMap.enabled = this.graphics.shadows;
    if (this.sun.shadow.mapSize.x !== this.graphics.shadowSize) {
      this.sun.shadow.map?.dispose();
      this.sun.shadow.map = null;
      this.sun.shadow.mapSize.setScalar(this.graphics.shadowSize);
    }
    this.renderer.shadowMap.needsUpdate = true;
    this.world.setQuality(this.low, this.graphics.radius);
    this.frameTimes.length = 0;
    this.resize();
  }
  setQuality(value) {
    this.state.settings.quality = QUALITY_LEVELS.includes(value) ? value : "auto";
    this.autoQuality = null;
    this.applyQuality();
    this.emit("change");
  }
  frame() {
    const realDelta = this.clock.getDelta(),
      dt = Math.min(realDelta, 0.05);
    if (!this.running) return;
    this.elapsed += dt;
    if (this.elapsed > 3 && !this.paused && !document.hidden) {
      this.frameTimes.push(realDelta);
      if (this.frameTimes.length > 90) this.frameTimes.shift();
    }
    if (!this.paused) {
      this.moveCamera(dt);
      this.camera.updateMatrixWorld();
      this.updateGhost();
      this.world.update(this.elapsed);
      this.growthTick += dt;
      if (this.growthTick > 0.5) {
        const time = this.growthTick;
        this.growthTick = 0;
        let changed = false;
        this.state.entities.forEach((e) => {
          if (advanceGrowth(e, time, this.state.speed)) {
            this.rebuild(e);
            changed = true;
          }
        });
        if (changed) this.groundShadows.update(this.state.entities);
      }
      if (this.state.settings.dayCycle)
        this.state.clock =
          (this.state.clock + dt * this.state.speed * 0.007) % 24;
    }
    const center =
      this.mode === "free" ? this.controls.target : this.camera.position;
    this.world.stream(center);
    if (this.elapsed - this.lastChunk > 0.08) {
      this.world.processChunk();
      this.lastChunk = this.elapsed;
    }
    const hour = this.state.clock,
      day = Math.max(0.05, Math.sin(((hour - 6) / 12) * Math.PI)),
      dusk = hour > 16 && hour < 20;
    const sky = new THREE.Color(
      hour < 6 || hour > 20 ? "#314957" : dusk ? "#efd2aa" : "#e8e2c8",
    );
    this.scene.background.lerp(sky, 0.02);
    this.scene.fog.color.copy(this.scene.background);
    this.hemi.intensity = 0.5 + day * 1.5;
    this.sun.intensity = 0.15 + day * 2.8;
    this.sun.color.set(dusk ? 0xffba86 : 0xffe9c5);
    this.sun.position.set(center.x - 15, 18 + day * 10, center.z + 14);
    this.sun.target.position.set(center.x, 0, center.z);
    this.sun.target.updateMatrixWorld();
    const lanterns = this.state.entities
      .filter((e) => e.type === "lamp")
      .sort(
        (a, b) =>
          Math.hypot(a.x - center.x, a.z - center.z) -
          Math.hypot(b.x - center.x, b.z - center.z),
      )
      .slice(0, 4);
    this.lanternLights.forEach((light, i) => {
      const e = lanterns[i];
      light.visible = day < 0.5 && !this.low;
      light.intensity = e ? Math.max(0, 0.5 - day) * 13 : 0;
      if (e) light.position.set(e.x, 2.5, e.z);
    });
    this.state.entities.forEach((e) => {
      const mesh = this.meshes.get(e.id),
        p = byId(e.type),
        dist = Math.hypot(e.x - center.x, e.z - center.z);
      if (!mesh) return;
      mesh.visible = e.id !== this.moving?.id && dist < (this.low ? 65 : 100);
      if (p.category && dist < 30)
        mesh.rotation.z =
          Math.sin(this.elapsed * 0.7 + e.seed) *
          (["grass", "flower", "lavender"].includes(p.kind) ? 0.018 : 0.003);
    });
    // A pooled ribbon of tiny water blocks makes ponds and fountains trickle.
    if (!this.paused && Math.random() < dt * 8) {
      const pond = this.state.entities.find(
        (e) =>
          e.type === "pond" && Math.hypot(e.x - center.x, e.z - center.z) < 25,
      );
      if (pond)
        this.burst(
          new THREE.Vector3(pond.x + 0.78, 0.95, pond.z - 0.55),
          "#c8e7df",
          1,
        );
    }
    this.particles.forEach((p) => {
      if (!p.alive) return;
      p.life -= dt;
      if (p.life <= 0) {
        p.alive = false;
        p.mesh.visible = false;
        return;
      }
      p.velocity.y -= dt * 3;
      p.mesh.position.addScaledVector(p.velocity, dt);
      p.mesh.rotation.x += dt * 3;
      p.mesh.scale.setScalar(0.08 * (p.life / p.maxLife));
    });
    this.effectMaterials = this.effectMaterials?.filter((e) => {
      if (this.elapsed > e.until) {
        e.material.dispose();
        return false;
      }
      return true;
    });
    if (this.selected) {
      const mesh = this.meshes.get(this.selected.id);
      if (mesh) {
        this.selectionBox.box.setFromObject(mesh);
        this.selectionBox.visible = !this.moving;
      }
    }
    if (this.elapsed - this.lastStats > 1) {
      this.lastStats = this.elapsed;
      this.emit("tick", {
        hour: this.state.clock,
        plants: this.state.entities.filter((e) => byId(e.type).category).length,
        objects: this.state.entities.length,
      });
      if (
        this.state.settings.quality === "auto" &&
        !this.low &&
        this.frameTimes.length === 90 &&
        this.frameTimes.reduce((a, b) => a + b, 0) / 90 > 0.043
      ) {
        this.autoQuality = this.graphics.level === "balanced" ? "low" : "balanced";
        this.applyQuality();
        this.emit("notice", "Graphics adjusted for a smoother garden.");
      }
    }
    this.renderer.render(this.scene, this.camera);
  }
  captureView() {
    const position =
        this.mode === "free" ? this.camera.position : this.freeView?.position,
      target =
        this.mode === "free" ? this.controls.target : this.freeView?.target;
    if (position && target)
      this.state.view = {
        position: position.toArray(),
        target: target.toArray(),
        mode: this.mode,
        styleVersion: 2,
        ...(this.mode === "walk"
          ? {
              walkPosition: this.camera.position.toArray(),
              yaw: this.yaw,
              pitch: this.pitch,
              walkZoom: this.walkZoom || 1,
            }
          : {}),
      };
  }
  dispose() {
    this.running = false;
    this.renderer.setAnimationLoop(null);
    this.resizeObserver.disconnect();
    this.controls.dispose();
    this.world.dispose();
    this.groundShadows.dispose();
    this.audio.dispose();
    this.meshes.forEach((m) => m.dispose());
    this.ghost?.dispose();
    this.renderer.dispose();
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
  }
}
