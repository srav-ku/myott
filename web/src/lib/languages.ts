/**
 * Language normalization. Stored as ISO 639-1 codes (lowercase).
 * Accepts either codes or common English names — anything else is dropped.
 */

const NAME_TO_CODE: Record<string, string> = {
  english: 'en',
  hindi: 'hi',
  telugu: 'te',
  tamil: 'ta',
  malayalam: 'ml',
  kannada: 'kn',
  korean: 'ko',
  japanese: 'ja',
  spanish: 'es',
  french: 'fr',
  german: 'de',
  chinese: 'zh',
  mandarin: 'zh',
  arabic: 'ar',
  portuguese: 'pt',
  russian: 'ru',
  italian: 'it',
  bengali: 'bn',
  marathi: 'mr',
  punjabi: 'pa',
  gujarati: 'gu',
  urdu: 'ur',
  turkish: 'tr',
  thai: 'th',
  indonesian: 'id',
  vietnamese: 'vi',
};

export const VALID_LANGUAGE_CODES = new Set<string>(
  Array.from(new Set(Object.values(NAME_TO_CODE))),
);

/** Normalize a single token (code or English name) → ISO code, or null. */
export function normalizeLanguage(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const s = input.trim().toLowerCase();
  if (!s) return null;
  if (VALID_LANGUAGE_CODES.has(s)) return s;
  if (NAME_TO_CODE[s]) return NAME_TO_CODE[s];
  return null;
}

/**
 * Normalize an arbitrary list/string of languages to a deduped array of codes.
 * Accepts:
 *   - array of strings: ["en", "Hindi", "te"]
 *   - delimited string: "en|hi|te" or "en, hi, te"
 *   - single string: "english"
 */
export function normalizeLanguages(
  input: string | string[] | null | undefined,
): string[] {
  if (input == null) return [];
  const parts: string[] = Array.isArray(input)
    ? input
    : String(input).split(/[|,;/]/);
  const out = new Set<string>();
  for (const p of parts) {
    const code = normalizeLanguage(p);
    if (code) out.add(code);
  }
  return [...out];
}
