function getSpeechRecognitionConstructor() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export function getSpeechPlatformInfo() {
  if (typeof navigator === "undefined") {
    return {
      isIOS: false,
      isChromeiOS: false,
      isSafari: false,
    };
  }

  const userAgent = String(navigator.userAgent || "");
  const platform = String(navigator.platform || "");
  const maxTouchPoints = Number(navigator.maxTouchPoints || 0);
  const isIOS = /iPad|iPhone|iPod/i.test(userAgent)
    || (platform === "MacIntel" && maxTouchPoints > 1);
  const isChromeiOS = /CriOS/i.test(userAgent);
  const isSafari = /Safari/i.test(userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(userAgent);

  return {
    isIOS,
    isChromeiOS,
    isSafari,
  };
}

const SPEECH_SYNTHESIS_STORAGE_KEY = "mk_reading_aid_speech_preferences";
const MACEDONIAN_VOICE_NAME_RE = /(suze|vezilka|macedon|makedon|македон|сузе|везилка)/i;
const DEFAULT_MICROPHONE_SETTLE_DELAY_MS = 250;
const LATIN_LETTER_RE = /[a-z]/i;

function coerceMicrophoneSettleDelayMs(value) {
  const numericValue = Math.round(Number(value) || DEFAULT_MICROPHONE_SETTLE_DELAY_MS);
  return Math.max(100, Math.min(1600, numericValue));
}

function coerceInterimResolveDelayMs(value, fallbackValue = DEFAULT_MICROPHONE_SETTLE_DELAY_MS) {
  const numericValue = Math.round(Number(value));

  if (!Number.isFinite(numericValue)) {
    return coerceMicrophoneSettleDelayMs(fallbackValue);
  }

  return Math.max(0, Math.min(1600, numericValue));
}

function normalizeVoiceValue(value = "") {
  return String(value || "").normalize("NFC").trim();
}

function createVoiceKey(voice) {
  return `${normalizeVoiceValue(voice && voice.name)}::${normalizeVoiceValue(voice && voice.lang)}`;
}

function isMacedonianVoice(voice) {
  const lang = normalizeVoiceValue(voice && voice.lang).toLowerCase();
  const name = normalizeVoiceValue(voice && voice.name);

  return lang.startsWith("mk") || MACEDONIAN_VOICE_NAME_RE.test(name);
}

function getVoices() {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return [];
  }

  return window.speechSynthesis.getVoices();
}

function compareVoices(left, right) {
  if (left.isMacedonian !== right.isMacedonian) {
    return left.isMacedonian ? -1 : 1;
  }

  if (left.default !== right.default) {
    return left.default ? -1 : 1;
  }

  return left.label.localeCompare(right.label, "mk");
}

function findVoiceByKey(voiceKey = "") {
  const normalizedVoiceKey = String(voiceKey || "").trim();

  if (!normalizedVoiceKey) {
    return null;
  }

  return getVoices().find((voice) => createVoiceKey(voice) === normalizedVoiceKey) || null;
}

export function listSpeechSynthesisVoices() {
  return getVoices()
    .map((voice) => ({
      key: createVoiceKey(voice),
      name: normalizeVoiceValue(voice.name),
      lang: normalizeVoiceValue(voice.lang),
      default: Boolean(voice.default),
      localService: Boolean(voice.localService),
      isMacedonian: isMacedonianVoice(voice),
      label: `${normalizeVoiceValue(voice.name)} (${normalizeVoiceValue(voice.lang) || "без јазик"})`,
    }))
    .sort(compareVoices);
}

export function loadSpeechSynthesisPreferences() {
  if (typeof window === "undefined" || !window.localStorage) {
    return {
      preferredVoiceKey: "",
      microphoneQuickMatch: true,
      microphoneSettleDelayMs: DEFAULT_MICROPHONE_SETTLE_DELAY_MS,
      voiceAutoEnabled: false,
    };
  }

  try {
    const rawValue = window.localStorage.getItem(SPEECH_SYNTHESIS_STORAGE_KEY);

    if (!rawValue) {
      return {
        preferredVoiceKey: "",
        microphoneQuickMatch: true,
        microphoneSettleDelayMs: DEFAULT_MICROPHONE_SETTLE_DELAY_MS,
        voiceAutoEnabled: false,
      };
    }

    const parsedValue = JSON.parse(rawValue);

    return {
      preferredVoiceKey: String(parsedValue.preferredVoiceKey || ""),
      microphoneQuickMatch: parsedValue.microphoneQuickMatch !== false,
      microphoneSettleDelayMs: coerceMicrophoneSettleDelayMs(parsedValue.microphoneSettleDelayMs),
      voiceAutoEnabled: parsedValue.voiceAutoEnabled === true,
    };
  } catch (error) {
    return {
      preferredVoiceKey: "",
      microphoneQuickMatch: true,
      microphoneSettleDelayMs: DEFAULT_MICROPHONE_SETTLE_DELAY_MS,
      voiceAutoEnabled: false,
    };
  }
}

