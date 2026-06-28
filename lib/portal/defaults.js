const EXERCISE_IMAGE_BASE = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises";

function exerciseImage(path) {
  return `${EXERCISE_IMAGE_BASE}/${path}`;
}

// La base free-exercise-db guarda dos fotogramas por ejercicio (0.jpg inicio,
// 1.jpg fin). Devolvemos ambos para poder animar el movimiento y que se entienda.
function exerciseFrames(folder) {
  return [exerciseImage(`${folder}/0.jpg`), exerciseImage(`${folder}/1.jpg`)];
}

export const ACTIVE_WORKOUT_KEY = "daily-wellbeing-active-workout";
export const THEME_STORAGE_KEY = "daily-wellbeing-theme-mode";

export const themeModeOptions = [
  { key: "auto", label: "Automatico" },
  { key: "light", label: "Claro" },
  { key: "dark", label: "Oscuro" },
];

export const defaultProfile = {
  primary_goal: "Cuidar mi rutina diaria",
  theme_key: "calm",
  portal_config: {
    focus: "bienestar diario",
    showTraining: true,
    showProgress: true,
  },
};

export const themeOptions = [
  { key: "calm", label: "Calma", swatch: "#5f8f75" },
  { key: "sea", label: "Azul suave", swatch: "#527f91" },
  { key: "stone", label: "Piedra", swatch: "#7b7569" },
];

export const achievementCatalog = [
  {
    key: "first_step",
    title: "Primer paso",
    description: "Completa cualquier habito por primera vez.",
    icon: "spark",
    tone: "gold",
    target: 1,
  },
  {
    key: "three_day_streak",
    title: "Tres dias",
    description: "Mantiene una racha global de 3 dias.",
    icon: "flame",
    tone: "coral",
    target: 3,
  },
  {
    key: "seven_day_streak",
    title: "Semana viva",
    description: "Mantiene una racha global de 7 dias.",
    icon: "bolt",
    tone: "green",
    target: 7,
  },
  {
    key: "fourteen_day_streak",
    title: "Ritmo serio",
    description: "Mantiene una racha global de 14 dias.",
    icon: "crest",
    tone: "blue",
    target: 14,
  },
  {
    key: "thirty_day_streak",
    title: "Mes de base",
    description: "Mantiene una racha global de 30 dias.",
    icon: "crown",
    tone: "violet",
    target: 30,
  },
  {
    key: "perfect_day",
    title: "Dia redondo",
    description: "Completa todos los habitos previstos de un dia.",
    icon: "ring",
    tone: "green",
    target: 1,
  },
  {
    key: "perfect_week",
    title: "Semana fuerte",
    description: "Completa al menos 5 dias redondos en 7 dias.",
    icon: "stack",
    tone: "gold",
    target: 5,
  },
  {
    key: "training_started",
    title: "Entreno abierto",
    description: "Guarda tu primer entrenamiento.",
    icon: "peak",
    tone: "coral",
    target: 1,
  },
  {
    key: "body_check",
    title: "Dato honesto",
    description: "Guarda tu primer check-in corporal.",
    icon: "pulse",
    tone: "blue",
    target: 1,
  },
  {
    key: "visual_reference",
    title: "Referencia visual",
    description: "Sube tu primera foto de progreso.",
    icon: "lens",
    tone: "violet",
    target: 1,
  },
  {
    key: "balanced_day",
    title: "Dia equilibrado",
    description: "Completa habitos de 3 categorias distintas el mismo dia.",
    icon: "triad",
    tone: "green",
    target: 3,
  },
];

export const categoryOptions = [
  "Salud",
  "Movimiento",
  "Nutricion",
  "Entreno",
  "Descanso",
  "Mente",
  "Personal",
];

export const colorOptions = [
  { key: "sage", label: "Salvia" },
  { key: "sea", label: "Azul" },
  { key: "amber", label: "Ambar" },
  { key: "rose", label: "Rosa" },
  { key: "stone", label: "Piedra" },
];

