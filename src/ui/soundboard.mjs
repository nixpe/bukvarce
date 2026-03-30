const SOUND_STORAGE_KEY = "mk-reading-aid.sound-enabled";

let audioContext = null;
let masterGain = null;
let compressor = null;
let echoInput = null;
let echoDelay = null;
let echoFeedback = null;
let echoFilter = null;
let echoWetGain = null;
let soundboardPrimed = false;

function getAudioContextConstructor() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.AudioContext || window.webkitAudioContext || null;
}

function setupAudioGraph(context) {
  if (masterGain) {
    return;
  }

  masterGain = context.createGain();
  masterGain.gain.value = 0.14;

  compressor = context.createDynamicsCompressor();
  compressor.threshold.value = -20;
  compressor.knee.value = 20;
  compressor.ratio.value = 2.8;
  compressor.attack.value = 0.004;
  compressor.release.value = 0.22;

  echoInput = context.createGain();
  echoDelay = context.createDelay(0.45);
  echoFeedback = context.createGain();
  echoFilter = context.createBiquadFilter();
  echoWetGain = context.createGain();

  echoDelay.delayTime.value = 0.16;
  echoFeedback.gain.value = 0.18;
  echoFilter.type = "lowpass";
  echoFilter.frequency.value = 2500;
  echoWetGain.gain.value = 0.24;

  masterGain.connect(compressor);
  compressor.connect(context.destination);

  echoInput.connect(echoDelay);
  echoDelay.connect(echoFilter);
  echoFilter.connect(echoWetGain);
  echoWetGain.connect(masterGain);
  echoDelay.connect(echoFeedback);
  echoFeedback.connect(echoDelay);
}

function getAudioContext(options = {}) {
  const AudioContextConstructor = getAudioContextConstructor();
  const allowCreate = options.create === true;

  if (!AudioContextConstructor) {
    return null;
  }

  if (!audioContext) {
    if (!allowCreate) {
      return null;
    }

    audioContext = new AudioContextConstructor();
  }

  setupAudioGraph(audioContext);
  return audioContext;
}

function createVoiceInput(context, {
  brightness = 2600,
  echoAmount = 0.2,
  resonance = 0.8,
  pan = 0,
} = {}) {
  const input = context.createGain();
  const filter = context.createBiquadFilter();
  const panner = typeof context.createStereoPanner === "function"
    ? context.createStereoPanner()
    : null;

  filter.type = "lowpass";
  filter.frequency.value = brightness;
  filter.Q.value = resonance;
  if (panner) {
    panner.pan.value = pan;
  }

  input.connect(filter);
  if (panner) {
    filter.connect(panner);
    panner.connect(masterGain);
  } else {
    filter.connect(masterGain);
  }

  if (echoInput && echoAmount > 0) {
    const send = context.createGain();
    send.gain.value = echoAmount;
    if (panner) {
      panner.connect(send);
    } else {
      filter.connect(send);
    }
    send.connect(echoInput);
  }

  return input;
}

function schedulePartial(context, input, {
  frequency,
  startTime,
  duration,
  volume,
  type = "sine",
  detune = 0,
  endFrequency = frequency,
}) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const attackEnd = startTime + Math.min(duration * 0.22, 0.04);
  const sustainEnd = startTime + Math.max(duration * 0.42, duration - 0.08);
  const endTime = startTime + duration;

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startTime);
  oscillator.frequency.linearRampToValueAtTime(endFrequency, endTime);
  oscillator.detune.setValueAtTime(detune, startTime);

  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(Math.max(volume, 0.0002), attackEnd);
  gain.gain.exponentialRampToValueAtTime(Math.max(volume * 0.45, 0.0002), sustainEnd);
  gain.gain.exponentialRampToValueAtTime(0.0001, endTime);

  oscillator.connect(gain);
  gain.connect(input);
  oscillator.start(startTime);
  oscillator.stop(endTime + 0.03);
}

