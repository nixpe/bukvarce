import { DEFAULT_TEXT } from "../config/default-text.mjs";
import {
  SAMPLE_DIFFICULTY_OPTIONS,
  SAMPLE_GRADE_OPTIONS,
  SAMPLE_LENGTH_OPTIONS,
  SAMPLE_TEXTS,
  getFilteredSampleTexts,
  getSampleGradeOption,
  getSampleTextbookAttribution,
  getSampleTextById,
} from "../config/sample-texts.mjs";
import { getDictionarySourceFromLocation, loadDictionary } from "../core/dictionary.mjs";
import { extractTextFromImage } from "../integrations/ocr.mjs";
import {
  getSpeechCapabilities,
  getSpeechPlatformInfo,
  isSpeechRecognitionSupported,
  isMacedonianRecognitionTranscript,
  isSpeechSynthesisSupported,
  listSpeechSynthesisVoices,
  loadSpeechSynthesisPreferences,
  recognizeOnce,
  requestMicrophonePermission,
  saveSpeechSynthesisPreferences,
  speakText,
  stopSpeaking,
} from "../integrations/speech.mjs";
import {
  animateMissionRating,
  buildConfetti,
  pulseElement,
  resetCelebrationOverlay,
  resetMissionRating,
  triggerConfetti,
} from "./celebration.mjs";
import {
  MAX_MISSION_STARS,
  STREAK_MILESTONE_SET,
  calculateLevel,
  calculateMissionStarRating,
  updateDashboard,
} from "./progression.mjs";
import { renderEmptyState, renderSegmentedText } from "./render.mjs";
import {
  isSoundSupported,
  loadSoundPreferences,
  playSoundEffect,
  primeSoundboard,
  saveSoundPreferences,
} from "./soundboard.mjs";
import { createAppState, stopPlayback } from "./state.mjs";
import { getVoiceRecognitionMatch } from "./voice-match.mjs";

const LEVEL_PROGRESS_STORAGE_KEY = "mk-reading-aid.level-progress.v1";
const MIC_ICON = "🎙️";
const ADULT_ICON = "🧔🏻";
const PLAY_MODE_OPTIONS = [
  {
    value: "game",
    label: "Игра",
    description: "Нивоа, ѕвезди и следно ниво.",
  },
  {
    value: "practice",
    label: "Вежбање",
    description: "Текстови, фото и пишување за мирно слушање.",
  },
];

function getDom() {
  return {
    heroProgressBadge: document.getElementById("heroProgressBadge"),
    heroRoundSelectButton: document.getElementById("heroRoundSelectButton"),
    heroStatusFace: document.getElementById("heroStatusFace"),
    heroRoundTitle: document.getElementById("heroRoundTitle"),
    heroRoundMeta: document.getElementById("heroRoundMeta"),
    heroHeardBadge: document.getElementById("heroHeardBadge"),
    heroHeardToggleButton: document.getElementById("heroHeardToggleButton"),
    heroHeardToggleIcon: document.getElementById("heroHeardToggleIcon"),
    heroHeardValue: document.getElementById("heroHeardValue"),
    heroRoundModeBadge: document.getElementById("heroRoundModeBadge"),
    heroRoundModeIcon: document.getElementById("heroRoundModeIcon"),
    heroRoundModeLabel: document.getElementById("heroRoundModeLabel"),
    outputPanelIcon: document.getElementById("outputPanelIcon"),
    outputPanelKicker: document.getElementById("outputPanelKicker"),
    outputPanelTitle: document.getElementById("output-panel-title"),
    questCard: document.getElementById("questCard"),
    stickerShelf: document.getElementById("stickerShelf"),
    inputText: document.getElementById("inputText"),
    openHelpDrawerButton: document.getElementById("openHelpDrawerButton"),
    openSettingsDrawerButton: document.getElementById("openSettingsDrawerButton"),
    helpDrawer: document.getElementById("helpDrawer"),
    helpDrawerTitle: document.getElementById("helpDrawerTitle"),
    playGuide: document.getElementById("playGuide"),
    inputDrawer: document.getElementById("inputDrawer"),
    settingsDrawer: document.getElementById("settingsDrawer"),
    closeHelpDrawerButton: document.getElementById("closeHelpDrawerButton"),
    closeInputDrawerButton: document.getElementById("closeInputDrawerButton"),
    closeSettingsDrawerButton: document.getElementById("closeSettingsDrawerButton"),
    drawerBackdrop: document.getElementById("drawerBackdrop"),
    sampleSourceTabButton: document.getElementById("sampleSourceTabButton"),
    sampleSourceTabLabel: document.getElementById("sampleSourceTabLabel"),
    cameraSourceTabButton: document.getElementById("cameraSourceTabButton"),
    cameraSourceTabLabel: document.getElementById("cameraSourceTabLabel"),
    inputSourceTabs: document.getElementById("inputSourceTabs"),
    inputPanelIcon: document.getElementById("inputPanelIcon"),
    inputPanelKicker: document.getElementById("inputPanelKicker"),
    inputPanelTitle: document.getElementById("input-panel-title"),
    sampleSourcePanel: document.getElementById("sampleSourcePanel"),
    cameraSourcePanel: document.getElementById("cameraSourcePanel"),
    sampleFocusKicker: document.getElementById("sampleFocusKicker"),
    sampleGradeSetup: document.getElementById("sampleGradeSetup"),
    sampleDifficultySetup: document.getElementById("sampleDifficultySetup"),
    sampleLengthSetup: document.getElementById("sampleLengthSetup"),
    samplePickerLabel: document.getElementById("samplePickerLabel"),
    splitButton: document.getElementById("splitButton"),
    correctButton: document.getElementById("correctButton"),
    correctButtonGlyph: document.getElementById("correctButtonGlyph"),
    correctButtonLabel: document.getElementById("correctButtonLabel"),
    correctButtonNote: document.getElementById("correctButtonNote"),
    wrongButton: document.getElementById("wrongButton"),
    wrongButtonGlyph: document.getElementById("wrongButtonGlyph"),
    wrongButtonLabel: document.getElementById("wrongButtonLabel"),
    wrongButtonNote: document.getElementById("wrongButtonNote"),
    playButton: document.getElementById("playButton"),
    pauseButton: document.getElementById("pauseButton"),
    speedRange: document.getElementById("speedRange"),
    speedValue: document.getElementById("speedValue"),
    playbackCard: document.getElementById("playbackCard"),
    speakButton: document.getElementById("speakButton"),
    speakButtonGlyph: document.getElementById("speakButtonGlyph"),
    speakButtonLabel: document.getElementById("speakButtonLabel"),
    speakButtonNote: document.getElementById("speakButtonNote"),
    skipButton: document.getElementById("skipButton"),
    voiceAutoButton: document.getElementById("voiceAutoButton"),
    voiceSelect: document.getElementById("voiceSelect"),
    microphoneToolsCard: document.getElementById("microphoneToolsCard"),
    quickListenToggleButton: document.getElementById("quickListenToggleButton"),
    quickListenStatus: document.getElementById("quickListenStatus"),
    microphoneSettleRange: document.getElementById("microphoneSettleRange"),
    microphoneSettleValue: document.getElementById("microphoneSettleValue"),
    microphoneSettleHelp: document.getElementById("microphoneSettleHelp"),
    listenButton: document.getElementById("listenButton"),
    listenButtonLabel: document.getElementById("listenButtonLabel"),
    listenButtonNote: document.getElementById("listenButtonNote"),
    voiceSupport: document.getElementById("voiceSupport"),
    listenIndicator: document.getElementById("listenIndicator"),
    imageInput: document.getElementById("imageInput"),
    sampleGradeOptions: document.getElementById("sampleGradeOptions"),
    sampleDifficultyOptions: document.getElementById("sampleDifficultyOptions"),
    sampleLengthOptions: document.getElementById("sampleLengthOptions"),
    sampleTextSelect: document.getElementById("sampleTextSelect"),
    sampleTextList: document.getElementById("sampleTextList"),
    sampleDescription: document.getElementById("sampleDescription"),
    soundToggleButton: document.getElementById("soundToggleButton"),
    soundStatus: document.getElementById("soundStatus"),
    dictionaryStatus: document.getElementById("dictionaryStatus"),
    scoreCount: document.getElementById("scoreCount"),
    streakCount: document.getElementById("streakCount"),
    levelCount: document.getElementById("levelCount"),
    syllableCount: document.getElementById("syllableCount"),
    positionCount: document.getElementById("positionCount"),
    dictionaryCount: document.getElementById("dictionaryCount"),
    comboPower: document.getElementById("comboPower"),
    prizeCount: document.getElementById("prizeCount"),
    nextGoalLabel: document.getElementById("nextGoalLabel"),
    missionText: document.getElementById("missionText"),
    cheerText: document.getElementById("cheerText"),
    progressFill: document.getElementById("progressFill"),
    progressLabel: document.getElementById("progressLabel"),
    achievementBadge: document.getElementById("achievementBadge"),
    starRating: document.getElementById("starRating"),
    starRatingText: document.getElementById("starRatingText"),
    starRatingStars: Array.from(document.querySelectorAll("[data-star-index]")),
    statusBanner: document.getElementById("statusBanner"),
    outputHelp: document.getElementById("outputHelp"),
    outputText: document.getElementById("outputText"),
    readingSurfaceIcon: document.getElementById("readingSurfaceIcon"),
    readingSurfaceKicker: document.getElementById("readingSurfaceKicker"),
    readingSurfaceTitle: document.getElementById("readingSurfaceTitle"),
    readingToolbar: document.getElementById("readingToolbar"),
    gameInputSwitch: document.getElementById("gameInputSwitch"),
    gameMicModeButton: document.getElementById("gameMicModeButton"),
    gameManualModeButton: document.getElementById("gameManualModeButton"),
    confettiBurst: document.getElementById("confettiBurst"),
    confettiLayer: document.getElementById("confettiLayer"),
    celebrationPanel: document.getElementById("celebrationPanel"),
    celebrationHeading: document.getElementById("celebrationHeading"),
    celebrationStars: document.getElementById("celebrationStars"),
    celebrationStarsList: Array.from(document.querySelectorAll("[data-celebration-star]")),
    celebrationSummary: document.getElementById("celebrationSummary"),
    celebrationContinueButton: document.getElementById("celebrationContinueButton"),
    starBurst: document.getElementById("starBurst"),
    stickers: Array.from(document.querySelectorAll("[data-sticker]")),
    voiceStatus: document.getElementById("voiceStatus"),
    voiceTranscript: document.getElementById("voiceTranscript"),
    ocrStatus: document.getElementById("ocrStatus"),
  };
}

function setStatus(dom, message, tone) {
  if (!dom.statusBanner) {
    return;
  }

  const normalizedMessage = String(message || "").trim();

  if (!normalizedMessage) {
    dom.statusBanner.hidden = true;
    dom.statusBanner.textContent = "";
    dom.statusBanner.dataset.tone = tone || "info";
    return;
  }

  dom.statusBanner.hidden = false;
  dom.statusBanner.dataset.tone = tone;
  dom.statusBanner.textContent = normalizedMessage;
}

function clearStatus(dom, tone = "info") {
  setStatus(dom, "", tone);
}

function setDictionaryStatus(dom, message, tone) {
  if (!dom.dictionaryStatus) {
    return;
  }

  dom.dictionaryStatus.dataset.tone = tone;
  dom.dictionaryStatus.textContent = message;
}

function setVoiceSupport(dom, message) {
  if (!dom.voiceSupport) {
    return;
  }

  dom.voiceSupport.textContent = message;
}

function setVoiceStatus(dom, message) {
  if (!dom.voiceStatus) {
    return;
  }

  dom.voiceStatus.textContent = message;
}

function getTranscriptPreview(message) {
  const normalizedMessage = String(message || "").trim();

  if (!normalizedMessage) {
    return "—";
  }

  const heardPrefix = "Последно слушнато:";
  const previewValue = normalizedMessage.startsWith(heardPrefix)
    ? normalizedMessage.slice(heardPrefix.length).trim()
    : normalizedMessage;

  if (!previewValue || previewValue === "—") {
    return "—";
  }

  if (previewValue === "...") {
    return "Слушам...";
  }

  return previewValue;
}

function syncHeroHeardPreview(dom) {
  if (!dom.heroHeardValue) {
    return;
  }

  const previewValue = getTranscriptPreview(dom.voiceTranscript?.textContent);
  dom.heroHeardValue.textContent = previewValue;
  dom.heroHeardValue.dataset.state = previewValue === "Слушам..."
    ? "listening"
    : previewValue === "—"
      ? "idle"
      : "heard";
}

function updateHeroHeardToggle(dom, state) {
  if (!dom.heroHeardBadge || !dom.heroHeardToggleButton) {
    return;
  }

  const listenState = state.voiceListeningPending
    ? "pending"
    : state.voiceListeningActive
      ? "listening"
      : "idle";

  dom.heroHeardBadge.dataset.listenState = listenState;
  dom.heroHeardToggleButton.dataset.state = listenState;
  dom.heroHeardToggleButton.disabled = state.voiceListeningPending || state.syllableCount === 0 || !canUseGameMicrophone();
  dom.heroHeardToggleButton.setAttribute(
    "aria-label",
    state.voiceListeningActive ? "Стопирај слушање" : "Вклучи слушање"
  );
  dom.heroHeardToggleButton.title = state.voiceListeningActive ? "Стопирај слушање" : "Вклучи слушање";

  if (dom.heroHeardToggleIcon) {
    setDecorativeIcon(dom.heroHeardToggleIcon, MIC_ICON);
  }
}

function setVoiceTranscript(dom, message) {
  dom.voiceTranscript.textContent = message;
  syncHeroHeardPreview(dom);
}

function hasHeardTranscript(dom) {
  const previewValue = getTranscriptPreview(dom.voiceTranscript?.textContent);
  return previewValue !== "—" && previewValue !== "Слушам...";
}

function setOcrStatus(dom, message) {
  dom.ocrStatus.textContent = message;
}

function updateQuickListenUi(dom, state) {
  if (!dom.quickListenToggleButton || !dom.quickListenStatus) {
    return;
  }

  dom.quickListenToggleButton.textContent = state.microphoneQuickMatch
    ? "⚡ Брзо слушање: вклучено"
    : "🐢 Брзо слушање: исклучено";
  dom.quickListenToggleButton.dataset.enabled = state.microphoneQuickMatch ? "true" : "false";
  dom.quickListenStatus.textContent = state.microphoneQuickMatch
    ? "Штом препознае цел збор или низа, апликацијата веднаш продолжува. Ако слушне само почеток, чека уште многу кратко."
    : "Кога е исклучено, апликацијата чека повеќе и повеќе се потпира на финалниот изговор.";
}

function updateMicrophoneSettleUi(dom, state) {
  if (!dom.microphoneSettleRange || !dom.microphoneSettleValue) {
    return;
  }

  const settleDelayMs = Math.max(100, Math.round(Number(state.microphoneSettleDelayMs) || 250));
  const seconds = (settleDelayMs / 1000).toFixed(2).replace(".", ",");
  dom.microphoneSettleRange.value = String(settleDelayMs);
  dom.microphoneSettleValue.value = `${seconds} s`;
  dom.microphoneSettleValue.textContent = `${seconds} s`;
}

function readLevelProgress() {
  if (typeof window === "undefined" || !window.localStorage) {
    return {};
  }

  try {
    const rawValue = window.localStorage.getItem(LEVEL_PROGRESS_STORAGE_KEY);

    if (!rawValue) {
      return {};
    }

    const parsed = JSON.parse(rawValue);
    const source = parsed && typeof parsed === "object" && parsed.levels && typeof parsed.levels === "object"
      ? parsed.levels
      : parsed;

    if (!source || typeof source !== "object") {
      return {};
    }

    return Object.fromEntries(
      Object.entries(source)
        .filter(([sampleId]) => Boolean(getSampleTextById(sampleId)))
        .map(([sampleId, value]) => {
          const entry = value && typeof value === "object" ? value : {};
          const bestStars = Math.max(0, Math.min(MAX_MISSION_STARS, Number(entry.bestStars) || 0));
          const completions = Math.max(Number(entry.completions) || 0, entry.read ? 1 : 0);

          return [
            sampleId,
            {
              read: Boolean(entry.read),
              bestStars,
              completions,
              lastPlayedAt: Number(entry.lastPlayedAt) || 0,
            },
          ];
        })
    );
  } catch (error) {
    return {};
  }
}

function writeLevelProgress(levelProgress) {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }

  try {
    window.localStorage.setItem(
      LEVEL_PROGRESS_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        levels: levelProgress,
      })
    );
  } catch (error) {
    // Ignore storage write failures and keep the app usable.
  }
}

