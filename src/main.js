import "./style.css";
import { icon } from "./icons.js";
import { PLANTS, BUILDS, TOOLS, byId } from "./catalog.js";
import { SAVE_KEY, starterGarden, validateSave, upgradeGardenLayout, stage } from "./state.js";
import { GARDEN_BEDS, GARDEN_EDGE, STONE_WALKS } from "./garden-layout.js";
import { thumbnail } from "./thumbnails.js";
import { GardenGame, EYE_HEIGHT } from "./game.js";
import { t, localizeHTML, setLanguage, getLanguage, normalizeSearch } from "./i18n.js";
import { usesCompactLayout } from "./layout.js";

const $ = (s, root = document) => root.querySelector(s),
  $$ = (s, root = document) => [...root.querySelectorAll(s)];
let state,
  hasSave = false,
  loadError = "";
try {
  const raw = localStorage.getItem(SAVE_KEY);
  if (raw) {
    state = validateSave(JSON.parse(raw));
    hasSave = true;
  }
} catch {
  loadError =
    "Your previous save could not be read. Export or import a backup in Settings.";
}
state ??= starterGarden();
upgradeGardenLayout(state);
setLanguage(state.settings.language);
document.documentElement.lang = getLanguage();
document.title = t("Plantinum — Your little green escape");
const app = $("#app");
app.innerHTML = localizeHTML(`
 <header class="header">
  <button class="brand" id="menu-button" aria-label="Open Plantinum menu"><span class="brand-icon">${icon("leaf")}</span><span>PLANTINUM<small>YOUR LITTLE GREEN ESCAPE</small></span></button>
  <nav class="main-nav" aria-label="Main navigation"><button class="nav-button active" id="garden-nav">${icon("leaf")} My garden</button><button class="nav-button" id="world-nav">${icon("globe")} Explore the world</button></nav>
  <div class="header-actions"><button class="icon-button orientation-button" id="orientation-button" aria-label="Landscape mode" title="Landscape mode">${icon("landscape")}</button><span class="save-state" id="save-status"><i></i> All changes saved</span><button class="button save-button" id="save-button">${icon("save")}<span>Save garden</span></button><button class="icon-button" id="settings-button" aria-label="Settings" title="Settings">${icon("settings")}</button></div>
 </header>
 <main class="game-shell">
  <div id="scene" class="scene"></div>
  <div class="loading" id="loading"><span class="loading-sprout">${icon("sprout")}</span><strong>A little world is growing…</strong><span>Getting your garden ready</span></div>
  <aside class="collection" id="collection" aria-label="Plant and decoration inventory">
   <div class="collection-tabs"><button class="active" data-panel="plants">${icon("sprout")} Plants</button><button data-panel="build">${icon("build")} Build</button><button data-panel="tools" aria-label="Tools catalog">${icon("scissors")} Tools</button><button class="mobile-close icon-button" id="close-collection" aria-label="Close collection">${icon("close")}</button></div>
   <div class="collection-heading"><span class="eyebrow" id="collection-eyebrow">A LITTLE SOMETHING GREEN</span><h1 id="collection-title">Meet your new plants<span>.</span></h1><p id="collection-description">Big dreams start with little seeds.</p></div>
   <div class="search-wrap">${icon("search")}<input id="search" type="search" aria-label="Search the collection" placeholder="Find your next favorite…" autocomplete="off"/><span class="search-shortcut">⌕</span></div>
   <div class="categories" id="categories" aria-label="Filter plants">${["All", "Trees", "Shrubs", "Flowers", "Greens"].map((c) => `<button data-category="${c}" class="${c === "All" ? "active" : ""}">${c}</button>`).join("")}</div>
   <div class="inventory-meta"><span id="inventory-count">28 plants to discover</span><span>ALL YOURS ${icon("heart")}</span></div>
   <div class="plant-grid" id="plant-grid"></div>
   <div class="collection-tip">${icon("info")}<span>No coins. No rush.<br>Just you and a little imagination.</span></div>
  </aside>
  <div class="scene-title"><div class="location-label"><span></span> YOUR OWN PATCH OF PEACE</div><h2>A little care.<br>A lot of possibility.</h2><p>Plant something beautiful today.</p></div>
  <div class="weather-card"><div class="weather-icon">${icon("sun")}</div><div><strong id="weather-label">A lovely morning</strong><span><b id="clock">08:24</b><i>·</i> <span id="weather-period">A fresh start</span></span></div><button id="time-button" class="time-button" aria-label="Change time speed" title="Change growth and day speed">1×</button></div>
  <div class="view-controls"><button class="icon-button" id="camera-button" aria-label="Switch camera" title="Switch camera · C">${icon("camera")}</button><div class="control-divider"></div><button class="icon-button" id="zoom-in" aria-label="Zoom in" title="Zoom in">${icon("plus")}</button><button class="icon-button" id="zoom-out" aria-label="Zoom out" title="Zoom out">${icon("minus")}</button><div class="control-divider"></div><button class="icon-button" id="home-button" aria-label="Return to your garden" title="Return to your garden">${icon("compass")}</button><button class="icon-button" id="fullscreen-button" aria-label="Toggle fullscreen" title="Fullscreen">${icon("expand")}</button></div>
  <div class="selected-card hidden" id="selected-card"></div>
  <div class="tutorial" id="tutorial"></div>
  <div class="shape-tray hidden" id="shape-tray"><span>MAKE IT YOUR OWN</span><div>${["sphere", "cube", "pyramid", "cone", "spiral", "cylinder"].map((s) => `<button data-shape="${s}" class="${s === "sphere" ? "active" : ""}">${s[0].toUpperCase() + s.slice(1)}</button>`).join("")}</div></div>
  <div class="tool-dock-wrap"><div class="tool-hint" id="tool-hint">${icon("sprout")}<span>Choose a plant, then click the ground to plant it</span><kbd>R</kbd><span class="hint-rotate">to rotate</span></div><div class="tool-dock" role="toolbar" aria-label="Gardening tools"><div class="tool-dock-label">A LITTLE<br><strong>GARDEN MAGIC</strong></div>${TOOLS.map((t) => `<button class="tool-button ${t.id === "plant" ? "active" : ""}" data-tool="${t.id}" aria-label="${t.name}" title="${t.name} · ${t.key}"><span class="tool-key">${t.key}</span>${icon(t.icon)}<span>${t.name}</span></button>`).join("")}<span class="dock-divider"></span><button class="tool-button undo-button" id="undo-button" aria-label="Undo" title="Undo · Ctrl+Z">${icon("undo")}<span>Undo</span></button></div></div>
  <div class="garden-map"><div class="map-heading"><span>${icon("flag")} YOUR GARDEN</span><button class="map-expand" id="map-expand" aria-label="Explore garden map">${icon("expand")}</button></div><canvas id="minimap" width="300" height="200" aria-label="Garden map. Click to travel."></canvas><div class="map-caption"><span class="map-dot"></span><span id="plant-count">43 plants, endless possibilities</span></div></div>
  <div class="scene-bottom"><button id="sound-button" class="ambient-button" aria-label="Toggle garden sounds">${icon(state.settings.sound ? "volume" : "mute")}<span>Garden sounds <b>${state.settings.sound ? "on" : "off"}</b></span></button><span class="desktop-hints"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> move <i>·</i> drag to orbit <i>·</i> scroll to zoom</span><button class="help-button" id="help-button" aria-label="How to play">${icon("help")}<span>A helping hand</span></button></div>
  <button class="mobile-inventory" id="inventory-button" aria-label="Open plant inventory">${icon("sprout")}</button><div class="joystick" id="joystick" aria-label="Movement joystick"><div class="joystick-nub"></div></div><button class="mobile-action" id="mobile-action">${icon("sprout")}<span>Plant here</span></button><div class="crosshair"></div>
  <div class="toast hidden" id="toast" role="status" aria-live="polite"></div>
 </main>
 <footer class="footer"><span>${icon("leaf")} GROW AT YOUR OWN PACE.</span><span>A small garden. An infinite kind of happy.</span><span>Made for a slower moment ${icon("heart")}</span></footer>
 <dialog class="modal" id="modal"><button class="modal-close icon-button" id="modal-close" aria-label="Close dialog">${icon("close")}</button><div id="modal-body"></div></dialog>
 <input type="file" id="import-file" accept="application/json,.json" hidden />
`);
let game,
  panel = "plants",
  category = "All",
  toastTimer,
  saveTimer,
  lastSaved = Date.now(),
  replacingGarden = false;
