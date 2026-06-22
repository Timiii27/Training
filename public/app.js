const sessions = {
  A: {
    title: "Pecho y core sin material · 35 min",
    hint: "La sesión principal: flexiones, variantes de empuje y abdomen. Suelo, control y constancia.",
    exercises: [
      ["Flexiones normales o inclinadas", "3 series", "8-15", "Empieza aquí. Si cuesta, inclínalas."],
      ["Flexiones lentas", "3 series", "6-12", "Tres segundos bajando, empuja fuerte."],
      ["Flexiones cerradas", "3 series", "6-12", "Más tríceps. Si molesta, hazlas inclinadas."],
      ["Flexiones con pausa abajo", "2 series", "6-10", "Pausa de un segundo sin hundirte."],
      ["Dead bug", "2 series", "8-12 / lado", "Core firme antes de correr."],
      ["Plancha frontal", "2 series", "30-45 s", "Respira y no hundas la cadera."],
    ],
  },
  Viaje: {
    title: "Express sin material · 15-20 min",
    hint: "Cuando no tengas tiempo: tres rondas y ya has sumado.",
    exercises: [
      ["Flexiones", "3 rondas", "8-15", "Inclinadas si quieres hacerlo más fácil."],
      ["Flexiones cerradas", "3 rondas", "6-12", "Tríceps rápido."],
      ["Plancha con toque de hombro", "3 rondas", "10-20 toques", "Controla la cadera."],
      ["Dead bug", "3 rondas", "8-12 / lado", "Abdomen limpio."],
    ],
  },
};