export const weekdayOptions = [
  { value: 1, label: "L" },
  { value: 2, label: "M" },
  { value: 3, label: "X" },
  { value: 4, label: "J" },
  { value: 5, label: "V" },
  { value: 6, label: "S" },
  { value: 7, label: "D" },
];

export const defaultHabitSeeds = [
  { title: "Lavarse los dientes", category: "Salud", color_key: "sea", sort_order: 10 },
  { title: "Tomar creatina", category: "Nutricion", color_key: "sage", target_unit: "dosis", sort_order: 20 },
  { title: "Beber agua", category: "Salud", color_key: "sea", target_count: 2, target_unit: "L", sort_order: 30 },
  { title: "Dar un paseo", category: "Movimiento", color_key: "sage", target_count: 20, target_unit: "min", sort_order: 40 },
  { title: "Entrenar", category: "Entreno", color_key: "amber", frequency_type: "weekly", days_of_week: [1, 3, 5], sort_order: 50 },
  { title: "Comer bien", category: "Nutricion", color_key: "stone", sort_order: 60 },
  { title: "Dormir suficiente", category: "Descanso", color_key: "rose", target_count: 7, target_unit: "h", sort_order: 70 },
];

export const fallbackWorkoutPlan = {
  title: "Torso V + core",
  duration: "30-40 min",
  promise: "Sesion de fuerza para pecho, hombro, espalda alta y core, sin convertir el dia entero en gimnasio.",
  exercises: [
    {
      name: "Flexiones normales o inclinadas",
      sets: 4,
      reps: "8-15",
      rest: 60,
      frames: exerciseFrames("Pushups"),
      referenceUrl: "https://github.com/yuhonas/free-exercise-db/tree/main/exercises/Pushups",
      cue: "Cuerpo firme, pecho al suelo o al apoyo, empuja sin perder la linea.",
    },
    {
      name: "Press en suelo con mochila",
      sets: 3,
      reps: "10-15",
      rest: 60,
      frames: exerciseFrames("Dumbbell_Floor_Press"),
      referenceUrl: "https://github.com/yuhonas/free-exercise-db/tree/main/exercises/Dumbbell_Floor_Press",
      cue: "Mochila pegada al pecho o mancuernas si tienes. Si no hay peso, usa una pausa abajo.",
    },
    {
      name: "Remo invertido o remo con sabana",
      sets: 4,
      reps: "8-12",
      rest: 75,
      frames: exerciseFrames("Inverted_Row"),
      referenceUrl: "https://github.com/yuhonas/free-exercise-db/tree/main/exercises/Inverted_Row",
      cue: "Espalda alta y dorsales. Si no puedes, cambia por remo con banda o mochila.",
    },
    {
      name: "Band pull-apart o Y-T-W",
      sets: 3,
      reps: "15-25",
      rest: 45,
      frames: exerciseFrames("Band_Pull_Apart"),
      referenceUrl: "https://github.com/yuhonas/free-exercise-db/tree/main/exercises/Band_Pull_Apart",
      cue: "Hombro posterior y postura. Repeticiones limpias, sin prisa.",
    },
    {
      name: "Flexiones cerradas",
      sets: 2,
      reps: "6-12",
      rest: 75,
      frames: exerciseFrames("Pushups_Close_and_Wide_Hand_Positions"),
      referenceUrl: "https://github.com/yuhonas/free-exercise-db/tree/main/exercises/Pushups_Close_and_Wide_Hand_Positions",
      cue: "Triceps y pecho. Si el hombro protesta, abre un poco las manos o hazlas inclinadas.",
    },
    {
      name: "Dead bug controlado",
      sets: 3,
      reps: "8-12 / lado",
      rest: 45,
      frames: exerciseFrames("Dead_Bug"),
      referenceUrl: "https://github.com/yuhonas/free-exercise-db/tree/main/exercises/Dead_Bug",
      cue: "Zona lumbar pegada al suelo. Reduce recorrido si se arquea.",
    },
    {
      name: "Plancha con toque de hombro",
      sets: 3,
      reps: "10-20 toques",
      rest: 45,
      frames: exerciseFrames("Plank"),
      referenceUrl: "https://github.com/yuhonas/free-exercise-db/tree/main/exercises/Plank",
      cue: "Cadera quieta. Lento y estable vale mas que rapido.",
    },
    {
      name: "Plancha lateral",
      sets: 2,
      reps: "25-45 s / lado",
      rest: 45,
      frames: exerciseFrames("Side_Bridge"),
      referenceUrl: "https://github.com/yuhonas/free-exercise-db/tree/main/exercises/Side_Bridge",
      cue: "Cadera alta. Mejor corta y limpia que larga y torcida.",
    },
  ],
};

