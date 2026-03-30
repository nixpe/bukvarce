import { normalizeWord, toNFC } from "./normalize.mjs";

export function createDictionary(rawEntries = {}) {
  const entries = new Map();

  Object.entries(rawEntries).forEach(([word, splitValue]) => {
    entries.set(normalizeWord(word), toNFC(String(splitValue)));
  });

  return entries;
}

function getEmbeddedDictionary(sourceUrl) {
  if (sourceUrl !== "dict.json" || typeof window === "undefined") {
    return null;
  }

  const embeddedDictionary = window.__MK_READING_AID_EMBEDDED_DICT__;

  if (!embeddedDictionary || typeof embeddedDictionary !== "object") {
    return null;
  }

  return embeddedDictionary;
}

export async function loadDictionary(sourceUrl = "dict.json") {
  const embeddedDictionary = getEmbeddedDictionary(sourceUrl);

  if (embeddedDictionary) {
    return {
      entries: createDictionary(embeddedDictionary),
      sourceUrl: "embedded",
    };
  }

  const response = await fetch(sourceUrl, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Dictionary request failed with status ${response.status}.`);
  }

  const rawEntries = await response.json();

  return {
    entries: createDictionary(rawEntries),
    sourceUrl,
  };
}

export function getDictionarySourceFromLocation(locationObject) {
  const params = new URLSearchParams(locationObject.search);
  return params.get("dict") || "dict.json";
}

export function applyDictionaryWithCasing(word, splitValue) {
  const pieces = String(splitValue).split("-");
  const letters = Array.from(word);
  const mappedPieces = [];
  let offset = 0;

  pieces.forEach((piece) => {
    const pieceLength = Array.from(piece).length;
    mappedPieces.push(letters.slice(offset, offset + pieceLength).join(""));
    offset += pieceLength;
  });

  if (offset !== letters.length) {
    return String(splitValue);
  }

  return mappedPieces.join("-");
}
