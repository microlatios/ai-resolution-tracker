/* eslint-disable no-alert */

const STORAGE_KEY = "ai_resolution_tracker_v1";

const WEEKENDS = [
  {
    id: "w1",
    number: 1,
    title: "The Vibe Code Kickoff",
    subtitle: "Build your resolution tracker",
    deliverable: "A working web app that tracks your progress through these 10 weekends.",
    doneWhen: "Tracker is live, Weekend 1 logged, and you trust you’ll use it.",
  },
  {
    id: "w2",
    number: 2,
    title: "The Model Mapping Project",
    subtitle: "Build your personal AI topography",
    deliverable: 'Model Topography Sheet + "AI Rules of Thumb" document.',
    doneWhen: 'You can answer "which tool do I use for what?" in 30 seconds.',
  },
  {
    id: "w3",
    number: 3,
    title: "The Deep Research Sprint",
    subtitle: "Let AI do a week’s research in an afternoon",
    deliverable: "A 2-page research brief with a clear recommendation on a real decision.",
    doneWhen: "Your brief leads to a recommendation you’d actually follow, with known uncertainties.",
  },
  {
    id: "w4",
    number: 4,
    title: "The Analysis Project",
    subtitle: "Turn messy data into actual decisions",
    deliverable: "A cleaned dataset + a one-page Insights Memo with specific actions.",
    doneWhen: "You can name the top 3 drivers and what you’ll do about them.",
  },
  {
    id: "w5",
    number: 5,
    title: "The Visual Reasoning Project",
    subtitle: "Make AI see and think",
    deliverable: "One infographic, diagram, or visual explainer you’d actually use.",
    doneWhen: "You can explain the idea faster with the visual than with words.",
  },
  {
    id: "w6",
    number: 6,
    title: "The Information Pipeline",
    subtitle: "Build your NotebookLM + Gamma stack",
    deliverable: "A reusable workflow: Summary + FAQ + Presentation Deck from one input source.",
    doneWhen: "You can brief someone in under 7 minutes using your deck.",
  },
  {
    id: "w7",
    number: 7,
    title: "The First Automation",
    subtitle: "Build your content distribution machine",
    deliverable: 'One working automation + a short "How it works" doc.',
    doneWhen: "You’ve run it twice successfully, it saved time, and you can explain it.",
  },
  {
    id: "w8",
    number: 8,
    title: "The Second Automation",
    subtitle: "Build your productivity workflow",
    deliverable: "One working productivity automation + a follow-up dashboard/tracker.",
    doneWhen: "Follow-ups are created automatically and you trust the system enough to use it.",
  },
  {
    id: "w9",
    number: 9,
    title: "The Context Engineering Project",
    subtitle: "Build your personal AI operating system",
    deliverable: "A structured personal context system + a Professional Context Document for pasting.",
    doneWhen: "You have one place to store/reuse outputs + a habit to maintain it.",
  },
  {
    id: "w10",
    number: 10,
    title: "The AI-Powered Build",
    subtitle: "Build something with AI inside it",
    deliverable: "A working application that uses AI as a core feature (chatbot, voice agent, or tool).",
    doneWhen: "You’ve built and deployed something usable with AI at its center.",
  },
];

function nowIso() {
  return new Date().toISOString();
}

function safeParseJson(text) {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (err) {
    return { ok: false, error: err };
  }
}

function clampInt(n, min, max) {
  const x = Number.parseInt(String(n), 10);
  if (Number.isNaN(x)) return min;
  return Math.min(max, Math.max(min, x));
}

function clampNumber(n, min, max) {
  const x = Number(n);
  if (!Number.isFinite(x)) return min;
  return Math.min(max, Math.max(min, x));
}

function formatLocalTimestamp(iso) {
  if (!iso) return "Not saved yet";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Not saved yet";
  return `Saved ${d.toLocaleString()}`;
}

