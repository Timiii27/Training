"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "../lib/supabase/client";

const BUCKET = "progress-photos";

const workoutPlan = {
  title: "Pecho + abdomen simple",
  duration: "30-40 min",
  promise: "La misma base casi cada día: empuje, core y constancia. Sin complicarte con mil sesiones.",
  exercises: [
    {
      name: "Flexiones normales o inclinadas",
      sets: 4,
      reps: "8-15",
      rest: 60,
      image: "/assets/exercises/pushup.jpg",
      cue: "Cuerpo firme, pecho al suelo o al apoyo, empuja como si quisieras separar el suelo.",
    },
    {
      name: "Flexiones lentas",
      sets: 3,
      reps: "6-12",
      rest: 60,
      image: "/assets/exercises/pushup.jpg",
      cue: "Baja en tres segundos. Si pierdes forma, eleva las manos en una mesa o cama.",
    },
    {
      name: "Flexiones cerradas",
      sets: 3,
      reps: "6-12",
      rest: 75,
      image: "/assets/exercises/pushup.jpg",
      cue: "Codos cerca del cuerpo. Tríceps y pecho alto, sin dolor de hombro.",
    },
    {
      name: "Dead bug",
      sets: 3,
      reps: "8-12 / lado",
      rest: 45,
      image: "/assets/exercises/dead-bug.jpg",
      cue: "Zona lumbar pegada al suelo. Si se arquea, reduce recorrido.",
    },
    {
      name: "Plancha frontal",
      sets: 3,
      reps: "30-50 s",
      rest: 45,
      image: "/assets/exercises/plank.jpg",
      cue: "Costillas abajo, glúteo activo y respiración tranquila.",
    },
    {
      name: "Plancha lateral",
      sets: 2,
      reps: "25-45 s / lado",
      rest: 45,
      image: "/assets/exercises/plank.jpg",
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
  const [session, setSession] = useState(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMode, setAuthMode] = useState("sign-in");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [workouts, setWorkouts] = useState([]);
  const [measurements, setMeasurements] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [month, setMonth] = useState(new Date());
  const [activeWorkout, setActiveWorkout] = useState(null);
  const [measureForm, setMeasureForm] = useState({ date: localIso(), weight: "", waist: "", note: "" });
  const [photoDate, setPhotoDate] = useState(localIso());
  const [photoNote, setPhotoNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);

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
      return;
    }

    loadData();
  }, [session]);

  useEffect(() => {
    if (!activeWorkout?.restLeft) return undefined;
    const timer = setInterval(() => {
      setActiveWorkout((current) => {
        if (!current?.restLeft) return current;
        return { ...current, restLeft: Math.max(0, current.restLeft - 1) };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [activeWorkout?.restLeft]);

  async function loadData() {
    if (!session?.user) return;

    setLoading(true);
    const [workoutResult, measureResult, photoResult] = await Promise.all([
      supabase.from("workouts").select("*").order("date", { ascending: false }).order("created_at", { ascending: false }),
      supabase.from("measurements").select("*").order("date", { ascending: true }).order("created_at", { ascending: true }),
      supabase.from("progress_photos").select("*").order("date", { ascending: false }).order("created_at", { ascending: false }),
    ]);

    if (workoutResult.error || measureResult.error || photoResult.error) {
      setMessage("No pude cargar datos. Revisa que hayas ejecutado el SQL de Supabase.");
      setLoading(false);
      return;
    }

    const signedPhotos = await Promise.all(
      (photoResult.data || []).map(async (photo) => {
        const { data } = await supabase.storage.from(BUCKET).createSignedUrl(photo.storage_path, 60 * 60);
        return { ...photo, signedUrl: data?.signedUrl || "" };
      }),
    );

    setWorkouts(workoutResult.data || []);
    setMeasurements(measureResult.data || []);
    setPhotos(signedPhotos);
    setLoading(false);
  }

  async function submitAuth(event) {
    event.preventDefault();
    setMessage("");
    setIsSaving(true);

    const payload = { email: authEmail.trim(), password: authPassword };
    const result =
      authMode === "sign-up"
        ? await supabase.auth.signUp(payload)
        : await supabase.auth.signInWithPassword(payload);

    setIsSaving(false);
    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    setMessage(authMode === "sign-up" ? "Cuenta creada. Si Supabase pide confirmación, revisa el email." : "Dentro. A sumar.");
  }

  async function signOut() {
    await supabase.auth.signOut();
    setMessage("Sesión cerrada.");
  }

  function startWorkout() {
    setActiveWorkout({
      startedAt: Date.now(),
      exerciseIndex: 0,
      completedSets: {},
      restLeft: 0,
    });
    setMessage("");
  }

  function markSet() {
    setActiveWorkout((current) => {
      if (!current) return current;
      const exercise = workoutPlan.exercises[current.exerciseIndex];
      const currentCount = current.completedSets[exercise.name] || 0;
      const nextCount = Math.min(exercise.sets, currentCount + 1);
      return {
        ...current,
        completedSets: { ...current.completedSets, [exercise.name]: nextCount },
        restLeft: nextCount >= exercise.sets ? 0 : exercise.rest,
      };
    });
  }

  function moveExercise(direction) {
    setActiveWorkout((current) => {
      if (!current) return current;
      return {
        ...current,
        exerciseIndex: Math.min(workoutPlan.exercises.length - 1, Math.max(0, current.exerciseIndex + direction)),
        restLeft: 0,
      };
    });
  }

  async function finishWorkout(status = "completed") {
    if (!session?.user || !activeWorkout) return;

    setIsSaving(true);
    const totalSets = Object.values(activeWorkout.completedSets).reduce((sum, count) => sum + count, 0);
    const duration = Math.max(1, Math.round((Date.now() - activeWorkout.startedAt) / 60000));
    const { error } = await supabase.from("workouts").insert({
      user_id: session.user.id,
      date: localIso(),
      type: "strength",
      status,
      activity: workoutPlan.title,
      duration,
      notes: `${totalSets} series registradas. ${status === "partial" ? "Entreno parcial." : "Entreno completo."}`,
    });

    setIsSaving(false);
    if (error) {
      setMessage(error.message);
      return;
    }

    setActiveWorkout(null);
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
    setMessage("Subiendo fotos...");

    for (const sourceFile of files) {
      try {
        const { file, extension, contentType } = await normalizePhoto(sourceFile);
        const path = `${session.user.id}/${photoDate || localIso()}-${crypto.randomUUID()}.${extension}`;
        const upload = await supabase.storage.from(BUCKET).upload(path, file, { contentType, upsert: false });
        if (upload.error) throw upload.error;

        const insert = await supabase.from("progress_photos").insert({
          user_id: session.user.id,
          date: photoDate || localIso(),
          storage_path: path,
          note: photoNote.trim() || null,
        });
        if (insert.error) throw insert.error;
      } catch (error) {
        setMessage(`No pude subir ${sourceFile.name}: ${error.message}`);
        setIsSaving(false);
        event.target.value = "";
        return;
      }
    }

    setIsSaving(false);
    setPhotoNote("");
    event.target.value = "";
    setMessage("Fotos guardadas en Supabase Storage.");
    loadData();
  }

  async function deleteWorkout(id) {
    const { error } = await supabase.from("workouts").delete().eq("id", id);
    if (error) setMessage(error.message);
    else loadData();
  }

  async function deletePhoto(photo) {
    await supabase.storage.from(BUCKET).remove([photo.storage_path]);
    const { error } = await supabase.from("progress_photos").delete().eq("id", photo.id);
    if (error) setMessage(error.message);
    else {
      setMessage("Foto eliminada.");
      loadData();
    }
  }

  const completedWorkouts = workouts.filter((item) => item.status === "completed");
  const latestMeasurement = measurements.at(-1);
  const todayWorkout = workouts.find((item) => item.date === localIso() && item.type === "strength");
  const weekWorkouts = workouts.filter((item) => {
    const diff = (new Date(`${localIso()}T12:00:00`) - new Date(`${item.date}T12:00:00`)) / 86400000;
    return diff >= 0 && diff < 7 && item.status === "completed";
  });
  const calendarDays = getMonthDays(month);
  const workoutDates = new Set(completedWorkouts.map((item) => item.date));
  const today = localIso();

  if (loading && !session) {
    return <main className="loading-screen">Preparando tu panel...</main>;
  }

  if (!session) {
    return (
      <main className="auth-shell">
        <section className="auth-hero">
          <p className="eyebrow">Summer Body</p>
          <h1>Tu entrenamiento y tus fotos, con usuario propio.</h1>
          <p>
            Entra, registra tu sesión diaria de pecho y abdomen, guarda peso/cintura y sube fotos privadas en Supabase.
          </p>
          <ul>
            <li>Rutina guiada de 30-40 minutos.</li>
            <li>Calendario para ver días hechos y fallados.</li>
            <li>Fotos y medidas en el mismo sitio.</li>
          </ul>
        </section>

        <form className="auth-panel" onSubmit={submitAuth}>
          <span className="panel-kicker">{authMode === "sign-in" ? "Entrar" : "Crear cuenta"}</span>
          <label>
            Email
            <input type="email" value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} required />
          </label>
          <label>
            Contraseña
            <input type="password" minLength={6} value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} required />
          </label>
          <button className="primary-action" disabled={isSaving}>
            {isSaving ? "Un segundo..." : authMode === "sign-in" ? "Entrar" : "Crear cuenta"}
          </button>
          <button className="ghost-action" type="button" onClick={() => setAuthMode(authMode === "sign-in" ? "sign-up" : "sign-in")}>
            {authMode === "sign-in" ? "No tengo cuenta todavía" : "Ya tengo cuenta"}
          </button>
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
          <h1>Pecho, core y días que suman.</h1>
        </div>
        <button className="ghost-action compact" onClick={signOut}>Salir</button>
      </header>

      {message && <div className="toast">{message}</div>}

      <section className="hero-grid">
        <div className="today-block">
          <span className="panel-kicker">Hoy</span>
          <h2>{todayWorkout ? "Ya has fichado fuerza." : workoutPlan.title}</h2>
          <p>{todayWorkout ? "Si quieres hacer algo extra, que sea suave: paseo, movilidad o bote tranquilo." : workoutPlan.promise}</p>
          <div className="hero-actions">
            <button className="primary-action" onClick={startWorkout}>Comenzar entreno</button>
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
        {workoutPlan.exercises.map((exercise, index) => (
          <article key={exercise.name} className="exercise-tile">
            <img src={exercise.image} alt={exercise.name} />
            <div>
              <span>{index + 1}</span>
              <h3>{exercise.name}</h3>
              <p>{exercise.sets} x {exercise.reps} · descanso {exercise.rest}s</p>
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
          <span className="panel-kicker">Fotos</span>
          <h2>Mismo sitio, misma luz.</h2>
          <p>Sube frontal/lateral cada 2-4 semanas. HEIC se convierte a JPG antes de subirse.</p>
          <div className="field-grid">
            <label>Fecha<input type="date" value={photoDate} onChange={(event) => setPhotoDate(event.target.value)} /></label>
            <label>Nota<input value={photoNote} onChange={(event) => setPhotoNote(event.target.value)} placeholder="Frontal, mañana..." /></label>
          </div>
          <label className="upload-zone">
            <input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple onChange={uploadPhotos} />
            <strong>Elegir fotos</strong>
            <span>JPG, PNG, WEBP o HEIC</span>
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
            const missed = inMonth && iso < today && !done;
            return (
              <button
                key={iso}
                className={`month-day ${inMonth ? "" : "muted"} ${done ? "done" : ""} ${missed ? "missed" : ""} ${iso === today ? "today" : ""}`}
                onClick={() => {
                  setMeasureForm((current) => ({ ...current, date: iso }));
                  setPhotoDate(iso);
                  document.getElementById("checkin")?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                <strong>{date.getDate()}</strong>
                <span>{done ? "Hecho" : missed ? "Fallado" : "Pendiente"}</span>
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
          <h2>Fotos</h2>
          <div className="photo-grid">
            {photos.map((photo) => (
              <figure key={photo.id}>
                {photo.signedUrl ? <img src={photo.signedUrl} alt={photo.note || "Foto de progreso"} /> : <div className="photo-fallback">Sin preview</div>}
                <figcaption>{formatShortDate(photo.date)} · {photo.note || "sin nota"}</figcaption>
                <button onClick={() => deletePhoto(photo)}>Eliminar</button>
              </figure>
            ))}
            {!photos.length && <p>Sin fotos aún. Mejor pocas y comparables que muchas improvisadas.</p>}
          </div>
        </div>
      </section>

      {activeWorkout && (
        <div className="workout-modal">
          <div className="workout-player">
            {(() => {
              const exercise = workoutPlan.exercises[activeWorkout.exerciseIndex];
              const doneSets = activeWorkout.completedSets[exercise.name] || 0;
              return (
                <>
                  <div className="player-media"><img src={exercise.image} alt={exercise.name} /></div>
                  <div className="player-content">
                    <span className="panel-kicker">Ejercicio {activeWorkout.exerciseIndex + 1} / {workoutPlan.exercises.length}</span>
                    <h2>{exercise.name}</h2>
                    <p>{exercise.cue}</p>
                    <div className="set-counter">
                      {Array.from({ length: exercise.sets }, (_, index) => <i key={index} className={index < doneSets ? "on" : ""} />)}
                    </div>
                    <strong className="rep-line">{exercise.sets} x {exercise.reps}</strong>
                    <div className="timer-box">
                      <span>Descanso</span>
                      <strong>{secondsLabel(activeWorkout.restLeft)}</strong>
                    </div>
                    <div className="player-actions">
                      <button className="primary-action" onClick={markSet} disabled={doneSets >= exercise.sets}>Marcar serie</button>
                      <button className="ghost-action" onClick={() => moveExercise(-1)} disabled={activeWorkout.exerciseIndex === 0}>Anterior</button>
                      <button className="ghost-action" onClick={() => moveExercise(1)} disabled={activeWorkout.exerciseIndex === workoutPlan.exercises.length - 1}>Siguiente</button>
                    </div>
                    <div className="finish-actions">
                      <button onClick={() => finishWorkout("partial")} disabled={isSaving}>Guardar parcial</button>
                      <button onClick={() => finishWorkout("completed")} disabled={isSaving}>Terminar entreno</button>
                      <button onClick={() => setActiveWorkout(null)}>Cerrar</button>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </main>
  );
}
