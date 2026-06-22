import "./globals.css";

export const metadata = {
  title: "Portal Diario",
  description: "Portal privado de habitos, entrenamiento y progreso personal.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