function buildDefaultState() {
  const weekends = Object.fromEntries(
    WEEKENDS.map((w) => [
      w.id,
      {
        completed: false,
        completedAt: null,
        hours: 0,
        notes: "",
        scorecard: {
          outcomeQuality: 3, // 1–5
          timeSaved: 3, // 1–5
          repeatability: 3, // 1–5-ish proxy (1=hard,5=easy)
          useAgain: "no", // yes/no
          notes: "",
        },
      },
    ]),
  );

  return {
    version: 1,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    weekends,
  };
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return buildDefaultState();

  const parsed = safeParseJson(raw);
  if (!parsed.ok) return buildDefaultState();
  const s = parsed.value;

  // Merge with defaults so future schema changes don’t break.
  const base = buildDefaultState();
  if (!s || typeof s !== "object") return base;

  const merged = { ...base, ...s };
  merged.weekends = { ...base.weekends, ...(s.weekends || {}) };

  // Ensure each weekend has required shape.
  for (const w of WEEKENDS) {
    const cur = merged.weekends[w.id] || base.weekends[w.id];
    merged.weekends[w.id] = {
      ...base.weekends[w.id],
      ...cur,
      scorecard: { ...base.weekends[w.id].scorecard, ...(cur.scorecard || {}) },
    };
  }

  merged.updatedAt = s.updatedAt || base.updatedAt;
  return merged;
}

function saveState(state) {
  const next = { ...state, updatedAt: nowIso() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

function computeSummary(state) {
  const weekendStates = WEEKENDS.map((w) => state.weekends[w.id]);
  const completedCount = weekendStates.filter((x) => !!x?.completed).length;
  const progressPct = Math.round((completedCount / WEEKENDS.length) * 100);
  const totalHours = weekendStates.reduce((sum, x) => sum + (Number(x?.hours) || 0), 0);
  return { completedCount, progressPct, totalHours };
}

function suggestNextWeekend(state) {
  const next = WEEKENDS.find((w) => !state.weekends[w.id]?.completed);
  if (!next) return { type: "done" };
  return { type: "next", weekend: next };
}

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "htmlFor") node.htmlFor = v;
    else if (k.startsWith("data-")) node.setAttribute(k, String(v));
    else if (k === "text") node.textContent = String(v);
    else if (k === "checked") node.checked = Boolean(v);
    else node.setAttribute(k, String(v));
  }
  for (const c of children) node.append(c);
  return node;
}

function weekendCard(weekend, stateForWeekend) {
  const details = el("details", { class: "weekend", "data-weekend-id": weekend.id });

  const badge = el("span", {
    class: `badge ${stateForWeekend.completed ? "badge--done" : ""}`,
    text: stateForWeekend.completed ? "Complete" : `Weekend ${weekend.number}`,
  });

  const summary = el("summary", { class: "weekend__summary" }, [
    el("div", {}, [
      el("div", { class: "weekend__title", text: weekend.title }),
      el("div", { class: "weekend__subtitle", text: weekend.subtitle }),
    ]),
    badge,
  ]);

  const completedId = `${weekend.id}__completed`;
  const hoursId = `${weekend.id}__hours`;
  const notesId = `${weekend.id}__notes`;
  const oqId = `${weekend.id}__oq`;
  const tsId = `${weekend.id}__ts`;
  const repId = `${weekend.id}__rep`;
  const useAgainId = `${weekend.id}__useAgain`;
  const scoreNotesId = `${weekend.id}__scoreNotes`;

  const body = el("div", { class: "weekend__body" }, [
    el("div", { class: "checkline" }, [
      el("input", {
        id: completedId,
        type: "checkbox",
        checked: stateForWeekend.completed,
        "data-action": "toggle-complete",
      }),
      el("div", { class: "checkline__text" }, [
        el("div", { class: "checkline__title", text: "Mark as complete" }),
        el("div", { class: "checkline__hint", text: `Done when: ${weekend.doneWhen}` }),
      ]),
    ]),

    el("div", { class: "row" }, [
      el("div", { class: "field" }, [
        el("label", { htmlFor: hoursId, text: "Hours spent (estimate)" }),
        el("input", {
          class: "input",
          id: hoursId,
          type: "number",
          inputmode: "decimal",
          min: "0",
          step: "0.25",
          value: String(stateForWeekend.hours ?? 0),
          "data-action": "hours",
        }),
      ]),
      el("div", { class: "field" }, [
        el("label", { text: "Deliverable" }),
        el("div", { class: "pill", text: weekend.deliverable }),
      ]),
    ]),

    el("div", { class: "field" }, [
      el("label", { htmlFor: notesId, text: "Weekend notes (what you built / links / prompts)" }),
      el("textarea", {
        id: notesId,
        placeholder: "What worked? What didn’t? Link to the artifact/deploy.",
        "data-action": "notes",
      }),
    ]),

    el("div", { class: "row" }, [
      el("div", { class: "field" }, [
        el("label", { htmlFor: oqId, text: "Outcome quality (1–5)" }),
        scoreSelect(oqId, stateForWeekend.scorecard.outcomeQuality, "score-oq"),
      ]),
      el("div", { class: "field" }, [
        el("label", { htmlFor: tsId, text: "Time saved (1–5)" }),
        scoreSelect(tsId, stateForWeekend.scorecard.timeSaved, "score-ts"),
      ]),
    ]),

    el("div", { class: "row" }, [
      el("div", { class: "field" }, [
        el("label", { htmlFor: repId, text: "Repeatability (1–5)" }),
        scoreSelect(repId, stateForWeekend.scorecard.repeatability, "score-rep"),
      ]),
      el("div", { class: "field" }, [
        el("label", { htmlFor: useAgainId, text: "Use again?" }),
        useAgainSelect(useAgainId, stateForWeekend.scorecard.useAgain),
      ]),
    ]),

    el("div", { class: "field" }, [
      el("label", { htmlFor: scoreNotesId, text: "Scorecard notes (best prompt / approach / what didn’t work)" }),
      el("textarea", {
        id: scoreNotesId,
        placeholder: "Capture your best prompt, key insight, and what to avoid next time.",
        "data-action": "score-notes",
      }),
    ]),

    stateForWeekend.completedAt
      ? el("div", { class: "pill", text: `Completed: ${new Date(stateForWeekend.completedAt).toLocaleString()}` })
      : el("div", { class: "pill", text: "Not completed yet." }),
  ]);

  details.append(summary, body);
  return details;
}

