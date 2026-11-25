import { renderQuizEditor } from "../quizzes/quiz-editor.js"; import { saveCustomQuiz } from "../../services/quiz-catalog.js"; import { folderPicker } from "./course-quick-actions.js";
import { createCourseQuickActions } from "./course-quick-actions.js"; import { loadWorkspaceRows } from "./course-workspace-data.js";
import { themeAsset } from "../../services/theme-packs.js";
import { createWorkspaceRow } from "./course-workspace-panel.js";

export function mountCourseFolders(workspace, panelGrid, panels, courseCode) {
  const key = "pandora-ii.course-folders." + encodeURIComponent(courseCode);
  const make = (tag, text) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const section = make("section");
  section.className = "course-workspace-panel course-folders";
  const title = make("h2", "Folders");
  const header = make("div");
  header.className = "course-panel-header";
  const dialog = make("dialog");
  dialog.className = "header-search-dialog course-folder-dialog";
  dialog.setAttribute("aria-labelledby", "course-folder-dialog-title");
  const dialogTitle = make("h2");
  dialogTitle.id = "course-folder-dialog-title";
  const form = make("form");
  form.className = "course-detail-navigation";
  const input = make("input");
  input.required = true;
  input.maxLength = 80;
  input.placeholder = "Folder name";
  input.setAttribute("aria-label", "Folder name");
  const submit = make("button", "Create folder");
  submit.type = "submit";
  submit.className = "course-detail-shortcut";
  const list = make("div");
  list.className = "course-folder-grid";
  const feedback = make("p");
  feedback.setAttribute("role", "alert");
  const status = make("p");
  status.setAttribute("role", "status");
  let editing = "";
  let folders = [];
  let assignments = {};

  function button(label, action) {
    const el = make("button", label);
    el.type = "button";
    el.className = "course-detail-shortcut";
    el.addEventListener("click", action);
    return el;
  }

  function resetEditor() {
    editing = "";
    form.reset();
    submit.textContent = "Create folder";
    feedback.textContent = "";
  }

  const cancel = button("Cancel", () => dialog.close());
  const create = button("+ New folder", () => openEditor());
  create.classList.add("course-folder-primary");
  header.append(title, create);
  form.append(input, feedback, cancel, submit);
  dialog.append(dialogTitle, form);
  dialog.addEventListener("close", resetEditor);
  section.append(header, status, list, dialog);
  const unfiled = make("h2", "Unfiled items");
  unfiled.className = "course-unfiled-title";
  panelGrid.before(section, unfiled);

  function openEditor(folder) {
    resetEditor();
    editing = folder?.id ?? "";
    input.value = folder?.name ?? "";
    dialogTitle.textContent = folder ? "Rename folder" : activeFolder ? "New subfolder" : "New folder";
    submit.textContent = folder ? "Save name" : "Create folder";
    dialog.showModal();
    input.focus();
    input.select();
  }

  function update(nextFolders, nextAssignments, message) {
    try {
      localStorage.setItem(key, JSON.stringify({ folders: nextFolders, assignments: nextAssignments }));
    } catch (error) {
      status.textContent = "Could not save the folder change.";
      console.error(error);
      render();
      return false;
    }
    folders = nextFolders;
    assignments = nextAssignments;
    status.textContent = message;
    render();
    return true;
  }

  function addMoveControl(row, item) {
    if (!folders.length) return;
    const select = make("select");
    select.setAttribute("aria-label", "Move " + row.title + " to folder");
    select.add(new Option("Unfiled items", ""));
    for (const folder of folders) select.add(new Option(lineage(folder.id).map(item => item.name).join(" / "), folder.id));
    select.value = assignments[row.folderKey] ?? "";
    select.addEventListener("change", () => {
      const next = { ...assignments };
      if (select.value) next[row.folderKey] = select.value;
      else delete next[row.folderKey];
      update(folders, next, "Item moved.");
    });
    const menu=make("details"); menu.className="course-item-menu"; const trigger=make("summary",String.fromCharCode(8942)); trigger.setAttribute("aria-label","Actions for "+row.title); const options=make("div"); options.className="course-item-menu-options"; options.append(make("strong","Move to folder")); for(const option of select.options){const destination=button(option.textContent+(option.value===select.value?" "+String.fromCharCode(10003):""),()=>{menu.open=false;select.value=option.value;select.dispatchEvent(new Event("change"));});destination.disabled=option.value===select.value;options.append(destination);} menu.append(trigger,options); menu.addEventListener("toggle",()=>{if(menu.open){for(const other of workspace.querySelectorAll(".course-item-menu[open]"))if(other!==menu)other.open=false;}}); menu.addEventListener("keydown",event=>{if(event.key==="Escape"){menu.open=false;trigger.focus();}}); item.classList.add("course-movable-item"); item.append(menu);
  }

  let activeFolder = null; const createQuizAction = button("+ Create Quiz", () => { const host = workspace.parentElement; if (!host) return; const picker = folderPicker(courseCode, activeFolder); function restore() { host.replaceChildren(workspace); createQuizAction.focus(); } renderQuizEditor(host, { presetCourseCode: courseCode, folderPicker: picker, onCancel: restore, onSave(quiz) { const saved = { ...quiz, courseCode }; if (!saveCustomQuiz(saved)) return false; try { picker.assign("quizzes", { ...saved, source: "custom" }); } catch (error) { console.error("Quiz saved but folder assignment failed.", error); alert("Quiz saved. Move it to the desired folder manually."); } restore(); void (async () => { const latest = JSON.parse(localStorage.getItem(key) ?? "{}"); assignments = latest.assignments ?? {}; folders = latest.folders ?? []; const entry = panels.find(item => item.section.id === "quizzes"); entry.rows = await loadWorkspaceRows(entry.section, courseCode); render(); })().catch(console.error); return true; } }); }); createQuizAction.classList.add("course-folder-primary"); panels.find(entry => entry.section.id === "quizzes").panel.element.querySelector(".course-panel-header").append(createQuizAction); const quickActions = createCourseQuickActions(courseCode, async () => { const latest = JSON.parse(localStorage.getItem(key) ?? "{}"); folders = latest.folders ?? []; assignments = latest.assignments ?? {}; await Promise.all(panels.map(async entry => { entry.rows = await loadWorkspaceRows(entry.section, courseCode); })); render(); }, () => activeFolder); const taskAction = quickActions.children[0]; const resourceAction = quickActions.children[1]; const taskHeader = panelGrid.querySelector("[data-course-section=tasks] .course-panel-header"); const resourceHeader = panelGrid.querySelector("[data-course-section=resources] .course-panel-header"); if (taskHeader) taskHeader.append(taskAction); if (resourceHeader) resourceHeader.append(resourceAction);

  function parentOf(folder) {
    return folder.parentId ?? null;
  }

  function lineage(id) {
    const path = [];
    const seen = new Set();
    while (id && !seen.has(id)) {
      seen.add(id);
      const folder = folders.find(item => item.id === id);
      if (!folder) break;
      path.unshift(folder);
      id = parentOf(folder);
    }
    return path;
  }

  function visit(id) {
    activeFolder = id;
    status.textContent = "";
    render();
    title.focus();
  }

  function render() {
    const items = panels.flatMap(({ rows }) => rows ?? []);
    const folderIds = new Set(folders.map(({ id }) => id));
    for (const { panel, rows } of panels) {
      if (rows) panel.showRows(rows.filter(row => !folderIds.has(assignments[row.folderKey])), addMoveControl);
    }

    let breadcrumb = section.querySelector("[data-folder-path]");
    if (!breadcrumb) {
      breadcrumb = make("nav");
      breadcrumb.dataset.folderPath = "";
      breadcrumb.className = "course-detail-navigation";
      breadcrumb.setAttribute("aria-label", "Folder path");
      title.tabIndex = -1;
      header.after(breadcrumb);
    }
    const path = lineage(activeFolder);
    const controls = [button("Folders", () => visit(null)), ...path.map(folder => button(folder.name, () => visit(folder.id)))];
    controls.at(-1).setAttribute("aria-current", "location");
    breadcrumb.replaceChildren(...controls);
    breadcrumb.hidden = path.length === 0;
    title.textContent = path.at(-1)?.name ?? "Folders";
    create.textContent = activeFolder ? "+ New subfolder" : "+ New folder";

    const siblings = folders.filter(folder => parentOf(folder) === activeFolder);
    list.replaceChildren();
    siblings.forEach((folder, index) => {
      const card = make("div");
      card.className = "course-folder-card";
      const open = button("", () => visit(folder.id));
      open.style.cssText = "width:100%;min-height:64px;padding-inline-end:54px;background:transparent;border:0;text-align:start;overflow-wrap:anywhere";
      const icon = make("img");
      icon.src = themeAsset("icons/resources/repository-folder.svg");
      icon.alt = "";
      icon.width = icon.height = 32;
      const label = make("span");
      const childCount = folders.filter(child => parentOf(child) === folder.id).length;
      const itemCount = items.filter(row => assignments[row.folderKey] === folder.id).length;
      label.append(make("strong", folder.name), make("small", (childCount ? childCount + (childCount === 1 ? " folder" : " folders") + " · " : "") + itemCount + (itemCount === 1 ? " item" : " items")));
      label.lastElementChild.style.display = "block";
      open.append(icon, label);

      const menu = make("details");
      menu.className = "course-folder-menu";
      const more = make("summary", "⋯");
      more.setAttribute("aria-label", "Actions for " + folder.name);
      const actions = make("div");

      function reorder(step) {
        const next = [...folders];
        const from = next.indexOf(folder);
        const to = next.indexOf(siblings[index + step]);
        [next[from], next[to]] = [next[to], next[from]];
        update(next, assignments, "Folder order saved.");
      }

      const up = button("Move up", () => reorder(-1));
      const down = button("Move down", () => reorder(1));
      up.disabled = index === 0;
      down.disabled = index === siblings.length - 1;
      const rename = button("Rename", () => { menu.open = false; openEditor(folder); });

      const move = make("select");
      move.setAttribute("aria-label", "Move folder " + folder.name);
      move.add(new Option("Move to…", "", true, true));
      move.options[0].disabled = true;
      if (activeFolder) move.add(new Option("Course root", "@root"));
      for (const dest of folders) {
        const route = lineage(dest.id);
        if (dest.id !== activeFolder && !route.some(item => item.id === folder.id)) {
          move.add(new Option(route.map(item => item.name).join(" / "), dest.id));
        }
      }
      move.disabled = move.options.length === 1;
      move.addEventListener("change", () => {
        const parentId = move.value === "@root" ? null : move.value;
        if (folders.some(item => parentOf(item) === parentId && item.name.toLowerCase() === folder.name.toLowerCase())) {
          status.textContent = "A folder with that name already exists there.";
          move.selectedIndex = 0;
          return;
        }
        update([...folders.filter(item => item.id !== folder.id), { ...folder, parentId }], assignments, "Folder moved.");
      });

      const remove = button("Delete folder", () => {
        const parentId = parentOf(folder);
        const children = folders.filter(item => parentOf(item) === folder.id);
        const siblingNames = new Set(siblings.filter(item => item.id !== folder.id).map(item => item.name.toLowerCase()));
        if (!window.confirm("Delete " + folder.name + "? Its items and subfolders will move up one level.")) return;
        const next = folders.flatMap(item => {
          if (item.id === folder.id) return [];
          if (!children.includes(item)) return [item];
          let name = item.name;
          for (let number = 2; siblingNames.has(name.toLowerCase()); number++) name = item.name + " (" + number + ")";
          siblingNames.add(name.toLowerCase());
          return [{ ...item, name, parentId }];
        });
        const nextAssignments = { ...assignments };
        for (const key of Object.keys(nextAssignments)) {
          if (nextAssignments[key] !== folder.id) continue;
          if (parentId) nextAssignments[key] = parentId;
          else delete nextAssignments[key];
        }
        update(next, nextAssignments, "Folder deleted. Its contents moved up one level.");
      });

      actions.append(rename, up, down, move, remove);
      menu.append(more, actions);
      card.append(open, menu);
      list.append(card);
    });

    let contents = section.querySelector("[data-open-folder-items]");
    if (!contents) {
      contents = make("div");
      contents.dataset.openFolderItems = "";
      contents.className = "course-folder-content";
      list.after(contents);
    }
    contents.hidden = !activeFolder;
    if (activeFolder) {
      const rows = make("ul");
      rows.className = "course-panel-list";
      for (const row of items.filter(item => assignments[item.folderKey] === activeFolder)) {
        const element = createWorkspaceRow(row);
        addMoveControl(row, element);
        rows.append(element);
      }
      contents.replaceChildren(rows.childElementCount ? rows : make("p", "No items in this folder."));
    }
  }

  try {
    const saved = JSON.parse(localStorage.getItem(key) ?? "{}");
    if (saved.folders !== undefined && !Array.isArray(saved.folders)) throw new Error("Invalid folders");
    folders = (saved.folders ?? []).filter(folder => typeof folder?.id === "string" && typeof folder?.name === "string");
    assignments = saved.assignments ?? {};
  } catch (error) {
    status.textContent = "Could not load saved folders.";
    create.disabled = true;
    console.error(error);
    return;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = input.value.trim();
    if (!name || folders.some(folder => folder.id !== editing && parentOf(folder) === activeFolder && folder.name.toLowerCase() === name.toLowerCase())) {
      feedback.textContent = name ? "That folder name already exists." : "Enter a folder name.";
      return;
    }
    const next = editing ? folders.map(folder => folder.id === editing ? { ...folder, name } : folder) : [...folders, { id: crypto.randomUUID(), name, parentId: activeFolder }];
    if (update(next, assignments, editing ? "Folder renamed." : "Folder created.")) dialog.close();
    else feedback.textContent = "Could not save the folder change.";
  });
  render();
}