export const quickPlan = [
  "3 rondas de flexiones 8-15",
  "3 rondas de dead bug 10/lado",
  "2 rondas de plancha 40 s",
  "Cerrar con paseo suave si queda energia",
];

export function localIso(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function formatShortDate(date) {
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short" }).format(new Date(`${date}T12:00:00`));
}

export function monthLabel(date) {
  return new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" }).format(date);
}

export function secondsLabel(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function displayNameFromSession(session) {
  const metadataName = session?.user?.user_metadata?.full_name || session?.user?.user_metadata?.name;
  const raw = metadataName || session?.user?.email?.split("@")[0] || "Usuario";
  const cleaned = raw.replace(/[._-]+/g, " ").replace(/\d+/g, "").trim() || "Usuario";
  return cleaned
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function firstTrackingDate(workouts, measurements, photos, habitLogs = []) {
  const dates = [...workouts, ...measurements, ...photos, ...habitLogs].map((item) => item.date).filter(Boolean).sort();
  return dates[0] || localIso();
}

export function getMonthDays(anchor) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const startOffset = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - startOffset);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

export function weekdayNumber(dateIso = localIso()) {
  const day = new Date(`${dateIso}T12:00:00`).getDay();
  return day === 0 ? 7 : day;
}

export function isHabitDueOn(habit, dateIso = localIso()) {
  if (!habit?.is_active) return false;
  if (habit.frequency_type !== "weekly") return true;
  const days = Array.isArray(habit.days_of_week) ? habit.days_of_week : [];
  return days.includes(weekdayNumber(dateIso));
}

export function dueHabitsForDate(habits, dateIso = localIso()) {
  return habits.filter((habit) => isHabitDueOn(habit, dateIso)).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
}

export function logKey(habitId, date = localIso()) {
  return `${habitId}:${date}`;
}

export function countCompletedSets(completedSets) {
  return Object.values(completedSets || {}).reduce((sum, count) => sum + count, 0);
}

export function restLeftFor(workout, now = Date.now()) {
  if (!workout?.restEndsAt) return 0;
  return Math.max(0, Math.ceil((workout.restEndsAt - now) / 1000));
}

export function workoutElapsedFor(workout, now = Date.now()) {
  if (!workout?.startedAt) return 0;
  return Math.max(0, Math.floor((now - workout.startedAt) / 1000));
}

// Devuelve siempre una lista de fotogramas para un ejercicio, tolerando
// rutinas antiguas con un unico `image`.
export function framesFor(exercise) {
  if (Array.isArray(exercise?.frames) && exercise.frames.length) return exercise.frames;
  if (exercise?.image) return [exercise.image];
  return ["/assets/exercises/pushup.jpg"];
}

// Ultimo entreno guardado de la misma rutina, como referencia de "ultima vez".
export function lastWorkoutForRoutine(workouts = [], title) {
  if (!title) return null;
  return workouts.find((item) => item.activity === title) || null;
}

export function streakForDates(dateItems) {
  const dates = [...new Set(dateItems.map((item) => item.date).filter(Boolean))].sort().reverse();
  if (!dates.length) return 0;
  const today = localIso();
  const latestDiff = Math.round((new Date(`${today}T12:00:00`) - new Date(`${dates[0]}T12:00:00`)) / 86400000);
  if (latestDiff > 1) return 0;

  let streak = 1;
  for (let index = 1; index < dates.length; index += 1) {
    const diff = Math.round((new Date(`${dates[index - 1]}T12:00:00`) - new Date(`${dates[index]}T12:00:00`)) / 86400000);
    if (diff === 1) streak += 1;
    else break;
  }
  return streak;
}

export function getGlobalStreak(habitLogs = [], workouts = []) {
  return streakForDates([...habitLogs, ...workouts.filter((item) => item.status === "completed")]);
}

export function getLongestStreak(habitLogs = [], workouts = []) {
  const dates = [...new Set([...habitLogs, ...workouts.filter((item) => item.status === "completed")].map((item) => item.date).filter(Boolean))].sort();
  if (!dates.length) return 0;

  let best = 1;
  let current = 1;
  for (let index = 1; index < dates.length; index += 1) {
    const diff = Math.round((new Date(`${dates[index]}T12:00:00`) - new Date(`${dates[index - 1]}T12:00:00`)) / 86400000);
    if (diff === 1) current += 1;
    else if (diff > 1) current = 1;
    best = Math.max(best, current);
  }
  return best;
}

export function getPerfectDays(habits = [], habitLogs = []) {
  const dates = [...new Set(habitLogs.map((log) => log.date).filter(Boolean))].sort();
  const logsByDate = new Map();
  for (const log of habitLogs) {
    if (!logsByDate.has(log.date)) logsByDate.set(log.date, new Set());
    logsByDate.get(log.date).add(log.habit_id);
  }

  return dates.filter((date) => {
    const due = dueHabitsForDate(habits, date);
    if (!due.length) return false;
    const logged = logsByDate.get(date) || new Set();
    return due.every((habit) => logged.has(habit.id));
  });
}

function recentDates(days = 7, anchor = localIso()) {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(`${anchor}T12:00:00`);
    date.setDate(date.getDate() - index);
    return localIso(date);
  });
}

