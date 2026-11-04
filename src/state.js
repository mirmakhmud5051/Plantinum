import { byId } from "./catalog.js";
import { QUALITY_LEVELS } from "./graphics.js";
import { GARDEN_LAYOUT_VERSION, REFERENCE_PLANTS, legacyStarterPlants, reservedGardenGround, bedAt } from "./garden-layout.js";
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
  for (const [type, x, z, growth = 1] of REFERENCE_PLANTS) add(type, x, z, growth);
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
    gardenLayout: GARDEN_LAYOUT_VERSION,
    entities,
    clock: 8.4,
    speed: 1,
    bounds: 48,
    view: { target: [0, 0, 0], position: [23, 24, 29], mode: "walk", walkPosition: [-0.9, 1.68, 6.5], yaw: 0, pitch: -0.12, styleVersion: 2 },
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
  result.gardenLayout = input.gardenLayout === GARDEN_LAYOUT_VERSION ? GARDEN_LAYOUT_VERSION : 1;
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
export function upgradeGardenLayout(state) {
  if (state.gardenLayout === GARDEN_LAYOUT_VERSION) return state;
  const legacy = legacyStarterPlants();
  const stock = state.entities.filter((entity) => legacy.some(([type, x, z], index) =>
    entity.type === type && entity.seed === index * 153 + 17 &&
    Math.abs(entity.x - x) < 0.001 && Math.abs(entity.z - z) < 0.001));
  state.gardenLayout = GARDEN_LAYOUT_VERSION;
  if (!stock.length) return state;
  const fixed = state.entities.filter((entity) => !stock.includes(entity)), used = new Set();
  const free = (x, z, type) => !fixed.some((entity) => Math.hypot(entity.x - x, entity.z - z) <
    (entity.type === "pond" || type === "pond" ? 2.4 : 0.8));
  // Only untouched starter locations move. Every specimen keeps its identity and edits.
  for (const entity of stock) {
    const index = REFERENCE_PLANTS.findIndex(([type, x, z], i) => !used.has(i) && type === entity.type && free(x, z, type));
    if (index !== -1) {
      [entity.x, entity.z] = REFERENCE_PLANTS[index].slice(1, 3);
      used.add(index);
    } else {
      let location;
      for (let z = 7; z >= -7 && !location; z -= 1.1)
        for (let x = -7.5; x < 8; x += 1.1)
          if (bedAt(x, z, 0.5) && free(x, z, entity.type) && !REFERENCE_PLANTS.some(([, px, pz]) => Math.hypot(px - x, pz - z) < 0.85)) {
            location = [x, z]; break;
          }
      // Overflow specimens form a border outside the fence, never a discarded plant.
      if (!location) for (let z = -7; z < state.bounds - 1; z += 1.7) {
        if (free(-11, z, entity.type)) { location = [-11, z]; break; }
      }
      if (location) [entity.x, entity.z] = location;
    }
    fixed.push(entity);
  }
  REFERENCE_PLANTS.forEach(([type, x, z, growth = 1], index) => {
    if (state.entities.length >= 5000) return;
    if (used.has(index) || !free(x, z, type)) return;
    // A type entirely removed or moved by the player isn't automatically restored.
    if (legacy.some(([oldType]) => oldType === type) && !stock.some((entity) => entity.type === type)) return;
    const entity = createEntity(type, x, z, growth, 100000 + index * 153);
    state.entities.push(entity); fixed.push(entity);
  });
  return state;
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
  if (reservedGardenGround(x, z)) return false;
  return !entities.some(
    (e) =>
      e.id !== ignoreId &&
      Math.hypot(e.x - x, e.z - z) <
        (byId(e.type)?.kind === "pond" ? 2.4 : 0.68),
  );
}
