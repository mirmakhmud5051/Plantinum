import * as THREE from "three";
import { byId } from "./catalog.js";
import { random, plantVoxels, voxelMesh } from "./voxels.js";
import { GardenLandscape } from "./garden-landscape.js";
const CHUNK = 24;
export class World {
  constructor(scene, low = false, radius = low ? 1 : 2) {
    this.scene = scene;
    this.low = low;
    this.radius = radius;
    this.chunks = new Map();
    this.queue = [];
    this.animals = [];
    this.chunkKey = "";
    const v = [];
    const b = (x, y, z, sx, sy, sz, color) =>
      v.push({ x, y, z, sx, sy, sz, color });
    this.makeGround();
    this.garden = new GardenLandscape();
    scene.add(this.garden);
    // A little garden shed in the neighboring meadow.
    b(-13, 1.3, -9, 3.6, 2.6, 2.8, 0xb79770);
    b(-13, 2.75, -9, 4.1, 0.3, 3.3, 0x6c8263);
    b(-13, 3, -9, 3.4, 0.25, 2.8, 0x7e9470);
    b(-13, 3.24, -9, 2.7, 0.25, 2.3, 0x8d9c77);
    b(-13, 0.99, -7.57, 1.0, 1.98, 0.08, 0x6f7754);
    b(-11.8, 1.5, -7.56, 0.65, 0.65, 0.07, 0xc6ded1);
    this.base = voxelMesh(v);
    this.base.castShadow = true;
    scene.add(this.base);
    this.makeBackdrop();
    this.makeAnimals();
  }
  makeBackdrop() {
    const parts = [], rng = random(268);
    // A soft woodland silhouette behind the privacy fence, like the reference.
    for (let i = 0; i < 15; i++) {
      const x = -27 + i * 3.9, z = -26 - rng() * 8;
      const scale = 1.25 + rng() * 0.7;
      plantVoxels(byId(i % 3 === 0 ? "pine" : "oak"), i * 137 + 71).forEach((part, j) => {
        if (part.geometry === "leaf" && j % 4) return;
        parts.push({ ...part, x: x + part.x * scale, y: 0.15 + part.y * scale, z: z + part.z * scale,
          sx: part.sx * scale, sy: part.sy * scale, sz: part.sz * scale,
          color: new THREE.Color(part.color).lerp(new THREE.Color(0x9caa7e), 0.35).getHex() });
      });
    }
    this.backdrop = voxelMesh(parts);
    this.backdrop.castShadow = false;
    this.scene.add(this.backdrop);
  }
  makeGround() {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext("2d"), rng = random(761);
    ctx.fillStyle = "#7c8c48";
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 18000; i++) {
      ctx.fillStyle = i % 3 ? "rgba(201,202,121,.12)" : "rgba(44,69,30,.12)";
      ctx.fillRect(rng() * 256, rng() * 256, 1, 1 + rng() * 3);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(120, 120);
    const material = new THREE.MeshStandardMaterial({ map: texture, roughness: 1 });
    this.groundMesh = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), material);
    this.groundMesh.rotation.x = -Math.PI / 2;
    this.groundMesh.position.y = 0.145;
    this.groundMesh.receiveShadow = true;
    this.scene.add(this.groundMesh);
  }

  stream(position) {
    const cx = Math.floor(position.x / CHUNK),
      cz = Math.floor(position.z / CHUNK),
      key = `${cx},${cz},${this.low},${this.radius}`;
    if (key === this.chunkKey) return;
    this.chunkKey = key;
    const radius = this.radius,
      wanted = new Set();
    for (let x = cx - radius; x <= cx + radius; x++)
      for (let z = cz - radius; z <= cz + radius; z++) {
        const k = `${x},${z}`;
        wanted.add(k);
        if (!this.chunks.has(k) && !this.queue.some((q) => q.key === k))
          this.queue.push({ key: k, x, z });
      }
    this.queue = this.queue.filter((q) => wanted.has(q.key));
    for (const [k, mesh] of this.chunks)
      if (!wanted.has(k)) {
        this.scene.remove(mesh);
        mesh.dispose();
        this.chunks.delete(k);
      }
  }
  processChunk() {
    const next = this.queue.shift();
    if (!next) return;
    const { key, x: cx, z: cz } = next;
    const rng = random(cx * 73531 + cz * 12713 + 91827),
      v = [];
    for (let i = 0; i < 7; i++) {
      const x = (cx + rng()) * CHUNK,
        z = (cz + rng()) * CHUNK;
      if (Math.abs(x) < 15 && Math.abs(z) < 15) continue;
      const p = byId(i % 3 === 0 ? "pine" : i % 3 === 1 ? "oak" : "spruce"),
        s = 0.7 + rng() * 0.65;
      plantVoxels(p, Math.floor(rng() * 9999)).forEach((q, j) => {
        if (this.low && q.leaf && j % 2 === 0) return;
        v.push({
          ...q,
          x: x + q.x * s,
          y: q.y * s + 0.12,
          z: z + q.z * s,
          sx: q.sx * s * (q.leaf ? 1.25 : 1),
          sy: q.sy * s * (q.leaf ? 1.25 : 1),
          sz: q.sz * s * (q.leaf ? 1.25 : 1),
        });
      });
    }
    for (let i = 0; i < 80; i++) {
      const x = (cx + rng()) * CHUNK,
        z = (cz + rng()) * CHUNK;
      if (Math.abs(x) < 10 && Math.abs(z) < 9) continue;
      const h = 0.1 + rng() * 0.3;
      v.push({
        geometry: "leaf",
        x,
        y: h / 2 + 0.1,
        z,
        sx: 0.08,
        sy: h,
        sz: 0.08,
        color: rng() > 0.4 ? 0x85b661 : 0xb1cd7c,
      });
      if (i % 7 === 0)
        v.push({
          geometry: "petal",
          x,
          y: h + 0.12,
          z,
          sx: 0.15,
          sy: 0.09,
          sz: 0.15,
          color: i % 2 ? 0xf1d89b : 0xe9c9d4,
        });
    }
    const mesh = voxelMesh(v);
    mesh.castShadow = !this.low;
    this.chunks.set(key, mesh);
    this.scene.add(mesh);
  }
  makeAnimals() {
    const add = (kind, color, x, z, index) => {
      const body = [];
      const b = (x, y, z, sx, sy, sz, c = color) =>
        body.push({ x, y, z, sx, sy, sz, color: c, geometry: "crown" });
      if (kind === "rabbit" || kind === "squirrel") {
        b(0, 0.3, 0, 0.3, 0.32, 0.48);
        b(0, 0.53, -0.2, 0.25, 0.25, 0.24);
        b(-0.1, 0.1, -0.1, 0.1, 0.14, 0.2);
        b(0.1, 0.1, -0.1, 0.1, 0.14, 0.2);
        b(0, 0.55, 0.3, 0.18, kind === "squirrel" ? 0.52 : 0.15, 0.18);
        for (const xx of [-0.075, 0.075]) {
          b(xx, 0.8, -0.2, 0.07, kind === "rabbit" ? 0.34 : 0.12, 0.07);
          b(xx * 1.68, 0.57, -0.3, 0.025, 0.035, 0.035, 0x4b4b3b);
        }
      } else if (kind === "bird") {
        b(0, 0, 0, 0.19, 0.17, 0.3);
        b(0, 0.1, -0.12, 0.17, 0.16, 0.16);
        b(0, 0.07, -0.24, 0.06, 0.05, 0.12, 0xe6ba65);
      } else {
        b(
          0,
          0,
          0,
          kind === "bee" ? 0.08 : 0.04,
          0.06,
          0.2,
          kind === "bee" ? 0xceb05a : 0x7f715e,
        );
      }
      const group = new THREE.Group();
      group.add(voxelMesh(body));
      group.position.set(x, 1, z);
      if (["bird", "butterfly", "bee"].includes(kind)) {
        const m = new THREE.MeshLambertMaterial({
          color:
            kind === "butterfly" ? color : kind === "bee" ? 0xe3e8d6 : color,
          transparent: kind === "bee",
          opacity: kind === "bee" ? 0.6 : 1,
        });
        for (const dir of [-1, 1]) {
          const wing = new THREE.Mesh(
            new THREE.SphereGeometry(0.5, 6, 4),
            m,
          );
          wing.scale.set(kind === "bird" ? 0.26 : 0.18, 0.025, 0.16);
          wing.position.x = dir * 0.13;
          wing.userData.dir = dir;
          group.add(wing);
        }
      }
      this.scene.add(group);
      this.animals.push({ group, kind, x, z, index });
    };
    add("rabbit", 0xeee9d4, 3, 5, 0);
    add("rabbit", 0xc4b49b, -5, 6, 1);
    add("squirrel", 0xb47d4d, -6, -3, 2);
    for (let i = 0; i < 3; i++) add("bird", 0x7e9b9a, -4 + i * 3, -4, 3 + i);
    for (let i = 0; i < 5; i++)
      add("butterfly", i % 2 ? 0xe5bd70 : 0xe8abc5, -5 + i * 2, 3, 6 + i);
    for (let i = 0; i < 3; i++) add("bee", 0xe6bd60, 2 + i * 0.8, 3, 12 + i);
  }
  update(t) {
    this.animals.forEach(({ group, kind, x, z, index: i }) => {
      const tt = t * 0.35 + i * 3;
      if (kind === "rabbit" || kind === "squirrel") {
        const hop = Math.max(0, Math.sin(t * 2 + i * 5));
        group.position.set(
          x + Math.sin(tt) * 1.4,
          0.18 + hop * 0.22,
          z + Math.cos(tt * 0.7) * 0.6,
        );
        group.rotation.y = Math.cos(tt) * 0.6;
      } else if (kind === "bird") {
        // Birds alternate between tree perches and short flights.
        const fly = Math.sin(t * 0.18 + i) > 0;
        group.position.set(
          x + (fly ? Math.sin(tt) * 3 : 0),
          fly ? 3.5 + Math.sin(tt) : 3,
          z + (fly ? Math.cos(tt) * 2 : 0),
        );
        group.rotation.y = tt;
        group.children
          .slice(1)
          .forEach(
            (w) =>
              (w.rotation.z = fly
                ? Math.sin(t * 17) * 0.8 * w.userData.dir
                : 0),
          );
      } else {
        group.position.set(
          x + Math.sin(tt * 1.6) * 0.8,
          1.1 + Math.cos(tt * 2) * 0.35,
          z + Math.cos(tt) * 0.7,
        );
        group.rotation.y = -tt;
        group.children
          .slice(1)
          .forEach(
            (w) =>
              (w.rotation.z =
                Math.sin(t * (kind === "bee" ? 48 : 15) + i) *
                0.95 *
                w.userData.dir),
          );
      }
    });
  }
  setQuality(low, radius) {
    if (this.low !== low) {
      this.chunks.forEach((mesh) => {
        this.scene.remove(mesh);
        mesh.dispose();
      });
      this.chunks.clear();
      this.queue = [];
    }
    this.low = low;
    this.radius = radius;
    this.chunkKey = "";
  }
  dispose() {
    this.garden.dispose();
    this.scene.remove(this.garden, this.base, this.groundMesh, this.backdrop);
    this.base.dispose();
    this.backdrop.dispose();
    this.groundMesh.geometry.dispose();
    this.groundMesh.material.map.dispose();
    this.groundMesh.material.dispose();
    this.chunks.forEach((m) => {
      this.scene.remove(m);
      m.dispose();
    });
    this.chunks.clear();
  }
}
