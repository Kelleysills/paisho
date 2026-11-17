// Firestore rules tests for firestore.rules, run against the local emulator.
// One-time setup (needs Java):  cd tests/rules && npm install
// Run:  cd tests/rules && npm test
const fs = require('fs'), path = require('path');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const firebase = require('firebase/compat/app'); require('firebase/compat/firestore');
const FV = firebase.firestore.FieldValue;
firebase.firestore.setLogLevel('silent');

let env, pass = 0, fail = 0;
async function t(name, fn) {
  try { await fn(); pass++; console.log('  ok  ', name); }
  catch (e) { fail++; console.log('  FAIL', name, '\n       ', e.message.split('\n')[0]); }
  await env.clearFirestore(); await seed();
}
const db = (uid) => (uid ? env.authenticatedContext(uid) : env.unauthenticatedContext()).firestore();
async function seed() {
  await env.withSecurityRulesDisabled(async (c) => {
    const d = c.firestore();
    await d.doc('players/p-alice').set({ name: 'Alice', uids: ['alice1'], salt: 's', friends: [], fcode: 'AAAAAA' });
    await d.doc('pins/p-alice').set({ pin: 'HASH-A' });
    await d.doc('players/p-bob').set({ name: 'Bob', uids: ['bob1'], gUid: 'bobG', friends: [] });
    await d.doc('players/p-old').set({ name: 'Old', salt: 's', pin: 'HASH-OLD' }); // before this change: public hash, no uids
    await d.doc('games/ABCD').set({ status: 'playing', host: { pid: 'p-alice' }, guest: { pid: 'p-bob' }, pids: ['p-alice', 'p-bob'], uids: ['alice1', 'bob1'], ver: 3 });
    await d.doc('games/OPEN').set({ status: 'open', host: { pid: 'p-alice', name: 'Alice' }, guest: null, pids: ['p-alice'], uids: ['alice1'], ver: 0 });
    await d.doc('dms/p-alice__p-bob').set({ pids: ['p-alice', 'p-bob'], uids: ['alice1', 'bob1'], msgs: [{ from: 'p-alice', text: 'hi', t: 1 }] });
    await d.doc('push/p-bob').set({ subs: {} });
    await d.doc('names/bob').set({ pid: 'p-bob', name: 'Bob' });
  });
}
const claim = (d, pid, uid, proof) => {
  const b = d.batch();
  b.set(d.doc(`claims/${pid}_${uid}`), { pid, uid, proof, t: 1 });
  b.update(d.doc('players/' + pid), { uids: FV.arrayUnion(uid) });
  return b.commit();
};

