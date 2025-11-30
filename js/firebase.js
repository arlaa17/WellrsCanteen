// js/firebase.js  (safe init + small helper API)
// uses Firebase v8 (already loaded via CDN in your HTML)

const firebaseConfig = {
  apiKey: "AIzaSyD2EXAMPLE",
  authDomain: "wellrs-canteen.firebaseapp.com",
  databaseURL: "https://wellrs-canteen-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "wellrs-canteen",
  storageBucket: "wellrs-canteen.appspot.com",
  messagingSenderId: "948593453453",
  appId: "1:948593453453:web:example"
};

// init only once (prevents "already defined" errors)
if (!window.firebase || !firebase.apps || firebase.apps.length === 0) {
  firebase.initializeApp(firebaseConfig);
} else {
  console.warn("Firebase app already initialized.");
}

const rtdb = firebase.database();

// helper small API to avoid calling firebase.* all over
window.fb = {
  ref(path = "") { return firebase.database().ref(path); },
  async get(path) {
    const snap = await firebase.database().ref(path).get();
    return snap;
  },
  async set(path, value) {
    return firebase.database().ref(path).set(value);
  },
  async push(path, value) {
    return firebase.database().ref(path).push(value);
  },
  onValue(path, cb) {
    return firebase.database().ref(path).on("value", cb);
  },
  off(path, cb) {
    return firebase.database().ref(path).off("value", cb);
  },
  remove(path) {
    return firebase.database().ref(path).remove();
  }
};

window.getRTDB = () => rtdb;
