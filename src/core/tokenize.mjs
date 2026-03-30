import { createCyrillicWordRegex, normalizeText } from "./normalize.mjs";

export function tokenizeText(value = "") {
  const normalizedText = normalizeText(value);
  const tokens = [];
  const matcher = createCyrillicWordRegex();
  let lastIndex = 0;
  let match = matcher.exec(normalizedText);

  while (match) {
    if (match.index > lastIndex) {
      tokens.push({
        type: "text",
        value: normalizedText.slice(lastIndex, match.index),
      });
    }

    tokens.push({
      type: "word",
      value: match[0],
    });

    lastIndex = matcher.lastIndex;
    match = matcher.exec(normalizedText);
  }

  if (lastIndex < normalizedText.length) {
    tokens.push({
      type: "text",
      value: normalizedText.slice(lastIndex),
    });
  }

  return {
    normalizedText,
    tokens,
  };
}
