import { isUploadedWallpaper, listWallpapers, readWallpaper, saveWallpaper } from "../../services/wallpaper-storage.js";
import { bundledWallpaperUrl, customBackgrounds } from "../../services/preferences.js";
import { applyCustomPalette, customPaletteFields, customPaletteMode } from "../../services/preferences.js";
import { globalIcons } from "../../services/theme-packs.js";
import {
  applyPreferences,
  defaultPreferences,
  readPreferences,
  savePreferences,
} from "../../services/preferences.js";

import {
  getProfileIcon,
  goalLimits,
  getProfileIcons,
} from "../../services/study-goals.js";

import { themePacks } from "../../services/theme-packs.js";

const backupUrl = new URL("../../backup.html", import.meta.url);
const stylesUrl = new URL("../../styles/settings-dashboard.css", import.meta.url);

const sections = [
  ["profile", "Profile"],
  ["appearance", "Appearance"],
  ["notifications", "Notifications"],
  ["study", "Study preferences"],
  ["backup", "Backup & Restore"],
];

function loadDashboardStyles() {
  if (document.head.querySelector("[data-settings-dashboard-styles]")) return;

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = stylesUrl.href;
  link.dataset.settingsDashboardStyles = "";
  document.head.append(link);
}

export function applySavedSettings() {
  applyPreferences();
}

