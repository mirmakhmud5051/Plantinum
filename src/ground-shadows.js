import * as THREE from "three";
import { byId } from "./catalog.js";

// One draw call for gentle contact shadows, including on phones with shadow maps off.
export class GroundShadows {
  constructor(scene) {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d"),
      g = ctx.createRadialGradient(32, 32, 3, 32, 32, 30);
    g.addColorStop(0, "rgba(43,65,30,.3)");
    g.addColorStop(0.45, "rgba(43,65,30,.17)");
    g.addColorStop(1, "rgba(43,65,30,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    this.texture = new THREE.CanvasTexture(canvas);
    this.geometry = new THREE.PlaneGeometry(1, 1);
    this.geometry.rotateX(-Math.PI / 2);
    this.material = new THREE.MeshBasicMaterial({
      map: this.texture,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    });
    this.mesh = new THREE.InstancedMesh(this.geometry, this.material, 5000);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
  }
  update(entities) {
    const d = new THREE.Object3D();
    let i = 0;
    for (const e of entities) {
      const p = byId(e.type);
      if (!p.category) continue;
      const size = Math.max(0.45, p.width * (0.2 + e.growth * 0.8) * 1.25);
      d.position.set(e.x, 0.201, e.z);
      d.scale.set(size, 1, size);
      d.updateMatrix();
      this.mesh.setMatrixAt(i++, d.matrix);
    }
    this.mesh.count = i;
    this.mesh.instanceMatrix.needsUpdate = true;
  }
  dispose() {
    this.mesh.dispose();
    this.geometry.dispose();
    this.material.dispose();
    this.texture.dispose();
  }
}
