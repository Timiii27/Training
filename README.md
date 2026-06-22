# Summer Body

App de seguimiento físico para entrenar, registrar progreso y ver continuidad sin depender de hojas de cálculo.

## Enfoque actual

- Una sesión principal repetible de `30-40 min`: flexiones, variantes de empuje y core.
- Un modo express de `15 min` para días con poco tiempo.
- Check-in corporal independiente del entrenamiento: puedes medir peso/cintura antes de entrenar y completar la sesión después.
- Calendario mensual para ver días hechos, pendientes y fallados.
- Imágenes de progreso comparables en el mismo panel.

## Desarrollo local

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

La versión antigua con JSON local sigue disponible solo como respaldo:

```bash
npm run local:json
```

## Variables de entorno

Copia `.env.example` a `.env.local` y rellena:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

En Vercel añade las mismas variables en `Project Settings -> Environment Variables`.

`SUPABASE_SERVICE_ROLE_KEY` es privada y solo se usa en rutas de servidor. No debe llevar prefijo `NEXT_PUBLIC`.

## Supabase

1. En Authentication, activa Email/Password.
2. En Authentication -> URL Configuration:
   - Site URL: tu dominio de Vercel, por ejemplo `https://tu-app.vercel.app`
   - Redirect URLs: añade `https://tu-app.vercel.app/auth/callback` y `http://localhost:3000/auth/callback`
3. Para uso privado, desactiva el registro público en Authentication -> Providers -> Email:
   - Desactiva `Allow new users to sign up` o `Enable sign ups`, según cómo lo muestre tu panel.
4. Crea usuarios manualmente desde Authentication -> Users -> Add user:
   - Email
   - Password temporal o definitivo
   - Activa `Auto Confirm User` para no depender del correo de confirmación.

La app lee estas tablas si existen en tu Supabase:

- `workouts`: entrenos por usuario.
- `measurements`: peso, cintura y notas por fecha.
- `progress_photos`: metadatos de fotos.
- `routine_templates`: rutinas activas por usuario.
- `routine_exercises`: ejercicios, orden, series, reps, descanso e imágenes.
- Bucket privado `progress-photos`.

Si `routine_templates` o `routine_exercises` no existen todavía, la app usa la rutina de respaldo incluida en el código.

La app puede preparar automáticamente el bucket `progress-photos` desde el backend si `SUPABASE_SERVICE_ROLE_KEY` está configurada.

## Vercel

El proyecto usa Next.js y `vercel.json` solo fuerza el framework:

```json
{
  "framework": "nextjs"
}
```

Vercel ejecutará `next build` automáticamente. No subas `.env.local`; ya está ignorado por git.

## Comprobar que funciona

- Healthcheck: abre `/api/health`. Debe devolver `ok: true` y las variables de Supabase en `true`.
- Auth: crea un usuario manual, entra con email y contraseña.
- Entrenos: pulsa `Comenzar entreno`, marca alguna serie y termina. Debe aparecer en `workouts`.
- Rutina: si existen `routine_templates` y `routine_exercises`, la app carga la activa; si no, usa la rutina integrada.
- Medidas: guarda peso/cintura. Debe aparecer en `measurements`.
- Fotos: pulsa `Preparar almacenamiento` si aparece, sube una imagen y comprueba bucket `progress-photos` + fila en `progress_photos`.
- Player: en móvil comprueba scroll, timer total, descanso, sonido, Wake Lock y agitar para marcar serie.
