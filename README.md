# Summer Body · Training Log

Visor web local para seguir un bloque físico simple de 30-40 minutos, casi sin material, registrar entrenamientos, consultar gráficos y guardar fotos opcionales de progreso.

## Entrenamiento guiado

- El dashboard muestra la sesión base diaria pendiente.
- La vista `Calendario` muestra el mes completo: entrenamientos hechos, recuperados, fallados, pendientes y descansos.
- Las sesiones de fuerza falladas se pueden recuperar desde su propia casilla mensual.
- Pulsa `Comenzar sesión` para abrir el modo guiado.
- Cada ejercicio incluye referencia fotográfica local, series, repeticiones, descanso y una clave técnica.
- Al marcar una serie empieza el temporizador de descanso. Puedes añadir `30 s` o saltarlo.
- Al terminar, la app guarda automáticamente el entrenamiento completo o parcial en el diario.
- Si recargas la página durante una sesión, el progreso del entrenamiento se conserva en el navegador.

## Enfoque actual

- `A`: sesión diaria de pecho y abdomen sin material.
- `Express`: 15-20 minutos para días con poco tiempo.
- Bote, bici y cardio se mantienen como complemento opcional.

## Abrir la app

### Local con servidor de archivos y JSON

```bash
npm start
```

Después abre [http://127.0.0.1:4173](http://127.0.0.1:4173).

`127.0.0.1` es solo para desarrollo local. En Vercel no se usa ese servidor.

### Primera subida a Vercel

El proyecto incluye `vercel.json` para publicar `public/` como app estática:

- Build command: `npm run check`
- Output directory: `public`

Mientras no conectemos Supabase, la versión en Vercel funciona en modo temporal: guarda entrenos y fotos en `localStorage` del navegador. Es útil para probar la interfaz online, pero no sincroniza entre dispositivos ni usuarios.

## Dónde se guardan los datos

- `data/entries.json`: fuente estructurada para gráficos y estadísticas.
- `data/journal.md`: diario legible regenerado automáticamente.
- `data/photos.json`: metadatos de fotos.
- `data/photos/`: fotos opcionales, solo en local.

Las fotos no se suben a ningún servicio externo. Para comparar cambios físicos, suele bastar con añadir una foto frontal o lateral cada 2-4 semanas en condiciones parecidas.
