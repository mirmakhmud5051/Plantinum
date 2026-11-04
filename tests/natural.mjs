import { chromium } from "playwright";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { starterGarden } from "../src/state.js";

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
    (process.platform === "win32" && existsSync("C:/Program Files/Google/Chrome/Application/chrome.exe")
      ? "C:/Program Files/Google/Chrome/Application/chrome.exe" : undefined),
  headless: true, args: ["--no-sandbox"],
});
const errors = [], url = process.env.TEST_URL || "http://localhost:5173";
await mkdir("test-results", { recursive: true });
const ready = (page) => page.waitForFunction(() => window.plantinum && document.querySelector("#loading").classList.contains("hidden"));
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await context.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());
  const legacy = starterGarden();
  legacy.view = { position: [23, 24, 29], target: [0, 0, 0], mode: "free" };
  legacy.tutorial = 4;
  await context.addInitScript((save) => {
    if (!localStorage.getItem("plantinum-garden-v1")) localStorage.setItem("plantinum-garden-v1", JSON.stringify(save));
  }, legacy);
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await ready(page);
  assert.equal(await page.evaluate(() => window.plantinum.game.mode), "walk");
  assert.equal(await page.evaluate(() => window.plantinum.game.camera.position.y), 1.68);
  assert.equal(await page.evaluate(() => window.plantinum.state.entities.length), legacy.entities.length);
  assert.equal(await page.locator("#collection").evaluate((el) => el.classList.contains("open")), false);
  const z = await page.evaluate(() => window.plantinum.game.camera.position.z);
  await page.keyboard.down("w");
  await page.waitForTimeout(500);
  await page.keyboard.up("w");
  assert.ok(await page.evaluate((before) => window.plantinum.game.camera.position.z < before, z));
  await page.mouse.move(600, 350);
  await page.mouse.down();
  await page.mouse.move(680, 390, { steps: 4 });
  await page.mouse.up();
  assert.ok(await page.evaluate(() => window.plantinum.game.yaw < -0.1));
  const fov = await page.evaluate(() => window.plantinum.game.camera.fov);
  await page.locator("#zoom-in").click();
  assert.equal(await page.evaluate(() => window.plantinum.game.mode), "walk");
  assert.ok(await page.evaluate((before) => window.plantinum.game.camera.fov < before, fov));
  await page.locator("#inventory-button").click();
  await page.locator('[data-plant="fern"]').click();
  assert.equal(await page.locator("#collection").evaluate((el) => el.classList.contains("open")), false);
  const spot = await page.evaluate(() => {
    const g = window.plantinum.game, rect = g.renderer.domElement.getBoundingClientRect(), previous = g.pointer.clone();
    for (const y of [-0.7, -0.5, -0.3, -0.1])
      for (const x of [-0.8, -0.5, -0.2, 0.2, 0.5, 0.8]) {
        g.pointer.set(x, y);
        const ground = g.getGround();
        const sx = rect.left + (x + 1) * rect.width / 2, sy = rect.top + (1 - y) * rect.height / 2;
        if (ground && g.canPlace(Math.round(ground.x * 2) / 2, Math.round(ground.z * 2) / 2) && !g.entityHit() && document.elementFromPoint(sx, sy) === g.renderer.domElement) {
          g.pointer.copy(previous);
          return { x: sx, y: sy };
        }
      }
    g.pointer.copy(previous);
    throw new Error("No planting spot is visible from eye height");
  });
  await page.mouse.click(spot.x, spot.y);
  assert.equal(await page.evaluate(() => window.plantinum.state.entities.length), legacy.entities.length + 1, "Ground clicks plant from the first-person camera");
  await page.locator("#save-button").click();
  const pose = await page.evaluate(() => ({ pos: window.plantinum.game.camera.position.toArray(), yaw: window.plantinum.game.yaw, pitch: window.plantinum.game.pitch, zoom: window.plantinum.game.walkZoom }));
  await page.reload({ waitUntil: "domcontentloaded" });
  await ready(page);
  assert.equal(await page.evaluate(() => window.plantinum.state.entities.length), legacy.entities.length + 1);
  assert.deepEqual(await page.evaluate(() => ({ pos: window.plantinum.game.camera.position.toArray(), yaw: window.plantinum.game.yaw, pitch: window.plantinum.game.pitch, zoom: window.plantinum.game.walkZoom })), pose);
  await page.locator("#home-button").click();
  await page.evaluate(() => {
    const g = window.plantinum.game;
    g.renderer.setAnimationLoop(null);
    g.setQuality("high");
    g.frame();
  });
  assert.equal(await page.evaluate(() => window.plantinum.game.renderer.getContext().getError()), 0);
  await page.screenshot({ path: "test-results/natural-first-person.png" });
  await page.locator("#camera-button").click();
  assert.equal(await page.evaluate(() => window.plantinum.game.mode), "free");
  await page.evaluate(() => window.plantinum.game.frame());
  await page.screenshot({ path: "test-results/natural-overview.png" });
  await context.close();

  const mobileContext = await browser.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await mobileContext.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());
  const mobile = await mobileContext.newPage();
  mobile.on("pageerror", (e) => errors.push(e.message));
  await mobile.goto(url, { waitUntil: "domcontentloaded" });
  await ready(mobile);
  await mobile.locator("#dismiss-tutorial").tap();
  assert.equal(await mobile.evaluate(() => window.plantinum.game.mode), "walk");
  assert.equal(await mobile.evaluate(() => window.plantinum.game.camera.position.y), 1.68);
  assert.equal(await mobile.evaluate(() => window.plantinum.game.ghost.visible), false, "The garden opens without an unrequested planting preview");
  await mobile.evaluate(() => {
    const g = window.plantinum.game;
    g.renderer.setAnimationLoop(null);
    g.setQuality("balanced");
    g.frame();
  });
  assert.equal(await mobile.evaluate(() => window.plantinum.game.renderer.getContext().getError()), 0);
  await mobile.screenshot({ path: "test-results/natural-mobile-landscape.png" });
  await mobileContext.close();
  assert.deepEqual(errors, []);
  console.log("PASS: legacy garden retained, natural geometry renders, eye-height default, walking/look/zoom, hidden catalog, camera persistence, mobile landscape, no WebGL or browser errors.");
} finally {
  await browser.close();
}
