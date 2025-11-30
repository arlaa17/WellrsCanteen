// firebase.js — Firebase v8 compatible

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCm2AkoWA-rSTi7j0-A0EARxKBX6n9_1H0",
  authDomain: "wellrs-canteen.firebaseapp.com",
  databaseURL: "https://wellrs-canteen-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "wellrs-canteen",
  storageBucket: "wellrs-canteen.firebasestorage.app",
  messagingSenderId: "414987689956",
  appId: "1:414987689956:web:3063be71602cda0d1cf1f1"
};

// Init Firebase (v8)
firebase.initializeApp(firebaseConfig);

// Realtime Database
const database = firebase.database();

// Expose helper API
window.fb = {
  db: database,
  ref: (path) => database.ref(path),
  set: (path, val) => database.ref(path).set(val),
  get: (path) => database.ref(path).once("value"),
  update: (path, val) => database.ref(path).update(val),
  remove: (path) => database.ref(path).remove(),
  onValue: (path, cb) => database.ref(path).on("value", cb),
};

// helper for device id
window.getDeviceId = function(){
  let id = localStorage.getItem("wc_deviceId");
  if(!id){
    id = "dev-" + Date.now().toString(36) + "-" + Math.floor(Math.random() * 10000);
    localStorage.setItem("wc_deviceId", id);
  }
  return id;
};

window.isFirebaseAvailable = () => true;

console.info("Firebase v8 initialized successfully.");