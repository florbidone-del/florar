export type Theme = {
  name: string;
  bg: string;
  surface: string;
  surface2: string;
  ink: string;
  inkSoft: string;
  line: string;
  glaze: string;
  glazeDark: string;
  oxide: string;
  oxideSoft: string;
  okBg: string;
};

export const THEMES: Record<string, Theme> = {
  florar: {
    // glaze/glazeDark sacados con cuentagotas directo de "logo florar.png" (el archivo real del
    // isologo): violeta #432467 y una sombra proporcional, para que el tema por defecto sea
    // fiel al color oficial del taller.
    name: "Florar", bg: "#EEE9F2", surface: "#F7F4FA", surface2: "#FCFAFD",
    ink: "#241A3B", inkSoft: "#6B5E82", line: "#E1DDEC",
    glaze: "#432467", glazeDark: "#321B4D", oxide: "#A6446B", oxideSoft: "#F1DCE5", okBg: "#E4DCEE",
  },
  arcilla: {
    name: "Arcilla", bg: "#EDE7DA", surface: "#F7F2E9", surface2: "#FBF8F2",
    ink: "#2E2A22", inkSoft: "#6B6355", line: "#D8CFBD",
    glaze: "#4F6B58", glazeDark: "#3B5142", oxide: "#B5602F", oxideSoft: "#F1DFCF", okBg: "#E4EBE3",
  },
  terracota: {
    name: "Terracota", bg: "#F2E4D8", surface: "#FAF1E7", surface2: "#FFF8F0",
    ink: "#3A2A1E", inkSoft: "#8A6F5C", line: "#E0C7AE",
    glaze: "#A8552E", glazeDark: "#7E3D1E", oxide: "#5C6B4F", oxideSoft: "#E9EDE0", okBg: "#EFE6D6",
  },
  piedra: {
    name: "Piedra", bg: "#E8E6E1", surface: "#F3F1EC", surface2: "#FAF9F6",
    ink: "#23262B", inkSoft: "#6B6F76", line: "#D3D0C9",
    glaze: "#3D5A73", glazeDark: "#2A4054", oxide: "#A6462F", oxideSoft: "#EFDCD3", okBg: "#E1E7E2",
  },
  musgo: {
    name: "Musgo", bg: "#E4E3D3", surface: "#EFEEDF", surface2: "#F7F6EC",
    ink: "#23281D", inkSoft: "#6E7259", line: "#CFCDB4",
    glaze: "#566B3D", glazeDark: "#3E4E2C", oxide: "#B4622E", oxideSoft: "#F1DFC9", okBg: "#DEE6D2",
  },
  azulyoro: {
    name: "Azul y Oro", bg: "#D7E3F5", surface: "#E6EFFA", surface2: "#F3F8FD",
    ink: "#0F2540", inkSoft: "#4C6483", line: "#B4C8E4",
    glaze: "#123563", glazeDark: "#081A33", oxide: "#B8912A", oxideSoft: "#F5E7BE", okBg: "#C9DEF5",
  },
};

export function themeCssVars(key: string): Record<string, string> {
  const t = THEMES[key] || THEMES.florar;
  return {
    "--bg": t.bg,
    "--surface": t.surface,
    "--surface-2": t.surface2,
    "--ink": t.ink,
    "--ink-soft": t.inkSoft,
    "--line": t.line,
    "--glaze": t.glaze,
    "--glaze-dark": t.glazeDark,
    "--oxide": t.oxide,
    "--oxide-soft": t.oxideSoft,
    "--ok-bg": t.okBg,
  };
}
