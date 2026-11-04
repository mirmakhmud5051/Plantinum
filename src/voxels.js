import * as THREE from "three";
import { byId } from "./catalog.js";
import { plantVoxels } from "./botany.js";
import { organicMesh, NATURAL_MATERIAL } from "./organic-mesh.js";
export { random, insideShape, plantVoxels } from "./botany.js";
export const BOX = new THREE.SphereGeometry(0.5, 6, 4);
export const VOXEL_MATERIAL = NATURAL_MATERIAL;
export function decorationVoxels(kind) {
  const v = [];
  const b = (x, y, z, sx, sy, sz, color) =>
    v.push({ x, y, z, sx, sy, sz, color, leaf: false, id: v.length });
  const wood = 0xb59164,
    dark = 0x725d49,
    stone = 0xc5c6b4;
  if (kind === "stone-path") {
    for (let i = 0; i < 2; i++)
      for (let j = 0; j < 2; j++)
        b(
          (i - 0.5) * 0.51,
          0.035,
          (j - 0.5) * 0.51,
          0.49,
          0.09,
          0.49,
          i === j ? 0xd8d1b9 : 0xe0d8c1,
        );
  }
  if (kind === "wood-path") {
    for (let i = 0; i < 5; i++)
      b(0, 0.04, (i - 2) * 0.21, 1.2, 0.12, 0.195, wood);
  }
  if (kind === "bench") {
    for (let i = 0; i < 4; i++) {
      b(0, 0.55, (i - 1.5) * 0.17, 2.1, 0.12, 0.15, wood);
      b(0, 1.05 + i * 0.12, -0.28, 2.1, 0.1, 0.09, wood);
    }
    [-0.78, 0.78].forEach((x) => {
      b(x, 0.29, 0, 0.13, 0.57, 0.52, dark);
      b(x, 0.85, -0.3, 0.11, 1.05, 0.11, dark);
      b(x, 0.86, 0.05, 0.16, 0.1, 0.7, dark);
    });
  }
  if (kind === "fence") {
    [-0.9, 0.9].forEach((x) => {
      b(x, 0.68, 0, 0.17, 1.36, 0.17, wood);
      b(x, 1.4, 0, 0.23, 0.13, 0.23, 0xd0b18a);
    });
    [0.42, 0.95].forEach((y) => b(0, y, 0, 1.8, 0.14, 0.11, wood));
  }
  if (kind === "lamp") {
    b(0, 0.12, 0, 0.36, 0.24, 0.36, dark);
    b(0, 1.2, 0, 0.11, 2.2, 0.11, dark);
    b(0, 2.35, 0, 0.46, 0.48, 0.46, 0xffdf98);
    b(0, 2.65, 0, 0.65, 0.12, 0.65, 0x4d6549);
    b(0, 2.75, 0, 0.37, 0.12, 0.37, 0x4d6549);
    [-0.24, 0.24].forEach((x) =>
      [-0.24, 0.24].forEach((z) => b(x, 2.35, z, 0.045, 0.55, 0.045, dark)),
    );
  }
  if (kind === "pond" || kind === "fountain") {
    const n = kind === "pond" ? 7 : 5,
      s = 0.55;
    for (let x = -n; x <= n; x++)
      for (let z = -n; z <= n; z++) {
        const dist = (x / (n + 0.2)) ** 2 + (z / (n * 0.76)) ** 2;
        if (dist > 1 || dist < 0.57) continue;
        b(
          x * s * 0.55,
          0.12,
          z * s * 0.55,
          0.38,
          0.28,
          0.38,
          (x + z) % 3 ? 0xb0b4a2 : 0xc2c4b0,
        );
      }
    b(
      0,
      0.08,
      0,
      kind === "pond" ? 3.7 : 2.5,
      0.12,
      kind === "pond" ? 2.7 : 1.8,
      0x7dbac3,
    );
    for (let i = 0; i < 8; i++)
      b(
        Math.sin(i * 3) * 1.25,
        0.15,
        Math.cos(i * 2) * 0.85,
        0.32,
        0.025,
        0.27,
        0xa2d6d2,
      );
    if (kind === "fountain") {
      b(0, 0.75, 0, 0.35, 1.5, 0.35, stone);
      b(0, 1.5, 0, 1.2, 0.2, 1.2, stone);
      b(0, 1.68, 0, 0.7, 0.16, 0.7, 0x91cfdb);
    } else {
      b(0.9, 0.42, -0.9, 1.1, 0.7, 0.8, 0xa0ab96);
      b(0.95, 0.84, -1, 0.7, 0.35, 0.55, 0xb2bba8);
      b(0.78, 0.55, -0.56, 0.38, 0.85, 0.08, 0xb3e1de);
      [
        [-0.9, 0.4],
        [0.7, 0.6],
      ].forEach(([x, z]) => {
        b(x, 0.17, z, 0.52, 0.06, 0.46, 0x6da278);
        b(x, 0.23, z, 0.12, 0.09, 0.12, 0xefb7bc);
      });
    }
  }
  if (kind === "rock") {
    b(0, 0.31, 0, 0.9, 0.62, 0.7, 0xa6b09e);
    b(0.38, 0.17, 0.4, 0.65, 0.34, 0.5, 0xbdc2b0);
    b(-0.3, 0.13, 0.3, 0.4, 0.26, 0.4, 0xc8cbbb);
  }
  if (kind === "bridge") {
    for (let i = 0; i < 13; i++) {
      const z = (i - 6) * 0.23,
        y = 0.2 + Math.sin((i / 12) * Math.PI) * 0.45;
      b(0, y, z, 1.7, 0.15, 0.21, wood);
      if (i % 3 === 0)
        [-0.85, 0.85].forEach((x) => b(x, y + 0.45, z, 0.1, 0.9, 0.1, dark));
    }
    [-0.85, 0.85].forEach((x) => b(x, 1, 0, 0.12, 0.12, 2.8, wood));
  }
  if (kind === "pot") {
    b(0, 0.35, 0, 0.65, 0.7, 0.65, 0xbf8564);
    b(0, 0.72, 0, 0.85, 0.14, 0.85, 0xd4a17c);
    b(0, 0.79, 0, 0.64, 0.06, 0.64, 0x6e5842);
  }
  if (kind === "statue") {
    b(0, 0.12, 0, 0.9, 0.24, 0.75, stone);
    b(0, 0.5, 0, 0.5, 0.6, 0.55, 0xe0dccb);
    b(0, 0.93, -0.15, 0.42, 0.42, 0.4, 0xe0dccb);
    [-0.12, 0.12].forEach((x) => b(x, 1.3, -0.16, 0.13, 0.49, 0.15, 0xe0dccb));
    b(0.23, 0.88, -0.29, 0.04, 0.06, 0.04, 0x64705d);
  }
  for (const part of v) {
    if (["rock", "stone-path"].includes(kind)) {
      part.geometry = kind === "stone-path" ? "paving" : "stone";
      part.ry = part.id * 2.399;
    } else if (kind === "pond" || kind === "fountain") {
      part.geometry = part.color === 0x7dbac3 || part.sy < 0.1 ? "crown" : "stone";
      if (part.sy > 0.7 && part.sx < 0.5) part.geometry = "stem";
    } else if (kind === "pot") part.geometry = "stem";
    else if (kind === "statue" && part.y > 0.2) part.geometry = "crown";
    else if (kind === "lamp" && part.sy > 1) part.geometry = "stem";
  }
  return v;
}
export function entityVoxels(entity, { preview = false } = {}) {
  const p = byId(entity.type);
  if (!p) return [];
  const all = p.category
    ? plantVoxels(p, entity.seed, entity.shape)
    : decorationVoxels(p.kind);
  if (!p.category || preview) return all;
  const removed = new Set(entity.removed);
  return all.filter(
    (v) =>
      !removed.has(v.id) &&
      (!v.leaf ||
        entity.growth >= 0.95 ||
        ((v.id * 17) % 101) / 101 < 0.25 + entity.growth * 0.75),
  );
}
export function voxelMesh(parts, material = VOXEL_MATERIAL) {
  return organicMesh(parts, material);
}