const typeLabels = { strength: "Fuerza", cardio: "Cardio", court: "Pista", measure: "Medidas", rest: "Descanso" };
const weeklySchedule = [
  { day: "LUN", label: "Sesión A", detail: "Pecho · core · sin material", session: "A" },
  { day: "MAR", label: "Sesión A", detail: "Repite pecho · core", session: "A" },
  { day: "MIÉ", label: "Bote/Cardio", detail: "20-30 min suave", preset: "Tiro y bote" },
  { day: "JUE", label: "Sesión A", detail: "Repite pecho · core", session: "A" },
  { day: "VIE", label: "Libre", detail: "Bici, bote o descanso" },
  { day: "SÁB", label: "Sesión A", detail: "Pecho · core · sin material", session: "A" },
  { day: "DOM", label: "Descanso", detail: "O paseo suave" },
];
const state = { entries: [], photos: [], activePlan: "A", workout: null, calendarMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1) };
const today = new Date().toISOString().slice(0, 10);
const localDataKey = "summer-body-local-data";
let apiMode = "api";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const completed = (entry) => entry.status === "completed";
const localDate = (date) => new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short" }).format(new Date(`${date}T12:00:00`));
const escapeHtml = (text) => String(text ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
const sessionSets = (exercise) => Number.parseInt(exercise[1], 10) || 3;
const isoLocal = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

function localData() {
  try {
    const data = JSON.parse(localStorage.getItem(localDataKey)) || {};
    return { entries: Array.isArray(data.entries) ? data.entries : [], photos: Array.isArray(data.photos) ? data.photos : [], journalUrl: null };
  } catch {
    return { entries: [], photos: [], journalUrl: null };
  }
}

function saveLocalData() {
  localStorage.setItem(localDataKey, JSON.stringify({ entries: state.entries, photos: state.photos }));
}

function makeEntry(payload) {
  const weight = payload.weight === "" || payload.weight == null ? null : Math.round(Number(payload.weight) * 10) / 10;
  const waist = payload.waist === "" || payload.waist == null ? null : Math.round(Number(payload.waist) * 10) / 10;
  const duration = payload.duration === "" || payload.duration == null ? null : Math.round(Number(payload.duration));
  return {
    id: crypto.randomUUID(),
    date: /^\d{4}-\d{2}-\d{2}$/.test(payload.date || "") ? payload.date : today,
    type: payload.type || "strength",
    status: payload.status || "completed",
    activity: payload.activity || "Sesión libre",
    duration: Number.isFinite(duration) ? duration : null,
    weight: Number.isFinite(weight) ? weight : null,
    waist: Number.isFinite(waist) ? waist : null,
    recoveryOf: /^\d{4}-\d{2}-\d{2}$/.test(payload.recoveryOf || "") ? payload.recoveryOf : null,
    notes: String(payload.notes || "").slice(0, 500),
    createdAt: new Date().toISOString(),
  };
}

function addLocalEntry(payload) {
  const entry = makeEntry(payload);
  state.entries.push(entry);
  saveLocalData();
  return entry;
}

function scheduledForDate(date) {
  return [
    { label: "Descanso", detail: "O paseo suave", type: "rest" },
    { label: "Sesión A", detail: "Pecho · core · sin material", type: "strength", session: "A" },
    { label: "Sesión A", detail: "Repite pecho · core", type: "strength", session: "A" },
    { label: "Bote/Cardio", detail: "20-30 min suave", type: "court", preset: "Tiro y bote" },
    { label: "Sesión A", detail: "Repite pecho · core", type: "strength", session: "A" },
    { label: "Libre", detail: "Bici, bote o descanso", type: "rest" },
    { label: "Sesión A", detail: "Pecho · core · sin material", type: "strength", session: "A" },
  ][date.getDay()];
}

function restSeconds(exercise, index, sessionKey = state.activePlan) {
  const name = exercise[0].toLowerCase();
  if (sessionKey === "Viaje") return 35;
  if (/plancha|dead bug|bird dog|curl|tríceps|elevaciones|gemelos|aperturas/.test(name)) return 45;
  return 60;
}

function exerciseImageSrc(name) {
  const key = name.toLowerCase();
  if (/press de pecho con mancuernas|press de pecho con banda|aperturas/.test(key)) return "/assets/exercises/floor-press.jpg";
  if (/flexiones/.test(key)) return "/assets/exercises/pushup.jpg";
  if (/press de hombro|marcha estática|curl/.test(key)) return "/assets/exercises/shoulder-press.jpg";
  if (/elevaciones laterales|pájaros/.test(key)) return "/assets/exercises/lateral-raise.jpg";
  if (/tríceps|face pull|rotación externa|pallof|y-t-w/.test(key)) return "/assets/exercises/band-face-pull.jpg";
  if (/dead bug|puente de glúteo/.test(key)) return "/assets/exercises/dead-bug.jpg";
  if (/plancha|bird dog/.test(key)) return "/assets/exercises/plank.jpg";
  if (/sentadilla goblet|gemelos/.test(key)) return "/assets/exercises/goblet-squat.jpg";
  if (/sentadilla búlgara|zancada|step-up/.test(key)) return "/assets/exercises/bulgarian-split-squat.jpg";
  if (/peso muerto/.test(key)) return "/assets/exercises/romanian-deadlift.jpg";
  if (/remo/.test(key)) return "/assets/exercises/dumbbell-row.jpg";
  if (/jalón/.test(key)) return "/assets/exercises/band-pulldown.jpg";
  return "/assets/exercises/goblet-squat.jpg";
}

function exercisePhoto(name, eager = false) {
  return `<img src="${exerciseImageSrc(name)}" alt="Referencia visual de ${escapeHtml(name)}" ${eager ? "" : 'loading="lazy"'} />`;
}

function dayDiff(a, b) {
  return Math.round((new Date(`${a}T12:00:00`) - new Date(`${b}T12:00:00`)) / 86400000);
}

function currentWeekEntries() {
  const now = new Date();
  const day = (now.getDay() + 6) % 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - day);
  monday.setHours(0, 0, 0, 0);
  return state.entries.filter((entry) => new Date(`${entry.date}T12:00:00`) >= monday);
}

function calculateStreak() {
  const dates = [...new Set(state.entries.filter((entry) => completed(entry) && entry.type !== "measure").map((entry) => entry.date))].sort().reverse();
  if (!dates.length || dayDiff(today, dates[0]) > 1) return 0;
  let streak = 1;
  for (let index = 1; index < dates.length; index += 1) {
    if (dayDiff(dates[index - 1], dates[index]) === 1) streak += 1;
    else break;
  }
  return streak;
}

function nextSession() {
  return "A";
}

function motivation() {
  const sessionsDone = state.entries.filter((entry) => completed(entry) && entry.type === "strength").length;
  const streak = calculateStreak();
  const weekStrength = currentWeekEntries().filter((entry) => completed(entry) && entry.type === "strength").length;
  if (!sessionsDone) return "Nuevo bloque: 30 minutos, sin drama. Empieza por la sesión A y deja que la constancia haga el resto.";
  if (weekStrength >= 4) return "Semana cerrada. Repetir la misma sesión bien hecha pesa más que una paliza aislada.";
  if (streak >= 3) return `${streak} días seguidos sumando. El físico se construye con días normales bien hechos.`;
  if (weekStrength === 3) return "Te queda una sesión de pecho y abdomen para cerrar la semana fuerte.";
  return "Hoy no necesitas una sesión perfecta. Necesitas 30 minutos honestos.";
}

