const canvas = document.querySelector('#maze-canvas');
const context = canvas.getContext('2d');
const timerElement = document.querySelector('#timer');
const timerBar = document.querySelector('#timer-bar');
const boardMessage = document.querySelector('#board-message');
const statusText = document.querySelector('#status-text');
const levelText = document.querySelector('#level-text');
const levelStat = document.querySelector('#level-stat');
const levelMarkNumber = document.querySelector('#level-mark-number');
const escapesStat = document.querySelector('#escapes-stat');
const huntersStat = document.querySelector('#hunters-stat');
const mazeSize = document.querySelector('#maze-size');
const tipText = document.querySelector('#tip-text');

const DIRECTIONS = {
  up: { x: 0, y: -1, wall: 0, opposite: 2 },
  right: { x: 1, y: 0, wall: 1, opposite: 3 },
  down: { x: 0, y: 1, wall: 2, opposite: 0 },
  left: { x: -1, y: 0, wall: 3, opposite: 1 }
};
const KEY_DIRECTIONS = { ArrowUp: 'up', w: 'up', ArrowRight: 'right', d: 'right', ArrowDown: 'down', s: 'down', ArrowLeft: 'left', a: 'left' };

let level = 1;
let escapes = 0;
let maze;
let player;
let hunters;
let remainingSeconds;
let levelSeconds;
let gameActive = false;
let lastFrameTime = 0;
let hunterAccumulator = 0;
let animationFrame;

function dimensionsForLevel(currentLevel) {
  return { rows: Math.min(9 + Math.floor((currentLevel - 1) / 2) * 2, 17), columns: Math.min(13 + Math.floor((currentLevel - 1) / 2) * 2, 25) };
}

function createMaze(rows, columns) {
  const cells = Array.from({ length: rows }, (_, y) => Array.from({ length: columns }, (_, x) => ({ x, y, walls: [true, true, true, true], visited: false })));
  const stack = [cells[0][0]];
  cells[0][0].visited = true;
  while (stack.length) {
    const current = stack[stack.length - 1];
    const neighbors = [];
    for (const direction of Object.values(DIRECTIONS)) {
      const next = cells[current.y + direction.y]?.[current.x + direction.x];
      if (next && !next.visited) neighbors.push({ next, direction });
    }
    if (!neighbors.length) {
      stack.pop();
      continue;
    }
    const { next, direction } = neighbors[Math.floor(Math.random() * neighbors.length)];
    current.walls[direction.wall] = false;
    next.walls[direction.opposite] = false;
    next.visited = true;
    stack.push(next);
  }
  return cells;
}

function cellIsOpen(from, directionName) {
  return from && !from.walls[DIRECTIONS[directionName].wall];
}

function setupLevel() {
  const dimensions = dimensionsForLevel(level);
  maze = createMaze(dimensions.rows, dimensions.columns);
  player = { x: 0, y: 0 };
  hunters = Array.from({ length: level >= 5 ? Math.floor(level / 5) : 0 }, (_, index) => ({ x: dimensions.columns - 1 - index, y: dimensions.rows - 1 }));
  levelSeconds = Math.max(22, 48 - (level - 1) * 1.8);
  remainingSeconds = levelSeconds;
  hunterAccumulator = 0;
  gameActive = true;
  boardMessage.hidden = true;
  statusText.textContent = hunters.length ? 'The hunters are awake' : 'Reach the gold beacon';
  levelText.textContent = `LEVEL ${String(level).padStart(2, '0')}`;
  levelStat.textContent = String(level).padStart(2, '0');
  levelMarkNumber.textContent = String(level).padStart(2, '0');
  huntersStat.textContent = String(hunters.length).padStart(2, '0');
  mazeSize.textContent = `${dimensions.rows} x ${dimensions.columns} grid`;
  tipText.textContent = hunters.length ? 'Hunters move when you do. Break line of sight at every turn.' : 'The beacon is always in the opposite corner. Keep moving.';
  resizeCanvas();
  draw();
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const pixelRatio = window.devicePixelRatio || 1;
  canvas.width = Math.floor(rect.width * pixelRatio);
  canvas.height = Math.floor(rect.height * pixelRatio);
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
}

function draw() {
  if (!maze) return;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const cellWidth = width / maze[0].length;
  const cellHeight = height / maze.length;
  context.clearRect(0, 0, width, height);
  context.fillStyle = '#0a2025';
  context.fillRect(0, 0, width, height);
  context.strokeStyle = 'rgba(142, 228, 188, .44)';
  context.lineWidth = 1.2;
  context.beginPath();
  maze.flat().forEach((cell) => {
    const left = cell.x * cellWidth;
    const top = cell.y * cellHeight;
    if (cell.walls[0]) { context.moveTo(left, top); context.lineTo(left + cellWidth, top); }
    if (cell.walls[1]) { context.moveTo(left + cellWidth, top); context.lineTo(left + cellWidth, top + cellHeight); }
    if (cell.walls[2]) { context.moveTo(left, top + cellHeight); context.lineTo(left + cellWidth, top + cellHeight); }
    if (cell.walls[3]) { context.moveTo(left, top); context.lineTo(left, top + cellHeight); }
  });
  context.stroke();
  drawBeacon(cellWidth, cellHeight);
  hunters.forEach((hunter) => drawHunter(hunter, cellWidth, cellHeight));
  drawPlayer(cellWidth, cellHeight);
}

