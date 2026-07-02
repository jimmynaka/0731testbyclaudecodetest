// Pure, DOM-free logic for the countdown timer.
// Loaded as a plain <script> in the browser (exposes globals on window)
// and as a CommonJS module in Node for testing.
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    Object.assign(root, api);
  }
})(typeof self !== "undefined" ? self : this, function () {
  // Format a millisecond duration as MM:SS, clamped at zero and rounded up.
  function formatTime(ms) {
    const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  // Parse a user-entered value into a rounded integer inside [min, max].
  // Falls back to `fallback` when the value is not a finite number.
  function getValidNumber(value, fallback, min, max) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(max, Math.max(min, Math.round(parsed)));
  }

  // Decide what happens when the active phase finishes.
  // Returns { done: true } when the whole session is complete, otherwise
  // { done: false, activePhaseIndex, activeRound } describing the next phase.
  function computeNextPhase({ activePhaseIndex, phaseCount, autoRepeat, activeRound, rounds }) {
    const lastPhase = activePhaseIndex >= phaseCount - 1;
    const lastRound = !autoRepeat && activeRound >= rounds;

    if (lastPhase && lastRound) {
      return { done: true };
    }

    if (lastPhase) {
      return { done: false, activePhaseIndex: 0, activeRound: activeRound + 1 };
    }

    return { done: false, activePhaseIndex: activePhaseIndex + 1, activeRound };
  }

  return { formatTime, getValidNumber, computeNextPhase };
});
