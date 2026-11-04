import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

function curvedLeaf() {
  const vertices = [], indices = [];
  const rows = 8;
  for (let i = 0; i <= rows; i++) {
    const t = i / rows, width = Math.pow(Math.sin(t * Math.PI), 0.8) * 0.5;
    const lift = Math.sin(t * Math.PI) - 0.5;
    vertices.push(-width, lift - 0.12, t - 0.5, 0, lift, t - 0.5, width, lift - 0.12, t - 0.5);
    if (i < rows) for (let j = 0; j < 2; j++) {
      const a = i * 3 + j;
      indices.push(a, a + 3, a + 1, a + 1, a + 3, a + 4);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
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
  crown: new THREE.SphereGeometry(0.5, 12, 8),
  petal: new THREE.SphereGeometry(0.5, 8, 5),
  stem: new THREE.CylinderGeometry(0.38, 0.5, 1, 8),
  cone: new THREE.CylinderGeometry(0.02, 0.5, 1, 12),
  pyramid: new THREE.CylinderGeometry(0.02, 0.5, 1, 4),
  paving: pavingStone(),
  leaf: curvedLeaf(),
  stone: new THREE.IcosahedronGeometry(0.5, 1),
};
export const NATURAL_MATERIAL = new THREE.MeshStandardMaterial({ roughness: 0.86, metalness: 0, side: THREE.DoubleSide });
let foliageMaterial;
function leafyMaterial() {
  if (foliageMaterial || typeof document === "undefined") return foliageMaterial || NATURAL_MATERIAL;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#d2d6bb";
  ctx.fillRect(0, 0, 128, 128);
  let value = 731;
  const rng = () => { value = (value * 16807) % 2147483647; return value / 2147483647; };
  for (let i = 0; i < 10000; i++) {
    ctx.fillStyle = i % 3 ? "rgba(255,255,239,.38)" : "rgba(50,70,18,.25)";
    ctx.beginPath();
    ctx.ellipse(rng() * 128, rng() * 128, 0.7 + rng(), 0.5, rng() * 6.28, 0, Math.PI * 2);
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 2);
  foliageMaterial = NATURAL_MATERIAL.clone();
  foliageMaterial.map = texture;
  foliageMaterial.bumpMap = texture;
  foliageMaterial.bumpScale = 0.025;
  return foliageMaterial;
}

export function organicMesh(parts, material = NATURAL_MATERIAL) {
  const group = new THREE.Group(), buckets = new Map();
  const dummy = new THREE.Object3D(), color = new THREE.Color();
  group.userData.voxels = parts;
  group.material = material;
  for (const part of parts) {
    const shape = part.geometry || "rounded";
    const key = `${shape}:${part.leaf && shape !== "leaf" ? "foliage" : "base"}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(part);
  }
  for (const [key, items] of buckets) {
    const [kind, surface] = key.split(":");
    const mesh = new THREE.InstancedMesh(geometry[kind] || geometry.rounded, material === NATURAL_MATERIAL && surface === "foliage" ? leafyMaterial() : material, items.length);
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
