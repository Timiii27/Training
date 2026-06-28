import "./globals.css";

export const metadata = {
  title: "Portal Diario",
  description: "Portal privado de habitos, entrenamiento y progreso personal.",
};

// Aplica el modo claro/oscuro guardado antes del primer render para evitar parpadeo.
const themeScript = `
try {
  var mode = localStorage.getItem('daily-wellbeing-theme-mode');
  if (mode === 'light' || mode === 'dark') {
    document.documentElement.setAttribute('data-theme', mode);
  }
} catch (error) {}
`;

export default function RootLayout({ children }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="color-scheme" content="light dark" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
