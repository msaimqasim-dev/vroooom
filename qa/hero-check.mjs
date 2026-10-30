import http from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const site = path.resolve('html-site');
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' };
const server = http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = path.resolve(site, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(site + path.sep)) throw Error('Invalid path');
    res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
    res.end(await readFile(file));
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(resolve => server.listen(5182, '127.0.0.1', resolve));
const tabs = await (await fetch('http://127.0.0.1:9223/json')).json();
const tab = tabs.find(tab => tab.type === 'page');
const socket = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));
let id = 0;
const pending = new Map();
const errors = [];
socket.addEventListener('message', ({ data }) => {
  const message = JSON.parse(data);
  if (message.id) {
    const entry = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) entry.reject(message.error); else entry.resolve(message.result);
  }
  if (message.method === 'Runtime.exceptionThrown') errors.push(message.params);
});
const send = (method, params = {}) => new Promise((resolve, reject) => {
  pending.set(++id, { resolve, reject });
  socket.send(JSON.stringify({ id, method, params }));
});
const evaluate = async expression => {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
};
const resize = width => send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
const measure = `(() => {
  const rect = selector => { const r = document.querySelector(selector).getBoundingClientRect(); return { x:r.x, y:r.y, width:r.width, height:r.height }; };
  return { hero: rect('.hero'), heading: rect('.hero h1'), eyebrow: rect('.hero-eyebrow'), description: rect('.hero-description'), actions: rect('.hero-actions'), headingFont: getComputedStyle(document.querySelector('.hero h1')).fontSize, serif: getComputedStyle(document.querySelector('.hero em')).fontFamily };
})()`;
const loaded = `new Promise((resolve, reject) => { let tries=0; const timer=setInterval(() => { if(document.querySelector('.header') && document.querySelector('.hero')) { clearInterval(timer); document.fonts.ready.then(() => resolve(true)); } else if(++tries > 100) { clearInterval(timer); reject('Page did not mount'); } },50); })`;
const reports = [];
try {
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  for (const width of [1920, 1440, 768, 390]) {
    await resize(width);
    await send('Page.navigate', { url: 'http://127.0.0.1:5182/' });
    await evaluate(loaded);
    // Normalize scrollbar presence for the one-section page vs full reference.
    await evaluate(`document.documentElement.style.overflow = 'hidden'`);
    const actual = await evaluate(measure);
    assert.equal(await evaluate(`document.documentElement.scrollWidth > innerWidth`), false);
    assert.equal(await evaluate(`document.querySelectorAll('main > section').length`), 1);
    assert.equal(await evaluate(`document.querySelectorAll('.hero-column').length`), 8);
    assert.equal(await evaluate(`getComputedStyle(document.querySelector('.hero')).backgroundColor`), 'rgb(7, 20, 23)');
    assert(actual.eyebrow.y > (width < 768 ? 78 : 86));
    assert(actual.heading.y > actual.eyebrow.y + actual.eyebrow.height);
    assert(actual.description.y >= actual.heading.y + actual.heading.height);
    assert(actual.actions.y >= actual.description.y + actual.description.height);
    assert(actual.actions.y + actual.actions.height <= actual.hero.height);
    assert.equal(await evaluate(`document.querySelector('.hero-column').getAnimations().length`), 0);
    assert.equal(await evaluate(`getComputedStyle(document.querySelector('.hero-column')).transform`), 'none');
    assert.equal(await evaluate(`document.querySelector('.hero-actions a').getAttribute('href')`), '#contact');
    assert.equal(await evaluate(`document.querySelector('.hero-secondary').getAttribute('href')`), '#work');
    await evaluate(`document.querySelector('.hero-actions a').focus()`);
    assert.equal(await evaluate(`document.activeElement.matches('.hero-actions a')`), true);
    assert.equal(await evaluate(`getComputedStyle(document.activeElement).outlineStyle`), 'solid');
    await evaluate(`document.activeElement.blur()`);
    const screenshot = await send('Page.captureScreenshot');
    await writeFile(path.join(site, `qa/hero-${width}.png`), Buffer.from(screenshot.data, 'base64'));
    // Test normal-motion animation through deterministic timeline samples.
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
    const entrance = await evaluate(`(() => {
      const nodes = [...document.querySelectorAll('.hero .entrance')];
      const animations = nodes.map(node => node.getAnimations()[0]);
      const delays = animations.map(a => a.effect.getTiming().delay);
      animations.forEach(a => { a.pause(); a.currentTime = 2000; });
      return { delays, visible:nodes.every(node => getComputedStyle(node).opacity === '1') };
    })()`);
    assert.deepEqual(entrance.delays, [0, 120, 240, 360, 480]);
    assert.equal(entrance.visible, true);
    assert.equal(await evaluate(`(async () => {
      const animation = document.querySelector('.hero-column').getAnimations()[0];
      const before = animation.currentTime;
      await new Promise(resolve => setTimeout(resolve, 200));
      return animation.currentTime > before && animation.playState === 'running';
    })()`), true);
    const wave = await evaluate(`(() => {
      const columns = [...document.querySelectorAll('.hero-column')];
      const animations = columns.map(c => c.getAnimations()[0]);
      const timing = animations.map(a => a.effect.getTiming());
      animations.forEach(a => { a.pause(); a.currentTime = 2000; });
      const first = columns.map(c => getComputedStyle(c).transform);
      animations.forEach(a => { a.currentTime = 4500; });
      const second = columns.map(c => getComputedStyle(c).transform);
      return { durations:timing.map(t => t.duration), delays:timing.map(t => t.delay), first, second, origins:columns.map(c => getComputedStyle(c).transformOrigin), heights:columns.map(c => c.clientHeight), bottoms:columns.map(c => getComputedStyle(c).bottom), running:timing.every(t => t.iterations === Infinity), clipping:getComputedStyle(document.querySelector('.hero')).overflow, hidden:document.querySelector('.hero-waves').getAttribute('aria-hidden') };
    })()`);
    assert(wave.durations.every(d => d === 10000));
    assert.equal(new Set(wave.delays).size, 8);
    assert(wave.first.some((value, i) => value !== wave.second[i]));
    assert.equal(new Set(wave.first).size, 8);
    assert(wave.bottoms.every(b => b === '0px'));
    assert(wave.origins.every((origin, i) => Math.abs(parseFloat(origin.split(' ')[1]) - wave.heights[i]) <= 1));
    assert.equal(wave.running, true);
    assert.equal(wave.clipping, 'hidden');
    assert.equal(wave.hidden, 'true');
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await send('Page.navigate', { url: 'http://127.0.0.1:5176/' });
    await evaluate(loaded);
    await evaluate(`document.documentElement.style.overflow = 'hidden'`);
    const reference = await evaluate(measure);
    // Font rendering can produce tiny subpixel differences; geometry must match.
    for (const key of ['hero', 'heading', 'eyebrow', 'description', 'actions']) {
      for (const dimension of ['x', 'y', 'width', 'height']) {
        assert(Math.abs(actual[key][dimension] - reference[key][dimension]) < 1, `${width} ${key}.${dimension}: ${actual[key][dimension]} vs ${reference[key][dimension]}`);
      }
    }
    assert.equal(actual.headingFont, reference.headingFont);
    assert.equal(actual.serif, reference.serif);
    const refShot = await send('Page.captureScreenshot');
    await writeFile(path.join(site, `qa/hero-reference-${width}.png`), Buffer.from(refShot.data, 'base64'));
    reports.push({ width, height:actual.hero.height, headingFont:actual.headingFont, referenceGeometry:'PASS', wave:'PASS', entrance:'PASS', reducedMotion:'PASS', noOverlapOrOverflow:'PASS' });
  }
  assert.deepEqual(errors, []);
  await writeFile(path.join(site, 'qa/hero-results.json'), JSON.stringify({ status:'PASS', reports, runtimeExceptions:errors }, null, 2));
  console.log(JSON.stringify({ status:'PASS', reports }, null, 2));
} finally {
  socket.close();
  server.close();
}

