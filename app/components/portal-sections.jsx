import { useState } from "react";
import {
  ChartNoAxesColumn,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Flame,
  LogOut,
  RotateCcw,
  SlidersHorizontal,
  Sun,
  X,
} from "lucide-react";
import {
  categoryOptions,
  colorOptions,
  countCompletedSets,
  formatShortDate,
  framesFor,
  monthLabel,
  quickPlan,
  secondsLabel,
  themeModeOptions,
  themeOptions,
  trendPoints,
  weekdayOptions,
} from "../../lib/portal/defaults";

function FrameStack({ frames, alt }) {
  const list = frames?.length ? frames : ["/assets/exercises/pushup.jpg"];
  return (
    <div className="frame-stack">
      <img src={list[0]} alt={alt} loading="lazy" />
      {list[1] && <img className="frame-b" src={list[1]} alt="" aria-hidden="true" loading="lazy" />}
    </div>
  );
}

function ExerciseTags({ exercise }) {
  if (!exercise?.focus && !exercise?.equipment) return null;
  return (
    <div className="exercise-tags">
      {exercise.focus && <span className="tag tag-focus">{exercise.focus}</span>}
      {exercise.equipment && <span className="tag">{exercise.equipment}</span>}
    </div>
  );
}

export function AuthScreen({ authEmail, authPassword, isSaving, message, onEmailChange, onPasswordChange, onSubmit }) {
  return (
    <main className="auth-shell">
      <section className="auth-hero">
        <p className="eyebrow">Portal Diario</p>
        <h1>Un lugar tranquilo para cuidar tus habitos.</h1>
        <p>Entreno, suplementos, paseo, descanso y pequenas rutinas en un panel privado pensado para el dia a dia.</p>
        <ul>
          <li>Habitos diarios y semanales con un toque.</li>
          <li>Entreno guiado cuando toca entrenar.</li>
          <li>Medidas, notas y fotos sin depender de hojas sueltas.</li>
        </ul>
      </section>

      <form className="auth-panel" onSubmit={onSubmit}>
        <span className="panel-kicker">Acceso privado</span>
        <label>
          Email
          <input type="email" value={authEmail} onChange={(event) => onEmailChange(event.target.value)} required />
        </label>
        <label>
          Contrasena
          <input type="password" minLength={6} value={authPassword} onChange={(event) => onPasswordChange(event.target.value)} required />
        </label>
        <button className="primary-action" disabled={isSaving}>
          {isSaving ? "Entrando..." : "Entrar"}
        </button>
        <p className="access-note">Las cuentas se activan manualmente para mantener el portal privado.</p>
        {message && <p className="form-message">{message}</p>}
      </form>
    </main>
  );
}

export function AppHeader({ displayName, activeView, onViewChange, onSignOut }) {
  const views = [
    { key: "today", label: "Hoy", Icon: Sun },
    { key: "habits", label: "Habitos", Icon: RotateCcw },
    { key: "training", label: "Entreno", Icon: Dumbbell },
    { key: "progress", label: "Progreso", Icon: ChartNoAxesColumn },
    { key: "settings", label: "Ajustes", Icon: SlidersHorizontal },
  ];

  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">Portal Diario</p>
        <h1>{displayName}</h1>
      </div>
      <nav className="app-nav" aria-label="Secciones del portal">
        {views.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            className={`${activeView === key ? "active" : ""} nav-${key}`}
            aria-current={activeView === key ? "page" : undefined}
            onClick={() => onViewChange(key)}
          >
            <Icon size={18} strokeWidth={2.4} />
            <span className="nav-label">{label}</span>
          </button>
        ))}
      </nav>
      <div className="topbar-actions">
        <span className="user-pill" aria-hidden="true">{displayName.slice(0, 1)}</span>
        <button className="ghost-action compact" onClick={onSignOut}>
          <LogOut size={15} strokeWidth={2.4} />
          Salir
        </button>
      </div>
    </header>
  );
}

