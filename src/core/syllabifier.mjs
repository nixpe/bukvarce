import { applyDictionaryWithCasing } from "./dictionary.mjs";
import { isCyrillicLetter, normalizeWord } from "./normalize.mjs";
import { tokenizeText } from "./tokenize.mjs";

const VOWELS = new Set(["а", "е", "и", "о", "у"]);
const ONSET3_CLUSTERS = new Set(["стр", "скр", "спр", "штр", "шкр", "шкл", "здр"]);
const SONORITY_WEIGHTS = new Map([
  ["а", 12],
  ["е", 12],
  ["и", 12],
  ["о", 12],
  ["у", 12],
  ["р", 5],
  ["ј", 3],
  ["л", 3],
  ["љ", 3],
  ["м", 3],
  ["н", 3],
  ["њ", 3],
  ["б", 2],
  ["в", 2],
  ["г", 2],
  ["д", 2],
  ["ѓ", 2],
  ["ж", 2],
  ["з", 2],
  ["ѕ", 2],
  ["џ", 2],
  ["к", 1],
  ["п", 1],
  ["с", 1],
  ["т", 1],
  ["ќ", 1],
  ["ф", 1],
  ["х", 1],
  ["ц", 1],
  ["ч", 1],
  ["ш", 1],
]);
const PROTECTED_SUFFIXES = [
  "ствениот",
  "ствената",
  "ственото",
  "ствените",
  "штвениот",
  "штвената",
  "штвеното",
  "штвените",
  "ството",
  "ствата",
  "штвото",
  "штвата",
  "скиот",
  "ската",
  "ското",
  "ските",
  "скиов",
  "скава",
  "сково",
  "скиве",
  "скион",
  "скана",
  "сконо",
  "скине",
  "чкиот",
  "чката",
  "чкото",
  "чките",
  "ствена",
  "ствено",
  "ствени",
  "штвена",
  "штвено",
  "штвени",
  "ство",
  "ства",
  "штво",
  "штва",
  "ствен",
  "штвен",
  "ски",
  "ска",
  "ско",
  "чки",
  "чка",
  "чко",
];

function toLowerChar(value = "") {
  return String(value || "").toLowerCase();
}

function isVowel(value = "") {
  return VOWELS.has(toLowerChar(value));
}

function isApostrophe(value = "") {
  return value === "'" || value === "’";
}

function isConsonantLetter(value = "") {
  return isCyrillicLetter(value) && !isVowel(value);
}

function getSonorityWeight(value = "") {
  return SONORITY_WEIGHTS.get(toLowerChar(value)) || 0;
}

export function isSyllabicR(letters, index) {
  const lowerChar = toLowerChar(letters[index]);

  if (lowerChar !== "р") {
    return false;
  }

  const previous = letters[index - 1] || "";
  const next = letters[index + 1] || "";
  const previousIsConsonant = isConsonantLetter(previous);
  const nextIsConsonant = isConsonantLetter(next);

  if (previousIsConsonant && nextIsConsonant) {
    return true;
  }

  if (index === 0 && nextIsConsonant) {
    return true;
  }

  if (isApostrophe(previous) && index === 1 && nextIsConsonant) {
    return true;
  }

  if (previousIsConsonant && index === letters.length - 1) {
    return true;
  }

  return false;
}

function isExplicitOnset2(first, second) {
  const left = toLowerChar(first);
  const right = toLowerChar(second);

  if (["р", "л", "љ", "ј", "в"].includes(right)) {
    return true;
  }

  if (["с", "ш"].includes(left)) {
    return true;
  }

  if (left === "з" && ["г", "д", "б", "в", "р", "л", "ж"].includes(right)) {
    return true;
  }

  if (left === "ц" && ["р", "в", "ј", "л"].includes(right)) {
    return true;
  }

  if (left === "ѕ" && ["в", "д", "р", "л"].includes(right)) {
    return true;
  }

  if (left === "в" && ["ч", "к", "л", "р"].includes(right)) {
    return true;
  }

  return false;
}

