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
```

En Vercel añade las mismas variables en `Project Settings -> Environment Variables`.

## Supabase

1. Abre Supabase SQL Editor.
2. Ejecuta el contenido de `supabase/schema.sql`.
3. En Authentication, activa Email/Password.
4. En Authentication -> URL Configuration:
   - Site URL: tu dominio de Vercel, por ejemplo `https://tu-app.vercel.app`
   - Redirect URLs: añade `https://tu-app.vercel.app/auth/callback` y `http://localhost:3000/auth/callback`
5. Si quieres entrar sin confirmar correo durante pruebas, revisa la opción de confirmación de email en Supabase Auth.

El esquema crea:

- `workouts`: entrenos por usuario.
- `measurements`: peso, cintura y notas por fecha.
- `progress_photos`: metadatos de fotos.
- Bucket privado `progress-photos`.
- Políticas RLS para que cada usuario solo lea y escriba sus propios datos.

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
- Auth: crea una cuenta, confirma el correo y vuelve a la app por `/auth/callback`.
- Entrenos: pulsa `Comenzar entreno`, marca alguna serie y termina. Debe aparecer en `workouts`.
- Medidas: guarda peso/cintura. Debe aparecer en `measurements`.
- Fotos: sube una imagen. Debe aparecer un objeto en el bucket `progress-photos` y una fila en `progress_photos`.
