import "./globals.css";

export const metadata = {
  title: "Summer Body",
  description: "Plan diario, progreso corporal y calendario de constancia.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
