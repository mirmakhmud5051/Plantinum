import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
  (process.platform === "win32" &&
  existsSync("C:/Program Files/Google/Chrome/Application/chrome.exe")
    ? "C:/Program Files/Google/Chrome/Application/chrome.exe"
    : undefined);
const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: ["--no-sandbox", "--enable-webgl", "--ignore-gpu-blocklist"],
});
const url = process.env.TEST_URL || "http://localhost:5173",
  errors = [];
await mkdir("test-results", { recursive: true });
const context = await browser.newContext({
    viewport: { width: 1512, height: 982 },
  }),
  page = await context.newPage();
await context.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());
page.setDefaultTimeout(20000);
page.on("pageerror", (e) => errors.push(e.message));
const ready = async (p) => {
  await p.waitForFunction(
    () =>
      window.plantinum &&
      document.querySelector("#loading").classList.contains("hidden"),
  );
};
async function worldPoint(x, y, z) {
  return page.evaluate(
    ({ x, y, z }) => {
      const g = window.plantinum.game,
        p = g.camera.position.clone().set(x, y, z).project(g.camera),
        r = g.renderer.domElement.getBoundingClientRect();
      return {
        x: r.left + ((p.x + 1) / 2) * r.width,
        y: r.top + ((-p.y + 1) / 2) * r.height,
      };
    },
    { x, y, z },
  );
}
async function clickWorld(x, y, z) {
  const p = await worldPoint(x, y, z);
  await page.mouse.move(p.x, p.y);
  await page.waitForTimeout(100);
  await page.mouse.click(p.x, p.y);
  await page.waitForTimeout(150);
}
async function openSpot(exclude) {
  return page.evaluate((exclude) => {
    const g = window.plantinum.game,
      r = g.renderer.domElement.getBoundingClientRect(),
      old = g.pointer.clone();
    for (const z of [5.5, 4.5, 3.5, -1.5, -3, -5])
      for (const x of [1, 2, 3, -3, -4, -5, 5, 6]) {
        if (exclude && Math.hypot(x - exclude.x, z - exclude.z) < 2) continue;
        if (!g.canPlace(x, z)) continue;
        const v = g.camera.position.clone().set(x, 0.18, z).project(g.camera),
          sx = r.left + ((v.x + 1) / 2) * r.width,
          sy = r.top + ((-v.y + 1) / 2) * r.height;
        if (document.elementFromPoint(sx, sy) !== g.renderer.domElement)
          continue;
        g.pointer.set(v.x, v.y);
        const hit = g.entityHit();
        g.pointer.copy(old);
        if (!hit) return { x, z };
      }
    throw new Error("No unobstructed ground found in the garden");
  }, exclude);
}
async function clickEntity(id, leafOnly = false) {
  const p = await page.evaluate(
    ({ id, leafOnly }) => {
      const g = window.plantinum.game,
        m = g.meshes.get(id),
        voxels = m.userData.voxels;
      const v = [...voxels]
        .filter((v) => !leafOnly || v.leaf)
        .sort((a, b) => b.y - a.y)[0];
      const p = g.camera.position.clone().set(v.x, v.y + v.sy * 0.5, v.z);
      m.localToWorld(p);
      p.project(g.camera);
      const r = g.renderer.domElement.getBoundingClientRect();
      return {
        x: r.left + ((p.x + 1) / 2) * r.width,
        y: r.top + ((-p.y + 1) / 2) * r.height,
      };
    },
    { id, leafOnly },
  );
  await page.mouse.move(p.x, p.y);
  await page.waitForTimeout(100);
  await page.mouse.click(p.x, p.y);
  await page.waitForTimeout(150);
}
try {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await ready(page);
  await page.evaluate(() => window.plantinum.game.setCamera("free"));
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "test-results/desktop.png" });
  console.log("Loaded desktop garden.");
  await page.locator("#tutorial-next").click();
  await page.locator('[data-plant="boxwood"]').click();
  assert.equal(await page.evaluate(() => window.plantinum.state.tutorial), 2);
  const initial = await page.evaluate(
      () => window.plantinum.state.entities.length,
    ),
    plantedSpot = await openSpot();
  await clickWorld(plantedSpot.x, 0.18, plantedSpot.z);
  assert.equal(
    await page.evaluate(() => window.plantinum.state.entities.length),
    initial + 1,
    "Clicking the ground plants an entity",
  );
  const id = await page.evaluate(
    () => window.plantinum.state.entities.at(-1).id,
  );
  assert.equal(await page.evaluate(() => window.plantinum.state.tutorial), 3);
  console.log("Planted a new shrub with a ground click.");
  await page.locator('[data-tool="water"]').click();
  const before = await page.evaluate(
    (id) => window.plantinum.state.entities.find((e) => e.id === id).growth,
    id,
  );
  await clickEntity(id);
  assert.ok(
    await page.evaluate(
      ({ id, before }) =>
        window.plantinum.state.entities.find((e) => e.id === id).growth >
        before,
      { id, before },
    ),
    "Water tool encourages growth",
  );
  assert.equal(await page.evaluate(() => window.plantinum.state.tutorial), 4);
  await page.locator('[data-tool="shape"]').click();
  await page.locator('[data-shape="spiral"]').click();
  await clickEntity(id, true);
  assert.equal(
    await page.evaluate(
      (id) => window.plantinum.state.entities.find((e) => e.id === id).shape,
      id,
    ),
    "spiral",
  );
  await page.locator('[data-tool="trim"]').click();
  await clickEntity(id, true);
  assert.ok(
    await page.evaluate(
      (id) =>
        window.plantinum.state.entities.find((e) => e.id === id).removed
          .length > 0,
      id,
    ),
    "Scissors remove a real voxel",
  );
  console.log("Watered, sculpted, and trimmed individual voxels.");
  await page.locator('[data-tool="move"]').click();
  await clickEntity(id, true);
  assert.equal(await page.evaluate(() => !!window.plantinum.game.moving), true);
  const movedSpot = await openSpot(plantedSpot);
  await clickWorld(movedSpot.x, 0.18, movedSpot.z);
  assert.deepEqual(
    await page.evaluate((id) => {
      const e = window.plantinum.state.entities.find((e) => e.id === id);
      return [e.x, e.z];
    }, id),
    [movedSpot.x, movedSpot.z],
  );
  await page.locator('[data-tool="remove"]').click();
  await clickEntity(id, true);
  assert.equal(
    await page.evaluate(
      (id) => window.plantinum.state.entities.some((e) => e.id === id),
      id,
    ),
    false,
  );
  await page.locator("#undo-button").click();
  assert.equal(
    await page.evaluate(
      (id) => window.plantinum.state.entities.some((e) => e.id === id),
      id,
    ),
    true,
  );
  console.log("Moved, removed, and restored a plant with Undo.");
  await page.locator("#time-button").click();
  assert.equal(await page.evaluate(() => window.plantinum.state.speed), 2);
  await page.locator("#save-button").click();
  await page.reload();
  await ready(page);
  assert.ok(
    await page.evaluate(
      (id) =>
        window.plantinum.state.entities.find((e) => e.id === id)?.removed
          .length > 0,
      id,
    ),
    "Save restores edited leaf voxels",
  );
  assert.equal(await page.evaluate(() => window.plantinum.state.speed), 2);
  console.log("Reloaded the page and restored plant edits and speed.");
  await page.locator('[data-panel="build"]').click();
  await page.locator('[data-plant="bench"]').click();
  const count = await page.evaluate(
      () => window.plantinum.state.entities.length,
    ),
    buildSpot = await openSpot();
  await clickWorld(buildSpot.x, 0.18, buildSpot.z);
  assert.equal(
    await page.evaluate(() => window.plantinum.state.entities.length),
    count + 1,
    "Decorations can be placed",
  );
  await page.locator("#camera-button").click();
  const pos = await page.evaluate(
    () => window.plantinum.game.camera.position.z,
  );
  await page.keyboard.down("KeyW");
  await page.waitForTimeout(500);
  await page.keyboard.up("KeyW");
  assert.ok(
    await page.evaluate(
      (pos) => window.plantinum.game.camera.position.z < pos,
      pos,
    ),
    "WASD walks in first person",
  );
  await page.locator("#camera-button").click();
  await page.locator("#settings-button").click();
  await page.locator("#quality-select").selectOption("low");
  assert.equal(await page.evaluate(() => window.plantinum.game.low), true);
  await page.locator("#sound-setting").check();
  assert.equal(
    await page.evaluate(() => window.plantinum.game.audio.enabled),
    true,
  );
  await page.locator("#cycle-setting").uncheck();
  await page.locator("#modal-close").click();
  await page.locator("#world-nav").click();
  await page.locator("#expand-world").click();
  assert.equal(await page.evaluate(() => window.plantinum.state.bounds), 72);
  await page.locator('[data-zone="1"]').click();
  assert.equal(
    await page.evaluate(() => window.plantinum.game.controls.target.x),
    -23,
  );
  await page.locator("#garden-nav").click();
  await page.locator("#menu-button").click();
  await page.locator("#menu-continue").click();
  assert.equal(await page.locator("#modal").isVisible(), false);
  await page.screenshot({ path: "test-results/desktop-played.png" });
  console.log(
    "Desktop: planting, watering, shaping, voxel trimming, moving, deleting, undo, persistence, building, walking, settings, sound, expansion and menu passed.",
  );
  await context.close();
  const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
    }),
    mobile = await mobileContext.newPage();
  await mobileContext.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());
  mobile.on("pageerror", (e) => errors.push(e.message));
  await mobile.goto(url, { waitUntil: "domcontentloaded" });
  await ready(mobile);
  await mobile.evaluate(() => window.plantinum.game.setCamera("free"));
  await mobile.locator("#dismiss-tutorial").click();
  await mobile.locator("#inventory-button").tap();
  await mobile.locator('[data-plant="tulip"]').tap();
  assert.equal(
    await mobile
      .locator("#collection")
      .evaluate((e) => e.classList.contains("open")),
    false,
  );
  await mobile.locator("#mobile-action").tap();
  const mobileCount = await mobile.evaluate(
    () => window.plantinum.state.entities.length,
  );
  if (mobileCount === initial) {
    assert.ok(
      await mobile.evaluate(() => !!window.plantinum.game.selected || window.plantinum.game.pending?.ok === false),
      "Center action selects an object or rejects an occupied planting spot",
    );
    const point = await mobile.evaluate(() => {
      const g = window.plantinum.game,
        r = g.renderer.domElement.getBoundingClientRect();
      for (const z of [5.5, 4.5, -1.5, -3])
        for (const x of [1, 2, 3, -3, -4, 5]) {
          if (!g.canPlace(x, z)) continue;
          const v = g.camera.position.clone().set(x, 0.18, z).project(g.camera),
            sx = ((v.x + 1) / 2) * r.width,
            sy = r.top + ((-v.y + 1) / 2) * r.height;
          g.pointer.set(v.x, v.y);
          if (
            document.elementFromPoint(sx, sy) === g.renderer.domElement &&
            !g.entityHit()
          )
            return { x: sx, y: sy };
        }
      throw new Error("No mobile planting spot found");
    });
    await mobile.touchscreen.tap(point.x, point.y);
  }
  assert.equal(
    await mobile.evaluate(() => window.plantinum.state.entities.length),
    initial + 1,
    "Mobile touch plants an entity",
  );
  const j = await mobile.locator("#joystick").boundingBox(),
    cdp = await mobileContext.newCDPSession(mobile),
    jx = j.x + j.width / 2,
    jy = j.y + j.height / 2;
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: jx, y: jy, id: 7 }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: jx + 25, y: jy, id: 7 }],
  });
  assert.ok(
    await mobile.evaluate(() => window.plantinum.game.joystick.x > 0.5),
    "Joystick controls movement",
  );
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  assert.equal(
    await mobile.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await mobile.screenshot({ path: "test-results/mobile.png" });
  await mobile.locator("#inventory-button").tap();
  await mobile.screenshot({ path: "test-results/mobile-inventory.png" });
  await mobile.locator("#close-collection").tap();
  await mobile.setViewportSize({ width: 844, height: 390 });
  await mobile.waitForTimeout(300);
  assert.equal(
    await mobile.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await mobile.screenshot({ path: "test-results/mobile-landscape.png" });
  await mobileContext.close();
  console.log(
    "Mobile: responsive portrait and landscape, touch inventory, center planting action and joystick passed.",
  );
  assert.deepEqual(errors, [], "No uncaught browser errors");
  console.log("PASS: all browser checks; no uncaught JavaScript errors.");
} catch (error) {
  await page.screenshot({ path: "test-results/failure.png" }).catch(() => {});
  console.error("Browser errors:", errors);
  throw error;
} finally {
  await browser.close();
}
