// js/firebase.js  (module, single init - replace config values below)
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import {
  getDatabase, ref as dbRef, set as dbSet, get as dbGet, update as dbUpdate,
  remove as dbRemove, onValue as dbOnValue
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

// ====== CONFIG ======
// Replace these with your Firebase project's config if different.
// (these are the values you provided earlier; double-check in Firebase Console)
const firebaseConfig = {
  apiKey: "AIzaSyCm2AkoWA-rSTi7j0-A0EARxKBX6n9_1H0",
  authDomain: "wellrs-canteen.firebaseapp.com",
  databaseURL: "https://wellrs-canteen-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "wellrs-canteen",
  storageBucket: "wellrs-canteen.firebasestorage.app",
  messagingSenderId: "414987689956",
  appId: "1:414987689956:web:3063be71602cda0d1cf1f1"
};

const fbApp = initializeApp(firebaseConfig);
const db = getDatabase(fbApp);

// helper device id & availability (single source of truth)
function getDeviceId() {
  let id = localStorage.getItem("wc_deviceId");
  if (!id) {
    id = "dev-" + Date.now().toString(36) + "-" + Math.floor(Math.random() * 10000);
    localStorage.setItem("wc_deviceId", id);
  }
  return id;
}
function isFirebaseAvailable() {
  return !!(window && db && typeof dbRef === "function");
}

// expose simple API on window.fb used by owner.js & script.js
window.fb = {
  db,
  ref: (path) => dbRef(db, path),
  set: async (pathOrRef, val) => {
    const r = typeof pathOrRef === "string" ? dbRef(db, pathOrRef) : pathOrRef;
    return dbSet(r, val);
  },
  get: async (pathOrRef) => {
    const r = typeof pathOrRef === "string" ? dbRef(db, pathOrRef) : pathOrRef;
    return dbGet(r);
  },
  update: async (pathOrRef, val) => {
    const r = typeof pathOrRef === "string" ? dbRef(db, pathOrRef) : pathOrRef;
    return dbUpdate(r, val);
  },
  remove: async (pathOrRef) => {
    const r = typeof pathOrRef === "string" ? dbRef(db, pathOrRef) : pathOrRef;
    return dbRemove(r);
  },
  onValue: (pathOrRef, cb) => {
    const r = typeof pathOrRef === "string" ? dbRef(db, pathOrRef) : pathOrRef;
    return dbOnValue(r, cb);
  }
};

// also expose helpers globally so other scripts don't re-declare them
window.getDeviceId = getDeviceId;
window.isFirebaseAvailable = isFirebaseAvailable;

// optional: log to help debugging
console.info("Firebase initialized. databaseURL:", firebaseConfig.databaseURL);

firebase.initializeApp(firebaseConfig);

// init RTDB
const database = firebase.database();
