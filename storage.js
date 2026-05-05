/**
 * Priora — Storage Abstraction Layer  (storage.js)
 * ─────────────────────────────────────────────────────────────────
 * Rules:
 *   • Guest (not signed in)  → LocalStorage only
 *   • Signed in              → Firestore (real-time sync) + LocalStorage cache
 *
 * Every write is immediate. If offline: queued by Firestore SDK automatically.
 * Sync badge updates in real-time via connection listener.
 * ─────────────────────────────────────────────────────────────────
 * Data layout in Firestore:
 *   users/{uid}/meta/profile   → { name, empId, avatar (URL or base64) }
 *   users/{uid}/items/{itemId} → project or request document
 *   users/{uid}/trash/{itemId} → deleted item document
 * ─────────────────────────────────────────────────────────────────
 */

import { initializeApp }           from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword,
         createUserWithEmailAndPassword, signInWithPopup,
         GoogleAuthProvider, signOut, updateProfile }
                                    from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore, doc, collection, setDoc, getDoc,
         getDocs, deleteDoc, writeBatch, onSnapshot,
         serverTimestamp, enableIndexedDbPersistence }
                                    from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import FIREBASE_CONFIG              from './firebase-config.js';

// ── Init ──────────────────────────────────────────────────────────
const app  = initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);
const db   = getFirestore(app);

// Enable offline persistence (IndexedDB under the hood)
enableIndexedDbPersistence(db).catch(err => {
  if (err.code === 'failed-precondition') {
    console.warn('[Priora] Multiple tabs open — offline persistence limited.');
  }
});

// ─────────────────────────────────────────────────────────────────
// ── Sync Status Badge ─────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────
function _showSyncBadge(state) {
  // state: 'synced' | 'syncing' | 'offline' | 'hidden'
  let badge = document.getElementById('priora-sync-badge');
  if (!badge) {
    badge = document.createElement('div');
    badge.id = 'priora-sync-badge';
    Object.assign(badge.style, {
      position: 'fixed', bottom: '60px', insetInlineEnd: '16px',
      zIndex: '9998', display: 'flex', alignItems: 'center', gap: '6px',
      padding: '5px 11px', borderRadius: '99px',
      fontFamily: 'var(--font)', fontSize: '12px', fontWeight: '500',
      boxShadow: 'var(--shadow-md)', transition: 'opacity .3s, transform .3s',
      pointerEvents: 'none', userSelect: 'none',
      backdropFilter: 'blur(6px)'
    });
    document.body.appendChild(badge);
  }

  const configs = {
    synced: {
      bg: 'rgba(22,163,74,.15)', border: '1px solid rgba(22,163,74,.35)',
      color: 'var(--green)', icon: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>`,
      label: 'Synced', opacity: '1', transform: 'translateY(0)'
    },
    syncing: {
      bg: 'rgba(59,130,246,.15)', border: '1px solid rgba(59,130,246,.35)',
      color: 'var(--accent)', icon: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="animation:priora-spin .9s linear infinite"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>`,
      label: 'Syncing…', opacity: '1', transform: 'translateY(0)'
    },
    offline: {
      bg: 'rgba(245,158,11,.15)', border: '1px solid rgba(245,158,11,.4)',
      color: 'var(--amber)', icon: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39M10.71 5.05A16 16 0 0 1 22.56 9M1.42 9a15.91 15.91 0 0 1 4.7-2.88M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01"/></svg>`,
      label: 'Offline — changes queued', opacity: '1', transform: 'translateY(0)'
    },
    hidden: { opacity: '0', transform: 'translateY(6px)' }
  };

  const c = configs[state] || configs.hidden;
  Object.assign(badge.style, {
    background: c.bg || '', border: c.border || 'none',
    color: c.color || 'var(--text2)', opacity: c.opacity,
    transform: c.transform
  });
  badge.innerHTML = state !== 'hidden'
    ? `${c.icon}<span>${c.label}</span>` : '';

  if (state === 'synced') {
    clearTimeout(badge._hideTimer);
    badge._hideTimer = setTimeout(() => _showSyncBadge('hidden'), 2500);
  }
}

