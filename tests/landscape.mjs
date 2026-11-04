import { chromium } from "playwright";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
    (process.platform === "win32" && existsSync("C:/Program Files/Google/Chrome/Application/chrome.exe")
      ? "C:/Program Files/Google/Chrome/Application/chrome.exe" : undefined),
  headless: true,
  args: ["--no-sandbox"],
});
const errors = [];
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await context.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());
const page = await context.newPage();
page.setDefaultTimeout(30000);
page.on("pageerror", (error) => errors.push(error.message));
await mkdir("test-results", { recursive: true });
const ready = () => page.waitForFunction(() => window.plantinum && document.querySelector("#loading").classList.contains("hidden"));
const intersects = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
async function withinScreen(selector) {
  const box = await page.locator(selector).boundingBox();
  const { width, height } = page.viewportSize();
  assert.ok(box && box.width > 0 && box.height > 0, `${selector} is visible`);
  assert.ok(box.x >= -1 && box.y >= -1 && box.x + box.width <= width + 1 && box.y + box.height <= height + 1, `${selector} stays inside ${width}x${height}: ${JSON.stringify(box)}`);
  return box;
}
async function draw() {
  await page.evaluate(() => window.plantinum.game.frame());
}
try {
  await page.goto(process.env.TEST_URL || "http://localhost:5173", { waitUntil: "domcontentloaded" });
  await ready();
  await page.locator("#dismiss-tutorial").tap();
  await page.evaluate(() => {
    window.plantinum.game.renderer.setAnimationLoop(null);
    window.landscapeCalls = [];
    document.documentElement.requestFullscreen = async () => {
      window.landscapeCalls.push("fullscreen");
      throw new Error("Fullscreen is unavailable");
    };
    screen.orientation.lock = async (mode) => {
      window.landscapeCalls.push(mode);
      throw new Error("Orientation lock is unavailable");
    };
  });
  await page.locator("#orientation-button").tap();
  assert.deepEqual(await page.evaluate(() => window.landscapeCalls), ["fullscreen", "landscape"]);
  assert.match(await page.locator("#toast").textContent(), /yonboshlating/);
  const joystick = await page.locator("#joystick").boundingBox();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: joystick.x + joystick.width / 2 + 20, y: joystick.y + joystick.height / 2, id: 7 }] });
  assert.ok(await page.evaluate(() => window.plantinum.game.joystick.x > 0.5));
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForFunction(() => window.plantinum.game.joystick.x === 0);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  const count = await page.evaluate(() => window.plantinum.state.entities.length);

  for (const [width, height] of [[844, 390], [932, 430], [667, 375], [568, 320], [1024, 430]]) {
    await page.setViewportSize({ width, height });
    await page.waitForFunction(() => window.plantinum.game.camera.aspect === document.querySelector("#scene").clientWidth / document.querySelector("#scene").clientHeight);
    await draw();
    assert.equal(await page.locator(".scene-title").isVisible(), false);
    assert.equal(await page.locator(".main-nav").isVisible(), false);
    assert.equal(await page.evaluate(() => window.plantinum.game.camera.view.offsetX), 0);
    const left = await withinScreen("#joystick");
    const right = await withinScreen("#mobile-action");
    const dock = await withinScreen(".tool-dock");
    assert.ok(!intersects(left, dock) && !intersects(right, dock), "Primary controls do not overlap the toolbar");
    const inventory = await withinScreen("#inventory-button");
    const camera = await withinScreen(".view-controls");
    assert.ok(!intersects(inventory, camera));
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.locator("#inventory-button").tap();
    await page.waitForFunction(() => document.querySelector("#collection").getBoundingClientRect().left >= 0);
    await withinScreen("#collection");
    assert.ok(await page.locator("#plant-grid").evaluate((el) => el.clientHeight >= 70), "Catalog keeps space for selectable cards");
    await page.locator('[data-plant="tulip"]').tap();
    assert.equal(await page.locator("#collection").evaluate((el) => el.classList.contains("open")), false, "Choosing a plant closes the mobile catalog on wide phones too");
    assert.equal(await page.evaluate(() => window.plantinum.game.panelOpen), false);
    await page.locator('[data-tool="shape"]').tap();
    await withinScreen("#shape-tray");
    await page.locator('[data-shape="sphere"]').tap();
    await page.locator('[data-tool="water"]').tap();
    assert.equal(await page.evaluate(() => window.plantinum.game.tool), "water");
    await page.locator("#undo-button").tap();
    assert.equal(await page.evaluate(() => window.plantinum.state.entities.length), count);
    await page.locator("#settings-button").tap();
    await withinScreen("#modal");
    await page.locator("#reset-button").scrollIntoViewIfNeeded();
    await withinScreen("#reset-button");
    await page.locator("#modal").evaluate((el) => el.scrollTop = 0);
    await page.locator("#modal-close").tap();
    if (width === 844 || width === 932 || width === 568) {
      await draw();
      await page.screenshot({ path: `test-results/landscape-${width}x${height}.png` });
    }
    console.log(`PASS: ${width}x${height}, camera, touch controls, catalog, shapes, settings and no unintended planting.`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() => document.querySelector("#scene").clientWidth < document.querySelector("#scene").clientHeight);
  await withinScreen("#joystick");
  await withinScreen("#mobile-action");
  assert.equal(await page.evaluate(() => window.plantinum.state.entities.length), count);
  assert.deepEqual(errors, []);
  console.log("PASS: portrait restored, unsupported rotation fallback, joystick reset on rotation; no browser errors.");
} catch (error) {
  await page.screenshot({ path: "test-results/landscape-failure.png" }).catch(() => {});
  throw error;
} finally {
  await browser.close();
}