function getLevelProgressEntry(levelProgress, sampleId) {
  const entry = levelProgress && typeof levelProgress === "object" ? levelProgress[sampleId] : null;

  return {
    read: Boolean(entry?.read),
    bestStars: Math.max(0, Math.min(MAX_MISSION_STARS, Number(entry?.bestStars) || 0)),
    completions: Math.max(Number(entry?.completions) || 0, entry?.read ? 1 : 0),
    lastPlayedAt: Number(entry?.lastPlayedAt) || 0,
  };
}

function scrollToBlock(element) {
  if (!element) {
    return;
  }

  element.scrollIntoView({ behavior: "smooth", block: "start" });
}

function animateStatusMascot(dom, mood = "progress") {
  if (!dom.heroStatusFace) {
    return;
  }

  const animationClass = mood === "celebrate" || mood === "happy"
    ? "hero-status-face-burst"
    : "hero-status-face-hop";

  dom.heroStatusFace.classList.remove("hero-status-face-hop", "hero-status-face-burst");
  void dom.heroStatusFace.offsetWidth;
  dom.heroStatusFace.classList.add(animationClass);

  if (dom.heroStatusFaceTimerId) {
    window.clearTimeout(dom.heroStatusFaceTimerId);
  }

  dom.heroStatusFaceTimerId = window.setTimeout(() => {
    dom.heroStatusFace?.classList.remove("hero-status-face-hop", "hero-status-face-burst");
    dom.heroStatusFaceTimerId = null;
  }, mood === "celebrate" ? 980 : 760);
}

function renderTitleMetaSummary(container, titleText, metaText, classes = {}) {
  if (!container) {
    return;
  }

  const safeTitle = String(titleText || "").trim();
  const safeMeta = String(metaText || "").trim();

  if (!safeTitle && !safeMeta) {
    container.textContent = "";
    return;
  }

  const fragment = document.createDocumentFragment();

  if (safeTitle) {
    const title = document.createElement("strong");
    title.className = classes.titleClass || "";
    title.textContent = safeTitle;
    fragment.appendChild(title);
  }

  if (safeMeta) {
    const meta = document.createElement("span");
    meta.className = classes.metaClass || "";
    meta.textContent = safeMeta;
    fragment.appendChild(meta);
  }

  container.replaceChildren(fragment);
}

function setActiveTextSource(dom, state, sourceInfo) {
  state.activeTextSource = sourceInfo;
  updateHeroBadges(dom, state);
  renderPlayGuide(dom, state);
}

function isGameMode(state) {
  return state.playMode === "game";
}

function isPracticeMode(state) {
  return state.playMode === "practice";
}

function canUseGameMicrophone() {
  return isSpeechRecognitionSupported();
}

function getEffectiveGameInputMode(state) {
  return canUseGameMicrophone() && state.gameInputMode !== "manual"
    ? "microphone"
    : "manual";
}

function isMicrophoneMode(state) {
  return (isGameMode(state) || isPracticeMode(state)) && getEffectiveGameInputMode(state) === "microphone";
}

function isManualCheckMode(state) {
  return (isGameMode(state) || isPracticeMode(state)) && getEffectiveGameInputMode(state) === "manual";
}

function shouldUseManualGameCheck(state) {
  return isManualCheckMode(state);
}

function getParentSampleLevels(state) {
  return getFilteredSampleTexts(
    state.selectedSampleGrade,
    state.selectedSampleDifficulty,
    state.selectedSampleLength
  );
}

function getSelectableSamplesForMode(state) {
  return isGameMode(state) ? SAMPLE_TEXTS : getParentSampleLevels(state);
}

function getDefaultGameLevelIndex(samples, levelProgress) {
  for (let index = 0; index < samples.length; index += 1) {
    if (!getLevelProgressEntry(levelProgress, samples[index].id).read) {
      return index;
    }
  }

  return samples.length - 1;
}

function isGameLevelUnlocked(samples, levelProgress, index) {
  if (index <= 0) {
    return true;
  }

  return getLevelProgressEntry(levelProgress, samples[index - 1]?.id).read;
}

function getDefaultGameLevelId(state, samples = SAMPLE_TEXTS) {
  if (!samples.length) {
    return "";
  }

  const firstLockedIndex = getDefaultGameLevelIndex(samples, state.levelProgress);
  return samples[firstLockedIndex]?.id || samples[0]?.id || "";
}

function getGameModeFallbackHelp(hasText) {
  const platform = getSpeechPlatformInfo();

  if (platform.isIOS && platform.isChromeiOS) {
    return hasText
      ? "Во Chrome на iPhone/iPad провери со Точно и Неточно. За микрофон отвори во Safari."
      : "Избери ниво. Во Chrome на iPhone/iPad проверката е со Точно и Неточно.";
  }

  if (platform.isIOS) {
    return hasText
      ? "Ако микрофонот не тргне, провери со Точно и Неточно. За глас отвори во Safari и вклучи Siri."
      : "Избери ниво. Ако нема микрофон, играј со Точно и Неточно.";
  }

  return hasText
    ? "На овој уред провери со Точно и Неточно."
    : "Избери ниво. Ако нема микрофон, играј со Точно и Неточно.";
}

function getPlayModeLabel(mode) {
  return PLAY_MODE_OPTIONS.find((option) => option.value === mode)?.label || PLAY_MODE_OPTIONS[0].label;
}

function getNextPlayMode(state) {
  return isGameMode(state) ? "practice" : "game";
}

function getModeSwitchMeta(state) {
  const nextMode = getNextPlayMode(state);

  return {
    nextMode,
    icon: nextMode === "game" ? "🎮" : "🔊",
    label: getPlayModeLabel(nextMode),
    ariaLabel: nextMode === "game" ? "Префрли на игра" : "Префрли на вежбање",
  };
}

function getPlayGuideConfig(state) {
  if (isPracticeMode(state)) {
    return {
      drawerTitle: "Како се вежба",
      icon: "🔊",
      kicker: "Вежбање",
      title: "Како се вежба",
      intro: "Овде се вежба со текст.\nНема ѕвезди, нивоа и прослава.",
      steps: [
        {
          title: "Одбери текст",
          textLines: [
            "Во Статус горе отвори текст.",
            "Избери учебник, фото или свој текст.",
          ],
          icons: ["📚", "📷", "✍️"],
        },
        {
          title: "Одбери кој помага",
          textLines: [
            `${MIC_ICON} Играта може да слуша додека детето чита.`,
            `${ADULT_ICON} Возрасен може да седи до детето`,
            "и да потврдува точно или неточно.",
          ],
          visual: { kind: "check-modes" },
        },
        {
          title: "Вежбај без бодови",
          textLines: [
            "🔊 Слушај го чита целиот текст.",
            `${MIC_ICON} Глас или ${ADULT_ICON} Возрасен помагаат по ред.`,
            "↻ Одново почнува пак од почеток.",
          ],
          visual: { kind: "game-tools" },
          cards: [
            { icon: "🔊", title: "Слушај", textLines: ["Го чита целиот", "текст на глас."] },
            { icon: "⏸", title: "Стоп", textLines: ["Го запира", "читањето."] },
            { icon: MIC_ICON, title: "Глас", textLines: ["Играта слуша", "додека детето чита."] },
            { icon: ADULT_ICON, title: "Возрасен", textLines: ["Потврдува точно", "или неточно."] },
            { icon: "🔊", title: "Слушни", textLines: ["Го чита следниот дел", "како пример."] },
            { icon: "⏭️", title: "Прескокни", textLines: ["Оди понатаму", "ако заглавите."] },
          ],
        },
      ],
      optionsTitle: "Копчиња",
      options: [
        { icon: "↻", title: "Одново", textLines: ["Го враќа истиот", "текст од почеток."] },
        { icon: "⚙️", title: "Поставки", textLines: ["Брзина,", "глас, микрофон и звук."] },
      ],
      tips: [
        "📚 Во вежбање можеш и учебник и свој текст.",
        "⭐ Вежбањето не собира ѕвезди и не отвора нивоа.",
      ],
    };
  }

  return {
    drawerTitle: "Како се игра",
    icon: "🎮",
    kicker: "Главна игра",
    title: "",
    intro: "",
    steps: [
      {
        title: "Одбери ниво",
        textLines: [
          "Во Статус горе отвори нивоа.",
          "Избери отклучен постер и почни.",
        ],
        visual: { kind: "levels-board" },
      },
      {
        title: "Кој помага при читање",
        textLines: [
          `${MIC_ICON} Играта може сама да слуша.`,
          `${ADULT_ICON} Возрасен може да седи до детето`,
          "и да потврдува точно или неточно.",
        ],
        visual: { kind: "check-modes" },
      },
      {
        title: "Читај и оди понатаму",
        textLines: [
          "Детето чита на глас.",
          "Кога ќе заглави, користи помошните копчиња.",
        ],
        visual: { kind: "game-tools" },
        cards: [
          { icon: MIC_ICON, title: "Глас", textLines: ["Играта слуша", "додека детето чита."] },
          { icon: ADULT_ICON, title: "Возрасен", textLines: ["Седи до детето", "и потврдува точно или неточно."] },
          { icon: "🔊", title: "Слушни", textLines: ["Го чита следниот дел", "како пример."] },
          { icon: "⏭️", title: "Прескокни", textLines: ["Оди понатаму", "ако заглавите."] },
          { icon: "↻", title: "Одново", textLines: ["Го почнува истото ниво", "од почеток."] },
          { icon: "⭐", title: "Ѕвезди", textLines: ["Се чуваат на нивото", "кога ќе стигнете до крај."] },
        ],
      },
      {
        title: "Собери ѕвезди и отвори следно",
        textLines: [
          "Кога ќе стигнете до крај, резултатот се чува.",
          "Повеќе точни читања носат повеќе ѕвезди.",
          "Потоа се отвора следното ниво.",
        ],
        visual: { kind: "level-finish" },
      },
    ],
    optionsTitle: "",
    options: [],
    tips: [],
  };
}

function getGuideLines(value) {
  if (Array.isArray(value)) {
    return value.map((line) => String(line || "").trim()).filter(Boolean);
  }

  return String(value || "")
    .split(/\n+/u)
    .map((line) => line.trim())
    .filter(Boolean);
}

function setDecorativeIcon(element, iconToken) {
  if (!element) {
    return;
  }

  element.replaceChildren();
  element.textContent = iconToken;
}

function createGuideIcon(iconText) {
  const icon = document.createElement("span");
  icon.className = "mini-guide-icon";
  icon.setAttribute("aria-hidden", "true");
  setDecorativeIcon(icon, iconText);
  return icon;
}

function createGuideLevelTile(number, options = {}) {
  const tile = document.createElement("span");
  tile.className = "guide-level-tile";
  tile.dataset.state = options.state || "open";

  const badge = document.createElement("span");
  badge.className = "guide-level-tile-number";
  badge.textContent = String(number);
  tile.appendChild(badge);

  const stars = document.createElement("span");
  stars.className = "guide-level-tile-stars";
  stars.textContent = options.stars || "★★☆";
  tile.appendChild(stars);

  if (options.state === "locked") {
    const lock = document.createElement("span");
    lock.className = "guide-level-tile-lock";
    lock.textContent = "🔒";
    tile.appendChild(lock);
  }

  return tile;
}

function createGuideChoiceCard(iconText, label, modifier = "") {
  const card = document.createElement("span");
  card.className = `guide-choice-card${modifier ? ` ${modifier}` : ""}`;

  const icon = document.createElement("span");
  icon.className = "guide-choice-icon";
  icon.setAttribute("aria-hidden", "true");
  setDecorativeIcon(icon, iconText);

  const text = document.createElement("span");
  text.className = "guide-choice-label";
  text.textContent = label;

  card.append(icon, text);
  return card;
}

function createGuideToolChip(iconText, label, modifier = "") {
  const chip = document.createElement("span");
  chip.className = `guide-tool-chip${modifier ? ` ${modifier}` : ""}`;

  const icon = document.createElement("span");
  icon.className = "guide-tool-chip-icon";
  icon.setAttribute("aria-hidden", "true");
  setDecorativeIcon(icon, iconText);

  const text = document.createElement("span");
  text.className = "guide-tool-chip-label";
  text.textContent = label;

  chip.append(icon, text);
  return chip;
}

function createGuideVisual(visualConfig) {
  const visual = document.createElement("div");
  visual.className = "guide-step-visual";
  visual.setAttribute("aria-hidden", "true");

  if (Array.isArray(visualConfig)) {
    visualConfig.forEach((iconText) => {
      visual.appendChild(createGuideIcon(iconText));
    });
    return visual;
  }

  if (!visualConfig || typeof visualConfig !== "object") {
    return visual;
  }

  if (visualConfig.kind === "levels-board") {
    visual.classList.add("guide-step-visual-board");
    const board = document.createElement("div");
    board.className = "guide-level-board";
    board.append(
      createGuideLevelTile(1, { state: "current", stars: "★★★" }),
      createGuideLevelTile(2, { state: "open", stars: "★★☆" }),
      createGuideLevelTile(3, { state: "open", stars: "☆☆☆" }),
      createGuideLevelTile(4, { state: "locked", stars: "☆☆☆" }),
      createGuideLevelTile(5, { state: "locked", stars: "☆☆☆" }),
      createGuideLevelTile(6, { state: "locked", stars: "☆☆☆" }),
    );
    visual.appendChild(board);
    return visual;
  }

  if (visualConfig.kind === "check-modes") {
    visual.classList.add("guide-step-visual-choices");
    visual.append(
      createGuideChoiceCard(MIC_ICON, "Играта слуша", "guide-choice-card-mic"),
      createGuideChoiceCard(ADULT_ICON, "Возрасен помага", "guide-choice-card-check"),
    );
    return visual;
  }

  if (visualConfig.kind === "game-tools") {
    visual.classList.add("guide-step-visual-tools");
    visual.append(
      createGuideToolChip(MIC_ICON, "Читај"),
      createGuideToolChip(ADULT_ICON, "Возрасен"),
      createGuideToolChip("🔊", "Слушни"),
      createGuideToolChip("⏭️", "Прескокни"),
    );
    return visual;
  }

  if (visualConfig.kind === "level-finish") {
    visual.classList.add("guide-step-visual-finish");
    const reward = document.createElement("div");
    reward.className = "guide-finish-reward";
    reward.append(
      createGuideIcon("⭐"),
      createGuideIcon("⭐"),
      createGuideIcon("⭐"),
    );
    const next = createGuideLevelTile(4, { state: "open", stars: "★☆☆" });
    next.classList.add("guide-level-tile-next");
    visual.append(reward, createGuideToolChip("➡️", "Следно ниво", "guide-tool-chip-next"), next);
    return visual;
  }

  return visual;
}