export function renderSettings(container) {
  loadDashboardStyles();

  const screen = document.createElement("section");
  screen.className = "settings-screen settings-dashboard settings-preference-screen";
  screen.setAttribute("aria-labelledby", "settings-heading");

  const taskGoal = goalLimits.dailyTaskGoal;
  const expGoal = goalLimits.dailyExpGoal;

  screen.innerHTML = `
    <header class="settings-page-header">
      <h1 id="settings-heading">Settings</h1>
      <button class="settings-action settings-action-primary" type="submit"
        form="settings-preference-form" data-save>Save changes</button>
    </header>

    <p class="settings-feedback" role="status"></p>

    <div class="settings-preference-layout">
      <nav class="settings-preference-nav" aria-label="Preferences">
        <h2>Preferences</h2>
        <div data-settings-links></div>
      </nav>

      <div class="settings-preference-content">
        <form class="settings-form" id="settings-preference-form">
          <div class="settings-preferences">
            <fieldset class="settings-card settings-profile-card" data-section="profile">
              <legend tabindex="-1">Profile</legend>

              <div class="settings-profile-fields">
                <div class="settings-badge-preview">
                  <img width="48" height="48" alt="">
                  <span data-profile-icon-label></span>
                  <button class="settings-action" type="button" data-icon-trigger
                    aria-haspopup="dialog">Change profile icon</button>
                </div>

                <label>
                  Display name
                  <input name="displayName" maxlength="60" required autocomplete="nickname">
                </label>
              </div>
              <input name="badge" type="hidden">
            </fieldset>

            <fieldset class="settings-card" data-section="appearance">
              <legend tabindex="-1">Appearance</legend>

              <label>
                Theme pack
                <select name="themePack">
                  <option value="pixel">Pixel</option>
                  <option value="galaxy">Galaxy</option>
                  <option value="nailong">Nailong</option>
                  <option value="hangyodon">Hangyodon</option>
                  <option value="kuromi">Kuromi</option>
                  <option value="custom">Custom</option>
                </select>
              </label>

              <label>
                Base icon pack
                <select name="customBase"><option value="pixel">Pixel</option><option value="galaxy">Galaxy</option><option value="nailong">Nailong</option><option value="hangyodon">Hangyodon</option><option value="kuromi">Kuromi</option></select>
              </label>
              <label>
                Color mode
                <select name="theme">
                  <option value="system">System</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </label>

              <label>
                Accent color
                <select name="accent"></select>
              </label>

              <label>
                Motion
                <select name="motion">
                  <option value="system">Follow system</option>
                  <option value="reduced">Reduce motion</option>
                </select>
              </label>
            </fieldset>

            <fieldset class="settings-card settings-reminders" data-section="notifications">
              <legend tabindex="-1">Notifications</legend>
              <label>
                <input name="taskReminders" type="checkbox">
                Overdue tasks and tasks due today
              </label>
              <label>
                <input name="eventReminders" type="checkbox">
                Today’s calendar events
              </label>
              <p>Reminders appear in the app header.</p>
            </fieldset>

            <fieldset class="settings-card" data-section="study">
              <legend tabindex="-1">Study preferences</legend>

              <label>
                Daily quest goal (tasks)
                <input name="dailyTaskGoal" type="number"
                  min="${taskGoal.min}" max="${taskGoal.max}" step="1" required>
              </label>

              <label>
                Daily EXP goal
                <input name="dailyExpGoal" type="number"
                  min="${expGoal.min}" max="${expGoal.max}" step="1" required>
              </label>

              <label>
                Schedule week starts on
                <select name="weekStart">
                  <option value="sunday">Sunday</option>
                  <option value="monday">Monday</option>
                </select>
              </label>
            </fieldset>

            <section class="settings-card" data-section="backup"
              aria-labelledby="settings-backup-heading">
              <h2 id="settings-backup-heading" tabindex="-1">Backup &amp; Restore</h2>
              <p>Export or restore study data and uploaded PDFs, or export a CSV report.</p>
              <a class="settings-action" data-backup>Open Backup &amp; Restore</a>
            </section>
          </div>

          <div class="settings-actions">
            <button class="settings-action" type="button" data-open-reset
              aria-haspopup="dialog">Restore defaults</button>
          </div>
        </form>
      </div>
    </div>

    <dialog class="settings-reset-dialog" data-icon-dialog
      aria-labelledby="settings-icon-heading">
      <h2 id="settings-icon-heading">Choose a profile icon</h2>

      <form method="dialog">
        <div class="settings-badge-options" data-icon-options
          role="group" aria-label="Profile icons"></div>

        <div class="settings-actions">
          <button class="settings-action" type="submit" value="cancel">Cancel</button>
          <button class="settings-action settings-action-primary"
            type="submit" value="choose">Use icon</button>
        </div>
      </form>
    </dialog>

    <dialog class="settings-reset-dialog" data-reset-dialog
      aria-labelledby="settings-reset-heading"
      aria-describedby="settings-reset-description">
      <h2 id="settings-reset-heading">Restore default settings?</h2>

      <p id="settings-reset-description">
        Load the default preferences. Select Save changes to apply them.
      </p>

      <form class="settings-actions" method="dialog">
        <button class="settings-action" type="submit" value="cancel" autofocus>
          Cancel
        </button>
        <button class="settings-action settings-action-primary"
          type="submit" value="restore">Use defaults</button>
      </form>
    </dialog>
  `;

  const form = screen.querySelector(".settings-form");
  const displayName = form.elements.namedItem("displayName");
  const iconField = form.elements.namedItem("badge");
  const packField = form.elements.namedItem("themePack");
  const modeField = form.elements.namedItem("theme");
  const accentField = form.elements.namedItem("accent");
  let draftPack = "pixel";
  let appearances = {};
  let globalBadge = "";
  const iconImage = form.querySelector(".settings-badge-preview img");
  const iconLabel = form.querySelector("[data-profile-icon-label]");
  const iconTrigger = form.querySelector("[data-icon-trigger]");
  const iconDialog = screen.querySelector("[data-icon-dialog]");
  const iconOptions = iconDialog.querySelector("[data-icon-options]");
  const resetDialog = screen.querySelector("[data-reset-dialog]");
  const resetTrigger = form.querySelector("[data-open-reset]");
  const links = screen.querySelector("[data-settings-links]");
  const status = screen.querySelector(".settings-feedback");
  const saveButton = screen.querySelector("[data-save]");
  const navButtons = new Map();
  const iconInputs = new Map();

  screen.querySelector("[data-backup]").href = backupUrl.href;

  function selectSection(key) {
    for (const panel of form.querySelectorAll(".settings-preferences > [data-section]")) {
      panel.hidden = panel.dataset.section !== key;
    }
    for (const [id, control] of navButtons) {
      if (id === key) control.setAttribute("aria-current", "location");
      else control.removeAttribute("aria-current");
    }
  }

  for (const [key, label] of sections) {
    const panel = form.querySelector(`[data-section="${key}"]`);
    const heading = panel.querySelector("legend, h2");
    const control = document.createElement("button");
    control.type = "button";
    control.textContent = label;
    panel.id ||= "settings-section-" + key;
    control.setAttribute("aria-controls", panel.id);

    control.addEventListener("click", () => {
      selectSection(key);
      heading.focus({ preventScroll: true });
      panel.scrollIntoView({ block: "nearest" });
    });

    panel.addEventListener("focusin", () => selectSection(key));
    navButtons.set(key, control);
    links.append(control);
  }

  selectSection("profile");
  form.addEventListener("invalid", (event) => {
    const panel = event.target.closest("[data-section]");
    if (panel?.hidden) selectSection(panel.dataset.section);
  }, true);

  function rebuildProfileOptions() {
    iconInputs.clear();
    iconOptions.replaceChildren();

    for (const [id, { label }] of Object.entries(getProfileIcons(draftPack))) {
      const option = document.createElement("label");
      const input = document.createElement("input");
      const image = document.createElement("img");
      const text = document.createElement("span");

      input.type = "radio";
      input.name = "profileIconChoice";
      input.value = id;
      image.src = getProfileIcon(id, draftPack).url;
      image.width = 36;
      image.height = 36;
      image.alt = "";
      text.textContent = label;

      option.append(input, image, text);
      iconOptions.append(option);
      iconInputs.set(id, input);
    }
  }

  function updateIconPreview() {
    const icon = getProfileIcon(iconField.value, draftPack);
    iconImage.src = icon.url;
    iconLabel.textContent = icon.label;
  }

  function rememberAppearance() {
    appearances[draftPack] = {
      theme: modeField.value,
      accent: accentField.value,
      badge: globalBadge ? appearances[draftPack]?.badge ?? themePacks[draftPack].defaultBadge : iconField.value,
    };
  }

  function showAppearance(pack) {
    draftPack = pack;
    packField.value = pack;
    const base = form.elements.namedItem("customBase");
    base.closest("label").hidden = pack !== "custom";
    base.closest("label").style.display = pack === "custom" ? "" : "none";
    const config = themePacks[pack];
    const saved = appearances[pack];
    accentField.replaceChildren(...Object.entries(config.accents)
      .map(([value, label]) => new Option(label, value)));
    modeField.value = saved?.theme ?? "system";
    accentField.value = saved?.accent ?? config.defaultAccent;
    iconField.value = globalBadge || saved?.badge || config.defaultBadge;
    rebuildProfileOptions();
    updateIconPreview();
  }

  function fillForm(settings) {
    appearances = { ...settings.appearances };
    globalBadge = settings.globalBadge ?? "";
    form.elements.namedItem("customBase").value = settings.customBase ?? "pixel";
    customPalettes = { light: { ...settings.customPalettes?.light }, dark: { ...settings.customPalettes?.dark } };
    showAppearance(settings.themePack);
    syncCustomPalette();

    for (const [name, value] of Object.entries(settings)) {
      if (["appearances", "themePack", "theme", "accent", "badge"].includes(name)) continue;
      const field = form.elements.namedItem(name);
      if (!field) continue;

      if (field.type === "checkbox") field.checked = value;
      else field.value = value;
    }
  }

  let customPalettes = { light: {}, dark: {} };
  const palettePanel = document.createElement("div");
  palettePanel.dataset.customPalette = "";
  palettePanel.innerHTML = `<h3>Custom palette</h3><div data-palette-fields></div><div data-palette-preview><strong>Preview</strong><span>Accent sample</span></div><button type="button" class="settings-action" data-palette-reset>Reset this palette</button>`;
  form.querySelector(`[data-section="appearance"]`).append(palettePanel);
  const paletteFields = palettePanel.querySelector("[data-palette-fields]");
  const palettePreview = palettePanel.querySelector("[data-palette-preview]");
  for (const [key, label] of Object.entries(customPaletteFields)) {
    const row = document.createElement("label");
    const input = document.createElement("input");
    input.dataset.paletteColor = key;
    input.placeholder = "Default";
    input.pattern = "#[0-9a-fA-F]{6}";
    input.maxLength = 7;
    input.title = "Enter a hex color like #A477D4, or leave blank";
    input.spellcheck = false;
    row.append(label, input);
    paletteFields.append(row);
  }
  function syncCustomPalette() {
    const mode = customPaletteMode(modeField.value);
    const enabled = packField.value === "custom";
    palettePanel.hidden = !enabled;
    palettePreview.dataset.paletteMode = mode;
    for (const input of paletteFields.querySelectorAll("input")) {
      input.disabled = !enabled;
      input.value = customPalettes[mode][input.dataset.paletteColor] ?? "";
    }
    applyCustomPalette(palettePreview, customPalettes[mode]);
  }
  paletteFields.addEventListener("input", event => {
    const mode = customPaletteMode(modeField.value);
    customPalettes[mode][event.target.dataset.paletteColor] = event.target.value;
    applyCustomPalette(palettePreview, customPalettes[mode]);
  });
  palettePanel.querySelector("[data-palette-reset]").addEventListener("click", () => {
    customPalettes[customPaletteMode(modeField.value)] = {};
    syncCustomPalette();
  });
  const backgroundLabel = document.createElement("label");
  backgroundLabel.textContent = "Background image";
  const backgroundField = document.createElement("select");
  backgroundField.name = "customBackground";
  backgroundField.add(new Option("No image", ""));
  for (const file of customBackgrounds) backgroundField.add(new Option(file.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "), file));
  backgroundLabel.append(backgroundField);
  palettePanel.append(backgroundLabel);
  const wallpaperUpload = document.createElement("button");
  wallpaperUpload.type = "button";
  wallpaperUpload.className = "settings-action settings-wallpaper-upload";
  wallpaperUpload.textContent = "Upload image";
  const wallpaperInput = document.createElement("input");
  wallpaperInput.type = "file";
  wallpaperInput.accept = "image/png,image/jpeg,image/webp";
  wallpaperInput.hidden = true;
  let draftWallpaper;
  let decodingWallpaper = false;
  let savingWallpaper = false;
  let previewWallpaper;
  let previewWallpaperUrl;

  function addWallpaperOption(id, name) {
    const option = [...backgroundField.options].find(item => item.value === id);
    if (option) option.textContent = name;
    else backgroundField.add(new Option(name, id));
  }

  function clearWallpaperDraft() {
    if (!draftWallpaper) return;
    [...backgroundField.options].find(item => item.value === draftWallpaper.id)?.remove();
    draftWallpaper = undefined;
  }

  async function renderWallpaper(preview, id) {
    if (previewWallpaper?.id === id && previewWallpaper.document === preview) return;
    const selection = { id, document: preview };
    previewWallpaper = selection;
    if (previewWallpaperUrl) URL.revokeObjectURL(previewWallpaperUrl);
    previewWallpaperUrl = undefined;
    const bundled = bundledWallpaperUrl(id);
    preview.body.style.backgroundImage = bundled ? "url(" + JSON.stringify(bundled) + ")" : "";
    if (!isUploadedWallpaper(id)) return;
    try {
      const wallpaper = draftWallpaper?.id === id ? draftWallpaper : await readWallpaper(id);
      if (previewWallpaper !== selection || !livePreview.isConnected || !wallpaper) return;
      previewWallpaperUrl = URL.createObjectURL(wallpaper.image);
      preview.body.style.backgroundImage = "url(" + JSON.stringify(previewWallpaperUrl) + ")";
    } catch (error) {
      console.error("Could not preview wallpaper.", error);
    }
  }

  backgroundLabel.after(wallpaperUpload, wallpaperInput);
  wallpaperUpload.addEventListener("click", () => wallpaperInput.click());
  wallpaperInput.addEventListener("change", async () => {
    const [image] = wallpaperInput.files;
    wallpaperInput.value = "";
    if (!image || decodingWallpaper || savingWallpaper) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(image.type) || image.size > 10 * 1024 * 1024) {
      setStatus("Choose a PNG, JPEG, or WebP image up to 10 MB.", true);
      return;
    }
    decodingWallpaper = true;
    wallpaperUpload.disabled = true;
    try {
      const bitmap = await createImageBitmap(image);
      bitmap.close();
      if (!screen.isConnected || !decodingWallpaper) return;
      clearWallpaperDraft();
      draftWallpaper = { id: "upload:" + crypto.randomUUID(), name: image.name, image };
      addWallpaperOption(draftWallpaper.id, image.name + " (unsaved)");
      backgroundField.value = draftWallpaper.id;
      renderLiveAppearance();
      setStatus("Select Save changes to keep this wallpaper.");
    } catch (error) {
      console.error("Could not open wallpaper.", error);
      setStatus("Could not open that image. Choose another file.", true);
    } finally {
      decodingWallpaper = false;
      wallpaperUpload.disabled = false;
    }
  });
  const layoutFields = document.createElement("div");
  layoutFields.dataset.customLayout = "";
  layoutFields.innerHTML = `<label>Card corners<select name="customCorners"><option value="rounded">Rounded</option><option value="square">Square</option></select></label><label>Card spacing<select name="customSpacing"><option value="comfortable">Comfortable</option><option value="compact">Compact</option></select></label>`;
  palettePanel.append(layoutFields);
  const cornersField = form.elements.namedItem("customCorners");
  const spacingField = form.elements.namedItem("customSpacing");

  const curatedPalettes = [{name:"Lilac Study",light:["#F6F0FC","#FFFAFF","#EDE0F7","#352344","#735096","#DAC5EB"],dark:["#21192B","#2C2138","#392B48","#F2E7FC","#C5A1E8","#574366"]},{name:"Lagoon Desk",light:["#EAF7F6","#F8FDFC","#D5EEEB","#163C46","#226779","#A9D8D6"],dark:["#12282F","#19353D","#23454C","#E0F5F3","#82CFD5","#3B6269"]},{name:"Honey Notes",light:["#FFF6E4","#FFFCF5","#F9E8BF","#47301E","#885115","#DFC597"],dark:["#2A2119","#362A20","#49392B","#FAEDDA","#F0BC72","#68513A"]}]; const curatedSection = document.createElement("div"); curatedSection.className = "settings-curated"; const curatedHeading = document.createElement("h3"); curatedHeading.textContent = "Curated palettes"; curatedSection.append(curatedHeading); const curatedGrid = document.createElement("div"); curatedGrid.className = "settings-curated-grid"; curatedSection.append(curatedGrid); for (const palette of curatedPalettes) { const button = document.createElement("button"); button.type = "button"; button.className = "settings-curated-card"; const name = document.createElement("span"); name.textContent = palette.name; const swatches = document.createElement("span"); swatches.className = "settings-curated-swatches"; swatches.setAttribute("aria-hidden", "true"); for (const color of palette.light) { const swatch = document.createElement("span"); swatch.style.backgroundColor = color; swatches.append(swatch); } button.append(name, swatches); button.addEventListener("click", () => { const keys = ["background", "surface", "muted", "text", "accent", "border"]; for (const mode of ["light", "dark"]) { customPalettes[mode] = {...customPalettes[mode], ...Object.fromEntries(keys.map((key, index) => [key, palette[mode][index]]))}; } syncCustomPalette(); }); curatedGrid.append(button); } palettePanel.prepend(curatedSection);
  const themeBuilder = document.createElement("div");
  themeBuilder.className = "settings-theme-builder";
  themeBuilder.innerHTML = `<h3>Theme Builder</h3><div class="settings-theme-builder-controls"><label>Base hue<input type="color" value="#8461ad" data-builder-hue></label><label>Color style<select data-builder-style><option value="soft">Soft</option><option value="vivid">Vivid</option><option value="muted">Muted</option></select></label><button type="button" data-builder-generate>Generate palette</button></div>`;
  const builderHue = themeBuilder.querySelector("[data-builder-hue]");
  const builderStyle = themeBuilder.querySelector("[data-builder-style]");
  themeBuilder.querySelector("[data-builder-generate]").addEventListener("click", () => {
    const sample = builderHue.value.slice(1).match(/../g).map(channel => parseInt(channel, 16) / 255);
    const [red, green, blue] = sample;
    const max = Math.max(...sample);
    const range = max - Math.min(...sample);
    let hue = 0;
    if (range) {
      if (max === red) hue = (green - blue) / range;
      else if (max === green) hue = (blue - red) / range + 2;
      else hue = (red - green) / range + 4;
      hue = (hue * 60 + 360) % 360;
    }
    const saturation = range ? {soft: 38, vivid: 65, muted: 20}[builderStyle.value] : 0;
    function color(strength, lightness) {
      const light = lightness / 100;
      const amplitude = saturation * strength / 100 * Math.min(light, 1 - light);
      const channel = offset => {
        const phase = (offset + hue / 30) % 12;
        const value = light - amplitude * Math.max(-1, Math.min(phase - 3, 9 - phase, 1));
        return Math.round(value * 255).toString(16).padStart(2, "0");
      };
      return "#" + channel(0) + channel(8) + channel(4);
    }
    customPalettes.light = {...customPalettes.light, background: color(.7, 96), surface: color(.4, 99), muted: color(.6, 91), text: color(.55, 17), accent: color(1, 33), border: color(.55, 79)};
    customPalettes.dark = {...customPalettes.dark, background: color(.5, 12), surface: color(.5, 17), muted: color(.55, 23), text: color(.4, 94), accent: color(1, 76), border: color(.55, 37)};
    syncCustomPalette();
  });
  palettePanel.insertBefore(themeBuilder, palettePanel.querySelector(".settings-curated")?.nextSibling ?? palettePanel.firstChild);
  const presetKey = "pandora-ii.custom-palette-presets";
  const presetPanel = document.createElement("fieldset");
  presetPanel.className = "settings-card";
  presetPanel.innerHTML = `<legend>Saved palettes</legend><label>Preset name<input data-preset-name maxlength="48" placeholder="e.g. Moonlit Lagoon"></label><label>Saved preset<select data-preset-list></select></label><div class="settings-actions"><button type="button" class="settings-action" data-preset-save>Save preset</button><button type="button" class="settings-action" data-preset-load>Load preset</button><button type="button" class="settings-action" data-preset-delete>Delete preset</button></div>`;
  palettePanel.append(presetPanel);
  const presetName = presetPanel.querySelector("[data-preset-name]");
  const presetList = presetPanel.querySelector("[data-preset-list]");
  const loadPresetButton = presetPanel.querySelector("[data-preset-load]");
  const deletePresetButton = presetPanel.querySelector("[data-preset-delete]");
  const baseField = form.elements.namedItem("customBase");
  let presets = [];
  try {
    const saved = JSON.parse(localStorage.getItem(presetKey) ?? "[]");
    if (Array.isArray(saved)) presets = saved.filter(preset => typeof preset?.name === "string" && preset.palettes);
  } catch (error) { console.error("Could not load palette presets.", error); }
  function showPresets(selected = "") {
    presetList.replaceChildren(new Option("Choose a saved palette", ""), ...presets.map(item => new Option(item.name, item.name)));
    presetList.value = selected;
    loadPresetButton.disabled = deletePresetButton.disabled = !presetList.value;
  }
  function storePresets(next, selected, message) {
    try {
      localStorage.setItem(presetKey, JSON.stringify(next));
      presets = next;
      showPresets(selected);
      setStatus(message);
    } catch (error) {
      console.error("Could not save palette presets.", error);
      setStatus("Could not save palette presets.", true);
    }
  }
  presetPanel.querySelector("[data-preset-save]").addEventListener("click", () => {
    const name = presetName.value.trim();
    if (!name) { setStatus("Enter a preset name.", true); presetName.focus(); return; }
    for (const input of paletteFields.querySelectorAll("input")) if (!input.reportValidity()) return;
    const existing = presets.find(item => item.name.toLowerCase() === name.toLowerCase());
    if (existing && !window.confirm("Replace the preset " + existing.name + "?")) return;
    const palettes = Object.fromEntries(["light", "dark"].map(mode => [mode, Object.fromEntries(Object.entries(customPalettes[mode]).filter(([, color]) => /^#[0-9a-f]{6}$/i.test(color)))]));
    if (draftWallpaper?.id === backgroundField.value) { setStatus("Save changes before saving a preset with this wallpaper.", true); return; }
    const item = { name, palettes, mode: modeField.value, accent: accentField.value, base: baseField.value, background: backgroundField.value, corners: cornersField.value, spacing: spacingField.value };
    storePresets([...presets.filter(preset => preset !== existing), item], name, "Palette preset saved.");
  });
  presetList.addEventListener("change", () => { loadPresetButton.disabled = deletePresetButton.disabled = !presetList.value; });
  loadPresetButton.addEventListener("click", () => {
    const preset = presets.find(item => item.name === presetList.value);
    if (!preset) return;
    customPalettes = { light: { ...preset.palettes.light }, dark: { ...preset.palettes.dark } };
    if (Array.from(modeField.options).some(option => option.value === preset.mode)) modeField.value = preset.mode;
    if (Array.from(accentField.options).some(option => option.value === preset.accent)) accentField.value = preset.accent;
    if (Array.from(baseField.options).some(option => option.value === preset.base)) baseField.value = preset.base;
    backgroundField.value = [...backgroundField.options].some(option => option.value === preset.background) ? preset.background : "";
    cornersField.value = preset.corners === "square" ? "square" : "rounded";
    spacingField.value = preset.spacing === "compact" ? "compact" : "comfortable";
    presetName.value = preset.name;
    syncCustomPalette();
    setStatus("Preset loaded. Select Save changes to apply it.");
  });
  deletePresetButton.addEventListener("click", () => {
    const name = presetList.value;
    if (name && window.confirm("Delete the preset " + name + "?")) storePresets(presets.filter(item => item.name !== name), "", "Palette preset deleted.");
  });
  showPresets();

  function groupAppearanceControls(title, first, end) {
    const section = document.createElement("details");
    section.className = "settings-appearance-disclosure";
    const summary = document.createElement("summary");
    summary.textContent = title;
    const content = document.createElement("div");
    content.className = "settings-appearance-disclosure-body";
    section.append(summary, content);
    palettePanel.insertBefore(section, first);
    while (section.nextSibling && section.nextSibling !== end) {
      content.append(section.nextSibling);
    }
    return section;
  }
  if (themeBuilder.parentElement === palettePanel && backgroundLabel.parentElement === palettePanel && presetPanel.parentElement === palettePanel) {
    const paletteTools = groupAppearanceControls("Build or fine-tune palette", themeBuilder, backgroundLabel);
    if (paletteTools.contains(palettePreview)) {
      palettePanel.insertBefore(palettePreview, paletteTools);
    }
    groupAppearanceControls("Background & layout", backgroundLabel, presetPanel);
    groupAppearanceControls("Saved palettes", presetPanel, null);
    presetPanel.querySelector("legend")?.remove();
  }
  const appearancePanel = palettePanel.parentElement;
  let firstAppearanceField = packField;
  while (firstAppearanceField.parentElement && firstAppearanceField.parentElement !== appearancePanel) {
    firstAppearanceField = firstAppearanceField.parentElement;
  }
  if (firstAppearanceField.parentElement === appearancePanel && palettePanel.parentElement === appearancePanel && (firstAppearanceField.compareDocumentPosition(palettePanel) & Node.DOCUMENT_POSITION_FOLLOWING)) {
    const overview = document.createElement("div");
    overview.className = "settings-appearance-overview";
    const fields = document.createElement("div");
    fields.className = "settings-appearance-overview-fields";
    appearancePanel.insertBefore(overview, firstAppearanceField);
    while (overview.nextSibling !== palettePanel) {
      fields.append(overview.nextSibling);
    }
    overview.append(fields, palettePreview);
    palettePreview.classList.add("settings-appearance-preview");
  }
  const livePreview = document.createElement("iframe");
  livePreview.title = "Live appearance preview";
  livePreview.style.cssText = "display:block;width:100%;height:14rem;border:0;border-radius:.6rem";
  const previewStyles = new URL("../../styles/theme.css", import.meta.url).href;
  livePreview.srcdoc = `
    <!doctype html><html lang="en"><meta charset="utf-8">
    <link rel="stylesheet" href="${previewStyles}">
    <style>
      * { box-sizing:border-box }
      body { margin:0; min-height:100vh; padding:1rem; font:14px/1.4 system-ui,sans-serif; background:var(--color-background) center/cover no-repeat; color:var(--color-text) }
      article { display:grid; grid-template-columns:3.25rem minmax(0,1fr); overflow:hidden; border:1px solid var(--color-border); border-radius:var(--preview-radius,12px); background:var(--color-surface) }
      aside { display:grid; place-content:center; gap:.75rem; background:var(--color-sidebar) }
      img { width:24px; height:24px; object-fit:contain }
      section { display:grid; gap:var(--preview-gap,.65rem); padding:var(--preview-padding,1rem) }
      strong { font-size:1.05rem }
      .label { font-size:.8rem; font-weight:600 }
      .item { padding:.45rem .65rem; border-radius:var(--preview-radius,12px); background:var(--color-surface-muted) }
      .action { justify-self:start; padding:.35rem .7rem; border-radius:.4rem; background:var(--color-primary); color:var(--color-primary-text); font-weight:600 }
    </style>
    <body><article><aside aria-hidden="true"><img data-icon="home"><img data-icon="tasks"></aside><section><span class="label">Live preview</span><strong>Study desk</strong><span class="item">Upcoming tasks</span><span class="action">Add task</span></section></article></body></html>`;
  for (const child of palettePreview.children) child.style.display = "none";
  palettePreview.style.display = "block";
  palettePreview.append(livePreview);
  const systemDark = matchMedia("(prefers-color-scheme: dark)");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const previewColors = {background:"background", surface:"surface", muted:"surface-muted", text:"text", accent:"primary", border:"border"};
  let lastPreviewMotion;
  function renderLiveAppearance() {
    const preview = livePreview.contentDocument;
    if (!preview?.body?.querySelector("article")) return;
    const pack = packField.value;
    const custom = pack === "custom";
    const mode = modeField.value === "system" ? (systemDark.matches ? "dark" : "light") : modeField.value;
    const motion = form.elements.namedItem("motion").value;
    const root = preview.documentElement;
    Object.assign(root.dataset, {themePack:pack, theme:mode, accent:accentField.value, motion});
    root.style.colorScheme = mode;
    const palette = custom ? customPalettes[mode] ?? {} : {};
    for (const [key, token] of Object.entries(previewColors)) {
      const value = palette[key];
      root.style.setProperty("--color-" + token, /^#[0-9a-f]{6}$/i.test(value ?? "") ? value : "");
    }
    const iconPack = custom ? baseField.value : pack;
    for (const icon of preview.querySelectorAll("[data-icon]")) {
      const url = new URL("../../assets/" + (iconPack === "pixel" ? "" : iconPack + "/") + "icons/navigation/" + icon.dataset.icon + ".svg", import.meta.url).href;
      if (icon.src !== url) icon.src = url;
    }
    renderWallpaper(preview, custom ? backgroundField.value : "");
    const compact = custom && spacingField.value === "compact";
    root.style.setProperty("--preview-radius", custom && cornersField.value === "square" ? "0px" : "12px");
    root.style.setProperty("--preview-gap", compact ? ".3rem" : ".65rem");
    root.style.setProperty("--preview-padding", compact ? ".55rem" : "1rem");
    const action = preview.querySelector(".action");
    if (lastPreviewMotion !== motion) {
      for (const animation of action.getAnimations()) animation.cancel();
      if (lastPreviewMotion && motion !== "reduced" && !reducedMotion.matches) {
        action.animate([{ opacity:.55 }, { opacity:1 }], { duration:220 });
      }
      lastPreviewMotion = motion;
    }
  }
  livePreview.addEventListener("load", renderLiveAppearance);
  const queueLiveAppearance = () => queueMicrotask(renderLiveAppearance);
  for (const event of ["input", "change", "click"]) form.addEventListener(event, queueLiveAppearance);
  for (const query of [systemDark, reducedMotion]) {
    query.addEventListener("change", queueLiveAppearance);
    livePreview.addEventListener("load", () => {
      const observer = new MutationObserver(() => {
        if (livePreview.isConnected) return;
        query.removeEventListener("change", queueLiveAppearance);
        if (previewWallpaperUrl) URL.revokeObjectURL(previewWallpaperUrl);
        previewWallpaperUrl = undefined;
        observer.disconnect();
      });
      observer.observe(document.body, {childList:true, subtree:true});
    }, {once:true});
  }
  packField.addEventListener("change", () => queueMicrotask(syncCustomPalette));
  modeField.addEventListener("change", syncCustomPalette);

  function setStatus(message, isError = false) {
    status.toggleAttribute("data-error", isError);
    status.textContent = message;
  }

  const initialPreferences = readPreferences();
  if (isUploadedWallpaper(initialPreferences.customBackground)) addWallpaperOption(initialPreferences.customBackground, "Saved wallpaper");
  fillForm(initialPreferences);
  listWallpapers().then(items => {
    for (const { id, name } of items) addWallpaperOption(id, name);
  }).catch(error => console.error("Could not list saved wallpapers.", error));

  packField.addEventListener("change", () => {
    rememberAppearance();
    showAppearance(packField.value);
    setStatus("Theme pack selected. Select Save changes to apply it.");
  });

  iconTrigger.addEventListener("click", () => {
    const current = iconInputs.get(iconField.value) ?? iconInputs.values().next().value;
    if (current) current.checked = true;

    iconDialog.returnValue = "";
    iconDialog.showModal();
    current?.focus();
  });

  iconDialog.addEventListener("close", () => {
    const choice = iconOptions.querySelector("input:checked");

    if (iconDialog.returnValue === "choose" && choice) {
      iconField.value = choice.value;
      globalBadge = Object.hasOwn(globalIcons, choice.value) ? choice.value : "";
      updateIconPreview();
      setStatus("Profile icon selected. Select Save changes to apply it.");
    }

    iconTrigger.focus();
  });

  resetTrigger.addEventListener("click", () => {
    resetDialog.returnValue = "";
    resetDialog.showModal();
  });

  resetDialog.addEventListener("close", () => {
    if (resetDialog.returnValue !== "restore") {
      resetTrigger.focus();
      return;
    }

    decodingWallpaper = false;
    clearWallpaperDraft();
    backgroundField.value = "";
    fillForm(defaultPreferences);
    renderLiveAppearance();
    setStatus("Defaults loaded. Select Save changes to apply them.");
    saveButton.focus();
  });

  form.addEventListener("input", () => setStatus(""));

  form.addEventListener("submit", async (event) => {
    if (savingWallpaper || decodingWallpaper) {
      event.preventDefault();
      if (decodingWallpaper) setStatus("Wait for the wallpaper preview before saving.", true);
      return;
    }
    event.preventDefault();

    if (!displayName.value.trim()) {
      setStatus("Enter a display name.", true);
      displayName.focus();
      return;
    }

    try {
      rememberAppearance();
      const selectedDraft = draftWallpaper?.id === backgroundField.value ? draftWallpaper : undefined;
      const keepWallpaper = selectedDraft && packField.value === "custom";
      if (keepWallpaper) {
        savingWallpaper = true;
        form.inert = true;
        saveButton.disabled = true;
        await saveWallpaper(selectedDraft);
      } else if (selectedDraft) {
        backgroundField.value = readPreferences().customBackground;
      }
      fillForm(savePreferences({
        ...Object.fromEntries(new FormData(form)),
        globalBadge,
        customPalettes,
        appearances,
      }));
      if (keepWallpaper) {
        addWallpaperOption(selectedDraft.id, selectedDraft.name);
        draftWallpaper = undefined;
      } else clearWallpaperDraft();
      renderLiveAppearance();
      setStatus("Changes saved.");
    } catch (error) {
      console.error("Could not save preferences.", error);
      setStatus("Couldn’t save changes. Your entries are still here.", true);
    } finally {
      savingWallpaper = false;
      form.inert = false;
      saveButton.disabled = false;
    }
  });

  container.replaceChildren(screen);
}