function playBellNote(context, {
  frequency,
  startTime,
  duration = 0.34,
  volume = 0.1,
  brightness = 2600,
  echoAmount = 0.22,
  pan = 0,
}) {
  const input = createVoiceInput(context, { brightness, echoAmount, pan });

  schedulePartial(context, input, {
    frequency,
    startTime,
    duration,
    volume,
    type: "sine",
    endFrequency: frequency * 1.004,
  });

  schedulePartial(context, input, {
    frequency: frequency * 2,
    startTime,
    duration: duration * 0.85,
    volume: volume * 0.16,
    type: "triangle",
    detune: -4,
  });

  schedulePartial(context, input, {
    frequency: frequency * 3,
    startTime,
    duration: duration * 0.55,
    volume: volume * 0.05,
    type: "sine",
    detune: 6,
  });

  schedulePartial(context, input, {
    frequency: frequency * 1.5,
    startTime: startTime + 0.035,
    duration: duration * 0.46,
    volume: volume * 0.06,
    type: "triangle",
  });
}

function playBellChord(context, {
  frequencies,
  startTime,
  duration = 0.34,
  volume = 0.08,
  brightness = 2800,
  echoAmount = 0.24,
}) {
  frequencies.forEach((frequency, index) => {
    const spread = frequencies.length > 1
      ? (index / (frequencies.length - 1)) * 0.44 - 0.22
      : 0;
    playBellNote(context, {
      frequency,
      startTime: startTime + index * 0.006,
      duration,
      volume: volume * (index === 0 ? 1 : 0.8),
      brightness,
      echoAmount,
      pan: spread,
    });
  });
}

function playSoftPop(context, {
  frequency,
  endFrequency,
  startTime,
  duration = 0.18,
  volume = 0.06,
  brightness = 1800,
  echoAmount = 0.1,
  pan = 0,
}) {
  const input = createVoiceInput(context, {
    brightness,
    echoAmount,
    resonance: 0.6,
    pan,
  });

  schedulePartial(context, input, {
    frequency,
    endFrequency,
    startTime,
    duration,
    volume,
    type: "sine",
  });

  schedulePartial(context, input, {
    frequency: frequency * 1.5,
    endFrequency: endFrequency * 1.5,
    startTime,
    duration: duration * 0.7,
    volume: volume * 0.12,
    type: "triangle",
  });

  schedulePartial(context, input, {
    frequency: Math.max(frequency * 0.52, 80),
    endFrequency: Math.max(endFrequency * 0.5, 70),
    startTime,
    duration: duration * 0.52,
    volume: volume * 0.18,
    type: "sine",
  });
}

function playSparkleDust(context, {
  startTime,
  duration = 0.1,
  volume = 0.02,
  pan = 0,
}) {
  const frameCount = Math.max(1, Math.floor(context.sampleRate * duration));
  const buffer = context.createBuffer(1, frameCount, context.sampleRate);
  const data = buffer.getChannelData(0);
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  const send = echoInput ? context.createGain() : null;
  const panner = typeof context.createStereoPanner === "function"
    ? context.createStereoPanner()
    : null;

  for (let index = 0; index < frameCount; index += 1) {
    const decay = 1 - index / frameCount;
    data[index] = (Math.random() * 2 - 1) * decay * decay;
  }

  source.buffer = buffer;
  filter.type = "highpass";
  filter.frequency.value = 1600;
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(Math.max(volume, 0.0002), startTime + 0.016);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  if (panner) {
    panner.pan.value = pan;
  }

  source.connect(filter);
  filter.connect(gain);
  if (panner) {
    gain.connect(panner);
    panner.connect(masterGain);
  } else {
    gain.connect(masterGain);
  }

  if (send) {
    send.gain.value = 0.18;
    if (panner) {
      panner.connect(send);
    } else {
      filter.connect(send);
    }
    send.connect(echoInput);
  }

  source.start(startTime);
  source.stop(startTime + duration + 0.03);
}

function playPluckNote(context, {
  frequency,
  startTime,
  duration = 0.18,
  volume = 0.05,
  brightness = 1850,
  echoAmount = 0.08,
  pan = 0,
}) {
  const input = createVoiceInput(context, {
    brightness,
    echoAmount,
    resonance: 0.72,
    pan,
  });

  schedulePartial(context, input, {
    frequency: frequency * 0.98,
    endFrequency: frequency,
    startTime,
    duration,
    volume,
    type: "triangle",
  });

  schedulePartial(context, input, {
    frequency: frequency * 2.02,
    endFrequency: frequency * 1.98,
    startTime,
    duration: duration * 0.34,
    volume: volume * 0.22,
    type: "sine",
    detune: 3,
  });

  schedulePartial(context, input, {
    frequency: Math.max(frequency * 0.48, 70),
    endFrequency: Math.max(frequency * 0.44, 60),
    startTime,
    duration: duration * 0.48,
    volume: volume * 0.14,
    type: "sine",
  });
}

