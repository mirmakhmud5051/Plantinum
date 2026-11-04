export const QUALITY_LEVELS = ["auto", "low", "balanced", "high", "ultra"];

export function graphicsProfile(quality = "auto", {
  mobile = false, software = false, pixelRatio = 1,
} = {}) {
  const level = QUALITY_LEVELS.includes(quality) && quality !== "auto"
    ? quality : software ? "low" : mobile ? "balanced" : "high";
  const presets = {
    low: { resolution: software ? 0.65 : 1.25, shadows: false, shadowSize: 512, radius: 1 },
    balanced: { resolution: 1.75, shadows: true, shadowSize: 1024, radius: mobile ? 1 : 2 },
    high: { resolution: 2.25, shadows: true, shadowSize: 2048, radius: mobile ? 1 : 2 },
    ultra: { resolution: 3, shadows: true, shadowSize: 2048, radius: 2 },
  };
  const preset = presets[level];
  return {
    level, low: level === "low", ...preset,
    pixelRatio: Math.min(Math.max(0.5, pixelRatio || 1), preset.resolution),
  };
}
