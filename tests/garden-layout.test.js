import test from "node:test";
import assert from "node:assert/strict";
import { BED_HEIGHT, GARDEN_BEDS, STONE_WALKS, bedAt, gardenSurface, legacyStarterPlants } from "../src/garden-layout.js";
import { createEntity, starterGarden, isPlaceable, upgradeGardenLayout, validateSave } from "../src/state.js";
import { entityVoxels } from "../src/voxels.js";

test("visible walking routes and timber borders stay unplantable, with usable soil in every bed", () => {
  for (const path of STONE_WALKS) {
    const x = (path.x0 + path.x1) / 2, z = (path.z0 + path.z1) / 2;
    assert.equal(isPlaceable(x, z, [], 48), false);
    assert.equal(gardenSurface(x, z), 0.18);
  }
  for (const bed of GARDEN_BEDS) {
    const x = (bed.x0 + bed.x1) / 2, z = (bed.z0 + bed.z1) / 2;
    assert.equal(isPlaceable(x, z, [], 48), true, bed.id);
    assert.equal(gardenSurface(x, z), BED_HEIGHT);
    assert.equal(isPlaceable(bed.x0, z, [], 48), false, "The timber edge is reserved");
  }
  assert.equal(isPlaceable(-5.3, 5, [], 48), false, "Narrow gravel lanes stay clear");
  assert.equal(isPlaceable(15, 5, [], 48), true, "The world outside the garden remains editable");
  const state = starterGarden();
  for (const entity of state.entities.filter((e) => Math.abs(e.x) < 8.5 && Math.abs(e.z) < 8))
    assert.ok(bedAt(entity.x, entity.z, 0.25), entity.type);
});

test("existing starter garden adopts the reference beds exactly once, preserving edited and custom plants", () => {
  const state = starterGarden();
  state.gardenLayout = 1;
  state.entities = legacyStarterPlants().map(([type, x, z], index) => createEntity(type, x, z, 1, index * 153 + 17));
  const trimmed = state.entities.find((e) => e.type === "boxwood");
  Object.assign(trimmed, { shape: "spiral", removed: [3, 12, 26], rotation: 1.57, water: 0.31 });
  const moved = state.entities.find((e) => e.type === "fern");
  moved.x = 20; moved.z = 22;
  const custom = createEntity("rose", 1, 5.5, 0.7, 12345);
  state.entities.push(custom);
  const before = structuredClone(state), ids = before.entities.map((e) => e.id);
  upgradeGardenLayout(state);
  assert.equal(state.gardenLayout, 2);
  assert.ok(ids.every((id) => state.entities.some((e) => e.id === id)), "No saved plant is removed");
  for (const entity of before.entities) {
    const after = state.entities.find((e) => e.id === entity.id);
    assert.deepEqual({ ...after, x: entity.x, z: entity.z }, entity);
  }
  assert.deepEqual(state.entities.find((e) => e.id === custom.id), custom);
  assert.deepEqual(state.entities.find((e) => e.id === moved.id), moved);
  assert.ok(bedAt(trimmed.x, trimmed.z));
  const once = structuredClone(state);
  assert.deepEqual(upgradeGardenLayout(state), once);
  assert.deepEqual(upgradeGardenLayout(validateSave(JSON.parse(JSON.stringify(state)))), once);
});

test("custom gardens are preserved and growing shrubs retain their filled canopy", () => {
  const state = starterGarden();
  state.gardenLayout = 1;
  state.entities = [createEntity("fern", 12, 12, 0.6, 311)];
  const entities = structuredClone(state.entities);
  upgradeGardenLayout(state);
  assert.deepEqual(state.entities, entities);
  const shrub = createEntity("boxwood", 1, 5, 0.75, 17);
  const core = entityVoxels(shrub).find((part) => part.geometry === "crown");
  assert.ok(core, "Growing shrubs have a solid leafy canopy");
  shrub.removed.push(core.id);
  assert.ok(!entityVoxels(shrub).some((part) => part.id === core.id), "Explicit trimming remains authoritative");
});
