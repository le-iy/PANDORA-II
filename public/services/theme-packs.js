const assetRoot = new URL("../assets/", import.meta.url);

export const themePacks = Object.freeze({
  pixel: {
    label: "Pixel",
    accents: { lavender: "Lavender", rose: "Rose", sage: "Sage" },
    defaultAccent: "lavender",
    defaultBadge: "scholar",
  },
  galaxy: {
    label: "Galaxy",
    accents: {
      nebula: "Galaxy Violet",
      aurora: "Aurora Blue",
      starlight: "Starlight Rose",
      freestar: "Golden Freestar",
    },
    defaultAccent: "nebula",
    defaultBadge: "celestial-ringed-planet",
  },
  nailong: {
    label: "Nailong",
    accents: { banana: "Banana Gold", leaf: "Leaf Green", peach: "Peach Blush", cocoa: "Cocoa" },
    defaultAccent: "banana",
    defaultBadge: "nailong-happy",
  },
});

const celestialNames = [
  "ringed-planet", "aurora-comet", "lunar-crescent", "nova-spark", "survey-rocket",
  "orbit-station", "neptune-gem", "galaxy-medal", "spectral-jelly", "moon-rover",
  "nebula-spiral", "cosmic-grimoire",
];

export const celestialIcons = Object.freeze(Object.fromEntries(celestialNames.map((name) => [
  `celestial-${name}`,
  {
    label: name.replace(/(^|-)([a-z])/g, (_, separator, letter) =>
      `${separator ? " " : ""}${letter.toUpperCase()}`),
    file: `illustrations/celestial/${name}.svg`,
  },
])));

const nailongNames = ["surprised", "sleepy", "cheeky", "grumpy", "happy", "study-buddy", "banana-snack", "flower-pigtails", "peekaboo", "naptime", "crowned", "back-view"];

export const nailongIcons = Object.freeze(Object.fromEntries(nailongNames.map((name) => [
  `nailong-${name}`,
  {
    label: name.split("-").map((word) => word[0].toUpperCase() + word.slice(1)).join(" "),
    file: `icons/profile/nailong-${name}.svg`,
  },
])));

export function activeThemePack() {
  const pack = globalThis.document?.documentElement.dataset.themePack;
  return Object.hasOwn(themePacks, pack) ? pack : "pixel";
}

export function themeAsset(path, pack = activeThemePack()) {
  const artwork = pack === "nailong" && path === "illustrations/calendar-sleepy-lavender-cat.svg"
    ? nailongIcons["nailong-naptime"].file
    : path;
  return new URL(pack !== "pixel" && Object.hasOwn(themePacks, pack) ? `${pack}/${artwork}` : artwork, assetRoot).href;
}

export function themeStorageKey(key) {
  const pack = activeThemePack();
  return pack === "pixel" ? key : `${key}.${pack}`;
}
