import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createEntity } from "../src/state.js";
import { entityVoxels, voxelMesh } from "../src/voxels.js";

test("natural plant meshes use curved leaves and round canopies, retaining edit hit IDs", () => {
  const entity = createEntity("boxwood", 0, 0, 1, 17);
  const parts = entityVoxels(entity), model = voxelMesh(parts);
  model.userData.entityId = entity.id;
  model.updateMatrixWorld(true);
  assert.ok(parts.some((part) => part.geometry === "leaf"));
  assert.ok(parts.some((part) => part.geometry === "crown"));
  assert.ok(model.children.every((child) => child.geometry.type !== "BoxGeometry"));
  const ray = new THREE.Raycaster(new THREE.Vector3(0, 5, 3), new THREE.Vector3(0, -4, -3).normalize());
  const hit = ray.intersectObject(model, true).find((hit) => hit.object.userData.voxels[hit.instanceId].leaf);
  assert.ok(hit, "Real leaf geometry is raycastable");
  assert.equal(hit.object.userData.entityId, entity.id);
  const leaf = hit.object.userData.voxels[hit.instanceId];
  entity.removed.push(leaf.id);
  assert.equal(entityVoxels(entity).length, parts.length - 1);
  model.dispose();
});

test("split leaves, rosettes and arching grass retain actual raycastable trim targets", () => {
  for (const [type, geometry] of [["monstera", "splitLeaf"], ["hosta", "broadLeaf"], ["grass", "blade"]]) {
    const entity = createEntity(type, 0, 0, 1, 17);
    const parts = entityVoxels(entity), part = parts.find((part) => part.geometry === geometry);
    const model = voxelMesh([part]);
    model.userData.entityId = entity.id;
    model.updateMatrixWorld(true);
    const center = new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3());
    const origin = center.clone().add(new THREE.Vector3(0, 4, 1));
    const ray = new THREE.Raycaster(origin, center.clone().sub(origin).normalize());
    const hit = ray.intersectObject(model, true)[0];
    assert.ok(hit, `${type} has a real leaf surface to trim`);
    assert.equal(hit.object.userData.entityId, entity.id);
    assert.equal(hit.object.userData.voxels[hit.instanceId].id, part.id);
    entity.removed.push(part.id);
    assert.equal(entityVoxels(JSON.parse(JSON.stringify(entity))).length, parts.length - 1);
    model.dispose();
  }
});
