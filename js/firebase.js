// GANTI isi config berikut pakai config-mu sendiri dari Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyCm2AkoWA-rSTi7j0-A0EARxKBX6n9_1H0",
  authDomain: "wellrs-canteen.firebaseapp.com",
  databaseURL: "https://wellrs-canteen-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "wellrs-canteen",
  storageBucket: "wellrs-canteen.firebasestorage.app",
  messagingSenderId: "414987689956",
  appId: "1:414987689956:web:3063be71602cda0d1cf1f1"
};

// Inisialisasi Firebase
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// Buat helper biar mudah dipakai di semua file
window.fb = {
  db,
  ref: firebase.database().ref,
  get: (ref) => ref.get(),
  set: (ref, val) => ref.set(val),
  update: (ref, val) => ref.update(val),
  remove: (ref) => ref.remove(),
  onValue: (ref, cb) => ref.on("value", cb),
};