export function TodayDashboard({
  achievements,
  completionRate,
  completedToday,
  displayName,
  dueHabits,
  latestMeasurement,
  logsByKey,
  motivation,
  routinePlan,
  stats,
  storedWorkout,
  today,
  todayWorkout,
  onSelectView,
  onStartWorkout,
  onToggleHabit,
}) {
  const remaining = Math.max(0, dueHabits.length - completedToday);
  const emptyHabits = dueHabits.length === 0;
  const dayComplete = !emptyHabits && completionRate === 100;

  return (
    <section className="today-layout">
      <div className={`today-hero ${dayComplete ? "is-complete" : ""}`}>
        <span className="panel-kicker">Hoy</span>
        <h2>{emptyHabits ? `${displayName}, configura tu primer habito.` : remaining ? `${displayName}, quedan ${remaining} habitos.` : `${displayName}, dia completo.`}</h2>
        <p>
          {emptyHabits
            ? "Cuando actives tus habitos, este panel se convierte en tu lista diaria."
            : remaining
            ? "Marca lo importante sin ruido. Si el entreno toca hoy, aparece como una pieza mas del dia."
            : "La base de hoy esta cerrada. Puedes anadir una nota, revisar progreso o dejarlo aqui."}
        </p>
        <div className="completion-meter" aria-label={`Progreso diario ${completionRate}%`}>
          <span style={{ width: `${completionRate}%` }} />
        </div>
        <div className="focus-row">
          <span>{completionRate}% completado</span>
          <span>{dueHabits.length || 0} habitos previstos</span>
          <span>{today}</span>
        </div>
        <div className="hero-actions">
          <button className="primary-action" onClick={() => onSelectView("habits")}>
            Revisar habitos
          </button>
          <button className="secondary-action" onClick={() => onSelectView("progress")}>
            Check-in rapido
          </button>
        </div>
      </div>

      <aside className="daily-panel">
        <div className="stat-line">
          <strong>{stats.streak}</strong>
          <span>racha</span>
        </div>
        <div className="stat-line">
          <strong>{stats.weekCompleted}</strong>
          <span>ultimos 7 dias</span>
        </div>
        <div className="stat-line">
          <strong>{stats.longestStreak}</strong>
          <span>mejor racha</span>
        </div>
      </aside>

      <MotivationPanel
        completionRate={completionRate}
        latestMeasurement={latestMeasurement}
        motivation={motivation}
        nextAchievement={stats.nextAchievement}
        perfectWeekCount={stats.perfectWeekCount}
        streak={stats.streak}
      />

      <div className="today-list">
        <div className="section-line">
          <div>
            <span className="panel-kicker">Habitos de hoy</span>
            <h2>Lista diaria</h2>
          </div>
          <button className="ghost-action compact" onClick={() => onSelectView("habits")}>
            Editar
          </button>
        </div>
        {dueHabits.map((habit) => (
          <HabitRow
            key={habit.id}
            habit={habit}
            completed={Boolean(logsByKey[`${habit.id}:${today}`])}
            onToggle={() => onToggleHabit(habit)}
          />
        ))}
        {!dueHabits.length && <p className="empty-state">Activa algun habito para empezar a construir tu panel diario.</p>}
      </div>

      <div className="training-callout">
        <span className="panel-kicker">Entreno</span>
        <h2>{todayWorkout ? "Entreno registrado" : routinePlan.title}</h2>
        <p>{todayWorkout ? "El bloque de fuerza ya esta guardado para hoy." : routinePlan.promise}</p>
        <div className="focus-row">
          <span>{routinePlan.duration}</span>
          <span>{routinePlan.exercises.length} ejercicios</span>
        </div>
        <button className="primary-action" onClick={onStartWorkout}>
          {storedWorkout ? "Continuar entreno" : todayWorkout ? "Entrenar extra" : "Comenzar entreno"}
        </button>
      </div>

      <AchievementShelf achievements={achievements} />
    </section>
  );
}

