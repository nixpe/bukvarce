import { segmentText } from "../core/syllabifier.mjs";
import { normalizeSpokenText } from "../integrations/speech.mjs";

const SPOKEN_NUMBER_VARIANTS = new Map([
  ["0", ["нула"]],
  ["1", ["еден", "една", "едно", "едниот", "едната", "едното", "едни", "едните"]],
  ["2", ["два", "две", "двата", "двете"]],
  ["3", ["три", "трите"]],
  ["4", ["четири", "четирите"]],
  ["5", ["пет", "петте"]],
  ["6", ["шест", "шесте"]],
  ["7", ["седум", "седумте"]],
  ["8", ["осум", "осумте"]],
  ["9", ["девет", "деветте"]],
  ["10", ["десет", "десетте"]],
  ["11", ["единаесет", "единаесетте"]],
  ["12", ["дванаесет", "дванаесетте"]],
  ["13", ["тринаесет", "тринаесетте"]],
  ["14", ["четиринаесет", "четиринаесетте"]],
  ["15", ["петнаесет", "петнаесетте"]],
  ["16", ["шеснаесет", "шеснаесетте"]],
  ["17", ["седумнаесет", "седумнаесетте"]],
  ["18", ["осумнаесет", "осумнаесетте"]],
  ["19", ["деветнаесет", "деветнаесетте"]],
  ["20", ["дваесет", "дваесетте"]],
  ["30", ["триесет", "триесетте"]],
  ["40", ["четириесет", "четириесетте"]],
  ["50", ["педесет", "педесетте"]],
  ["60", ["шеесет", "шеесетте"]],
  ["70", ["седумдесет", "седумдесетте"]],
  ["80", ["осумдесет", "осумдесетте"]],
  ["90", ["деведесет", "деведесетте"]],
  ["100", ["сто", "стоте"]],
]);
const NUMERIC_TOKEN_SUFFIXES = new Set([
  "та",
  "те",
  "то",
  "ов",
  "от",
  "ви",
  "ти",
  "ниот",
  "ната",
  "ното",
  "ните",
  "тиот",
]);
const MAX_HEARD_TEXT_VARIANTS = 24;

function toNormalizedSyllables(value, dictionaryEntries = new Map()) {
  const segmentedText = segmentText(String(value || ""), dictionaryEntries);

  return segmentedText
    .split(/[^\p{L}\p{N}-]+/u)
    .flatMap((chunk) => chunk.split("-"))
    .map((part) => normalizeSpokenText(part))
    .filter(Boolean);
}

function getNumericTokenVariants(token) {
  const match = String(token || "").match(/^([^\p{L}\p{N}]*)(\d+)(?:[-‐‑‒–—]?([\p{L}]+))?([^\p{L}\p{N}]*)$/u);

  if (!match) {
    return [token];
  }

  const [, prefix = "", digits = "", rawSuffix = "", suffixPunctuation = ""] = match;
  const suffix = normalizeSpokenText(rawSuffix);
  const numericVariants = SPOKEN_NUMBER_VARIANTS.get(digits);

  if (!numericVariants || numericVariants.length === 0) {
    return [token];
  }

  if (suffix && !NUMERIC_TOKEN_SUFFIXES.has(suffix)) {
    return [token];
  }

  const filteredVariants = suffix
    ? numericVariants.filter((variant) => normalizeSpokenText(variant).endsWith(suffix))
    : numericVariants;
  const expandedVariants = filteredVariants.length > 0 ? filteredVariants : numericVariants;

  return [
    token,
    ...expandedVariants.map((variant) => `${prefix}${variant}${suffixPunctuation}`),
  ];
}

function expandHeardTextVariants(value) {
  const rawValue = String(value || "").trim();

  if (!rawValue || !/\d/.test(rawValue)) {
    return [rawValue];
  }

  const segments = rawValue.split(/(\s+)/).filter(Boolean);
  let transcriptVariants = [""];

  for (const segment of segments) {
    const segmentVariants = /\s+/u.test(segment)
      ? [segment]
      : getNumericTokenVariants(segment);
    const nextTranscriptVariants = [];

    for (const transcriptPrefix of transcriptVariants) {
      for (const variant of segmentVariants) {
        nextTranscriptVariants.push(`${transcriptPrefix}${variant}`);

        if (nextTranscriptVariants.length >= MAX_HEARD_TEXT_VARIANTS) {
          break;
        }
      }

      if (nextTranscriptVariants.length >= MAX_HEARD_TEXT_VARIANTS) {
        break;
      }
    }

    transcriptVariants = nextTranscriptVariants;
  }

  return Array.from(new Set(transcriptVariants.map((variant) => variant.trim()).filter(Boolean)));
}

