import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { organicMesh } from "./organic-mesh.js";
import { random } from "./botany.js";
import { BED_HEIGHT, GARDEN_BEDS, GARDEN_EDGE, STONE_WALKS, bedAt, inRect } from "./garden-layout.js";

function surfaceMaterial(kind) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d"), rng = random(441);
  ctx.fillStyle = kind === "wood" ? "#a89572" : kind === "soil" ? "#5c503c" : "#bfb8a0";
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 12000; i++) {
    ctx.fillStyle = i % 2 ? "rgba(255,248,214,.12)" : "rgba(31,28,15,.16)";
    const x = rng() * 256, y = rng() * 256;
    ctx.fillRect(x, y, kind === "wood" ? 6 + rng() * 75 : 0.6 + rng() * 2, kind === "wood" ? 0.5 : 1 + rng() * 2);
  }
  if (kind === "gravel") {
    ctx.fillStyle = "#847d68";
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2400; i++) {
      const x = rng() * 256, y = rng() * 256, size = 1.5 + rng() * 2.5;
      ctx.fillStyle = ["#c6bfa7", "#aaa48e", "#ddd3bc", "#9c9884"][i % 4];
      ctx.beginPath();
      ctx.ellipse(x, y, size, size * 0.7, rng() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (kind === "wood") {
    ctx.strokeStyle = "rgba(56,38,20,.2)";
    for (let i = 0; i < 18; i++) {
      ctx.beginPath();
      ctx.ellipse(135, 125, 8 + i * 7, 2 + i * 1.5, 0.08, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = 4;
  return new THREE.MeshStandardMaterial({ map, bumpMap: map, bumpScale: kind === "wood" ? 0.035 : 0.025, roughness: 0.94 });
}

function stonePaths(material) {
  const rng = random(812), geometries = [];
  for (const [walkIndex, walk] of STONE_WALKS.entries()) {
    const nx = Math.max(2, Math.round((walk.x1 - walk.x0) / 0.64));
    const nz = Math.max(2, Math.round((walk.z1 - walk.z0) / 0.68));
    const dx = (walk.x1 - walk.x0) / nx, dz = (walk.z1 - walk.z0) / nz;
    const grid = Array.from({ length: nz + 1 }, (_, z) => Array.from({ length: nx + 1 }, (_, x) => [
      walk.x0 + x * dx + (x && x < nx ? (rng() - 0.5) * dx * 0.65 : 0),
      walk.z0 + z * dz + (z && z < nz ? (rng() - 0.5) * dz * 0.65 : 0),
    ]));
    for (let z = 0; z < nz; z++) for (let x = 0; x < nx; x++) {
      const points = [grid[z][x], grid[z][x + 1], grid[z + 1][x + 1], grid[z + 1][x]];
      const cx = points.reduce((n, p) => n + p[0], 0) / 4, cz = points.reduce((n, p) => n + p[1], 0) / 4;
      if (STONE_WALKS.slice(0, walkIndex).some((rect) => inRect(cx, cz, rect, -0.25))) continue;
      const polygons = rng() > 0.6 ? [[points[0], points[1], points[2]], [points[0], points[2], points[3]]] : [points];
      for (const polygon of polygons) {
        const center = polygon.reduce((sum, p) => [sum[0] + p[0] / polygon.length, sum[1] + p[1] / polygon.length], [0, 0]);
        const shape = new THREE.Shape(polygon.map(([px, pz]) => new THREE.Vector2(center[0] + (px - center[0]) * 0.91, -(center[1] + (pz - center[1]) * 0.91))));
        const stone = new THREE.ExtrudeGeometry(shape, { depth: 0.045, bevelEnabled: true, bevelSegments: 1, steps: 1, bevelSize: 0.013, bevelThickness: 0.012 });
        stone.rotateX(-Math.PI / 2);
        stone.translate(0, 0.182 + rng() * 0.009, 0);
        const positions = stone.attributes.position, colors = [], uv = [];
        const color = new THREE.Color().setHSL(0.115 + rng() * 0.025, 0.09 + rng() * 0.09, 0.66 + rng() * 0.2);
        for (let i = 0; i < positions.count; i++) {
          colors.push(color.r, color.g, color.b);
          uv.push(positions.getX(i) * 1.4, positions.getZ(i) * 1.4);
        }
        stone.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
        stone.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
        geometries.push(stone);
      }
    }
  }
  const mesh = new THREE.Mesh(mergeGeometries(geometries), material);
  geometries.forEach((geometry) => geometry.dispose());
  material.vertexColors = true;
  mesh.receiveShadow = true;
  return mesh;
}

export class GardenLandscape extends THREE.Group {
  constructor() {
    super();
    this.name = "Reference garden — timber beds and limestone walks";
    this.materials = [surfaceMaterial("wood"), surfaceMaterial("soil"), surfaceMaterial("stone")];
    const [woodMaterial, soilMaterial, stoneMaterial] = this.materials;
    const wood = [], soil = [], gravel = [], detail = [], rng = random(513);
    const board = (x, y, z, sx, sy, sz, color = 0xe1d4b7) => wood.push({ x, y, z, sx, sy, sz, color });
    // A continuous fine-gravel court also fills every narrow passage between beds.
    const gravelMaterial = surfaceMaterial("gravel");
    gravelMaterial.map.repeat.set(12, 11);
    this.gravelBase = new THREE.Mesh(new THREE.PlaneGeometry(18.8, 17.8), gravelMaterial);
    this.materials.push(this.gravelBase.material);
    this.gravelBase.rotation.x = -Math.PI / 2;
    this.gravelBase.position.y = 0.17;
    this.gravelBase.receiveShadow = true;
    this.add(this.gravelBase);
    for (const bed of GARDEN_BEDS) {
      const { x0, x1, z0, z1 } = bed, w = x1 - x0, d = z1 - z0, x = (x0 + x1) / 2, z = (z0 + z1) / 2;
      soil.push({ x, y: BED_HEIGHT - 0.05, z, sx: w, sy: 0.1, sz: d, color: 0xd7c8af });
      // Two courses of aged oak with visible caps, corner posts and recessed nails.
      for (const y of [0.235, 0.375]) {
        for (const zz of [z0, z1]) board(x, y, zz, w + 0.16, 0.13, 0.14);
        for (const xx of [x0, x1]) board(xx, y, z, 0.14, 0.13, d, 0xcbbd9f);
      }
      for (const xx of [x0, x1]) for (const zz of [z0, z1]) {
        board(xx, 0.3, zz, 0.19, 0.32, 0.19, 0xc2b18f);
        detail.push({ geometry: "stone", x: xx, y: 0.465, z: zz, sx: 0.028, sy: 0.008, sz: 0.028, color: 0x605c4d });
      }
      // Bark mulch adds scale between plants without looking like a flat brown tile.
      for (let i = 0; i < w * d * 17; i++) {
        const px = x0 + 0.2 + rng() * (w - 0.4), pz = z0 + 0.2 + rng() * (d - 0.4);
        detail.push({ geometry: "stone", x: px, y: BED_HEIGHT + 0.01, z: pz, sx: 0.025 + rng() * 0.07, sy: 0.015, sz: 0.025 + rng() * 0.03, ry: rng() * 6.28, color: rng() > 0.5 ? 0x6c5840 : 0x8b7452 });
      }
    }
    for (let i = 0; i < 21000; i++) {
      const x = GARDEN_EDGE.x0 + rng() * 18.8, z = GARDEN_EDGE.z0 + rng() * 17.8;
      if (bedAt(x, z) || STONE_WALKS.some((walk) => inRect(x, z, walk))) continue;
      const s = 0.045 + rng() * 0.08;
      gravel.push({ geometry: "stone", x, y: 0.185, z, sx: s, sy: s * 0.55, sz: s * (0.65 + rng() * 0.5), ry: rng() * 6.28, color: [0xb5ad96, 0xcfc7b1, 0x8e8b79, 0xded5be][i % 4] });
    }
    // Short privacy fence frames the planting, with open gates on both axes.
    for (let x = -9.25; x <= 9.25; x += 0.38) for (const z of [-9.1, 9.1]) {
      if (Math.abs(x + 0.9) < 1.25) continue;
      board(x, 0.76, z, 0.355, 1.16 + rng() * 0.06, 0.12, 0xc3b291);
    }
    for (let z = -8.9; z <= 8.9; z += 0.38) for (const x of [-9.6, 9.6]) {
      if (Math.abs(z - 1.6) < 1.3) continue;
      board(x, 0.76, z, 0.12, 1.16 + rng() * 0.06, 0.355, 0xcebd9b);
    }
    for (const z of [-9.12, 9.12]) for (const [a, b] of [[-9.6, -2.2], [0.4, 9.6]]) {
      board((a + b) / 2, 1.37, z, b - a, 0.1, 0.18);
      for (let x = a; x <= b; x += 1.8) board(x, 0.79, z, 0.19, 1.3, 0.19);
    }
    for (const x of [-9.62, 9.62]) for (const [a, b] of [[-9.1, 0.3], [2.9, 9.1]]) {
      board(x, 1.37, (a + b) / 2, 0.18, 0.1, b - a);
      for (let z = a; z <= b; z += 1.8) board(x, 0.79, z, 0.19, 1.3, 0.19);
    }
    this.batches = [organicMesh(wood, woodMaterial), organicMesh(soil, soilMaterial), organicMesh(gravel), organicMesh(detail)];
    this.batches[2].castShadow = false;
    this.batches[3].castShadow = false;
    this.paths = stonePaths(stoneMaterial);
    this.add(...this.batches, this.paths);
    this.makeTools();
  }
  makeTools() {
    // Familiar reference details: a terracotta watering can and a coiled hose.
    const terracotta = new THREE.MeshStandardMaterial({ color: 0xa56e45, roughness: 0.75 });
    const rubber = new THREE.MeshStandardMaterial({ color: 0xb1a364, roughness: 0.86 });
    this.materials.push(terracotta, rubber);
    this.props = new THREE.Group();
    const can = new THREE.Group();
    const add = (geometry, material, x, y, z, parent = can) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh); return mesh;
    };
    add(new THREE.CylinderGeometry(0.18, 0.15, 0.35, 20, 1, true), terracotta, 0, 0.4, 0);
    add(new THREE.CylinderGeometry(0.15, 0.15, 0.025, 20), terracotta, 0, 0.23, 0);
    const handle = add(new THREE.TorusGeometry(0.17, 0.025, 6, 20), terracotta, 0.21, 0.43, 0);
    handle.scale.x = 0.7;
    const spout = add(new THREE.CylinderGeometry(0.035, 0.055, 0.4, 10), terracotta, -0.23, 0.42, 0);
    spout.rotation.z = -0.9;
    const rose = add(new THREE.CylinderGeometry(0.08, 0.035, 0.06, 12), terracotta, -0.39, 0.57, 0);
    rose.rotation.z = -0.9;
    can.position.set(3.8, 0, 2.25);
    can.rotation.y = -0.35;
    this.props.add(can);
    for (let i = 0; i < 5; i++) {
      const ring = add(new THREE.TorusGeometry(0.24 + i * 0.046, 0.025, 6, 36), rubber, 4.7, 0.25 + i * 0.006, 2.2, this.props);
      ring.rotation.x = Math.PI / 2;
    }
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(5.1, 0.26, 2.25), new THREE.Vector3(5.3, 0.25, 2.1), new THREE.Vector3(5.2, 0.25, 1.8)]);
    add(new THREE.TubeGeometry(curve, 12, 0.025, 6, false), rubber, 0, 0, 0, this.props);
    this.add(this.props);
  }
  dispose() {
    this.batches.forEach((batch) => batch.dispose());
    this.paths.geometry.dispose(); this.gravelBase.geometry.dispose();
    this.props.traverse((object) => object.geometry?.dispose());
    new Set(this.materials.map((material) => material.map).filter(Boolean)).forEach((map) => map.dispose());
    this.materials.forEach((material) => material.dispose());
  }
}