function scoreSelect(id, value, action) {
  const select = el("select", { id, "data-action": action });
  for (let i = 1; i <= 5; i += 1) {
    const opt = el("option", { value: String(i), text: String(i) });
    if (Number(value) === i) opt.selected = true;
    select.append(opt);
  }
  return select;
}

function useAgainSelect(id, value) {
  const select = el("select", { id, "data-action": "use-again" });
  const opts = [
    { value: "no", label: "No" },
    { value: "yes", label: "Yes" },
  ];
  for (const o of opts) {
    const opt = el("option", { value: o.value, text: o.label });
    if (String(value) === o.value) opt.selected = true;
    select.append(opt);
  }
  return select;
}

function renderAll(state) {
  const list = document.getElementById("weekendList");
  list.innerHTML = "";
  for (const w of WEEKENDS) {
    const node = weekendCard(w, state.weekends[w.id]);
    list.append(node);

    // Hydrate textareas after insert (so value doesn't get treated as attribute).
    const notes = node.querySelector(`textarea[data-action="notes"]`);
    if (notes) notes.value = state.weekends[w.id].notes || "";
    const scoreNotes = node.querySelector(`textarea[data-action="score-notes"]`);
    if (scoreNotes) scoreNotes.value = state.weekends[w.id].scorecard.notes || "";
  }

  updateSummaryUI(state);
}

