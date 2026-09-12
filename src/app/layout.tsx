import type { Metadata, Viewport } from "next";
import { Fraunces, Work_Sans } from "next/font/google";
import "./globals.css";
import { loadConfig } from "@/lib/snapshot";
import { themeCssVars } from "@/lib/themes";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-fraunces",
  display: "swap",
});
const workSans = Work_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-work-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Florar — Taller de Cerámica",
  description: "Gestión de turnos, pagos y avisos del taller de cerámica Florar.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Florar",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#4B3B63",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const config = await loadConfig().catch(() => null);
  const themeVars = themeCssVars(config?.theme || "florar");

  return (
    <html lang="es" style={themeVars as React.CSSProperties}>
      <body className={`${fraunces.variable} ${workSans.variable}`}>
        <div className="app-shell">{children}</div>
      </body>
    </html>
  );
}
