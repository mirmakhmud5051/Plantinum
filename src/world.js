import * as THREE from "three";
import { byId } from "./catalog.js";
import { random, plantVoxels, decorationVoxels, voxelMesh } from "./voxels.js";
const CHUNK = 24;
export class World {
  constructor(scene, low = false) {
    this.scene = scene;
    this.low = low;
    this.chunks = new Map();
    this.queue = [];
    this.animals = [];
    this.chunkKey = "";
    const v = [];
    const b = (x, y, z, sx, sy, sz, color) =>
      v.push({ x, y, z, sx, sy, sz, color });
    // Continuous open meadow. Detail is streamed in reusable 24 m chunks.
    b(0, -0.26, 0, 520, 0.6, 520, 0x9abe75);
    b(0, 0.04, 0, 19.4, 0.22, 17.4, 0x789d55);
    for (let x = -9; x < 9; x++)
      for (let z = -8; z < 8; z++)
        b(
          x + 0.5,
          0.16,
          z + 0.5,
          0.998,
          0.06,
          0.998,
          (Math.floor((x + 9) / 3) + Math.floor((z + 8) / 3)) % 2
            ? 0x9fc877
            : 0xa4cc7b,
        );
    // Warm limestone paths, intentionally split into slightly uneven slabs.
    const rng = random(77);
    for (let z = -8; z < 8; z++)
      for (let x = 0; x < 2; x++)
        b(
          -1.4 + x * 0.79,
          0.205,
          z + 0.48,
          0.76,
          0.09,
          0.95,
          rng() > 0.45 ? 0xe2d6b7 : 0xd8cfb3,
        );
    for (let x = -9; x < 9; x++)
      for (let z = 0; z < 2; z++)
        b(
          x + 0.48,
          0.207,
          1.22 + z * 0.68,
          0.96,
          0.09,
          0.65,
          rng() > 0.4 ? 0xe1d5b8 : 0xd8ceaf,
        );
    // Low wooden borders and generous entrances.
    for (let x = -9.5; x <= 9.5; x += 1.9)
      for (const z of [-8.7, 8.7]) {
        if (Math.abs(x + 0.9) < 1.5) continue;
        decorationVoxels("fence").forEach((q) =>
          v.push({ ...q, x: q.x + x, y: q.y + 0.18, z: q.z + z }),
        );
      }
    for (let z = -7.6; z <= 7.6; z += 1.9)
      for (const x of [-9.6, 9.6]) {
        if (Math.abs(z - 1.6) < 1.5) continue;
        decorationVoxels("fence").forEach((q) =>
          v.push({ ...q, x: q.z + x, y: q.y + 0.18, z: q.x + z }),
        );
      }
    // Timber raised flower beds.
    for (const [x, z, w, d] of [
      [-5.25, 3.55, 3.7, 2.4],
      [2.7, 3.65, 3.3, 2.25],
    ]) {
      b(x, 0.2, z, w, 0.1, d, 0x87684b);
      for (const zz of [-d / 2, d / 2])
        b(x, 0.31, z + zz, w + 0.16, 0.25, 0.12, 0xb29468);
      for (const xx of [-w / 2, w / 2])
        b(x + xx, 0.31, z, 0.12, 0.25, d, 0xa4845b);
    }
    // A little garden shed in the neighboring meadow.
    b(-13, 1.3, -9, 3.6, 2.6, 2.8, 0xb79770);
    b(-13, 2.75, -9, 4.1, 0.3, 3.3, 0x6c8263);
    b(-13, 3, -9, 3.4, 0.25, 2.8, 0x7e9470);
    b(-13, 3.24, -9, 2.7, 0.25, 2.3, 0x8d9c77);
    b(-13, 0.99, -7.57, 1.0, 1.98, 0.08, 0x6f7754);
    b(-11.8, 1.5, -7.56, 0.65, 0.65, 0.07, 0xc6ded1);
    this.base = voxelMesh(v);
    this.base.castShadow = false;
    scene.add(this.base);
    this.makeAnimals();
  }
  stream(position) {
    const cx = Math.floor(position.x / CHUNK),
      cz = Math.floor(position.z / CHUNK),
      key = `${cx},${cz},${this.low}`;
    if (key === this.chunkKey) return;
    this.chunkKey = key;
    const radius = this.low ? 1 : 2,
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
        if (q.leaf && j % 2 === 0) return;
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
        body.push({ x, y, z, sx, sy, sz, color: c });
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
            new THREE.BoxGeometry(kind === "bird" ? 0.26 : 0.18, 0.025, 0.16),
            m,
          );
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
  dispose() {
    this.chunks.forEach((m) => {
      this.scene.remove(m);
      m.dispose();
    });
    this.chunks.clear();
  }
}