function updateSummaryUI(state) {
  const { completedCount, progressPct, totalHours } = computeSummary(state);
  document.getElementById("completedCount").textContent = String(completedCount);
  document.getElementById("progressPct").textContent = String(progressPct);
  document.getElementById("totalHours").textContent = totalHours.toFixed(1);
  document.getElementById("progressFill").style.width = `${progressPct}%`;
  document.getElementById("lastSavedPill").textContent = formatLocalTimestamp(state.updatedAt);

  const nextBox = document.getElementById("nextBox");
  const suggestion = suggestNextWeekend(state);
  if (suggestion.type === "done") {
    nextBox.innerHTML = `<strong>All 10 weekends completed.</strong> Export a backup and celebrate.`;
  } else {
    const w = suggestion.weekend;
    nextBox.innerHTML = `<strong>Next up:</strong> Weekend ${w.number} — ${escapeHtml(w.title)}<br /><span class="muted small">${escapeHtml(
      w.deliverable,
    )}</span>`;
  }
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function onListChange(ev, state, setState) {
  const target = ev.target;
  if (!(target instanceof HTMLElement)) return;
  const action = target.getAttribute("data-action");
  if (!action) return;

  const details = target.closest("[data-weekend-id]");
  const weekendId = details?.getAttribute("data-weekend-id");
  if (!weekendId) return;

  const wState = state.weekends[weekendId];
  if (!wState) return;

  let nextState = state;
  const nextWeekend = { ...wState, scorecard: { ...wState.scorecard } };

  if (action === "toggle-complete") {
    const checked = Boolean(target.checked);
    nextWeekend.completed = checked;
    nextWeekend.completedAt = checked ? nowIso() : null;
  } else if (action === "hours") {
    const val = target instanceof HTMLInputElement ? target.value : "0";
    nextWeekend.hours = clampNumber(val, 0, 9999);
  } else if (action === "notes") {
    const val = target instanceof HTMLTextAreaElement ? target.value : "";
    nextWeekend.notes = val;
  } else if (action === "score-oq") {
    const val = target instanceof HTMLSelectElement ? target.value : "3";
    nextWeekend.scorecard.outcomeQuality = clampInt(val, 1, 5);
  } else if (action === "score-ts") {
    const val = target instanceof HTMLSelectElement ? target.value : "3";
    nextWeekend.scorecard.timeSaved = clampInt(val, 1, 5);
  } else if (action === "score-rep") {
    const val = target instanceof HTMLSelectElement ? target.value : "3";
    nextWeekend.scorecard.repeatability = clampInt(val, 1, 5);
  } else if (action === "use-again") {
    const val = target instanceof HTMLSelectElement ? target.value : "no";
    nextWeekend.scorecard.useAgain = val === "yes" ? "yes" : "no";
  } else if (action === "score-notes") {
    const val = target instanceof HTMLTextAreaElement ? target.value : "";
    nextWeekend.scorecard.notes = val;
  } else {
    return;
  }

  nextState = {
    ...state,
    weekends: {
      ...state.weekends,
      [weekendId]: nextWeekend,
    },
  };

  nextState = saveState(nextState);
  setState(nextState);
  updateSummaryUI(nextState);

  // Update badge quickly without full re-render
  const badge = details.querySelector(".badge");
  if (badge && action === "toggle-complete") {
    if (nextWeekend.completed) {
      badge.textContent = "Complete";
      badge.classList.add("badge--done");
    } else {
      const w = WEEKENDS.find((x) => x.id === weekendId);
      badge.textContent = w ? `Weekend ${w.number}` : "Weekend";
      badge.classList.remove("badge--done");
    }
  }
}

function setupExportImport(getState, setState) {
  const exportBtn = document.getElementById("exportBtn");
  const exportDialog = document.getElementById("exportDialog");
  const exportText = document.getElementById("exportText");
  const copyExportBtn = document.getElementById("copyExportBtn");
  const downloadExportBtn = document.getElementById("downloadExportBtn");
  const importFile = document.getElementById("importFile");

  exportBtn.addEventListener("click", () => {
    const s = getState();
    exportText.value = JSON.stringify(s, null, 2);
    exportDialog.showModal();
  });

  copyExportBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(exportText.value);
      copyExportBtn.textContent = "Copied";
      setTimeout(() => (copyExportBtn.textContent = "Copy to clipboard"), 1200);
    } catch {
      alert("Could not copy to clipboard. You can still select and copy manually.");
    }
  });

  downloadExportBtn.addEventListener("click", () => {
    const blob = new Blob([exportText.value], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ai-resolution-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  importFile.addEventListener("change", async () => {
    const file = importFile.files?.[0];
    if (!file) return;

    const text = await file.text();
    const parsed = safeParseJson(text);
    if (!parsed.ok) {
      alert("That file wasn’t valid JSON.");
      importFile.value = "";
      return;
    }

    const next = parsed.value;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    const loaded = loadState();
    setState(loaded);
    renderAll(loaded);
    importFile.value = "";
  });
}

function setupReset(getState, setState) {
  const resetBtn = document.getElementById("resetBtn");
  resetBtn.addEventListener("click", () => {
    const ok = confirm("Reset everything? This clears only this browser’s saved data.");
    if (!ok) return;
    localStorage.removeItem(STORAGE_KEY);
    const fresh = buildDefaultState();
    const saved = saveState(fresh);
    setState(saved);
    renderAll(saved);
  });
}

function main() {
  let state = loadState();
  // Ensure initial save to set updatedAt and persist defaults
  state = saveState(state);

  const getState = () => state;
  const setState = (s) => {
    state = s;
  };

  renderAll(state);

  const list = document.getElementById("weekendList");
  list.addEventListener("change", (ev) => onListChange(ev, getState(), setState));
  list.addEventListener("input", (ev) => onListChange(ev, getState(), setState));

  setupExportImport(getState, setState);
  setupReset(getState, setState);
}

document.addEventListener("DOMContentLoaded", main);