function isSonorityOnset(cluster) {
  if (cluster.length <= 1) {
    return true;
  }

  if (cluster.length === 2) {
    const left = getSonorityWeight(cluster[0]);
    const right = getSonorityWeight(cluster[1]);
    const rightChar = toLowerChar(cluster[1]);

    if (!["р", "л", "љ", "ј", "в"].includes(rightChar)) {
      return false;
    }

    return right > left && right > 0;
  }

  if (cluster.length === 3) {
    return false;
  }

  return false;
}

function isAllowedOnset(cluster) {
  const serialized = cluster.map((value) => toLowerChar(value)).join("");

  if (cluster.length === 1) {
    return true;
  }

  if (cluster.length === 2) {
    return isExplicitOnset2(cluster[0], cluster[1]) || isSonorityOnset(cluster);
  }

  if (cluster.length === 3) {
    return ONSET3_CLUSTERS.has(serialized);
  }

  return false;
}

function findProtectedSuffixStart(lowerWord) {
  for (let index = 0; index < PROTECTED_SUFFIXES.length; index += 1) {
    const suffix = PROTECTED_SUFFIXES[index];

    if (lowerWord.endsWith(suffix)) {
      return Array.from(lowerWord).length - Array.from(suffix).length;
    }
  }

  return -1;
}

function chooseBoundary(letters, previousNucleus, currentNucleus, protectedSuffixStart) {
  // Заштитените суфикси имаат предност за да не се раздвојуваат на неприроден начин.
  if (protectedSuffixStart > previousNucleus && protectedSuffixStart < currentNucleus) {
    return protectedSuffixStart;
  }

  const cluster = letters.slice(previousNucleus + 1, currentNucleus);

  if (cluster.length === 0) {
    return currentNucleus;
  }

  if (cluster.length === 1) {
    return currentNucleus - 1;
  }

  const maxOnsetLength = Math.min(cluster.length, 3);

  for (let onsetLength = maxOnsetLength; onsetLength >= 1; onsetLength -= 1) {
    const onset = cluster.slice(cluster.length - onsetLength);
    const boundary = currentNucleus - onsetLength;

    if (boundary <= previousNucleus) {
      continue;
    }

    if (isAllowedOnset(onset)) {
      return boundary;
    }
  }

  return currentNucleus - 1;
}

export function segmentWordByRules(word = "") {
  if (!Array.from(word).some((letter) => isCyrillicLetter(letter))) {
    return word;
  }

  const letters = Array.from(word);
  const lowerLetters = Array.from(normalizeWord(word));
  const nuclei = [];

  lowerLetters.forEach((letter, index) => {
    if (isVowel(letter) || isSyllabicR(lowerLetters, index)) {
      nuclei.push(index);
    }
  });

  if (nuclei.length <= 1) {
    return word;
  }

  const cuts = new Set();
  const protectedSuffixStart = findProtectedSuffixStart(lowerLetters.join(""));

  for (let index = 1; index < nuclei.length; index += 1) {
    cuts.add(chooseBoundary(lowerLetters, nuclei[index - 1], nuclei[index], protectedSuffixStart));
  }

  let segmented = "";

  letters.forEach((letter, index) => {
    if (cuts.has(index)) {
      segmented += "-";
    }

    segmented += letter;
  });

  return segmented;
}

export function segmentWord(word = "", dictionaryEntries = new Map()) {
  const normalized = normalizeWord(word);

  if (dictionaryEntries.has(normalized)) {
    return applyDictionaryWithCasing(word, dictionaryEntries.get(normalized));
  }

  return segmentWordByRules(word);
}

export function segmentText(text = "", dictionaryEntries = new Map()) {
  const { tokens } = tokenizeText(text);

  return tokens
    .map((token) => {
      if (token.type === "word") {
        return segmentWord(token.value, dictionaryEntries);
      }

      return token.value;
    })
    .join("");
}
