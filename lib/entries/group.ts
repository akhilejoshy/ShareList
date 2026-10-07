import { languageLabel } from "./language";

export interface NormalizedEntry {
  entryId: string;
  title: string;
  coverImageUrl: string | null;
  year: string | null;
  language: string;
  type: "movie" | "series";
  visited: boolean;
}

interface RawEntry {
  entryId: string;
  title: string;
  coverImageUrl: string | null;
  metadata: unknown;
  visited: boolean;
}

export function normalizeEntry(e: RawEntry): NormalizedEntry {
  const m =
    (e.metadata as { year?: string; language?: string; type?: string } | null) ?? null;
  return {
    entryId: e.entryId,
    title: e.title,
    coverImageUrl: e.coverImageUrl,
    year: m?.year ?? null,
    language: languageLabel(m?.language),
    // Older saved rows predate the series feature and have no `type` field.
    type: m?.type === "series" ? "series" : "movie",
    visited: e.visited,
  };
}

export interface LanguageRow {
  language: string;
  entries: NormalizedEntry[];
}

export interface TypeSection {
  type: "movie" | "series";
  label: string;
  rows: LanguageRow[];
  total: number;
}

/** Unwatched first (in their existing order), watched items pushed to the end. */
function watchedLast(entries: NormalizedEntry[]): NormalizedEntry[] {
  return [...entries].sort((a, b) => Number(a.visited) - Number(b.visited));
}

export function groupByTypeAndLanguage(entries: NormalizedEntry[]): TypeSection[] {
  const sections: TypeSection[] = [
    { type: "movie", label: "Movies", rows: [], total: 0 },
    { type: "series", label: "Series", rows: [], total: 0 },
  ];

  for (const section of sections) {
    const matching = entries.filter((e) => e.type === section.type);
    section.total = matching.length;

    const byLang = new Map<string, NormalizedEntry[]>();
    for (const e of matching) {
      const list = byLang.get(e.language) ?? [];
      list.push(e);
      byLang.set(e.language, list);
    }

    section.rows = [...byLang.entries()]
      .map(([language, es]) => ({ language, entries: watchedLast(es) }))
      .sort((a, b) => a.language.localeCompare(b.language));
  }

  return sections.filter((s) => s.total > 0);
}

export function filterEntries(
  entries: NormalizedEntry[],
  filters: { type?: string; language?: string },
): NormalizedEntry[] {
  const filtered = entries.filter((e) => {
    if (filters.type && e.type !== filters.type) return false;
    if (filters.language && e.language !== filters.language) return false;
    return true;
  });
  return watchedLast(filtered);
}

export function listLanguages(entries: NormalizedEntry[]): string[] {
  return [...new Set(entries.map((e) => e.language))].sort();
}
