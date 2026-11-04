export const PHONE_LANDSCAPE = "(pointer: coarse) and (orientation: landscape) and (max-height: 600px)";
export const COMPACT_LAYOUT = `(max-width: 900px), ${PHONE_LANDSCAPE}`;
export const usesCompactLayout = () => matchMedia(COMPACT_LAYOUT).matches;
