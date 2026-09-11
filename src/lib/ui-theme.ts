/**
 * Les trois interfaces visuelles sélectionnables dans Admin > Apparence
 * (PlatformSettings.uiTheme). Purement visuel : aucune logique métier n'en
 * dépend. Ce fichier est la seule liste de référence — la route
 * /api/admin/settings, le panneau admin et les layouts s'y réfèrent.
 */
export const UI_THEMES = ["classic", "advanced", "premium"] as const;
export type UiTheme = (typeof UI_THEMES)[number];

/** Classe CSS d'enveloppe correspondant à l'interface (vide pour Classique). */
export function themeClass(uiTheme: string): string {
  if (uiTheme === "advanced") return "app-advanced";
  if (uiTheme === "premium") return "app-premium";
  return "";
}
