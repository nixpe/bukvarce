import {
  DEFAULT_SAMPLE_SELECTION,
  SAMPLE_DIFFICULTY_OPTIONS,
  SAMPLE_GRADE_OPTIONS,
  SAMPLE_LENGTH_OPTIONS,
} from "../config/sample-texts.mjs";

export function createAppState() {
  return {
    dictionaryEntries: new Map(),
    currentSyllableIndex: -1,
    syllableCount: 0,
    completedSyllables: 0,
    mistakeCount: 0,
    score: 0,
    streak: 0,
    bestStreak: 0,
    level: 1,
    missionCompleted: false,
    roundStarRating: 0,
    playbackDelay: 1000,
    playMode: "game",
    gameInputMode: "microphone",
    voiceAutoEnabled: false,
    preferredVoiceKey: "",
    microphoneQuickMatch: true,
    microphoneSettleDelayMs: 250,
    voiceListeningActive: false,
    voiceListeningPending: false,
    voiceLoopRunning: false,
    voiceRecognitionAbortController: null,
    voiceAutoStartTimerId: null,
    soundEnabled: true,
    selectedSampleGrade: DEFAULT_SAMPLE_SELECTION.grade || SAMPLE_GRADE_OPTIONS[0].value,
    selectedSampleDifficulty: DEFAULT_SAMPLE_SELECTION.difficulty || SAMPLE_DIFFICULTY_OPTIONS[0].value,
    selectedSampleLength: DEFAULT_SAMPLE_SELECTION.length || SAMPLE_LENGTH_OPTIONS[0].value,
    selectedSampleId: DEFAULT_SAMPLE_SELECTION.id || "",
    currentLevelSampleId: DEFAULT_SAMPLE_SELECTION.id || "",
    nextLevelSampleId: "",
    levelProgress: {},
    inputSourceTab: "samples",
    activeTextSource: null,
    restartAvailable: false,
    ratingAnimationTimerIds: [],
    celebrationOverlayTimerId: null,
    celebrationPinned: false,
    timerId: null,
  };
}

export function stopPlayback(state) {
  if (state.timerId) {
    clearInterval(state.timerId);
    state.timerId = null;
  }
}
