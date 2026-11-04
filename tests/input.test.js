import test from "node:test";
import assert from "node:assert/strict";
import { GardenGame } from "../src/game.js";

function setup(t) {
  const canvas = new EventTarget();
  const captures = new Set();
  canvas.setPointerCapture = (id) => captures.add(id);
  canvas.hasPointerCapture = (id) => captures.has(id);
  canvas.releasePointerCapture = (id) => captures.delete(id);
  const previousWindow = globalThis.window;
  globalThis.window = new EventTarget();
  t.after(() => {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  });
  const actions = [];
  const game = {
    renderer: { domElement: canvas },
    state: { settings: { sound: false } },
    mode: "walk",
    yaw: 0,
    pitch: 0,
    keys: new Set(),
    updatePointer(e) { this.lastPoint = [e.clientX, e.clientY]; },
    act() { actions.push(this.lastPoint); },
  };
  GardenGame.prototype.bindInput.call(game);
  const send = (type, x = 100, y = 100, id = 1) => {
    const event = new Event(type);
    Object.assign(event, { clientX: x, clientY: y, pointerId: id, button: 0 });
    canvas.dispatchEvent(event);
  };
  return { game, actions, send, canvas };
}

test("dragging away and returning to the start never uses a garden tool", (t) => {
  const { send, actions } = setup(t);
  send("pointerdown");
  send("pointermove", 150);
  send("pointermove");
  send("pointerup");
  assert.equal(actions.length, 0);
  send("pointerdown");
  send("pointerup");
  assert.equal(actions.length, 1, "A subsequent ordinary click still works");
});

test("a click acts at the release position even without a pointermove event", (t) => {
  const { send, actions } = setup(t);
  send("pointerdown");
  send("pointerup", 103, 102);
  assert.deepEqual(actions, [[103, 102]]);
});

test("losing focus clears multi-touch so the next single click works", (t) => {
  const { game, send, actions } = setup(t);
  send("pointerdown");
  send("pointerdown", 150, 100, 2);
  game.keys.add("KeyW");
  game.joystick = { x: 1, y: 1 };
  window.dispatchEvent(new Event("blur"));
  assert.equal(game.activePointers.size, 0);
  assert.equal(game.keys.size, 0);
  assert.deepEqual(game.joystick, { x: 0, y: 0 });
  send("pointerdown");
  send("pointerup");
  assert.equal(actions.length, 1);
});

test("canceled touches never act and do not disable the next click", (t) => {
  const { send, game, actions } = setup(t);
  send("pointerdown");
  send("pointerdown", 150, 100, 2);
  send("pointercancel");
  send("pointerup", 150, 100, 2);
  assert.equal(actions.length, 0);
  assert.equal(game.activePointers.size, 0);
  send("pointerdown");
  send("pointerup");
  assert.equal(actions.length, 1);
});

test("walking camera captures the pointer and capture loss cancels the action", (t) => {
  const { send, game, canvas, actions } = setup(t);
  send("pointerdown");
  assert.equal(canvas.hasPointerCapture(1), true);
  send("lostpointercapture");
  assert.equal(game.activePointers.size, 0);
  send("pointerup");
  assert.equal(actions.length, 0);
});
