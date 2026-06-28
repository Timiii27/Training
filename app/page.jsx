"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AppHeader,
  AuthScreen,
  CalendarSection,
  HabitsSection,
  ProgressSection,
  SettingsSection,
  TodayDashboard,
  TrainingSection,
  WorkoutPlayer,
} from "./components/portal-sections";
import { createClient } from "../lib/supabase/client";
import {
  ACTIVE_WORKOUT_KEY,
  THEME_STORAGE_KEY,
  blankHabitForm,
  countCompletedSets,
  defaultHabitSeeds,
  defaultProfile,
  displayNameFromSession,
  dueHabitsForDate,
  getAchievementProgress,
  getGlobalStreak,
  getLongestStreak,
  fallbackWorkoutPlan,
  firstTrackingDate,
  getMonthDays,
  getMotivationMessage,
  getUnlockedAchievements,
  habitToForm,
  lastWorkoutForRoutine,
  localIso,
  logKey,
  normalizeRoutine,
  restLeftFor,
  workoutElapsedFor,
} from "../lib/portal/defaults";

const SHAKE_THRESHOLD = 28;
const SHAKE_COOLDOWN_MS = 1400;

async function normalizePhoto(file) {
  const lowerName = file.name.toLowerCase();
  const isHeic = file.type.includes("heic") || file.type.includes("heif") || lowerName.endsWith(".heic") || lowerName.endsWith(".heif");

  if (!isHeic) return { file, extension: lowerName.split(".").pop() || "jpg", contentType: file.type || "image/jpeg" };

  const heic2any = (await import("heic2any")).default;
  const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.86 });
  const blob = Array.isArray(converted) ? converted[0] : converted;
  const jpg = new File([blob], file.name.replace(/\.(heic|heif)$/i, ".jpg"), { type: "image/jpeg" });
  return { file: jpg, extension: "jpg", contentType: "image/jpeg" };
}

function newProfile(session) {
  return {
    id: session.user.id,
    display_name: displayNameFromSession(session),
    ...defaultProfile,
  };
}

function profileWithFallback(profile, session) {
  return {
    ...newProfile(session),
    ...(profile || {}),
    portal_config: {
      ...defaultProfile.portal_config,
      ...(profile?.portal_config || {}),
    },
  };
}

