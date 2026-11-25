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
  hangyodon: {
    label: "Hangyodon",
    accents: { lagoon: "Lagoon Blue", seafoam: "Seafoam", bubblegum: "Bubblegum Pink", coral: "Coral" },
    defaultAccent: "lagoon",
    defaultBadge: "hangyodon-classic",
  },
  kuromi: {
    label: "Kuromi",
    accents: { lilac: "Night Lilac", bubblegum: "Bubblegum Pink", plum: "Black Plum", moonlight: "Moonlight" },
    defaultAccent: "lilac",
    defaultBadge: "kuromi-classic",
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

const hangyodonNames = ["boba-break","bookworm","bow-tie","bubble","chef","classic","confetti-win","detective","diver","donut-float","flower","headphones","heart-eyes","ice-cream","oh-no","onigiri-hug","party","peace-sign","pencil-patrol","raincoat","rainy-day","sailor","sayuri","sayuri-high-five","side-peek","skater","sleepy","study-buddy","wink","wrapped-up"];
export const hangyodonIcons = Object.freeze(Object.fromEntries(hangyodonNames.map((name) => [
  `hangyodon-${name}`,
  { label: name.split("-").map((word) => word[0].toUpperCase() + word.slice(1)).join(" "), file: `icons/profile/hangyodon-${name}.svg` },
])));

const kuromiNames = ["bat-cape","big-pink-bow","boba-break","bookworm","cheer-squad","choco-cookie","classic","confetti","cozy-blanket","cupid","flower-crown","guitar-practice","headphones","heart-glasses","heart-hug","little-ghost","lollipop","love-letter","moon-nap","nightcap","piano","pink-hoodie","studious","umbrella"];
export const kuromiIcons = Object.freeze(Object.fromEntries(kuromiNames.map((name) => [
  `kuromi-${name}`,
  { label: name.split("-").map((word) => word[0].toUpperCase() + word.slice(1)).join(" "), file: `icons/profile/kuromi-${name}.svg` },
])));

export function activeThemePack() {
  const pack = globalThis.document?.documentElement.dataset.themePack;
  return Object.hasOwn(themePacks, pack) ? pack : "pixel";
}

export function themeAsset(path, pack = activeThemePack()) {
  const artwork = pack === "nailong" && path === "illustrations/calendar-sleepy-lavender-cat.svg"
    ? nailongIcons["nailong-naptime"].file
    : pack === "hangyodon" && path === "illustrations/calendar-sleepy-lavender-cat.svg"
      ? hangyodonIcons["hangyodon-sleepy"].file
      : pack === "kuromi" && path === "illustrations/calendar-sleepy-lavender-cat.svg"
        ? kuromiIcons["kuromi-moon-nap"].file
        : path;
  return new URL(pack !== "pixel" && Object.hasOwn(themePacks, pack) ? `${pack}/${artwork}` : artwork, assetRoot).href;
}

export function themeStorageKey(key) {
  const pack = activeThemePack();
  return pack === "pixel" ? key : `${key}.${pack}`;
}