(async () => {
  env = await initializeTestEnvironment({ projectId: 'paisho-rules-test', firestore: { rules: fs.readFileSync(path.join(__dirname, '../../firestore.rules'), 'utf8'), host: '127.0.0.1', port: 8080 } });
  await seed();
  console.log('players');
  await t('signed-out visitors read nothing', () => assertFails(db(null).doc('players/p-bob').get()));
  await t('anyone signed in reads profiles', () => assertSucceeds(db('x').collection('players').limit(50).get()));
  await t('create own profile', () => assertSucceeds(db('new1').doc('players/p-new').set({ name: 'N', uids: ['new1'] })));
  await t('create profile owned by someone else', () => assertFails(db('new1').doc('players/p-new').set({ name: 'N', uids: ['bob1'] })));
  await t('create profile claiming another Google account', () => assertFails(db('new1').doc('players/p-new').set({ name: 'N', uids: ['new1'], gUid: 'bobG' })));
  await t('owner edits profile', () => assertSucceeds(db('alice1').doc('players/p-alice').set({ gp: 99 }, { merge: true })));
  await t('Google owner edits profile', () => assertSucceeds(db('bobG').doc('players/p-bob').set({ gp: 5 }, { merge: true })));
  await t('stranger edits profile', () => assertFails(db('mallory').doc('players/p-alice').set({ gp: 1e9 }, { merge: true })));
  await t('stranger deletes profile', () => assertFails(db('mallory').doc('players/p-alice').delete()));
  await t('owner cannot put a PIN hash back in public', () => assertFails(db('alice1').doc('players/p-alice').set({ pin: 'x' }, { merge: true })));
  await t('owner links own Google', () => assertSucceeds(db('alice1').doc('players/p-alice').set({ gUid: 'alice1' }, { merge: true })));
  await t('owner cannot link someone else’s Google', () => assertFails(db('alice1').doc('players/p-alice').set({ gUid: 'bobG' }, { merge: true })));
  console.log('PIN claims');
  await t('new phone with the right PIN joins the profile', () => assertSucceeds(claim(db('alice2'), 'p-alice', 'alice2', 'HASH-A')));
  await t('wrong PIN is refused', () => assertFails(claim(db('mallory'), 'p-alice', 'mallory', 'nope')));
  await t('adding yourself without a PIN proof is refused', () => assertFails(db('mallory').doc('players/p-alice').update({ uids: FV.arrayUnion('mallory') })));
  await t('claim proof cannot be written for someone else’s sign-in', () => assertFails(claim(db('mallory'), 'p-alice', 'alice9', 'HASH-A')));
  await t('older profile claims with its old hash', () => assertSucceeds(claim(db('old1'), 'p-old', 'old1', 'HASH-OLD')));
  await t('PIN hashes cannot be read', () => assertFails(db('alice1').doc('pins/p-alice').get()));
  await t('owner sets own PIN hash', () => assertSucceeds(db('alice1').doc('pins/p-alice').set({ pin: 'NEW', t: 1 })));
  await t('stranger sets a PIN hash', () => assertFails(db('mallory').doc('pins/p-alice').set({ pin: 'NEW' })));
  await t('owner moves an old hash out of the profile', async () => {
    await claim(db('old1'), 'p-old', 'old1', 'HASH-OLD');
    const d = db('old1'), b = d.batch();
    b.set(d.doc('pins/p-old'), { pin: 'H2', t: 1 }); b.update(d.doc('players/p-old'), { salt: 's2', pin: FV.delete() });
    await assertSucceeds(b.commit());
  });
  console.log('friends');
  await t('accepting a friend adds only your own id to their list', () => assertSucceeds(db('bob1').doc('players/p-alice').set({ friends: FV.arrayUnion('p-bob'), friendBy: 'p-bob' }, { merge: true })));
  await t('cannot add someone else’s id', () => assertFails(db('mallory').doc('players/p-alice').set({ friends: FV.arrayUnion('p-bob'), friendBy: 'p-bob' }, { merge: true })));
  await t('removing a friend', async () => {
    await env.withSecurityRulesDisabled((c) => c.firestore().doc('players/p-alice').update({ friends: ['p-bob'] }));
    await assertSucceeds(db('bob1').doc('players/p-alice').set({ friends: FV.arrayRemove('p-bob'), friendBy: 'p-bob' }, { merge: true }));
  });
  await t('friend code set when missing', () => assertSucceeds(db('x').doc('players/p-bob').set({ fcode: 'BBBBBB' }, { merge: true })));
  await t('friend code cannot be changed by others', () => assertFails(db('x').doc('players/p-alice').set({ fcode: 'ZZZZZZ' }, { merge: true })));
  await t('friend request from your own player', () => assertSucceeds(db('bob1').doc('requests/p-bob_p-alice').set({ from: 'p-bob', to: 'p-alice', t: 1 })));
  await t('friend request in someone else’s name', () => assertFails(db('mallory').doc('requests/p-bob_p-alice').set({ from: 'p-bob', to: 'p-alice', t: 1 })));
  console.log('direct messages');
  await t('players read their thread', () => assertSucceeds(db('bob1').doc('dms/p-alice__p-bob').get()));
  await t('player on a new phone reads it by owning the profile', async () => { await claim(db('alice2'), 'p-alice', 'alice2', 'HASH-A'); await assertSucceeds(db('alice2').doc('dms/p-alice__p-bob').get()); });
  await t('stranger cannot read a thread', () => assertFails(db('mallory').doc('dms/p-alice__p-bob').get()));
  await t('inbox query by sign-in works', () => assertSucceeds(db('bob1').collection('dms').where('uids', 'array-contains', 'bob1').get()));
  await t('stranger cannot query threads by player id', () => assertFails(db('mallory').collection('dms').where('pids', 'array-contains', 'p-bob').get()));
  await t('stranger cannot post into a thread', () => assertFails(db('mallory').doc('dms/p-alice__p-bob').set({ lastText: 'x', uids: ['mallory'] }, { merge: true })));
  await t('player sends a message', () => assertSucceeds(db('alice1').doc('dms/p-alice__p-bob').set({ msgs: FV.arrayUnion({ from: 'p-alice', text: 'yo', t: 2 }), uids: ['alice1', 'bob1'], lastT: 2 }, { merge: true })));
  await t('player starts a new thread', () => assertSucceeds(db('bob1').doc('dms/p-bob__p-old').set({ pids: ['p-bob', 'p-old'], uids: ['bob1'], msgs: [] })));
  console.log('games');
  await t('anyone signed in sees the lobby', () => assertSucceeds(db('x').collection('games').orderBy('updated', 'desc').limit(10).get()));
  await t('host creates a game', () => assertSucceeds(db('alice1').doc('games/NEWG').set({ status: 'open', host: { pid: 'p-alice' }, guest: null, pids: ['p-alice'], uids: ['alice1'] })));
  await t('guest player creates a game', () => assertSucceeds(db('anon').doc('games/NEWG').set({ status: 'open', host: { pid: 'g-xyz' }, guest: null, pids: ['g-xyz'], uids: ['anon'] })));
  await t('cannot host as someone else', () => assertFails(db('mallory').doc('games/NEWG').set({ status: 'open', host: { pid: 'p-alice' }, guest: null, pids: ['p-alice'], uids: ['mallory'] })));
  await t('a guest joins an open game', () => assertSucceeds(db('anon').doc('games/OPEN').set({ status: 'playing', host: { pid: 'p-alice', name: 'Alice' }, guest: { pid: 'g-xyz' }, pids: ['p-alice', 'g-xyz'], uids: ['alice1', 'anon'], ver: 1 }, { merge: true })));
  await t('cannot join as someone else', () => assertFails(db('mallory').doc('games/OPEN').set({ status: 'playing', host: { pid: 'p-alice', name: 'Alice' }, guest: { pid: 'p-bob' }, pids: ['p-alice', 'p-bob'], uids: ['alice1', 'mallory'], ver: 1 }, { merge: true })));
  await t('players move', () => assertSucceeds(db('bob1').doc('games/ABCD').set({ ver: 4, state: '{}' }, { merge: true })));
  await t('player moves from a new phone', async () => { await claim(db('alice2'), 'p-alice', 'alice2', 'HASH-A'); await assertSucceeds(db('alice2').doc('games/ABCD').set({ ver: 4 }, { merge: true })); });
  await t('stranger cannot move', () => assertFails(db('mallory').doc('games/ABCD').set({ ver: 4, state: '{}' }, { merge: true })));
  await t('stranger cannot delete a game', () => assertFails(db('mallory').doc('games/ABCD').delete()));
  await t('Avatar trial game and invite', async () => {
    await assertSucceeds(db('x').doc('games/TRYL').set({ status: 'playing', trial: true, host: { pid: 'p-alice' }, guest: { pid: 'p-bob' }, pids: ['p-alice', 'p-bob'] }));
    await assertSucceeds(db('x').collection('invites').add({ to: 'p-bob', from: 'system', fromCode: 'AVATAR', fromName: 'Avatar Trial', game: 'TRYL', t: 1 }));
  });
  await t('invite in someone else’s name', () => assertFails(db('mallory').doc('invites/ABCD_p-bob').set({ to: 'p-bob', from: 'p-alice', game: 'ABCD', t: 1 })));
  console.log('push and names');
  await t('push subscription readable one at a time', () => assertSucceeds(db('x').doc('push/p-bob').get()));
  await t('push subscriptions cannot be listed', () => assertFails(db('x').collection('push').get()));
  await t('stranger cannot change push subscriptions', () => assertFails(db('mallory').doc('push/p-bob').set({ subs: { a: 'evil' } })));
  await t('owner saves push subscription', () => assertSucceeds(db('bob1').doc('push/p-bob').set({ subs: { a: '{}' } }, { merge: true })));
  await t('reserve a name for a brand-new player', () => assertSucceeds(db('new1').doc('names/newbie').set({ pid: 'p-new', name: 'Newbie' })));
  await t('cannot take over someone’s name', () => assertFails(db('mallory').doc('names/bob').set({ pid: 'p-mal', name: 'Bob' })));
  await t('unknown collections are closed', () => assertFails(db('x').doc('secrets/a').set({ a: 1 })));
  console.log(`\n${pass} passed, ${fail} failed`);
  await env.cleanup();
  process.exit(fail ? 1 : 0);
})();