function playPattern(pattern) {
  if (!soundboardPrimed) {
    return;
  }

  const context = getAudioContext();

  if (!context || !masterGain) {
    return;
  }

  if (context.state === "suspended") {
    context.resume().catch(() => {});
    return;
  }

  const start = context.currentTime + 0.012;
  pattern(context, start);
}

function playCorrectPattern(context, start) {
  playPluckNote(context, {
    frequency: 554,
    startTime: start,
    duration: 0.14,
    volume: 0.04,
    brightness: 1700,
    echoAmount: 0.05,
    pan: -0.08,
  });
  playBellNote(context, {
    frequency: 740,
    startTime: start + 0.028,
    duration: 0.18,
    volume: 0.05,
    brightness: 2500,
    echoAmount: 0.14,
    pan: 0.03,
  });
  playBellNote(context, {
    frequency: 988,
    startTime: start + 0.095,
    duration: 0.26,
    volume: 0.06,
    brightness: 3150,
    echoAmount: 0.18,
    pan: 0.12,
  });
  playSparkleDust(context, {
    startTime: start + 0.085,
    duration: 0.08,
    volume: 0.008,
    pan: 0.1,
  });
}

function playWrongPattern(context, start) {
  playSoftPop(context, {
    frequency: 360,
    endFrequency: 272,
    startTime: start,
    duration: 0.16,
    volume: 0.046,
    brightness: 1120,
    echoAmount: 0.025,
    pan: -0.06,
  });
  playSoftPop(context, {
    frequency: 286,
    endFrequency: 216,
    startTime: start + 0.045,
    duration: 0.17,
    volume: 0.038,
    brightness: 920,
    echoAmount: 0.018,
    pan: 0.08,
  });
}

function playStartPattern(context, start) {
  playPluckNote(context, {
    frequency: 392,
    startTime: start,
    duration: 0.14,
    volume: 0.034,
    brightness: 1500,
    echoAmount: 0.03,
    pan: -0.14,
  });

  [523, 659, 784].forEach((frequency, index) => {
    playBellNote(context, {
      frequency: frequency + index * 18,
      startTime: start + 0.05 + index * 0.072,
      duration: 0.22,
      volume: 0.045 + index * 0.004,
      brightness: 2250 + index * 220,
      echoAmount: 0.12 + index * 0.02,
      pan: -0.06 + index * 0.1,
    });
  });
}

function playMilestonePattern(context, start) {
  playPluckNote(context, {
    frequency: 523,
    startTime: start,
    duration: 0.15,
    volume: 0.04,
    brightness: 1700,
    echoAmount: 0.04,
    pan: -0.1,
  });
  [698, 880, 1047].forEach((frequency, index) => {
    playBellNote(context, {
      frequency,
      startTime: start + 0.03 + index * 0.06,
      duration: 0.22,
      volume: 0.052 + index * 0.004,
      brightness: 2650 + index * 160,
      echoAmount: 0.16,
      pan: -0.12 + index * 0.12,
    });
  });
  playSparkleDust(context, {
    startTime: start + 0.08,
    duration: 0.12,
    volume: 0.012,
    pan: 0.14,
  });
}

function playLevelPattern(context, start) {
  playPluckNote(context, {
    frequency: 440,
    startTime: start,
    duration: 0.16,
    volume: 0.04,
    brightness: 1550,
    echoAmount: 0.04,
    pan: -0.12,
  });

  [523, 659, 784, 988].forEach((frequency, index) => {
    playBellNote(context, {
      frequency,
      startTime: start + 0.04 + index * 0.07,
      duration: 0.28,
      volume: 0.05 + index * 0.005,
      brightness: 2500 + index * 170,
      echoAmount: 0.16 + index * 0.02,
      pan: -0.14 + index * 0.1,
    });
  });
  playBellChord(context, {
    frequencies: [784, 988, 1319],
    startTime: start + 0.24,
    duration: 0.34,
    volume: 0.04,
    brightness: 3100,
    echoAmount: 0.18,
  });
  playSparkleDust(context, {
    startTime: start + 0.11,
    duration: 0.16,
    volume: 0.016,
    pan: 0.16,
  });
}

