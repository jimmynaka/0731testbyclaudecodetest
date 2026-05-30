const defaultPhases = [4, 8, 4];
const ringRadius = 96;
const ringLength = 2 * Math.PI * ringRadius;

const state = {
  phases: [...defaultPhases],
  activePhaseIndex: 0,
  activeRound: 1,
  rounds: 3,
  autoRepeat: false,
  isRunning: false,
  phaseStartedAt: 0,
  phaseDurationMs: defaultPhases[0] * 1000,
  pausedRemainingMs: defaultPhases[0] * 1000,
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
  toneStyle: document.querySelector("#tone-style"),
  tonePitch: document.querySelector("#tone-pitch"),
  toneVolume: document.querySelector("#tone-volume"),
};

elements.ringProgress.style.strokeDasharray = `${ringLength}`;

function formatTime(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getValidNumber(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function syncStateFromInputs() {
  const inputs = [...elements.phaseList.querySelectorAll(".phase-seconds")];
  const nextPhases = inputs.map((input) => getValidNumber(input.value, 1, 1, 999));
  state.phases = nextPhases.length ? nextPhases : [...defaultPhases];
  state.rounds = getValidNumber(elements.rounds.value, 1, 1, 99);
  state.autoRepeat = elements.autoRepeat.checked;
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

  if (style === "wood") {
    playTone(audioContext, startTime, basePitch * 1.05, volume * 0.58, 0.18, "triangle", 0.012);
    playTone(audioContext, startTime + 0.18, basePitch * 1.34, volume * 0.42, 0.22, "triangle", 0.01);
    return;
  }

  if (style === "soft") {
    playTone(audioContext, startTime, basePitch, volume * 0.42, 0.86, "sine", 0.03, 0.68);
    return;
  }

  playTone(audioContext, startTime, basePitch * 1.16, volume * 0.38, 0.34, "sine", 0.018, 0.78);
  playTone(audioContext, startTime + 0.15, basePitch * 1.55, volume * 0.3, 0.44, "sine", 0.014, 0.72);
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
  const lastPhase = state.activePhaseIndex >= state.phases.length - 1;
  const lastRound = !state.autoRepeat && state.activeRound >= state.rounds;

  if (lastPhase && lastRound) {
    finishTimer();
    return;
  }

  if (lastPhase) {
    state.activeRound += 1;
    setActivePhase(0);
  } else {
    setActivePhase(state.activePhaseIndex + 1);
  }

  state.phaseStartedAt = performance.now();
  state.pausedRemainingMs = state.phaseDurationMs;
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

elements.soundTest.addEventListener("click", () => {
  playChime();
});

renderPhaseRows();
resetTimer(false);
