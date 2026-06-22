# Summer Body · Training Log

App Next.js para seguir una rutina simple de pecho y abdomen, guardar entrenos, registrar peso/cintura y subir fotos privadas con Supabase.

## Enfoque actual

- Una sesión principal repetible de `30-40 min`: flexiones, variantes de empuje y core.
- Un modo express de `15 min` para días con poco tiempo.
- Check-in corporal independiente del entrenamiento: puedes medir peso/cintura antes de entrenar y completar la sesión después.
- Calendario mensual para ver días hechos, pendientes y fallados.
- Fotos en Supabase Storage privado. Los HEIC se convierten a JPG en el navegador antes de subir.

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
4. Si quieres entrar sin confirmar correo durante pruebas, revisa la opción de confirmación de email en Supabase Auth.

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
