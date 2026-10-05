import type { Branding } from "./defaults";

/** Relative luminance 0–1 (sRGB). */
export function colorLuminance(hex: string): number {
  const raw = hex.replace("#", "").trim();
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw;
  if (full.length !== 6) return 0.5;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function isDarkTheme(theme: Branding["theme"]): boolean {
  if (theme === "dark") return true;
  if (theme === "light") return false;
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Apply branding CSS vars with readable contrast in dark mode. */
export function applyBrandingTheme(branding: Branding) {
  const root = document.documentElement;
  const { theme, accent, ink, fontFamily } = branding;

  if (theme === "light" || theme === "dark") root.setAttribute("data-theme", theme);
  else root.removeAttribute("data-theme");

  const dark = isDarkTheme(theme);
  root.style.setProperty("--font", fontFamily);

  if (dark) {
    // Branding ink is for light backgrounds — never force dark text on dark UI.
    root.style.removeProperty("--ink-custom");
    if (colorLuminance(accent) >= 0.35) {
      root.style.setProperty("--accent", accent);
      root.style.setProperty("--accent-ink", "#0d1a15");
    } else {
      root.style.removeProperty("--accent");
      root.style.removeProperty("--accent-ink");
    }
  } else {
    root.style.setProperty("--ink-custom", ink);
    root.style.setProperty("--accent", accent);
    root.style.setProperty(
      "--accent-ink",
      colorLuminance(accent) >= 0.55 ? "#0d1a15" : "#ffffff"
    );
  }
}