function renderPlayGuide(dom, state) {
  if (!dom.playGuide) {
    return;
  }

  const config = getPlayGuideConfig(state);

  if (dom.helpDrawerTitle) {
    dom.helpDrawerTitle.textContent = config.drawerTitle;
  }

  const fragment = document.createDocumentFragment();
  const hasHead = Boolean(config.icon || config.kicker || config.title);
  const hasIntro = Boolean(config.intro);

  let head = null;
  if (hasHead) {
    head = document.createElement("div");
    head.className = "mini-guide-head";

    const headIcon = document.createElement("span");
    headIcon.className = "section-title-icon section-title-icon-grass";
    headIcon.setAttribute("aria-hidden", "true");
    headIcon.textContent = config.icon;

    const headCopy = document.createElement("div");
    if (config.kicker) {
      const kicker = document.createElement("p");
      kicker.className = "panel-kicker";
      kicker.textContent = config.kicker;
      headCopy.appendChild(kicker);
    }

    if (config.title) {
      const title = document.createElement("h3");
      title.id = "playGuideTitle";
      title.textContent = config.title;
      headCopy.appendChild(title);
    }

    head.append(headIcon, headCopy);
  }

  let intro = null;
  if (hasIntro) {
    intro = document.createElement("p");
    intro.className = "mini-guide-intro";
    intro.textContent = config.intro;
  }

  const journey = document.createElement("div");
  journey.className = "guide-journey";
  journey.setAttribute("aria-label", "Чекори");

  config.steps.forEach((step, index) => {
    const article = document.createElement("article");
    article.className = "guide-step";

    const number = document.createElement("span");
    number.className = "guide-step-number";
    number.setAttribute("aria-hidden", "true");
    number.textContent = String(index + 1);

    const body = document.createElement("div");
    body.className = "guide-step-body";

    const copy = document.createElement("div");
    copy.className = "guide-step-copy";
    const strong = document.createElement("strong");
    strong.textContent = step.title;
    copy.appendChild(strong);

    const stepLines = getGuideLines(step.textLines || step.text);
    if (stepLines.length > 0) {
      const lines = document.createElement("div");
      lines.className = "guide-text-lines";
      stepLines.forEach((lineText) => {
        const text = document.createElement("span");
        text.textContent = lineText;
        lines.appendChild(text);
      });
      copy.appendChild(lines);
    }

    body.append(createGuideVisual(step.visual || step.icons), copy);

    if (Array.isArray(step.cards) && step.cards.length > 0) {
      const cardGrid = document.createElement("div");
      cardGrid.className = "guide-option-grid guide-step-card-grid";

      step.cards.forEach((option) => {
        const card = document.createElement("article");
        card.className = "guide-option-card guide-option-card-compact";
        const icon = document.createElement("span");
        icon.className = "mini-guide-icon";
        icon.setAttribute("aria-hidden", "true");
        setDecorativeIcon(icon, option.icon);
        const strong = document.createElement("strong");
        strong.textContent = option.title;
        const lines = document.createElement("div");
        lines.className = "guide-text-lines";
        getGuideLines(option.textLines || option.text).forEach((lineText) => {
          const text = document.createElement("span");
          text.textContent = lineText;
          lines.appendChild(text);
        });
        card.append(icon, strong, lines);
        cardGrid.appendChild(card);
      });

      body.appendChild(cardGrid);
    }

    article.append(number, body);
    journey.appendChild(article);

    if (index < config.steps.length - 1) {
      const arrow = document.createElement("span");
      arrow.className = "guide-step-arrow";
      arrow.setAttribute("aria-hidden", "true");
      arrow.textContent = "↓";
      journey.appendChild(arrow);
    }
  });

  if (head) {
    fragment.appendChild(head);
  }

  if (intro) {
    fragment.appendChild(intro);
  }

  fragment.appendChild(journey);

  if (Array.isArray(config.options) && config.options.length > 0) {
    const section = document.createElement("div");
    section.className = "guide-section";

    const sectionHead = document.createElement("div");
    sectionHead.className = "guide-section-head";
    const sectionIcon = document.createElement("span");
    sectionIcon.className = "section-title-icon section-title-icon-sky";
    sectionIcon.setAttribute("aria-hidden", "true");
    sectionIcon.textContent = "🧩";
    const sectionCopy = document.createElement("div");
    const sectionKicker = document.createElement("p");
    sectionKicker.className = "panel-kicker";
    sectionKicker.textContent = "Само за овој начин";
    const sectionTitle = document.createElement("h4");
    sectionTitle.textContent = config.optionsTitle;
    sectionCopy.append(sectionKicker, sectionTitle);
    sectionHead.append(sectionIcon, sectionCopy);

    const optionGrid = document.createElement("div");
    optionGrid.className = "guide-option-grid";

    config.options.forEach((option) => {
      const card = document.createElement("article");
      card.className = "guide-option-card";
      const icon = document.createElement("span");
      icon.className = "mini-guide-icon";
      icon.setAttribute("aria-hidden", "true");
      setDecorativeIcon(icon, option.icon);
      const strong = document.createElement("strong");
      strong.textContent = option.title;
      const lines = document.createElement("div");
      lines.className = "guide-text-lines";
      getGuideLines(option.textLines || option.text).forEach((lineText) => {
        const text = document.createElement("span");
        text.textContent = lineText;
        lines.appendChild(text);
      });
      card.append(icon, strong, lines);
      optionGrid.appendChild(card);
    });

    section.append(sectionHead, optionGrid);
    fragment.appendChild(section);
  }

  if (Array.isArray(config.tips) && config.tips.length > 0) {
    const tips = document.createElement("div");
    tips.className = "guide-tip-row";
    tips.setAttribute("aria-label", "Мали совети");

    config.tips.forEach((tipText) => {
      const tip = document.createElement("span");
      tip.className = "guide-tip";
      tip.textContent = tipText;
      tips.appendChild(tip);
    });

    fragment.appendChild(tips);
  }

  dom.playGuide.replaceChildren(fragment);
}

function getReadingSurfaceMeta(state) {
  if (isPracticeMode(state)) {
    if (isManualCheckMode(state)) {
      return {
        icon: ADULT_ICON,
        kicker: "Вежбање",
        title: "Вежбај со возрасен",
      };
    }

    if (isMicrophoneMode(state)) {
      return {
        icon: MIC_ICON,
        kicker: "Вежбање",
        title: "Вежбај со глас",
      };
    }

    return {
      icon: "🔊",
      kicker: "Вежбање",
      title: "Вежбај и слушај",
    };
  }

  if (shouldUseManualGameCheck(state)) {
    return {
      icon: ADULT_ICON,
      kicker: "Игра",
      title: "Игра со возрасен",
    };
  }

  return {
    icon: "🎮",
    kicker: "Игра",
    title: "Игра со глас",
  };
}

function getOutputPanelMeta(state) {
  if (isPracticeMode(state)) {
    return {
      icon: "🔊",
      kicker: "Вежбање",
      title: "Текст и тренинг",
    };
  }

  return {
    icon: "🎮",
    kicker: "Игра",
    title: "Игра со нивоа",
  };
}

function getInputPreviewTitle(dom) {
  const firstLine = String(dom.inputText?.value || "")
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .find(Boolean);

  if (!firstLine) {
    return "";
  }

  return firstLine.length > 34 ? `${firstLine.slice(0, 33).trimEnd()}…` : firstLine;
}

function getHeroRoundTitle(dom, state) {
  if (state.activeTextSource?.title) {
    if (isGameMode(state)) {
      const levelNumber = getSampleLevelNumber(state.activeTextSource.id || state.selectedSampleId || "");
      return levelNumber ? `Ниво ${levelNumber}: ${state.activeTextSource.title}` : state.activeTextSource.title;
    }

    return state.activeTextSource.title;
  }

  const previewTitle = getInputPreviewTitle(dom);

  if (previewTitle) {
    return previewTitle;
  }

  if (isGameMode(state)) {
    return "Избери ниво";
  }

  if (isPracticeMode(state)) {
    return "Избери текст";
  }

  return state.inputSourceTab === "camera" ? "Фото или пишување" : "Избери текст";
}

function getHeroRoundMeta(dom, state) {
  if (state.activeTextSource?.title) {
    if (isGameMode(state)) {
      const progress = getLevelProgressEntry(state.levelProgress, state.activeTextSource.id || state.selectedSampleId || "");
      const metadata = [state.activeTextSource.bookTitle, state.activeTextSource.pageLabel].filter(Boolean).join(" · ");
      return `${metadata}${metadata ? " · " : ""}⭐ ${progress.bestStars}/${MAX_MISSION_STARS}`;
    }

    return [state.activeTextSource.bookTitle, state.activeTextSource.pageLabel].filter(Boolean).join(" · ");
  }

  if (dom.inputText?.value.trim()) {
    return state.inputSourceTab === "camera"
      ? "Фото, камера или рачно пишување."
      : "Рачно внесен текст за овој круг.";
  }

  if (isGameMode(state)) {
    return "Отклучувај ниво по ниво и собирај ѕвезди.";
  }

  return state.inputSourceTab === "camera"
    ? "Сликај страница или напиши свој текст."
    : "Избери готов текст, фото или свој текст за вежбање.";
}

function updateHeroBadges(dom, state) {
  const modeSwitchMeta = getModeSwitchMeta(state);

  if (dom.heroRoundTitle) {
    dom.heroRoundTitle.textContent = getHeroRoundTitle(dom, state);
  }

  renderHeroRoundMeta(dom, state);

  if (dom.heroRoundSelectButton) {
    dom.heroRoundSelectButton.setAttribute(
      "aria-label",
      isGameMode(state) ? "Избери друго ниво" : "Избери друг текст"
    );
  }

  if (dom.heroRoundModeBadge) {
    dom.heroRoundModeBadge.dataset.mode = modeSwitchMeta.nextMode;
    dom.heroRoundModeBadge.setAttribute("aria-label", modeSwitchMeta.ariaLabel);
  }

  if (dom.heroRoundModeIcon) {
    dom.heroRoundModeIcon.textContent = modeSwitchMeta.icon;
  }

  if (dom.heroRoundModeLabel) {
    dom.heroRoundModeLabel.textContent = modeSwitchMeta.label;
  }

  if (dom.heroHeardBadge) {
    dom.heroHeardBadge.hidden = !isMicrophoneMode(state);
    dom.heroHeardBadge.dataset.mode = isMicrophoneMode(state) ? "microphone" : "manual";
    syncHeroHeardPreview(dom);
    updateHeroHeardToggle(dom, state);
  }
}

function updateRestartButton(dom, state) {
  if (!dom.splitButton) {
    return;
  }

  dom.splitButton.hidden = !state.restartAvailable;
}

function unlockRestartButton(dom, state) {
  if (state.restartAvailable || state.syllableCount === 0) {
    return;
  }

  state.restartAvailable = true;
  updateRestartButton(dom, state);
}

function getDrawerElement(dom, drawerName) {
  if (drawerName === "help") {
    return dom.helpDrawer;
  }

  if (drawerName === "input") {
    return dom.inputDrawer;
  }

  if (drawerName === "settings") {
    return dom.settingsDrawer;
  }

  return null;
}

function getDrawerTrigger(dom, drawerName) {
  if (drawerName === "help") {
    return dom.openHelpDrawerButton;
  }

  if (drawerName === "input") {
    return dom.heroRoundSelectButton;
  }

  if (drawerName === "settings") {
    return dom.openSettingsDrawerButton;
  }

  return null;
}

function setDrawerTriggerState(button, isOpen) {
  if (!button) {
    return;
  }

  button.setAttribute("aria-expanded", isOpen ? "true" : "false");
  button.dataset.open = isOpen ? "true" : "false";
}

function getFirstFocusableInDrawer(drawer) {
  return drawer?.querySelector("[data-drawer-initial-focus]")
    || drawer?.querySelector(
      "button:not([disabled]), textarea:not([disabled]), select:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex='-1'])"
    )
    || null;
}

function closeDrawer(dom, options = {}) {
  const activeDrawerName = dom.activeDrawerName || "";

  if (!activeDrawerName) {
    return;
  }

  const activeDrawer = getDrawerElement(dom, activeDrawerName);
  const activeTrigger = getDrawerTrigger(dom, activeDrawerName);
  const focusTarget = options.focusTarget || dom.lastDrawerTrigger || activeTrigger || null;

  if (activeDrawer) {
    activeDrawer.dataset.open = "false";
    activeDrawer.setAttribute("aria-hidden", "true");
  }

  if (dom.drawerBackdrop) {
    dom.drawerBackdrop.dataset.open = "false";
    dom.drawerBackdrop.setAttribute("aria-hidden", "true");
  }

  document.body.dataset.drawerOpen = "false";
  document.body.dataset.activeDrawer = "";
  setDrawerTriggerState(activeTrigger, false);
  dom.activeDrawerName = "";
  dom.lastDrawerTrigger = null;

  if (options.restoreFocus !== false && focusTarget && typeof focusTarget.focus === "function") {
    focusTarget.focus();
  }
}

function openDrawer(dom, drawerName, trigger = null) {
  const drawer = getDrawerElement(dom, drawerName);
  const drawerTrigger = getDrawerTrigger(dom, drawerName);

  if (!drawer || !drawerTrigger) {
    return;
  }

  if (dom.activeDrawerName && dom.activeDrawerName !== drawerName) {
    closeDrawer(dom, { restoreFocus: false });
  } else if (dom.activeDrawerName === drawerName) {
    return;
  }

  drawer.dataset.open = "true";
  drawer.setAttribute("aria-hidden", "false");
  if (dom.drawerBackdrop) {
    dom.drawerBackdrop.dataset.open = "true";
    dom.drawerBackdrop.setAttribute("aria-hidden", "false");
  }

  document.body.dataset.drawerOpen = "true";
  document.body.dataset.activeDrawer = drawerName;
  dom.activeDrawerName = drawerName;
  dom.lastDrawerTrigger = trigger || drawerTrigger;
  setDrawerTriggerState(drawerTrigger, true);

  const firstFocusable = getFirstFocusableInDrawer(drawer);

  if (firstFocusable) {
    window.setTimeout(() => {
      firstFocusable.focus();
    }, 90);
  }
}

function toggleDrawer(dom, drawerName, trigger = null) {
  if (dom.activeDrawerName === drawerName) {
    closeDrawer(dom, { focusTarget: trigger || getDrawerTrigger(dom, drawerName) || null });
    return;
  }

  openDrawer(dom, drawerName, trigger);
}

function revealGuide(guideId) {
  const guide = document.getElementById(guideId);

  if (!guide) {
    return;
  }

  guide.scrollIntoView({ behavior: "smooth", block: "start" });
  guide.classList.add("mini-guide-focus");
  window.setTimeout(() => {
    guide.classList.remove("mini-guide-focus");
  }, 1200);
}

function openGuide(dom, button) {
  const guideId = button.dataset.guideLink;
  const drawerName = button.dataset.openDrawer || "";

  if (!guideId) {
    return;
  }

  if (!drawerName) {
    revealGuide(guideId);
    return;
  }

  openDrawer(dom, drawerName, getDrawerTrigger(dom, drawerName));
  window.setTimeout(() => {
    revealGuide(guideId);
  }, 180);
}

function updateInputSourceTabs(dom, state) {
  const gameMode = isGameMode(state);
  const practiceMode = isPracticeMode(state);

  if (!practiceMode) {
    state.inputSourceTab = "samples";
  }

  const isSamplesTab = state.inputSourceTab !== "camera";

  if (dom.inputPanelKicker) {
    dom.inputPanelKicker.textContent = gameMode
      ? "Игра"
      : "Вежбање";
  }

  if (dom.inputPanelIcon) {
    dom.inputPanelIcon.textContent = gameMode ? "🎮" : "📚";
  }

  if (dom.inputPanelTitle) {
    dom.inputPanelTitle.textContent = gameMode
      ? "Избери ниво"
      : "Избери текст";
  }

  if (dom.sampleSourceTabLabel) {
    dom.sampleSourceTabLabel.textContent = gameMode ? "Нивоа" : "Учебник";
  }

  if (dom.cameraSourceTabLabel) {
    dom.cameraSourceTabLabel.textContent = "Фото и пишување";
  }

  if (dom.inputSourceTabs) {
    dom.inputSourceTabs.hidden = !practiceMode;
  }

  if (dom.cameraSourceTabButton) {
    dom.cameraSourceTabButton.hidden = !practiceMode;
  }

  if (dom.sampleGradeSetup) {
    dom.sampleGradeSetup.hidden = !practiceMode;
  }

  if (dom.sampleDifficultySetup) {
    dom.sampleDifficultySetup.hidden = !practiceMode;
  }

  if (dom.sampleLengthSetup) {
    dom.sampleLengthSetup.hidden = !practiceMode;
  }

  if (dom.playbackCard) {
    dom.playbackCard.hidden = !practiceMode;
  }

  if (dom.quickListenToggleButton) {
    dom.quickListenToggleButton.hidden = false;
  }

  if (dom.quickListenStatus) {
    dom.quickListenStatus.hidden = false;
  }

  if (dom.microphoneToolsCard) {
    dom.microphoneToolsCard.hidden = false;
  }

  if (dom.microphoneSettleRange) {
    dom.microphoneSettleRange.closest(".range-row")?.toggleAttribute("hidden", false);
  }

  if (dom.microphoneSettleHelp) {
    dom.microphoneSettleHelp.hidden = false;
  }

  dom.sampleSourceTabButton.setAttribute("aria-selected", isSamplesTab ? "true" : "false");
  dom.sampleSourceTabButton.dataset.selected = isSamplesTab ? "true" : "false";
  dom.sampleSourcePanel.hidden = !isSamplesTab;

  if (dom.cameraSourceTabButton) {
    dom.cameraSourceTabButton.setAttribute("aria-selected", isSamplesTab ? "false" : "true");
    dom.cameraSourceTabButton.dataset.selected = isSamplesTab ? "false" : "true";
  }

  if (dom.cameraSourcePanel) {
    dom.cameraSourcePanel.hidden = !practiceMode || isSamplesTab;
  }
}

function updateSoundUi(dom, state) {
  if (!isSoundSupported()) {
    dom.soundToggleButton.disabled = true;
    dom.soundToggleButton.textContent = "🔇 Звуци: недостапни";
    dom.soundStatus.textContent = "Овој прелистувач нема звучни ефекти.";
    return;
  }

  dom.soundToggleButton.disabled = false;
  dom.soundToggleButton.textContent = state.soundEnabled
    ? "🔊 Звуци: вклучени"
    : "🔈 Звуци: исклучени";
  dom.soundStatus.textContent = state.soundEnabled
    ? "Се слуша при игра."
    : "Без звучни ефекти.";
}

function playEffect(state, kind) {
  if (!state.soundEnabled || !isSoundSupported()) {
    return;
  }

  playSoundEffect(kind);
}

function getSampleGradeDoodle(option) {
  if (option.value === "grade1") {
    return ["1", "🐣"];
  }

  return ["2", "📘"];
}

function getSampleDifficultyDoodle(option) {
  if (option.value === "easy") {
    return ["Аа", "ма-ма"];
  }

  return ["џ-џ", "сло-же-но"];
}

