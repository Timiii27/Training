import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { extname, join, normalize } from "node:path";
import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const ROOT = new URL(".", import.meta.url).pathname;
const PUBLIC_DIR = join(ROOT, "public");
const DATA_DIR = join(ROOT, "data");
const PHOTOS_DIR = join(DATA_DIR, "photos");
const ENTRIES_FILE = join(DATA_DIR, "entries.json");
const PHOTOS_FILE = join(DATA_DIR, "photos.json");
const JOURNAL_FILE = join(DATA_DIR, "journal.md");
const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || "127.0.0.1";

const allowedEntryTypes = new Set(["strength", "cardio", "court", "measure", "rest"]);
const allowedStatus = new Set(["completed", "partial", "planned", "rest"]);
const photoExtensions = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/heic": ".heic", "image/heif": ".heif" };
const runFile = promisify(execFile);

await ensureData();

function send(res, status, body, contentType = "application/json; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": contentType,
    "Cache-Control": "no-store",
  });
  res.end(contentType.startsWith("application/json") ? JSON.stringify(body) : body);
}

async function ensureData() {
  await mkdir(PHOTOS_DIR, { recursive: true });
  await ensureJson(ENTRIES_FILE, []);
  await ensureJson(PHOTOS_FILE, []);
  await regenerateJournal();
}

async function ensureJson(path, fallback) {
  try {
    await stat(path);
  } catch {
    await writeJson(path, fallback);
  }
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function writeJson(path, value) {
  const temp = `${path}.tmp`;
  await writeFile(temp, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temp, path);
}

function cleanText(value, maxLength = 300) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function optionalNumber(value, min, max) {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) return null;
  return Math.round(number * 10) / 10;
}

