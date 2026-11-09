import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

function curvedLeaf() {
  const vertices = [], indices = [], uvs = [];
  const rows = 5;
  for (let i = 0; i <= rows; i++) {
    const t = i / rows, width = Math.pow(Math.sin(t * Math.PI), 0.8) * 0.5;
    const lift = Math.sin(t * Math.PI) - 0.5;
    vertices.push(-width, lift - 0.12, t - 0.5, 0, lift, t - 0.5, width, lift - 0.12, t - 0.5);
    uvs.push(0, t, 0.5, t, 1, t);
    if (i < rows) for (let j = 0; j < 2; j++) {
      const a = i * 3 + j;
      indices.push(a, a + 3, a + 1, a + 1, a + 3, a + 4);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
// Leaves grow from the origin along +Z, with a raised midrib and a drooping tip.
function archingLeaf(narrow = false) {
  const vertices = [], indices = [], uvs = [], rows = 14;
  for (let i = 0; i <= rows; i++) {
    const t = i / rows;
    const width = Math.pow(Math.sin(Math.PI * t), narrow ? 0.55 : 0.8) * 0.5;
    const y = Math.sin(t * Math.PI * 0.82) * 0.9;
    vertices.push(-width, y - width * 0.13, t, 0, y + width * 0.09, t, width, y - width * 0.13, t);
    uvs.push(0, t, 0.5, t, 1, t);
    if (i < rows) for (let j = 0; j < 2; j++) {
      const a = i * 3 + j;
      indices.push(a, a + 3, a + 1, a + 1, a + 3, a + 4);
    }
  }
  const result = new THREE.BufferGeometry();
  result.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  result.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  result.setIndex(indices);
  result.computeVertexNormals();
  return result;
}
function splitLeaf() {
  const vertices = [], indices = [], uvs = [], rows = 56;
  for (let i = 0; i <= rows; i++) {
    const t = i / rows;
    // Deep cuts stop at the midrib, so each leaf has one continuous silhouette.
    const notch = t > 0.12 && t < 0.88 ? Math.pow(Math.max(0, Math.cos((t - 0.12) / 0.76 * Math.PI * 10)), 10) : 0;
    const width = Math.pow(Math.sin(Math.PI * t), 0.68) * 0.5 * (1 - notch * 0.77);
    const arch = Math.sin(t * Math.PI) * 0.12;
    vertices.push(-width, arch - width * 0.12, t - 0.5, 0, arch + 0.025, t - 0.5, width, arch - width * 0.12, t - 0.5);
    uvs.push(0, t, 0.5, t, 1, t);
    if (i < rows) for (let j = 0; j < 2; j++) {
      const a = i * 3 + j;
      indices.push(a, a + 3, a + 1, a + 1, a + 3, a + 4);
    }
  }
  const result = new THREE.BufferGeometry();
  result.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  result.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  result.setIndex(indices);
  result.computeVertexNormals();
  return result;
}
function pavingStone() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.5, -0.26);
  for (const [x, y] of [[-0.18, -0.5], [0.4, -0.45], [0.5, 0.12], [0.12, 0.5], [-0.44, 0.4]]) shape.lineTo(x, y);
  shape.closePath();
  const stone = new THREE.ExtrudeGeometry(shape, { depth: 0.9, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.035, bevelThickness: 0.04 });
  stone.rotateX(-Math.PI / 2);
  stone.center();
  return stone;
}
const geometry = {
  rounded: new RoundedBoxGeometry(1, 1, 1, 2, 0.12),
  crown: new THREE.SphereGeometry(0.5, 20, 14),
  petal: new THREE.SphereGeometry(0.5, 8, 5),
  stem: new THREE.CylinderGeometry(0.38, 0.5, 1, 8),
  cone: new THREE.CylinderGeometry(0.005, 0.5, 1, 20),
  pyramid: new THREE.CylinderGeometry(0.02, 0.5, 1, 4),
  paving: pavingStone(),
  leaf: curvedLeaf(),
  broadLeaf: archingLeaf(),
  blade: archingLeaf(true),
  splitLeaf: splitLeaf(),
  stone: new THREE.IcosahedronGeometry(0.5, 1),
};
export const NATURAL_MATERIAL = new THREE.MeshStandardMaterial({ roughness: 0.86, metalness: 0, side: THREE.DoubleSide });
let foliageMaterial, broadLeafMaterial;
function leafyMaterial() {
  if (foliageMaterial || typeof document === "undefined") return foliageMaterial || NATURAL_MATERIAL;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#919c7a";
  ctx.fillRect(0, 0, 256, 256);
  let value = 731;
  const rng = () => { value = (value * 16807) % 2147483647; return value / 2147483647; };
  // Overlapping leaf shadows and lit tips give the clipped crowns fine foliage.
  // Wrap each mark across the edges to keep the texture seamless.
  for (let i = 0; i < 3500; i++) {
    const x = rng() * 256, y = rng() * 256, length = 1.8 + rng() * 3.2, angle = rng() * Math.PI;
    const tone = Math.floor(155 + rng() * 90);
    for (const dx of [-256, 0, 256]) for (const dy of [-256, 0, 256]) {
      if (x + dx < -6 || x + dx > 262 || y + dy < -6 || y + dy > 262) continue;
      ctx.fillStyle = "rgba(27,43,11,.32)";
      ctx.beginPath();
      ctx.ellipse(x + dx + 0.8, y + dy + 1.2, length, length * 0.5, angle, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgb(${tone},${Math.min(255, tone + 9)},${tone - 14})`;
      ctx.beginPath();
      ctx.ellipse(x + dx, y + dy, length, length * 0.45, angle, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 3);
  foliageMaterial = NATURAL_MATERIAL.clone();
  foliageMaterial.map = texture;
  foliageMaterial.bumpMap = texture;
  foliageMaterial.bumpScale = 0.018;
  foliageMaterial.roughness = 0.96;
  return foliageMaterial;
}
function veinedMaterial() {
  if (broadLeafMaterial || typeof document === "undefined") return broadLeafMaterial || NATURAL_MATERIAL;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, 128, 0);
  gradient.addColorStop(0, "#c0ccad");
  gradient.addColorStop(0.48, "#f1f4db");
  gradient.addColorStop(0.52, "#f1f4db");
  gradient.addColorStop(1, "#c0ccad");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = "rgba(255,255,224,.4)";
  ctx.lineWidth = 0.7;
  for (let y = 10; y < 125; y += 12) for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(64, y);
    ctx.quadraticCurveTo(64 + side * 27, y + 5, 64 + side * 64, y + 26);
    ctx.stroke();
  }
  ctx.fillStyle = "#e7edc6";
  ctx.fillRect(63, 0, 2, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  broadLeafMaterial = NATURAL_MATERIAL.clone();
  broadLeafMaterial.map = texture;
  broadLeafMaterial.bumpMap = texture;
  broadLeafMaterial.bumpScale = 0.008;
  broadLeafMaterial.roughness = 0.72;
  return broadLeafMaterial;
}

export function organicMesh(parts, material = NATURAL_MATERIAL) {
  const group = new THREE.Group(), buckets = new Map();
  const dummy = new THREE.Object3D(), color = new THREE.Color();
  group.userData.voxels = parts;
  group.material = material;
  for (const part of parts) {
    const shape = part.geometry || "rounded";
    const surface = ["broadLeaf", "splitLeaf"].includes(shape) ? "veined"
      : part.leaf && ["crown", "rounded", "cone", "pyramid", "stem"].includes(shape) ? "foliage" : "base";
    const key = `${shape}:${surface}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(part);
  }
  for (const [key, items] of buckets) {
    const [kind, surface] = key.split(":");
    const surfaceMaterial = material === NATURAL_MATERIAL
      ? surface === "foliage" ? leafyMaterial() : surface === "veined" ? veinedMaterial() : material
      : material;
    const mesh = new THREE.InstancedMesh(geometry[kind] || geometry.rounded, surfaceMaterial, items.length);
    items.forEach((part, i) => {
      dummy.position.set(part.x, part.y, part.z);
      dummy.rotation.set(part.rx || 0, part.ry || 0, part.rz || 0);
      dummy.scale.set(part.sx, part.sy, part.sz);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, color.set(part.color));
    });
    mesh.userData.voxels = items;
    Object.defineProperty(mesh.userData, "entityId", { get: () => group.userData.entityId });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    group.add(mesh);
  }
  for (const property of ["castShadow", "receiveShadow"]) {
    let enabled = true;
    Object.defineProperty(group, property, {
      get: () => enabled,
      set(value) { enabled = value; group.children.forEach((child) => child[property] = value); },
      configurable: true,
    });
    group[property] = true;
  }
  group.dispose = () => group.children.forEach((child) => child.dispose());
  return group;
}