function showView(name) {
  $$(".view").forEach((view) => view.classList.toggle("is-visible", view.dataset.view === name));
  $$("[data-view-link]").forEach((button) => button.classList.toggle("is-active", button.dataset.viewLink === name));
  window.scrollTo({ top: 0, behavior: "instant" });
  if (name === "dashboard") $(".hero").scrollTop = 0;
}

function toast(message) {
  const element = $("#toast");
  element.textContent = message;
  element.classList.add("is-visible");
  clearTimeout(toast.timeout);
  toast.timeout = setTimeout(() => element.classList.remove("is-visible"), 3200);
}

function renderDashboard() {
  const done = state.entries.filter(completed);
  const strengthWeek = currentWeekEntries().filter((entry) => completed(entry) && entry.type === "strength");
  const cardioWeek = currentWeekEntries().filter((entry) => completed(entry) && ["cardio", "court"].includes(entry.type));
  const upcoming = nextSession();
  $("#next-session").textContent = upcoming;
  $("#next-session-name").textContent = sessions[upcoming].title;
  $("#checkin-next-session").textContent = upcoming;
  $("#motivation-copy").textContent = motivation();
  $("#today-label").textContent = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long" }).format(new Date()).toUpperCase();
  $("#metric-sessions").textContent = done.filter((entry) => entry.type === "strength").length;
  $("#metric-minutes").textContent = done.reduce((sum, entry) => sum + (entry.duration || 0), 0);
  $("#metric-streak").textContent = calculateStreak();
  $("#metric-week").textContent = strengthWeek.length;
  $("#weekly-message").textContent = strengthWeek.length >= 4 ? "Semana base cumplida." : `Llevas ${strengthWeek.length} de 4 sesiones base.`;
  $("#week-progress").innerHTML = [
    ...Array.from({ length: 4 }, (_, index) => `<div class="progress-row ${index < strengthWeek.length ? "done" : ""}"><i></i><span>Pecho/core ${index + 1}</span></div>`),
    ...Array.from({ length: 2 }, (_, index) => `<div class="progress-row ${index < cardioWeek.length ? "done" : ""}"><i></i><span>Bote/cardio opcional ${index + 1}</span></div>`),
  ].join("");
  const recent = [...state.entries].sort((a, b) => `${b.date}${b.createdAt}`.localeCompare(`${a.date}${a.createdAt}`)).slice(0, 5);
  $("#recent-list").innerHTML = recent.length
    ? recent.map((entry) => `<article class="timeline-item">
        <span class="timeline-date">${localDate(entry.date)}</span>
        <span class="timeline-badge">${escapeHtml(entry.activity.slice(0, 1))}</span>
        <div><strong>${escapeHtml(entry.activity)}</strong><span class="timeline-meta">${escapeHtml(typeLabels[entry.type])} · ${escapeHtml(entry.status)}</span></div>
        <span class="timeline-meta">${entry.duration ? `${entry.duration} min` : ""}</span>
      </article>`).join("")
    : `<div class="empty-state">Todavía no hay registros. Tu primera sesión será la referencia que haga crecer este panel.</div>`;
}

function renderCalendar() {
  const todayIndex = (new Date().getDay() + 6) % 7;
  $("#weekly-calendar").innerHTML = weeklySchedule.map((item, index) => `<article class="calendar-day ${index === todayIndex ? "is-today" : ""}">
    <small>${item.day}${index === todayIndex ? " · HOY" : ""}</small>
    <strong>${item.label}</strong>
    <p>${item.detail}</p>
    ${item.session ? `<button data-start-session="${item.session}">Comenzar →</button>` : item.preset ? `<button data-log-preset="${item.preset}">Registrar →</button>` : ""}
  </article>`).join("");
}