export function saveSpeechSynthesisPreferences(preferredVoiceKeyOrOptions = "", microphoneQuickMatch = true) {
  const nextPreferences = typeof preferredVoiceKeyOrOptions === "object" && preferredVoiceKeyOrOptions !== null
    ? {
      preferredVoiceKey: String(preferredVoiceKeyOrOptions.preferredVoiceKey || "").trim(),
      microphoneQuickMatch: preferredVoiceKeyOrOptions.microphoneQuickMatch !== false,
      microphoneSettleDelayMs: coerceMicrophoneSettleDelayMs(preferredVoiceKeyOrOptions.microphoneSettleDelayMs),
      voiceAutoEnabled: preferredVoiceKeyOrOptions.voiceAutoEnabled === true,
    }
    : {
      preferredVoiceKey: String(preferredVoiceKeyOrOptions || "").trim(),
      microphoneQuickMatch: microphoneQuickMatch !== false,
      microphoneSettleDelayMs: DEFAULT_MICROPHONE_SETTLE_DELAY_MS,
      voiceAutoEnabled: false,
    };

  if (typeof window !== "undefined" && window.localStorage) {
    if (
      nextPreferences.preferredVoiceKey
      || nextPreferences.microphoneQuickMatch === false
      || nextPreferences.microphoneSettleDelayMs !== DEFAULT_MICROPHONE_SETTLE_DELAY_MS
      || nextPreferences.voiceAutoEnabled === true
    ) {
      window.localStorage.setItem(SPEECH_SYNTHESIS_STORAGE_KEY, JSON.stringify(nextPreferences));
    } else {
      window.localStorage.removeItem(SPEECH_SYNTHESIS_STORAGE_KEY);
    }
  }

  return nextPreferences;
}

function pickVoice(language, options = {}) {
  const voices = getVoices();
  const normalizedLanguage = String(language || "").toLowerCase();
  const preferredVoice = findVoiceByKey(options.preferredVoiceKey);
  const macedonianVoice = voices.find((voice) => isMacedonianVoice(voice));

  if (preferredVoice) {
    return preferredVoice;
  }

  if (macedonianVoice) {
    return macedonianVoice;
  }

  if (options.allowFallback === false) {
    return null;
  }

  return voices.find((voice) => String(voice.lang || "").toLowerCase().startsWith(normalizedLanguage))
    || voices.find((voice) => String(voice.lang || "").toLowerCase().startsWith("sr"))
    || voices[0]
    || null;
}

export function isSpeechRecognitionSupported() {
  return Boolean(getSpeechRecognitionConstructor());
}

export function isSpeechSynthesisSupported() {
  return typeof window !== "undefined" && Boolean(window.speechSynthesis && window.SpeechSynthesisUtterance);
}

export function getSpeechCapabilities() {
  const voices = listSpeechSynthesisVoices();
  const macedonianVoices = voices.filter((voice) => voice.isMacedonian);
  const macedonianVoice = macedonianVoices[0] || null;
  const recognitionConstructor = getSpeechRecognitionConstructor();
  const platformInfo = getSpeechPlatformInfo();

  return {
    recognitionSupported: Boolean(recognitionConstructor),
    recognitionEngine: recognitionConstructor ? recognitionConstructor.name || "SpeechRecognition" : "",
    synthesisSupported: isSpeechSynthesisSupported(),
    voiceCount: voices.length,
    hasMacedonianVoice: Boolean(macedonianVoice),
    macedonianVoiceCount: macedonianVoices.length,
    macedonianVoiceName: macedonianVoice ? macedonianVoice.name : "",
    macedonianVoiceLang: macedonianVoice ? macedonianVoice.lang : "",
    macedonianVoiceNames: macedonianVoices.map((voice) => voice.name),
    isIOS: platformInfo.isIOS,
    isChromeiOS: platformInfo.isChromeiOS,
    isSafari: platformInfo.isSafari,
  };
}

