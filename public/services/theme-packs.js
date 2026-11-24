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

export function activeThemePack() {
  return globalThis.document?.documentElement.dataset.themePack === "galaxy"
    ? "galaxy"
    : "pixel";
}

export function themeAsset(path, pack = activeThemePack()) {
  return new URL(pack === "galaxy" ? `galaxy/${path}` : path, assetRoot).href;
}

export function themeStorageKey(key) {
  return activeThemePack() === "galaxy" ? `${key}.galaxy` : key;
}
