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
  const shade = (color, variation = 0.2) => new THREE.Color(color).multiplyScalar(0.82 + rng() * variation).getHex();
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
      const count = fern ? 23 : monstera ? 13 : 22;
      for (let i = 0; i < count; i++) {
        const angle = i * 2.39996 + rng() * 0.18;
        const inner = i % 3 === 0;
        const reach = w * (inner ? 0.23 : (fern ? 0.46 : 0.39) + rng() * 0.1);
        const tx = Math.sin(angle) * reach, tz = Math.cos(angle) * reach;
        const top = h * (inner ? 0.9 : fern ? 0.42 + rng() * 0.2 : monstera ? 0.32 + rng() * 0.3 : 0.68 + rng() * 0.18);
        if (fern) {
          // Each pinnate frond has a curved rachis and tapered pairs of leaflets.
          const point = (t) => [tx * t, 0.035 + top * Math.sin(t * Math.PI * 0.84), tz * t];
          for (let j = 1; j <= 12; j++) {
            const t = j / 13, size = Math.pow(Math.sin(Math.PI * t), 0.8) * w * (inner ? 0.14 : 0.21);
            const p = point(t), previous = point((j - 1) / 13);
            stem(...previous, ...p, 0.008, 0x7c9635);
            for (const side of [-1, 1]) {
              const a = angle + side * 1.05;
              leaf(p[0] + Math.sin(a) * size * 0.42, p[1], p[2] + Math.cos(a) * size * 0.42,
                size * 0.32, size, leafColor, a, -0.12 + t * 0.35);
            }
          }
          const a = point(12 / 13), b = point(1);
          stem(...a, ...b, 0.006, 0x7c9635);
          leaf(b[0], b[1], b[2], 0.026, w * 0.1, leafColor, angle, 0.25);
        } else if (monstera) {
          const length = w * (0.4 + rng() * 0.12), petiole = reach * 0.5;
          stem(0, 0.04, 0, Math.sin(angle) * petiole, top, Math.cos(angle) * petiole, 0.018, 0x5b7c2b);
          const tilt = inner ? -0.52 : (rng() - 0.5) * 0.75;
          add("splitLeaf", Math.sin(angle) * (petiole + length * 0.34), top - Math.sin(tilt) * length * 0.34,
            Math.cos(angle) * (petiole + length * 0.34), length * 0.83, length, length,
            shade(leafColor, 0.3), true, tilt, angle, (rng() - 0.5) * 0.18);
        } else {
          // Broad, veined hosta leaves rise from a compact basal rosette.
          add("broadLeaf", Math.sin(angle) * 0.035, 0.02, Math.cos(angle) * 0.035,
            w * (inner ? 0.22 : 0.29), top, reach, shade(leafColor, 0.28), true, 0, angle);
        }
      }
    } else if (kind === "grass") {
      for (let i = 0; i < 76; i++) {
        const angle = i * 2.39996, height = h * (0.48 + rng() * 0.52), r = w * 0.12 * Math.sqrt(rng());
        const green = plant.id === "grass" ? leafColor : "#7e9546";
        add("blade", Math.sin(angle) * r, 0.015, Math.cos(angle) * r,
          plant.id === "pampas" ? 0.028 : 0.013, height, w * (0.26 + rng() * 0.28), shade(green, 0.3), true, 0, angle);
        if (["pampas", "miscanthus"].includes(plant.id) && i % 4 === 0) {
          const x = Math.sin(angle) * w * 0.2, z = Math.cos(angle) * w * 0.2;
          stem(Math.sin(angle) * r, 0, Math.cos(angle) * r, x, height, z, 0.009, 0x9a9c5e);
          add("crown", x, height, z, 0.075, height * 0.25, 0.075, shade(leafColor), true, -0.15, angle);
        }
      }
    } else {
      const lavender = kind === "lavender", rose = plant.id === "rose", wild = plant.id === "wildflowers";
      const sunflower = plant.id === "sunflower", tulip = plant.id === "tulip";
      const count = lavender ? 32 : rose ? 32 : wild ? 42 : sunflower ? 13 : 11;
      // Low, leafy cushions carry the flower heads, as in the pink border.
      if (rose || wild)
        add("crown", 0, h * 0.26, 0, w * 0.86, h * 0.51, w * 0.86, 0x527c2c, true);
      if (!tulip) for (let i = 0; i < (lavender ? 54 : 125); i++) {
        const angle = i * 2.39996, t = rng(), radius = Math.sqrt(1 - t * t) * w * 0.43;
        const x = Math.sin(angle) * radius, z = Math.cos(angle) * radius;
        leaf(x, h * (0.1 + t * (sunflower ? 0.5 : 0.46)), z,
          w * 0.065, w * 0.19, lavender ? "#75875a" : "#4b722c", angle, (rng() - 0.5) * 1.1);
      }
      for (let i = 0; i < count; i++) {
        const angle = i * 2.39996, r = Math.sqrt((i + 0.3) / count) * w * 0.43;
        const x = Math.cos(angle) * r, z = Math.sin(angle) * r;
        const mound = Math.sqrt(Math.max(0, 1 - (r / (w * 0.5)) ** 2));
        const height = h * (rose || wild ? 0.23 + mound * 0.4 + rng() * 0.06 : 0.52 + rng() * 0.46);
        stem(x * 0.75, 0, z * 0.75, x, height, z, 0.01);
        for (const side of [-1, 1]) leaf(x + side * 0.05, height * 0.44, z, 0.07, 0.2, 0x668a32, angle + side, -0.4);
        if (lavender) {
          for (let j = 0; j < 6; j++)
            add("petal", x + Math.sin(j * 2) * 0.018, height * (0.8 + j * 0.042), z, 0.065, 0.075, 0.065, shade(leafColor, 0.28), true);
        } else {
          const petals = tulip ? 6 : sunflower ? 12 : rose ? 7 : 5;
          const size = sunflower ? 0.14 : rose ? 0.075 : wild ? 0.052 : 0.1;
          const rings = rose ? 2 : 1;
          for (let ring = 0; ring < rings; ring++) for (let j = 0; j < petals; j++) {
            const a = j / petals * Math.PI * 2 + ring * 0.4, s = size * (1 - ring * 0.35);
            add("petal", x + Math.sin(a) * s * 0.64, height + (tulip ? 0.04 : ring * 0.025), z + Math.cos(a) * s * 0.64,
              s, tulip ? 0.2 : 0.038, s * (sunflower ? 1.8 : 1.35), shade(leafColor, 0.32), true, tulip ? -0.65 : -0.12, a);
          }
          add("petal", x, height + (rose ? 0.034 : 0.016), z, size * (sunflower ? 0.8 : 0.38), 0.035,
            size * (sunflower ? 0.8 : 0.38), sunflower ? 0x77572a : 0xd5b45b, true);
        }
      }
    }
    return parts;
  }
  if (kind === "flowerbush" && shape === "natural") {
    // Hydrangeas carry separate flower heads over a green shrub, never a solid
    // pink/blue canopy. Every floret remains an individually editable part.
    const foliage = plantVoxels({ ...plant, kind: "bush", color: "#5f8733", height: h * 0.72 }, seed);
    foliage.forEach((part) => parts.push({ ...part, id: parts.length }));
    for (let i = 0; i < 14; i++) {
      const t = (i + 0.5) / 14, angle = i * 2.39996;
      const radius = Math.sqrt(1 - t * t) * w * 0.35;
      const cx = Math.sin(angle) * radius, cz = Math.cos(angle) * radius, cy = h * (0.46 + t * 0.36);
      const head = w * 0.14;
      for (let j = 0; j < 13; j++) {
        const a = j * 2.39996, r = head * Math.sqrt((j + 0.5) / 13);
        const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
        const y = cy + Math.sqrt(Math.max(0, head * head - r * r)) * 0.65;
        for (let k = 0; k < 4; k++) {
          const b = k * Math.PI / 2 + a;
          add("petal", x + Math.sin(b) * 0.023, y, z + Math.cos(b) * 0.023,
            0.047, 0.022, 0.056, shade(leafColor, 0.35), true, 0, b);
        }
        add("petal", x, y + 0.01, z, 0.018, 0.018, 0.018, 0xded39a, true);
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
  const density = tree ? 540 : conifer ? 620 : 580;
  // Small overlapping leaves follow a smooth silhouette, with no voxel lattice.
  for (let i = 0; i < density; i++) {
    const yy = (i + 0.5) / density, angle = i * 2.399963;
    let radius = Math.sqrt(Math.max(0, 1 - (yy * 2 - 1) ** 2));
    if (shape === "cone" || shape === "pyramid") radius = 1 - yy * 0.97;
    else if (shape === "natural" && conifer && kind !== "column") radius = Math.pow(1 - yy, 0.72) * (0.91 + Math.sin(yy * Math.PI) * 0.08);
    else if (shape === "cylinder") radius = 0.83;
    else if (shape === "cube" || (shape === "natural" && kind === "hedge")) radius = 0.86 / Math.max(Math.abs(Math.cos(angle)), Math.abs(Math.sin(angle)));
    else if (shape === "spiral") radius = 0.64 + Math.sin(yy * Math.PI * 5 + angle) * 0.23;
    if (shape === "pyramid") radius /= Math.max(Math.abs(Math.cos(angle)), Math.abs(Math.sin(angle)));
    if (kind === "column" && shape === "natural") radius = Math.pow(radius, 0.45) * 0.85;
    const irregular = 0.97 + rng() * 0.06;
    let x = Math.cos(angle) * radius * w * 0.47 * irregular;
    let z = Math.sin(angle) * radius * w * 0.47 * irregular;
    let y = base + yy * crownHeight;
    if (tree && !conifer) {
      x += Math.sin(yy * 9) * w * 0.08;
      z += Math.cos(yy * 11) * w * 0.06;
    }
    const size = tree ? 0.1 : conifer ? 0.035 : 0.036;
    const color = kind === "flowerbush" && yy < 0.55 ? 0x6f8d3d : leafColor;
    const litColor = new THREE.Color(color).multiplyScalar(0.78 + yy * 0.18 + rng() * 0.25).getHex();
    add("leaf", x, y, z, size * (0.8 + rng() * 0.5), size * 0.38, size * (conifer ? 2.4 : 1.55), litColor, true,
      (rng() - 0.5) * 1.9, angle, (rng() - 0.5) * 1.9);
  }
  // Soft inner masses fill the canopy while each surface leaf stays editable.
  if (shape !== "spiral") {
    const center = base + crownHeight * 0.5;
    if (shape === "natural" && conifer && kind !== "column") {
      add("cone", 0, center, 0, w * 0.9, crownHeight, w * 0.9, shade(leafColor, 0.16), true);
      // Overlapping, tapered sprays soften the straight cone into dense thuja.
      for (let i = 0; i < 6; i++) {
        const t = 0.12 + i * 0.13, r = Math.pow(1 - t, 0.72) * w * 0.85;
        add("crown", 0, base + t * crownHeight, 0, r, crownHeight * 0.3, r, shade(leafColor, 0.2), true);
      }
    } else if (shape === "cone" || shape === "pyramid")
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