function getSampleLengthDoodle(option) {
  if (option.value === "short") {
    return ["⚡", "3 реда"];
  }

  if (option.value === "medium") {
    return ["📘", "пола страна"];
  }

  return ["📚", "цел пасус"];
}

function findOptionByValue(options, value) {
  return options.find((option) => option.value === value) || null;
}

function createHeroMetaText(value) {
  const text = document.createElement("span");
  text.className = "hero-round-meta-text";
  text.textContent = value;
  return text;
}

function createHeroMetaBadge(label, doodles = [], modifier = "", title = "", note = "") {
  const badge = document.createElement("span");
  const iconOnly = !label && !note;
  badge.className = `hero-round-meta-badge${modifier ? ` ${modifier}` : ""}${iconOnly ? " hero-round-meta-badge-icons-only" : ""}`;

  if (title) {
    badge.title = title;
  }

  if (doodles.length > 0) {
    const doodle = document.createElement("span");
    doodle.className = "hero-round-meta-doodle";

    doodles.forEach((token, index) => {
      const mark = document.createElement("span");
      mark.className = "hero-round-meta-doodle-mark";
      mark.dataset.index = String(index + 1);
      mark.textContent = token;
      doodle.appendChild(mark);
    });

    badge.appendChild(doodle);
  }

  if (label || note) {
    const copy = document.createElement("span");
    copy.className = "hero-round-meta-badge-copy";

    if (label) {
      const text = document.createElement("span");
      text.className = "hero-round-meta-badge-label";
      text.textContent = label;
      copy.appendChild(text);
    }

    if (note) {
      const hint = document.createElement("span");
      hint.className = "hero-round-meta-badge-note";
      hint.textContent = note;
      copy.appendChild(hint);
    }

    badge.appendChild(copy);
  }
  return badge;
}

function createHeroStarBadge(bestStars) {
  const badge = document.createElement("span");
  badge.className = "hero-round-meta-badge hero-round-meta-badge-stars";

  const icon = document.createElement("span");
  icon.className = "hero-round-meta-star";
  icon.textContent = "⭐";

  const text = document.createElement("span");
  text.className = "hero-round-meta-badge-label";
  text.textContent = `${bestStars}/${MAX_MISSION_STARS}`;

  badge.append(icon, text);
  return badge;
}

function renderHeroRoundMeta(dom, state) {
  if (!dom.heroRoundMeta) {
    return;
  }

  if (state.activeTextSource?.title) {
    dom.heroRoundMeta.replaceChildren();

    const sample = getSampleTextById(state.activeTextSource.id || state.selectedSampleId || "");

    if (isGameMode(state)) {
      const progress = getLevelProgressEntry(state.levelProgress, state.activeTextSource.id || state.selectedSampleId || "");
      const metadata = [state.activeTextSource.bookTitle, state.activeTextSource.pageLabel].filter(Boolean).join(" · ");
      const primaryLine = document.createElement("span");
      primaryLine.className = "hero-round-meta-line hero-round-meta-line-primary";
      const secondaryLine = document.createElement("span");
      secondaryLine.className = "hero-round-meta-line hero-round-meta-line-secondary";

      if (metadata) {
        primaryLine.appendChild(createHeroMetaText(metadata));
      }

      primaryLine.appendChild(createHeroStarBadge(progress.bestStars));

      if (sample?.difficulty) {
        const difficultyOption = findOptionByValue(SAMPLE_DIFFICULTY_OPTIONS, sample.difficulty);

        if (difficultyOption) {
          secondaryLine.appendChild(createHeroMetaBadge(
            "",
            getSampleDifficultyDoodle(difficultyOption),
            "hero-round-meta-badge-difficulty",
            difficultyOption.description
          ));
        }
      }

      if (sample?.length) {
        const lengthOption = findOptionByValue(SAMPLE_LENGTH_OPTIONS, sample.length);

        if (lengthOption) {
          secondaryLine.appendChild(createHeroMetaBadge(
            "",
            getSampleLengthDoodle(lengthOption),
            "hero-round-meta-badge-length",
            lengthOption.description
          ));
        }
      }

      if (primaryLine.childNodes.length > 0) {
        dom.heroRoundMeta.appendChild(primaryLine);
      }

      if (secondaryLine.childNodes.length > 0) {
        dom.heroRoundMeta.appendChild(secondaryLine);
      }

      return;
    }

    dom.heroRoundMeta.textContent = [state.activeTextSource.bookTitle, state.activeTextSource.pageLabel].filter(Boolean).join(" · ");
    return;
  }

  dom.heroRoundMeta.textContent = getHeroRoundMeta(dom, state);
}

function updateModeButtons(dom, state) {
  const gameMode = isGameMode(state);
  const microphoneMode = isMicrophoneMode(state);
  const practiceMode = isPracticeMode(state);
  const manualGameCheck = shouldUseManualGameCheck(state);
  const hasActiveRound = state.syllableCount > 0 && !state.missionCompleted;
  const hasText = state.syllableCount > 0;
  dom.correctButton.hidden = !manualGameCheck;
  dom.wrongButton.hidden = !manualGameCheck;
  dom.listenButton.hidden = true;
  dom.speakButton.hidden = !microphoneMode;
  dom.skipButton.hidden = !microphoneMode;
  dom.playButton.hidden = !practiceMode || !hasText;
  dom.pauseButton.hidden = !practiceMode || !hasText;
  dom.questCard.hidden = practiceMode;
  dom.stickerShelf.hidden = practiceMode;
  dom.heroProgressBadge.hidden = practiceMode;

  if (dom.readingToolbar) {
    dom.readingToolbar.hidden = !hasText;
  }

  if (dom.gameInputSwitch) {
    dom.gameInputSwitch.hidden = !hasText;
  }

  if (dom.gameMicModeButton) {
    const microphoneSelected = microphoneMode;
    dom.gameMicModeButton.dataset.selected = microphoneSelected ? "true" : "false";
    dom.gameMicModeButton.setAttribute("aria-pressed", microphoneSelected ? "true" : "false");
    dom.gameMicModeButton.disabled = !canUseGameMicrophone();
  }

  if (dom.gameManualModeButton) {
    dom.gameManualModeButton.dataset.selected = manualGameCheck ? "true" : "false";
    dom.gameManualModeButton.setAttribute("aria-pressed", manualGameCheck ? "true" : "false");
    dom.gameManualModeButton.disabled = false;
  }

  updateHeroHeardToggle(dom, state);

  const outputPanelMeta = getOutputPanelMeta(state);
  if (dom.outputPanelIcon) {
    setDecorativeIcon(dom.outputPanelIcon, outputPanelMeta.icon);
  }
  if (dom.outputPanelKicker) {
    dom.outputPanelKicker.textContent = outputPanelMeta.kicker;
  }
  if (dom.outputPanelTitle) {
    dom.outputPanelTitle.textContent = outputPanelMeta.title;
  }

  const readingSurfaceMeta = getReadingSurfaceMeta(state);
  if (dom.readingSurfaceIcon) {
    setDecorativeIcon(dom.readingSurfaceIcon, readingSurfaceMeta.icon);
  }
  if (dom.readingSurfaceKicker) {
    dom.readingSurfaceKicker.textContent = readingSurfaceMeta.kicker;
  }
  if (dom.readingSurfaceTitle) {
    dom.readingSurfaceTitle.textContent = readingSurfaceMeta.title;
  }

  dom.correctButtonGlyph.textContent = "✅";
  dom.correctButtonLabel.textContent = "Точно";
  dom.correctButtonNote.textContent = "Добро";
  dom.wrongButtonGlyph.textContent = "❌";
  dom.wrongButtonLabel.textContent = "Неточно";
  dom.wrongButtonNote.textContent = "Пробај пак";

  dom.listenButtonLabel.textContent = state.voiceListeningPending
    ? "Се вклучува..."
    : state.voiceListeningActive
      ? "Стоп"
      : "Кажи";
  dom.listenButtonNote.textContent = microphoneMode
    ? state.voiceListeningPending
      ? "Бара дозвола"
      : state.voiceListeningActive
        ? "Микрофонот слуша"
        : "Кажи на глас"
    : "Само во овој режим";
  dom.speakButtonGlyph.textContent = "🔊";
  dom.speakButtonLabel.textContent = "Слушни";
  dom.speakButtonNote.textContent = microphoneMode
    ? "Пример за следниот дел"
    : "Само со микрофон";

  dom.correctButton.disabled = !manualGameCheck || !hasActiveRound;
  dom.wrongButton.disabled = !manualGameCheck || !hasActiveRound;
  dom.skipButton.disabled = !microphoneMode || !hasActiveRound;
  if (dom.listenButton) {
    dom.listenButton.disabled = !microphoneMode || !canUseGameMicrophone() || state.voiceListeningPending || state.syllableCount === 0;
  }
  dom.speakButton.disabled = !microphoneMode || !isSpeechSynthesisSupported() || state.syllableCount === 0;

  if (practiceMode) {
    dom.outputHelp.hidden = false;
    dom.outputHelp.textContent = hasText
      ? manualGameCheck
        ? "Вежбај со возрасен.\nВозрасниот потврдува точно или неточно."
        : microphoneMode
          ? "Вежбај со глас.\nЧитај наглас, слушај пример или пушти го целиот текст."
          : "Слушај го текстот и пушти пак кога сакаш."
      : "Избери текст за вежбање.";
  } else {
    dom.outputHelp.hidden = gameMode;
    dom.outputHelp.textContent = manualGameCheck
        ? hasText
          ? "Игра со возрасен.\nВозрасниот потврдува точно или неточно."
          : getGameModeFallbackHelp(hasText)
        : gameMode && hasText
          ? state.voiceListeningPending
            ? "Играта го вклучува микрофонот."
            : state.voiceListeningActive
              ? "Кажувај наглас.\nИграта слуша."
              : "Микрофонот почнува сам.\nИмаш Слушни и Прескокни."
        : "Избери ниво и микрофонот ќе почне сам.";
  }

  updateHeroBadges(dom, state);
}

function updatePlayModeUi(dom, state) {
  updateModeButtons(dom, state);
}

function createChoiceCard(option, currentValue, getValue, getDoodle, onSelect) {
  const value = String(getValue(option));
  const button = document.createElement("button");
  const doodle = document.createElement("div");
  const label = document.createElement("strong");

  button.type = "button";
  button.className = "choice-card";
  button.dataset.value = value;
  button.dataset.selected = value === String(currentValue) ? "true" : "false";
  button.setAttribute("aria-pressed", value === String(currentValue) ? "true" : "false");

  doodle.className = "choice-doodle";
  getDoodle(option).forEach((token, index) => {
    const mark = document.createElement("span");
    mark.className = "choice-doodle-mark";
    mark.dataset.index = String(index + 1);
    mark.textContent = token;
    doodle.appendChild(mark);
  });

  label.className = "choice-card-label";
  label.textContent = option.label;

  button.append(doodle, label);
  button.addEventListener("click", () => {
    onSelect(value);
  });
  return button;
}

function populateChoiceCards(container, options, currentValue, getValue, getDoodle, onSelect) {
  const fragment = document.createDocumentFragment();

  options.forEach((option) => {
    fragment.appendChild(createChoiceCard(option, currentValue, getValue, getDoodle, onSelect));
  });

  container.replaceChildren(fragment);
}

function updateChoiceCardSelection(container, currentValue) {
  Array.from(container.querySelectorAll(".choice-card")).forEach((button) => {
    const isSelected = button.dataset.value === String(currentValue);
    button.dataset.selected = isSelected ? "true" : "false";
    button.setAttribute("aria-pressed", isSelected ? "true" : "false");
  });
}

function populateSelectOptions(selectElement, options, currentValue, getValue, getLabel) {
  const fragment = document.createDocumentFragment();

  options.forEach((option) => {
    const value = String(getValue(option));
    const label = getLabel(option);
    const optionElement = document.createElement("option");
    optionElement.value = value;
    optionElement.textContent = label;
    fragment.appendChild(optionElement);
  });

  selectElement.replaceChildren(fragment);
  selectElement.value = String(currentValue ?? "");
}

function getSamplePreviewText(text) {
  const previewLines = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 3);

  const previewText = previewLines.join("\n");
  const hasMoreContent = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .length > previewLines.length;

  return hasMoreContent ? `${previewText}...` : previewText;
}

function getCurrentSampleLevels(state) {
  return getSelectableSamplesForMode(state);
}

function getSampleLevelNumber(sampleId) {
  const sampleIndex = SAMPLE_TEXTS.findIndex((sample) => sample.id === sampleId);
  return sampleIndex >= 0 ? sampleIndex + 1 : 0;
}

function animatePlayModeSwitch(dom, playMode) {
  if (dom.heroRoundModeBadge) {
    dom.heroRoundModeBadge.classList.remove("hero-round-mode-burst");
    void dom.heroRoundModeBadge.offsetWidth;
    dom.heroRoundModeBadge.classList.add("hero-round-mode-burst");
  }

  if (dom.heroRoundSelectButton) {
    dom.heroRoundSelectButton.classList.remove("hero-round-select-burst");
    void dom.heroRoundSelectButton.offsetWidth;
    dom.heroRoundSelectButton.classList.add("hero-round-select-burst");
  }

  if (dom.outputText) {
    dom.outputText.classList.remove("reading-surface-mode-burst");
    void dom.outputText.offsetWidth;
    dom.outputText.classList.add("reading-surface-mode-burst");
  }

  if (dom.playModeAnimationTimerId) {
    window.clearTimeout(dom.playModeAnimationTimerId);
  }

  dom.playModeAnimationTimerId = window.setTimeout(() => {
    dom.heroRoundModeBadge?.classList.remove("hero-round-mode-burst");
    dom.heroRoundSelectButton?.classList.remove("hero-round-select-burst");
    dom.outputText?.classList.remove("reading-surface-mode-burst");
    dom.playModeAnimationTimerId = null;
  }, 900);
}

