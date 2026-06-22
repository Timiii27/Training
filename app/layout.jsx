import "./globals.css";

export const metadata = {
  title: "Summer Body",
  description: "Entrenamiento, medidas y fotos de progreso con Supabase.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
