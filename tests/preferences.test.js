import test from "node:test";
import assert from "node:assert/strict";
import { t, setLanguage, normalizeSearch, UZ } from "../src/i18n.js";
import { PLANTS, BUILDS, TOOLS } from "../src/catalog.js";
import { starterGarden, validateSave } from "../src/state.js";
import { graphicsProfile, QUALITY_LEVELS } from "../src/graphics.js";

test("all catalog names, tools and hints have Uzbek translations", () => {
  for (const item of [...PLANTS, ...BUILDS, ...TOOLS]) {
    assert.ok(Object.hasOwn(UZ, item.name), item.name);
    if (item.hint) assert.ok(Object.hasOwn(UZ, item.hint), item.hint);
  }
});

test("translated dynamic messages retain counts, names and shortcut keys", () => {
  setLanguage("uz");
  assert.equal(t("  Tulip planted. A little water will help it grow. "), "  Lola ekildi. Sug‘orsangiz, tezroq o‘sadi. ");
  assert.equal(t("Sprout · 35% grown"), "Nihol · 35% o‘sgan");
  assert.equal(t("28 plants to discover"), "28 ta o‘simlik");
  assert.equal(t("Switch camera · C"), "Kamerani almashtirish · C");
  assert.equal(t("96 × 96 m of possibility"), "96 × 96 m ochiq olam");
  setLanguage("en");
  assert.equal(t("Sprout · 35% grown"), "Sprout · 35% grown");
  setLanguage("uz");
});

test("Uzbek search accepts common apostrophe characters and English names", () => {
  for (const name of ["Qarag‘ay", "qarag'ay", "QARAGʻAY", "qarag’ay"])
    assert.equal(normalizeSearch(name), "qaragay");
  assert.ok(normalizeSearch(`Tulip ${t("Tulip")}`).includes(normalizeSearch("lola")));
});

test("language and every graphics preference survive save validation", () => {
  for (const language of ["uz", "en"])
    for (const quality of QUALITY_LEVELS) {
      const state = starterGarden();
      Object.assign(state.settings, { language, quality });
      assert.deepEqual(validateSave(JSON.parse(JSON.stringify(state))), state);
    }
  const legacy = starterGarden();
  delete legacy.settings.language;
  assert.equal(validateSave(legacy).settings.language, "uz");
  legacy.settings.language = "invalid";
  legacy.settings.quality = "invalid";
  assert.equal(validateSave(legacy).settings.language, "uz");
  assert.equal(validateSave(legacy).settings.quality, "auto");
});

test("automatic mobile graphics now render sharply with shadows", () => {
  const profile = graphicsProfile("auto", { mobile: true, pixelRatio: 3 });
  assert.equal(profile.level, "balanced");
  assert.equal(profile.pixelRatio, 1.75);
  assert.equal(profile.shadows, true);
  assert.equal(profile.shadowSize, 1024);
  assert.equal(profile.radius, 1, "Mobile chunk streaming stays bounded");
});

test("manual high and ultra preserve detail while software auto stays usable", () => {
  const env = { mobile: true, pixelRatio: 3, software: true };
  const low = graphicsProfile("auto", env);
  const high = graphicsProfile("high", env);
  const ultra = graphicsProfile("ultra", env);
  assert.equal(low.level, "low");
  assert.equal(low.pixelRatio, 0.65);
  assert.equal(high.pixelRatio, 2.25);
  assert.equal(ultra.pixelRatio, 3);
  assert.equal(high.shadows, true);
  assert.equal(ultra.shadowSize, 2048);
  assert.equal(graphicsProfile("high", { pixelRatio: 1 }).pixelRatio, 1);
});