function revealGameLevelPicker(dom) {
  if (!dom.heroRoundSelectButton) {
    return;
  }

  openDrawer(dom, "input", dom.heroRoundSelectButton);

  if (dom.gameLevelRevealTimerId) {
    window.clearTimeout(dom.gameLevelRevealTimerId);
  }

  window.setTimeout(() => {
    if (!dom.sampleTextList) {
      return;
    }

    dom.sampleTextList.classList.remove("sample-text-list-reveal");
    void dom.sampleTextList.offsetWidth;
    dom.sampleTextList.classList.add("sample-text-list-reveal");
    dom.sampleTextList.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 120);

  dom.gameLevelRevealTimerId = window.setTimeout(() => {
    dom.sampleTextList?.classList.remove("sample-text-list-reveal");
    dom.gameLevelRevealTimerId = null;
  }, 1100);
}

function getNextLevelSampleId(state, samples = getCurrentSampleLevels(state)) {
  if (!samples.length || !isGameMode(state)) {
    return "";
  }

  const currentId = state.currentLevelSampleId || state.selectedSampleId;
  const currentIndex = samples.findIndex((sample) => sample.id === currentId);

  if (currentIndex < 0 || currentIndex >= samples.length - 1) {
    return "";
  }

  return samples[currentIndex + 1]?.id || "";
}

function renderSampleLevelSummary(container, state, samples, activeSample) {
  if (!container) {
    return;
  }

  if (!samples.length || !activeSample) {
    container.textContent = "Нема ниво за овој избор.";
    return;
  }

  const completedCount = samples.filter((sample) => getLevelProgressEntry(state.levelProgress, sample.id).read).length;
  const totalBestStars = samples.reduce(
    (total, sample) => total + getLevelProgressEntry(state.levelProgress, sample.id).bestStars,
    0
  );
  const activeProgress = getLevelProgressEntry(state.levelProgress, activeSample.id);
  const activeLevelNumber = Math.max(samples.findIndex((sample) => sample.id === activeSample.id) + 1, 1);
  const nextLevelSampleId = getNextLevelSampleId(state, samples);
  const nextLevelNumber = Math.max(samples.findIndex((sample) => sample.id === nextLevelSampleId) + 1, 1);
  const nextLevelLabel = nextLevelSampleId ? `Следно: ниво ${nextLevelNumber}` : "Последно ниво во оваа патека";

  if (isGameMode(state)) {
    const unlockedCount = samples.reduce((count, _sample, index) => {
      return count + (isGameLevelUnlocked(samples, state.levelProgress, index) ? 1 : 0);
    }, 0);

    renderTitleMetaSummary(
      container,
      `Патека: ${completedCount}/${samples.length} · ⭐ ${totalBestStars}`,
      `Отклучени ${unlockedCount}/${samples.length} · Ниво ${activeLevelNumber} · ${activeSample.title} · ${activeProgress.bestStars}/${MAX_MISSION_STARS} ѕвезди`,
      {
        titleClass: "sample-description-title",
        metaClass: "sample-description-meta",
      }
    );
    return;
  }

  renderTitleMetaSummary(
    container,
    `Текстови за вежбање: ${samples.length}`,
    `${activeSample.title} · ${activeSample.source} · фото и пишување за тренинг`,
    {
      titleClass: "sample-description-title",
      metaClass: "sample-description-meta",
    }
  );
}

function createSamplePreviewCard(sample, selectedSampleId, onSelect, options = {}) {
  const button = document.createElement("button");
  const meta = document.createElement("span");
  const title = document.createElement("strong");
  const progress = document.createElement("span");
  const preview = document.createElement("span");
  const levelProgress = getLevelProgressEntry(options.levelProgress, sample.id);
  const levelNumber = options.levelNumber || getSampleLevelNumber(sample.id);
  const isNextLevel = Boolean(options.nextLevelSampleId) && options.nextLevelSampleId === sample.id;

  button.type = "button";
  button.className = "sample-preview-card";
  button.setAttribute("role", "option");
  button.dataset.selected = sample.id === selectedSampleId ? "true" : "false";
  button.setAttribute("aria-selected", sample.id === selectedSampleId ? "true" : "false");
  button.dataset.read = levelProgress.read ? "true" : "false";

  meta.className = "sample-preview-meta";
  meta.textContent = `🎯 Ниво ${levelNumber} · 📘 ${getSampleGradeOption(sample.grade).label} · ${sample.source}`;

  title.className = "sample-preview-title";
  title.textContent = `📖 ${sample.title}`;

  progress.className = "sample-preview-progress";
  progress.appendChild(
    Object.assign(document.createElement("span"), {
      className: "sample-preview-chip",
      textContent: levelProgress.read ? "✅ Прочитано" : "🆕 Ново",
    })
  );
  progress.appendChild(
    Object.assign(document.createElement("span"), {
      className: "sample-preview-chip sample-preview-chip-stars",
      textContent: `⭐ ${levelProgress.bestStars}/${MAX_MISSION_STARS}`,
    })
  );
  if (isNextLevel) {
    progress.appendChild(
      Object.assign(document.createElement("span"), {
        className: "sample-preview-chip sample-preview-chip-next",
        textContent: "➡️ Следно",
      })
    );
  }

  preview.className = "sample-preview-text";
  preview.textContent = getSamplePreviewText(sample.text);

  button.append(meta, title, progress, preview);
  button.addEventListener("click", () => {
    onSelect(sample.id);
  });
  return button;
}

function renderSamplePreviewList(container, samples, selectedSampleId, onSelect, options = {}) {
  container.classList.remove("sample-text-list-levels");

  if (!samples.length) {
    const empty = document.createElement("p");
    empty.className = "sample-text-list-empty";
    empty.textContent = "Нема ниво за овој избор.";
    container.replaceChildren(empty);
    return;
  }

  const fragment = document.createDocumentFragment();

  samples.forEach((sample, index) => {
    fragment.appendChild(createSamplePreviewCard(sample, selectedSampleId, onSelect, {
      ...options,
      levelNumber: index + 1,
    }));
  });

  container.replaceChildren(fragment);
}

function createGameLevelCard(sample, selectedSampleId, onSelect, options = {}) {
  const button = document.createElement("button");
  const levelNumber = document.createElement("strong");
  const title = document.createElement("span");
  const stars = document.createElement("span");
  const stateChip = document.createElement("span");
  const levelProgress = getLevelProgressEntry(options.levelProgress, sample.id);
  const isSelected = sample.id === selectedSampleId;
  const isUnlocked = Boolean(options.unlocked || levelProgress.read);

  button.type = "button";
  button.className = "level-grid-card";
  button.dataset.selected = isSelected ? "true" : "false";
  button.dataset.read = levelProgress.read ? "true" : "false";
  button.dataset.locked = isUnlocked ? "false" : "true";
  button.setAttribute("role", "option");
  button.setAttribute("aria-selected", isSelected ? "true" : "false");
  button.disabled = !isUnlocked;

  levelNumber.className = "level-grid-number";
  levelNumber.textContent = String(options.levelNumber || getSampleLevelNumber(sample.id));

  title.className = "level-grid-title";
  title.textContent = sample.title;

  stars.className = "level-grid-stars";
  for (let index = 0; index < MAX_MISSION_STARS; index += 1) {
    const star = document.createElement("span");
    star.className = "level-grid-star";
    star.dataset.earned = index < levelProgress.bestStars ? "true" : "false";
    star.textContent = "★";
    stars.appendChild(star);
  }

  stateChip.className = "level-grid-chip";
  if (!isUnlocked) {
    stateChip.textContent = "🔒";
  } else if (isSelected) {
    stateChip.textContent = "▶️ Играј";
  } else if (options.isNextLevel) {
    stateChip.textContent = "➡️ Следно";
  } else if (levelProgress.read) {
    stateChip.textContent = "✅";
  } else {
    stateChip.textContent = "🆕";
  }

  button.append(levelNumber, title, stars, stateChip);
  button.addEventListener("click", () => {
    if (!isUnlocked) {
      return;
    }

    onSelect(sample.id);
  });

  return button;
}

function renderGameLevelGrid(container, samples, selectedSampleId, onSelect, options = {}) {
  if (!samples.length) {
    const empty = document.createElement("p");
    empty.className = "sample-text-list-empty";
    empty.textContent = "Нема достапни нивоа.";
    container.replaceChildren(empty);
    return;
  }

  container.classList.add("sample-text-list-levels");
  const fragment = document.createDocumentFragment();

  samples.forEach((sample, index) => {
    fragment.appendChild(createGameLevelCard(sample, selectedSampleId, onSelect, {
      ...options,
      levelNumber: index + 1,
      unlocked: isGameLevelUnlocked(samples, options.levelProgress, index),
      isNextLevel: options.nextLevelSampleId === sample.id,
    }));
  });

  container.replaceChildren(fragment);
}

function setPlayMode(dom, state, playMode, options = {}) {
  if (!PLAY_MODE_OPTIONS.some((option) => option.value === playMode)) {
    return;
  }

  const previousMode = state.playMode;
  const modeChanged = previousMode !== playMode;

  clearVoiceAutostart(state);
  state.playMode = playMode;

  if (modeChanged && (state.voiceListeningActive || state.voiceListeningPending || state.voiceLoopRunning)) {
    stopVoiceRecognition(dom, state, {
      voiceMessage: "Слушањето е стопирано поради промена на режимот.",
      transcriptMessage: "Последно слушнато: —",
    });
  }

  if (isGameMode(state) && !SAMPLE_TEXTS.some((sample) => sample.id === state.selectedSampleId)) {
    state.selectedSampleId = getDefaultGameLevelId(state);
  }

  updateVoiceButton(dom, state);
  updateInputSourceTabs(dom, state);
  updateSampleUi(dom, state);
  updatePlayModeUi(dom, state);

  if (modeChanged) {
    animatePlayModeSwitch(dom, playMode);
  }

  if (options.skipRender) {
    return;
  }

  if (isGameMode(state) && state.selectedSampleId) {
    syncSelectedSampleIntoInput(dom, state, {
      focusOutput: false,
      tone: "success",
      message: `Подготвено е нивото „${getSampleTextById(state.selectedSampleId)?.title || ""}“.`,
    });
  }

  if (dom.inputText.value.trim()) {
    renderOutput(
      dom,
      state,
      "info",
      playMode === "practice"
        ? shouldUseManualGameCheck(state)
          ? "Вежбањето е подготвено. Возрасен може да потврдува точно или неточно."
          : "Вежбањето е подготвено. Можеш да слушаш, да читаш со глас и да вежбаш без ѕвезди."
        : shouldUseManualGameCheck(state)
          ? "Играта е спремна. Возрасен може да потврдува со ✅ и ❌."
          : "Играта е спремна. Детето кажува, микрофонот слуша."
    );
  } else {
    updateDashboard(dom, state);
  }

  if (modeChanged && isGameMode(state) && options.revealLevels !== false) {
    revealGameLevelPicker(dom);
  }
}

function setGameInputMode(dom, state, gameInputMode) {
  if (!["microphone", "manual"].includes(gameInputMode)) {
    return;
  }

  const nextMode = canUseGameMicrophone() ? gameInputMode : "manual";

  if (state.gameInputMode === nextMode) {
    updateModeButtons(dom, state);
    return;
  }

  state.gameInputMode = nextMode;

  if (state.voiceListeningActive || state.voiceListeningPending || state.voiceLoopRunning) {
    stopVoiceRecognition(dom, state, {
      voiceMessage: nextMode === "manual" ? "Возрасен може да потврдува точно или неточно." : "Микрофонот е подготвен.",
      transcriptMessage: "Последно слушнато: —",
    });
  }

  updateModeButtons(dom, state);

  if (nextMode === "microphone") {
    requestVoiceAutostart(dom, state);
  }
}

function syncSelectedSampleIntoInput(dom, state, options = {}) {
  if (!state.selectedSampleId || !getSampleTextById(state.selectedSampleId)) {
    return false;
  }

  return loadSelectedSample(dom, state, {
    focusOutput: false,
    ...options,
  });
}

function selectSampleLevel(dom, state, sampleId, options = {}) {
  if (!sampleId || !getSampleTextById(sampleId)) {
    return false;
  }

  if (isGameMode(state)) {
    const gameSamples = SAMPLE_TEXTS;
    const sampleIndex = gameSamples.findIndex((sample) => sample.id === sampleId);

    if (sampleIndex < 0 || !isGameLevelUnlocked(gameSamples, state.levelProgress, sampleIndex)) {
      return false;
    }
  }

  state.selectedSampleId = sampleId;
  if (dom.sampleTextSelect) {
    dom.sampleTextSelect.value = sampleId;
  }

  updateSampleUi(dom, state);
  const loaded = syncSelectedSampleIntoInput(dom, state, options);

  if (loaded && options.closeDrawer) {
    closeDrawer(dom, { restoreFocus: false });
  }

  return loaded;
}

function updateCelebrationContinueAction(dom, state) {
  if (!dom.celebrationContinueButton) {
    return;
  }

  if (!state.celebrationPinned) {
    state.nextLevelSampleId = "";
    dom.celebrationContinueButton.textContent = "Продолжи";
    return;
  }

  if (!isGameMode(state)) {
    state.nextLevelSampleId = "";
    dom.celebrationContinueButton.textContent = "Затвори";
    return;
  }

  const nextLevelSampleId = state.currentLevelSampleId ? getNextLevelSampleId(state) : "";
  state.nextLevelSampleId = nextLevelSampleId;
  dom.celebrationContinueButton.textContent = nextLevelSampleId ? "Следно ниво" : "Затвори";
}

function recordCompletedLevel(dom, state, earnedStars) {
  if (!isGameMode(state)) {
    updateCelebrationContinueAction(dom, state);
    return;
  }

  const sampleId = state.currentLevelSampleId;

  if (!sampleId || !getSampleTextById(sampleId)) {
    updateCelebrationContinueAction(dom, state);
    return;
  }

  const currentEntry = getLevelProgressEntry(state.levelProgress, sampleId);
  state.levelProgress = {
    ...state.levelProgress,
    [sampleId]: {
      read: true,
      bestStars: Math.max(currentEntry.bestStars, Math.max(Number(earnedStars) || 0, 0)),
      completions: currentEntry.completions + 1,
      lastPlayedAt: Date.now(),
    },
  };
  writeLevelProgress(state.levelProgress);
  updateSampleUi(dom, state);
  updateCelebrationContinueAction(dom, state);
}

function updateSampleUi(dom, state) {
  populateChoiceCards(
    dom.sampleGradeOptions,
    SAMPLE_GRADE_OPTIONS,
    state.selectedSampleGrade,
    (option) => option.value,
    getSampleGradeDoodle,
    (value) => {
      state.selectedSampleGrade = value;
      updateSampleUi(dom, state);
      syncSelectedSampleIntoInput(dom, state);
    }
  );
  populateChoiceCards(
    dom.sampleDifficultyOptions,
    SAMPLE_DIFFICULTY_OPTIONS,
    state.selectedSampleDifficulty,
    (option) => option.value,
    getSampleDifficultyDoodle,
    (value) => {
      state.selectedSampleDifficulty = value;
      updateSampleUi(dom, state);
      syncSelectedSampleIntoInput(dom, state);
    }
  );
  populateChoiceCards(
    dom.sampleLengthOptions,
    SAMPLE_LENGTH_OPTIONS,
    state.selectedSampleLength,
    (option) => option.value,
    getSampleLengthDoodle,
    (value) => {
      state.selectedSampleLength = value;
      updateSampleUi(dom, state);
      syncSelectedSampleIntoInput(dom, state);
    }
  );

  updateChoiceCardSelection(dom.sampleGradeOptions, state.selectedSampleGrade);
  updateChoiceCardSelection(dom.sampleDifficultyOptions, state.selectedSampleDifficulty);
  updateChoiceCardSelection(dom.sampleLengthOptions, state.selectedSampleLength);

  const filteredSamples = getCurrentSampleLevels(state);
  const hasSelectedSample = filteredSamples.some((sample) => sample.id === state.selectedSampleId);

  if (isGameMode(state)) {
    const selectedIndex = filteredSamples.findIndex((sample) => sample.id === state.selectedSampleId);
    const selectedUnlocked = selectedIndex >= 0 && isGameLevelUnlocked(filteredSamples, state.levelProgress, selectedIndex);
    state.selectedSampleId = hasSelectedSample && selectedUnlocked
      ? state.selectedSampleId
      : getDefaultGameLevelId(state, filteredSamples);
  } else {
    state.selectedSampleId = hasSelectedSample ? state.selectedSampleId : filteredSamples[0]?.id || "";
  }

  populateSelectOptions(
    dom.sampleTextSelect,
    filteredSamples,
    state.selectedSampleId,
    (sample) => sample.id,
    (sample) => sample.title
  );
  if (isGameMode(state)) {
    renderGameLevelGrid(dom.sampleTextList, filteredSamples, state.selectedSampleId, (sampleId) => {
      selectSampleLevel(dom, state, sampleId, {
        focusOutput: false,
        closeDrawer: true,
      });
      playEffect(state, "start");
    }, {
      levelProgress: state.levelProgress,
      nextLevelSampleId: getNextLevelSampleId(state, filteredSamples),
    });
  } else {
    renderSamplePreviewList(dom.sampleTextList, filteredSamples, state.selectedSampleId, (sampleId) => {
      selectSampleLevel(dom, state, sampleId, {
        focusOutput: false,
        closeDrawer: true,
      });
      playEffect(state, "start");
    }, {
      levelProgress: state.levelProgress,
      nextLevelSampleId: getNextLevelSampleId(state, filteredSamples),
    });
  }

  const activeSample = getSampleTextById(state.selectedSampleId) || filteredSamples[0] || null;
  const hasSamples = filteredSamples.length > 0;

  dom.sampleTextSelect.disabled = !hasSamples;

  if (!hasSamples || !activeSample) {
    dom.sampleDescription.textContent = "Нема ниво за оваа патека.";
    return;
  }

  renderSampleLevelSummary(dom.sampleDescription, state, filteredSamples, activeSample);
}

function loadSelectedSample(dom, state, options = {}) {
  const sample = getSampleTextById(state.selectedSampleId);

  if (!sample) {
    setStatus(dom, "Нема избран пример за вчитување.", "warning");
    return false;
  }

  dom.inputText.value = sample.text;
  state.currentLevelSampleId = sample.id;
  setActiveTextSource(dom, state, getSampleTextbookAttribution(sample));
  renderOutput(
    dom,
    state,
    options.tone || "success",
    options.message || `Текстот „${sample.title}“ е спремен.`
  );

  if (options.focusOutput !== false) {
    dom.outputText.focus();
  }

  return true;
}

function setListeningIndicator(dom, stateName) {
  const labels = {
    idle: "Микрофон: готов",
    permission: "Микрофон: дозвола",
    start: "Микрофон: слуша",
    audiostart: "Микрофон: звук",
    soundstart: "Микрофон: шум",
    speechstart: "Микрофон: глас",
    speechend: "Микрофон: проверка",
    audioend: "Микрофон: крај",
    error: "Микрофон: проблем",
  };

  dom.listenIndicator.dataset.state = stateName;
  dom.listenIndicator.textContent = labels[stateName] || labels.idle;
}

function setPlaybackButtons(dom, isPlaying) {
  dom.playButton.disabled = isPlaying;
  dom.pauseButton.disabled = !isPlaying;
}

function updateSpeedLabel(dom, state) {
  const seconds = (state.playbackDelay / 1000).toFixed(1).replace(".", ",");
  dom.speedValue.value = `${seconds} s`;
  dom.speedValue.textContent = `${seconds} s`;
}

function getSyllableElements(dom) {
  return Array.from(dom.outputText.querySelectorAll("[data-syllable-index]"));
}

function getCurrentSyllable(dom, state) {
  return getSyllableElements(dom)[state.currentSyllableIndex] || null;
}

function getCurrentSyllableText(dom, state) {
  const syllable = getCurrentSyllable(dom, state);
  return syllable ? syllable.textContent.trim() : "";
}

function getUpcomingSyllableTexts(dom, state, maxCount = 8) {
  if (state.currentSyllableIndex < 0) {
    return [];
  }

  return getSyllableElements(dom)
    .slice(state.currentSyllableIndex, state.currentSyllableIndex + Math.max(1, maxCount))
    .map((syllable) => syllable.textContent.trim())
    .filter(Boolean);
}

function shouldAutoSpeakOnProgress(state) {
  return isPracticeMode(state) && state.voiceAutoEnabled;
}

function updateVoiceButton(dom, state) {
  if (!dom.voiceAutoButton) {
    return;
  }

  dom.voiceAutoButton.textContent = state.voiceAutoEnabled
    ? "🔈 Авто-читање во вежбање: вклучено"
    : "🔇 Авто-читање во вежбање: исклучено";
  dom.voiceAutoButton.dataset.enabled = state.voiceAutoEnabled ? "true" : "false";
  dom.voiceAutoButton.disabled = !isSpeechSynthesisSupported();
}

function formatVoiceOptionLabel(voice) {
  const badges = [];

  if (voice.isMacedonian) {
    badges.push("MK");
  }

  if (voice.default) {
    badges.push("default");
  }

  return badges.length
    ? `${voice.name} (${voice.lang}) · ${badges.join(" · ")}`
    : `${voice.name} (${voice.lang})`;
}

function populateVoiceSelect(dom, state) {
  const voices = listSpeechSynthesisVoices();
  const fragment = document.createDocumentFragment();
  const automaticOption = document.createElement("option");

  automaticOption.value = "";
  automaticOption.textContent = voices.some((voice) => voice.isMacedonian)
    ? "Автоматски (преферира македонски)"
    : "Автоматски";
  fragment.appendChild(automaticOption);

  voices.forEach((voice) => {
    const option = document.createElement("option");
    option.value = voice.key;
    option.textContent = formatVoiceOptionLabel(voice);
    fragment.appendChild(option);
  });

  dom.voiceSelect.replaceChildren(fragment);

  const hadPreferredVoice = Boolean(state.preferredVoiceKey);
  const preferredVoiceKey = voices.length > 0 && voices.some((voice) => voice.key === state.preferredVoiceKey)
    ? state.preferredVoiceKey
    : voices.length === 0
      ? state.preferredVoiceKey
      : "";

  state.preferredVoiceKey = preferredVoiceKey;
  dom.voiceSelect.value = preferredVoiceKey;
  dom.voiceSelect.disabled = !isSpeechSynthesisSupported() || voices.length === 0;

  if (hadPreferredVoice && voices.length > 0 && !preferredVoiceKey) {
    saveSpeechSynthesisPreferences({
      preferredVoiceKey: "",
      microphoneQuickMatch: state.microphoneQuickMatch,
      microphoneSettleDelayMs: state.microphoneSettleDelayMs,
      voiceAutoEnabled: state.voiceAutoEnabled,
    });
  }
}

function updateListenButton(dom, state) {
  if (state.voiceListeningPending) {
    if (dom.listenButtonLabel) {
      dom.listenButtonLabel.textContent = "Се вклучува...";
    }
    if (dom.listenButtonNote) {
      dom.listenButtonNote.textContent = "Бара дозвола";
    }
    updateHeroHeardToggle(dom, state);
    return;
  }

  if (dom.listenButtonLabel) {
    dom.listenButtonLabel.textContent = state.voiceListeningActive
      ? "Стоп"
      : "Кажи";
  }

  if (dom.listenButtonNote) {
    dom.listenButtonNote.textContent = state.voiceListeningActive
      ? "Микрофонот слуша"
      : "Кажи на глас";
  }

  updateHeroHeardToggle(dom, state);
}

function highlightCurrentSyllable(dom, state, options = {}) {
  const syllables = getSyllableElements(dom);

  syllables.forEach((element) => {
    element.classList.remove("syllable-highlight", "syllable-highlight-pop");
  });

  if (state.currentSyllableIndex < 0) {
    updateDashboard(dom, state);
    updateModeButtons(dom, state);
    return;
  }

  const current = syllables[state.currentSyllableIndex];

  if (current) {
    void current.offsetWidth;
    current.classList.add("syllable-highlight");
    current.classList.add("syllable-highlight-pop");
    current.scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  updateDashboard(dom, state);
  updateModeButtons(dom, state);

  if (options.speak && typeof options.onSpeak === "function") {
    options.onSpeak(current ? current.textContent : "");
  }
}

function flashFeedback(element, isCorrect) {
  if (!element) {
    return;
  }

  element.classList.remove("syllable-correct", "syllable-wrong");
  void element.offsetWidth;
  element.classList.add(isCorrect ? "syllable-correct" : "syllable-wrong");

  window.setTimeout(() => {
    element.classList.remove("syllable-correct", "syllable-wrong");
  }, 340);
}

function resetRound(state) {
  state.currentSyllableIndex = -1;
  state.syllableCount = 0;
  state.completedSyllables = 0;
  state.mistakeCount = 0;
  state.streak = 0;
  state.bestStreak = 0;
  state.missionCompleted = false;
  state.roundStarRating = 0;
}

function moveToNextSyllable(dom, state, isCorrect, options = {}) {
  const practiceMode = Boolean(options.practiceMode ?? isPracticeMode(state));
  const advanceCount = isCorrect
    ? Math.max(1, Math.floor(Number(options.advanceCount) || 1))
    : 1;

  if (state.syllableCount === 0) {
    return { kind: "empty", practiceMode };
  }

  if (isCorrect && state.missionCompleted) {
    highlightCurrentSyllable(dom, state);
    return { kind: "completed", practiceMode };
  }

  const current = getCurrentSyllable(dom, state);

  if (!current) {
    highlightCurrentSyllable(dom, state);
    return { kind: "missing", practiceMode };
  }

  if (!isCorrect) {
    flashFeedback(current, false);
    if (!practiceMode) {
      state.mistakeCount += 1;
      state.streak = 0;
      playEffect(state, "wrong");
    }
    highlightCurrentSyllable(dom, state);
    return { kind: "retry", practiceMode };
  }

  const syllables = getSyllableElements(dom);
  const matchedSyllables = syllables.slice(
    state.currentSyllableIndex,
    state.currentSyllableIndex + advanceCount
  );
  const matchedCount = Math.max(1, matchedSyllables.length);
  const previousLevel = state.level;
  const previousStreak = state.streak;

  matchedSyllables.forEach((syllable) => {
    flashFeedback(syllable, true);
    syllable.classList.add("syllable-cleared");
  });

  state.completedSyllables = Math.min(state.completedSyllables + matchedCount, state.syllableCount);
  if (!practiceMode) {
    state.score += 10 * matchedCount;
    state.streak += matchedCount;
    state.bestStreak = Math.max(state.bestStreak, state.streak);
    state.level = calculateLevel(state.score);
    playEffect(state, "correct");
  }

  const leveledUp = !practiceMode && state.level > previousLevel;
  const hitMilestone = !practiceMode
    && Array.from(STREAK_MILESTONE_SET).some((milestone) => milestone > previousStreak && milestone <= state.streak);
  const completedMission = state.completedSyllables >= state.syllableCount;

  if (completedMission) {
    state.missionCompleted = true;
    state.roundStarRating = practiceMode ? 0 : calculateMissionStarRating(state);
    stopPlayback(state);
    setPlaybackButtons(dom, false);
  } else {
    state.currentSyllableIndex = Math.min(state.currentSyllableIndex + matchedCount, state.syllableCount - 1);
  }

  highlightCurrentSyllable(dom, state, options);

  if (!practiceMode && completedMission) {
    animateStatusMascot(dom, "celebrate");
    triggerConfetti(dom, state, "mega", { persist: true });
    pulseElement(dom.achievementBadge);
    playEffect(state, "finish");
    animateMissionRating(dom, state, state.roundStarRating, {
      onRevealStar() {
        playEffect(state, "star");
      },
    });
  } else if (leveledUp || hitMilestone) {
    animateStatusMascot(dom, "happy");
    triggerConfetti(dom, state, leveledUp ? "mega" : "normal");
    pulseElement(dom.achievementBadge);
    playEffect(state, leveledUp ? "level" : "milestone");
  } else {
    animateStatusMascot(dom, state.streak >= 3 || state.completedSyllables >= Math.ceil(state.syllableCount * 0.5)
      ? "happy"
      : "progress");
  }

  return {
    kind: "success",
    completedMission,
    leveledUp,
    hitMilestone,
    practiceMode,
    matchedSyllables: matchedCount,
    earnedStars: completedMission ? state.roundStarRating : 0,
  };
}

function skipCurrentSyllable(dom, state) {
  const practiceMode = isPracticeMode(state);

  if (state.syllableCount === 0) {
    return { kind: "empty", practiceMode };
  }

  if (state.missionCompleted) {
    highlightCurrentSyllable(dom, state);
    return { kind: "completed", practiceMode };
  }

  const current = getCurrentSyllable(dom, state);

  if (!current) {
    highlightCurrentSyllable(dom, state);
    return { kind: "missing", practiceMode };
  }

  flashFeedback(current, false);
  current.classList.add("syllable-cleared");

  if (!practiceMode) {
    state.mistakeCount += 1;
    state.streak = 0;
    playEffect(state, "wrong");
  }

  state.completedSyllables = Math.min(state.completedSyllables + 1, state.syllableCount);
  const completedMission = state.completedSyllables >= state.syllableCount;

  if (completedMission) {
    state.missionCompleted = true;
    state.roundStarRating = practiceMode ? 0 : calculateMissionStarRating(state);
    stopPlayback(state);
    setPlaybackButtons(dom, false);
  } else {
    state.currentSyllableIndex = Math.min(state.currentSyllableIndex + 1, state.syllableCount - 1);
  }

  highlightCurrentSyllable(dom, state);

  if (!practiceMode && completedMission) {
    triggerConfetti(dom, state, "mega", { persist: true });
    pulseElement(dom.achievementBadge);
    playEffect(state, "finish");
    animateMissionRating(dom, state, state.roundStarRating, {
      onRevealStar() {
        playEffect(state, "star");
      },
    });
  }

  return {
    kind: "skipped",
    completedMission,
    practiceMode,
    earnedStars: completedMission ? state.roundStarRating : 0,
  };
}

function renderOutput(dom, state, announceTone, announceMessage) {
  const inputValue = dom.inputText.value;

  // Секое ново рендерирање почнува нов круг, но собраните ѕвезди остануваат во тековната сесија.
  clearVoiceAutostart(state);
  if (state.voiceListeningActive || state.voiceListeningPending || state.voiceLoopRunning) {
    stopVoiceRecognition(dom, state, {
      voiceMessage: "Авто-слушањето е прекинато затоа што започна нов круг.",
      transcriptMessage: "Последно слушнато: —",
    });
  }

  stopPlayback(state);
  stopSpeaking();
  setPlaybackButtons(dom, false);
  resetCelebrationOverlay(dom, state);
  resetRound(state);
  resetMissionRating(dom, state, { force: true });
  state.restartAvailable = false;
  updateRestartButton(dom, state);
  updateModeButtons(dom, state);

  if (!inputValue.trim()) {
    renderEmptyState(dom.outputText, "Внеси текст за да се прикаже раздвоениот излез.");
    updateDashboard(dom, state);
    updateModeButtons(dom, state);
    setStatus(dom, announceMessage || "Внеси текст за да започне играта.", announceTone || "info");
    return;
  }

  const renderResult = renderSegmentedText(dom.outputText, inputValue, state.dictionaryEntries);
  state.syllableCount = renderResult.syllableCount;
  state.currentSyllableIndex = state.syllableCount > 0 ? 0 : -1;
  highlightCurrentSyllable(dom, state);

  if (announceMessage) {
    setStatus(dom, announceMessage, announceTone);
  }

  requestVoiceAutostart(dom, state);
}

function refreshVoiceSupport(dom, state) {
  const capabilities = getSpeechCapabilities();
  const voices = listSpeechSynthesisVoices();
  const selectedVoice = voices.find((voice) => voice.key === state.preferredVoiceKey) || null;

  if (!capabilities.synthesisSupported && !capabilities.recognitionSupported) {
    setVoiceSupport(dom, "Овој прелистувач нема достапни говорни алатки за апликацијата.");
    return;
  }

  if (selectedVoice && selectedVoice.isMacedonian) {
    setVoiceSupport(dom, `Избран е македонски глас: ${selectedVoice.name}.`);
    return;
  }

  if (capabilities.hasMacedonianVoice) {
    const voiceSummary = capabilities.macedonianVoiceCount > 1
      ? `${capabilities.macedonianVoiceName} и уште ${capabilities.macedonianVoiceCount - 1}`
      : capabilities.macedonianVoiceName;

    if (selectedVoice) {
      setVoiceSupport(dom, `Избран е гласот ${selectedVoice.name} (${selectedVoice.lang}). За читање на македонски, избери македонски глас од листата.`);
      return;
    }

    setVoiceSupport(dom, `Најден е македонски глас: ${voiceSummary}. Избери го од листата.`);
    return;
  }

  if (capabilities.synthesisSupported) {
    if (selectedVoice) {
      setVoiceSupport(dom, `Избран е гласот ${selectedVoice.name} (${selectedVoice.lang}). Македонски глас не беше пронајден. Ве молиме изберете некој од понудените.`);
      return;
    }

    setVoiceSupport(dom, "Македонски глас не беше пронајден. Ве молиме изберете некој од понудените.");
    return;
  }

  setVoiceSupport(dom, "Читањето наглас не е достапно, но можеш да користиш други алатки на играта.");
}

function isVoiceRecognitionAbortError(error) {
  const message = String(error && error.message ? error.message : error || "");
  return message.includes("aborted");
}

function isRecoverableVoiceRecognitionError(error) {
  const message = String(error && error.message ? error.message : error || "");

  return message.includes("timed out")
    || message.includes("ended without result")
    || message.includes("empty transcript")
    || message.includes("No match");
}

function waitForVoiceRetry(delayMs) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, delayMs);
  });
}

