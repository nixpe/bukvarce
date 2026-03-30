const ZERO_WIDTH_RE = /[\u200B\u200C\u200D]/g;
const CYRILLIC_LETTER_RE = /\p{Script=Cyrillic}/u;

export function toNFC(value = "") {
  return String(value || "").normalize("NFC");
}

export function stripZeroWidth(value = "") {
  return String(value || "").replace(ZERO_WIDTH_RE, "");
}

export function latinJToCyrillic(value = "") {
  const normalized = String(value || "");

  if (!CYRILLIC_LETTER_RE.test(normalized)) {
    return normalized;
  }

  return normalized.replace(/J/g, "Ј").replace(/j/g, "ј");
}

export function normalizeText(value = "") {
  return latinJToCyrillic(stripZeroWidth(toNFC(value)));
}

export function normalizeWord(value = "") {
  return normalizeText(value).toLowerCase().trim();
}

export function isCyrillicLetter(value = "") {
  return CYRILLIC_LETTER_RE.test(value);
}

export function createCyrillicWordRegex() {
  return /[’']?\p{Script=Cyrillic}+/gu;
}