function playStarPattern(context, start) {
  playBellNote(context, {
    frequency: 1175,
    startTime: start,
    duration: 0.2,
    volume: 0.042,
    brightness: 3300,
    echoAmount: 0.2,
    pan: -0.08,
  });
  playBellNote(context, {
    frequency: 1568,
    startTime: start + 0.05,
    duration: 0.34,
    volume: 0.052,
    brightness: 3800,
    echoAmount: 0.26,
    pan: 0.12,
  });
  playSparkleDust(context, {
    startTime: start + 0.06,
    duration: 0.11,
    volume: 0.012,
    pan: 0.1,
  });
}

function playFinishPattern(context, start) {
  playPluckNote(context, {
    frequency: 392,
    startTime: start,
    duration: 0.18,
    volume: 0.03,
    brightness: 1350,
    echoAmount: 0.03,
    pan: -0.12,
  });
  playBellChord(context, {
    frequencies: [523, 659, 784],
    startTime: start + 0.03,
    duration: 0.32,
    volume: 0.048,
    brightness: 2550,
    echoAmount: 0.16,
  });
  playBellChord(context, {
    frequencies: [659, 784, 988],
    startTime: start + 0.22,
    duration: 0.42,
    volume: 0.054,
    brightness: 2880,
    echoAmount: 0.2,
  });
  playBellChord(context, {
    frequencies: [784, 988, 1319],
    startTime: start + 0.46,
    duration: 0.56,
    volume: 0.062,
    brightness: 3250,
    echoAmount: 0.24,
  });
  playBellNote(context, {
    frequency: 1568,
    startTime: start + 0.66,
    duration: 0.46,
    volume: 0.042,
    brightness: 3800,
    echoAmount: 0.28,
    pan: 0.16,
  });
  playSparkleDust(context, {
    startTime: start + 0.24,
    duration: 0.16,
    volume: 0.014,
    pan: -0.08,
  });
  playSparkleDust(context, {
    startTime: start + 0.62,
    duration: 0.22,
    volume: 0.018,
    pan: 0.14,
  });
}

function playContinuePattern(context, start) {
  playPluckNote(context, {
    frequency: 494,
    startTime: start,
    duration: 0.12,
    volume: 0.034,
    brightness: 1700,
    echoAmount: 0.03,
    pan: -0.06,
  });
  playBellNote(context, {
    frequency: 698,
    startTime: start + 0.045,
    duration: 0.18,
    volume: 0.04,
    brightness: 2350,
    echoAmount: 0.1,
    pan: 0.08,
  });
}

export function isSoundSupported() {
  return Boolean(getAudioContextConstructor());
}

export function loadSoundPreferences() {
  if (typeof window === "undefined" || !window.localStorage) {
    return {
      enabled: true,
    };
  }

  const stored = window.localStorage.getItem(SOUND_STORAGE_KEY);

  return {
    enabled: stored !== "0",
  };
}

export function saveSoundPreferences(enabled) {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }

  window.localStorage.setItem(SOUND_STORAGE_KEY, enabled ? "1" : "0");
}

export function primeSoundboard() {
  const context = getAudioContext({ create: true });

  if (!context) {
    return;
  }

  soundboardPrimed = true;

  if (context.state === "suspended") {
    context.resume().catch(() => {});
  }
}

export function playSoundEffect(kind) {
  if (kind === "correct") {
    playPattern(playCorrectPattern);
    return;
  }

  if (kind === "wrong") {
    playPattern(playWrongPattern);
    return;
  }

  if (kind === "start") {
    playPattern(playStartPattern);
    return;
  }

  if (kind === "milestone") {
    playPattern(playMilestonePattern);
    return;
  }

  if (kind === "level") {
    playPattern(playLevelPattern);
    return;
  }

  if (kind === "star") {
    playPattern(playStarPattern);
    return;
  }

  if (kind === "finish") {
    playPattern(playFinishPattern);
    return;
  }

  if (kind === "continue") {
    playPattern(playContinuePattern);
  }
}
