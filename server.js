#!/usr/bin/env node
/* Pai Sho home server — serves the app and stores profiles, stats and online games.
   No dependencies. Usage:  node server.js [port]   (default 8080)
   Then open http://<this-PC's-IP>:8080 on any phone on the same Wi-Fi. */
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const PORT = +process.argv[2] || +process.env.PORT || 8080;
const DATA = path.join(__dirname, 'data.json');
const APP = path.join(__dirname, 'dist', 'index.html');

let db = {};
try { db = JSON.parse(fs.readFileSync(DATA, 'utf8')); } catch (e) { db = {}; }
let saveT = null;
const save = () => { clearTimeout(saveT); saveT = setTimeout(() => fs.writeFile(DATA, JSON.stringify(db), () => {}), 300); };
const watchers = new Map(); // "col/id" -> Set(res)
const ok = /^[A-Za-z0-9_\-.~:@+]{1,200}$/;

function notify(col, id) {
  const set = watchers.get(col + '/' + id); if (!set) return;
  const doc = (db[col] || {})[id] || null;
  for (const res of set) res.write('data: ' + JSON.stringify(doc) + '\n\n');
}
function body(req) {
  return new Promise((resolve, reject) => {
    let b = ''; req.on('data', (c) => { b += c; if (b.length > 1e6) req.destroy(); });
    req.on('end', () => { try { resolve(JSON.parse(b || '{}')); } catch (e) { reject(e); } });
  });
}
const send = (res, code, obj, type = 'application/json') => { res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' }); res.end(type === 'application/json' ? JSON.stringify(obj) : obj); };

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const parts = url.pathname.split('/').filter(Boolean);
  try {
    if (parts[0] !== 'api') {
      if (url.pathname === '/' || url.pathname === '/index.html') return send(res, 200, fs.readFileSync(APP), 'text/html; charset=utf-8');
      return send(res, 404, 'Not found', 'text/plain');
    }
    const [, kind, col, id] = parts;
    if (kind === 'ping') return send(res, 200, { ok: true });
    if (!col || !ok.test(col) || (id && !ok.test(id))) return send(res, 400, { error: 'bad path' });
    if (kind === 'c' && req.method === 'GET') return send(res, 200, Object.entries(db[col] || {}).map(([k, v]) => Object.assign({ id: k }, v)));
    if (kind === 'd' && id) {
      if (req.method === 'GET') { const d = (db[col] || {})[id]; return d ? send(res, 200, d) : send(res, 404, null); }
      if (req.method === 'PUT') { (db[col] = db[col] || {})[id] = await body(req); save(); notify(col, id); return send(res, 200, { ok: true }); }
      if (req.method === 'DELETE') { if (db[col]) delete db[col][id]; save(); notify(col, id); return send(res, 200, { ok: true }); }
    }
    if (kind === 'w' && id) {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
      res.write('data: ' + JSON.stringify((db[col] || {})[id] || null) + '\n\n');
      const key = col + '/' + id; if (!watchers.has(key)) watchers.set(key, new Set());
      watchers.get(key).add(res);
      const ping = setInterval(() => res.write(': ping\n\n'), 25000);
      req.on('close', () => { clearInterval(ping); watchers.get(key).delete(res); });
      return;
    }
    send(res, 404, { error: 'not found' });
  } catch (e) { send(res, 500, { error: String(e.message || e) }); }
}).listen(PORT, '0.0.0.0', () => {
  console.log('\n  Pai Sho server running. Open one of these on your phone:\n');
  for (const list of Object.values(os.networkInterfaces())) for (const a of list || []) if (a.family === 'IPv4' && !a.internal) console.log('    http://' + a.address + ':' + PORT);
  console.log('    http://localhost:' + PORT + '  (this PC)\n');
});