export function MotivationPanel({ completionRate, latestMeasurement, motivation, nextAchievement, perfectWeekCount, streak }) {
  return (
    <section className="motivation-panel">
      <div className="section-line">
        <div>
          <span className="panel-kicker">Motivacion</span>
          <h2>Continuidad</h2>
        </div>
        <Flame size={22} strokeWidth={2.4} />
      </div>
      <p>{motivation}</p>
      <div className="motivation-grid">
        <span>
          <strong>{streak}</strong>
          racha actual
        </span>
        <span>
          <strong>{perfectWeekCount}/5</strong>
          dias redondos
        </span>
        <span>
          <strong>{latestMeasurement?.weight ? `${latestMeasurement.weight} kg` : "-"}</strong>
          ultimo peso
        </span>
      </div>
      {nextAchievement && (
        <div className="next-achievement">
          <AchievementIcon icon={nextAchievement.icon} />
          <div>
            <span>Siguiente logro</span>
            <strong>{nextAchievement.title}</strong>
            <small>
              {nextAchievement.current}/{nextAchievement.target} · {completionRate}% del dia
            </small>
          </div>
        </div>
      )}
    </section>
  );
}

export function AchievementShelf({ achievements = [] }) {
  const unlocked = achievements.filter((achievement) => achievement.unlocked);
  const locked = achievements.filter((achievement) => !achievement.unlocked);
  const visible = [...unlocked.slice(-4).reverse(), ...locked.slice(0, Math.max(0, 8 - unlocked.slice(-4).length))];

  return (
    <section className="achievement-shelf">
      <div className="section-line">
        <div>
          <span className="panel-kicker">Logros</span>
          <h2>Insignias desbloqueables</h2>
        </div>
        <span className="achievement-count">{unlocked.length}/{achievements.length}</span>
      </div>
      <div className="achievement-grid">
        {visible.map((achievement) => (
          <article key={achievement.key} className={`achievement-badge tone-${achievement.tone} ${achievement.unlocked ? "unlocked" : "locked"} ${achievement.isNew ? "is-new" : ""}`}>
            <AchievementIcon icon={achievement.icon} />
            <div>
              <strong>{achievement.title}</strong>
              <span>{achievement.description}</span>
              <i>
                {achievement.unlocked ? "Desbloqueado" : `${achievement.current}/${achievement.target}`}
              </i>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function AchievementIcon({ icon }) {
  return (
    <svg className={`achievement-icon icon-${icon}`} viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="24" r="21" />
      {icon === "spark" && <path d="M24 10l4 10 10 4-10 4-4 10-4-10-10-4 10-4z" />}
      {icon === "flame" && <path d="M25 39c7-2 10-7 8-13-1-4-4-7-5-12-5 3-6 8-5 12-3-2-4-5-4-8-5 4-7 9-6 14 1 5 6 8 12 7z" />}
      {icon === "bolt" && <path d="M27 7L13 27h10l-2 14 14-21H25z" />}
      {icon === "crest" && <path d="M12 15l12-6 12 6v10c0 8-5 13-12 16-7-3-12-8-12-16z" />}
      {icon === "crown" && <path d="M10 18l8 7 6-12 6 12 8-7-3 18H13z" />}
      {icon === "ring" && <path d="M24 12a12 12 0 1012 12A12 12 0 0024 12zm0 8a4 4 0 11-4 4 4 4 0 014-4z" />}
      {icon === "stack" && <path d="M12 16l12-7 12 7-12 7zm0 8l12 7 12-7M12 32l12 7 12-7" />}
      {icon === "peak" && <path d="M9 36l11-24 8 14 4-7 7 17z" />}
      {icon === "pulse" && <path d="M8 25h8l4-11 8 22 4-11h8" />}
      {icon === "lens" && <path d="M14 17h20v18H14zm10 14a5 5 0 100-10 5 5 0 000 10z" />}
      {icon === "triad" && <path d="M24 9l9 16H15zm-9 30l9-16 9 16z" />}
    </svg>
  );
}

export function HabitsSection({
  habitForm,
  habits,
  logsByKey,
  today,
  onCancelEdit,
  onChangeForm,
  onDeleteHabit,
  onEditHabit,
  onSubmitHabit,
  onToggleHabit,
}) {
  return (
    <section className="workspace-grid">
      <div className="workspace-main">
        <div className="section-line">
          <div>
            <span className="panel-kicker">Habitos</span>
            <h2>Rutina configurable</h2>
          </div>
        </div>
        <div className="habit-list">
          {habits.map((habit) => (
            <HabitRow
              key={habit.id}
              habit={habit}
              completed={Boolean(logsByKey[`${habit.id}:${today}`])}
              showActions
              onDelete={() => onDeleteHabit(habit)}
              onEdit={() => onEditHabit(habit)}
              onToggle={() => onToggleHabit(habit)}
            />
          ))}
          {!habits.length && <p className="empty-state">Todavia no tienes habitos. Empieza con algo sencillo y repetible.</p>}
        </div>
      </div>

      <form className="side-panel" onSubmit={onSubmitHabit}>
        <span className="panel-kicker">{habitForm.id ? "Editar habito" : "Nuevo habito"}</span>
        <label>
          Nombre
          <input value={habitForm.title} onChange={(event) => onChangeForm({ title: event.target.value })} placeholder="Tomar creatina" required />
        </label>
        <div className="field-grid two">
          <label>
            Categoria
            <select value={habitForm.category} onChange={(event) => onChangeForm({ category: event.target.value })}>
              {categoryOptions.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </label>
          <label>
            Color
            <select value={habitForm.color_key} onChange={(event) => onChangeForm({ color_key: event.target.value })}>
              {colorOptions.map((color) => (
                <option key={color.key} value={color.key}>
                  {color.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="field-grid two">
          <label>
            Frecuencia
            <select value={habitForm.frequency_type} onChange={(event) => onChangeForm({ frequency_type: event.target.value })}>
              <option value="daily">Diaria</option>
              <option value="weekly">Dias concretos</option>
            </select>
          </label>
          <label>
            Objetivo
            <input
              inputMode="decimal"
              value={habitForm.target_count}
              onChange={(event) => onChangeForm({ target_count: event.target.value })}
              placeholder="1"
            />
          </label>
        </div>
        <label>
          Unidad
          <input value={habitForm.target_unit} onChange={(event) => onChangeForm({ target_unit: event.target.value })} placeholder="dosis, min, L..." />
        </label>
        {habitForm.frequency_type === "weekly" && (
          <div className="weekday-picker">
            {weekdayOptions.map((day) => {
              const active = habitForm.days_of_week.includes(day.value);
              return (
                <button
                  key={day.value}
                  type="button"
                  className={active ? "active" : ""}
                  aria-pressed={active}
                  onClick={() => {
                    const next = active
                      ? habitForm.days_of_week.filter((value) => value !== day.value)
                      : [...habitForm.days_of_week, day.value].sort();
                    onChangeForm({ days_of_week: next });
                  }}
                >
                  {day.label}
                </button>
              );
            })}
          </div>
        )}
        <label className="toggle-row">
          <input type="checkbox" checked={habitForm.is_active} onChange={(event) => onChangeForm({ is_active: event.target.checked })} />
          Activo en el portal
        </label>
        <div className="form-actions">
          <button className="primary-action">{habitForm.id ? "Guardar cambios" : "Crear habito"}</button>
          {habitForm.id && (
            <button className="ghost-action" type="button" onClick={onCancelEdit}>
              Cancelar
            </button>
          )}
        </div>
      </form>
    </section>
  );
}

export function HabitRow({ completed, habit, onDelete, onEdit, onToggle, showActions = false }) {
  return (
    <article className={`habit-row ${completed ? "done" : ""} tone-${habit.color_key || "sage"} ${habit.is_active ? "" : "disabled"}`}>
      <button type="button" className="check-dot" onClick={onToggle} aria-label={completed ? "Desmarcar habito" : "Completar habito"} aria-pressed={completed}>
        {completed ? "✓" : ""}
      </button>
      <div>
        <strong>{habit.title}</strong>
        <span>
          {habit.category} · {habit.frequency_type === "weekly" ? "dias concretos" : "diario"}
          {habit.target_unit ? ` · ${habit.target_count || 1} ${habit.target_unit}` : ""}
          {!habit.is_active ? " · pausado" : ""}
        </span>
      </div>
      {showActions && (
        <div className="row-actions">
          <button type="button" className="ghost-action compact" onClick={onEdit}>
            Editar
          </button>
          <button type="button" className="danger-action compact" onClick={onDelete}>
            Borrar
          </button>
        </div>
      )}
    </article>
  );
}

export function TrainingSection({ quickItems = quickPlan, routinePlan, storedWorkout, todayWorkout, workouts, onDeleteWorkout, onStartWorkout }) {
  return (
    <section className="workspace-grid">
      <div className="workspace-main">
        <div className="section-line">
          <div>
            <span className="panel-kicker">Entreno</span>
            <h2>{routinePlan.title}</h2>
          </div>
          <button className="primary-action" onClick={onStartWorkout}>
            {storedWorkout ? "Continuar" : "Comenzar"}
          </button>
        </div>
        <p className="section-copy">{todayWorkout ? "Ya hay un entreno guardado hoy. Puedes hacer otro bloque si te encaja." : routinePlan.promise}</p>
        <div className="exercise-grid">
          {routinePlan.exercises.map((exercise, index) => (
            <article key={exercise.name} className="exercise-tile">
              <FrameStack frames={framesFor(exercise)} alt={exercise.name} />
              <div>
                <span className="exercise-index">{index + 1}</span>
                <h3>{exercise.name}</h3>
                <p>
                  {exercise.sets} x {exercise.reps} · descanso {exercise.rest}s
                </p>
                <ExerciseTags exercise={exercise} />
                {exercise.referenceUrl && (
                  <a className="reference-link" href={exercise.referenceUrl} target="_blank" rel="noreferrer">
                    Ver tecnica
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>

      <aside className="side-panel">
        <span className="panel-kicker">Express</span>
        <h2>Cuando hay poco tiempo</h2>
        <ul className="quick-list">
          {quickItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <div className="history-list">
          <h3>Ultimos entrenos</h3>
          {workouts.slice(0, 8).map((item) => (
            <article key={item.id}>
              <div>
                <strong>{formatShortDate(item.date)}</strong>
                <span>
                  {item.activity} · {item.duration || "-"} min
                </span>
              </div>
              <button className="danger-action compact" onClick={() => onDeleteWorkout(item.id)}>Borrar</button>
            </article>
          ))}
          {!workouts.length && <p className="empty-state">Aun no hay entrenos guardados.</p>}
        </div>
      </aside>
    </section>
  );
}

export function ProgressSection({
  measureForm,
  measurements,
  photoDate,
  photoNote,
  photos,
  photoStorage,
  isSaving,
  onDeletePhoto,
  onMeasureChange,
  onPhotoDateChange,
  onPhotoNoteChange,
  onSaveMeasurement,
  onSetupPhotoStorage,
  onUploadPhotos,
}) {
  return (
    <section id="checkin" className="workspace-grid">
      <form className="workspace-main" onSubmit={onSaveMeasurement}>
        <span className="panel-kicker">Check-in</span>
        <h2>Peso, cintura y nota</h2>
        <p className="section-copy">Datos ligeros por fecha. Sirven para ver direccion, no para obsesionarse con cada dia.</p>
        <div className="field-grid">
          <label>
            Fecha
            <input type="date" value={measureForm.date} onChange={(event) => onMeasureChange({ date: event.target.value })} />
          </label>
          <label>
            Peso kg
            <input inputMode="decimal" value={measureForm.weight} onChange={(event) => onMeasureChange({ weight: event.target.value })} placeholder="100" />
          </label>
          <label>
            Cintura cm
            <input inputMode="decimal" value={measureForm.waist} onChange={(event) => onMeasureChange({ waist: event.target.value })} placeholder="Ombligo" />
          </label>
        </div>
        <label>
          Nota
          <textarea value={measureForm.note} onChange={(event) => onMeasureChange({ note: event.target.value })} placeholder="Sueno, energia, comidas..." />
        </label>
        <button className="primary-action" disabled={isSaving}>
          Guardar check-in
        </button>

        <div className="trend-grid">
          <div>
            <span>Peso</span>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none">
              <polyline points={trendPoints(measurements, "weight")} />
            </svg>
          </div>
          <div>
            <span>Cintura</span>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none">
              <polyline points={trendPoints(measurements, "waist")} />
            </svg>
          </div>
        </div>
      </form>

      <aside className="side-panel">
        <span className="panel-kicker">Progreso visual</span>
        <h2>Fotos comparables</h2>
        {photoStorage.checked && !photoStorage.ready && (
          <div className="storage-warning">
            <strong>Almacenamiento pendiente</strong>
            <span>{photoStorage.message || "Prepara el espacio de imagenes antes de guardar fotos."}</span>
            <button className="ghost-action compact" type="button" onClick={onSetupPhotoStorage} disabled={photoStorage.isSettingUp}>
              {photoStorage.isSettingUp ? "Preparando..." : "Preparar almacenamiento"}
            </button>
          </div>
        )}
        <div className="field-grid two">
          <label>
            Fecha
            <input type="date" value={photoDate} onChange={(event) => onPhotoDateChange(event.target.value)} />
          </label>
          <label>
            Nota
            <input value={photoNote} onChange={(event) => onPhotoNoteChange(event.target.value)} placeholder="Frontal, manana..." />
          </label>
        </div>
        <label className="upload-zone">
          <input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple onChange={onUploadPhotos} disabled={isSaving} />
          <strong>Elegir imagenes</strong>
          <span>JPG, PNG, WEBP o HEIC</span>
        </label>
        <div className="photo-grid">
          {photos.map((photo) => (
            <figure key={photo.id}>
              {photo.signedUrl ? <img src={photo.signedUrl} alt={photo.note || "Foto de progreso"} /> : <div className="photo-fallback">Sin preview</div>}
              <figcaption>
                {formatShortDate(photo.date)} · {photo.note || "sin nota"}
              </figcaption>
              <button className="danger-action compact" onClick={() => onDeletePhoto(photo)}>Eliminar</button>
            </figure>
          ))}
          {!photos.length && <p className="empty-state">Sin imagenes todavia.</p>}
        </div>
      </aside>
    </section>
  );
}

export function CalendarSection({ calendarDays, habitLogDates, month, today, trackingStart, workoutDates, onMonthChange, onSelectDate }) {
  return (
    <section className="calendar-section">
      <div className="section-line">
        <div>
          <span className="panel-kicker">Calendario</span>
          <h2>{monthLabel(month)}</h2>
        </div>
        <div className="month-controls">
          <button className="icon-button" aria-label="Mes anterior" onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>
            <ChevronLeft size={18} strokeWidth={2.6} />
          </button>
          <button className="ghost-action compact" onClick={() => onMonthChange(new Date())}>Hoy</button>
          <button className="icon-button" aria-label="Mes siguiente" onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>
            <ChevronRight size={18} strokeWidth={2.6} />
          </button>
        </div>
      </div>
      <div className="weekday-row">{["L", "M", "X", "J", "V", "S", "D"].map((day) => <span key={day}>{day}</span>)}</div>
      <div className="month-grid">
        {calendarDays.map((date) => {
          const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
          const inMonth = date.getMonth() === month.getMonth();
          const hasWorkout = workoutDates.has(iso);
          const hasHabits = habitLogDates.has(iso);
          const beforeStart = iso < trackingStart;
          const missed = inMonth && iso < today && iso >= trackingStart && !hasWorkout && !hasHabits;
          return (
            <button
              key={iso}
              className={`month-day ${inMonth ? "" : "muted"} ${beforeStart ? "before-start" : ""} ${hasWorkout || hasHabits ? "done" : ""} ${missed ? "missed" : ""} ${iso === today ? "today" : ""}`}
              onClick={() => onSelectDate(iso)}
            >
              <strong>{date.getDate()}</strong>
              <span>{hasWorkout ? "Entreno" : hasHabits ? "Habitos" : beforeStart ? "Sin datos" : missed ? "Pendiente" : "Plan"}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function SettingsSection({ profile, activeHabits, themeMode, onThemeModeChange, onChangeProfile, onSaveProfile }) {
  return (
    <section className="workspace-grid">
      <form className="workspace-main" onSubmit={onSaveProfile}>
        <span className="panel-kicker">Ajustes</span>
        <h2>Portal personal</h2>
        <p className="section-copy">El objetivo y el tema ajustan el tono del panel sin cambiar tus datos.</p>
        <label>
          Objetivo principal
          <input value={profile.primary_goal || ""} onChange={(event) => onChangeProfile({ primary_goal: event.target.value })} />
        </label>
        <label>
          Tema visual
          <select value={profile.theme_key || "calm"} onChange={(event) => onChangeProfile({ theme_key: event.target.value })}>
            {themeOptions.map((theme) => (
              <option key={theme.key} value={theme.key}>
                {theme.label}
              </option>
            ))}
          </select>
        </label>
        <div>
          <label style={{ marginBottom: "8px" }}>Apariencia</label>
          <div className="theme-toggle" role="group" aria-label="Modo claro u oscuro">
            {themeModeOptions.map((mode) => (
              <button
                key={mode.key}
                type="button"
                className={themeMode === mode.key ? "active" : ""}
                aria-pressed={themeMode === mode.key}
                onClick={() => onThemeModeChange(mode.key)}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>
        <button className="primary-action">Guardar ajustes</button>
      </form>
      <aside className="side-panel">
        <span className="panel-kicker">Activos</span>
        <h2>{activeHabits.length} habitos visibles</h2>
        <div className="theme-swatches">
          {themeOptions.map((theme) => (
            <span key={theme.key} className={profile.theme_key === theme.key ? "active" : ""} style={{ "--swatch": theme.swatch }}>
              {theme.label}
            </span>
          ))}
        </div>
      </aside>
    </section>
  );
}

export function WorkoutPlayer({
  activeDoneSets,
  activeElapsed,
  activeExercise,
  activeRestLeft,
  activeWorkout,
  countdownCue,
  isSaving,
  lastWorkout,
  motionMessage,
  routinePlan,
  shakeEnabled,
  soundEnabled,
  wakeLockStatus,
  onAddRest,
  onClear,
  onFinish,
  onMarkSet,
  onMoveExercise,
  onSkipRest,
  onToggleShake,
  onToggleSound,
}) {
  const [showSummary, setShowSummary] = useState(false);

  if (!activeWorkout) return null;

  const exercises = routinePlan.exercises;
  const totalTargetSets = exercises.reduce((sum, item) => sum + (item.sets || 0), 0);
  const totalDoneSets = countCompletedSets(activeWorkout.completedSets);
  const sessionPercent = totalTargetSets ? Math.round((totalDoneSets / totalTargetSets) * 100) : 0;
  const exercisesDone = exercises.filter((item) => (activeWorkout.completedSets[item.name] || 0) >= item.sets).length;
  const nextExercise = exercises[activeWorkout.exerciseIndex + 1] || null;
  const isResting = activeRestLeft > 0;
  const exerciseComplete = activeExercise ? activeDoneSets >= activeExercise.sets : false;

  return (
    <div className="workout-modal" role="dialog" aria-modal="true" aria-label="Entrenamiento en curso">
      <div className="workout-player">
        {countdownCue && <div className="countdown-overlay">{countdownCue}</div>}

        <header className="player-header">
          <button className="icon-button" aria-label="Cerrar entreno" onClick={onClear}>
            <X size={18} strokeWidth={2.6} />
          </button>
          <div className="player-header-info">
            <span>Ejercicio {activeWorkout.exerciseIndex + 1} / {exercises.length}</span>
            <strong>{secondsLabel(activeElapsed)}</strong>
          </div>
          <button className={`icon-button ${soundEnabled ? "is-on" : ""}`} aria-label={soundEnabled ? "Silenciar" : "Activar sonido"} aria-pressed={soundEnabled} onClick={onToggleSound}>
            {soundEnabled ? "🔊" : "🔈"}
          </button>
        </header>

        <div className="player-progress" aria-hidden="true">
          <span style={{ width: `${sessionPercent}%` }} />
        </div>

        {activeExercise && (
          <div className="player-scroll">
            <div className="player-media">
              <FrameStack frames={framesFor(activeExercise)} alt={activeExercise.name} />
              <div className="media-name">{activeExercise.name}</div>
            </div>
            <div className="player-body">
              <ExerciseTags exercise={activeExercise} />
              <p className="cue">{activeExercise.cue}</p>

              {lastWorkout && (
                <span className="last-time">
                  Ultima vez: {formatShortDate(lastWorkout.date)} · {lastWorkout.duration || "-"} min
                </span>
              )}

              <div className="set-counter" aria-label={`${activeDoneSets} de ${activeExercise.sets} series`}>
                {Array.from({ length: activeExercise.sets }, (_, index) => (
                  <i key={index} className={index < activeDoneSets ? "on" : ""} />
                ))}
              </div>
              <strong className="rep-line">
                {activeExercise.sets} x {activeExercise.reps}
                <small>{exerciseComplete ? "Ejercicio completo" : `Serie ${Math.min(activeDoneSets + 1, activeExercise.sets)} de ${activeExercise.sets}`}</small>
              </strong>

              <div className={`timer-box ${isResting ? "is-resting" : ""}`}>
                <span>{isResting ? "Descanso" : "Listo para serie"}</span>
                <strong>{secondsLabel(activeRestLeft)}</strong>
              </div>

              {nextExercise && (
                <span className="last-time">Siguiente: {nextExercise.name}</span>
              )}

              <div className="player-toggles">
                <button type="button" className={`ghost-action compact ${shakeEnabled ? "is-on" : ""}`} aria-pressed={shakeEnabled} onClick={onToggleShake}>
                  {shakeEnabled ? "Agitar ON" : "Agitar para serie"}
                </button>
                <span>{wakeLockStatus === "active" ? "Pantalla activa" : wakeLockStatus === "unsupported" ? "Sin Wake Lock" : ""}</span>
                {motionMessage && <span>{motionMessage}</span>}
              </div>
            </div>
          </div>
        )}

        <footer className="player-footer">
          {isResting ? (
            <>
              <button className="primary-action" onClick={onSkipRest}>
                Saltar descanso
              </button>
              <div className="player-footer-row">
                <button className="ghost-action" onClick={() => onAddRest(30)}>
                  +30s descanso
                </button>
                <button className="ghost-action" onClick={() => setShowSummary(true)} disabled={isSaving}>
                  Terminar
                </button>
              </div>
            </>
          ) : (
            <>
              <button className="primary-action" onClick={() => onMarkSet("tap")} disabled={!activeExercise || exerciseComplete}>
                {exerciseComplete ? "Ejercicio completo" : "Serie hecha"}
              </button>
              <div className="player-footer-row">
                <div className="player-nav">
                  <button className="icon-button" aria-label="Ejercicio anterior" onClick={() => onMoveExercise(-1)} disabled={activeWorkout.exerciseIndex === 0}>
                    <ChevronLeft size={18} strokeWidth={2.6} />
                  </button>
                  <button className="icon-button" aria-label="Ejercicio siguiente" onClick={() => onMoveExercise(1)} disabled={activeWorkout.exerciseIndex === exercises.length - 1}>
                    <ChevronRight size={18} strokeWidth={2.6} />
                  </button>
                </div>
                <button className="ghost-action" onClick={() => setShowSummary(true)} disabled={isSaving}>
                  Terminar
                </button>
              </div>
            </>
          )}
        </footer>

        {showSummary && (
          <div className="player-summary">
            <div>
              <span className="panel-kicker">Resumen</span>
              <h2>{totalDoneSets >= totalTargetSets ? "Entreno completo" : "Buen trabajo"}</h2>
            </div>
            <div className="summary-stats">
              <div>
                <strong>{totalDoneSets}</strong>
                <span>series</span>
              </div>
              <div>
                <strong>{secondsLabel(activeElapsed)}</strong>
                <span>tiempo</span>
              </div>
              <div>
                <strong>{exercisesDone}/{exercises.length}</strong>
                <span>ejercicios</span>
              </div>
            </div>
            <div className="summary-actions">
              <button className="primary-action" disabled={isSaving} onClick={() => { setShowSummary(false); onFinish(); }}>
                {isSaving ? "Guardando..." : "Guardar entreno"}
              </button>
              <button className="ghost-action" disabled={isSaving} onClick={() => setShowSummary(false)}>
                Seguir entrenando
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