function matchesSyllableWindow(upcomingSyllables, heardSyllables, count) {
  if (count <= 0 || count > upcomingSyllables.length || count > heardSyllables.length) {
    return false;
  }

  for (let startIndex = 0; startIndex <= heardSyllables.length - count; startIndex += 1) {
    let allMatch = true;

    for (let offset = 0; offset < count; offset += 1) {
      if (upcomingSyllables[offset] !== heardSyllables[startIndex + offset]) {
        allMatch = false;
        break;
      }
    }

    if (allMatch) {
      return true;
    }
  }

  return false;
}

function getBestSyllableWindowMatchCount(upcomingSyllables, heardSyllables) {
  const maxCount = Math.min(upcomingSyllables.length, heardSyllables.length);

  for (let count = maxCount; count >= 1; count -= 1) {
    if (matchesSyllableWindow(upcomingSyllables, heardSyllables, count)) {
      return count;
    }
  }

  return 0;
}

function getBestConcatenatedMatch(upcomingSyllables, normalizedHeardText, options = {}) {
  const allowPartial = options.allowPartial === true;

  for (let count = upcomingSyllables.length; count >= 1; count -= 1) {
    const candidateValue = upcomingSyllables.slice(0, count).join("");

    if (!candidateValue) {
      continue;
    }

    if (
      normalizedHeardText === candidateValue
      || normalizedHeardText.startsWith(candidateValue)
      || normalizedHeardText.endsWith(candidateValue)
    ) {
      return {
        count,
        partialOnly: false,
      };
    }

    if (allowPartial && candidateValue.startsWith(normalizedHeardText)) {
      return {
        count,
        partialOnly: true,
      };
    }
  }

  return {
    count: 0,
    partialOnly: false,
  };
}

function createVoiceRecognitionCandidate(upcomingSyllables, heardText, dictionaryEntries, options) {
  const normalizedHeardText = normalizeSpokenText(heardText);

  if (!normalizedHeardText) {
    return null;
  }

  const heardSyllables = toNormalizedSyllables(heardText, dictionaryEntries);
  const syllableWindowMatchCount = getBestSyllableWindowMatchCount(upcomingSyllables, heardSyllables);
  const concatenatedMatch = getBestConcatenatedMatch(
    upcomingSyllables,
    normalizedHeardText,
    options
  );
  const concatenatedMatchCount = concatenatedMatch.partialOnly && syllableWindowMatchCount > 0
    ? 0
    : concatenatedMatch.count;
  const matchCount = Math.max(syllableWindowMatchCount, concatenatedMatchCount);
  const partialOnlyMatch = matchCount > 0
    && syllableWindowMatchCount === 0
    && concatenatedMatchCount === matchCount
    && concatenatedMatch.partialOnly;

  return {
    heardTextVariant: heardText,
    normalizedHeardText,
    heardSyllables,
    syllableWindowMatchCount,
    concatenatedMatchCount,
    partialOnlyMatch,
    shouldAdvanceImmediately: matchCount > 0 && !partialOnlyMatch,
    matchCount,
    isMatch: matchCount > 0,
  };
}

function compareVoiceRecognitionCandidates(left, right) {
  if (!left) {
    return 1;
  }

  if (!right) {
    return -1;
  }

  if (right.matchCount !== left.matchCount) {
    return right.matchCount - left.matchCount;
  }

  if (left.partialOnlyMatch !== right.partialOnlyMatch) {
    return left.partialOnlyMatch ? 1 : -1;
  }

  if (right.syllableWindowMatchCount !== left.syllableWindowMatchCount) {
    return right.syllableWindowMatchCount - left.syllableWindowMatchCount;
  }

  if (right.concatenatedMatchCount !== left.concatenatedMatchCount) {
    return right.concatenatedMatchCount - left.concatenatedMatchCount;
  }

  return right.normalizedHeardText.length - left.normalizedHeardText.length;
}

export function getVoiceRecognitionMatch(upcomingSyllables, heardText, dictionaryEntries = new Map(), options = {}) {
  const normalizedUpcomingSyllables = Array.from(upcomingSyllables || [])
    .map((syllable) => normalizeSpokenText(syllable))
    .filter(Boolean);
  const heardTextVariants = expandHeardTextVariants(heardText);
  const defaultNormalizedHeardText = normalizeSpokenText(heardText);

  if (!defaultNormalizedHeardText || normalizedUpcomingSyllables.length === 0) {
    return {
      normalizedHeardText: defaultNormalizedHeardText,
      heardSyllables: [],
      matchCount: 0,
      isMatch: false,
    };
  }

  const bestCandidate = heardTextVariants
    .map((variant) => createVoiceRecognitionCandidate(
      normalizedUpcomingSyllables,
      variant,
      dictionaryEntries,
      options
    ))
    .sort(compareVoiceRecognitionCandidates)[0];

  if (!bestCandidate) {
    return {
      normalizedHeardText: defaultNormalizedHeardText,
      heardSyllables: [],
      matchCount: 0,
      isMatch: false,
    };
  }

  return {
    ...bestCandidate,
    heardTextVariants,
  };
}
