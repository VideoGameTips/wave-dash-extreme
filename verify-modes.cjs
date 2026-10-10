const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync(__dirname + '/index.html', 'utf8');
const source = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const noop = () => {};
const ctx = new Proxy({}, { get: (_, key) => key === 'createLinearGradient' || key === 'createRadialGradient' ? () => ({ addColorStop: noop }) : noop });
function element() {
  return { style: {}, children: [], classList: { add: noop, remove: noop },
    addEventListener: noop, appendChild(child) { this.children.push(child); }, getContext: () => ctx };
}
const sandbox = { document: { getElementById: () => element(), createElement: element },
  window: { devicePixelRatio: 1 }, innerWidth: 1280, innerHeight: 720,
  localStorage: {}, performance: { now: () => 1000 }, addEventListener: noop,
  requestAnimationFrame: noop, console, Math };
vm.createContext(sandbox);
vm.runInContext(source.replace(/\}\)\(\);\s*$/, 'globalThis.game = { state, reset, spawnObstacle, difficulty, jumpPressed, updatePlayerMotion, hit, draw, groundY };})();'), sandbox);
const g = sandbox.game;
for (const mode of ['wave', 'cube', 'ship', 'ufo', 'ball', 'spider']) {
  g.state.practiceMode = mode; g.reset();
  const types = new Set(g.state.obstacles.map(o => o.type));
  if (mode === 'cube') assert.deepEqual([...types], ['floor_spikes']);
  if (mode === 'ball' || mode === 'spider') assert(types.has('floor_spikes') && types.has('ceiling_spikes'));
  if (mode === 'ship') assert.deepEqual([...types], ['dual']);
  if (mode === 'ufo') assert(types.has('top') && types.has('bottom'));
  g.draw();
  for (let i = 0; i < 300; i++) { g.state.dist += 500; g.spawnObstacle(); }
  assert(g.state.obstacles.every(o => Number.isFinite(o.x) && Number.isFinite(o.gapY)));
}
g.state.practiceMode = 'spider'; g.reset();
assert.equal(g.state.y, g.groundY());
g.jumpPressed(); assert.equal(g.state.y, 46);
g.jumpPressed(); assert.equal(g.state.y, g.groundY());
const spike = g.state.obstacles[0];
assert(g.hit(spike, spike.x + spike.w / 4, g.groundY(), 7));
assert(!g.hit(spike, spike.x + spike.w / 4, 46, 7));
g.state.practiceMode = 'ship'; g.state.vy = 470; g.state.holding = true;
for (let i = 0; i < 9; i++) g.updatePlayerMotion(1 / 60);
assert(g.state.vy < 0, 'ship should reverse within 150ms');
g.state.practiceMode = 'wave'; g.state.dist = 0; const easy = g.difficulty().gap;
g.state.dist = 30000; assert(g.difficulty().gap < easy);
console.log('Six modes: obstacle sets, rendering, generation, spider switching/collisions, ship response and wave progression passed.');