function clearVoiceAutostart(state) {
  if (!state.voiceAutoStartTimerId) {
    return;
  }

  window.clearTimeout(state.voiceAutoStartTimerId);
  state.voiceAutoStartTimerId = null;
}

function requestVoiceAutostart(dom, state, options = {}) {
  clearVoiceAutostart(state);

  if (!isMicrophoneMode(state) || state.syllableCount === 0 || state.currentSyllableIndex < 0 || state.missionCompleted) {
    return;
  }

  if (!isSpeechRecognitionSupported() || state.voiceListeningActive || state.voiceListeningPending) {
    return;
  }

  let retriesRemaining = Number.isFinite(options.retries) ? options.retries : 10;

  const tryStart = () => {
    if (!isMicrophoneMode(state) || state.syllableCount === 0 || state.currentSyllableIndex < 0 || state.missionCompleted) {
      clearVoiceAutostart(state);
      return;
    }

    if (!isSpeechRecognitionSupported() || state.voiceListeningActive || state.voiceListeningPending) {
      clearVoiceAutostart(state);
      return;
    }

    if (state.voiceLoopRunning) {
      if (retriesRemaining <= 0) {
        clearVoiceAutostart(state);
        return;
      }

      retriesRemaining -= 1;
      state.voiceAutoStartTimerId = window.setTimeout(tryStart, 120);
      return;
    }

    clearVoiceAutostart(state);
    void handleVoiceRecognition(dom, state, { autoStart: true });
  };

  tryStart();
}

function stopVoiceRecognition(dom, state, options = {}) {
  clearVoiceAutostart(state);
  state.voiceListeningActive = false;
  state.voiceListeningPending = false;

  if (state.voiceRecognitionAbortController) {
    state.voiceRecognitionAbortController.abort();
    state.voiceRecognitionAbortController = null;
  }

  if (dom.listenButton) {
    dom.listenButton.disabled = false;
  }
  updateListenButton(dom, state);
  setListeningIndicator(dom, options.indicator || "idle");

  if (options.voiceMessage) {
    setVoiceStatus(dom, options.voiceMessage);
  }

  if (options.transcriptMessage) {
    setVoiceTranscript(dom, options.transcriptMessage);
  }

  updateModeButtons(dom, state);
}

