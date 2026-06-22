"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "../lib/supabase/client";

const BUCKET = "progress-photos";
const EXERCISE_IMAGE_BASE = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises";
const ACTIVE_WORKOUT_KEY = "summer-body-active-workout";
const SHAKE_THRESHOLD = 28;
const SHAKE_COOLDOWN_MS = 1400;

function exerciseImage(path) {
  return `${EXERCISE_IMAGE_BASE}/${path}`;
}

const fallbackWorkoutPlan = {
  title: "Torso V + core",
  duration: "30-40 min",
  promise: "Sesión diaria para ganar presencia en pecho, hombro y espalda alta mientras la cintura se ve más recogida.",
  exercises: [
    {
      name: "Flexiones normales o inclinadas",
      sets: 4,
      reps: "8-15",
      rest: 60,
      image: exerciseImage("Pushups/0.jpg"),
      referenceUrl: "https://github.com/yuhonas/free-exercise-db/tree/main/exercises/Pushups",
      cue: "Cuerpo firme, pecho al suelo o al apoyo, empuja como si quisieras separar el suelo.",
    },
    {
      name: "Press en suelo con mochila",
      sets: 3,
      reps: "10-15",
      rest: 60,
      image: exerciseImage("Dumbbell_Floor_Press/0.jpg"),
      referenceUrl: "https://github.com/yuhonas/free-exercise-db/tree/main/exercises/Dumbbell_Floor_Press",
      cue: "Mochila pegada al pecho o mancuernas si tienes. Si no hay peso, cambia por flexiones con pausa.",
    },
    {
      name: "Remo invertido o remo con sábana",
      sets: 4,
      reps: "8-12",
      rest: 75,
      image: exerciseImage("Inverted_Row/0.jpg"),
      referenceUrl: "https://github.com/yuhonas/free-exercise-db/tree/main/exercises/Inverted_Row",
      cue: "Prioridad visual para tu estructura: espalda alta y dorsales. Si no puedes, haz remo con banda o mochila.",
    },
    {
      name: "Band pull-apart o Y-T-W",
      sets: 3,
      reps: "15-25",
      rest: 45,
      image: exerciseImage("Band_Pull_Apart/0.jpg"),
      referenceUrl: "https://github.com/yuhonas/free-exercise-db/tree/main/exercises/Band_Pull_Apart",
      cue: "Hombro posterior y postura. Esto hace que el pecho se vea mejor y protege tus hombros.",
    },
    {
      name: "Flexiones cerradas",
      sets: 2,
      reps: "6-12",
      rest: 75,
      image: exerciseImage("Pushups_Close_and_Wide_Hand_Positions/0.jpg"),
      referenceUrl: "https://github.com/yuhonas/free-exercise-db/tree/main/exercises/Pushups_Close_and_Wide_Hand_Positions",
      cue: "Tríceps y pecho. Si el hombro protesta, abre un poco manos o hazlas inclinadas.",
    },
    {
      name: "Dead bug controlado",
      sets: 3,
      reps: "8-12 / lado",
      rest: 45,
      image: exerciseImage("Dead_Bug/0.jpg"),
      referenceUrl: "https://github.com/yuhonas/free-exercise-db/tree/main/exercises/Dead_Bug",
      cue: "Zona lumbar pegada al suelo. Si se arquea, reduce recorrido.",
    },
    {
      name: "Plancha con toque de hombro",
      sets: 3,
      reps: "10-20 toques",
      rest: 45,
      image: exerciseImage("Plank/0.jpg"),
      referenceUrl: "https://github.com/yuhonas/free-exercise-db/tree/main/exercises/Plank",
      cue: "Cadera quieta. Lento y estable vale más que rápido y torcido.",
    },
    {
      name: "Plancha lateral",
      sets: 2,
      reps: "25-45 s / lado",
      rest: 45,
      image: exerciseImage("Side_Bridge/0.jpg"),
      referenceUrl: "https://github.com/yuhonas/free-exercise-db/tree/main/exercises/Side_Bridge",
      cue: "Cadera alta. Mejor corta y limpia que larga y doblada.",
    },
  ],
};

const quickPlan = [
  "3 rondas de flexiones 8-15",
  "3 rondas de dead bug 10/lado",
  "2 rondas de plancha 40 s",
  "Una foto mental: hoy has sumado",
];