function isoDate(value) {
  const normalized = cleanText(value, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : new Date().toISOString().slice(0, 10);
}

function markdownCell(value) {
  return String(value ?? "").replaceAll("|", "\\|").replaceAll("\n", " ");
}

async function browserFriendlyPhoto(mimeType, bytes, id) {
  if (!["image/heic", "image/heif"].includes(mimeType)) {
    return { bytes, extension: photoExtensions[mimeType] };
  }

  const source = join(PHOTOS_DIR, `${id}.upload${photoExtensions[mimeType]}`);
  const target = join(PHOTOS_DIR, `${id}.converted.jpg`);
  await writeFile(source, bytes);
  try {
    await runFile("/usr/bin/sips", ["-s", "format", "jpeg", source, "--out", target]);
    return { bytes: await readFile(target), extension: ".jpg" };
  } catch {
    return { bytes, extension: photoExtensions[mimeType] };
  } finally {
    await Promise.all([rm(source, { force: true }), rm(target, { force: true })]);
  }
}

async function regenerateJournal() {
  const entries = await readJson(ENTRIES_FILE);
  const photos = await readJson(PHOTOS_FILE);
  const sorted = [...entries].sort((a, b) => `${b.date}${b.createdAt}`.localeCompare(`${a.date}${a.createdAt}`));
  const lines = [
    "# Diario de entrenamiento · Summer Hoops",
    "",
    `Actualizado: ${new Date().toLocaleString("es-ES")}`,
    "",
    "## Registros",
    "",
    "| Fecha | Tipo | Estado | Actividad | Min | Peso | Cintura | Recupera | Notas |",
    "| --- | --- | --- | --- | ---: | ---: | ---: | --- | --- |",
  ];

  if (sorted.length === 0) {
    lines.push("| — | — | — | Todavía no hay registros | — | — | — | — | Empieza con una sesión pequeña y suma el primer día. |");
  } else {
    for (const entry of sorted) {
      lines.push(`| ${markdownCell(entry.date)} | ${markdownCell(entry.type)} | ${markdownCell(entry.status)} | ${markdownCell(entry.activity)} | ${markdownCell(entry.duration ?? "")} | ${markdownCell(entry.weight ?? "")} | ${markdownCell(entry.waist ?? "")} | ${markdownCell(entry.recoveryOf ?? "")} | ${markdownCell(entry.notes ?? "")} |`);
    }
  }

  lines.push("", "## Fotos de progreso", "");
  if (photos.length === 0) {
    lines.push("Todavía no hay fotos. Son opcionales y se guardan únicamente en local.");
  } else {
    for (const photo of [...photos].sort((a, b) => b.date.localeCompare(a.date))) {
      lines.push(`- ${photo.date} · [${photo.filename}](photos/${photo.filename})${photo.note ? ` · ${photo.note}` : ""}`);
    }
  }

  lines.push(
    "",
    "## Recordatorio",
    "",
    "- Si aparece dolor de hombro, sangrado nasal, dificultad respiratoria o síntomas nuevos, para y consulta con un profesional sanitario.",
    "- El plan prioriza constancia, técnica limpia y progresión gradual.",
    "",
  );
  await writeFile(JOURNAL_FILE, lines.join("\n"), "utf8");
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 8_000_000) throw new Error("Payload demasiado grande");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

async function api(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/state") {
    const [entries, photos] = await Promise.all([readJson(ENTRIES_FILE), readJson(PHOTOS_FILE)]);
    return send(res, 200, { entries, photos, journalUrl: "/api/journal.md" });
  }

  if (["GET", "HEAD"].includes(req.method) && url.pathname === "/api/journal.md") {
    const journal = await readFile(JOURNAL_FILE, "utf8");
    if (req.method === "HEAD") {
      res.writeHead(200, { "Content-Type": "text/markdown; charset=utf-8", "Content-Length": Buffer.byteLength(journal) });
      return res.end();
    }
    return send(res, 200, journal, "text/markdown; charset=utf-8");
  }

  if (req.method === "POST" && url.pathname === "/api/entries") {
    const body = await readBody(req);
    const type = allowedEntryTypes.has(body.type) ? body.type : "strength";
    const status = allowedStatus.has(body.status) ? body.status : "completed";
    const duration = optionalNumber(body.duration, 0, 1440);
    const weight = optionalNumber(body.weight, 40, 250);
    const waist = optionalNumber(body.waist, 40, 200);
    const activity = cleanText(body.activity, 80) || (type === "measure" ? "Medidas semanales" : "Sesión libre");
    const entries = await readJson(ENTRIES_FILE);
    const entry = {
      id: randomUUID(),
      date: isoDate(body.date),
      type,
      status,
      activity,
      duration,
      weight,
      waist,
      recoveryOf: /^\d{4}-\d{2}-\d{2}$/.test(cleanText(body.recoveryOf, 10)) ? cleanText(body.recoveryOf, 10) : null,
      notes: cleanText(body.notes, 500),
      createdAt: new Date().toISOString(),
    };
    entries.push(entry);
    await writeJson(ENTRIES_FILE, entries);
    await regenerateJournal();
    return send(res, 201, entry);
  }

  if (req.method === "DELETE" && url.pathname.startsWith("/api/entries/")) {
    const id = url.pathname.split("/").pop();
    const entries = await readJson(ENTRIES_FILE);
    const filtered = entries.filter((entry) => entry.id !== id);
    if (entries.length === filtered.length) return send(res, 404, { error: "Registro no encontrado" });
    await writeJson(ENTRIES_FILE, filtered);
    await regenerateJournal();
    return send(res, 200, { ok: true });
  }

  if (req.method === "POST" && url.pathname === "/api/photos") {
    const body = await readBody(req);
    const match = /^data:(image\/(?:jpeg|png|webp|heic|heif));base64,(.+)$/.exec(body.dataUrl || "");
    if (!match || !photoExtensions[match[1]]) return send(res, 400, { error: "Usa una foto JPG, PNG, WEBP o HEIC." });
    const bytes = Buffer.from(match[2], "base64");
    if (bytes.length > 5_000_000) return send(res, 400, { error: "La foto supera el límite de 5 MB." });
    const id = randomUUID();
    const storedPhoto = await browserFriendlyPhoto(match[1], bytes, id);
    const filename = `${isoDate(body.date)}-${id.slice(0, 8)}${storedPhoto.extension}`;
    await writeFile(join(PHOTOS_DIR, filename), storedPhoto.bytes);
    const photos = await readJson(PHOTOS_FILE);
    const photo = {
      id,
      date: isoDate(body.date),
      filename,
      url: `/photos/${filename}`,
      note: cleanText(body.note, 180),
      createdAt: new Date().toISOString(),
    };
    photos.push(photo);
    await writeJson(PHOTOS_FILE, photos);
    await regenerateJournal();
    return send(res, 201, photo);
  }

  if (req.method === "DELETE" && url.pathname.startsWith("/api/photos/")) {
    const id = url.pathname.split("/").pop();
    const photos = await readJson(PHOTOS_FILE);
    const photo = photos.find((item) => item.id === id);
    if (!photo) return send(res, 404, { error: "Foto no encontrada" });
    await rm(join(PHOTOS_DIR, photo.filename), { force: true });
    await writeJson(PHOTOS_FILE, photos.filter((item) => item.id !== id));
    await regenerateJournal();
    return send(res, 200, { ok: true });
  }

  return false;
}

function contentType(path) {
  return {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".heic": "image/heic",
    ".heif": "image/heif",
  }[extname(path).toLowerCase()] || "application/octet-stream";
}

async function serveFile(res, base, requestedPath) {
  const relative = normalize(requestedPath).replace(/^(\.\.(\/|\\|$))+/, "");
  const path = join(base, relative);
  if (!path.startsWith(base)) return send(res, 403, "Forbidden", "text/plain; charset=utf-8");
  try {
    const file = await readFile(path);
    res.writeHead(200, { "Content-Type": contentType(path) });
    res.end(file);
  } catch {
    send(res, 404, "Not found", "text/plain; charset=utf-8");
  }
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    if (url.pathname.startsWith("/api/")) {
      const handled = await api(req, res, url);
      if (handled === false) send(res, 404, { error: "Ruta no encontrada" });
      return;
    }
    if (url.pathname.startsWith("/photos/")) {
      return serveFile(res, PHOTOS_DIR, url.pathname.slice("/photos/".length));
    }
    return serveFile(res, PUBLIC_DIR, url.pathname === "/" ? "index.html" : url.pathname.slice(1));
  } catch (error) {
    send(res, 500, { error: error.message || "Error interno" });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Summer Body listo en http://${HOST}:${PORT}`);
});
