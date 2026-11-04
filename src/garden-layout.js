// One plan drives the visible beds, planting rules, ground height and minimap.
export const GARDEN_LAYOUT_VERSION = 2;
export const GARDEN_EDGE = { x0: -9.4, x1: 9.4, z0: -8.9, z1: 8.9 };
export const BED_HEIGHT = 0.29;
export const GARDEN_BEDS = [
  { id: "north-west", x0: -8.4, x1: -5.65, z0: -7.9, z1: -3.7 },
  { id: "topiary", x0: -4.95, x1: -2.15, z0: -7.9, z1: -3.7 },
  { id: "evergreen", x0: 0.35, x1: 3.5, z0: -7.9, z1: -3.7 },
  { id: "north-east", x0: 4.2, x1: 8.4, z0: -7.9, z1: -3.7 },
  { id: "fern-court", x0: -8.4, x1: -2.15, z0: -2.55, z1: 0.45 },
  { id: "water-court", x0: 0.35, x1: 8.4, z0: -2.55, z1: 0.45 },
  { id: "pink-border", x0: -8.4, x1: -5.65, z0: 2.75, z1: 7.9 },
  { id: "leaf-garden", x0: -4.95, x1: -2.15, z0: 2.75, z1: 7.9 },
  { id: "sunny-border", x0: 0.35, x1: 3.5, z0: 2.75, z1: 7.9 },
  { id: "golden-border", x0: 4.2, x1: 8.4, z0: 2.75, z1: 7.9 },
];
export const STONE_WALKS = [
  { x0: -1.8, x1: 0, z0: -8.9, z1: 8.9 },
  { x0: -9.4, x1: 9.4, z0: 0.8, z1: 2.4 },
  { x0: -9.4, x1: 9.4, z0: -3.5, z1: -2.75 },
];
export function inRect(x, z, rect, inset = 0) {
  return x >= rect.x0 + inset && x <= rect.x1 - inset && z >= rect.z0 + inset && z <= rect.z1 - inset;
}
export function bedAt(x, z, inset = 0) {
  return GARDEN_BEDS.find((bed) => inRect(x, z, bed, inset));
}
export function gardenSurface(x, z) {
  return bedAt(x, z) ? BED_HEIGHT : 0.18;
}
export function reservedGardenGround(x, z) {
  return inRect(x, z, GARDEN_EDGE) && !bedAt(x, z, 0.25);
}

