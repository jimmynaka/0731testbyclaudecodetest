const test = require("node:test");
const assert = require("node:assert/strict");
const { formatTime, getValidNumber, computeNextPhase } = require("./logic.js");

test("formatTime formats whole seconds as MM:SS", () => {
  assert.equal(formatTime(0), "00:00");
  assert.equal(formatTime(4000), "00:04");
  assert.equal(formatTime(65000), "01:05");
  assert.equal(formatTime(600000), "10:00");
});

test("formatTime rounds up partial seconds", () => {
  assert.equal(formatTime(3500), "00:04");
  assert.equal(formatTime(1), "00:01");
  assert.equal(formatTime(59001), "01:00");
});

test("formatTime clamps negative durations to zero", () => {
  assert.equal(formatTime(-500), "00:00");
  assert.equal(formatTime(-100000), "00:00");
});

test("getValidNumber clamps within range and rounds", () => {
  assert.equal(getValidNumber("5", 1, 1, 999), 5);
  assert.equal(getValidNumber("4.6", 1, 1, 999), 5);
  assert.equal(getValidNumber("0", 1, 1, 999), 1);
  assert.equal(getValidNumber("1500", 1, 1, 999), 999);
});

test("getValidNumber falls back on non-finite input", () => {
  assert.equal(getValidNumber("abc", 7, 1, 999), 7);
  assert.equal(getValidNumber(NaN, 2, 1, 99), 2);
  assert.equal(getValidNumber(Infinity, 9, 1, 99), 9);
});

test("getValidNumber treats empty string as 0, so it clamps to min", () => {
  // Number("") === 0, which is finite, so it is clamped rather than replaced
  // by the fallback. This matches the browser input behaviour.
  assert.equal(getValidNumber("", 3, 1, 99), 1);
});

test("computeNextPhase moves to the next phase within a round", () => {
  const next = computeNextPhase({
    activePhaseIndex: 0,
    phaseCount: 3,
    autoRepeat: false,
    activeRound: 1,
    rounds: 3,
  });
  assert.deepEqual(next, { done: false, activePhaseIndex: 1, activeRound: 1 });
});

test("computeNextPhase starts a new round after the last phase", () => {
  const next = computeNextPhase({
    activePhaseIndex: 2,
    phaseCount: 3,
    autoRepeat: false,
    activeRound: 1,
    rounds: 3,
  });
  assert.deepEqual(next, { done: false, activePhaseIndex: 0, activeRound: 2 });
});

test("computeNextPhase finishes after the final phase of the final round", () => {
  const next = computeNextPhase({
    activePhaseIndex: 2,
    phaseCount: 3,
    autoRepeat: false,
    activeRound: 3,
    rounds: 3,
  });
  assert.deepEqual(next, { done: true });
});

test("computeNextPhase never finishes when autoRepeat is on", () => {
  const next = computeNextPhase({
    activePhaseIndex: 2,
    phaseCount: 3,
    autoRepeat: true,
    activeRound: 99,
    rounds: 3,
  });
  assert.deepEqual(next, { done: false, activePhaseIndex: 0, activeRound: 100 });
});

test("computeNextPhase handles a single-phase session", () => {
  assert.deepEqual(
    computeNextPhase({
      activePhaseIndex: 0,
      phaseCount: 1,
      autoRepeat: false,
      activeRound: 1,
      rounds: 2,
    }),
    { done: false, activePhaseIndex: 0, activeRound: 2 },
  );
  assert.deepEqual(
    computeNextPhase({
      activePhaseIndex: 0,
      phaseCount: 1,
      autoRepeat: false,
      activeRound: 2,
      rounds: 2,
    }),
    { done: true },
  );
});
