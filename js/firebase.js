// firebase.js (Fixed Final)
const firebaseConfig = {
    apiKey: "AIzaSyD2EXAMPLE",
    authDomain: "wellrs-canteen.firebaseapp.com",
    databaseURL: "https://wellrs-canteen-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "wellrs-canteen",
    storageBucket: "wellrs-canteen.appspot.com",
    messagingSenderId: "948593453453",
    appId: "1:948593453453:web:example"
};

firebase.initializeApp(firebaseConfig);
const rtdb = firebase.database();

let rtdbReady = false;

/** Menunggu RTDB benar-benar siap (Firebase kadang delay di GitHub pages) */
function waitForRTDB(maxWait = 5000) {
  return new Promise((resolve, reject) => {
    const t0 = Date.now();
    const interval = setInterval(() => {
      if (firebase.apps.length > 0 && firebase.database) {
        clearInterval(interval);
        rtdbReady = true;
        resolve(true);
      } else if (Date.now() - t0 > maxWait) {
        clearInterval(interval);
        reject(false);
      }
    }, 100);
  });
}

function getRTDB() {
  if (!rtdbReady) console.warn("RTDB not ready yet");
  return rtdb;
}

window.waitForRTDB = waitForRTDB;
window.getRTDB = getRTDB;
window.rtdb = rtdb;