// Layered planting: columns at the back, round shrubs, then ferns and flowers
// along the timber. The inner front bed deliberately leaves room to plant.
export const REFERENCE_PLANTS = [
  ["smaragd", -7.35, -6.9, 0.9], ["columna", -6.55, -5, 0.82],
  ["monstera", -7.35, -4.3], ["hosta", -6.4, -6.4],
  ["boxwood", -3.65, -6.7], ["smaragd", -3.4, -4.8, 0.75], ["fern", -3.6, -4.1],
  ["columna", 1.25, -6.9, 0.84], ["smaragd", 2.6, -6.55, 0.92],
  ["round-bush", 1.5, -4.5, 0.85], ["fern", 2.65, -4.35],
  ["smaragd", 5.3, -6.9, 0.85], ["columna", 7.2, -6.65, 0.9],
  ["boxwood", 5.4, -4.7], ["boxwood", 7.1, -4.5, 0.8], ["hosta", 6.45, -5.7],
  ["monstera", -7.05, -1.35], ["fern", -5.6, -0.85], ["boxwood", -4.15, -1.3, 0.9],
  ["fern", -2.9, -0.8], ["hosta", -5.75, -1.9], ["grass", -7.65, -0.3],
  ["round-bush", 1.4, -1.25, 0.82], ["fern", 2.75, -0.8], ["hosta", 3.9, -1.55],
  ["pond", 6.2, -1.1], ["pampas", 7.8, -1.85, 0.7],
  ["monstera", -7.25, 3.8], ["rose", -6.4, 5.05, 0.75],
  ["rose", -7.65, 5.2, 0.78], ["rose", -6.5, 6.6, 0.7], ["wildflowers", -7.65, 7],
  ["boxwood", -3.6, 3.8, 0.85], ["fern", -3.45, 5.45], ["monstera", -3.5, 7.05, 0.88],
  ["round-bush", 1.45, 3.85, 0.75], ["hosta", 2.75, 3.55],
  ["fern", 2.6, 5.15], ["grass", 1.25, 7],
  ["ornamental", 6.9, 4.2, 0.73], ["boxwood", 5.15, 3.7, 0.8],
  ["sunflower", 5.3, 5.3, 0.65], ["sunflower", 6.6, 5.8, 0.6],
  ["sunflower", 7.6, 6.3, 0.7], ["hosta", 4.95, 7.1], ["fern", 6.4, 7.15],
  ["lamp", -8.75, -8.3], ["lamp", 8.75, -8.3],
  ["hosta", -7.65, -5.65], ["fern", -6.45, -7.25],
  ["grass", -7.8, -7.25], ["hosta", -6.45, -4.15],
  ["fern", -4.1, -5.4], ["hosta", -2.85, -5.8], ["grass", -4.25, -7.2],
  ["hosta", 1.15, -5.55], ["grass", 2.8, -5.5],
  ["fern", 4.85, -5.85], ["hosta", 7.4, -5.5], ["grass", 6.25, -7.25],
  ["boxwood", -6.35, -1.5, 0.72], ["hosta", -4.8, -0.2], ["grass", -3.1, -1.95],
  ["rose", -7.7, 0, 0.65], ["fern", 0.95, -0.1], ["grass", 3.7, -0.1],
  ["hosta", 7.7, -0.1], ["fern", 4.3, -0.55],
  ["rose", -6.35, 3.5, 0.7], ["wildflowers", -7.6, 4.3],
  ["wildflowers", -6.35, 7.45], ["rose", -7.5, 6.1, 0.65], ["hosta", -6.35, 5.8],
  ["hosta", -4.25, 4.7], ["grass", -2.8, 4.6], ["fern", -4.25, 6.4],
  ["boxwood", -2.9, 6.3, 0.63], ["wildflowers", -4.3, 7.3],
  ["hosta", 2.65, 6.75], ["wildflowers", 1.4, 7.45],
  ["sunflower", 7.6, 4.9, 0.65], ["sunflower", 5.35, 6.3, 0.6],
  ["grass", 4.85, 4.5], ["wildflowers", 7.5, 7.35],
  // Large tree crowns frame the garden from outside instead of hiding its beds.
  ["oak", -11.8, -10.8], ["sakura", -12.2, 4.8], ["maple", 12.4, -7.3],
];

// Original starter signatures let an existing garden adopt the new plan without
// replacing user-added plants, cuts, IDs, water, rotation or moved specimens.
export function legacyStarterPlants() {
  const plants = [], add = (type, x, z) => plants.push([type, x, z]);
  add("sakura", -5.6, -4.5); add("oak", 7.1, 4.8); add("maple", -7, 5.3);
  for (let i = 0; i < 5; i++) { add("smaragd", -8, -6.3 + i * 2.7); add("columna", 8, -6.3 + i * 2.7); }
  for (let i = 0; i < 4; i++) { add("boxwood", -5.5 + i * 1.7, -7); add("boxwood", 2 + i * 1.7, 6.8); }
  add("round-bush", -5.4, 0); add("round-bush", -3.5, 0); add("cube-bush", -7.4, 0);
  for (let x = 0; x < 3; x++) for (let z = 0; z < 2; z++) {
    add("lavender", -6.3 + x * 1.1, 3 + z); add("tulip", 1.8 + x * 0.9, 3 + z * 0.9);
  }
  for (const entry of [
    ["hydrangea", -7.2, -2.4], ["hydrangea", -3.3, -5.2], ["rose", 2.3, -5.9], ["rose", 3.5, -6],
    ["hosta", 4.5, -0.3], ["fern", 6.7, -0.2], ["monstera", -2.7, 5.3], ["fern", 0.65, 4.5],
    ["hosta", -2.6, 2.8], ["pampas", 7.5, -4.2], ["daisy", -3, 6], ["pond", 5.6, -3.4],
    ["bench", -4.9, -1.9], ["lamp", 0.2, -5.8], ["lamp", 0.3, 5.7], ["pot", -0.1, 7],
  ]) add(...entry);
  return plants;
}