function toast(message) {
  const el = $("#toast");
  el.innerHTML = localizeHTML(`${icon("leaf")}<span></span>`);
  $("span", el).textContent = t(message);
  el.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add("hidden"), 3600);
}
function save(announce = false) {
  if (!game || replacingGarden) return;
  try {
    game.captureView();
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    lastSaved = Date.now();
    $("#save-status").innerHTML = localizeHTML("<i></i> All changes saved");
    if (announce) toast("Your little sanctuary is safely saved.");
    return true;
  } catch {
    $("#save-status").textContent = t("Save unavailable");
    toast(
      "Your browser could not save the garden. Export a backup in Settings.",
    );
    return false;
  }
}
function scheduleSave() {
  clearTimeout(saveTimer);
  $("#save-status").innerHTML = localizeHTML('<i class="saving"></i> Saving your garden…');
  saveTimer = setTimeout(() => save(), 800);
}
function replaceGarden(nextGarden) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(nextGarden));
  // pagehide and visibilitychange must not overwrite the replacement with the old state.
  replacingGarden = true;
  clearTimeout(saveTimer);
  location.reload();
}
function renderInventory() {
  const query = normalizeSearch($("#search").value),
    grid = $("#plant-grid");
  if (panel === "tools") {
    grid.className = "plant-grid tools-grid";
    grid.innerHTML = localizeHTML(TOOLS.filter((tool) =>
      normalizeSearch(`${tool.name} ${tool.hint} ${t(tool.name)} ${t(tool.hint)}`).includes(query),
    )
      .map(
        (t) =>
          `<button class="tool-catalog-item ${game?.tool === t.id ? "selected" : ""}" data-catalog-tool="${t.id}"><span class="tool-catalog-icon">${icon(t.icon)}</span><span><strong>${t.name}</strong><small>${t.hint}</small></span><kbd>${t.key}</kbd></button>`,
      )
      .join(""));
    $("#inventory-count").textContent = t("8 tools, plenty of possibilities");
    return;
  }
  grid.className = "plant-grid";
  const all = panel === "plants" ? PLANTS : BUILDS,
    list = all.filter(
      (p) =>
        (panel === "build" || category === "All" || p.category === category) &&
        normalizeSearch(`${p.name} ${t(p.name)}`).includes(query),
    );
  $("#inventory-count").textContent =
    t(`${list.length} ${panel === "plants" ? "plants" : "objects"} to discover`);
  grid.innerHTML = localizeHTML(list.length
    ? list
        .map(
          (p) =>
            `<button class="plant-card ${game?.plant === p.id ? "selected" : ""}" data-plant="${p.id}" aria-label="Choose ${p.name}" aria-pressed="${game?.plant === p.id}"><div class="plant-image"><img src="${thumbnail(p.id)}" alt="${p.name}" draggable="false"/><span class="plant-add">${icon(game?.plant === p.id ? "check" : "plus")}</span></div><strong>${p.name}</strong><span>${p.category || "GARDEN DECOR"}</span></button>`,
        )
        .join("")
    : `<div class="empty-state">${icon("search")}<strong>No little sprouts here.</strong><span>Try another name or category.</span></div>`);
}
function setPanel(next) {
  panel = next;
  $$("[data-panel]").forEach((b) =>
    b.classList.toggle("active", b.dataset.panel === next),
  );
  $("#categories").classList.toggle("hidden", next !== "plants");
  $("#search").value = "";
  $("#collection-title").innerHTML =
    localizeHTML(next === "plants"
      ? "Meet your new plants<span>.</span>"
      : next === "build"
        ? "Make yourself at home<span>.</span>"
        : "A little garden magic<span>.</span>");
  $("#collection-eyebrow").textContent =
    t(next === "plants"
      ? "A LITTLE SOMETHING GREEN"
      : next === "build"
        ? "THE FINISHING TOUCHES"
        : "GOOD THINGS TAKE A LITTLE CARE");
  $("#collection-description").textContent =
    t(next === "plants"
      ? "Big dreams start with little seeds."
      : next === "build"
        ? "Make a place you love coming back to."
        : "Everything you need to help it grow.");
  renderInventory();
  openCollection();
}
function openCollection() {
  $("#collection").classList.add("open");
  game.panelOpen = true;
  game.resize();
}
function closeCollection() {
  $("#collection").classList.remove("open");
  if (usesCompactLayout() || game.mode === "walk") {
    game.panelOpen = false;
    game.resize();
  }
}
function updateTool(id) {
  const t = TOOLS.find((t) => t.id === id);
  $$("[data-tool]").forEach((b) =>
    b.classList.toggle("active", b.dataset.tool === id),
  );
  $("#tool-hint").innerHTML =
    localizeHTML(`${icon(t.icon)}<span>${t.hint}</span>${id === "plant" ? '<kbd>R</kbd><span class="hint-rotate">to rotate</span>' : ""}`);
  $("#shape-tray").classList.toggle("hidden", id !== "shape");
  $("#mobile-action").innerHTML =
    localizeHTML(`${icon(t.icon)}<span>${id === "plant" ? "Plant here" : t.name}</span>`);
  if (panel === "tools") renderInventory();
}
function tutorial() {
  const t = state.tutorial,
    el = $("#tutorial");
  if (t >= 4) {
    el.classList.add("hidden");
    return;
  }
  el.classList.remove("hidden");
  const content = [
    {
      eyebrow: "WELCOME TO YOUR HAPPY PLACE",
      title: "Let’s grow something good.",
      text: "A peaceful little world, ready for your imagination. No rules, no rush.",
      button: hasSave ? "Continue" : "Play",
    },
    {
      eyebrow: "01 / 03 · PICK YOUR FAVORITE",
      title: "It starts with a little green.",
      text: "Choose any plant from the collection on the left.",
      button: "Explore plants",
    },
    {
      eyebrow: "02 / 03 · PUT DOWN ROOTS",
      title: "Find a place to call home.",
      text: "Click an open patch of grass to plant. Drag to look around.",
      button: "Got it",
    },
    {
      eyebrow: "03 / 03 · A LITTLE LOVE",
      title: "Water it. Watch it flourish.",
      text: "Choose Water, then click your new plant. Try 5× speed to watch it grow.",
      button: "Pick up the watering can",
    },
  ][t];
  el.innerHTML = localizeHTML(`<button class="tutorial-close" id="dismiss-tutorial" aria-label="Dismiss tutorial">${icon("close")}</button><span class="eyebrow">${content.eyebrow}</span><h3>${content.title}</h3><p>${content.text}</p><div class="tutorial-bottom"><button class="text-button" id="tutorial-next">${content.button} ${icon("arrow")}</button><span class="tutorial-dots">${[1, 2, 3].map((n) => `<i class="${t === n ? "active" : ""}"></i>`).join("")}</span></div>`);
  $("#tutorial-next").onclick = () => {
    if (t === 0) {
      state.tutorial = 1;
      setPanel("plants");
      tutorial();
    } else if (t === 1) {
      setPanel("plants");
      toast("Choose a plant from the collection.");
    } else if (t === 2) {
      closeCollection();
      toast("Click the grass to plant your favorite.");
    } else {
      game.setTool("water");
      closeCollection();
    }
    scheduleSave();
  };
  $("#dismiss-tutorial").onclick = () => {
    state.tutorial = 4;
    tutorial();
    scheduleSave();
  };
}
function selectedCard(entity) {
  const el = $("#selected-card");
  el.classList.toggle("hidden", !entity);
  if (!entity) return;
  const p = byId(entity.type);
  el.innerHTML = localizeHTML(`<button class="selection-close icon-button" aria-label="Close selection">${icon("close")}</button><img src="${thumbnail(p.id)}" alt=""/><div class="selected-info"><span class="eyebrow">${p.category || "GARDEN DECOR"}</span><strong>${p.name}</strong><span>${p.category ? `${stage(entity.growth)} <i>·</i> ${Math.round(entity.growth * 100)}% grown` : "A little finishing touch"}</span>${p.category ? `<div class="water-meter" title="Hydration ${Math.round(entity.water * 100)}%">${icon("water")}<div><i style="width:${entity.water * 100}%"></i></div><small>${Math.round(entity.water * 100)}%</small></div>` : ""}</div><div class="selected-actions"><button data-selection="water" aria-label="Water selected plant" title="Water">${icon("water")}</button><button data-selection="move" aria-label="Move selected object" title="Move">${icon("move")}</button><button data-selection="rotate" aria-label="Rotate selected object" title="Rotate">${icon("rotate")}</button><button data-selection="copy" aria-label="Copy selected object" title="Copy">${icon("plus")}</button></div>`);
  $(".selection-close", el).onclick = () => game.select(null);
  $$("[data-selection]", el).forEach(
    (b) =>
      (b.onclick = () => {
        const action = b.dataset.selection;
        if (action === "rotate") game.rotate();
        else if (action === "copy") game.copySelected();
        else if (action === "move") {
          game.setTool("move");
          game.moving = entity;
          game.rotation = entity.rotation;
          game.meshes.get(entity.id).visible = false;
          game.createGhost();
          toast("Choose a new spot. R rotates · Esc cancels.");
        } else {
          if (!p.category) {
            toast("Choose a living plant to water.");
            return;
          }
          game.snapshot();
          entity.water = 1;
          entity.growth = Math.min(1, entity.growth + 0.07);
          game.rebuild(entity);
          game.audio.effect("water");
          game.emit("watered", entity);
          game.emit("change");
          selectedCard(entity);
          toast("A refreshing drink. Your plant is growing!");
        }
      }),
  );
}
function drawMap(canvas, range = 25) {
  const ctx = canvas.getContext("2d"),
    w = canvas.width,
    h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#dbe4c5";
  ctx.fillRect(0, 0, w, h);
  const scale = Math.min(w, h) / (range * 2),
    ox = w / 2,
    oz = h / 2;
  const rect = (r) => ctx.fillRect(ox + r.x0 * scale, oz + r.z0 * scale, (r.x1 - r.x0) * scale, (r.z1 - r.z0) * scale);
  ctx.fillStyle = "#c9bfa5";
  rect(GARDEN_EDGE);
  ctx.fillStyle = "#eee4cb";
  STONE_WALKS.forEach(rect);
  ctx.fillStyle = "#847453";
  GARDEN_BEDS.forEach(rect);
  const dots = [
    [-16, -14],
    [-20, 9],
    [17, -17],
    [19, 11],
    [-14, 19],
    [9, 22],
    [-9, -23],
    [24, -4],
  ];
  dots.forEach(([x, z]) => {
    ctx.fillStyle = "#91b274";
    ctx.fillRect(ox + x * scale, oz + z * scale, 3 * scale, 3 * scale);
  });
  state.entities.forEach((e) => {
    const p = byId(e.type);
    ctx.fillStyle = p.color;
    const s =
      (p.category
        ? Math.max(0.6, p.width * 0.5)
        : p.kind === "pond"
          ? 2.1
          : 0.7) * scale;
    ctx.fillRect(ox + e.x * scale - s / 2, oz + e.z * scale - s / 2, s, s);
  });
  if (game) {
    const pos =
      game.mode === "free" ? game.controls.target : game.camera.position;
    ctx.beginPath();
    ctx.fillStyle = "#fff8e9";
    ctx.strokeStyle = "#3f6a41";
    ctx.lineWidth = 2;
    ctx.arc(ox + pos.x * scale, oz + pos.z * scale, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = "#66835b";
  ctx.font = "bold 13px sans-serif";
  ctx.fillText(getLanguage() === "uz" ? "Sh" : "N", w - 20, 20);
}
function openModal(html) {
  $("#modal-body").innerHTML = localizeHTML(html);
  $("#modal").showModal();
  game.paused = true;
  game.onBlur();
}
function closeModal() {
  $("#modal").close();
  game.paused = false;
}
function showHelp() {
  openModal(
    `<div class="modal-emblem">${icon("sprout")}</div><span class="eyebrow">YOUR FIRST LITTLE STEPS</span><h2>A garden of your own.</h2><p>Everything here grows at your pace. Start small. Make it yours.</p><div class="help-steps"><div><b>01</b><span><strong>Pick something you love.</strong>Choose a plant or decoration from the collection.</span></div><div><b>02</b><span><strong>Put down roots.</strong>Click the grass to place it. A green preview means there’s room.</span></div><div><b>03</b><span><strong>Give it a little care.</strong>Water plants, sculpt shrubs, and watch your garden grow.</span></div></div><div class="keyboard-guide"><span><kbd>W A S D</kbd> Walk</span><span><kbd>Shift</kbd> Move faster</span><span><kbd>1–8</kbd> Tools</span><span><kbd>R</kbd> Rotate</span><span><kbd>C</kbd> Camera</span><span><kbd>E</kbd> Center action</span><span><kbd>Ctrl Z</kbd> Undo</span><span><kbd>Esc</kbd> Cancel move</span></div><p class="help-small">Drag to orbit. Right-drag to pan. Scroll to zoom.<br>On mobile: drag to look, pinch to zoom, use the joystick to move, and tap the grass to plant.</p><button class="button primary full" id="help-done">Let’s grow ${icon("arrow")}</button>`,
  );
  $("#help-done").onclick = closeModal;
}
function showSettings() {
  openModal(
    `<span class="eyebrow">MAKE YOURSELF COMFORTABLE</span><h2>Your kind of calm.</h2><p>A few little adjustments for your happy place.</p><div class="settings-list"><label><span><strong>Language</strong><small>Choose your language.</small></span><select id="language-select" aria-label="Language"><option value="uz" lang="uz">O‘zbekcha</option><option value="en" lang="en">English</option></select></label><label><span><strong>Graphics quality</strong><small>Sharper images and soft shadows on phones. Ultra suits powerful devices.</small></span><select id="quality-select"><option value="auto">Automatic</option><option value="balanced">Balanced</option><option value="high">High detail</option><option value="ultra">Ultra detail</option><option value="low">Smooth & simple</option></select></label><label><span><strong>Garden sounds</strong><small>Birdsong, water, wind & gentle melodies.</small></span><input class="switch" type="checkbox" id="sound-setting" ${state.settings.sound ? "checked" : ""}/></label><label><span><strong>A little quieter?</strong><small>Ambient volume</small></span><input id="volume-setting" type="range" min="0" max="1" step=".05" value="${state.settings.volume}"/></label><label><span><strong>Let the days drift by</strong><small>Automatic day and night cycle.</small></span><input class="switch" id="cycle-setting" type="checkbox" ${state.settings.dayCycle ? "checked" : ""}/></label><label><span><strong>Time of day</strong><small id="time-setting-label">${formatTime(state.clock)}</small></span><input type="range" id="day-setting" min="0" max="23.9" step=".1" value="${state.clock}"/></label><label><span><strong>Growing at your pace</strong><small>Growth & time speed</small></span><select id="speed-setting">${[1, 2, 5, 10].map((n) => `<option value="${n}" ${n === state.speed ? "selected" : ""}>${n}× ${n === 1 ? "Normal" : n === 10 ? "Maximum" : "Faster"}</option>`).join("")}</select></label></div><div class="backup-actions"><button class="button" id="export-button">${icon("download")} Export garden</button><button class="button" id="import-button">${icon("upload")} Import garden</button></div><p class="local-note">Your garden is saved in this browser on this device. Export a file to keep a backup or move to another device.</p><button class="text-button danger" id="reset-button">Start a fresh garden</button>`,
  );
  $("#language-select").value = state.settings.language;
  $("#language-select").onchange = (e) => {
    const previous = state.settings.language;
    state.settings.language = e.target.value;
    if (save()) location.reload();
    else {
      state.settings.language = previous;
      e.target.value = previous;
    }
  };
  $("#quality-select").value = state.settings.quality;
  $("#quality-select").onchange = (e) => game.setQuality(e.target.value);
  $("#sound-setting").onchange = (e) => setSound(e.target.checked);
  $("#volume-setting").oninput = (e) => {
    state.settings.volume = +e.target.value;
    if (state.settings.sound)
      game.audio.setEnabled(true, state.settings.volume).catch(() => {});
    scheduleSave();
  };
  $("#cycle-setting").onchange = (e) => {
    state.settings.dayCycle = e.target.checked;
    scheduleSave();
  };
  $("#day-setting").oninput = (e) => {
    state.clock = +e.target.value;
    $("#time-setting-label").textContent = t(formatTime(state.clock));
    updateClock();
    scheduleSave();
  };
  $("#speed-setting").onchange = (e) => {
    state.speed = +e.target.value;
    $("#time-button").textContent = t(`${state.speed}×`);
    scheduleSave();
  };
  $("#export-button").onclick = exportGarden;
  $("#import-button").onclick = () => $("#import-file").click();
  $("#reset-button").onclick = () => {
    openConfirm(
      "A fresh patch of possibility.",
      "Your current garden will be replaced. Export a backup first if you’d like to visit it again.",
      () => {
        try {
          const fresh = starterGarden();
          fresh.settings.language = state.settings.language;
          replaceGarden(fresh);
        } catch {
          toast(
            "Your browser could not save a fresh garden. Export a backup and check browser storage settings.",
          );
        }
      },
    );
  };
}
function openConfirm(title, description, action) {
  $("#modal-body").innerHTML =
    localizeHTML(`<span class="eyebrow">A NEW BEGINNING</span><h2>${title}</h2><p>${description}</p><div class="backup-actions"><button class="button" id="confirm-cancel">Keep my garden</button><button class="button primary" id="confirm-action">Start fresh ${icon("sprout")}</button></div>`);
  $("#confirm-cancel").onclick = showSettings;
  $("#confirm-action").onclick = action;
}
function exportGarden() {
  game.captureView();
  const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: "application/json",
    }),
    url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = `plantinum-garden-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast("A little piece of your garden, saved to a file.");
}
function showMenu() {
  openModal(
    `<div class="modal-emblem">${icon("leaf")}</div><span class="eyebrow">YOUR LITTLE GREEN ESCAPE</span><h2 class="menu-wordmark">PLANTINUM</h2><p>Make room for a little wonder.</p><div class="main-menu-buttons"><button class="button primary" id="menu-play">${icon("play")} Play</button><button class="button" id="menu-continue">${icon("arrow")} Continue</button><button class="button" id="menu-garden">${icon("leaf")} My Garden</button><button class="button" id="menu-settings">${icon("settings")} Settings</button></div><span class="menu-footnote">No coins. No rush. Just a little green.</span>`,
  );
  $("#menu-play").onclick = () => {
    closeModal();
    if (state.tutorial === 0) {
      state.tutorial = 1;
      tutorial();
    }
  };
  $("#menu-continue").onclick = closeModal;
  $("#menu-garden").onclick = () => {
    closeModal();
    game.home();
  };
  $("#menu-settings").onclick = showSettings;
  $("#menu-garden").insertAdjacentHTML(
    "afterend",
    localizeHTML(`<button class="button" id="menu-explore">${icon("globe")} Explore the world</button>`),
  );
  $("#menu-explore").onclick = showWorld;
}
const ZONES = [
  ["My garden", "Your little sanctuary", 0, 0, "leaf"],
  ["The orchard", "A canopy of possibilities", -23, -18, "tree"],
  ["Flower walk", "A little color, everywhere", 18, 16, "flower"],
  ["Hedge meadow", "Shape your imagination", -22, 17, "shape"],
  ["Quiet corner", "Pause. Breathe. Stay a while.", 21, -17, "heart"],
  ["Waterside", "Find a spot for a pond", 6, -20, "water"],
  ["Garden shed", "Where good things begin", -13, -9, "build"],
  ["Open meadow", "Room for something new", -34, 2, "sprout"],
  ["The woodland", "Take the scenic route", 32, 31, "tree"],
  ["New horizons", "More space to dream", 0, 36, "globe"],
];
function showWorld() {
  openModal(
    `<span class="eyebrow">A WHOLE WORLD OF POSSIBILITY</span><h2>Wander a little.</h2><p>Your garden is just the beginning. Pick a place to explore and make it your own.</p><div class="world-zones">${ZONES.map(([name, desc, x, z, i], n) => `<button class="world-zone" data-zone="${n}"><span>${icon(i)}</span><div><strong>${name}</strong><small>${desc}</small></div>${icon("arrow")}</button>`).join("")}</div><div class="expand-world"><div><strong>${state.bounds * 2} × ${state.bounds * 2} m of possibility</strong><small id="world-area">Your open world grows with you.</small></div><button class="button primary" id="expand-world" ${state.bounds >= 216 ? "disabled" : ""}>${icon("plus")} Expand</button></div>`,
  );
  $$("[data-zone]").forEach(
    (b) =>
      (b.onclick = () => {
        const z = ZONES[+b.dataset.zone];
        travel(z[2], z[3]);
        closeModal();
        toast(`Welcome to ${z[0].toLowerCase()}. Plant a little possibility.`);
      }),
  );
  $("#expand-world").onclick = () => {
    state.bounds = Math.min(216, state.bounds + 24);
    scheduleSave();
    showWorld();
    toast("More room to dream. Your world is a little bigger.");
  };
}
function travel(x, z) {
  if (game.mode === "walk") {
    game.camera.position.set(x, EYE_HEIGHT, z + 3);
    game.yaw = 0;
    game.pitch = -0.12;
    game.camera.updateMatrixWorld();
    return;
  }
  const delta = game.camera.position.clone().sub(game.controls.target);
  game.controls.target.set(x, 0, z);
  game.camera.position.copy(game.controls.target).add(delta);
  game.controls.update();
}
function formatTime(hour) {
  return `${String(Math.floor(hour)).padStart(2, "0")}:${String(Math.floor((hour % 1) * 60)).padStart(2, "0")}`;
}
function updateClock() {
  const h = state.clock;
  $("#clock").textContent = t(formatTime(h));
  $("#time-button").textContent = t(`${state.speed}×`);
  $("#weather-label").textContent =
    t(h < 6 || h >= 20
      ? "A peaceful evening"
      : h < 12
        ? "A lovely morning"
        : h < 17
          ? "A golden afternoon"
          : "A softer kind of light");
  $("#weather-period").textContent =
    t(h < 6 || h >= 20
      ? "Under the stars"
      : h < 12
        ? "A fresh start"
        : h < 17
          ? "Room to grow"
          : "The golden hour");
  $(".weather-icon").innerHTML = localizeHTML(icon(h < 6 || h >= 20 ? "moon" : "sun"));
}
async function setSound(on) {
  state.settings.sound = on;
  try {
    await game.audio.setEnabled(on, state.settings.volume);
  } catch {
    state.settings.sound = false;
    toast("Sound is unavailable in this browser.");
  }
  $("#sound-button").innerHTML =
    localizeHTML(`${icon(state.settings.sound ? "volume" : "mute")}<span>Garden sounds <b>${state.settings.sound ? "on" : "off"}</b></span>`);
  scheduleSave();
}
function bindUI() {
  $("#orientation-button").onclick = async () => {
    if (document.fullscreenElement) {
      try {
        screen.orientation?.unlock?.();
        await document.exitFullscreen();
      } catch {
        toast("Full screen is unavailable in this browser.");
      }
      return;
    }
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen)
        await document.documentElement.requestFullscreen({ navigationUI: "hide" });
    } catch {
      // Safari and embedded browsers can still use the responsive layout by rotating.
    }
    let locked = false;
    try {
      if (screen.orientation?.lock) {
        await screen.orientation.lock("landscape");
        locked = true;
      }
    } catch {
      // Orientation locking is optional; physical rotation works independently.
    }
    if (!locked && !matchMedia("(orientation: landscape)").matches)
      toast("Turn your phone sideways for a wider garden view.");
    game.resize();
  };
  document.addEventListener("fullscreenchange", () => {
    const label = t(document.fullscreenElement ? "Exit fullscreen" : "Landscape mode");
    $("#orientation-button").setAttribute("aria-label", label);
    $("#orientation-button").setAttribute("title", label);
  });
  $("#plant-grid").onclick = (e) => {
    const card = e.target.closest("[data-plant]"),
      tool = e.target.closest("[data-catalog-tool]");
    if (card) {
      game.setPlant(card.dataset.plant);
      if (state.tutorial === 1) {
        state.tutorial = 2;
        tutorial();
        scheduleSave();
      }
      renderInventory();
      if (usesCompactLayout() || game.mode === "walk") closeCollection();
    }
    if (tool) {
      game.setTool(tool.dataset.catalogTool);
      closeCollection();
    }
  };
  $$("[data-panel]").forEach(
    (b) => (b.onclick = () => setPanel(b.dataset.panel)),
  );
  $$("[data-category]").forEach(
    (b) =>
      (b.onclick = () => {
        category = b.dataset.category;
        $$("[data-category]").forEach((c) =>
          c.classList.toggle("active", c === b),
        );
        renderInventory();
      }),
  );
  $("#search").oninput = renderInventory;
  $$("[data-tool]").forEach(
    (b) =>
      (b.onclick = () => {
        game.setTool(b.dataset.tool);
        if (b.dataset.tool === "plant" && (usesCompactLayout() || game.mode === "walk")) openCollection();
        else if (usesCompactLayout() || game.mode === "walk") closeCollection();
      }),
  );
  $$("[data-shape]").forEach(
    (b) =>
      (b.onclick = () => {
        game.setShape(b.dataset.shape);
        $$("[data-shape]").forEach((c) =>
          c.classList.toggle("active", c === b),
        );
      }),
  );
  $("#close-collection").onclick = closeCollection;
  $("#inventory-button").onclick = openCollection;
  $("#save-button").onclick = () => save(true);
  $("#settings-button").onclick = showSettings;
  $("#help-button").onclick = showHelp;
  $("#menu-button").onclick = showMenu;
  $("#garden-nav").onclick = () => game.home();
  $("#world-nav").onclick = showWorld;
  $("#map-expand").onclick = showWorld;
  $("#camera-button").onclick = () => game.setCamera();
  $("#home-button").onclick = () => game.home();
  $("#zoom-in").onclick = () => game.zoom(0.8);
  $("#zoom-out").onclick = () => game.zoom(1.25);
  $("#undo-button").onclick = () => game.undo();
  $("#sound-button").onclick = () => setSound(!state.settings.sound);
  $("#time-button").onclick = () => {
    const times = [1, 2, 5, 10];
    state.speed = times[(times.indexOf(state.speed) + 1) % times.length];
    updateClock();
    scheduleSave();
    toast(
      `A little ${state.speed === 1 ? "slower" : "faster"}. Growing at ${state.speed}× speed.`,
    );
  };
  $("#fullscreen-button").onclick = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.documentElement.requestFullscreen)
        await document.documentElement.requestFullscreen();
      else
        toast("Use your browser’s full screen or Add to Home Screen option.");
    } catch {
      toast("Full screen is unavailable in this browser.");
    }
  };
  $("#minimap").onclick = (e) => {
    const r = e.currentTarget.getBoundingClientRect(),
      s = Math.min(e.currentTarget.width, e.currentTarget.height) / 50;
    travel(
      (((e.clientX - r.left) / r.width) * 300 - 150) / s,
      (((e.clientY - r.top) / r.height) * 200 - 100) / s,
    );
  };
  $("#modal-close").onclick = closeModal;
  $("#modal").addEventListener("cancel", () => (game.paused = false));
  $("#modal").addEventListener("click", (e) => {
    if (e.target === $("#modal")) {
      const r = e.target.getBoundingClientRect();
      if (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      )
        closeModal();
    }
  });
  $("#import-file").onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      if (file.size > 10_000_000)
        throw new Error("Please choose a garden file smaller than 10 MB.");
      const imported = upgradeGardenLayout(validateSave(JSON.parse(await file.text())));
      replaceGarden(imported);
    } catch (error) {
      toast(error instanceof SyntaxError ? "That garden file could not be opened." : error.message || "That garden file could not be opened.");
    }
    e.target.value = "";
  };
  const joy = $("#joystick"),
    nub = $(".joystick-nub");
  let joyPointer;
  joy.onpointerdown = (e) => {
    joyPointer = e.pointerId;
    joy.setPointerCapture(e.pointerId);
    moveJoystick(e);
  };
  function moveJoystick(e) {
    if (e.pointerId !== joyPointer) return;
    const r = joy.getBoundingClientRect(),
      x = e.clientX - r.left - r.width / 2,
      y = e.clientY - r.top - r.height / 2,
      len = Math.hypot(x, y),
      scale = Math.min(1, 30 / (len || 1));
    game.joystick = { x: (x * scale) / 30, y: (y * scale) / 30 };
    nub.style.transform = `translate(${x * scale}px,${y * scale}px)`;
  }
  joy.onpointermove = moveJoystick;
  const resetJoystick = () => {
    joyPointer = null;
    game.joystick = { x: 0, y: 0 };
    nub.style.transform = "";
  };
  joy.onpointerup = joy.onpointercancel = joy.onlostpointercapture = resetJoystick;
  matchMedia("(orientation: landscape)").addEventListener("change", () => {
    resetJoystick();
    game.onBlur();
    game.resize();
  });
  $("#mobile-action").onclick = () => {
    game.pointer.set(0, 0);
    game.pointerInside = true;
    game.updateGhost();
    game.act();
  };
  window.addEventListener("pagehide", () => save());
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      game.onBlur();
      save();
    }
  });
}
async function boot() {
  try {
    game = new GardenGame($("#scene"), state);
    window.plantinum = {
      game,
      get state() {
        return state;
      },
      exportGarden,
    };
    game.addEventListener("notice", (e) => toast(e.detail));
    game.addEventListener("error", (e) => toast(e.detail));
    game.addEventListener("tool", (e) => updateTool(e.detail));
    game.addEventListener("change", () => {
      scheduleSave();
      drawMap($("#minimap"));
    });
    game.addEventListener("select", (e) => selectedCard(e.detail));
    game.addEventListener("planted", () => {
      if (state.tutorial < 3) {
        state.tutorial = 3;
        tutorial();
      }
    });
    game.addEventListener("watered", () => {
      if (state.tutorial === 3) {
        state.tutorial = 4;
        tutorial();
        toast("You’re a gardener now. Make something wonderful.");
      }
    });
    game.addEventListener("camera", (e) => {
      document.body.classList.toggle("walking", e.detail === "walk");
      if (e.detail === "walk") closeCollection();
      else if (!usesCompactLayout()) openCollection();
      $("#camera-button").innerHTML = localizeHTML(icon(
        e.detail === "walk" ? "walk" : "camera",
      ));
    });
    document.body.classList.toggle("walking", game.mode === "walk");
    $("#camera-button").innerHTML = localizeHTML(icon(
      game.mode === "walk" ? "walk" : "camera",
    ));
    game.addEventListener("tick", (e) => {
      updateClock();
      $("#plant-count").textContent =
        t(`${e.detail.plants} plants, endless possibilities`);
      drawMap($("#minimap"));
      if (game.selected) {
        const entity = game.selected;
        const label = $(".selected-info > span:not(.eyebrow)");
        if (label && byId(entity.type).category) {
          label.textContent = t(`${stage(entity.growth)} · ${Math.round(entity.growth * 100)}% grown`);
          const bar = $(".water-meter > div > i");
          const percent = $(".water-meter small");
          if (bar) bar.style.width = `${entity.water * 100}%`;
          if (percent)
            percent.textContent = t(`${Math.round(entity.water * 100)}%`);
        }
      }
    });
    bindUI();
    renderInventory();
    tutorial();
    updateClock();
    drawMap($("#minimap"));
    $("#loading").classList.add("hidden");
    setInterval(() => save(), 15000);
    if (loadError) toast(loadError);
    if (!usesCompactLayout() && game.mode !== "walk") openCollection();
  } catch (error) {
    console.error(error);
    $("#loading").innerHTML =
      localizeHTML(`${icon("info")}<strong>Your garden needs WebGL.</strong><span>Try a recent Chrome, Safari, Firefox, or Edge browser with hardware acceleration enabled.</span><button class="button" onclick="location.reload()">Try again</button>`);
  }
}
requestAnimationFrame(boot);