function balancedCategoryCount(habits = [], habitLogs = []) {
  const categoriesByHabit = new Map(habits.map((habit) => [habit.id, habit.category]));
  const categoriesByDate = new Map();
  for (const log of habitLogs) {
    const category = categoriesByHabit.get(log.habit_id);
    if (!category) continue;
    if (!categoriesByDate.has(log.date)) categoriesByDate.set(log.date, new Set());
    categoriesByDate.get(log.date).add(category);
  }

  let best = 0;
  for (const categories of categoriesByDate.values()) best = Math.max(best, categories.size);
  return best;
}

export function getAchievementProgress({ habits = [], habitLogs = [], workouts = [], measurements = [], photos = [] }) {
  const currentStreak = getGlobalStreak(habitLogs, workouts);
  const longestStreak = getLongestStreak(habitLogs, workouts);
  const perfectDays = getPerfectDays(habits, habitLogs);
  const recent = new Set(recentDates(7));
  const perfectWeekCount = perfectDays.filter((date) => recent.has(date)).length;
  const balancedCount = balancedCategoryCount(habits, habitLogs);
  const completedWorkoutCount = workouts.filter((item) => item.status === "completed").length;

  const progressByKey = {
    first_step: habitLogs.length,
    three_day_streak: currentStreak,
    seven_day_streak: currentStreak,
    fourteen_day_streak: currentStreak,
    thirty_day_streak: currentStreak,
    perfect_day: perfectDays.length,
    perfect_week: perfectWeekCount,
    training_started: completedWorkoutCount,
    body_check: measurements.length,
    visual_reference: photos.length,
    balanced_day: balancedCount,
  };

  return achievementCatalog.map((achievement) => {
    const current = Math.min(progressByKey[achievement.key] || 0, achievement.target);
    return {
      ...achievement,
      current,
      achieved: current >= achievement.target,
      percent: achievement.target ? Math.round((current / achievement.target) * 100) : 0,
    };
  });
}

