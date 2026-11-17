// Runs the app's own Firebase code (src/firebase.js) against the emulators with firestore.rules loaded.
// Run with: npm run test:client  (from tests/rules)
const fs = require('fs'), path = require('path'), vm = require('vm');
const firebase = require('firebase/compat/app'); require('firebase/compat/auth'); require('firebase/compat/firestore');
firebase.firestore.setLogLevel('silent');
const app = firebase.initializeApp({ apiKey: 'fake-key', projectId: 'paisho-rules-test', authDomain: 'localhost' });
firebase.auth().useEmulator('http://127.0.0.1:9099');
firebase.firestore().useEmulator('127.0.0.1', 8080);
const admin = firebase.initializeApp({ projectId: 'paisho-rules-test' }, 'admin');
const { initializeTestEnvironment } = require('@firebase/rules-unit-testing');

Object.assign(globalThis, { window: { firebase }, firebase, Store: { kind: 'firebase' }, location: { href: 'http://localhost/' },
  fetch: async () => ({ ok: true, json: async () => ({}) }) }); // no real push requests
const realSetInterval = setInterval; globalThis.setInterval = () => 0;
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '../../src/firebase.js'), 'utf8') + '\n;globalThis.FB = FB; globalThis.FireSocial = FireSocial;');
globalThis.setInterval = realSetInterval;
const { FB, FireSocial } = globalThis;

let pass = 0, fail = 0;
const check = (name, ok) => { ok ? pass++ : fail++; console.log(ok ? '  ok  ' : '  FAIL', name); };
const _warn = console.warn; console.warn = (m, ...r) => { if (!/Google redirect/.test(String(m))) _warn(m, ...r); };
async function phone() { await firebase.auth().signOut().catch(() => {}); if (!(await FB.init())) throw new Error('init failed'); return FB.uid; }

(async () => {
  const env = await initializeTestEnvironment({ projectId: 'paisho-rules-test', firestore: { rules: fs.readFileSync(path.join(__dirname, '../../firestore.rules'), 'utf8'), host: '127.0.0.1', port: 8080 } });
  await env.clearFirestore();
  const raw = async (fn) => { let out; await env.withSecurityRulesDisabled(async (c) => { out = await fn(c.firestore()); }); return out; };

  // phone A makes a player
  const a = await phone();
  const uidsA = await FB.createPlayer({ id: 'p-kel', name: 'Kel', salt: 's1', pin: 'H1', friends: [] });
  check('new player is owned by the phone that made it', uidsA.join() === a);
  check('PIN hash goes to the hidden store', await FB.savePin('p-kel', 's1', 'H1'));
  const kel = (await raw((d) => d.doc('players/p-kel').get())).data();
  check('profile no longer carries a PIN hash', !('pin' in kel) && FB.owns(kel));

  // phone B: someone else
  const b = await phone();
  check('another phone does not own it', !FB.owns(kel));
  check('another phone cannot add itself without the PIN', !(await FB.stamp('p-kel')));
  check('wrong PIN is refused', !(await FB.claim('p-kel', 'nope')));
  check('right PIN links the new phone', await FB.claim('p-kel', 'H1'));
  const kel2 = (await raw((d) => d.doc('players/p-kel').get())).data();
  check('profile now lists both phones', kel2.uids.includes(a) && kel2.uids.includes(b) && FB.owns(kel2));
  check('claim note was cleaned up', !(await raw((d) => d.doc(`claims/p-kel_${b}`).get())).exists);

  // an older profile with its hash still public
  await raw((d) => d.doc('players/p-old').set({ name: 'Old', salt: 's0', pin: 'H0', friends: [] }));
  const c = await phone();
  check('older profile: PIN proof against its old hash', await FB.claim('p-old', 'H0'));
  check('older profile: hash moved out with a new salt', await FB.savePin('p-old', 's9', 'H9'));
  const old = (await raw((d) => d.doc('players/p-old').get())).data();
  check('older profile is clean now', !('pin' in old) && old.salt === 's9');
  check('the old hash no longer works', !(await FB.claim('p-old', 'H0')));
  check('the new hash does', await FB.claim('p-old', 'H9'));

  // direct messages from p-old (phone C) to p-kel
  await FireSocial.start({ pid: 'p-old', name: 'Old' });
  const r = await FireSocial.sendDM('p-kel', 'Kel', 'hello');
  const dm = (await raw((d) => d.doc('dms/p-kel__p-old').get())).data();
  check('message sent', r === null && dm && dm.msgs.length === 1);
  check('thread readable by every phone of both players', [a, b, c].every((u) => dm.uids.includes(u)));
  FireSocial.stop();
  await phone(); // a stranger
  let blocked = false; try { await FB.col('dms').doc('p-kel__p-old').get(); } catch (e) { blocked = true; }
  check('a stranger cannot read the thread', blocked);

  console.log(`\n${pass} passed, ${fail} failed`);
  await env.cleanup(); await admin.delete(); await app.delete();
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
