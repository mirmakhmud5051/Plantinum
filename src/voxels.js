import * as THREE from "three";
import { byId } from "./catalog.js";
export const BOX = new THREE.BoxGeometry(1, 1, 1);
export const VOXEL_MATERIAL = new THREE.MeshLambertMaterial();
export function random(seed) {
  let n = seed | 0;
  return () => {
    n = (n + 0x6d2b79f5) | 0;
    let t = Math.imul(n ^ (n >>> 15), 1 | n);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function insideShape(shape, x, y, z) {
  const r = Math.hypot(x, z);
  switch (shape) {
    case "sphere":
      return x * x + (y * 2 - 1) ** 2 + z * z <= 1.12;
    case "cube":
      return Math.max(Math.abs(x), Math.abs(z), Math.abs(y * 2 - 1)) <= 0.86;
    case "pyramid":
      return Math.max(Math.abs(x), Math.abs(z)) <= 1 - y * 0.88;
    case "cone":
      return r <= 1 - y * 0.9;
    case "cylinder":
      return r <= 0.83;
    case "spiral":
      return (
        r < 0.22 ||
        (r < 0.82 && Math.cos(Math.atan2(z, x) - y * Math.PI * 5) > -0.08)
      );
    default:
      return x * x + z * z + (y * 2 - 1) ** 2 <= 1.18;
  }
}
export function plantVoxels(plant, seed = 17, shape = "natural") {
  const rng = random(seed),
    v = [];
  const add = (x, y, z, sx, sy, sz, color, leaf = false) =>
    v.push({ x, y, z, sx, sy, sz, color, leaf, id: v.length });
  const shade = (color, amount = 0.16) =>
    new THREE.Color(color)
      .multiplyScalar(1 - amount / 2 + rng() * amount)
      .getHex();
  const { kind, height: h, width: w, color } = plant;
  if (["flower", "lavender", "grass", "foliage"].includes(kind)) {
    const n = kind === "flower" ? 5 : kind === "lavender" ? 19 : 13;
    for (let i = 0; i < n; i++) {
      const a = i * 2.39996,
        r = Math.sqrt((i + 0.3) / n) * w * 0.43,
        x = Math.cos(a) * r,
        z = Math.sin(a) * r,
        hh = h * (0.6 + rng() * 0.4);
      if (kind === "foliage") {
        add(x * 0.5, hh * 0.45, z * 0.5, 0.08, hh * 0.9, 0.08, 0x588442);
        for (let j = 0; j < 4; j++)
          add(
            x * (0.4 + j * 0.22),
            hh * (0.4 + j * 0.12),
            z * (0.4 + j * 0.22),
            w * 0.22,
            0.11,
            w * 0.17,
            shade(color),
            true,
          );
      } else {
        add(x, hh * 0.46, z, 0.045, hh * 0.9, 0.045, 0x5e8f42);
        if (kind === "grass") {
          add(x, hh * 0.88, z, 0.11, hh * 0.38, 0.11, shade(color), true);
        } else if (kind === "lavender") {
          for (let j = 0; j < 3; j++)
            add(
              x,
              hh * (0.72 + j * 0.15),
              z,
              0.12 - j * 0.02,
              0.14,
              0.12 - j * 0.02,
              shade(color),
              true,
            );
        } else {
          const s = w * 0.16;
          add(x, hh, z, s * 0.7, s * 0.8, s * 0.7, 0xe9bc4c, true);
          [
            [-1, 0],
            [1, 0],
            [0, -1],
            [0, 1],
          ].forEach(([dx, dz]) =>
            add(
              x + dx * s * 0.7,
              hh - 0.015,
              z + dz * s * 0.7,
              s,
              s * 0.55,
              s,
              shade(color),
              true,
            ),
          );
          add(x + 0.1, hh * 0.4, z, 0.24, 0.06, 0.1, 0x7aaa4e, true);
        }
      }
    }
    return v;
  }
  const isTree = ["tree", "pine"].includes(kind),
    isConifer = ["conifer", "column"].includes(kind);
  const base = isTree ? h * 0.36 : isConifer ? h * 0.09 : 0.12;
  const trunkH = isTree ? h * 0.7 : isConifer ? h * 0.48 : h * 0.45;
  add(
    0,
    trunkH / 2,
    0,
    isTree ? 0.29 : 0.13,
    trunkH,
    isTree ? 0.29 : 0.13,
    0x957148,
  );
  if (isTree) {
    add(-w * 0.13, h * 0.5, 0, w * 0.35, 0.17, 0.17, 0x957148);
    add(w * 0.12, h * 0.57, 0.09, w * 0.3, 0.17, 0.17, 0xa27a4e);
  }
  const step = isTree ? 0.31 : isConifer ? 0.205 : 0.19;
  const nx = Math.max(3, Math.round(w / step)),
    ny = Math.max(3, Math.round((h - base) / step));
  for (let iy = 0; iy < ny; iy++)
    for (let ix = 0; ix < nx; ix++)
      for (let iz = 0; iz < nx; iz++) {
        const x = (ix - (nx - 1) / 2) * step,
          z = (iz - (nx - 1) / 2) * step,
          y = base + (iy + 0.5) * step;
        const xx = x / (w * 0.5),
          zz = z / (w * 0.5),
          yy = iy / (ny - 1);
        let keep;
        if (shape !== "natural") keep = insideShape(shape, xx, yy, zz);
        else if (kind === "hedge")
          keep = Math.max(Math.abs(xx), Math.abs(zz)) < 0.95;
        else if (kind === "column")
          keep = xx * xx + zz * zz < (1 - Math.max(0, yy - 0.7) * 1.8) ** 2;
        else if (isConifer || kind === "pine") {
          const radius =
            (1 - yy) * 0.96 + 0.1 + (Math.floor(yy * 5) % 2 === 0 ? 0.12 : 0);
          keep =
            Math.max(Math.abs(xx), Math.abs(zz)) < radius &&
            Math.abs(xx) + Math.abs(zz) < radius * 1.65;
        } else if (isTree) {
          keep =
            xx * xx + zz * zz + ((yy - 0.48) * 1.75) ** 2 < 0.94 + rng() * 0.11;
          if (Math.abs(xx) > 0.7 && yy < 0.25) keep = false;
        } else keep = insideShape("natural", xx, yy, zz);
        if (!keep) continue;
        // Flowering shrubs have green lower foliage and colored upper clusters.
        const c = kind === "flowerbush" && yy < 0.55 ? "#64964a" : color;
        add(
          x,
          y,
          z,
          step * 0.97,
          step * 0.97,
          step * 0.97,
          shade(c, 0.23),
          true,
        );
      }
  return v;
}
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
export function voxelMesh(voxels, material = VOXEL_MATERIAL) {
  const mesh = new THREE.InstancedMesh(
      BOX,
      material,
      Math.max(1, voxels.length),
    ),
    dummy = new THREE.Object3D(),
    color = new THREE.Color();
  voxels.forEach((v, i) => {
    dummy.position.set(v.x, v.y, v.z);
    dummy.scale.set(v.sx, v.sy, v.sz);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    mesh.setColorAt(i, color.set(v.color));
  });
  mesh.count = voxels.length;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.voxels = voxels;
  mesh.computeBoundingSphere();
  return mesh;
}