export function getUnlockedAchievements(progress = [], achievementRows = []) {
  const unlockedByKey = new Map(achievementRows.map((row) => [row.achievement_key, row]));
  return progress.map((achievement) => {
    const row = unlockedByKey.get(achievement.key);
    return {
      ...achievement,
      unlocked: Boolean(row),
      unlocked_at: row?.unlocked_at || null,
      isNew: row?.unlocked_at ? Date.now() - new Date(row.unlocked_at).getTime() < 1000 * 60 * 60 * 24 : false,
    };
  });
}

export function getMotivationMessage({ completionRate = 0, dueHabitsCount = 0, currentStreak = 0, nextAchievement = null }) {
  if (!dueHabitsCount) return "Define dos o tres habitos faciles y deja que el panel empiece a tirar de ti.";
  if (completionRate === 100 && currentStreak >= 7) return "Dia cerrado y racha solida. Hoy no hace falta hacer mas para demostrar nada.";
  if (completionRate === 100) return "Dia redondo. Cierra aqui o suma algo suave, pero lo importante ya esta hecho.";
  if (currentStreak === 0) return "Hoy es buen dia para retomar. Marca una cosa pequena y vuelve a estar dentro.";
  if (completionRate >= 60) return nextAchievement ? `Vas bien. El siguiente desbloqueo esta cerca: ${nextAchievement.title}.` : "Vas bien. Remata lo basico y deja el extra como extra.";
  return nextAchievement ? `Empieza por una accion. Cada marca acerca ${nextAchievement.title}.` : "Una marca basta para que el dia no quede en blanco.";
}

export function trendPoints(measurements, field) {
  const values = measurements
    .filter((item) => Number.isFinite(Number(item[field])))
    .slice(-8)
    .map((item) => Number(item[field]));
  if (values.length < 2) return "";

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 100;
      const y = 86 - ((value - min) / span) * 70;
      return `${x},${y}`;
    })
    .join(" ");
}

export function normalizeRoutine(row) {
  if (!row) return fallbackWorkoutPlan;

  const exercises = [...(row.routine_exercises || [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((exercise) => {
      const frames = [exercise.image_url, exercise.image_url_2].filter(Boolean);
      return {
        name: exercise.name,
        sets: exercise.sets,
        reps: exercise.reps,
        rest: exercise.rest_seconds,
        frames: frames.length ? frames : ["/assets/exercises/pushup.jpg"],
        referenceUrl: exercise.reference_url,
        cue: exercise.cue,
      };
    });

  if (!exercises.length) return fallbackWorkoutPlan;

  return {
    title: row.title,
    duration: row.duration_label,
    promise: row.promise,
    exercises,
  };
}

export function blankHabitForm(sortOrder = 100) {
  return {
    id: null,
    title: "",
    category: "Salud",
    color_key: "sage",
    frequency_type: "daily",
    days_of_week: [1, 2, 3, 4, 5],
    target_count: 1,
    target_unit: "",
    is_active: true,
    sort_order: sortOrder,
  };
}

export function habitToForm(habit) {
  return {
    id: habit.id,
    title: habit.title || "",
    category: habit.category || "Salud",
    color_key: habit.color_key || "sage",
    frequency_type: habit.frequency_type || "daily",
    days_of_week: Array.isArray(habit.days_of_week) && habit.days_of_week.length ? habit.days_of_week : [1, 2, 3, 4, 5],
    target_count: habit.target_count ?? 1,
    target_unit: habit.target_unit || "",
    is_active: habit.is_active !== false,
    sort_order: habit.sort_order || 100,
  };
}
