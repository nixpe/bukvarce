import { OCR_CONFIG } from "../config/integrations.mjs";

let tesseractLoader = null;

function loadScriptOnce(scriptUrl) {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return Promise.reject(new Error("OCR is only available in the browser."));
  }

  if (window.Tesseract) {
    return Promise.resolve(window.Tesseract);
  }

  if (tesseractLoader) {
    return tesseractLoader;
  }

  tesseractLoader = new Promise((resolve, reject) => {
    const existingScript = document.querySelector(`script[data-ocr-script="${scriptUrl}"]`);

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(window.Tesseract), { once: true });
      existingScript.addEventListener("error", () => {
        tesseractLoader = null;
        reject(new Error("OCR script failed to load."));
      }, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = scriptUrl;
    script.async = true;
    script.defer = true;
    script.dataset.ocrScript = scriptUrl;
    script.onload = () => {
      resolve(window.Tesseract);
    };
    script.onerror = () => {
      tesseractLoader = null;
      reject(new Error("OCR script failed to load."));
    };
    document.head.appendChild(script);
  });

  return tesseractLoader;
}

async function recognizeWithLanguage(Tesseract, file, language, logger) {
  const result = await Tesseract.recognize(file, language, {
    logger: (message) => {
      if (typeof logger === "function") {
        logger(message);
      }
    },
  });

  const text = result && result.data ? result.data.text : "";
  return String(text || "").trim();
}

export async function extractTextFromImage(file, options = {}) {
  if (!(file instanceof Blob)) {
    throw new Error("A valid image file is required.");
  }

  const config = {
    ...OCR_CONFIG,
    ...options.config,
  };
  const Tesseract = await loadScriptOnce(config.scriptUrl);

  if (!Tesseract || typeof Tesseract.recognize !== "function") {
    throw new Error("OCR library is not available.");
  }

  try {
    const text = await recognizeWithLanguage(Tesseract, file, config.primaryLanguage, options.logger);

    if (text) {
      return text;
    }
  } catch (error) {
    if (!config.fallbackLanguage) {
      throw error;
    }
  }

  const fallbackText = await recognizeWithLanguage(Tesseract, file, config.fallbackLanguage, options.logger);

  if (!fallbackText) {
    throw new Error("OCR did not detect readable text.");
  }

  return fallbackText;
}