async function speakCurrentSyllable(dom, state) {
  const syllableText = getCurrentSyllableText(dom, state);

  if (!syllableText) {
    setVoiceStatus(dom, "Нема активен слог што може да се прочита наглас.");
    return;
  }

  if (!isSpeechSynthesisSupported()) {
    setVoiceStatus(dom, "Прелистувачот не поддржува читање наглас.");
    return;
  }

  setVoiceStatus(dom, `Се чита слогот „${syllableText}“.`);

  try {
    const speechInfo = await speakText(syllableText, {
      lang: "mk-MK",
      preferredVoiceKey: state.preferredVoiceKey,
    });

    if (speechInfo.matchedPreferredVoice && speechInfo.usingMacedonianVoice) {
      setVoiceStatus(dom, `Слогот „${syllableText}“ беше прочитан со избраниот македонски глас (${speechInfo.voiceName}).`);
      return;
    }

    if (speechInfo.matchedPreferredVoice) {
      setVoiceStatus(dom, `Слогот „${syllableText}“ беше прочитан со избраниот глас (${speechInfo.voiceName}).`);
      return;
    }

    if (speechInfo.usingMacedonianVoice) {
      setVoiceStatus(dom, `Слогот „${syllableText}“ беше прочитан со македонски глас (${speechInfo.voiceName}).`);
      return;
    }

    setVoiceStatus(dom, `Слогот „${syllableText}“ беше прочитан, но не е пронајден вграден македонски глас.`);
  } catch (error) {
    setVoiceStatus(dom, "Не успеа читањето наглас. Обиди се повторно.");
  }
}

async function requestHint(dom, state) {
  if (!isMicrophoneMode(state)) {
    setStatus(dom, "Копчето „Слушни“ работи кога е вклучен „Глас“.", "info");
    return;
  }

  await speakCurrentSyllable(dom, state);
  setStatus(dom, "Слушни: изговорот е пуштен.", "info");
}

function announceMoveResult(dom, state, result, successMessage) {
  if (result.kind === "completed") {
    setStatus(
      dom,
      result.practiceMode
        ? "Пробната тура е веќе готова. Исклучи го авто-гласот за круг со ѕвезди."
        : "Мисијата е веќе освоена. Почни нов круг за нови ѕвезди.",
      "info"
    );
    return;
  }

  if (result.kind === "empty") {
    setStatus(dom, "Внеси текст за да се појави патеката за читање.", "warning");
    return;
  }

  if (result.kind === "skipped" && !result.completedMission) {
    clearStatus(dom);
    return;
  }

  if (result.completedMission) {
    recordCompletedLevel(dom, state, result.earnedStars);
    setStatus(
      dom,
      result.practiceMode
        ? "Пробната тура е завршена. Овој круг е само за вежбање и не се оценува."
        : `Браво! Мисијата е освоена и текстот е прочитан до крај. Освои ${result.earnedStars} од ${MAX_MISSION_STARS} ѕвезди.`,
      "success"
    );
    return;
  }

  if (result.practiceMode && result.kind === "success") {
    setStatus(dom, "Супер. Продолжи со вежбањето.", "info");
    return;
  }

  if (result.leveledUp) {
    setStatus(dom, `Блескаво! Стигна до ниво ${state.level}.`, "success");
    return;
  }

  if (result.hitMilestone) {
    setStatus(dom, `Одлично! Низата порасна на ${state.streak}.`, "success");
    return;
  }

  if (result.kind === "success") {
    setStatus(dom, successMessage, "success");
  }
}

function startPlayback(dom, state) {
  if (!isPracticeMode(state)) {
    setStatus(dom, "Копчето „Слушај“ е само за „Вежбање“.", "info");
    return;
  }

  if (state.timerId || state.syllableCount === 0 || state.missionCompleted) {
    return;
  }

  if (state.voiceListeningActive || state.voiceListeningPending || state.voiceLoopRunning) {
    stopVoiceRecognition(dom, state, {
      voiceMessage: "Микрофонот е стопиран додека тече слушањето.",
    });
  }

  const practiceMode = isPracticeMode(state);

  state.timerId = window.setInterval(() => {
    const result = moveToNextSyllable(dom, state, true, {
      speak: true,
      practiceMode,
      onSpeak: () => {
        speakCurrentSyllable(dom, state);
      },
    });

    if (result.completedMission) {
      setStatus(
        dom,
        practiceMode
          ? "Слушањето е завршено. Овој круг е без ѕвезди."
          : `Браво! Мисијата е освоена и текстот е прочитан до крај. Освои ${result.earnedStars} од ${MAX_MISSION_STARS} ѕвезди.`,
        "success"
      );
      return;
    }

    if (result.leveledUp) {
      setStatus(dom, `Блескаво! Стигна до ниво ${state.level}.`, "success");
      return;
    }

    if (result.hitMilestone) {
      setStatus(dom, `Одлично! Низата порасна на ${state.streak}.`, "success");
      return;
    }

    setStatus(
      dom,
      practiceMode
        ? "Текстот се чита на глас."
        : "Гласот те води низ текстот.",
      "info"
    );
  }, state.playbackDelay);

  setPlaybackButtons(dom, true);

  speakCurrentSyllable(dom, state);

  setStatus(
    dom,
    practiceMode
      ? "Слушањето е вклучено."
      : "Читањето е вклучено.",
    "info"
  );
}

function pausePlayback(dom, state, message) {
  stopPlayback(state);
  stopSpeaking();
  setPlaybackButtons(dom, false);

  if (message) {
    setStatus(dom, message, "info");
  }
}

async function runVoiceRecognitionLoop(dom, state) {
  state.voiceLoopRunning = true;

  try {
    while (state.voiceListeningActive) {
      if (state.syllableCount === 0 || state.currentSyllableIndex < 0) {
        stopVoiceRecognition(dom, state, {
          voiceMessage: "Авто-слушањето запре затоа што нема активен слог.",
          transcriptMessage: "Последно слушнато: —",
        });
        return;
      }

      const currentSyllable = getCurrentSyllableText(dom, state);
      const upcomingSyllables = getUpcomingSyllableTexts(dom, state);

      if (!currentSyllable || upcomingSyllables.length === 0) {
        stopVoiceRecognition(dom, state, {
          voiceMessage: "Тековниот слог не може да се провери со глас.",
          transcriptMessage: "Последно слушнато: —",
        });
        return;
      }

      const abortController = new AbortController();
      state.voiceRecognitionAbortController = abortController;
      setListeningIndicator(dom, "permission");
      setVoiceStatus(dom, `Кажи го следниот дел. Слушањето може да фати и повеќе слогови по ред.`);
      if (!hasHeardTranscript(dom)) {
        setVoiceTranscript(dom, "Последно слушнато: ...");
      }

      try {
        let advancedDuringRecognition = 0;
        const getLiveUpcomingSyllables = () => getUpcomingSyllableTexts(dom, state);
        const getLiveMatch = (transcript, options = {}) => getVoiceRecognitionMatch(
          getLiveUpcomingSyllables(),
          transcript,
          state.dictionaryEntries,
          options
        );
        const shouldApplyInterimAdvance = (heardText, match) => {
          if (!match || !match.shouldAdvanceImmediately) {
            return false;
          }

          const heardValue = String(heardText || "").trim();
          const heardSyllableCount = Array.isArray(match.heardSyllables) ? match.heardSyllables.length : 0;

          if (match.matchCount >= 2 || heardSyllableCount >= 2) {
            return true;
          }

          if (/\s/u.test(heardValue)) {
            return true;
          }

          return false;
        };
        const applyTranscriptAdvance = (transcript, options = {}) => {
          const heardText = String(transcript || "").trim();

          if (!heardText || !isMacedonianRecognitionTranscript(heardText)) {
            return {
              applied: false,
              heardText,
              match: null,
            };
          }

          const liveUpcomingSyllables = getLiveUpcomingSyllables();

          if (liveUpcomingSyllables.length === 0) {
            return {
              applied: false,
              heardText,
              match: null,
            };
          }

          const match = getVoiceRecognitionMatch(
            liveUpcomingSyllables,
            heardText,
            state.dictionaryEntries,
            options.interim ? { allowPartial: true } : {}
          );
          const shouldApply = options.interim
            ? shouldApplyInterimAdvance(heardText, match)
            : match.isMatch;

          if (!shouldApply) {
            return {
              applied: false,
              heardText,
              match,
            };
          }

          const moveResult = moveToNextSyllable(dom, state, true, {
            advanceCount: match.matchCount,
            speak: shouldAutoSpeakOnProgress(state),
            onSpeak: () => {
              speakCurrentSyllable(dom, state);
            },
          });

          advancedDuringRecognition += match.matchCount;

          return {
            applied: true,
            heardText,
            match,
            moveResult,
          };
        };
        const result = await recognizeOnce({
          lang: "mk-MK",
          timeoutMs: 10000,
          interimSettleMs: state.microphoneSettleDelayMs,
          signal: abortController.signal,
          onStateChange(stateName) {
            setListeningIndicator(dom, stateName);
          },
          onTranscriptChange(transcript, isFinal) {
            if (!isMacedonianRecognitionTranscript(transcript)) {
              if (isFinal) {
                setVoiceStatus(dom, "Слушам само македонски изговор. Кажи уште еднаш.");
              }
              return;
            }

            setVoiceTranscript(dom, `Последно слушнато: ${transcript || "..."}`);

            if (!isFinal && state.microphoneQuickMatch) {
              const interimAdvance = applyTranscriptAdvance(transcript, { interim: true });

              if (interimAdvance.applied) {
                setVoiceStatus(
                  dom,
                  `Го фатив кажаното. Поместив ${interimAdvance.match.matchCount} ${interimAdvance.match.matchCount === 1 ? "слог" : "слога"} и слушам понатаму...`
                );

                if (interimAdvance.moveResult.completedMission) {
                  announceMoveResult(dom, state, interimAdvance.moveResult, "Супер! Гласот те помести понатаму.");
                  stopVoiceRecognition(dom, state, {
                    voiceMessage: "Авто-слушањето застана затоа што мисијата е завршена.",
                    transcriptMessage: `Последно слушнато: ${interimAdvance.heardText || "—"}`,
                  });
                }
                return;
              }

              const interimMatch = getLiveMatch(transcript, { allowPartial: true });

              if (interimMatch.isMatch) {
                setVoiceStatus(
                  dom,
                  interimMatch.shouldAdvanceImmediately
                    ? "Го фатив кажаното. Продолжувам..."
                    : "Го фатив почетокот. Чекам уште многу кратко..."
                );
                return;
              }
            }

            if (isFinal) {
              setVoiceStatus(dom, "Го проверувам изговорот...");
              return;
            }
          },
        });

        if (!state.voiceListeningActive) {
          return;
        }

        const heardText = String(result.transcript || "").trim();

        if (!isMacedonianRecognitionTranscript(heardText)) {
          setListeningIndicator(dom, "idle");
          setVoiceStatus(dom, "Слушам само македонски изговор. Кажи уште еднаш.");
          await waitForVoiceRetry(120);
          continue;
        }

        setVoiceTranscript(dom, `Последно слушнато: ${heardText || "—"}`);

        const finalAdvance = applyTranscriptAdvance(heardText, { interim: false });

        if (finalAdvance.applied) {
          setVoiceStatus(dom, `Одлично! Поместив ${finalAdvance.match.matchCount} ${finalAdvance.match.matchCount === 1 ? "слог" : "слога"}.`);
          announceMoveResult(dom, state, finalAdvance.moveResult, "Супер! Гласот те помести понатаму.");

          if (finalAdvance.moveResult.completedMission) {
            stopVoiceRecognition(dom, state, {
              voiceMessage: "Авто-слушањето застана затоа што мисијата е завршена.",
              transcriptMessage: `Последно слушнато: ${heardText || "—"}`,
            });
            return;
          }

          setListeningIndicator(dom, "idle");
          await waitForVoiceRetry(state.microphoneQuickMatch ? 30 : 80);
          continue;
        }

        if (advancedDuringRecognition > 0) {
          setListeningIndicator(dom, "idle");
          await waitForVoiceRetry(state.microphoneQuickMatch ? 30 : 80);
          continue;
        }

        moveToNextSyllable(dom, state, false);
        setListeningIndicator(dom, "idle");
        setVoiceStatus(dom, `Слушнав: „${heardText || "ништо јасно"}“. Ајде уште еднаш.`);
        setStatus(dom, "Изговорот не се совпадна со тековниот дел. Авто-слушањето продолжува.", "warning");
        await waitForVoiceRetry(160);
      } catch (error) {
        if (!state.voiceListeningActive || isVoiceRecognitionAbortError(error)) {
          return;
        }

        if (isRecoverableVoiceRecognitionError(error)) {
          setListeningIndicator(dom, "idle");
          setVoiceStatus(dom, "Не слушнав јасно. Кажи го следниот дел уште еднаш.");
          setStatus(dom, "Авто-слушањето продолжува. Пробај повторно.", "warning");
          await waitForVoiceRetry(180);
          continue;
        }

        stopVoiceRecognition(dom, state, {
          indicator: "error",
          voiceMessage: "Слушањето е прекинато поради проблем.",
          transcriptMessage: "Последно слушнато: —",
        });
        setStatus(dom, "Препознавањето глас не успеа. Провери дозвола за микрофон и обиди се повторно.", "warning");
        return;
      } finally {
        if (state.voiceRecognitionAbortController === abortController) {
          state.voiceRecognitionAbortController = null;
        }
      }
    }
  } finally {
    state.voiceLoopRunning = false;

    if (!state.voiceListeningActive && !state.voiceListeningPending) {
      if (dom.listenButton) {
        dom.listenButton.disabled = false;
      }
      updateListenButton(dom, state);
      updateModeButtons(dom, state);
      setListeningIndicator(dom, dom.listenIndicator.dataset.state === "error" ? "error" : "idle");
    }
  }
}

async function handleVoiceRecognition(dom, state, options = {}) {
  if (!isMicrophoneMode(state)) {
    setStatus(dom, "Копчето за микрофон работи кога е вклучен „Глас“.", "info");
    return;
  }

  if (state.voiceListeningActive) {
    stopVoiceRecognition(dom, state, {
      voiceMessage: "Авто-слушањето е стопирано.",
      transcriptMessage: "Последно слушнато: —",
    });
    setStatus(dom, "Слушањето е исклучено.", "info");
    return;
  }

  if (state.voiceListeningPending || state.voiceLoopRunning) {
    return;
  }

  if (state.syllableCount === 0) {
    setVoiceStatus(dom, "Најпрво внеси текст за да има што да се слуша.");
    return;
  }

  if (!isSpeechRecognitionSupported()) {
    setVoiceStatus(dom, "Овој прелистувач не поддржува препознавање глас.");
    setListeningIndicator(dom, "error");
    return;
  }

  state.voiceListeningPending = true;
  if (dom.listenButton) {
    dom.listenButton.disabled = true;
  }
  updateListenButton(dom, state);
  updateModeButtons(dom, state);
  setListeningIndicator(dom, "permission");
  setVoiceStatus(dom, "Се подготвува авто-слушањето...");
  if (!hasHeardTranscript(dom)) {
    setVoiceTranscript(dom, "Последно слушнато: —");
  }

  try {
    await requestMicrophonePermission();

    if (!state.voiceListeningPending) {
      return;
    }

    state.voiceListeningActive = true;
    setVoiceStatus(dom, "Авто-слушањето е вклучено. Кажувај по ред.");
    setStatus(dom, options.autoStart ? "Микрофонот е вклучен и слуша." : "Слушањето е вклучено. Притисни повторно за стоп.", "info");
  } catch (error) {
    stopVoiceRecognition(dom, state, {
      indicator: "error",
      voiceMessage: "Не успеа пристапот до микрофонот.",
      transcriptMessage: "Последно слушнато: —",
    });
    setStatus(dom, "Препознавањето глас не успеа. Провери дозвола за микрофон и обиди се повторно.", "warning");
    return;
  }

  state.voiceListeningPending = false;
  if (dom.listenButton) {
    dom.listenButton.disabled = false;
  }
  updateListenButton(dom, state);
  updateModeButtons(dom, state);
  runVoiceRecognitionLoop(dom, state);
}

async function handleImageSelection(dom, state, event) {
  const file = event.target.files && event.target.files[0];

  if (!file) {
    return;
  }

  dom.imageInput.disabled = true;
  setOcrStatus(dom, "Сликата се обработува. Ова може да потрае неколку секунди.");

  try {
    const extractedText = await extractTextFromImage(file, {
      logger(message) {
        if (message && message.status === "recognizing text" && typeof message.progress === "number") {
          const percent = Math.round(message.progress * 100);
          setOcrStatus(dom, `Се чита текстот од сликата: ${percent}%`);
          return;
        }

        if (message && message.status) {
          setOcrStatus(dom, `Чекор: ${message.status}`);
        }
      },
    });

    dom.inputText.value = extractedText;
    state.currentLevelSampleId = null;
    setActiveTextSource(dom, state, null);
    renderOutput(dom, state, "success", "Текстот е извлечен од сликата.");
    dom.outputText.focus();
    setOcrStatus(dom, "Текстот успешно е префрлен од сликата во полето за читање.");
  } catch (error) {
    setOcrStatus(dom, "Не успеа читањето на текстот од сликата.");
    setStatus(dom, "Читањето од слика не успеа. Обиди се со појасна фотографија.", "danger");
  } finally {
    dom.imageInput.disabled = false;
    dom.imageInput.value = "";
  }
}