// Spin animation (injected once)
if (!document.getElementById('priora-spin-style')) {
  const s = document.createElement('style');
  s.id = 'priora-spin-style';
  s.textContent = '@keyframes priora-spin{to{transform:rotate(360deg)}}';
  document.head.appendChild(s);
}

// Monitor online/offline
window.addEventListener('online',  () => { if (_currentUser) _showSyncBadge('synced'); });
window.addEventListener('offline', () => { if (_currentUser) _showSyncBadge('offline'); });

// ─────────────────────────────────────────────────────────────────
// ── Internal helpers ─────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────
let _currentUser = null;

function _itemsRef(uid) { return collection(db, 'users', uid, 'items'); }
function _trashRef(uid) { return collection(db, 'users', uid, 'trash'); }
function _profileRef(uid) { return doc(db, 'users', uid, 'meta', 'profile'); }
function _itemRef(uid, id) { return doc(db, 'users', uid, 'items', id); }
function _trashItemRef(uid, id) { return doc(db, 'users', uid, 'trash', id); }

// LocalStorage key (unchanged — guest mode)
const LS_KEY = 'priora_v1_data';

function _lsLoad() {
  try {
    const r = localStorage.getItem(LS_KEY);
    return r ? JSON.parse(r) : null;
  } catch { return null; }
}
function _lsSave(state) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {}
}

// ─────────────────────────────────────────────────────────────────
// ── PUBLIC API — use these everywhere in index.html ───────────────
// ─────────────────────────────────────────────────────────────────

/**
 * storage.load()
 * Loads full state. Returns the state object.
 * Called once on app init (replaces the existing load() function).
 */
async function load() {
  const ls = _lsLoad();
  const base = {
    projects: [], requests: [], trash: [],
    user: { name: '', empId: '', avatar: '' }
  };
  const merged = Object.assign(base, ls || {});

  if (!_currentUser) return merged; // guest → LS only

  // Signed in → pull from Firestore
  try {
    _showSyncBadge('syncing');
    const [itemSnap, trashSnap, profileSnap] = await Promise.all([
      getDocs(_itemsRef(_currentUser.uid)),
      getDocs(_trashRef(_currentUser.uid)),
      getDoc(_profileRef(_currentUser.uid))
    ]);

    const projects = [], requests = [];
    itemSnap.forEach(d => {
      const it = d.data();
      if (it._type === 'project') projects.push(it);
      else requests.push(it);
    });
    const trash = [];
    trashSnap.forEach(d => trash.push(d.data()));

    let user = { name: '', empId: '', avatar: '' };
    if (profileSnap.exists()) user = profileSnap.data();

    const fsState = { projects, requests, trash, user };
    _lsSave(fsState); // cache locally
    _showSyncBadge('synced');
    return fsState;
  } catch (err) {
    console.error('[Priora] Firestore load error:', err);
    _showSyncBadge('offline');
    return merged; // fallback to LS cache
  }
}

/**
 * storage.saveItem(item)
 * Saves a single project or request.
 * item must have: { id, _type: 'project'|'request', ...fields }
 */
async function saveItem(item) {
  if (!_currentUser) return; // guest → handled by existing save() → LS
  try {
    _showSyncBadge('syncing');
    await setDoc(_itemRef(_currentUser.uid, item.id), item);
    _showSyncBadge('synced');
  } catch (err) {
    console.error('[Priora] saveItem error:', err);
    _showSyncBadge('offline');
  }
}

/**
 * storage.deleteItem(id)
 * Removes an item from the active items collection.
 */
