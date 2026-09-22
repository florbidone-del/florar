import type { Metadata, Viewport } from "next";
import { Darumadrop_One, Roboto, Montserrat, Fira_Sans_Condensed } from "next/font/google";
import "./globals.css";
import { loadConfig } from "@/lib/snapshot";
import { themeCssVars } from "@/lib/themes";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

const darumadropOne = Darumadrop_One({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-darumadrop",
  display: "swap",
});
// Candidatas de tipografía, elegibles en vivo desde Configuración (solo profe principal). El
// atributo data-font en <html> decide cuál de estas se usa como --font-heading (ver globals.css).
const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-test-roboto",
  display: "swap",
});
const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-test-montserrat",
  display: "swap",
});
// "Faltory Sans Condensed" no es una tipografía real de Google Fonts — la más parecida es esta.
const firaSansCondensed = Fira_Sans_Condensed({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-test-fira",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Florar - Taller de Cerámica",
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
  themeColor: "#432467",
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const config = await loadConfig().catch(() => null);
  let effectiveTheme = config?.theme || "florar";
  const session = await getSession().catch(() => null);
  if (session?.kind === "student") {
    const student = await prisma.student
      .findUnique({ where: { id: session.studentId }, select: { theme: true } })
      .catch(() => null);
    if (student?.theme) effectiveTheme = student.theme;
  }
  const themeVars = themeCssVars(effectiveTheme);
  const effectiveFont = config?.font || "darumadrop";

  return (
    <html lang="es" data-font={effectiveFont} style={themeVars as React.CSSProperties}>
      <body
        className={`${darumadropOne.variable} ${roboto.variable} ${montserrat.variable} ${firaSansCondensed.variable}`}
      >
        <div className="app-shell">{children}</div>
      </body>
    </html>
  );
}