function monthCellState(date, inMonth) {
  const iso = isoLocal(date);
  const scheduled = scheduledForDate(date);
  const entries = state.entries.filter((entry) => entry.date === iso);
  const recoveredEntry = state.entries.find((entry) => entry.recoveryOf === iso && completed(entry));
  const completedEntry = entries.find((entry) => completed(entry) && entry.type !== "measure");
  const partialEntry = entries.find((entry) => entry.status === "partial");
  const isPast = iso < today;
  if (!inMonth) return { status: "rest", label: scheduled.label, detail: scheduled.detail };
  if (recoveredEntry) return { status: "recovered", label: scheduled.label, detail: `Recuperado el ${localDate(recoveredEntry.date)}` };
  if (completedEntry) return { status: "done", label: completedEntry.activity, detail: completedEntry.recoveryOf ? `Recuperó ${localDate(completedEntry.recoveryOf)}` : `${completedEntry.duration || "✓"}${completedEntry.duration ? " min" : ""}` };
  if (partialEntry) return { status: "partial", label: partialEntry.activity, detail: `Parcial · ${partialEntry.duration || 0} min`, session: scheduled.session };
  if (scheduled.type === "rest") return { status: "rest", label: scheduled.label, detail: scheduled.detail };
  if (isPast) return { status: "missed", label: scheduled.label, detail: "Sin completar", session: scheduled.session, preset: scheduled.preset };
  return { status: "planned", label: scheduled.label, detail: iso === today ? "Toca hoy" : "Planificado", session: scheduled.session, preset: scheduled.preset };
}

function renderMonth() {
  const month = state.calendarMonth;
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  $("#month-title").textContent = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" }).format(month);
  const first = new Date(year, monthIndex, 1);
  const start = new Date(year, monthIndex, 1 - ((first.getDay() + 6) % 7));
  const cells = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const inMonth = date.getMonth() === monthIndex;
    return { date, inMonth, data: monthCellState(date, inMonth) };
  });
  const inMonthCells = cells.filter((cell) => cell.inMonth);
  const summary = {
    done: inMonthCells.filter((cell) => cell.data.status === "done").length,
    recovered: inMonthCells.filter((cell) => cell.data.status === "recovered").length,
    missed: inMonthCells.filter((cell) => cell.data.status === "missed").length,
    planned: inMonthCells.filter((cell) => cell.data.status === "planned").length,
  };
  $("#month-summary").innerHTML = [
    ["HECHOS", summary.done],
    ["RECUPERADOS", summary.recovered],
    ["FALLADOS", summary.missed],
    ["PENDIENTES", summary.planned],
  ].map(([label, value]) => `<article><small>${label}</small><strong>${value}</strong></article>`).join("");
  const weekdays = ["L", "M", "X", "J", "V", "S", "D"].map((day) => `<div class="month-weekday">${day}</div>`).join("");
  $("#month-grid").innerHTML = weekdays + cells.map(({ date, inMonth, data }) => {
    const iso = isoLocal(date);
    const action = data.session
      ? `<button class="month-cell-action" data-${data.status === "missed" || data.status === "partial" ? "recover" : "start"}-session="${data.session}" ${data.status === "missed" || data.status === "partial" ? `data-recovery-date="${iso}"` : ""}>${data.status === "missed" || data.status === "partial" ? "Recuperar →" : "Comenzar →"}</button>`
      : data.preset ? `<button class="month-cell-action" data-log-preset="${data.preset}">Registrar →</button>` : "";
    return `<article class="month-cell status-${data.status} ${inMonth ? "" : "is-outside"} ${iso === today ? "is-today" : ""}">
      <div class="month-date"><span>${date.getDate()}</span><i></i></div>
      <strong>${escapeHtml(data.label)}</strong><p>${escapeHtml(data.detail)}</p>${inMonth ? action : ""}
    </article>`;
  }).join("");
}

function renderHistory() {
  const rows = [...state.entries].sort((a, b) => `${b.date}${b.createdAt}`.localeCompare(`${a.date}${a.createdAt}`));
  $("#history-body").innerHTML = rows.length
    ? rows.map((entry) => `<tr>
        <td>${localDate(entry.date)}</td><td>${escapeHtml(typeLabels[entry.type])}</td><td><strong>${escapeHtml(entry.activity)}</strong></td>
        <td>${entry.duration ?? "—"}</td><td>${entry.weight ? `${entry.weight} kg` : ""}${entry.weight && entry.waist ? " · " : ""}${entry.waist ? `${entry.waist} cm` : "—"}</td>
        <td><button class="delete-action" data-delete-entry="${entry.id}">Borrar</button></td>
      </tr>`).join("")
    : `<tr><td colspan="6">Todavía no hay registros.</td></tr>`;
}

