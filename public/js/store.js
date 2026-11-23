// Data layer: Firebase auth + Firestore, with a local cache so the app opens instantly and works offline.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut as fbSignOut, sendPasswordResetEmail } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { initializeFirestore, persistentLocalCache, persistentSingleTabManager, doc, getDoc, setDoc, collection, getDocs, deleteDoc } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyDlwHFcbEGgx-_k3AKaIkSohdQoH1aDqew',
  authDomain: 'liftlab-54557.firebaseapp.com',
  projectId: 'liftlab-54557',
  storageBucket: 'liftlab-54557.firebasestorage.app',
  messagingSenderId: '417291749295',
  appId: '1:417291749295:web:9c288a9d903d5a3081915a'
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
let db;
try { db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentSingleTabManager() }) }); }
catch { db = initializeFirestore(app, {}); }

const LS = 'liftlab.cache.v1', LS_ACTIVE = 'liftlab.active.v1';
export const PROFILE_KEYS = ['settings', 'equipment', 'excluded', 'boosted', 'barOverrides', 'soreness', 'gameSkips', 'games', 'bodyweight', 'notes', 'reviews', 'mobilityLog'];

const clean = (o) => JSON.parse(JSON.stringify(o)); // strip undefined for Firestore

export function readCache() { try { return JSON.parse(localStorage.getItem(LS)) || null; } catch { return null; } }
export function writeCache(state) {
  try {
    const p = Object.fromEntries(PROFILE_KEYS.map(k => [k, state[k]]));
    localStorage.setItem(LS, JSON.stringify({ uid: state.uid, ...p, workouts: state.workouts }));
  } catch { /* storage full or blocked */ }
}
export function readActive() { try { return JSON.parse(localStorage.getItem(LS_ACTIVE)) || null; } catch { return null; } }
export function writeActive(a) { try { a ? localStorage.setItem(LS_ACTIVE, JSON.stringify(a)) : localStorage.removeItem(LS_ACTIVE); } catch { } }

export const onAuth = (cb) => onAuthStateChanged(auth, cb);
export const signIn = (email, pw) => signInWithEmailAndPassword(auth, email, pw);
export const resetPassword = (email) => sendPasswordResetEmail(auth, email);
export const signOut = () => { localStorage.removeItem(LS); return fbSignOut(auth); };

export async function loadAll(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  const profile = snap.exists() ? snap.data() : null;
  const ws = await getDocs(collection(db, 'users', uid, 'workouts'));
  const workouts = ws.docs.map(d => d.data()).sort((a, b) => b.startedAt - a.startedAt);
  return { profile, workouts };
}

let saveTimer = null;
export function saveProfile(state) {
  writeCache(state);
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const p = Object.fromEntries(PROFILE_KEYS.map(k => [k, state[k] ?? null]));
    setDoc(doc(db, 'users', state.uid), clean({ ...p, updatedAt: Date.now() })).catch(e => console.warn('profile save', e));
  }, 600);
}
export function saveWorkout(state, w) {
  writeCache(state);
  return setDoc(doc(db, 'users', state.uid, 'workouts', w.id), clean(w)).catch(e => console.warn('workout save', e));
}
export function removeWorkout(state, id) {
  writeCache(state);
  return deleteDoc(doc(db, 'users', state.uid, 'workouts', id)).catch(e => console.warn('workout delete', e));
}
