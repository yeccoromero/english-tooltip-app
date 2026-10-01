import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "English Tooltip",
  description: "Repasa el vocabulario que guardas mientras lees en inglés.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