function renderChart() {
  const measures = [...state.entries].filter((entry) => entry.weight || entry.waist).sort((a, b) => a.date.localeCompare(b.date));
  const target = $("#progress-chart");
  if (!measures.length) {
    target.innerHTML = `<div class="chart-empty">Añade peso o cintura en tu primer registro semanal para estrenar el gráfico.</div>`;
    return;
  }
  const width = 980, height = 290, pad = { l: 45, r: 30, t: 20, b: 45 };
  const values = measures.flatMap((item) => [item.weight, item.waist]).filter(Boolean);
  let min = Math.floor(Math.min(...values) - 3), max = Math.ceil(Math.max(...values) + 3);
  if (min === max) max += 1;
  const x = (index) => pad.l + (measures.length === 1 ? (width - pad.l - pad.r) / 2 : index * (width - pad.l - pad.r) / (measures.length - 1));
  const y = (value) => pad.t + (max - value) * (height - pad.t - pad.b) / (max - min);
  const points = (key) => measures.map((item, index) => item[key] ? `${x(index)},${y(item[key])}` : null).filter(Boolean).join(" ");
  const horizontal = Array.from({ length: 5 }, (_, index) => {
    const value = Math.round((min + ((max - min) * index / 4)) * 10) / 10;
    const py = y(value);
    return `<line x1="${pad.l}" x2="${width - pad.r}" y1="${py}" y2="${py}" stroke="rgba(17,24,23,.12)"/><text x="0" y="${py + 4}" fill="#64706c" font-size="11">${value}</text>`;
  }).join("");
  const labels = measures.map((item, index) => `<text x="${x(index)}" y="${height - 12}" text-anchor="middle" fill="#64706c" font-size="11">${localDate(item.date)}</text>`).join("");
  target.innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Gráfico de peso y cintura">
    ${horizontal}${labels}
    ${points("weight") ? `<polyline fill="none" stroke="#779b22" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" points="${points("weight")}"/>` : ""}
    ${points("waist") ? `<polyline fill="none" stroke="#e2a95c" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" points="${points("waist")}"/>` : ""}
    ${measures.map((item, index) => `${item.weight ? `<circle cx="${x(index)}" cy="${y(item.weight)}" r="5" fill="#779b22"/>` : ""}${item.waist ? `<circle cx="${x(index)}" cy="${y(item.waist)}" r="5" fill="#e2a95c"/>` : ""}`).join("")}
  </svg>`;
}

function renderPlan() {
  $("#plan-toolbar").innerHTML = ["A", "Viaje"].map((key) => `<button class="${state.activePlan === key ? "is-active" : ""}" data-plan="${key}">${key === "Viaje" ? "Express · 15 min" : "Sesión diaria"}</button>`).join("");
  const session = sessions[state.activePlan];
  $("#plan-content").innerHTML = `<div class="plan-header"><strong class="plan-code">${state.activePlan === "Viaje" ? "V" : state.activePlan}</strong><div><h2>${session.title}</h2><p>${session.hint}</p></div><button class="primary-action plan-start" data-start-session="${state.activePlan}">Comenzar entreno <span>▶</span></button></div>
    <div class="exercise-list">${session.exercises.map((exercise, index) => `<article class="exercise-row"><div class="exercise-visual">${exercisePhoto(exercise[0])}</div><strong>${exercise[0]}</strong><span>${exercise[1]}</span><span>${exercise[2]}</span><span>${restSeconds(exercise, index)} s descanso</span><small>${exercise[3]}</small></article>`).join("")}</div>`;
}

function renderPhotos() {
  const photos = [...state.photos].sort((a, b) => `${b.date}${b.createdAt}`.localeCompare(`${a.date}${a.createdAt}`));
  $("#photo-grid").innerHTML = photos.length
    ? photos.map((photo) => `<article class="photo-card"><img src="${photo.url}" alt="Foto de progreso del ${escapeHtml(photo.date)}" onerror="this.hidden=true;this.nextElementSibling.hidden=false" /><div class="photo-fallback" hidden>Foto guardada.<br />Este navegador no puede previsualizar su formato.</div><button class="delete-action" data-delete-photo="${photo.id}">Borrar</button><div class="photo-meta"><strong>${localDate(photo.date)}</strong><span>${escapeHtml(photo.note || "Foto de progreso")}</span></div></article>`).join("")
    : `<div class="empty-state">No has subido ninguna foto. Una referencia cada 2-4 semanas suele ser más útil que mirarse cada día.</div>`;
}

function render() {
  renderDashboard();
  renderCalendar();
  renderMonth();
  renderHistory();
  renderChart();
  renderPlan();
  renderPhotos();
}

function formatTimer(seconds) {
  const safe = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

function persistWorkout() {
  if (state.workout) localStorage.setItem("summer-hoops-workout", JSON.stringify(state.workout));
  else localStorage.removeItem("summer-hoops-workout");
}

function workoutExercise() {
  return sessions[state.workout.sessionKey].exercises[state.workout.exerciseIndex];
}

function renderWorkout() {
  const overlay = $("#workout-overlay");
  if (!state.workout) { overlay.classList.remove("is-visible"); return; }
  const session = sessions[state.workout.sessionKey];
  const exercise = workoutExercise();
  const index = state.workout.exerciseIndex;
  const doneSets = state.workout.completedSets[index] || 0;
  const totalSets = sessionSets(exercise);
  const rest = restSeconds(exercise, index, state.workout.sessionKey);
  overlay.classList.add("is-visible");
  $("#workout-session-label").textContent = `SESIÓN ${state.workout.sessionKey === "Viaje" ? "EXPRESS" : state.workout.sessionKey}`;
  $("#workout-position").textContent = `${index + 1} / ${session.exercises.length}`;
  $("#workout-progress-bar").style.width = `${((index + 1) / session.exercises.length) * 100}%`;
  $("#workout-series-label").textContent = `${state.workout.recoveryOf ? `RECUPERACIÓN ${localDate(state.workout.recoveryOf)} · ` : ""}EJERCICIO ${index + 1} · SERIE ${Math.min(doneSets + 1, totalSets)} DE ${totalSets}`;
  $("#workout-exercise-name").textContent = exercise[0];
  $("#workout-cue").textContent = exercise[3];
  $("#workout-sets").textContent = totalSets;
  $("#workout-reps").textContent = exercise[2];
  $("#workout-rest").textContent = `${rest} s`;
  $("#workout-art").innerHTML = exercisePhoto(exercise[0], true);
  $("#set-dots").innerHTML = Array.from({ length: totalSets }, (_, dot) => `<i class="${dot < doneSets ? "done" : ""}">${dot < doneSets ? "✓" : dot + 1}</i>`).join("");
  const completeButton = $("[data-complete-set]");
  completeButton.disabled = doneSets >= totalSets;
  completeButton.innerHTML = doneSets >= totalSets ? `Series completas <span>✓</span>` : `Serie hecha <span>✓</span>`;
  $("[data-next-exercise]").textContent = index === session.exercises.length - 1 ? "Terminar entreno →" : "Siguiente ejercicio →";
  tickWorkout();
}

function tickWorkout() {
  if (!state.workout) return;
  $("#workout-elapsed").textContent = formatTimer((Date.now() - state.workout.startedAt) / 1000);
  const restZone = $("#rest-zone");
  if (state.workout.restEndsAt) {
    const remaining = Math.max(0, (state.workout.restEndsAt - Date.now()) / 1000);
    restZone.classList.add("is-visible");
    $("#rest-countdown").textContent = formatTimer(remaining);
    $("#workout-footer-copy").textContent = remaining > 0 ? "Respira. Recupera. La siguiente serie también cuenta." : "Descanso terminado. Cuando estés listo, vuelve a sumar.";
  } else {
    restZone.classList.remove("is-visible");
    $("#workout-footer-copy").textContent = "Técnica limpia. Sin prisa.";
  }
}

function startWorkout(sessionKey, recoveryOf = null) {
  if (!sessions[sessionKey]) return;
  if (state.workout && (state.workout.sessionKey !== sessionKey || state.workout.recoveryOf !== recoveryOf) && !confirm("Ya hay un entrenamiento en curso. ¿Sustituirlo por esta sesión?")) return;
  if (!state.workout || state.workout.sessionKey !== sessionKey || state.workout.recoveryOf !== recoveryOf) {
    state.workout = {
      sessionKey,
      recoveryOf,
      exerciseIndex: 0,
      completedSets: Array(sessions[sessionKey].exercises.length).fill(0),
      startedAt: Date.now(),
      restEndsAt: null,
    };
    persistWorkout();
  }
  renderWorkout();
}

function completeWorkoutSet() {
  if (!state.workout) return;
  const exercise = workoutExercise();
  const index = state.workout.exerciseIndex;
  const total = sessionSets(exercise);
  if (state.workout.completedSets[index] >= total) return;
  state.workout.completedSets[index] += 1;
  state.workout.restEndsAt = Date.now() + restSeconds(exercise, index, state.workout.sessionKey) * 1000;
  persistWorkout();
  renderWorkout();
}

function nextWorkoutExercise() {
  if (!state.workout) return;
  const finalExercise = state.workout.exerciseIndex === sessions[state.workout.sessionKey].exercises.length - 1;
  if (finalExercise) finishWorkout().catch((error) => toast(error.message));
  else {
    state.workout.exerciseIndex += 1;
    state.workout.restEndsAt = null;
    persistWorkout();
    renderWorkout();
  }
}

async function finishWorkout() {
  if (!state.workout) return;
  const workout = state.workout;
  const exercises = sessions[workout.sessionKey].exercises;
  const expectedSets = exercises.reduce((sum, exercise) => sum + sessionSets(exercise), 0);
  const completedSets = workout.completedSets.reduce((sum, value) => sum + value, 0);
  const duration = Math.max(1, Math.round((Date.now() - workout.startedAt) / 60000));
  const status = completedSets >= expectedSets ? "completed" : "partial";
  const payload = { date: today, type: "strength", status, activity: workout.sessionKey, duration, recoveryOf: workout.recoveryOf, notes: `Entreno guiado${workout.recoveryOf ? ` · recuperación del ${workout.recoveryOf}` : ""} · ${completedSets}/${expectedSets} series registradas.` };
  if (apiMode === "api") {
    const response = await fetch("/api/entries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!response.ok) throw new Error((await response.json()).error);
  } else {
    addLocalEntry(payload);
  }
  state.workout = null;
  persistWorkout();
  renderWorkout();
  if (apiMode === "api") await reloadState();
  else render();
  showView("dashboard");
  toast(status === "completed" ? "Entreno completado. Hoy has sumado de verdad." : "Entreno parcial guardado. Cada serie cuenta.");
}

function logPreset(activity) {
  showView("log");
  const type = activity === "Bici cómoda" ? "cardio" : "court";
  $("#entry-type").value = type;
  $("#entry-activity").value = activity;
}

async function reloadState() {
  try {
    const response = await fetch("/api/state");
    if (!response.ok) throw new Error("API no disponible");
    Object.assign(state, await response.json());
    apiMode = "api";
    $(".journal-link").hidden = false;
  } catch {
    Object.assign(state, localData());
    apiMode = "local";
    $(".journal-link").hidden = true;
    if (!reloadState.warned) {
      toast("Modo Vercel temporal: datos guardados en este navegador hasta conectar Supabase.");
      reloadState.warned = true;
    }
  }
  render();
}

async function saveEntry(form) {
  const payload = Object.fromEntries(new FormData(form));
  if (apiMode === "api") {
    const response = await fetch("/api/entries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!response.ok) throw new Error((await response.json()).error);
  } else {
    addLocalEntry(payload);
  }
  form.reset();
  $("#entry-date").value = today;
  if (apiMode === "api") await reloadState();
  else render();
  showView("dashboard");
  toast("Registro guardado. Hoy ya cuenta.");
}

function fileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const extension = file.name.split(".").pop()?.toLowerCase();
      const fallbackType = { heic: "image/heic", heif: "image/heif" }[extension];
      resolve(fallbackType ? String(reader.result).replace(/^data:[^;]*/, `data:${fallbackType}`) : reader.result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function uploadPhoto(file, date, note) {
  const dataUrl = await fileAsDataUrl(file);
  if (apiMode === "api") {
    const response = await fetch("/api/photos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date, note, dataUrl }) });
    if (!response.ok) throw new Error((await response.json()).error);
    return;
  }
  state.photos.push({
    id: crypto.randomUUID(),
    date,
    filename: file.name,
    url: dataUrl,
    note: String(note || "").slice(0, 180),
    createdAt: new Date().toISOString(),
  });
  saveLocalData();
}

async function saveCheckin(form) {
  const data = new FormData(form);
  const photos = data.getAll("photos").filter((photo) => photo.size);
  const hasMeasures = data.get("weight") || data.get("waist");
  if (!hasMeasures && photos.length === 0) throw new Error("Añade peso, cintura o al menos una foto.");

  if (hasMeasures) {
    const payload = { date: data.get("date"), type: "measure", status: "completed", activity: "Medidas semanales", weight: data.get("weight"), waist: data.get("waist"), notes: data.get("note") };
    if (apiMode === "api") {
      const response = await fetch("/api/entries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error((await response.json()).error);
    } else {
      addLocalEntry(payload);
    }
  }

  for (const photo of photos) await uploadPhoto(photo, data.get("date"), data.get("note"));
  form.reset();
  $("#checkin-date").value = today;
  if (apiMode === "api") await reloadState();
  else render();
  toast("Revisión previa guardada. El entreno todavía está pendiente.");
}

document.addEventListener("click", async (event) => {
  const viewLink = event.target.closest("[data-view-link]");
  if (viewLink) showView(viewLink.dataset.viewLink);
  const startNext = event.target.closest("[data-start-next]");
  if (startNext) startWorkout(nextSession());
  const startSession = event.target.closest("[data-start-session]");
  if (startSession) startWorkout(startSession.dataset.startSession);
  const recoverSession = event.target.closest("[data-recover-session]");
  if (recoverSession) startWorkout(recoverSession.dataset.recoverSession, recoverSession.dataset.recoveryDate);
  const preset = event.target.closest("[data-log-preset]");
  if (preset) logPreset(preset.dataset.logPreset);
  const monthOffset = event.target.closest("[data-month-offset]");
  if (monthOffset) {
    state.calendarMonth = new Date(state.calendarMonth.getFullYear(), state.calendarMonth.getMonth() + Number(monthOffset.dataset.monthOffset), 1);
    renderMonth();
  }
  const plan = event.target.closest("[data-plan]");
  if (plan) { state.activePlan = plan.dataset.plan; renderPlan(); }
  if (event.target.closest("[data-complete-set]")) completeWorkoutSet();
  if (event.target.closest("[data-next-exercise]")) nextWorkoutExercise();
  if (event.target.closest("[data-add-rest]") && state.workout) {
    state.workout.restEndsAt = Math.max(Date.now(), state.workout.restEndsAt || Date.now()) + 30000;
    persistWorkout(); tickWorkout();
  }
  if (event.target.closest("[data-skip-rest]") && state.workout) {
    state.workout.restEndsAt = null; persistWorkout(); tickWorkout();
  }
  if (event.target.closest("[data-finish-workout]")) finishWorkout().catch((error) => toast(error.message));
  if (event.target.closest("[data-abandon-workout]") && state.workout && confirm("¿Cerrar el entrenamiento sin guardar?")) {
    state.workout = null; persistWorkout(); renderWorkout(); toast("Entrenamiento cerrado sin guardar.");
  }
  const entryDelete = event.target.closest("[data-delete-entry]");
  if (entryDelete && confirm("¿Borrar este registro?")) {
    if (apiMode === "api") {
      await fetch(`/api/entries/${entryDelete.dataset.deleteEntry}`, { method: "DELETE" });
      await reloadState();
    } else {
      state.entries = state.entries.filter((entry) => entry.id !== entryDelete.dataset.deleteEntry);
      saveLocalData();
      render();
    }
    toast("Registro borrado.");
  }
  const photoDelete = event.target.closest("[data-delete-photo]");
  if (photoDelete && confirm("¿Borrar esta foto local?")) {
    if (apiMode === "api") {
      await fetch(`/api/photos/${photoDelete.dataset.deletePhoto}`, { method: "DELETE" });
      await reloadState();
    } else {
      state.photos = state.photos.filter((photo) => photo.id !== photoDelete.dataset.deletePhoto);
      saveLocalData();
      render();
    }
    toast("Foto borrada.");
  }
});

$("#entry-type").addEventListener("change", (event) => {
  const defaults = { strength: "A", cardio: "Bici cómoda", court: "Tiro y bote", rest: "Descanso" };
  $("#entry-activity").value = defaults[event.target.value];
});
$("#entry-form").addEventListener("submit", (event) => { event.preventDefault(); saveEntry(event.target).catch((error) => toast(error.message)); });
$("#checkin-form").addEventListener("submit", (event) => { event.preventDefault(); saveCheckin(event.target).catch((error) => toast(error.message)); });
$("#entry-date").value = today;
$("#checkin-date").value = today;
if (new URLSearchParams(window.location.search).has("clearWorkout")) {
  localStorage.removeItem("summer-hoops-workout");
  history.replaceState({}, "", "/");
}
try { state.workout = JSON.parse(localStorage.getItem("summer-hoops-workout")) || null; } catch { state.workout = null; }
setInterval(tickWorkout, 1000);
reloadState().then(renderWorkout).catch(() => toast("No se pudo cargar el historial."));
