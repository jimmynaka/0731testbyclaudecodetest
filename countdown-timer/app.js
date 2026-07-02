const defaultPhases = [4, 8, 4];
const ringRadius = 96;
const ringLength = 2 * Math.PI * ringRadius;

const state = {
  phases: [...defaultPhases],
  activePhaseIndex: 0,
  activeRound: 1,
  rounds: 3,
  autoRepeat: false,
  tickEnabled: true,
  isRunning: false,
  phaseStartedAt: 0,
  phaseDurationMs: defaultPhases[0] * 1000,
  pausedRemainingMs: defaultPhases[0] * 1000,
  lastTickSecond: null,
  animationFrameId: null,
  audioContext: null,
};

const elements = {
  appShell: document.querySelector(".app-shell"),
  phaseList: document.querySelector("#phase-list"),
  phaseTemplate: document.querySelector("#phase-row-template"),
  timeLeft: document.querySelector("#time-left"),
  phaseLabel: document.querySelector("#phase-label"),
  roundLabel: document.querySelector("#round-label"),
  ringProgress: document.querySelector("#ring-progress"),
  startPause: document.querySelector("#start-pause"),
  reset: document.querySelector("#reset"),
  addPhase: document.querySelector("#add-phase"),
  soundTest: document.querySelector("#sound-test"),
  rounds: document.querySelector("#rounds"),
  autoRepeat: document.querySelector("#auto-repeat"),
  tickEnabled: document.querySelector("#tick-enabled"),
  tickVolume: document.querySelector("#tick-volume"),
  toneStyle: document.querySelector("#tone-style"),
  tonePitch: document.querySelector("#tone-pitch"),
  toneVolume: document.querySelector("#tone-volume"),
};

elements.ringProgress.style.strokeDasharray = `${ringLength}`;

// formatTime, getValidNumber and computeNextPhase come from logic.js,
// which is loaded before this script and exposes them as globals.

function syncStateFromInputs() {
  const inputs = [...elements.phaseList.querySelectorAll(".phase-seconds")];
  const nextPhases = inputs.map((input) => getValidNumber(input.value, 1, 1, 999));
  state.phases = nextPhases.length ? nextPhases : [...defaultPhases];
  state.rounds = getValidNumber(elements.rounds.value, 1, 1, 99);
  state.autoRepeat = elements.autoRepeat.checked;
  state.tickEnabled = elements.tickEnabled.checked;
}

function renderPhaseRows() {
  elements.phaseList.innerHTML = "";

  state.phases.forEach((seconds, index) => {
    const row = elements.phaseTemplate.content.firstElementChild.cloneNode(true);
    const phaseNumber = row.querySelector(".phase-number");
    const input = row.querySelector(".phase-seconds");
    const removeButton = row.querySelector(".remove-phase");

    phaseNumber.textContent = String(index + 1);
    input.value = seconds;
    removeButton.disabled = state.phases.length === 1;

    input.addEventListener("change", () => {
      input.value = getValidNumber(input.value, 1, 1, 999);
      syncStateFromInputs();
      if (!state.isRunning) resetTimer(false);
    });

    input.addEventListener("input", () => {
      syncStateFromInputs();
      if (!state.isRunning) renderTimer();
    });

    removeButton.addEventListener("click", () => {
      if (state.phases.length === 1) return;
      state.phases.splice(index, 1);
      state.activePhaseIndex = Math.min(state.activePhaseIndex, state.phases.length - 1);
      renderPhaseRows();
      resetTimer(false);
    });

    elements.phaseList.append(row);
  });
}

function renderTimer(remainingMs = state.pausedRemainingMs) {
  const activeSeconds = state.phases[state.activePhaseIndex] ?? state.phases[0];
  const durationMs = state.phaseDurationMs || activeSeconds * 1000;
  const progress = durationMs ? 1 - remainingMs / durationMs : 0;
  const boundedProgress = Math.min(1, Math.max(0, progress));

  elements.timeLeft.textContent = formatTime(remainingMs);
  elements.phaseLabel.textContent = `${state.activePhaseIndex + 1}区間目 / ${activeSeconds}秒`;
  elements.roundLabel.textContent = state.autoRepeat
    ? `${state.activeRound} セット目`
    : `${state.activeRound} / ${state.rounds} セット`;
  elements.ringProgress.style.strokeDashoffset = `${ringLength * boundedProgress}`;
  elements.startPause.textContent = state.isRunning ? "一時停止" : "開始";
  elements.appShell.classList.toggle("is-running", state.isRunning);
}

function ensureAudioContext() {
  if (!state.audioContext) {
    const BrowserAudioContext = window.AudioContext || window.webkitAudioContext;
    state.audioContext = new BrowserAudioContext();
  }

  if (state.audioContext.state === "suspended") {
    return state.audioContext.resume().then(() => state.audioContext);
  }

  return Promise.resolve(state.audioContext);
}

