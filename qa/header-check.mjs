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
try {
  await send('Runtime.enable');
  await send('Page.enable');
  await resize(1440);
  await send('Page.navigate', { url: 'http://127.0.0.1:5182/' });
  await evaluate(`new Promise((resolve, reject) => { let tries = 0; const timer = setInterval(() => { if (document.querySelector('.header')) { clearInterval(timer); resolve(true); } else if (++tries > 100) { clearInterval(timer); reject('Header did not mount'); } }, 50); })`);
  await evaluate('document.fonts.ready.then(() => true)');
  const reports = [];
  for (const width of [1440, 1024, 900, 768, 767, 390, 320]) {
    await resize(width);
    const report = await evaluate(`(() => {
      const header = document.querySelector('.header');
      const rect = header.getBoundingClientRect();
      const visible = [...header.children].filter(e => getComputedStyle(e).display !== 'none').map(e => { const r = e.getBoundingClientRect(); return { left:r.left, right:r.right }; });
      return { width: innerWidth, height: rect.height, top: rect.top, overflow: document.documentElement.scrollWidth > innerWidth, overlaps: visible.some((r,i) => i > 0 && r.left < visible[i-1].right - 1), mobile: getComputedStyle(document.querySelector('.menu-toggle')).display !== 'none' };
    })()`);
    assert.equal(report.height, width < 768 ? 64 : 70);
    assert.equal(report.overflow, false);
    assert.equal(report.overlaps, false);
    assert.equal(report.mobile, width < 768);
    reports.push(report);
  }
  await resize(390);
  assert.equal(await evaluate(`document.querySelector('.mobile-nav').inert`), true);
  await evaluate(`document.querySelector('.menu-toggle').click()`);
  assert.equal(await evaluate(`document.querySelector('.menu-toggle').getAttribute('aria-expanded')`), 'true');
  assert.equal(await evaluate(`document.querySelector('.mobile-nav').inert`), false);
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape' });
  assert.equal(await evaluate(`document.activeElement === document.querySelector('.menu-toggle') && document.querySelector('.mobile-nav').inert`), true);
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape' });
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  assert.equal(await evaluate(`document.querySelector('.menu-toggle').getAttribute('aria-expanded')`), 'true');
  await evaluate(`Promise.all(document.querySelector('.mobile-nav').getAnimations().map(animation => animation.finished)).then(() => true)`);
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
  assert.equal(await evaluate(`document.activeElement === document.querySelector('.mobile-nav a')`), true);
  await evaluate(`document.querySelector('.mobile-nav a').addEventListener('click', e => e.preventDefault(), { once: true }); document.querySelector('.mobile-nav a').click()`);
  assert.equal(await evaluate(`document.querySelector('.mobile-nav').inert`), true);
  await evaluate(`document.querySelector('.menu-toggle').click()`);
  await resize(1024);
  await evaluate(`new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))`);
  assert.equal(await evaluate(`document.querySelector('.menu-toggle').getAttribute('aria-expanded')`), 'false');
  await evaluate(`document.querySelector('.skip').focus(); document.querySelector('.skip').click()`);
  assert.equal(await evaluate(`document.activeElement.id`), 'main');
  // Temporary test-only height; no page sections are added to the implementation.
  await evaluate(`document.body.style.minHeight = '2000px'; window.scrollTo(0, 500)`);
  assert.equal(await evaluate(`document.querySelector('.header').getBoundingClientRect().top`), 16);
  await evaluate(`document.body.style.minHeight = ''; window.scrollTo(0, 0)`);
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  assert.equal(await evaluate(`getComputedStyle(document.documentElement).scrollBehavior`), 'auto');
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('.header-contact')).transitionDuration`), '0s');
  const links = await evaluate(`[...document.querySelectorAll('a[data-section]')].map(a => ({ label:a.textContent.trim(), href:a.href }))`);
  assert.equal(links.length, 10);
  assert(links.every(link => link.href.startsWith('https://www.vroooom.com/')));
  assert.equal(await evaluate(`document.querySelectorAll('main > *, section').length`), 0);
  assert.deepEqual(errors, []);
  await resize(1440);
  const desktop = await send('Page.captureScreenshot');
  await writeFile(path.join(site, 'qa/header-desktop.png'), Buffer.from(desktop.data, 'base64'));
  await resize(390);
  await evaluate(`document.querySelector('.menu-toggle').click()`);
  const mobile = await send('Page.captureScreenshot');
  await writeFile(path.join(site, 'qa/header-mobile.png'), Buffer.from(mobile.data, 'base64'));
  const measureHeader = `(() => { const s = getComputedStyle(document.querySelector('.header')); const r = document.querySelector('.header').getBoundingClientRect(); return { height:r.height, left:r.left, width:r.width, top:r.top, background:s.backgroundColor, font:getComputedStyle(document.querySelector('.logo')).fontFamily, logoSize:getComputedStyle(document.querySelector('.logo')).fontSize }; })()`;
  const newMobile = await evaluate(measureHeader);
  await resize(1440);
  const newDesktop = await evaluate(measureHeader);
  await send('Page.navigate', { url: 'http://127.0.0.1:5176/' });
  await evaluate(`new Promise((resolve, reject) => { let tries=0; const timer=setInterval(() => { if(document.querySelector('.header')) { clearInterval(timer); resolve(true); } else if(++tries > 100) { clearInterval(timer); reject('Reference unavailable'); } },50); })`);
  await evaluate('document.fonts.ready.then(() => true)');
  // The isolated navbar has no page scrollbar yet; normalize that environment.
  await evaluate(`document.documentElement.style.overflow = 'hidden'`);
  assert.deepEqual(await evaluate(measureHeader), newDesktop);
  const referenceDesktop = await send('Page.captureScreenshot');
  await writeFile(path.join(site, 'qa/reference-desktop.png'), Buffer.from(referenceDesktop.data, 'base64'));
  await resize(390);
  assert.deepEqual(await evaluate(measureHeader), newMobile);
  await evaluate(`document.querySelector('.menu-toggle').click()`);
  await evaluate(`Promise.all(document.querySelector('.mobile-nav').getAnimations().map(animation => animation.finished)).then(() => true)`);
  const referenceMobile = await send('Page.captureScreenshot');
  await writeFile(path.join(site, 'qa/reference-mobile.png'), Buffer.from(referenceMobile.data, 'base64'));
  console.log('PASS: desktop/mobile geometry, header color, logo font and size match existing reference build.');
  console.log(JSON.stringify({ status: 'PASS', reports, checks: ['menu toggle', 'Escape and focus return', 'Enter and Tab keyboard interaction', 'link close', 'resize reset', 'skip link focus', 'fixed scroll position', 'reduced motion', 'link destinations', 'no other sections', 'no runtime exceptions'], links }, null, 2));
} finally {
  socket.close();
  server.close();
}
