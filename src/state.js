import { byId } from "./catalog.js";
import { QUALITY_LEVELS } from "./graphics.js";
export const SAVE_KEY = "plantinum-garden-v1";
export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export function createEntity(
  type,
  x,
  z,
  growth = 0.12,
  seed = Math.floor(Math.random() * 100000),
) {
  return {
    id: globalThis.crypto?.randomUUID?.() || `p-${Date.now()}-${Math.random()}`,
    type,
    x,
    z,
    rotation: 0,
    growth,
    water: 0.7,
    shape: "natural",
    removed: [],
    seed,
  };
}
export function starterGarden() {
  const entities = [];
  const add = (type, x, z, growth = 1) =>
    entities.push(createEntity(type, x, z, growth, entities.length * 153 + 17));
  add("sakura", -5.6, -4.5);
  add("oak", 7.1, 4.8);
  add("maple", -7, 5.3);
  for (let i = 0; i < 5; i++) {
    add("smaragd", -8, -6.3 + i * 2.7);
    add("columna", 8, -6.3 + i * 2.7);
  }
  for (let i = 0; i < 4; i++) {
    add("boxwood", -5.5 + i * 1.7, -7);
    add("boxwood", 2 + i * 1.7, 6.8);
  }
  add("round-bush", -5.4, 0);
  add("round-bush", -3.5, 0);
  add("cube-bush", -7.4, 0);
  for (let x = 0; x < 3; x++)
    for (let z = 0; z < 2; z++) {
      add("lavender", -6.3 + x * 1.1, 3 + z);
      add("tulip", 1.8 + x * 0.9, 3 + z * 0.9);
    }
  add("hydrangea", -7.2, -2.4);
  add("hydrangea", -3.3, -5.2);
  add("rose", 2.3, -5.9);
  add("rose", 3.5, -6);
  add("hosta", 4.5, -0.3);
  add("fern", 6.7, -0.2);
  add("pampas", 7.5, -4.2);
  add("daisy", -3, 6);
  add("pond", 5.6, -3.4);
  add("bench", -4.9, -1.9);
  add("lamp", 0.2, -5.8);
  add("lamp", 0.3, 5.7);
  add("pot", -0.1, 7);
  // Neighboring destinations are editable gardens too, with the same persistence format.
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++)
      add((i + j) % 2 ? "oak" : "maple", -27 + i * 4, -22 + j * 4);
  for (let i = 0; i < 7; i++)
    for (const side of [-1, 1]) {
      add(i % 2 ? "rose" : "wildflowers", 14 + i * 1.3, 16 + side * 1.4);
      add("stone-path", 14 + i * 1.3, 16);
    }
  for (let i = 0; i < 6; i++) {
    add("cube-bush", -27 + i * 1.8, 13);
    add("cube-bush", -27 + i * 1.8, 22);
    if (i < 4) {
      add("cube-bush", -27, 14.8 + i * 1.8);
      add("cube-bush", -18, 14.8 + i * 1.8);
    }
    if (i < 3) {
      add("cube-bush", -23.4, 14.8 + i * 1.8);
      add("cube-bush", -21.6, 18.4 + i * 1.8);
    }
  }
  add("bench", 21, -17);
  add("lamp", 23, -18);
  add("fountain", 21, -20);
  add("sakura", 18, -19);
  add("pond", 6, -20);
  add("bridge", 6, -20);
  add("pampas", 8.5, -21);
  add("rock", 3.7, -21.5);
  return {
    version: 1,
    entities,
    clock: 8.4,
    speed: 1,
    bounds: 48,
    view: { target: [0, 0, 0], position: [23, 24, 29] },
    settings: { quality: "auto", language: "uz", sound: false, volume: 0.35, dayCycle: true },
    tutorial: 0,
  };
}
export function validateSave(input) {
  if (
    !input ||
    input.version !== 1 ||
    !Array.isArray(input.entities) ||
    input.entities.length > 5000
  )
    throw new Error("This is not a supported Plantinum garden file.");
  const result = starterGarden(),
    ids = new Set();
  result.entities = input.entities.map((e) => {
    if (
      !e ||
      !byId(e.type) ||
      typeof e.id !== "string" ||
      ids.has(e.id) ||
      !Number.isFinite(e.x) ||
      !Number.isFinite(e.z) ||
      Math.abs(e.x) > 240 ||
      Math.abs(e.z) > 240
    )
      throw new Error("The garden contains an invalid plant or location.");
    ids.add(e.id);
    return {
      ...createEntity(e.type, e.x, e.z),
      ...e,
      growth: clamp(Number.isFinite(e.growth) ? e.growth : 1, 0, 1),
      water: clamp(Number.isFinite(e.water) ? e.water : 0.5, 0, 1),
      rotation: Number.isFinite(e.rotation) ? e.rotation : 0,
      seed: Number.isFinite(e.seed) ? e.seed : 17,
      shape: [
        "natural",
        "sphere",
        "cube",
        "pyramid",
        "cone",
        "spiral",
        "cylinder",
      ].includes(e.shape)
        ? e.shape
        : "natural",
      removed: Array.isArray(e.removed)
        ? e.removed.filter((n) => Number.isInteger(n) && n >= 0 && n < 10000)
        : [],
    };
  });
  result.clock = Number.isFinite(input.clock)
    ? input.clock >= 0 && input.clock < 24
      ? input.clock
      : ((input.clock % 24) + 24) % 24
    : 8.4;
  result.speed = [1, 2, 5, 10].includes(input.speed) ? input.speed : 1;
  result.bounds = clamp(
    Number.isFinite(input.bounds) ? input.bounds : 48,
    48,
    216,
  );
  if (
    input.view &&
    ["target", "position"].every(
      (k) =>
        Array.isArray(input.view[k]) &&
        input.view[k].length === 3 &&
        input.view[k].every((n) => Number.isFinite(n) && Math.abs(n) <= 500),
    )
  )
    result.view = { ...input.view };
  if (
    result.view.mode === "walk" &&
    (!Array.isArray(result.view.walkPosition) ||
      result.view.walkPosition.length !== 3 ||
      !result.view.walkPosition.every(Number.isFinite))
  )
    result.view.mode = "free";
  if (!Number.isFinite(result.view.yaw)) delete result.view.yaw;
  if (!Number.isFinite(result.view.pitch)) delete result.view.pitch;
  result.settings = { ...result.settings, ...input.settings };
  result.settings.language = ["uz", "en"].includes(input.settings?.language)
    ? input.settings.language : "uz";
  result.settings.quality = QUALITY_LEVELS.includes(
    result.settings.quality,
  )
    ? result.settings.quality
    : "auto";
  result.settings.volume = clamp(Number(result.settings.volume) || 0, 0, 1);
  result.settings.sound =
    typeof input.settings?.sound === "boolean" ? input.settings.sound : false;
  result.settings.dayCycle =
    typeof input.settings?.dayCycle === "boolean"
      ? input.settings.dayCycle
      : true;
  result.tutorial = Math.floor(clamp(Number(input.tutorial) || 0, 0, 4));
  return result;
}
export function advanceGrowth(entity, dt, speed = 1) {
  const p = byId(entity.type);
  if (!p.category) return false;
  const before = Math.floor(entity.growth * 20);
  entity.growth = clamp(
    entity.growth + dt * speed * p.speed * (0.2 + entity.water * 0.8),
    0,
    1,
  );
  entity.water = clamp(entity.water - dt * speed * 0.0007, 0, 1);
  return before !== Math.floor(entity.growth * 20);
}
export function stage(growth) {
  return ["Seed", "Sprout", "Young", "Growing", "Mature"][
    Math.min(4, Math.floor(growth * 5))
  ];
}
export function isPlaceable(x, z, entities, bounds, ignoreId) {
  if (Math.abs(x) > bounds - 1 || Math.abs(z) > bounds - 1) return false;
  if (Math.abs(x + 0.9) < 0.85 && Math.abs(z) < 8) return false;
  if (Math.abs(z - 1.6) < 0.75 && Math.abs(x) < 9) return false;
  return !entities.some(
    (e) =>
      e.id !== ignoreId &&
      Math.hypot(e.x - x, e.z - z) <
        (byId(e.type)?.kind === "pond" ? 2.4 : 0.68),
  );
}