async function playChime() {
  const audioContext = await ensureAudioContext();
  const startTime = audioContext.currentTime;
  const basePitch = Number(elements.tonePitch.value);
  const volume = Number(elements.toneVolume.value) / 100;
  const style = elements.toneStyle.value;

  if (style === "crystalRise") {
    playTone(audioContext, startTime, basePitch * 0.96, volume * 0.16, 1.25, "sine", 0.035, 1.004);
    playTone(audioContext, startTime + 0.2, basePitch * 1.28, volume * 0.18, 1.65, "sine", 0.03, 1.006);
    playTone(audioContext, startTime + 0.48, basePitch * 1.62, volume * 0.14, 2.2, "sine", 0.04, 1.008);
    playTone(audioContext, startTime + 0.52, basePitch * 3.24, volume * 0.05, 1.45, "sine", 0.025, 1.01);
    return;
  }

  if (style === "glassRise") {
    playTone(audioContext, startTime, basePitch * 1.18, volume * 0.17, 0.72, "sine", 0.012, 1.008);
    playTone(audioContext, startTime + 0.18, basePitch * 1.48, volume * 0.16, 0.98, "sine", 0.011, 1.01);
    playTone(audioContext, startTime + 0.38, basePitch * 1.88, volume * 0.13, 1.28, "sine", 0.012, 1.012);
    return;
  }

  if (style === "morning") {
    playTone(audioContext, startTime, basePitch * 0.82, volume * 0.13, 0.78, "sine", 0.022, 1.004);
    playTone(audioContext, startTime + 0.22, basePitch * 1.08, volume * 0.16, 1.05, "sine", 0.02, 1.006);
    playTone(audioContext, startTime + 0.48, basePitch * 1.38, volume * 0.18, 1.42, "sine", 0.018, 1.008);
    return;
  }

  if (style === "clearBell") {
    playTone(audioContext, startTime, basePitch * 1.42, volume * 0.16, 1.2, "sine", 0.014, 1.006);
    playTone(audioContext, startTime + 0.12, basePitch * 1.78, volume * 0.12, 1.45, "sine", 0.012, 1.008);
    playTone(audioContext, startTime + 0.28, basePitch * 2.24, volume * 0.08, 1.65, "sine", 0.012, 1.01);
    return;
  }

  if (style === "tripleFocus") {
    playTone(audioContext, startTime, basePitch * 0.92, volume * 0.12, 0.42, "sine", 0.016, 1.004);
    playTone(audioContext, startTime + 0.18, basePitch * 1.16, volume * 0.14, 0.58, "sine", 0.014, 1.006);
    playTone(audioContext, startTime + 0.36, basePitch * 1.46, volume * 0.17, 0.92, "sine", 0.014, 1.008);
    return;
  }

  if (style === "crystal") {
    playTone(audioContext, startTime, basePitch, volume * 0.24, 2.8, "sine", 0.055, 1.002);
    playTone(audioContext, startTime + 0.01, basePitch * 2.01, volume * 0.13, 2.15, "sine", 0.035, 1.003);
    playTone(audioContext, startTime + 0.03, basePitch * 2.98, volume * 0.075, 1.55, "sine", 0.026, 1.002);
    playTone(audioContext, startTime + 0.08, basePitch * 4.18, volume * 0.035, 0.95, "sine", 0.018, 1.004);
    return;
  }

  if (style === "glass") {
    playTone(audioContext, startTime, basePitch * 1.35, volume * 0.22, 1.45, "sine", 0.012, 1.006);
    playTone(audioContext, startTime + 0.015, basePitch * 2.08, volume * 0.14, 1.05, "sine", 0.01, 1.004);
    playTone(audioContext, startTime + 0.035, basePitch * 2.72, volume * 0.085, 0.72, "sine", 0.008, 1.003);
    return;
  }

  if (style === "singing") {
    playTone(audioContext, startTime, basePitch * 0.72, volume * 0.19, 3.2, "sine", 0.09, 1.002);
    playTone(audioContext, startTime + 0.05, basePitch * 1.44, volume * 0.12, 2.65, "sine", 0.08, 1.004);
    playTone(audioContext, startTime + 0.12, basePitch * 2.16, volume * 0.055, 1.9, "sine", 0.06, 1.004);
    return;
  }

  if (style === "zen") {
    playTone(audioContext, startTime, basePitch * 0.82, volume * 0.22, 2.55, "triangle", 0.028, 1.002);
    playTone(audioContext, startTime + 0.025, basePitch * 1.64, volume * 0.11, 1.85, "sine", 0.024, 1.004);
    playTone(audioContext, startTime + 0.06, basePitch * 2.46, volume * 0.05, 1.15, "sine", 0.02, 1.006);
    return;
  }

  if (style === "focus") {
    playTone(audioContext, startTime, basePitch * 1.02, volume * 0.18, 0.78, "sine", 0.02, 1.004);
    playTone(audioContext, startTime + 0.22, basePitch * 1.5, volume * 0.13, 1.05, "sine", 0.018, 1.006);
    return;
  }

  if (style === "wood") {
    playTone(audioContext, startTime, basePitch * 1.05, volume * 0.58, 0.18, "triangle", 0.012);
    playTone(audioContext, startTime + 0.18, basePitch * 1.34, volume * 0.42, 0.22, "triangle", 0.01);
    return;
  }

  if (style === "soft") {
    playTone(audioContext, startTime, basePitch, volume * 0.42, 0.86, "sine", 0.03, 1.006);
    return;
  }

  playTone(audioContext, startTime, basePitch * 1.16, volume * 0.38, 0.34, "sine", 0.018, 1.006);
  playTone(audioContext, startTime + 0.15, basePitch * 1.55, volume * 0.3, 0.44, "sine", 0.014, 1.008);
}

