import * as THREE from "three";

export function random(seed) {
  let n = seed | 0;
  return () => {
    n = (n + 0x6d2b79f5) | 0;
    let t = Math.imul(n ^ (n >>> 15), 1 | n);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function insideShape(shape, x, y, z) {
  const r = Math.hypot(x, z);
  switch (shape) {
    case "sphere": return x * x + (y * 2 - 1) ** 2 + z * z <= 1.12;
    case "cube": return Math.max(Math.abs(x), Math.abs(z), Math.abs(y * 2 - 1)) <= 0.86;
    case "pyramid": return Math.max(Math.abs(x), Math.abs(z)) <= 1 - y * 0.88;
    case "cone": return r <= 1 - y * 0.9;
    case "cylinder": return r <= 0.83;
    case "spiral": return r < 0.22 || (r < 0.82 && Math.cos(Math.atan2(z, x) - y * Math.PI * 5) > -0.08);
    default: return x * x + z * z + (y * 2 - 1) ** 2 <= 1.18;
  }
}

// Deterministic leaves retain stable edit IDs, while their geometry is botanical.
export function plantVoxels(plant, seed = 17, shape = "natural") {
  const rng = random(seed), parts = [];
  const { kind, height: h, width: w } = plant;
  const leafColor = plant.color;
  const shade = (color, variation = 0.2) => new THREE.Color(color).multiplyScalar(0.9 + rng() * variation).getHex();
  function add(geometry, x, y, z, sx, sy, sz, color, leaf = false, rx = 0, ry = 0, rz = 0) {
    parts.push({ geometry, x, y, z, sx, sy, sz, color, leaf, rx, ry, rz, id: parts.length });
  }
  function stem(ax, ay, az, bx, by, bz, radius = 0.025, color = 0x586d2d) {
    const direction = new THREE.Vector3(bx - ax, by - ay, bz - az);
    const rotation = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize()));
    add("stem", (ax + bx) / 2, (ay + by) / 2, (az + bz) / 2, radius, direction.length(), radius, color, false, rotation.x, rotation.y, rotation.z);
  }
  function leaf(x, y, z, width, length, color, angle, tilt = 0) {
    add("leaf", x, y, z, width, Math.max(0.025, length * 0.12), length, shade(color), true, tilt, angle, (rng() - 0.5) * 0.2);
  }
  if (["flower", "lavender", "grass", "foliage"].includes(kind)) {
    if (kind === "foliage") {
      const fern = plant.id === "fern", monstera = plant.id === "monstera";
      const count = fern ? 12 : monstera ? 8 : 14;
      for (let i = 0; i < count; i++) {
        const angle = i * 2.39996, length = h * (0.65 + rng() * 0.45);
        const reach = w * ((fern ? 0.38 : 0.28) + rng() * 0.15), tx = Math.sin(angle) * reach, tz = Math.cos(angle) * reach;
        const top = length * (monstera ? 0.8 : fern ? 0.72 : 0.5);
        stem(0, 0.04, 0, tx, top, tz, 0.018);
        if (fern) {
          for (let j = 1; j <= 9; j++) {
            const t = j / 10, size = Math.sin(Math.PI * t) * w * 0.28;
            for (const side of [-1, 1]) {
              const a = angle + side * 0.85;
              leaf(tx * t + Math.sin(a) * size * 0.35, top * Math.sin(t * 1.5), tz * t + Math.cos(a) * size * 0.35, size * 0.4, size, leafColor, a, -0.2);
            }
          }
        } else if (monstera) {
          // A broad split leaf, built from curved lobes instead of a flat square.
          leaf(tx, top, tz, w * 0.3, w * 0.48, leafColor, angle, -0.35);
          for (let j = 0; j < 4; j++)
            for (const side of [-1, 1]) {
              const offset = (j / 3 - 0.5) * w * 0.28, spread = w * (0.12 + Math.sin(j / 4 * Math.PI) * 0.06);
              leaf(tx + Math.cos(angle) * side * spread - Math.sin(angle) * offset, top + 0.02, tz - Math.sin(angle) * side * spread - Math.cos(angle) * offset, w * 0.11, w * 0.3, leafColor, angle + side * 0.65, -0.3);
            }
        } else leaf(tx * 0.7, top, tz * 0.7, w * 0.28, w * 0.65, leafColor, angle, -0.35);
      }
    } else if (kind === "grass") {
      for (let i = 0; i < 45; i++) {
        const angle = i * 2.39996, height = h * (0.4 + rng() * 0.6), r = w * 0.3 * Math.sqrt(rng());
        leaf(Math.sin(angle) * r, height * 0.5, Math.cos(angle) * r, plant.id === "pampas" ? 0.045 : 0.025, height * 1.3, 0x7d913e, angle, -0.7);
        if (["pampas", "miscanthus"].includes(plant.id) && i % 4 === 0) {
          stem(Math.sin(angle) * r, 0, Math.cos(angle) * r, Math.sin(angle) * r * 1.2, height, Math.cos(angle) * r * 1.2, 0.012, 0x9a9c5e);
          add("crown", Math.sin(angle) * r * 1.2, height, Math.cos(angle) * r * 1.2, 0.11, height * 0.33, 0.1, shade(leafColor), true, -0.15, angle);
        }
      }
    } else {
      const count = kind === "lavender" ? 21 : ["rose", "wildflowers"].includes(plant.id) ? 19 : 7;
      for (let i = 0; i < count; i++) {
        const angle = i * 2.39996, r = Math.sqrt((i + 0.3) / count) * w * 0.38;
        const x = Math.cos(angle) * r, z = Math.sin(angle) * r, height = h * (0.6 + rng() * 0.4);
        stem(x, 0, z, x, height, z, 0.016);
        for (const side of [-1, 1]) leaf(x + side * 0.08, height * 0.4, z, 0.08, 0.25, 0x6c8a34, angle + side, -0.4);
        if (kind === "lavender") {
          for (let j = 0; j < 5; j++)
            add("crown", x + Math.sin(j * 2) * 0.025, height * (0.75 + j * 0.07), z, 0.1, 0.09, 0.1, shade(leafColor), true);
        } else {
          const tulip = plant.id === "tulip", sunflower = plant.id === "sunflower";
          const petals = tulip ? 6 : 9, size = sunflower ? 0.18 : 0.13;
          for (let j = 0; j < petals; j++) {
            const a = j / petals * Math.PI * 2;
            add("petal", x + Math.sin(a) * size * 0.6, height + (tulip ? 0.04 : 0), z + Math.cos(a) * size * 0.6, size, tulip ? 0.22 : 0.055, size * 1.6, shade(leafColor), true, tulip ? -0.65 : -0.12, a);
          }
          add("crown", x, height + 0.025, z, size * 0.7, 0.06, size * 0.7, sunflower ? 0x69502b : 0xd2af45, true);
        }
      }
    }
    return parts;
  }
  const tree = ["tree", "pine"].includes(kind);
  const conifer = ["conifer", "column", "pine"].includes(kind);
  const base = tree ? h * 0.4 : 0.08, crownHeight = h - base;
  stem(0, 0, 0, 0, tree ? h * 0.78 : h * 0.6, 0, tree ? 0.2 : 0.08, 0x816244);
  if (tree) for (let i = 0; i < 4; i++) {
    const angle = i * 2.4;
    stem(0, h * 0.38, 0, Math.cos(angle) * w * 0.3, h * (0.6 + i * 0.05), Math.sin(angle) * w * 0.3, 0.08, 0x8c6b43);
  }
  const density = tree ? 430 : conifer ? 340 : 290;
  // Small overlapping leaves follow a smooth silhouette, with no voxel lattice.
  for (let i = 0; i < density; i++) {
    const yy = (i + 0.5) / density, angle = i * 2.399963;
    let radius = Math.sqrt(Math.max(0, 1 - (yy * 2 - 1) ** 2));
    if (shape === "cone" || shape === "pyramid" || (shape === "natural" && conifer && kind !== "column")) radius = 1 - yy * 0.95;
    else if (shape === "cylinder") radius = 0.83;
    else if (shape === "cube" || (shape === "natural" && kind === "hedge")) radius = 0.86 / Math.max(Math.abs(Math.cos(angle)), Math.abs(Math.sin(angle)));
    else if (shape === "spiral") radius = 0.64 + Math.sin(yy * Math.PI * 5 + angle) * 0.23;
    if (shape === "pyramid") radius /= Math.max(Math.abs(Math.cos(angle)), Math.abs(Math.sin(angle)));
    if (kind === "column" && shape === "natural") radius = Math.pow(radius, 0.45) * 0.85;
    const irregular = 0.92 + rng() * 0.13;
    let x = Math.cos(angle) * radius * w * 0.47 * irregular;
    let z = Math.sin(angle) * radius * w * 0.47 * irregular;
    let y = base + yy * crownHeight;
    if (tree && !conifer) {
      x += Math.sin(yy * 9) * w * 0.08;
      z += Math.cos(yy * 11) * w * 0.06;
    }
    const size = tree ? 0.12 : conifer ? 0.075 : 0.075;
    const color = kind === "flowerbush" && yy < 0.55 ? 0x6f8d3d : leafColor;
    add("leaf", x, y, z, size * (0.8 + rng() * 0.5), size * 0.55, size * 1.8, shade(color, 0.28), true, (rng() - 0.5) * Math.PI, angle, (rng() - 0.5) * Math.PI);
  }
  // Soft inner masses fill the canopy while each surface leaf stays editable.
  if (shape !== "spiral") {
    const center = base + crownHeight * 0.5;
    if (shape === "cone" || shape === "pyramid" || (shape === "natural" && conifer && kind !== "column"))
      add(shape === "pyramid" ? "pyramid" : "cone", 0, center, 0, w * 0.92, crownHeight, w * 0.92, shade(leafColor, 0.12), true);
    else if (shape === "cube" || (kind === "hedge" && shape === "natural"))
      add("rounded", 0, center, 0, w * 0.87, crownHeight * 0.94, w * 0.87, shade(leafColor, 0.12), true);
    else if (shape === "cylinder")
      add("stem", 0, center, 0, w * 0.86, crownHeight, w * 0.86, shade(leafColor, 0.12), true);
    else if (tree && shape === "natural") {
      add("crown", 0, center, 0, w * 0.88, crownHeight * 0.96, w * 0.88, shade(leafColor, 0.1), true);
      for (let i = 0; i < 4; i++) {
        const angle = i * 2.4;
        add("crown", Math.cos(angle) * w * 0.17, center + Math.sin(angle) * crownHeight * 0.14, Math.sin(angle) * w * 0.14, w * 0.64, crownHeight * 0.7, w * 0.64, shade(leafColor, 0.1), true);
      }
    } else
      add("crown", 0, center, 0, w * (kind === "column" ? 0.8 : 0.92), crownHeight * 0.98, w * (kind === "column" ? 0.8 : 0.92), shade(leafColor, 0.1), true);
  }
  return parts;
}