function safeNumber(value, fallback = 1) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export default function HomePage() {
  const supabase = useMemo(() => createClient(), []);
  const wakeLockRef = useRef(null);
  const audioRef = useRef(null);
  const lastCueRef = useRef(null);
  const lastShakeRef = useRef(0);

  const [session, setSession] = useState(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [activeView, setActiveView] = useState("today");

  const [profile, setProfile] = useState(null);
  const [profileDraft, setProfileDraft] = useState(defaultProfile);
  const [habits, setHabits] = useState([]);
  const [habitLogs, setHabitLogs] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [habitForm, setHabitForm] = useState(blankHabitForm());

  const [workouts, setWorkouts] = useState([]);
  const [measurements, setMeasurements] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [routinePlan, setRoutinePlan] = useState(fallbackWorkoutPlan);
  const [month, setMonth] = useState(new Date());
  const [activeWorkout, setActiveWorkout] = useState(null);
  const [measureForm, setMeasureForm] = useState({ date: localIso(), weight: "", waist: "", note: "" });
  const [photoDate, setPhotoDate] = useState(localIso());
  const [photoNote, setPhotoNote] = useState("");
  const [storedWorkout, setStoredWorkout] = useState(null);
  const [photoStorage, setPhotoStorage] = useState({ checked: false, ready: false, isSettingUp: false, message: "" });
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [shakeEnabled, setShakeEnabled] = useState(false);
  const [wakeLockStatus, setWakeLockStatus] = useState("idle");
  const [motionMessage, setMotionMessage] = useState("");
  const [now, setNow] = useState(Date.now());
  const [themeMode, setThemeMode] = useState("auto");

  useEffect(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "auto") setThemeMode(stored);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (themeMode === "auto") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", themeMode);
    localStorage.setItem(THEME_STORAGE_KEY, themeMode);
  }, [themeMode]);

  useEffect(() => {
    if (!message) return undefined;
    const timer = setTimeout(() => setMessage(""), 4200);
    return () => clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!session?.user) {
      setProfile(null);
      setProfileDraft(defaultProfile);
      setHabits([]);
      setHabitLogs([]);
      setAchievements([]);
      setWorkouts([]);
      setMeasurements([]);
      setPhotos([]);
      setRoutinePlan(fallbackWorkoutPlan);
      setStoredWorkout(null);
      return;
    }

    loadData();
    restoreStoredWorkout();
  }, [session]);

  useEffect(() => {
    if (!activeWorkout) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [activeWorkout]);

  useEffect(() => {
    if (!activeWorkout) return;
    localStorage.setItem(ACTIVE_WORKOUT_KEY, JSON.stringify(activeWorkout));
  }, [activeWorkout]);

  useEffect(() => {
    if (!activeWorkout) {
      releaseWakeLock();
      return undefined;
    }

    requestWakeLock();
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") requestWakeLock();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [activeWorkout]);

  useEffect(() => {
    if (!activeWorkout) return;
    const restLeft = restLeftFor(activeWorkout, now);
    const cue = activeWorkout.restEndsAt && now - activeWorkout.restEndsAt < 1400 && now >= activeWorkout.restEndsAt
      ? "go"
      : [1, 2, 3].includes(restLeft)
        ? String(restLeft)
        : null;

    if (!cue || cue === lastCueRef.current) return;
    lastCueRef.current = cue;
    if (soundEnabled) playBeep(cue === "go" ? 760 : 520, cue === "go" ? 170 : 110);
    if (cue === "go" && "vibrate" in navigator) navigator.vibrate?.([80, 40, 80]);
  }, [activeWorkout, now, soundEnabled]);

  useEffect(() => {
    if (!activeWorkout || !shakeEnabled) return undefined;

    const onMotion = (event) => {
      if (restLeftFor(activeWorkout) > 0) return;
      const acceleration = event.accelerationIncludingGravity || event.acceleration;
      if (!acceleration) return;

      const x = acceleration.x || 0;
      const y = acceleration.y || 0;
      const z = acceleration.z || 0;
      const magnitude = Math.sqrt(x * x + y * y + z * z);
      const timestamp = Date.now();

      if (magnitude < SHAKE_THRESHOLD || timestamp - lastShakeRef.current < SHAKE_COOLDOWN_MS) return;
      lastShakeRef.current = timestamp;
      markSet("shake");
      if ("vibrate" in navigator) navigator.vibrate?.(80);
    };

    window.addEventListener("devicemotion", onMotion);
    return () => window.removeEventListener("devicemotion", onMotion);
  }, [activeWorkout, shakeEnabled]);

  function restoreStoredWorkout() {
    try {
      const raw = localStorage.getItem(ACTIVE_WORKOUT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.startedAt && parsed?.completedSets && Number.isInteger(parsed.exerciseIndex)) {
        setStoredWorkout(parsed);
      }
    } catch {
      localStorage.removeItem(ACTIVE_WORKOUT_KEY);
    }
  }

  async function ensureProfileAndHabits(foundProfile, foundHabits) {
    if (!session?.user) return { profile: foundProfile, habits: foundHabits };

    let nextProfile = profileWithFallback(foundProfile, session);
    if (!foundProfile) {
      const { data, error } = await supabase
        .from("user_profiles")
        .upsert(nextProfile, { onConflict: "id" })
        .select("*")
        .single();
      if (!error && data) nextProfile = profileWithFallback(data, session);
    }

    let nextHabits = foundHabits || [];
    if (!nextHabits.length) {
      const seeds = defaultHabitSeeds.map((habit) => ({
        ...habit,
        user_id: session.user.id,
        frequency_type: habit.frequency_type || "daily",
        target_count: habit.target_count || 1,
        is_active: true,
      }));
      const { data, error } = await supabase.from("habits").insert(seeds).select("*").order("sort_order", { ascending: true });
      if (!error) nextHabits = data || [];
    }

    return { profile: nextProfile, habits: nextHabits };
  }

  async function loadRoutine() {
    try {
      const filteredResult = await supabase
        .from("routine_templates")
        .select("*, routine_exercises(*)")
        .eq("active", true)
        .or(`user_id.eq.${session.user.id},user_id.is.null`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!filteredResult.error && filteredResult.data) return normalizeRoutine(filteredResult.data);

      const result = await supabase
        .from("routine_templates")
        .select("*, routine_exercises(*)")
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!result.error && result.data) return normalizeRoutine(result.data);
    } catch {
      return fallbackWorkoutPlan;
    }

    return fallbackWorkoutPlan;
  }

  async function syncAchievements(snapshot, knownAchievements = []) {
    if (!session?.user) return knownAchievements;

    const progress = getAchievementProgress(snapshot);
    const knownKeys = new Set(knownAchievements.map((row) => row.achievement_key));
    const newlyUnlocked = progress
      .filter((achievement) => achievement.achieved && !knownKeys.has(achievement.key))
      .map((achievement) => ({
        user_id: session.user.id,
        achievement_key: achievement.key,
        metadata: {
          current: achievement.current,
          target: achievement.target,
          title: achievement.title,
        },
      }));

    if (!newlyUnlocked.length) return knownAchievements;

    const { data, error } = await supabase
      .from("user_achievements")
      .upsert(newlyUnlocked, { onConflict: "user_id,achievement_key" })
      .select("*");

    if (error) return knownAchievements;
    setMessage(`Logro desbloqueado: ${newlyUnlocked[0].metadata.title}.`);
    return [...knownAchievements, ...(data || [])];
  }

  async function loadData() {
    if (!session?.user) return;

    setLoading(true);
    setMessage("");

    const [workoutResult, measureResult, profileResult, habitsResult, logsResult, achievementResult, photoResult, routine] = await Promise.all([
      supabase.from("workouts").select("*").order("date", { ascending: false }).order("created_at", { ascending: false }),
      supabase.from("measurements").select("*").order("date", { ascending: true }).order("created_at", { ascending: true }),
      supabase.from("user_profiles").select("*").eq("id", session.user.id).maybeSingle(),
      supabase.from("habits").select("*").eq("user_id", session.user.id).order("sort_order", { ascending: true }).order("created_at", { ascending: true }),
      supabase.from("habit_logs").select("*").eq("user_id", session.user.id).order("date", { ascending: false }).limit(500),
      supabase.from("user_achievements").select("*").eq("user_id", session.user.id).order("unlocked_at", { ascending: true }),
      fetch("/api/photos").then((response) => response.json()).catch((error) => ({ ok: false, error: error.message })),
      loadRoutine(),
    ]);

    if (workoutResult.error) {
      setMessage("No pude cargar tus entrenos. Revisa la conexion del proyecto.");
      setLoading(false);
      return;
    }

    const portalTablesMissing = [profileResult, habitsResult, logsResult].some((result) => result?.error);
    const achievementsMissing = Boolean(achievementResult.error);
    if (portalTablesMissing) {
      setMessage("Faltan las tablas del portal. Aplica la migracion de Supabase incluida en el proyecto.");
    } else if (achievementsMissing) {
      setMessage("Falta la tabla de logros. Aplica la nueva migracion de Supabase para activar insignias.");
    }

    const ensured = portalTablesMissing
      ? { profile: profileWithFallback(null, session), habits: [] }
      : await ensureProfileAndHabits(profileResult.data, habitsResult.data || []);

    const nextHabits = ensured.habits || [];
    const nextHabitLogs = logsResult.error ? [] : logsResult.data || [];
    const nextWorkouts = workoutResult.data || [];
    const nextMeasurements = measureResult.error ? [] : measureResult.data || [];
    const nextPhotos = photoResult.ok ? photoResult.photos || [] : [];
    const nextAchievements = achievementResult.error ? [] : await syncAchievements(
      {
        habits: nextHabits,
        habitLogs: nextHabitLogs,
        workouts: nextWorkouts,
        measurements: nextMeasurements,
        photos: nextPhotos,
      },
      achievementResult.data || [],
    );

    setProfile(ensured.profile);
    setProfileDraft(ensured.profile);
    setHabits(nextHabits);
    setHabitLogs(nextHabitLogs);
    setAchievements(nextAchievements);
    setWorkouts(nextWorkouts);
    setMeasurements(nextMeasurements);
    setPhotos(nextPhotos);
    setPhotoStorage({
      checked: true,
      ready: Boolean(photoResult.storageReady),
      isSettingUp: false,
      message: photoResult.storageReady ? "" : "El almacenamiento de imagenes aun no esta preparado.",
    });
    setRoutinePlan(routine);
    setHabitForm(blankHabitForm((nextHabits.length + 1) * 10));
    setLoading(false);
  }

  async function submitAuth(event) {
    event.preventDefault();
    setMessage("");
    setIsSaving(true);

    const result = await supabase.auth.signInWithPassword({ email: authEmail.trim(), password: authPassword });

    setIsSaving(false);
    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    setMessage("Dentro. Tu dia esta listo.");
  }

  async function signOut() {
    await supabase.auth.signOut();
    setMessage("Sesion cerrada.");
  }

  function startWorkout() {
    const workout = {
      startedAt: Date.now(),
      exerciseIndex: 0,
      completedSets: {},
      restEndsAt: null,
      restDuration: 0,
    };
    setStoredWorkout(null);
    setActiveWorkout(workout);
    setMessage("");
  }

  function continueWorkout() {
    if (!storedWorkout) return;
    setActiveWorkout(storedWorkout);
    setStoredWorkout(null);
    setMessage("");
  }

  function startOrContinueWorkout() {
    if (storedWorkout) continueWorkout();
    else startWorkout();
  }

  function clearWorkoutState() {
    localStorage.removeItem(ACTIVE_WORKOUT_KEY);
    setStoredWorkout(null);
    setActiveWorkout(null);
    releaseWakeLock();
  }

  function markSet(source = "tap") {
    setActiveWorkout((current) => {
      if (!current) return current;
      if (restLeftFor(current) > 0) return current;
      const exercise = routinePlan.exercises[current.exerciseIndex];
      const currentCount = current.completedSets[exercise.name] || 0;
      const nextCount = Math.min(exercise.sets, currentCount + 1);
      if (currentCount >= exercise.sets) return current;
      const shouldRest = nextCount < exercise.sets;
      return {
        ...current,
        completedSets: { ...current.completedSets, [exercise.name]: nextCount },
        restDuration: shouldRest ? exercise.rest : 0,
        restEndsAt: shouldRest ? Date.now() + exercise.rest * 1000 : null,
        lastAction: source,
      };
    });
  }

  function skipRest() {
    setActiveWorkout((current) => (current ? { ...current, restEndsAt: null, restDuration: 0 } : current));
  }

  function addRest(seconds = 30) {
    setActiveWorkout((current) => {
      if (!current?.restEndsAt) return current;
      return { ...current, restEndsAt: current.restEndsAt + seconds * 1000, restDuration: (current.restDuration || 0) + seconds };
    });
  }

  function moveExercise(direction) {
    setActiveWorkout((current) => {
      if (!current) return current;
      return {
        ...current,
        exerciseIndex: Math.min(routinePlan.exercises.length - 1, Math.max(0, current.exerciseIndex + direction)),
        restEndsAt: null,
        restDuration: 0,
      };
    });
  }

  async function completeTrainingHabit() {
    const trainingHabit = habits.find((habit) => habit.is_active && habit.category === "Entreno");
    if (!trainingHabit) return;
    await supabase.from("habit_logs").upsert(
      {
        habit_id: trainingHabit.id,
        user_id: session.user.id,
        date: localIso(),
        count: safeNumber(trainingHabit.target_count),
        status: "completed",
      },
      { onConflict: "habit_id,date" },
    );
  }

  async function finishWorkout() {
    if (!session?.user || !activeWorkout) return;

    setIsSaving(true);
    const totalSets = countCompletedSets(activeWorkout.completedSets);
    const targetSets = routinePlan.exercises.reduce((sum, exercise) => sum + (exercise.sets || 0), 0);
    const status = targetSets > 0 && totalSets >= targetSets ? "completed" : "partial";
    const duration = Math.max(1, Math.round(workoutElapsedFor(activeWorkout) / 60));
    const { error } = await supabase.from("workouts").insert({
      user_id: session.user.id,
      date: localIso(),
      type: "strength",
      status,
      activity: routinePlan.title,
      duration,
      notes: `${totalSets} series registradas. ${status === "partial" ? "Entreno parcial." : "Entreno completo."}`,
    });

    if (!error && status === "completed") await completeTrainingHabit();

    setIsSaving(false);
    if (error) {
      setMessage(error.message);
      return;
    }

    clearWorkoutState();
    setMessage(status === "partial" ? "Entreno parcial guardado." : "Entreno guardado y habito marcado.");
    await loadData();
  }

  async function toggleHabit(habit) {
    if (!session?.user || !habit?.id) return;
    const date = localIso();
    const existing = habitLogs.find((log) => log.habit_id === habit.id && log.date === date);

    // Optimistic UI: el check se refleja al instante, sin esperar al servidor.
    if (existing) {
      setHabitLogs((current) => current.filter((log) => log.id !== existing.id));
    } else {
      const optimistic = {
        id: `optimistic-${habit.id}-${date}`,
        habit_id: habit.id,
        user_id: session.user.id,
        date,
        count: safeNumber(habit.target_count),
        status: "completed",
      };
      setHabitLogs((current) => [optimistic, ...current]);
    }

    const result = existing
      ? await supabase.from("habit_logs").delete().eq("id", existing.id).eq("user_id", session.user.id)
      : await supabase.from("habit_logs").upsert(
          {
            habit_id: habit.id,
            user_id: session.user.id,
            date,
            count: safeNumber(habit.target_count),
            status: "completed",
          },
          { onConflict: "habit_id,date" },
        );

    if (result.error) setMessage(result.error.message);
    // Resincroniza (logros, rachas y estado real) en segundo plano.
    await loadData();
  }

  async function saveHabit(event) {
    event.preventDefault();
    if (!session?.user || !habitForm.title.trim()) return;

    setIsSaving(true);
    const payload = {
      user_id: session.user.id,
      title: habitForm.title.trim().slice(0, 120),
      category: habitForm.category,
      color_key: habitForm.color_key,
      frequency_type: habitForm.frequency_type,
      days_of_week: habitForm.frequency_type === "weekly" ? habitForm.days_of_week : null,
      target_count: safeNumber(habitForm.target_count),
      target_unit: habitForm.target_unit.trim().slice(0, 24) || null,
      is_active: Boolean(habitForm.is_active),
      sort_order: Number(habitForm.sort_order) || habits.length * 10 + 10,
    };

    const result = habitForm.id
      ? await supabase.from("habits").update(payload).eq("id", habitForm.id).eq("user_id", session.user.id)
      : await supabase.from("habits").insert(payload);

    setIsSaving(false);
    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    setMessage(habitForm.id ? "Habito actualizado." : "Habito creado.");
    setHabitForm(blankHabitForm((habits.length + 1) * 10));
    await loadData();
  }

  async function deleteHabit(habit) {
    if (!session?.user || !habit?.id) return;
    if (!window.confirm(`Eliminar el habito "${habit.title}"? Esta accion no se puede deshacer.`)) return;
    const { error } = await supabase.from("habits").delete().eq("id", habit.id).eq("user_id", session.user.id);
    if (error) setMessage(error.message);
    else {
      setMessage("Habito eliminado.");
      await loadData();
    }
  }

  async function saveProfile(event) {
    event.preventDefault();
    if (!session?.user) return;

    setIsSaving(true);
    const payload = {
      id: session.user.id,
      display_name: profileDraft.display_name || displayNameFromSession(session),
      primary_goal: profileDraft.primary_goal?.trim() || defaultProfile.primary_goal,
      theme_key: profileDraft.theme_key || "calm",
      portal_config: profileDraft.portal_config || defaultProfile.portal_config,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase.from("user_profiles").upsert(payload, { onConflict: "id" }).select("*").single();
    setIsSaving(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    const nextProfile = profileWithFallback(data, session);
    setProfile(nextProfile);
    setProfileDraft(nextProfile);
    setMessage("Ajustes guardados.");
  }

  async function saveMeasurement(event) {
    event.preventDefault();
    if (!session?.user) return;
    setIsSaving(true);

    const { error } = await supabase.from("measurements").insert({
      user_id: session.user.id,
      date: measureForm.date || localIso(),
      weight: measureForm.weight ? Number(measureForm.weight) : null,
      waist: measureForm.waist ? Number(measureForm.waist) : null,
      note: measureForm.note.trim() || null,
    });

    setIsSaving(false);
    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Check-in guardado.");
    setMeasureForm((current) => ({ ...current, note: "" }));
    await loadData();
  }

  async function uploadPhotos(event) {
    const files = [...(event.target.files || [])];
    if (!files.length || !session?.user) return;

    setIsSaving(true);
    setMessage("Guardando imagenes...");

    if (!photoStorage.ready) {
      const ready = await setupPhotoStorage();
      if (!ready) {
        setIsSaving(false);
        event.target.value = "";
        return;
      }
    }

    for (const sourceFile of files) {
      try {
        const { file, extension } = await normalizePhoto(sourceFile);
        const formData = new FormData();
        formData.append("file", file, `progress.${extension}`);
        formData.append("date", photoDate || localIso());
        formData.append("note", photoNote.trim());

        const response = await fetch("/api/photos", {
          method: "POST",
          body: formData,
        });
        const result = await response.json();
        if (!response.ok || !result.ok) throw new Error(result.error || "No pude guardar la imagen.");
      } catch (error) {
        setMessage(`No pude guardar ${sourceFile.name}: ${error.message}`);
        setIsSaving(false);
        event.target.value = "";
        return;
      }
    }

    setIsSaving(false);
    setPhotoNote("");
    event.target.value = "";
    setMessage("Imagenes guardadas.");
    await loadData();
  }

  async function setupPhotoStorage() {
    setPhotoStorage((current) => ({ ...current, isSettingUp: true, message: "Preparando almacenamiento..." }));
    try {
      const response = await fetch("/api/setup/storage", { method: "POST" });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "No pude preparar el almacenamiento.");

      setPhotoStorage({ checked: true, ready: true, isSettingUp: false, message: result.created ? "Almacenamiento preparado." : "Almacenamiento listo." });
      setMessage(result.created ? "Almacenamiento de imagenes preparado." : "Almacenamiento de imagenes listo.");
      return true;
    } catch (error) {
      setPhotoStorage({ checked: true, ready: false, isSettingUp: false, message: error.message });
      setMessage(error.message);
      return false;
    }
  }

  async function deleteWorkout(id) {
    if (!window.confirm("Eliminar este entreno?")) return;
    const { error } = await supabase.from("workouts").delete().eq("id", id);
    if (error) setMessage(error.message);
    else await loadData();
  }

  async function deletePhoto(photo) {
    if (!window.confirm("Eliminar esta foto?")) return;
    const response = await fetch("/api/photos", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: photo.id }),
    });
    const result = await response.json();
    if (!response.ok || !result.ok) setMessage(result.error || "No pude eliminar la foto.");
    else {
      setMessage("Foto eliminada.");
      await loadData();
    }
  }

  async function requestWakeLock() {
    if (!("wakeLock" in navigator)) {
      setWakeLockStatus("unsupported");
      return;
    }

    try {
      if (!wakeLockRef.current) {
        wakeLockRef.current = await navigator.wakeLock.request("screen");
        wakeLockRef.current.addEventListener("release", () => {
          wakeLockRef.current = null;
          setWakeLockStatus("released");
        });
      }
      setWakeLockStatus("active");
    } catch {
      setWakeLockStatus("blocked");
    }
  }

  async function releaseWakeLock() {
    try {
      await wakeLockRef.current?.release();
    } catch {
      // The browser may already have released it.
    } finally {
      wakeLockRef.current = null;
      setWakeLockStatus("idle");
    }
  }

  function playBeep(frequency = 520, duration = 120) {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      if (!audioRef.current) audioRef.current = new AudioContext();
      const context = audioRef.current;
      if (context.state === "suspended") context.resume();

      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = frequency;
      oscillator.type = "sine";
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration / 1000);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + duration / 1000 + 0.02);
    } catch {
      // Sound is optional.
    }
  }

  async function toggleSound() {
    const next = !soundEnabled;
    setSoundEnabled(next);
    if (next) playBeep(620, 90);
  }

  async function toggleShake() {
    const next = !shakeEnabled;
    if (!next) {
      setShakeEnabled(false);
      setMotionMessage("");
      return;
    }

    try {
      if (typeof DeviceMotionEvent !== "undefined" && typeof DeviceMotionEvent.requestPermission === "function") {
        const permission = await DeviceMotionEvent.requestPermission();
        if (permission !== "granted") {
          setMotionMessage("Movimiento no permitido en este navegador.");
          return;
        }
      }
      setShakeEnabled(true);
      setMotionMessage("Agitar activado.");
    } catch {
      setMotionMessage("No pude activar el gesto de agitar.");
    }
  }

  function selectDate(iso) {
    setMeasureForm((current) => ({ ...current, date: iso }));
    setPhotoDate(iso);
    setActiveView("progress");
    window.requestAnimationFrame(() => document.getElementById("checkin")?.scrollIntoView({ behavior: "smooth" }));
  }

  const today = localIso();
  const displayName = profile?.display_name || displayNameFromSession(session);
  const logsByKey = Object.fromEntries(habitLogs.map((log) => [logKey(log.habit_id, log.date), log]));
  const dueHabits = dueHabitsForDate(habits, today);
  const completedToday = dueHabits.filter((habit) => logsByKey[logKey(habit.id, today)]).length;
  const completionRate = dueHabits.length ? Math.round((completedToday / dueHabits.length) * 100) : 0;
  const completedWorkouts = workouts.filter((item) => item.status === "completed");
  const todayWorkout = workouts.find((item) => item.date === today && item.type === "strength");
  const latestMeasurement = measurements.at(-1);
  const weekCompleted = habitLogs.filter((item) => {
    const diff = (new Date(`${today}T12:00:00`) - new Date(`${item.date}T12:00:00`)) / 86400000;
    return diff >= 0 && diff < 7;
  }).length;
  const trackingStart = firstTrackingDate(workouts, measurements, photos, habitLogs);
  const calendarDays = getMonthDays(month);
  const workoutDates = new Set(completedWorkouts.map((item) => item.date));
  const habitLogDates = new Set(habitLogs.map((item) => item.date));
  const achievementProgress = getAchievementProgress({ habits, habitLogs, workouts, measurements, photos });
  const unlockedAchievements = getUnlockedAchievements(achievementProgress, achievements);
  const nextAchievement = [...unlockedAchievements]
    .filter((achievement) => !achievement.unlocked)
    .sort((a, b) => b.percent - a.percent || a.target - b.target)[0] || null;
  const currentStreak = getGlobalStreak(habitLogs, workouts);
  const longestStreak = getLongestStreak(habitLogs, workouts);
  const perfectWeekCount = achievementProgress.find((achievement) => achievement.key === "perfect_week")?.current || 0;
  const motivation = getMotivationMessage({
    completionRate,
    dueHabitsCount: dueHabits.length,
    currentStreak,
    nextAchievement,
  });
  const lastWorkout = lastWorkoutForRoutine(workouts, routinePlan.title);
  const activeExercise = activeWorkout ? routinePlan.exercises[activeWorkout.exerciseIndex] : null;
  const activeDoneSets = activeWorkout && activeExercise ? activeWorkout.completedSets[activeExercise.name] || 0 : 0;
  const activeRestLeft = restLeftFor(activeWorkout, now);
  const activeElapsed = workoutElapsedFor(activeWorkout, now);
  const countdownCue = activeWorkout?.restEndsAt && now - activeWorkout.restEndsAt < 1400 && now >= activeWorkout.restEndsAt
    ? "Vamos"
    : [1, 2, 3].includes(activeRestLeft)
      ? String(activeRestLeft)
      : null;

  if (loading && !session) {
    return <main className="loading-screen">Preparando tu portal...</main>;
  }

  if (!session) {
    return (
      <AuthScreen
        authEmail={authEmail}
        authPassword={authPassword}
        isSaving={isSaving}
        message={message}
        onEmailChange={setAuthEmail}
        onPasswordChange={setAuthPassword}
        onSubmit={submitAuth}
      />
    );
  }

  return (
    <main className={`app-shell theme-${profileDraft?.theme_key || profile?.theme_key || "calm"}`}>
      <AppHeader displayName={displayName} activeView={activeView} onViewChange={setActiveView} onSignOut={signOut} />

      {message && <div className="toast">{message}</div>}

      {activeView === "today" && (
        <>
          <TodayDashboard
            achievements={unlockedAchievements}
            completionRate={completionRate}
            completedToday={completedToday}
            displayName={displayName}
            dueHabits={dueHabits}
            latestMeasurement={latestMeasurement}
            logsByKey={logsByKey}
            motivation={motivation}
            routinePlan={routinePlan}
            stats={{ streak: currentStreak, longestStreak, nextAchievement, perfectWeekCount, weekCompleted }}
            storedWorkout={storedWorkout}
            today={today}
            todayWorkout={todayWorkout}
            onSelectView={setActiveView}
            onStartWorkout={startOrContinueWorkout}
            onToggleHabit={toggleHabit}
          />
          <CalendarSection
            calendarDays={calendarDays}
            habitLogDates={habitLogDates}
            month={month}
            today={today}
            trackingStart={trackingStart}
            workoutDates={workoutDates}
            onMonthChange={setMonth}
            onSelectDate={selectDate}
          />
        </>
      )}

      {activeView === "habits" && (
        <HabitsSection
          habitForm={habitForm}
          habits={habits}
          logsByKey={logsByKey}
          today={today}
          onCancelEdit={() => setHabitForm(blankHabitForm((habits.length + 1) * 10))}
          onChangeForm={(patch) => setHabitForm((current) => ({ ...current, ...patch }))}
          onDeleteHabit={deleteHabit}
          onEditHabit={(habit) => setHabitForm(habitToForm(habit))}
          onSubmitHabit={saveHabit}
          onToggleHabit={toggleHabit}
        />
      )}

      {activeView === "training" && (
        <TrainingSection
          routinePlan={routinePlan}
          storedWorkout={storedWorkout}
          todayWorkout={todayWorkout}
          workouts={workouts}
          onDeleteWorkout={deleteWorkout}
          onStartWorkout={startOrContinueWorkout}
        />
      )}

      {activeView === "progress" && (
        <ProgressSection
          measureForm={measureForm}
          measurements={measurements}
          photoDate={photoDate}
          photoNote={photoNote}
          photos={photos}
          photoStorage={photoStorage}
          isSaving={isSaving}
          onDeletePhoto={deletePhoto}
          onMeasureChange={(patch) => setMeasureForm((current) => ({ ...current, ...patch }))}
          onPhotoDateChange={setPhotoDate}
          onPhotoNoteChange={setPhotoNote}
          onSaveMeasurement={saveMeasurement}
          onSetupPhotoStorage={setupPhotoStorage}
          onUploadPhotos={uploadPhotos}
        />
      )}

      {activeView === "settings" && (
        <SettingsSection
          profile={profileDraft}
          activeHabits={habits.filter((habit) => habit.is_active)}
          themeMode={themeMode}
          onThemeModeChange={setThemeMode}
          onChangeProfile={(patch) => setProfileDraft((current) => ({ ...current, ...patch }))}
          onSaveProfile={saveProfile}
        />
      )}

      <WorkoutPlayer
        activeDoneSets={activeDoneSets}
        activeElapsed={activeElapsed}
        activeExercise={activeExercise}
        activeRestLeft={activeRestLeft}
        activeWorkout={activeWorkout}
        countdownCue={countdownCue}
        isSaving={isSaving}
        lastWorkout={lastWorkout}
        motionMessage={motionMessage}
        routinePlan={routinePlan}
        shakeEnabled={shakeEnabled}
        soundEnabled={soundEnabled}
        wakeLockStatus={wakeLockStatus}
        onAddRest={addRest}
        onClear={clearWorkoutState}
        onFinish={finishWorkout}
        onMarkSet={markSet}
        onMoveExercise={moveExercise}
        onSkipRest={skipRest}
        onToggleShake={toggleShake}
        onToggleSound={toggleSound}
      />
    </main>
  );
}
