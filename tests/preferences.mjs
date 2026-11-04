import { chromium } from "playwright";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
    (process.platform === "win32" && existsSync("C:/Program Files/Google/Chrome/Application/chrome.exe")
      ? "C:/Program Files/Google/Chrome/Application/chrome.exe" : undefined),
  headless: true,
  args: ["--no-sandbox"],
});
const errors = [];
const url = process.env.TEST_URL || "http://localhost:5173";
const ready = (page) => page.waitForFunction(() => window.plantinum && document.querySelector("#loading").classList.contains("hidden"));
await mkdir("test-results", { recursive: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
// External fonts must not delay tests when the network is unavailable.
await context.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());
const page = await context.newPage();
page.on("pageerror", (e) => errors.push(e.message));
page.setDefaultTimeout(30000);
const audit = {};
async function record(name) {
  audit[name] = await page.evaluate(() => {
    const walker = document.createTreeWalker(document.querySelector("#app"), NodeFilter.SHOW_TEXT);
    const texts = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node.parentElement?.checkVisibility() && node.textContent.trim()) texts.push(node.textContent.trim());
    }
    return texts;
  });
}

try {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await ready(page);
  assert.equal(await page.locator("html").getAttribute("lang"), "uz");
  await page.locator("#dismiss-tutorial").click();
  await record("garden");
  await page.locator("#inventory-button").tap();
  const fits = () => page.evaluate(() => {
    const heading = document.querySelector("#collection-title");
    const categories = document.querySelector("#categories");
    return heading.scrollWidth <= heading.clientWidth + 1 && [...categories.children].every((el) => el.getBoundingClientRect().right <= categories.getBoundingClientRect().right + 1);
  });
  assert.ok(await fits(), "Uzbek heading and category labels fit the mobile catalog");
  await page.locator("#search").fill("lola");
  assert.equal(await page.locator("[data-plant]").count(), 1);
  assert.equal(await page.locator('[data-plant="tulip"] strong').textContent(), "Lola");
  await page.locator("#search").fill("qarag'ay");
  assert.ok(await page.locator('[data-plant="pine"]').count());
  await record("inventory");
  await page.locator('[data-panel="tools"]').tap();
  await page.locator("#search").fill("sug'orish");
  assert.equal(await page.locator('[data-catalog-tool="water"]').count(), 1);
  await record("tools");
  await page.locator("#close-collection").tap();
  await page.locator("#settings-button").tap();
  assert.equal(await page.locator("#language-select").inputValue(), "uz");
  assert.equal(await page.locator("#language-select option[value=uz]").textContent(), "O‘zbekcha");
  await record("settings");
  await page.screenshot({ path: "test-results/uzbek-mobile-settings.png" });
  const saved = await page.evaluate(() => ({
    entities: JSON.stringify(window.plantinum.state.entities.map(({ growth, water, ...entity }) => entity)),
    view: window.plantinum.game.camera.position.toArray(),
  }));
  // Verify high-resolution render configuration without stressing a software GPU.
  await page.evaluate(() => window.plantinum.game.renderer.setAnimationLoop(null));
  for (const [quality, ratio, shadows] of [["balanced", 1.75, true], ["high", 2.25, true], ["ultra", 3, true], ["low", 0.65, false]]) {
    await page.locator("#quality-select").selectOption(quality);
    const config = await page.evaluate(() => {
      const g = window.plantinum.game;
      return { quality: g.state.settings.quality, ratio: g.renderer.getPixelRatio(), shadows: g.renderer.shadowMap.enabled };
    });
    assert.equal(config.quality, quality);
    assert.equal(config.ratio, quality === "low" && !(await page.evaluate(() => window.plantinum.game.software)) ? 1.25 : ratio);
    assert.equal(config.shadows, shadows);
    if (quality === "high") {
      assert.equal(await page.evaluate(() => {
        const g = window.plantinum.game;
        g.renderer.render(g.scene, g.camera);
        const gl = g.renderer.getContext();
        return gl.getError() === gl.NO_ERROR;
      }), true, "High quality renders a real frame with shadows and no WebGL errors");
    }
  }
  await Promise.all([
    page.waitForNavigation({ waitUntil: "domcontentloaded" }),
    page.locator("#language-select").selectOption("en"),
  ]);
  await ready(page);
  assert.equal(await page.locator("html").getAttribute("lang"), "en");
  assert.equal(await page.locator("#garden-nav").textContent(), " My garden");
  assert.equal(await page.evaluate(() => window.plantinum.state.settings.language), "en");
  assert.equal(await page.evaluate(() => window.plantinum.state.settings.quality), "low");
  assert.equal(await page.evaluate(() => JSON.stringify(window.plantinum.state.entities.map(({ growth, water, ...entity }) => entity))), saved.entities);
  assert.deepEqual(await page.evaluate(() => window.plantinum.game.camera.position.toArray()), saved.view);
  await page.locator("#settings-button").tap();
  await Promise.all([
    page.waitForNavigation({ waitUntil: "domcontentloaded" }),
    page.locator("#language-select").selectOption("uz"),
  ]);
  await ready(page);
  assert.equal(await page.locator("html").getAttribute("lang"), "uz");
  await page.locator("#menu-button").tap();
  await record("menu");
  await page.locator("#menu-explore").tap();
  await record("world");
  await page.locator("#modal-close").tap();
  await page.locator("#help-button").tap();
  await record("help");
  await page.locator("#help-done").tap();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: "test-results/uzbek-mobile.png" });
  await context.close();
  const desktop = await browser.newContext({ viewport: { width: 1512, height: 982 } });
  await desktop.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());
  const desktopPage = await desktop.newPage();
  desktopPage.on("pageerror", (e) => errors.push(e.message));
  await desktopPage.goto(url, { waitUntil: "domcontentloaded" });
  await ready(desktopPage);
  await desktopPage.locator("#dismiss-tutorial").click();
  assert.ok(await desktopPage.evaluate(() => {
    const heading = document.querySelector("#collection-title");
    const categories = document.querySelector("#categories");
    return heading.scrollWidth <= heading.clientWidth + 1 && [...categories.children].every((el) => el.getBoundingClientRect().right <= categories.getBoundingClientRect().right + 1);
  }), "Uzbek heading and category labels fit the desktop catalog");
  await desktopPage.screenshot({ path: "test-results/uzbek-desktop.png" });
  await desktop.close();
  assert.deepEqual(errors, []);
  console.log("PASS: Uzbek UI and search, both language switches, garden/camera persistence, all graphics levels, responsive layout; no browser errors.");
} finally {
  await writeFile("test-results/translation-audit.json", JSON.stringify(audit, null, 2));
  await browser.close();
}
