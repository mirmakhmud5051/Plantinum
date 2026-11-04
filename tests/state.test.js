import test from "node:test";
import assert from "node:assert/strict";
import { PLANTS, BUILDS, byId } from "../src/catalog.js";
import {
  starterGarden,
  validateSave,
  createEntity,
  advanceGrowth,
  isPlaceable,
  stage,
} from "../src/state.js";
import { entityVoxels, insideShape } from "../src/voxels.js";

test("every species and decoration generates finite, individually addressable blocks", () => {
  for (const p of [...PLANTS, ...BUILDS]) {
    const e = createEntity(p.id, 0, 0, 1, 19),
      voxels = entityVoxels(e);
    assert.ok(voxels.length > 0, p.id);
    const ids = new Set();
    for (const v of voxels) {
      assert.ok(
        ["x", "y", "z", "sx", "sy", "sz"].every((k) => Number.isFinite(v[k])),
        p.id,
      );
      assert.ok(!ids.has(v.id));
      ids.add(v.id);
    }
  }
});
test("saved garden round trip preserves trimmed blocks, rotation, growth, view and settings", () => {
  const s = starterGarden(),
    e = s.entities.find((e) => e.type === "boxwood");
  e.shape = "spiral";
  e.removed = [4, 22, 27];
  e.rotation = Math.PI / 2;
  e.water = 0.26;
  e.growth = 0.72;
  s.clock = 19.7;
  s.speed = 5;
  s.bounds = 120;
  s.settings.quality = "low";
  const restored = validateSave(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(restored, s);
});
test("malformed files fail without replacing the existing garden", () => {
  assert.throws(() => validateSave({ version: 2, entities: [] }));
  for (const change of [{ x: NaN }, { type: "missing" }, { z: Infinity }]) {
    const s = starterGarden();
    Object.assign(s.entities[0], change);
    assert.throws(() => validateSave(s));
  }
  const duplicate = starterGarden();
  duplicate.entities.push(duplicate.entities[0]);
  assert.throws(() => validateSave(duplicate));
});
test("invalid numeric growth and settings are normalized", () => {
  const s = starterGarden();
  s.entities[0].growth = 4;
  s.entities[0].water = -2;
  s.clock = -3;
  s.speed = 500;
  s.bounds = 999;
  s.settings.volume = 20;
  const loaded = validateSave(s);
  assert.equal(loaded.entities[0].growth, 1);
  assert.equal(loaded.entities[0].water, 0);
  assert.equal(loaded.clock, 21);
  assert.equal(loaded.speed, 1);
  assert.equal(loaded.bounds, 216);
  assert.equal(loaded.settings.volume, 1);
});
test("invalid tutorial, audio flags and camera rotation cannot break a restored garden", () => {
  const s = starterGarden();
  s.tutorial = 1.5;
  s.settings.sound = "yes";
  s.settings.dayCycle = "false";
  s.view.yaw = Infinity;
  s.view.pitch = NaN;
  const loaded = validateSave(s);
  assert.equal(loaded.tutorial, 1);
  assert.equal(loaded.settings.sound, false);
  assert.equal(loaded.settings.dayCycle, true);
  assert.equal(loaded.view.yaw, undefined);
  assert.equal(loaded.view.pitch, undefined);
});
test("watering and time speed increase growth without exceeding mature stage", () => {
  const dry = createEntity("boxwood", 0, 0, 0.1, 17),
    wet = { ...dry, water: 1 },
    fast = { ...wet };
  dry.water = 0;
  advanceGrowth(dry, 20);
  advanceGrowth(wet, 20);
  advanceGrowth(fast, 20, 10);
  assert.ok(wet.growth > dry.growth);
  assert.ok(fast.growth > wet.growth);
  advanceGrowth(fast, 10000, 10);
  assert.equal(fast.growth, 1);
  assert.equal(stage(1), "Mature");
});
test("paths, ponds, occupied spots and world bounds block placement; moving ignores itself", () => {
  const e = createEntity("boxwood", 3, 4, 1);
  assert.equal(isPlaceable(3, 4, [e], 48), false);
  assert.equal(isPlaceable(3, 4, [e], 48, e.id), true);
  assert.equal(isPlaceable(-1, 5, [], 48), false);
  assert.equal(isPlaceable(5, 1.6, [], 48), false);
  assert.equal(isPlaceable(49, 4, [], 48), false);
  assert.equal(isPlaceable(10, 10, [], 48), true);
});
test("manual trimming removes exactly the requested stable voxel ids", () => {
  const e = createEntity("boxwood", 0, 0, 1, 17),
    before = entityVoxels(e),
    cut = before
      .filter((v) => v.leaf)
      .slice(0, 8)
      .map((v) => v.id);
  e.removed = cut;
  const after = entityVoxels(e);
  assert.equal(before.length - after.length, cut.length);
  assert.ok(after.every((v) => !cut.includes(v.id)));
  assert.deepEqual(entityVoxels(JSON.parse(JSON.stringify(e))), after);
});
test("all six topiary shapes produce distinct nonempty geometry", () => {
  const signatures = new Set();
  for (const shape of [
    "sphere",
    "cube",
    "pyramid",
    "cone",
    "spiral",
    "cylinder",
  ]) {
    const e = createEntity("boxwood", 0, 0, 1, 17);
    e.shape = shape;
    const leaves = entityVoxels(e).filter((v) => v.leaf);
    assert.ok(leaves.length > 0, shape);
    signatures.add(JSON.stringify(leaves.map((v) => [v.x, v.y, v.z])));
  }
  assert.equal(signatures.size, 6);
  assert.equal(insideShape("sphere", 2, 0.5, 0), false);
});