function drawBeacon(cellWidth, cellHeight) {
  const x = (maze[0].length - .5) * cellWidth;
  const y = (maze.length - .5) * cellHeight;
  context.fillStyle = 'rgba(255, 200, 107, .16)';
  context.beginPath(); context.arc(x, y, Math.min(cellWidth, cellHeight) * .42, 0, Math.PI * 2); context.fill();
  context.fillStyle = '#ffc86b';
  context.beginPath(); context.arc(x, y, Math.min(cellWidth, cellHeight) * .16, 0, Math.PI * 2); context.fill();
}

function drawPlayer(cellWidth, cellHeight) {
  const x = (player.x + .5) * cellWidth;
  const y = (player.y + .5) * cellHeight;
  context.fillStyle = '#8ee4bc';
  context.beginPath(); context.arc(x, y, Math.min(cellWidth, cellHeight) * .22, 0, Math.PI * 2); context.fill();
  context.fillStyle = '#d9fff0';
  context.beginPath(); context.arc(x, y, Math.min(cellWidth, cellHeight) * .08, 0, Math.PI * 2); context.fill();
}

function drawHunter(hunter, cellWidth, cellHeight) {
  const x = (hunter.x + .5) * cellWidth;
  const y = (hunter.y + .5) * cellHeight;
  const size = Math.min(cellWidth, cellHeight) * .25;
  context.fillStyle = '#ff786f';
  context.beginPath(); context.moveTo(x, y - size); context.lineTo(x + size, y); context.lineTo(x, y + size); context.lineTo(x - size, y); context.closePath(); context.fill();
  context.fillStyle = '#ffe5d8';
  context.beginPath(); context.arc(x, y, size * .2, 0, Math.PI * 2); context.fill();
}

function movePlayer(directionName) {
  if (!gameActive) return;
  const direction = DIRECTIONS[directionName];
  const currentCell = maze[player.y][player.x];
  const nextCell = maze[player.y + direction.y]?.[player.x + direction.x];
  if (!cellIsOpen(currentCell, directionName) || !nextCell) return;
  player.x += direction.x;
  player.y += direction.y;
  moveHunters();
  if (player.x === maze[0].length - 1 && player.y === maze.length - 1) finishLevel();
  if (hunters.some((hunter) => hunter.x === player.x && hunter.y === player.y)) endGame('caught');
  draw();
}

function moveHunters() {
  hunters.forEach((hunter) => {
    const options = [];
    for (const directionName of Object.keys(DIRECTIONS)) {
      if (!cellIsOpen(maze[hunter.y][hunter.x], directionName)) continue;
      const direction = DIRECTIONS[directionName];
      const next = maze[hunter.y + direction.y]?.[hunter.x + direction.x];
      if (next) options.push({ x: hunter.x + direction.x, y: hunter.y + direction.y });
    }
    options.sort((first, second) => Math.abs(first.x - player.x) + Math.abs(first.y - player.y) - (Math.abs(second.x - player.x) + Math.abs(second.y - player.y)));
    if (options.length) Object.assign(hunter, options[0]);
  });
}

function finishLevel() {
  gameActive = false;
  escapes += 1;
  escapesStat.textContent = String(escapes).padStart(2, '0');
  showMessage(`Level ${level} clear`, level >= 4 ? 'Next level: the maze shifts again.' : 'The beacon accepts your signal.');
  window.setTimeout(() => { level += 1; setupLevel(); }, 1050);
}

function endGame(reason) {
  if (!gameActive) return;
  gameActive = false;
  const heading = reason === 'timeout' ? 'Time expired' : 'You were caught';
  const detail = reason === 'timeout' ? `You reached level ${level}.` : 'The hunter found your trail.';
  showMessage(heading, `${detail} Restart and try a different route.`);
  statusText.textContent = reason === 'timeout' ? 'Signal lost' : 'Hunter contact';
  draw();
}

function showMessage(heading, detail) {
  boardMessage.innerHTML = `<strong>${heading}</strong><span>${detail}</span>`;
  boardMessage.hidden = false;
}

function updateTimer(delta) {
  if (!gameActive) return;
  remainingSeconds -= delta / 1000;
  if (remainingSeconds <= 0) {
    remainingSeconds = 0;
    endGame('timeout');
  }
  timerElement.textContent = remainingSeconds.toFixed(1);
  timerBar.style.transform = `scaleX(${Math.max(0, remainingSeconds / levelSeconds)})`;
  timerBar.style.background = remainingSeconds / levelSeconds < .25 ? 'var(--danger)' : 'var(--mint)';
}

function frame(timestamp) {
  if (!lastFrameTime) lastFrameTime = timestamp;
  const delta = timestamp - lastFrameTime;
  lastFrameTime = timestamp;
  updateTimer(delta);
  hunterAccumulator += delta;
  if (gameActive && hunters.length && hunterAccumulator > 900) {
    hunterAccumulator = 0;
    moveHunters();
    if (hunters.some((hunter) => hunter.x === player.x && hunter.y === player.y)) endGame('caught');
    draw();
  }
  animationFrame = window.requestAnimationFrame(frame);
}

document.addEventListener('keydown', (event) => {
  const direction = KEY_DIRECTIONS[event.key];
  if (!direction) return;
  event.preventDefault();
  movePlayer(direction);
});
document.querySelectorAll('[data-direction]').forEach((button) => button.addEventListener('click', () => movePlayer(button.dataset.direction)));
document.querySelector('#restart-button').addEventListener('click', () => { level = 1; escapes = 0; escapesStat.textContent = '00'; setupLevel(); });
window.addEventListener('resize', () => { resizeCanvas(); draw(); });

setupLevel();
animationFrame = window.requestAnimationFrame(frame);