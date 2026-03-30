import { segmentWord } from "../core/syllabifier.mjs";
import { tokenizeText } from "../core/tokenize.mjs";

function createSyllableElement(documentObject, text, index) {
  const syllable = documentObject.createElement("span");
  syllable.className = "syllable";
  syllable.dataset.syllableIndex = String(index);
  syllable.textContent = text;
  return syllable;
}

function createDashElement(documentObject) {
  const dash = documentObject.createElement("span");
  dash.className = "syllable-dash";
  dash.setAttribute("aria-hidden", "true");
  dash.textContent = "-";
  return dash;
}

export function renderEmptyState(container, message) {
  const fragment = document.createDocumentFragment();
  const hint = document.createElement("p");
  hint.className = "empty-state";
  hint.textContent = message;
  fragment.appendChild(hint);
  container.replaceChildren(fragment);
}

export function renderSegmentedText(container, text, dictionaryEntries) {
  const fragment = document.createDocumentFragment();
  const { tokens } = tokenizeText(text);
  let syllableIndex = 0;

  tokens.forEach((token) => {
    if (token.type === "text") {
      fragment.appendChild(document.createTextNode(token.value));
      return;
    }

    const segmentedWord = segmentWord(token.value, dictionaryEntries);
    const parts = segmentedWord.split("-");

    parts.forEach((part, partIndex) => {
      fragment.appendChild(createSyllableElement(document, part, syllableIndex));
      syllableIndex += 1;

      if (partIndex < parts.length - 1) {
        fragment.appendChild(createDashElement(document));
      }
    });
  });

  container.replaceChildren(fragment);

  return {
    syllableCount: syllableIndex,
    plainText: container.textContent || "",
  };
}
