import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
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
  args: ["--no-sandbox"],
});
const url = process.env.TEST_URL || "http://localhost:5173";
const errors = [];
const ready = (p) =>
  p.waitForFunction(
    () =>
      window.plantinum &&
      document.querySelector("#loading").classList.contains("hidden"),
  );
await mkdir("test-results", { recursive: true });

try {
 if (process.env.TEST_PHASE !== "mobile") {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();
  await context.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await ready(page);
  await page.evaluate(() => window.plantinum.game.setCamera("free"));
  await page.locator("#dismiss-tutorial").click();
  await page.locator('[data-tool="hose"]').click();
  const target = await page.evaluate(() => {
    const g = window.plantinum.game,
      r = g.renderer.domElement.getBoundingClientRect();
    const old = g.pointer.clone();
    for (const e of g.state.entities.filter(
      (e) => e.type === "boxwood" || e.type === "round-bush",
    )) {
      const m = g.meshes.get(e.id),
        v = m.userData.voxels
          .filter((v) => v.leaf)
          .sort((a, b) => b.y - a.y)[0];
      const p = g.camera.position.clone().set(v.x, v.y, v.z);
      m.localToWorld(p);
      p.project(g.camera);
      const x = r.left + ((p.x + 1) / 2) * r.width,
        y = r.top + ((-p.y + 1) / 2) * r.height;
      g.pointer.set(p.x, p.y);
      const hit = g.entityHit();
      g.pointer.copy(old);
      if (
        document.elementFromPoint(x, y) === g.renderer.domElement &&
        hit?.object.userData.entityId === e.id
      )
        return { id: e.id, x, y };
    }
    throw new Error("No visible shrub found");
  });
  await page.mouse.click(target.x, target.y);
  assert.ok(
    await page.evaluate(
      (id) =>
        window.plantinum.state.entities.find((e) => e.id === id).water > 0.99,
      target.id,
    ),
  );
  await page.locator('[data-tool="saw"]').click();
  await page.mouse.click(target.x, target.y);
  assert.ok(
    await page.evaluate(
      (id) =>
        window.plantinum.state.entities.find((e) => e.id === id).growth < 0.9,
      target.id,
    ),
  );
  await page.keyboard.press("r");
  assert.equal(
    await page.evaluate(
      (id) => window.plantinum.state.entities.find((e) => e.id === id).rotation,
      target.id,
    ),
    Math.PI / 2,
  );
  console.log("Hose, pruning, and rotation passed.");

  await page.locator('[data-tool="plant"]').click();
  await page.locator("#camera-button").click();
  await page.mouse.move(640, 400);
  await page.mouse.down();
  await page.mouse.move(640, 530, { steps: 5 });
  await page.mouse.up();
  await page.waitForFunction(() => window.plantinum.game.pending !== null);
  await page.mouse.move(640, 530);
  await page.mouse.down();
  await page.mouse.move(640, 110, { steps: 6 });
  await page.mouse.up();
  await page.waitForFunction(
    () =>
      window.plantinum.game.pitch > 0 && window.plantinum.game.pending === null,
  );
  const count = await page.evaluate(
    () => window.plantinum.state.entities.length,
  );
  await page.keyboard.press("e");
  assert.equal(
    await page.evaluate(() => window.plantinum.state.entities.length),
    count,
    "Aiming at the sky cannot plant at a stale previous location",
  );
  const pose = await page.evaluate(() => ({
    pos: window.plantinum.game.camera.position.toArray(),
    yaw: window.plantinum.game.yaw,
    pitch: window.plantinum.game.pitch,
  }));
  await page.locator("#save-button").click();
  await page.reload();
  await ready(page);
  assert.equal(await page.evaluate(() => window.plantinum.game.mode), "walk");
  assert.deepEqual(
    await page.evaluate(() => window.plantinum.game.camera.position.toArray()),
    pose.pos,
  );
  assert.equal(await page.evaluate(() => window.plantinum.game.yaw), pose.yaw);
  assert.equal(
    await page.evaluate(() => window.plantinum.game.pitch),
    pose.pitch,
  );
  await page.locator("#camera-button").click();
  console.log("Sky placement guard and walking camera persistence passed.");

  await page.locator("#settings-button").click();
  const downloadPromise = page.waitForEvent("download");
  await page.locator("#export-button").click();
  const download = await downloadPromise;
  await download.saveAs("test-results/exported-garden.json");
  const exported = JSON.parse(
    await readFile("test-results/exported-garden.json", "utf8"),
  );
  assert.equal(exported.version, 1);
  assert.equal(exported.entities.length, count);
  await page
    .locator("#import-file")
    .setInputFiles({
      name: "bad-garden.json",
      mimeType: "application/json",
      buffer: Buffer.from('{"version":2,"entities":[]}'),
    });
  await page.waitForFunction(() =>
    /not a supported|qo‘llab-quvvatlanmaydigan/.test(document.querySelector("#toast").textContent),
  );
  assert.equal(
    await page.evaluate(() => window.plantinum.state.entities.length),
    count,
  );
  exported.speed = 10;
  await Promise.all([
    page.waitForNavigation({ waitUntil: "domcontentloaded" }),
    page
      .locator("#import-file")
      .setInputFiles({
        name: "garden.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(exported)),
      }),
  ]);
  await ready(page);
  assert.equal(await page.evaluate(() => window.plantinum.state.speed), 10);
  console.log(
    "Garden download, invalid-file rejection and imported-save restore passed.",
  );
  await context.close();
 }

  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const mobile = await mobileContext.newPage();
  await mobileContext.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());
  mobile.on("pageerror", (e) => errors.push(e.message));
  async function tap(selector) {
    const rect = await mobile.locator(selector).boundingBox();
    assert.ok(rect, `${selector} is visible`);
    await mobile.touchscreen.tap(rect.x + rect.width / 2, rect.y + rect.height / 2);
  }
  await mobile.goto(url, { waitUntil: "domcontentloaded" });
  await ready(mobile);
  await mobile.locator("#dismiss-tutorial").click();
  await tap("#menu-button");
  await tap("#menu-explore");
  await tap("#expand-world");
  assert.equal(await mobile.evaluate(() => window.plantinum.state.bounds), 72);
  await tap("#modal-close");
  const before = await mobile.evaluate(() => ({
    count: window.plantinum.state.entities.length,
    distance: window.plantinum.game.camera.position.distanceTo(
      window.plantinum.game.controls.target,
    ),
    fov: window.plantinum.game.camera.fov,
  }));
  const cdp = await mobileContext.newCDPSession(mobile);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { x: 155, y: 440, id: 1 },
      { x: 235, y: 440, id: 2 },
    ],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [
      { x: 125, y: 440, id: 1 },
      { x: 265, y: 440, id: 2 },
    ],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  const after = await mobile.evaluate(() => ({
    count: window.plantinum.state.entities.length,
    distance: window.plantinum.game.camera.position.distanceTo(
      window.plantinum.game.controls.target,
    ),
    fov: window.plantinum.game.camera.fov,
    pointers: window.plantinum.game.activePointers.size,
  }));
  assert.equal(after.count, before.count);
  assert.equal(after.pointers, 0);
  assert.ok(Math.abs(after.distance - before.distance) > 0.1 || Math.abs(after.fov - before.fov) > 0.1);
  await mobile.screenshot({ path: "test-results/mobile-pinch.png" });
  console.log(
    "Mobile world menu, expansion, and real two-finger pinch without accidental planting passed.",
  );
  await mobileContext.close();
  assert.deepEqual(errors, []);
  console.log("PASS: lifecycle checks, no uncaught browser errors.");
} finally {
  await browser.close();
}