function displayNameFromSession(session) {
  const metadataName = session?.user?.user_metadata?.full_name || session?.user?.user_metadata?.name;
  const raw = metadataName || session?.user?.email?.split("@")[0] || "Atleta";
  const cleaned = raw.replace(/[._-]+/g, " ").replace(/\d+/g, "").trim() || "Atleta";
  return cleaned
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function firstTrackingDate(workouts, measurements, photos) {
  const dates = [...workouts, ...measurements, ...photos].map((item) => item.date).filter(Boolean).sort();
  return dates[0] || localIso();
}

function normalizeRoutine(row) {
  if (!row) return fallbackWorkoutPlan;

  const exercises = [...(row.routine_exercises || [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((exercise) => ({
      name: exercise.name,
      sets: exercise.sets,
      reps: exercise.reps,
      rest: exercise.rest_seconds,
      image: exercise.image_url || "/assets/exercises/pushup.jpg",
      referenceUrl: exercise.reference_url,
      cue: exercise.cue,
    }));

  if (!exercises.length) return fallbackWorkoutPlan;

  return {
    title: row.title,
    duration: row.duration_label,
    promise: row.promise,
    exercises,
  };
}

function localIso(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatShortDate(date) {
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short" }).format(new Date(`${date}T12:00:00`));
}

function monthLabel(date) {
  return new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" }).format(date);
}

function secondsLabel(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function countCompletedSets(completedSets) {
  return Object.values(completedSets || {}).reduce((sum, count) => sum + count, 0);
}

function restLeftFor(workout, now = Date.now()) {
  if (!workout?.restEndsAt) return 0;
  return Math.max(0, Math.ceil((workout.restEndsAt - now) / 1000));
}

function workoutElapsedFor(workout, now = Date.now()) {
  if (!workout?.startedAt) return 0;
  return Math.max(0, Math.floor((now - workout.startedAt) / 1000));
}

function getMonthDays(anchor) {
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

function streakFor(workouts) {
  const dates = [...new Set(workouts.filter((item) => item.status === "completed").map((item) => item.date))].sort().reverse();
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

function trendPoints(measurements, field) {
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
  const [workouts, setWorkouts] = useState([]);
  const [measurements, setMeasurements] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [routinePlan, setRoutinePlan] = useState(fallbackWorkoutPlan);
  const [month, setMonth] = useState(new Date());
  const [activeWorkout, setActiveWorkout] = useState(null);
  const [measureForm, setMeasureForm] = useState({ date: localIso(), weight: "", waist: "", note: "" });
  const [photoDate, setPhotoDate] = useState(localIso());
  const [photoNote, setPhotoNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [storedWorkout, setStoredWorkout] = useState(null);
  const [photoStorage, setPhotoStorage] = useState({ checked: false, ready: false, isSettingUp: false, message: "" });
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [shakeEnabled, setShakeEnabled] = useState(false);
  const [wakeLockStatus, setWakeLockStatus] = useState("idle");
  const [motionMessage, setMotionMessage] = useState("");

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
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
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

  async function checkPhotoStorage() {
    try {
      const response = await fetch("/api/setup/storage");
      const result = await response.json();
      setPhotoStorage({
        checked: true,
        ready: Boolean(result.ok && result.exists),
        isSettingUp: false,
        message: result.ok && result.exists ? "" : "El almacenamiento de imágenes aún no está preparado.",
      });
      return Boolean(result.ok && result.exists);
    } catch {
      setPhotoStorage({ checked: true, ready: false, isSettingUp: false, message: "No pude comprobar el almacenamiento." });
      return false;
    }
  }

  async function setupPhotoStorage() {
    setPhotoStorage((current) => ({ ...current, isSettingUp: true, message: "Preparando almacenamiento..." }));
    try {
      const response = await fetch("/api/setup/storage", { method: "POST" });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "No pude preparar el almacenamiento.");

      setPhotoStorage({ checked: true, ready: true, isSettingUp: false, message: result.created ? "Almacenamiento preparado." : "Almacenamiento listo." });
      setMessage(result.created ? "Almacenamiento de imágenes preparado." : "Almacenamiento de imágenes listo.");
      return true;
    } catch (error) {
      setPhotoStorage({ checked: true, ready: false, isSettingUp: false, message: error.message });
      setMessage(error.message);
      return false;
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

  async function loadData() {
    if (!session?.user) return;

    setLoading(true);
    const workoutResult = await supabase.from("workouts").select("*").order("date", { ascending: false }).order("created_at", { ascending: false });

    if (workoutResult.error) {
      setMessage("No pude cargar tus entrenos. Revisa la conexión del proyecto.");
      setLoading(false);
      return;
    }

    const [measureResult, photoResult] = await Promise.all([
      supabase.from("measurements").select("*").order("date", { ascending: true }).order("created_at", { ascending: true }),
      fetch("/api/photos").then((response) => response.json()).catch((error) => ({ ok: false, error: error.message })),
    ]);

    setWorkouts(workoutResult.data || []);
    setMeasurements(measureResult.error ? [] : measureResult.data || []);
    setPhotos(photoResult.ok ? photoResult.photos || [] : []);
    setPhotoStorage({
      checked: true,
      ready: Boolean(photoResult.storageReady),
      isSettingUp: false,
      message: photoResult.storageReady ? "" : "El almacenamiento de imágenes aún no está preparado.",
    });
    setRoutinePlan(fallbackWorkoutPlan);

    try {
      const routineResult = await supabase
        .from("routine_templates")
        .select("*, routine_exercises(*)")
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!routineResult.error && routineResult.data) {
        setRoutinePlan(normalizeRoutine(routineResult.data));
      }
    } catch {
      setRoutinePlan(fallbackWorkoutPlan);
    }

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

    setMessage("Dentro. A sumar.");
  }

  async function signOut() {
    await supabase.auth.signOut();
    setMessage("Sesión cerrada.");
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

  async function finishWorkout(status = "completed") {
    if (!session?.user || !activeWorkout) return;

    setIsSaving(true);
    const totalSets = countCompletedSets(activeWorkout.completedSets);
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

    setIsSaving(false);
    if (error) {
      setMessage(error.message);
      return;
    }

    clearWorkoutState();
    setMessage(status === "partial" ? "Entreno parcial guardado. También cuenta." : "Entreno guardado. Día sumado.");
    loadData();
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

    setMessage("Check-in guardado. Las medidas van por fecha, no dependen de terminar el entreno.");
    setMeasureForm((current) => ({ ...current, note: "" }));
    loadData();
  }

  async function uploadPhotos(event) {
    const files = [...(event.target.files || [])];
    if (!files.length || !session?.user) return;

    setIsSaving(true);
    setMessage("Guardando imágenes...");

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
        const { file, extension, contentType } = await normalizePhoto(sourceFile);
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
    setMessage("Imágenes guardadas.");
    loadData();
  }

  async function deleteWorkout(id) {
    const { error } = await supabase.from("workouts").delete().eq("id", id);
    if (error) setMessage(error.message);
    else loadData();
  }

  async function deletePhoto(photo) {
    const response = await fetch("/api/photos", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: photo.id }),
    });
    const result = await response.json();
    if (!response.ok || !result.ok) setMessage(result.error || "No pude eliminar la foto.");
    else {
      setMessage("Foto eliminada.");
      loadData();
    }
  }

  const completedWorkouts = workouts.filter((item) => item.status === "completed");
  const latestMeasurement = measurements.at(-1);
  const todayWorkout = workouts.find((item) => item.date === localIso() && item.type === "strength");
  const displayName = displayNameFromSession(session);
  const trackingStart = firstTrackingDate(workouts, measurements, photos);
  const weekWorkouts = workouts.filter((item) => {
    const diff = (new Date(`${localIso()}T12:00:00`) - new Date(`${item.date}T12:00:00`)) / 86400000;
    return diff >= 0 && diff < 7 && item.status === "completed";
  });
  const calendarDays = getMonthDays(month);
  const workoutDates = new Set(completedWorkouts.map((item) => item.date));
  const today = localIso();
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
    return <main className="loading-screen">Preparando tu panel...</main>;
  }

  if (!session) {
    return (
      <main className="auth-shell">
        <section className="auth-hero">
          <p className="eyebrow">Summer Body</p>
          <h1>Tu plan físico, ordenado y siempre a mano.</h1>
          <p>
            Entrena, registra tu progreso y mantén una racha visible sin depender de hojas de cálculo.
          </p>
          <ul>
            <li>Rutina guiada de 30-40 minutos.</li>
            <li>Calendario para ver días hechos y fallados.</li>
            <li>Medidas e imágenes de progreso en un solo sitio.</li>
          </ul>
        </section>

        <form className="auth-panel" onSubmit={submitAuth}>
          <span className="panel-kicker">Acceso</span>
          <label>
            Email
            <input type="email" value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} required />
          </label>
          <label>
            Contraseña
            <input type="password" minLength={6} value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} required />
          </label>
          <button className="primary-action" disabled={isSaving}>
            {isSaving ? "Un segundo..." : "Entrar"}
          </button>
          <p className="access-note">Acceso privado. Las cuentas se activan manualmente.</p>
          {message && <p className="form-message">{message}</p>}
        </form>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Summer Body</p>
          <h1>Panel de {displayName}.</h1>
        </div>
        <div className="topbar-actions">
          <span className="user-pill">{displayName.slice(0, 1)}</span>
          <button className="ghost-action compact" onClick={signOut}>Salir</button>
        </div>
      </header>

      {message && <div className="toast">{message}</div>}

      <section className="hero-grid">
        <div className="today-block">
          <span className="panel-kicker">Hoy</span>
          <h2>{todayWorkout ? `${displayName}, fuerza fichada.` : `${displayName}, toca ${routinePlan.title}.`}</h2>
          <p>{todayWorkout ? "El trabajo principal está hecho. Si quieres algo extra, que sea suave y fácil de recuperar." : routinePlan.promise}</p>
          <div className="focus-row">
            <span>{routinePlan.duration}</span>
            <span>{routinePlan.exercises.length} ejercicios</span>
            <span>Inicio {formatShortDate(trackingStart)}</span>
          </div>
          <div className="hero-actions">
            <button className="primary-action" onClick={storedWorkout ? continueWorkout : startWorkout}>{storedWorkout ? "Continuar entreno" : "Comenzar entreno"}</button>
            <button className="ghost-action" onClick={() => document.getElementById("checkin")?.scrollIntoView({ behavior: "smooth" })}>
              Check-in
            </button>
          </div>
        </div>

        <div className="stat-column">
          <div><strong>{completedWorkouts.length}</strong><span>sesiones</span></div>
          <div><strong>{streakFor(workouts)}</strong><span>racha</span></div>
          <div><strong>{weekWorkouts.length}</strong><span>últimos 7 días</span></div>
          <div><strong>{latestMeasurement?.weight ? `${latestMeasurement.weight} kg` : "—"}</strong><span>último peso</span></div>
        </div>
      </section>

      <section className="workout-strip">
        {routinePlan.exercises.map((exercise, index) => (
          <article key={exercise.name} className="exercise-tile">
            <img src={exercise.image} alt={exercise.name} />
            <div>
              <span>{index + 1}</span>
              <h3>{exercise.name}</h3>
              <p>{exercise.sets} x {exercise.reps} · descanso {exercise.rest}s</p>
              {exercise.referenceUrl && <a className="reference-link" href={exercise.referenceUrl} target="_blank" rel="noreferrer">Ver técnica</a>}
            </div>
          </article>
        ))}
      </section>

      <section id="checkin" className="split-section">
        <form className="plain-panel" onSubmit={saveMeasurement}>
          <span className="panel-kicker">Check-in corporal</span>
          <h2>Peso, cintura y nota.</h2>
          <p>Hazlo antes de entrenar si puedes. Se guarda por fecha, así que no depende de completar la sesión.</p>
          <div className="field-grid">
            <label>Fecha<input type="date" value={measureForm.date} onChange={(event) => setMeasureForm({ ...measureForm, date: event.target.value })} /></label>
            <label>Peso kg<input inputMode="decimal" value={measureForm.weight} onChange={(event) => setMeasureForm({ ...measureForm, weight: event.target.value })} placeholder="100" /></label>
            <label>Cintura cm<input inputMode="decimal" value={measureForm.waist} onChange={(event) => setMeasureForm({ ...measureForm, waist: event.target.value })} placeholder="Ombligo" /></label>
          </div>
          <label>Nota<textarea value={measureForm.note} onChange={(event) => setMeasureForm({ ...measureForm, note: event.target.value })} placeholder="Sueño, alcohol, sensaciones..." /></label>
          <button className="primary-action" disabled={isSaving}>Guardar check-in</button>
        </form>

        <div className="plain-panel">
          <span className="panel-kicker">Progreso visual</span>
          <h2>Mismo sitio, misma luz.</h2>
          <p>Añade una referencia frontal o lateral cada pocas semanas para comparar con calma.</p>
          {photoStorage.checked && !photoStorage.ready && (
            <div className="storage-warning">
              <strong>Almacenamiento pendiente</strong>
              <span>{photoStorage.message || "Prepara el espacio de imágenes antes de guardar fotos."}</span>
              <button className="ghost-action compact" type="button" onClick={setupPhotoStorage} disabled={photoStorage.isSettingUp}>
                {photoStorage.isSettingUp ? "Preparando..." : "Preparar almacenamiento"}
              </button>
            </div>
          )}
          <div className="field-grid">
            <label>Fecha<input type="date" value={photoDate} onChange={(event) => setPhotoDate(event.target.value)} /></label>
            <label>Nota<input value={photoNote} onChange={(event) => setPhotoNote(event.target.value)} placeholder="Frontal, mañana..." /></label>
          </div>
          <label className="upload-zone">
            <input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple onChange={uploadPhotos} disabled={isSaving} />
            <strong>Elegir imágenes</strong>
            <span>Formato móvil o web</span>
          </label>
        </div>
      </section>

      <section className="split-section">
        <div className="plain-panel">
          <div className="section-line">
            <div>
              <span className="panel-kicker">Tendencia</span>
              <h2>Medidas</h2>
            </div>
          </div>
          <div className="trend-grid">
            <div>
              <span>Peso</span>
              <svg viewBox="0 0 100 100" preserveAspectRatio="none"><polyline points={trendPoints(measurements, "weight")} /></svg>
            </div>
            <div>
              <span>Cintura</span>
              <svg viewBox="0 0 100 100" preserveAspectRatio="none"><polyline points={trendPoints(measurements, "waist")} /></svg>
            </div>
          </div>
          <div className="mini-history">
            {measurements.slice(-5).reverse().map((item) => (
              <p key={item.id}><strong>{formatShortDate(item.date)}</strong> {item.weight || "—"} kg · {item.waist || "—"} cm</p>
            ))}
            {!measurements.length && <p>Aún no hay medidas. El primer dato ya da dirección.</p>}
          </div>
        </div>

        <div className="plain-panel">
          <span className="panel-kicker">Express</span>
          <h2>Cuando solo tengas 15 min.</h2>
          <ul className="quick-list">
            {quickPlan.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      </section>

      <section className="calendar-section">
        <div className="section-line">
          <div>
            <span className="panel-kicker">Calendario</span>
            <h2>{monthLabel(month)}</h2>
          </div>
          <div className="month-controls">
            <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>←</button>
            <button onClick={() => setMonth(new Date())}>Hoy</button>
            <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>→</button>
          </div>
        </div>
        <div className="weekday-row">{["L", "M", "X", "J", "V", "S", "D"].map((day) => <span key={day}>{day}</span>)}</div>
        <div className="month-grid">
          {calendarDays.map((date) => {
            const iso = localIso(date);
            const inMonth = date.getMonth() === month.getMonth();
            const done = workoutDates.has(iso);
            const beforeStart = iso < trackingStart;
            const missed = inMonth && iso < today && iso >= trackingStart && !done;
            return (
              <button
                key={iso}
                className={`month-day ${inMonth ? "" : "muted"} ${beforeStart ? "before-start" : ""} ${done ? "done" : ""} ${missed ? "missed" : ""} ${iso === today ? "today" : ""}`}
                onClick={() => {
                  setMeasureForm((current) => ({ ...current, date: iso }));
                  setPhotoDate(iso);
                  document.getElementById("checkin")?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                <strong>{date.getDate()}</strong>
                <span>{done ? "Hecho" : beforeStart ? "Sin plan" : missed ? "Fallado" : "Pendiente"}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="split-section">
        <div className="plain-panel">
          <span className="panel-kicker">Historial</span>
          <h2>Últimos entrenos</h2>
          <div className="history-list">
            {workouts.slice(0, 8).map((item) => (
              <article key={item.id}>
                <div><strong>{formatShortDate(item.date)}</strong><span>{item.activity} · {item.duration || "—"} min</span></div>
                <button onClick={() => deleteWorkout(item.id)}>Borrar</button>
              </article>
            ))}
            {!workouts.length && <p>No hay entrenos todavía. Empieza con una sesión honesta, sin épica.</p>}
          </div>
        </div>

        <div className="plain-panel">
          <span className="panel-kicker">Progreso visual</span>
          <h2>Galería</h2>
          <div className="photo-grid">
            {photos.map((photo) => (
              <figure key={photo.id}>
                {photo.signedUrl ? <img src={photo.signedUrl} alt={photo.note || "Foto de progreso"} /> : <div className="photo-fallback">Sin preview</div>}
                <figcaption>{formatShortDate(photo.date)} · {photo.note || "sin nota"}</figcaption>
                <button onClick={() => deletePhoto(photo)}>Eliminar</button>
              </figure>
            ))}
            {!photos.length && <p>Sin imágenes todavía. Mejor pocas y comparables que muchas improvisadas.</p>}
          </div>
        </div>
      </section>

      {activeWorkout && (
        <div className="workout-modal">
          <div className="workout-player">
            {countdownCue && <div className="countdown-overlay">{countdownCue}</div>}
            <header className="player-header">
              <div>
                <span className="panel-kicker">Ejercicio {activeWorkout.exerciseIndex + 1} / {routinePlan.exercises.length}</span>
                <strong>{secondsLabel(activeElapsed)}</strong>
              </div>
              <div className="player-status">
                <span>{wakeLockStatus === "active" ? "Pantalla activa" : wakeLockStatus === "unsupported" ? "Sin Wake Lock" : "Pantalla normal"}</span>
                <button type="button" onClick={toggleSound}>{soundEnabled ? "Sonido ON" : "Sonido OFF"}</button>
              </div>
            </header>

            {activeExercise && (
              <>
                <div className="player-media"><img src={activeExercise.image} alt={activeExercise.name} /></div>
                <div className="player-content">
                  <h2>{activeExercise.name}</h2>
                  <p>{activeExercise.cue}</p>
                  <div className="set-counter">
                    {Array.from({ length: activeExercise.sets }, (_, index) => <i key={index} className={index < activeDoneSets ? "on" : ""} />)}
                  </div>
                  <strong className="rep-line">{activeExercise.sets} x {activeExercise.reps}</strong>
                  <div className={`timer-box ${activeRestLeft > 0 ? "is-resting" : ""}`}>
                    <span>{activeRestLeft > 0 ? "Descanso" : "Listo para serie"}</span>
                    <strong>{secondsLabel(activeRestLeft)}</strong>
                  </div>
                  <div className="player-toggles">
                    <button type="button" onClick={toggleShake} className={shakeEnabled ? "is-on" : ""}>{shakeEnabled ? "Agitar ON" : "Agitar para serie"}</button>
                    {motionMessage && <span>{motionMessage}</span>}
                  </div>
                </div>
              </>
            )}

            <footer className="player-footer">
              <button className="primary-action" onClick={() => markSet("tap")} disabled={!activeExercise || activeDoneSets >= activeExercise.sets || activeRestLeft > 0}>Serie hecha</button>
              <button className="ghost-action" onClick={skipRest} disabled={activeRestLeft <= 0}>Saltar</button>
              <button className="ghost-action" onClick={() => addRest(30)} disabled={activeRestLeft <= 0}>+30s</button>
              <button className="ghost-action" onClick={() => moveExercise(-1)} disabled={activeWorkout.exerciseIndex === 0}>Anterior</button>
              <button className="ghost-action" onClick={() => moveExercise(1)} disabled={activeWorkout.exerciseIndex === routinePlan.exercises.length - 1}>Siguiente</button>
              <button className="ghost-action" onClick={() => finishWorkout("partial")} disabled={isSaving}>Guardar parcial</button>
              <button className="ghost-action" onClick={() => finishWorkout("completed")} disabled={isSaving}>Terminar</button>
              <button className="ghost-action" onClick={clearWorkoutState}>Cerrar</button>
            </footer>
          </div>
        </div>
      )}
    </main>
  );
}
