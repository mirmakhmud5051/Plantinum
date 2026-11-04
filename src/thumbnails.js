import * as THREE from "three";
import { entityVoxels, voxelMesh } from "./voxels.js";
let renderer;
const cache = new Map();
export function thumbnail(type) {
  if (cache.has(type)) return cache.get(type);
  if (!renderer) {
    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
    });
    renderer.setSize(200, 160);
    renderer.setPixelRatio(1);
    renderer.setClearColor(0, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  }
  const scene = new THREE.Scene(),
    mesh = voxelMesh(
      entityVoxels(
        { type, seed: 17, shape: "natural", removed: [], growth: 1 },
        { preview: true },
      ),
    );
  scene.add(mesh, new THREE.AmbientLight(0xffffff, 2));
  const sun = new THREE.DirectionalLight(0xfff2d4, 3);
  sun.position.set(-3, 8, 5);
  scene.add(sun);
  const box = new THREE.Box3().setFromObject(mesh),
    size = box.getSize(new THREE.Vector3()),
    center = box.getCenter(new THREE.Vector3());
  const span = Math.max(size.y * 1.15, size.x * 0.98, size.z * 1.1, 1),
    camera = new THREE.OrthographicCamera(
      -span * 0.75,
      span * 0.75,
      span * 0.6,
      -span * 0.6,
      0.1,
      100,
    );
  camera.position.copy(center).add(new THREE.Vector3(7, 5, 9));
  camera.lookAt(center);
  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL();
  cache.set(type, url);
  mesh.dispose();
  return url;
}
export function releaseThumbnails() {
  renderer?.dispose();
  renderer = null;
}