function initializeFeatureStatuses(dom, state) {
  document.body.dataset.drawerOpen = "false";
  document.body.dataset.activeDrawer = "";
  setDrawerTriggerState(dom.openHelpDrawerButton, false);
  setDrawerTriggerState(dom.heroRoundSelectButton, false);
  setDrawerTriggerState(dom.openSettingsDrawerButton, false);
  if (!canUseGameMicrophone()) {
    state.gameInputMode = "manual";
  }
  updateRestartButton(dom, state);
  updateInputSourceTabs(dom, state);
  updateVoiceButton(dom, state);
  updateListenButton(dom, state);
  updateQuickListenUi(dom, state);
  updateMicrophoneSettleUi(dom, state);
  updateSoundUi(dom, state);
  updateSampleUi(dom, state);
  resetMissionRating(dom, state, { force: true });
  updateCelebrationContinueAction(dom, state);
  populateVoiceSelect(dom, state);
  refreshVoiceSupport(dom, state);
  setVoiceTranscript(dom, "Последно слушнато: —");
  setListeningIndicator(dom, "idle");
  const selectedVoice = listSpeechSynthesisVoices().find((voice) => voice.key === state.preferredVoiceKey) || null;

  if (selectedVoice && isSpeechRecognitionSupported()) {
    setVoiceStatus(dom, selectedVoice.isMacedonian
      ? `Избран е македонскиот глас ${selectedVoice.name}. Микрофонот слуша изговор.`
      : `Избран е гласот ${selectedVoice.name}. Микрофонот слуша изговор.`);
  } else if (selectedVoice) {
    setVoiceStatus(dom, selectedVoice.isMacedonian
      ? `Избран е македонскиот глас ${selectedVoice.name}.`
      : `Избран е гласот ${selectedVoice.name}.`);
  } else if (isSpeechSynthesisSupported() && isSpeechRecognitionSupported()) {
    setVoiceStatus(dom, "Во „Игра“ добиваш слушање и можеш да користиш „Слушни“.");
  } else if (isSpeechSynthesisSupported()) {
    setVoiceStatus(dom, "Достапно е читање на глас.");
  } else if (isSpeechRecognitionSupported()) {
    setVoiceStatus(dom, "Микрофонот ја слуша кажаната низа.");
  } else {
    dom.speakButton.disabled = true;
    dom.voiceAutoButton.disabled = true;
    setVoiceStatus(dom, "Прелистувачот не поддржува говорни алатки за читање.");
  }

  if (!isSpeechRecognitionSupported()) {
    dom.listenButton.disabled = true;
    setVoiceTranscript(dom, "Последно слушнато: препознавањето глас не е достапно.");
    setListeningIndicator(dom, "error");
  }

  setOcrStatus(dom, "Фото-читањето е подготвено.");
  setDictionaryStatus(dom, "Речникот се проверува.", "info");
  updatePlayModeUi(dom, state);
}

function bindEvents(dom, state) {
  Array.from(document.querySelectorAll("[data-guide-link]")).forEach((button) => {
    button.addEventListener("click", () => {
      openGuide(dom, button);
    });
  });

  dom.heroRoundSelectButton?.addEventListener("click", () => {
    toggleDrawer(dom, "input", dom.heroRoundSelectButton);
  });

  dom.heroRoundModeBadge?.addEventListener("click", () => {
    const nextMode = getNextPlayMode(state);
    setPlayMode(dom, state, nextMode, {
      revealLevels: nextMode === "game",
    });
  });

  dom.openHelpDrawerButton.addEventListener("click", () => {
    toggleDrawer(dom, "help", dom.openHelpDrawerButton);
  });

  dom.openSettingsDrawerButton.addEventListener("click", () => {
    toggleDrawer(dom, "settings", dom.openSettingsDrawerButton);
  });

  dom.closeHelpDrawerButton.addEventListener("click", () => {
    closeDrawer(dom);
  });

  dom.closeInputDrawerButton.addEventListener("click", () => {
    closeDrawer(dom);
  });

  dom.closeSettingsDrawerButton.addEventListener("click", () => {
    closeDrawer(dom);
  });

  dom.drawerBackdrop.addEventListener("click", () => {
    closeDrawer(dom);
  });

  dom.sampleSourceTabButton.addEventListener("click", () => {
    state.inputSourceTab = "samples";
    updateInputSourceTabs(dom, state);
  });

  dom.cameraSourceTabButton.addEventListener("click", () => {
    state.inputSourceTab = "camera";
    updateInputSourceTabs(dom, state);
  });

  dom.gameMicModeButton?.addEventListener("click", () => {
    setGameInputMode(dom, state, "microphone");
  });

  dom.gameManualModeButton?.addEventListener("click", () => {
    setGameInputMode(dom, state, "manual");
  });

  dom.inputText.addEventListener("input", () => {
    if (state.celebrationPinned) {
      setStatus(dom, "Прославата е отворена. Притисни „Продолжи“ за следната мисија.", "info");
      return;
    }

    state.currentLevelSampleId = null;
    setActiveTextSource(dom, state, null);
    renderOutput(dom, state, "info", "Патеката е подготвена.");
  });

  dom.inputText.addEventListener("keydown", (event) => {
    if (state.celebrationPinned) {
      return;
    }

    const isSplitShortcut = (event.metaKey || event.ctrlKey) && event.key === "Enter";

    if (!isSplitShortcut) {
      return;
    }

    event.preventDefault();
    renderOutput(dom, state, "success", "Започна нов круг со истиот текст.");
    unlockRestartButton(dom, state);
    closeDrawer(dom, { restoreFocus: false });
    dom.outputText.focus();
  });

  dom.splitButton.addEventListener("click", () => {
    primeSoundboard();
    renderOutput(dom, state, "success", "Започна нов круг со истиот текст.");
    unlockRestartButton(dom, state);
    dom.outputText.focus();
    playEffect(state, "start");
  });

  dom.correctButton.addEventListener("click", () => {
    if (!isManualCheckMode(state)) {
      return;
    }

    if (state.celebrationPinned) {
      dom.celebrationContinueButton.focus();
      return;
    }

    primeSoundboard();
    unlockRestartButton(dom, state);
    const result = moveToNextSyllable(dom, state, true, {
      speak: shouldAutoSpeakOnProgress(state),
      onSpeak: () => {
        speakCurrentSyllable(dom, state);
      },
    });

    announceMoveResult(dom, state, result, "Точниот одговор е потврден.");
  });

  dom.wrongButton.addEventListener("click", () => {
    if (!isManualCheckMode(state)) {
      return;
    }

    if (state.celebrationPinned) {
      dom.celebrationContinueButton.focus();
      return;
    }

    primeSoundboard();
    unlockRestartButton(dom, state);
    moveToNextSyllable(dom, state, false);
    clearStatus(dom);
  });

  dom.playButton.addEventListener("click", () => {
    if (state.celebrationPinned) {
      dom.celebrationContinueButton.focus();
      return;
    }

    primeSoundboard();
    unlockRestartButton(dom, state);
    startPlayback(dom, state);
  });

  dom.pauseButton.addEventListener("click", () => {
    pausePlayback(dom, state, "Вежбањето е паузирано.");
  });

  dom.speedRange.addEventListener("input", () => {
    state.playbackDelay = Number(dom.speedRange.value);
    updateSpeedLabel(dom, state);

    if (state.timerId) {
      pausePlayback(dom, state);
      startPlayback(dom, state);
    }
  });

  dom.speakButton.addEventListener("click", () => {
    primeSoundboard();
    unlockRestartButton(dom, state);
    requestHint(dom, state);
  });

  dom.voiceSelect.addEventListener("change", () => {
    state.preferredVoiceKey = dom.voiceSelect.value;
    saveSpeechSynthesisPreferences({
      preferredVoiceKey: state.preferredVoiceKey,
      microphoneQuickMatch: state.microphoneQuickMatch,
      microphoneSettleDelayMs: state.microphoneSettleDelayMs,
      voiceAutoEnabled: state.voiceAutoEnabled,
    });
    refreshVoiceSupport(dom, state);

    if (!state.preferredVoiceKey) {
      setVoiceStatus(dom, "Избран е автоматски говорен глас. Ако има македонски, тој ќе има предност.");
      return;
    }

    const selectedVoice = listSpeechSynthesisVoices().find((voice) => voice.key === state.preferredVoiceKey);

    if (!selectedVoice) {
      setVoiceStatus(dom, "Избраниот глас повеќе не е достапен. Апликацијата се враќа на автоматски избор.");
      state.preferredVoiceKey = "";
      dom.voiceSelect.value = "";
      saveSpeechSynthesisPreferences({
        preferredVoiceKey: "",
        microphoneQuickMatch: state.microphoneQuickMatch,
        microphoneSettleDelayMs: state.microphoneSettleDelayMs,
        voiceAutoEnabled: state.voiceAutoEnabled,
      });
      refreshVoiceSupport(dom, state);
      return;
    }

    setVoiceStatus(dom, selectedVoice.isMacedonian
      ? `Избран е македонскиот глас ${selectedVoice.name}.`
      : `Избран е гласот ${selectedVoice.name} (${selectedVoice.lang}).`);
  });

  dom.quickListenToggleButton.addEventListener("click", () => {
    state.microphoneQuickMatch = !state.microphoneQuickMatch;
    updateQuickListenUi(dom, state);
    saveSpeechSynthesisPreferences({
      preferredVoiceKey: state.preferredVoiceKey,
      microphoneQuickMatch: state.microphoneQuickMatch,
      microphoneSettleDelayMs: state.microphoneSettleDelayMs,
      voiceAutoEnabled: state.voiceAutoEnabled,
    });
    setVoiceStatus(
      dom,
      state.microphoneQuickMatch
        ? "Брзото слушање е вклучено. Ќе продолжи по кажаната низа."
        : "Брзото слушање е исклучено. Ќе чека само финален изговор."
    );
  });

  dom.microphoneSettleRange?.addEventListener("input", () => {
    state.microphoneSettleDelayMs = Number(dom.microphoneSettleRange.value);
    updateMicrophoneSettleUi(dom, state);
    saveSpeechSynthesisPreferences({
      preferredVoiceKey: state.preferredVoiceKey,
      microphoneQuickMatch: state.microphoneQuickMatch,
      microphoneSettleDelayMs: state.microphoneSettleDelayMs,
      voiceAutoEnabled: state.voiceAutoEnabled,
    });
    setVoiceStatus(dom, `Микрофонот чека ${dom.microphoneSettleValue.textContent} по кажаното пред проверка.`);
  });

  dom.voiceAutoButton.addEventListener("click", () => {
    state.voiceAutoEnabled = !state.voiceAutoEnabled;
    updateVoiceButton(dom, state);
    saveSpeechSynthesisPreferences({
      preferredVoiceKey: state.preferredVoiceKey,
      microphoneQuickMatch: state.microphoneQuickMatch,
      microphoneSettleDelayMs: state.microphoneSettleDelayMs,
      voiceAutoEnabled: state.voiceAutoEnabled,
    });
    setVoiceStatus(
      dom,
      state.voiceAutoEnabled
        ? "Авто-читањето во вежбање е вклучено."
        : "Авто-читањето во вежбање е исклучено."
    );
  });

  dom.listenButton.addEventListener("click", () => {
    primeSoundboard();
    unlockRestartButton(dom, state);
    handleVoiceRecognition(dom, state);
  });

  dom.heroHeardToggleButton?.addEventListener("click", () => {
    primeSoundboard();
    unlockRestartButton(dom, state);
    handleVoiceRecognition(dom, state);
  });

  dom.skipButton.addEventListener("click", () => {
    if (!isMicrophoneMode(state)) {
      setStatus(dom, "Копчето „Прескокни“ работи кога е вклучен „Глас“.", "info");
      return;
    }

    if (state.celebrationPinned) {
      dom.celebrationContinueButton.focus();
      return;
    }

    primeSoundboard();
    unlockRestartButton(dom, state);
    const result = skipCurrentSyllable(dom, state);
    announceMoveResult(dom, state, result, "Ова место е прескокнато.");
  });

  dom.imageInput.addEventListener("change", (event) => {
    handleImageSelection(dom, state, event);
  });

  dom.sampleTextSelect.addEventListener("change", () => {
    selectSampleLevel(dom, state, dom.sampleTextSelect.value, {
      focusOutput: false,
    });
    playEffect(state, "start");
  });

  dom.soundToggleButton.addEventListener("click", () => {
    primeSoundboard();
    state.soundEnabled = !state.soundEnabled;
    saveSoundPreferences(state.soundEnabled);
    updateSoundUi(dom, state);

    if (state.soundEnabled) {
      playEffect(state, "start");
    }
  });

  dom.celebrationContinueButton.addEventListener("click", () => {
    primeSoundboard();
    playEffect(state, "continue");
    const nextLevelSampleId = state.nextLevelSampleId;
    resetCelebrationOverlay(dom, state);
    resetMissionRating(dom, state, { force: true });
    updateCelebrationContinueAction(dom, state);

    if (nextLevelSampleId) {
      selectSampleLevel(dom, state, nextLevelSampleId, {
        tone: "success",
        message: `Подготвено е следното ниво: „${getSampleTextById(nextLevelSampleId)?.title || ""}“.`,
        focusOutput: true,
      });
      return;
    }

    dom.splitButton.focus();
  });

  dom.outputText.addEventListener("keydown", (event) => {
    if (state.celebrationPinned) {
      return;
    }

    if (event.key === "ArrowRight" && isManualCheckMode(state)) {
      event.preventDefault();
      dom.correctButton.click();
      return;
    }

    if (event.key === "ArrowLeft" && isManualCheckMode(state)) {
      event.preventDefault();
      dom.wrongButton.click();
      return;
    }

    if ((event.key === " " || event.key === "Spacebar") && isPracticeMode(state)) {
      event.preventDefault();

      if (state.timerId) {
        pausePlayback(dom, state, "Вежбањето е паузирано.");
      } else {
        unlockRestartButton(dom, state);
        startPlayback(dom, state);
      }
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && dom.activeDrawerName) {
      event.preventDefault();
      closeDrawer(dom);
      return;
    }

    if (
      state.celebrationPinned
      && !dom.celebrationPanel.hidden
      && (event.key === "Enter" || event.key === " " || event.key === "Spacebar")
    ) {
      event.preventDefault();
      dom.celebrationContinueButton.click();
      return;
    }

    if (state.celebrationPinned) {
      return;
    }
  });
}

export async function bootstrapApp() {
  const dom = getDom();
  const state = createAppState();
  const speechPreferences = loadSpeechSynthesisPreferences();
  const soundPreferences = loadSoundPreferences();

  state.preferredVoiceKey = speechPreferences.preferredVoiceKey;
  state.microphoneQuickMatch = speechPreferences.microphoneQuickMatch !== false;
  state.microphoneSettleDelayMs = Number(speechPreferences.microphoneSettleDelayMs) || state.microphoneSettleDelayMs;
  state.voiceAutoEnabled = speechPreferences.voiceAutoEnabled === true;
  state.soundEnabled = soundPreferences.enabled;
  state.levelProgress = readLevelProgress();
  buildConfetti(dom);
  dom.inputText.value = DEFAULT_TEXT;
  state.currentLevelSampleId = state.selectedSampleId;
  setActiveTextSource(dom, state, getSampleTextbookAttribution(state.selectedSampleId));
  updateSpeedLabel(dom, state);
  updateDashboard(dom, state);
  initializeFeatureStatuses(dom, state);

  if (isGameMode(state) && state.selectedSampleId) {
    syncSelectedSampleIntoInput(dom, state, {
      focusOutput: false,
      tone: "info",
      message: "Патеката е подготвена.",
    });
  } else {
    renderOutput(dom, state, "info", "Патеката е подготвена.");
  }

  bindEvents(dom, state);

  if (typeof window !== "undefined" && window.speechSynthesis && window.speechSynthesis.addEventListener) {
    window.speechSynthesis.addEventListener("voiceschanged", () => {
      populateVoiceSelect(dom, state);
      refreshVoiceSupport(dom, state);
    });
  }

  const dictionarySource = getDictionarySourceFromLocation(window.location);

  try {
    const dictionary = await loadDictionary(dictionarySource);
    state.dictionaryEntries = dictionary.entries;
    setDictionaryStatus(dom, `Речникот е вчитан (${dictionary.entries.size} зборови).`, "success");
    updateDashboard(dom, state);
    renderOutput(dom, state);
  } catch (error) {
    state.dictionaryEntries = new Map();
    setDictionaryStatus(dom, "Речникот не е достапен. Апликацијата користи алгоритамска поделба.", "warning");
    updateDashboard(dom, state);
    renderOutput(dom, state);
  }
}