async function playTick() {
  const audioContext = await ensureAudioContext();
  const startTime = audioContext.currentTime;
  const volume = Number(elements.tickVolume.value) / 100;
  playTone(audioContext, startTime, 1220, volume * 0.13, 0.05, "sine", 0.004, 1.002);
  playTone(audioContext, startTime + 0.006, 2440, volume * 0.04, 0.034, "sine", 0.003, 1.002);
}

function playTone(audioContext, startTime, frequency, volume, duration, type, attack, endPitchRatio = 1) {
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startTime);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, frequency * endPitchRatio), startTime + duration);

  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.001, volume), startTime + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(startTime);
  oscillator.stop(startTime + duration + 0.03);
}

function stopAnimation() {
  if (state.animationFrameId) {
    cancelAnimationFrame(state.animationFrameId);
    state.animationFrameId = null;
  }
}

function setActivePhase(index) {
  state.activePhaseIndex = index;
  state.phaseDurationMs = state.phases[index] * 1000;
  state.pausedRemainingMs = state.phaseDurationMs;
}

function advancePhase() {
  const next = computeNextPhase({
    activePhaseIndex: state.activePhaseIndex,
    phaseCount: state.phases.length,
    autoRepeat: state.autoRepeat,
    activeRound: state.activeRound,
    rounds: state.rounds,
  });

  if (next.done) {
    finishTimer();
    return;
  }

  state.activeRound = next.activeRound;
  setActivePhase(next.activePhaseIndex);

  state.phaseStartedAt = performance.now();
  state.pausedRemainingMs = state.phaseDurationMs;
  state.lastTickSecond = null;
  playChime();
  tick();
}

function tick() {
  const elapsed = performance.now() - state.phaseStartedAt;
  const remainingMs = state.phaseDurationMs - elapsed;

  if (remainingMs <= 0) {
    renderTimer(0);
    advancePhase();
    return;
  }

  const tickSecond = Math.ceil(remainingMs / 1000);
  if (state.tickEnabled && tickSecond !== state.lastTickSecond) {
    state.lastTickSecond = tickSecond;
    playTick();
  }

  state.pausedRemainingMs = remainingMs;
  renderTimer(remainingMs);
  state.animationFrameId = requestAnimationFrame(tick);
}

async function startTimer() {
  syncStateFromInputs();
  elements.appShell.classList.remove("is-complete");
  await ensureAudioContext();

  state.isRunning = true;
  state.phaseDurationMs ||= state.phases[state.activePhaseIndex] * 1000;
  state.pausedRemainingMs ||= state.phaseDurationMs;
  state.lastTickSecond = null;
  state.phaseStartedAt = performance.now() - (state.phaseDurationMs - state.pausedRemainingMs);
  playChime();
  tick();
}

function pauseTimer() {
  stopAnimation();
  state.isRunning = false;
  renderTimer();
}

function finishTimer() {
  stopAnimation();
  state.isRunning = false;
  state.pausedRemainingMs = 0;
  elements.appShell.classList.add("is-complete");
  playChime();
  renderTimer(0);
  elements.startPause.textContent = "もう一度";
}

function resetTimer(shouldRenderRows = true) {
  stopAnimation();
  syncStateFromInputs();
  state.isRunning = false;
  state.activeRound = 1;
  state.lastTickSecond = null;
  elements.appShell.classList.remove("is-complete");
  setActivePhase(0);
  if (shouldRenderRows) renderPhaseRows();
  renderTimer();
}

elements.startPause.addEventListener("click", () => {
  if (state.isRunning) {
    pauseTimer();
    return;
  }

  if (state.pausedRemainingMs <= 0) {
    resetTimer(false);
  }

  startTimer();
});

elements.reset.addEventListener("click", () => resetTimer());

elements.addPhase.addEventListener("click", () => {
  syncStateFromInputs();
  state.phases.push(state.phases.at(-1) ?? 4);
  renderPhaseRows();
  resetTimer(false);
});

elements.rounds.addEventListener("change", () => {
  elements.rounds.value = getValidNumber(elements.rounds.value, 1, 1, 99);
  resetTimer(false);
});

elements.autoRepeat.addEventListener("change", () => {
  syncStateFromInputs();
  renderTimer();
});

elements.tickEnabled.addEventListener("change", () => {
  syncStateFromInputs();
  state.lastTickSecond = null;
});

elements.soundTest.addEventListener("click", () => {
  playChime();
});

renderPhaseRows();
resetTimer(false);
