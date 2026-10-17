import { traceBeam, rotateMirror, solvePuzzle, validateGrid } from './logic.mjs';
import { LEVELS } from './levels.mjs';
import { describeLayout, describeMirror, describeBeam } from './accessibility.mjs';

// Prism Relay prototype. Attribution: agent-02 (AI agent).
const $ = id => document.getElementById(id);
const SAVE_KEY = 'game-company-agent-02-prism-relay-v1';
const ns = 'http://www.w3.org/2000/svg';
const pars = LEVELS.map(level => solvePuzzle(level.grid)?.length ?? '—');
const stored = readSave();
let unlocked = stored.unlocked;
let bestScores = stored.best;
let levelIndex = 0;
let grid = [...LEVELS[0].grid];
let rotations = 0;
let completed = false;
let soundEnabled = false;
let audioContext = null;
let statusOverride = '';

function readSave() {
  let data = null;
  try { data = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch { /* Private browsing can block storage. */ }
  return {
    unlocked: Number.isInteger(data?.unlocked) ? Math.min(LEVELS.length - 1, Math.max(0, data.unlocked)) : 0,
    best: LEVELS.map((_, i) => Number.isInteger(data?.best?.[i]) && data.best[i] >= 0 ? data.best[i] : null),
  };
}
function persist() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ unlocked, best: bestScores })); } catch { /* The game still works without storage. */ }
}
function beep(frequency, duration = .1, delay = 0) {
  if (!soundEnabled) return;
  try {
    audioContext ??= new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === 'suspended') void audioContext.resume();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const now = audioContext.currentTime + delay;
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(.0001, now);
    gain.gain.exponentialRampToValueAtTime(.055, now + .012);
    gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + .02);
  } catch {
    soundEnabled = false;
    $('sound').textContent = '♫ Sound: unavailable';
    $('sound').setAttribute('aria-pressed', 'false');
  }
}
function chooseLevel(index) {
  if (index < 0 || index >= LEVELS.length || index > unlocked) return;
  levelIndex = index;
  grid = [...LEVELS[index].grid];
  rotations = 0;
  completed = false;
  statusOverride = 'Rotate any mirror to steer the beam.';
  render();
}
function reset() {
  grid = [...LEVELS[levelIndex].grid];
  rotations = 0;
  completed = false;
  statusOverride = 'Circuit restarted. A new route awaits.';
  render();
}
function clearSavedProgress() {
  const confirmed = window.confirm(
    "Clear Prism Relay's saved level unlocks and best rotation scores in this browser? " +
    "This cannot be undone. Other games and websites will not be affected."
  );
  if (!confirmed) return;

  // Remove only Prism Relay's own key. Never clear other local data.
  let removed = true;
  try { localStorage.removeItem(SAVE_KEY); }
  catch { removed = false; }

  // Keep the reset session usable even if browser storage is blocked.
  unlocked = 0;
  bestScores = LEVELS.map(() => null);
  levelIndex = 0;
  grid = [...LEVELS[0].grid];
  rotations = 0;
  completed = false;
  statusOverride = removed
    ? "Saved Prism Relay progress cleared. Circuit one is ready."
    : "Progress reset for this session, but browser storage blocked deletion. Previous saved progress may return after reload.";
  render();
}
function rotateAt(row, col) {
  const next = rotateMirror(grid, row, col);
  if (next === grid) return;
  grid = next;
  rotations++;
  completed = false;
  statusOverride = '';
  beep(330 + (rotations % 5) * 65);
  render();
  const rotatedCell = $('board').querySelector('[data-x="' + col + '"][data-y="' + row + '"]');
  rotatedCell?.focus({ preventScroll: true });
}
function showHint() {
  const moves = solvePuzzle(grid);
  if (!moves) { $('status').textContent = 'No hint available for this board.'; return; }
  if (moves.length === 0) { $('status').textContent = 'The receiver is already connected. ✦'; return; }
  const firstOnBeam = moves.find(({ x, y }) => traceBeam(grid).path.some(p => p.x === x && p.y === y));
  const { x, y } = firstOnBeam ?? moves[0];
  $('status').textContent = `Hint: rotate the mirror in row ${y + 1}, column ${x + 1} (counting from the top-left).`;
  const tile = $('board').querySelector(`[data-x="${x}"][data-y="${y}"]`);
  tile?.classList.remove('hint');
  void tile?.offsetWidth;
  tile?.classList.add('hint');
}
function drawBeam(path, width, height) {
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('class', 'beam-svg');
  svg.setAttribute('viewBox', `0 0 ${width * 100} ${height * 100}`);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('preserveAspectRatio', 'none');
  const points = path.map(({x, y}) => `${x * 100 + 50},${y * 100 + 50}`).join(' ');
  for (const className of ['beam-glow', 'beam-core']) {
    const line = document.createElementNS(ns, 'polyline');
    line.setAttribute('class', className);
    line.setAttribute('points', points);
    svg.append(line);
  }
  return svg;
}
function renderPicker() {
  const picker = $('level-picker');
  picker.replaceChildren();
  for (let i = 0; i < LEVELS.length; i++) {
    const choice = document.createElement('button');
    choice.type = 'button';
    choice.className = 'level-choice';
    if (i === levelIndex) choice.classList.add('active');
    if (bestScores[i] !== null) choice.classList.add('cleared');
    choice.disabled = i > unlocked;
    choice.textContent = i > unlocked ? '🔒' : String(i + 1).padStart(2, '0');
    choice.setAttribute('aria-label', `Circuit ${i + 1}: ${i > unlocked ? 'locked' : LEVELS[i].name}`);
    if (i === levelIndex) choice.setAttribute('aria-current', 'step');
    choice.addEventListener('click', () => chooseLevel(i));
    picker.append(choice);
  }
}
function render() {
  const { width, height } = validateGrid(grid);
  const beam = traceBeam(grid);
  if (beam.won && !completed) {
    completed = true;
    if (bestScores[levelIndex] === null || rotations < bestScores[levelIndex]) bestScores[levelIndex] = rotations;
    unlocked = Math.max(unlocked, Math.min(LEVELS.length - 1, levelIndex + 1));
    persist();
    beep(523, .15); beep(659, .16, .14); beep(784, .24, .29);
  }
  const lit = new Set(beam.path.map(({ x, y }) => `${x},${y}`));
  const board = $('board');
  $('board-layout').textContent = describeLayout(grid);
  board.replaceChildren();
  board.style.gridTemplateColumns = `repeat(${width}, minmax(0, 1fr))`;
  board.classList.toggle('won', beam.won);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const tile = grid[y][x];
    const isMirror = tile === '/' || tile === '\\';
    const cell = document.createElement(isMirror ? 'button' : 'div');
    cell.className = 'tile';
    cell.dataset.x = String(x);
    cell.dataset.y = String(y);
    if (lit.has(`${x},${y}`)) cell.classList.add('lit');
    if (isMirror) {
      cell.type = 'button';
      cell.classList.add('mirror');
      cell.setAttribute('aria-label', describeMirror(grid, beam, x, y));
      const glyph = document.createElement('span');
      glyph.className = 'mirror-glyph';
      glyph.textContent = tile === '/' ? '╱' : '╲';
      glyph.setAttribute('aria-hidden', 'true');
      cell.append(glyph);
      cell.addEventListener('click', () => rotateAt(y, x));
    } else if (tile === '#') {
      cell.classList.add('wall');
    } else if (tile === 'E' || tile === 'T') {
      cell.classList.add(tile === 'E' ? 'source' : 'target');
      if (tile === 'T' && beam.won) cell.classList.add('completed');
      const symbol = document.createElement('span');
      symbol.className = 'symbol';
      symbol.textContent = tile === 'E' ? '✦' : '◇';
      cell.append(symbol);
    }
    board.append(cell);
  }
  board.append(drawBeam(beam.path, width, height));
  $('level-index').textContent = `${String(levelIndex + 1).padStart(2, '0')} / ${String(LEVELS.length).padStart(2, '0')}`;
  $('level-title').textContent = LEVELS[levelIndex].name;
  $('level-subtitle').textContent = LEVELS[levelIndex].subtitle;
  $('moves').textContent = String(rotations);
  $('best').textContent = bestScores[levelIndex] ?? '—';
  $('par').textContent = pars[levelIndex];
  $('beam-state').textContent = beam.won ? '✦ SIGNAL CONNECTED' : 'SIGNAL INTERRUPTED';
  $('status').textContent = beam.won ? (levelIndex + 1 === LEVELS.length ? 'All circuits restored! You are a master of light. ✦' : 'Circuit connected! The next puzzle is unlocked. ✦') : (statusOverride || describeBeam(beam));
  $('prev').disabled = levelIndex === 0;
  $('next').disabled = levelIndex + 1 >= LEVELS.length || levelIndex + 1 > unlocked;
  renderPicker();
}

$('reset').addEventListener('click', reset);
$('clear-progress').addEventListener('click', clearSavedProgress);
$('hint').addEventListener('click', showHint);
$('prev').addEventListener('click', () => chooseLevel(levelIndex - 1));
$('next').addEventListener('click', () => chooseLevel(levelIndex + 1));
$('sound').addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  $('sound').textContent = soundEnabled ? '♫ Sound: on' : '♫ Sound: off';
  $('sound').setAttribute('aria-pressed', String(soundEnabled));
  beep(620, .12);
});
document.addEventListener('keydown', event => {
  if (event.altKey || event.ctrlKey || event.metaKey || event.target instanceof HTMLInputElement) return;
  const key = event.key.toLowerCase();
  if (key === 'r') reset();
  if (key === 'h') showHint();
  if (key === 'n') chooseLevel(levelIndex + 1);
});
render();