export function normalizeSpokenText(text = "") {
  return String(text)
    .normalize("NFC")
    .toLowerCase()
    .replace(/[ѝѐ]/g, (value) => (value === "ѝ" ? "и" : "е"))
    .replace(/['’]/g, "")
    .replace(/[^0-9а-шѓѕјљњќџ]+/gi, "");
}

export function isMacedonianRecognitionTranscript(text = "") {
  return !LATIN_LETTER_RE.test(String(text || "").normalize("NFC"));
}

export function collectRecognitionTranscript(results = []) {
  const transcriptParts = [];
  let latestConfidence = 0;
  let lastResultIsFinal = false;

  for (const currentResult of Array.from(results || [])) {
    const alternative = currentResult && currentResult[0] ? currentResult[0] : null;
    const transcriptPart = alternative && alternative.transcript ? alternative.transcript.trim() : "";

    if (!transcriptPart) {
      continue;
    }

    transcriptParts.push(transcriptPart);
    latestConfidence = alternative && typeof alternative.confidence === "number" ? alternative.confidence : latestConfidence;
    lastResultIsFinal = Boolean(currentResult && currentResult.isFinal);
  }

  return {
    transcript: transcriptParts.join(" ").replace(/\s+/g, " ").trim(),
    confidence: latestConfidence,
    isFinal: lastResultIsFinal,
  };
}

export function stopSpeaking() {
  if (isSpeechSynthesisSupported()) {
    window.speechSynthesis.cancel();
  }
}

export async function requestMicrophonePermission() {
  if (typeof navigator === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error("Microphone access is not available in this browser.");
  }

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  stream.getTracks().forEach((track) => {
    track.stop();
  });
}

export function speakText(text, options = {}) {
  return new Promise((resolve, reject) => {
    if (!isSpeechSynthesisSupported()) {
      reject(new Error("Speech synthesis is not supported in this browser."));
      return;
    }

    const value = String(text || "").trim();

    if (!value) {
      resolve();
      return;
    }

    stopSpeaking();

    const utterance = new window.SpeechSynthesisUtterance(value);
    utterance.lang = options.lang || "mk-MK";
    utterance.rate = options.rate || 0.82;
    utterance.pitch = options.pitch || 1.04;
    utterance.volume = options.volume || 1;

    const selectedVoice = pickVoice(utterance.lang, {
      allowFallback: options.allowFallback !== false,
      preferredVoiceKey: options.preferredVoiceKey,
    });

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    const selectedVoiceKey = selectedVoice ? createVoiceKey(selectedVoice) : "";

    utterance.onend = () => {
      resolve({
        voiceName: selectedVoice ? selectedVoice.name : "browser-default",
        voiceLang: selectedVoice ? selectedVoice.lang : utterance.lang,
        voiceKey: selectedVoiceKey,
        usingMacedonianVoice: Boolean(selectedVoice && isMacedonianVoice(selectedVoice)),
        usingFallbackVoice: Boolean(selectedVoice && !isMacedonianVoice(selectedVoice)),
        matchedPreferredVoice: Boolean(
          selectedVoice
          && options.preferredVoiceKey
          && selectedVoiceKey === String(options.preferredVoiceKey || "").trim()
        ),
      });
    };

    utterance.onerror = (event) => {
      reject(new Error(event.error || "Speech synthesis failed."));
    };

    window.speechSynthesis.speak(utterance);
  });
}

export function recognizeOnce(options = {}) {
  return new Promise((resolve, reject) => {
    const SpeechRecognition = getSpeechRecognitionConstructor();
    const signal = options.signal || null;

    if (!SpeechRecognition) {
      reject(new Error("Speech recognition is not supported in this browser."));
      return;
    }

    if (signal && signal.aborted) {
      reject(new Error("Speech recognition aborted."));
      return;
    }

    const recognition = new SpeechRecognition();
    let timeoutId = null;
    let settled = false;
    let latestTranscript = "";
    let latestConfidence = 0;
    let abortHandler = null;
    let interimResolveTimerId = null;

    function detachRecognitionHandlers() {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onnomatch = null;
      recognition.onstart = null;
      recognition.onaudiostart = null;
      recognition.onsoundstart = null;
      recognition.onspeechstart = null;
      recognition.onspeechend = null;
      recognition.onaudioend = null;
      recognition.onend = null;
    }

    recognition.lang = options.lang || "mk-MK";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = options.maxAlternatives || 1;

    function cleanup() {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
        timeoutId = null;
      }

      if (interimResolveTimerId) {
        window.clearTimeout(interimResolveTimerId);
        interimResolveTimerId = null;
      }

      if (signal && abortHandler) {
        signal.removeEventListener("abort", abortHandler);
        abortHandler = null;
      }

      detachRecognitionHandlers();
    }

    function resolveOnce(value) {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      resolve(value);
    }

    function rejectOnce(error) {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      reject(error);
    }

    function finishWithInterimTranscript() {
      resolveOnce({
        transcript: latestTranscript,
        confidence: latestConfidence,
        resolvedEarly: true,
        settledInterim: true,
      });

      try {
        recognition.stop();
      } catch (error) {
        // Ignore stop errors after an early successful match.
      }
    }

    function scheduleInterimResolve(transcript, meta = {}) {
      const delayMs = typeof options.getInterimSettleMs === "function"
        ? coerceInterimResolveDelayMs(options.getInterimSettleMs(transcript, meta), options.interimSettleMs)
        : coerceMicrophoneSettleDelayMs(options.interimSettleMs);

      if (interimResolveTimerId) {
        window.clearTimeout(interimResolveTimerId);
        interimResolveTimerId = null;
      }

      if (delayMs <= 0) {
        finishWithInterimTranscript();
        return;
      }

      interimResolveTimerId = window.setTimeout(() => {
        interimResolveTimerId = null;
        finishWithInterimTranscript();
      }, delayMs);
    }

    recognition.onresult = (event) => {
      if (settled) {
        return;
      }

      const results = event && event.results ? event.results : [];
      const transcriptSnapshot = collectRecognitionTranscript(results);

      latestTranscript = transcriptSnapshot.transcript;
      latestConfidence = transcriptSnapshot.confidence;

      if (typeof options.onTranscriptChange === "function" && latestTranscript) {
        options.onTranscriptChange(latestTranscript, transcriptSnapshot.isFinal);
      }

      if (!latestTranscript) {
        rejectOnce(new Error("Speech recognition returned empty transcript."));
        return;
      }

      if (!transcriptSnapshot.isFinal && typeof options.shouldResolveInterim === "function") {
        const shouldResolveInterim = options.shouldResolveInterim(latestTranscript, {
          confidence: latestConfidence,
          isFinal: false,
        });

        if (shouldResolveInterim) {
          scheduleInterimResolve(latestTranscript, {
            confidence: latestConfidence,
            isFinal: false,
          });
        } else if (interimResolveTimerId) {
          window.clearTimeout(interimResolveTimerId);
          interimResolveTimerId = null;
        }
      }

      if (transcriptSnapshot.isFinal) {
        if (interimResolveTimerId) {
          window.clearTimeout(interimResolveTimerId);
          interimResolveTimerId = null;
        }
        resolveOnce({
          transcript: latestTranscript,
          confidence: latestConfidence,
        });
      }
    };

    recognition.onerror = (event) => {
      if (settled) {
        return;
      }

      rejectOnce(new Error(event.error || "Speech recognition failed."));
    };

    recognition.onnomatch = () => {
      if (settled) {
        return;
      }

      rejectOnce(new Error("No match"));
    };

    recognition.onstart = () => {
      if (settled) {
        return;
      }

      if (typeof options.onStateChange === "function") {
        options.onStateChange("start");
      }
    };

    recognition.onaudiostart = () => {
      if (settled) {
        return;
      }

      if (typeof options.onStateChange === "function") {
        options.onStateChange("audiostart");
      }
    };

    recognition.onsoundstart = () => {
      if (settled) {
        return;
      }

      if (typeof options.onStateChange === "function") {
        options.onStateChange("soundstart");
      }
    };

    recognition.onspeechstart = () => {
      if (settled) {
        return;
      }

      if (typeof options.onStateChange === "function") {
        options.onStateChange("speechstart");
      }
    };

    recognition.onspeechend = () => {
      if (settled) {
        return;
      }

      if (typeof options.onStateChange === "function") {
        options.onStateChange("speechend");
      }
    };

    recognition.onaudioend = () => {
      if (settled) {
        return;
      }

      if (typeof options.onStateChange === "function") {
        options.onStateChange("audioend");
      }
    };

    recognition.onend = () => {
      if (settled) {
        return;
      }

      if (String(latestTranscript || "").trim()) {
        resolveOnce({
          transcript: latestTranscript,
          confidence: latestConfidence,
        });
        return;
      }

      rejectOnce(new Error("Speech recognition ended without result."));
    };

    if (signal) {
      abortHandler = () => {
        try {
          recognition.stop();
        } catch (error) {
          // Ignore stop errors during explicit cancellation.
        }

        rejectOnce(new Error("Speech recognition aborted."));
      };

      signal.addEventListener("abort", abortHandler, { once: true });
    }

    timeoutId = window.setTimeout(() => {
      try {
        recognition.stop();
      } catch (error) {
        rejectOnce(error);
        return;
      }

      rejectOnce(new Error("Speech recognition timed out."));
    }, options.timeoutMs || 10000);

    try {
      recognition.start();
    } catch (error) {
      cleanup();
      rejectOnce(error);
    }
  });
}
