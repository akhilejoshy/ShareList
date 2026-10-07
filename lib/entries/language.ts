const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  ml: "Malayalam",
  ta: "Tamil",
  hi: "Hindi",
  te: "Telugu",
  kn: "Kannada",
};

export function languageLabel(code: string | undefined | null): string {
  if (!code) return "Other";
  return LANGUAGE_NAMES[code.toLowerCase()] ?? code;
}
