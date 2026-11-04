const paths = {
  leaf: '<path d="M5 19C1 5 12 3 21 3c1 12-4 18-13 16M6 20l10-11"/>',
  sprout:
    '<path d="M12 21V11M12 14C4 15 3 9 3 6c7 0 10 3 9 8ZM12 11c-1-7 3-9 9-9 0 6-2 10-9 9Z"/>',
  tree: '<path d="m12 2-7 8h3l-5 6h7v6h4v-6h7l-5-6h3L12 2Z"/>',
  flower:
    '<path d="M12 14v8m0-4c-5 1-7-3-7-3 5-1 7 3 7 3Z"/><path d="M12 4c-3-6-9 1-5 4-6 1-2 9 3 6 1 6 9 2 6-2 7-1 3-9-1-6 0-2-1-3-3-2Z"/><circle cx="11.5" cy="9" r="2"/>',
  scissors:
    '<circle cx="5" cy="6" r="3"/><circle cx="5" cy="18" r="3"/><path d="m8 8 13 13M8 16 21 3M11 12l3-3"/>',
  water:
    '<path d="M12 2s-7 8-7 12a7 7 0 0 0 14 0c0-4-7-12-7-12Z"/><path d="M9 15a3 3 0 0 0 3 3"/>',
  shovel: '<path d="m15 3 6 6m-4-4L8 14m1-2 4 4c-1 6-7 7-10 5-2-3-1-9 5-10Z"/>',
  move: '<path d="M12 3v18M3 12h18m-6-6-3-3-3 3m6 12-3 3-3-3M6 9l-3 3 3 3m12-6 3 3-3 3"/>',
  build: '<path d="m3 8 9-5 9 5-9 5-9-5Zm0 0v9l9 5 9-5V8M12 13v9M7 6l10 5"/>',
  camera:
    '<rect x="2" y="6" width="20" height="15" rx="3"/><path d="m7 6 2-4h6l2 4"/><circle cx="12" cy="13" r="4"/>',
  save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12l4 4v12a2 2 0 0 1-2 2Z"/><path d="M7 3v6h10V3M7 21v-8h10v8"/>',
  settings:
    '<path d="m9 3-1 3-3 1-2 4 2 2v4l4 3 3-1 3 1 4-3v-4l2-2-2-4-3-1-1-3H9Z"/><circle cx="12" cy="12" r="3"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 1v2m0 18v2M1 12h2m18 0h2M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/>',
  moon: '<path d="M20 15A9 9 0 0 1 9 3a9 9 0 1 0 11 12Z"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  volume:
    '<path d="M11 4 6 8H2v8h4l5 4V4Zm4 4a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  mute: '<path d="M11 4 6 8H2v8h4l5 4V4Zm5 5 6 6m-6 0 6-6"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9 8a3 3 0 0 1 6 1c0 2-3 2-3 4m0 3v1"/>',
  expand: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
  undo: '<path d="m8 3-5 5 5 5M3 8h10a7 7 0 0 1 0 14"/>',
  rotate: '<path d="M20 7V2l-4 4a9 9 0 1 0 4 10M20 7h-5"/>',
  trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
  play: '<path d="m8 4 12 8-12 8V4Z"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  globe:
    '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
  heart:
    '<path d="M20 5c-3-3-7-1-8 2-1-3-5-5-8-2-5 5 4 12 8 15 4-3 13-10 8-15Z"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  flag: '<path d="M4 22V3c5-5 10 5 16 0v11c-6 5-11-5-16 0"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M3 16v5h18v-5"/>',
  upload: '<path d="M12 15V3m-5 5 5-5 5 5M3 16v5h18v-5"/>',
  hose: '<path d="M5 3v11a6 6 0 0 0 12 0V9m-3 0h6V5h-6v4Zm3-4V2m-4 0h8"/>',
  saw: '<path d="m3 17 12-12 6 6-3 3-3-1-1 3-3-1-1 3-3-1-2 3-2-3Z"/>',
  shape: '<path d="m12 3 10 18H2L12 3Z"/><path d="m12 3 3 18m-3-18L9 21"/>',
  broom: '<path d="m15 3-5 10m-3-1 7 3-3 7-9-4 5-6Zm-1 3 7 3M7 16l-2 3"/>',
  walk: '<circle cx="14" cy="4" r="2"/><path d="m12 8-3 5 4 3-2 6M12 8l4 5h4M12 8l4 2-1 7 4 5M8 13H4"/>',
  sparkle: '<path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m16 8-3 5-5 3 3-5 5-3Z"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
};
export function icon(name, cls = "") {
  return `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.leaf}</svg>`;
}