async function deleteItem(id) {
  if (!_currentUser) return;
  try {
    await deleteDoc(_itemRef(_currentUser.uid, id));
  } catch (err) {
    console.error('[Priora] deleteItem error:', err);
    _showSyncBadge('offline');
  }
}

/**
 * storage.moveToTrash(item)
 * Moves item to trash collection, removes from items.
 */
async function moveToTrash(item) {
  if (!_currentUser) return;
  try {
    const batch = writeBatch(db);
    batch.set(_trashItemRef(_currentUser.uid, item.id), item);
    batch.delete(_itemRef(_currentUser.uid, item.id));
    await batch.commit();
  } catch (err) {
    console.error('[Priora] moveToTrash error:', err);
    _showSyncBadge('offline');
  }
}

/**
 * storage.restoreFromTrash(item)
 * Moves item back to items collection from trash.
 */
async function restoreFromTrash(item) {
  if (!_currentUser) return;
  try {
    const batch = writeBatch(db);
    batch.set(_itemRef(_currentUser.uid, item.id), item);
    batch.delete(_trashItemRef(_currentUser.uid, item.id));
    await batch.commit();
  } catch (err) {
    console.error('[Priora] restoreFromTrash error:', err);
    _showSyncBadge('offline');
  }
}

/**
 * storage.permDeleteFromTrash(id)
 * Permanently removes item from trash.
 */
async function permDeleteFromTrash(id) {
  if (!_currentUser) return;
  try {
    await deleteDoc(_trashItemRef(_currentUser.uid, id));
  } catch (err) {
    console.error('[Priora] permDeleteFromTrash error:', err);
  }
}

/**
 * storage.saveProfile(userObj)
 * Saves user profile { name, empId, avatar }
 */
async function saveProfile(userObj) {
  if (!_currentUser) return;
  try {
    await setDoc(_profileRef(_currentUser.uid), userObj);
  } catch (err) {
    console.error('[Priora] saveProfile error:', err);
  }
}

/**
 * storage.pushFullState(state)
 * Syncs the entire in-memory state to Firestore.
 * Used after restore-from-backup or start-fresh.
 */
async function pushFullState(state) {
  if (!_currentUser) return;
  try {
    _showSyncBadge('syncing');
    const uid = _currentUser.uid;
    const batch = writeBatch(db);

    // Items
    [...state.projects, ...state.requests].forEach(it => {
      batch.set(_itemRef(uid, it.id), it);
    });
    // Trash
    (state.trash || []).forEach(it => {
      batch.set(_trashItemRef(uid, it.id), it);
    });
    // Profile
    if (state.user) {
      batch.set(_profileRef(uid), state.user);
    }
    await batch.commit();
    _showSyncBadge('synced');
  } catch (err) {
    console.error('[Priora] pushFullState error:', err);
    _showSyncBadge('offline');
  }
}

// ─────────────────────────────────────────────────────────────────
// ── Auth API ─────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────

async function authSignInEmail(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}
async function authSignUpEmail(email, password, displayName) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName) await updateProfile(cred.user, { displayName });
  return cred;
}
async function authSignInGoogle() {
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
}
async function authSignOut() {
  return signOut(auth);
}

/**
 * onAuthChange(callback)
 * callback(user | null) — fired on sign-in / sign-out / page load
 */
function onAuthChange(callback) {
  onAuthStateChanged(auth, user => {
    _currentUser = user;
    callback(user);
  });
}

// ─────────────────────────────────────────────────────────────────
// ── Exports ──────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────
const storage = {
  // Data
  load,
  saveItem,
  deleteItem,
  moveToTrash,
  restoreFromTrash,
  permDeleteFromTrash,
  saveProfile,
  pushFullState,
  // Auth
  authSignInEmail,
  authSignUpEmail,
  authSignInGoogle,
  authSignOut,
  onAuthChange,
  // Sync badge
  showSyncBadge: _showSyncBadge,
  // Convenience
  get currentUser() { return _currentUser; }
};

export default storage;
