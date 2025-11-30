/* owner.js — FIXED final (compatible with existing dashboard) */

/* RTDB helpers */
function isRTDBReady() {
  return Boolean(window.firebase && firebase.database);
}

function waitForRTDB(timeout = 4000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    (function check() {
      if (isRTDBReady()) return resolve(true);
      if (Date.now() - start > timeout) return reject("RTDB timeout");
      setTimeout(check, 150);
    })();
  });
}

/* normalize any shape of owners -> array of {username,password,name} */
function normalizeOwners(obj) {
  if (!obj) return [];
  if (Array.isArray(obj)) return obj.filter(Boolean);
  if (typeof obj === "object") {
    return Object.keys(obj).map(k => {
      const v = obj[k];
      // if v is primitive (unlikely), treat key as username
      if (v && typeof v === 'object') {
        return {
          username: v.username || k,
          password: v.password || "",
          name: v.name || ""
        };
      }
      return { username: k, password: "", name: "" };
    }).filter(o => o.username);
  }
  return [];
}

/* async load owners (prefers RTDB, falls back to localStorage, then default) */
async function loadOwners() {
  // try RTDB first (if available)
  if (isRTDBReady()) {
    try {
      const snap = await firebase.database().ref("owners").get();
      const val = snap.exists() ? snap.val() : null;
      const arr = normalizeOwners(val);
      if (arr.length > 0) return arr;
    } catch (e) {
      // ignore and fallback to localStorage
      console.warn("RTDB read failed:", e);
    }
  }

  // fallback: localStorage
  try {
    const raw = localStorage.getItem("owners");
    if (!raw) {
      const def = [{ username: "stockwise", password: "ferrari", name: "Wellrs Admin" }];
      return def;
    }
    const parsed = JSON.parse(raw);
    return normalizeOwners(parsed);
  } catch (e) {
    // corrupt -> return default
    return [{ username: "stockwise", password: "ferrari", name: "Wellrs Admin" }];
  }
}

/* synchronous read from localStorage (used by UI that does not await) */
function loadOwnersSync() {
  try {
    const raw = localStorage.getItem("owners");
    if (!raw) return [{ username: "stockwise", password: "ferrari", name: "Wellrs Admin" }];
    const parsed = JSON.parse(raw);
    return normalizeOwners(parsed);
  } catch (e) {
    return [{ username: "stockwise", password: "ferrari", name: "Wellrs Admin" }];
  }
}

/* write owners array to localStorage */
function saveOwnersToLocal(ownersArray) {
  try {
    localStorage.setItem("owners", JSON.stringify(ownersArray));
  } catch (e) {
    console.warn("Failed to save owners to localStorage", e);
  }
}

/* addOwner — returns Promise<boolean> (async) */
async function addOwner(username, password, name = "") {
  // use sync load for immediate duplicate check
  const current = loadOwnersSync();
  if (current.some(o => o.username === username)) return false;

  // update local copy immediately (so UI that doesn't await sees change)
  current.push({ username, password, name });
  saveOwnersToLocal(current);

  // if RTDB ready, push asynchronously (do not block)
  if (isRTDBReady()) {
    try {
      firebase.database().ref("owners").push({ username, password, name }).catch(e => {
        console.warn("RTDB push failed (addOwner):", e);
      });
    } catch (e) {
      console.warn("RTDB push exception:", e);
    }
  }

  return true;
}

/* sync-friendly wrapper (returns boolean immediately) */
function addOwnerSync(username, password, name = "") {
  // mirror addOwner but synchronous; returns boolean
  const current = loadOwnersSync();
  if (current.some(o => o.username === username)) return false;
  current.push({ username, password, name });
  saveOwnersToLocal(current);

  // trigger async RTDB push (no await)
  if (isRTDBReady()) {
    try {
      firebase.database().ref("owners").push({ username, password, name }).catch(e => {
        console.warn("RTDB push failed (addOwnerSync):", e);
      });
    } catch (e) { console.warn(e); }
  }
  return true;
}

/* delete owner (async - returns Promise<boolean>) */
async function deleteOwner(user) {
  if (!user) return false;
  if (user === "stockwise") return false; // protect default

  // try RTDB removal if possible
  if (isRTDBReady()) {
    try {
      const snap = await firebase.database().ref("owners").get();
      const val = snap.exists() ? snap.val() : {};
      const key = Object.keys(val || {}).find(k => (val[k] && val[k].username) === user);
      if (key) {
        await firebase.database().ref("owners/" + key).remove();
        // also remove local copy
        const owners = await loadOwners();
        const filtered = owners.filter(o => o.username !== user);
        saveOwnersToLocal(filtered);
        return true;
      }
    } catch (e) {
      console.warn("RTDB delete failed:", e);
    }
  }

  // fallback - remove from localStorage
  const owners = loadOwnersSync();
  const filtered = owners.filter(o => o.username !== user);
  saveOwnersToLocal(filtered);
  return true;
}

/* sync-friendly delete (returns boolean immediately) */
function deleteOwnerSync(user) {
  if (!user) return false;
  if (user === "stockwise") return false;

  // remove from localStorage immediately
  const owners = loadOwnersSync();
  const filtered = owners.filter(o => o.username !== user);
  saveOwnersToLocal(filtered);

  // attempt async RTDB remove if ready
  if (isRTDBReady()) {
    try {
      firebase.database().ref("owners").get().then(snap => {
        const val = snap.exists() ? snap.val() : {};
        const key = Object.keys(val || {}).find(k => (val[k] && val[k].username) === user);
        if (key) {
          firebase.database().ref("owners/" + key).remove().catch(e => console.warn("RTDB remove error", e));
        }
      }).catch(e => console.warn("RTDB read for delete failed", e));
    } catch (e) { console.warn(e); }
  }

  return true;
}

/* ownerLogin (async) - uses RTDB then localStorage */
async function ownerLogin() {
  const username = (document.getElementById("ownerUsername") || {}).value || "";
  const password = (document.getElementById("ownerPassword") || {}).value || "";
  const utrim = username.trim();
  const ptrim = password.trim();

  // try RTDB first
  let owners = [];
  if (isRTDBReady()) {
    try {
      const snap = await firebase.database().ref("owners").get();
      const data = snap.exists() ? snap.val() : null;
      owners = normalizeOwners(data);
    } catch (e) {
      console.warn("RTDB read failed (login):", e);
    }
  }

  // fallback to localStorage if empty
  if (!owners || owners.length === 0) {
    owners = loadOwnersSync();
  }

  const owner = owners.find(o => (o.username || "") === utrim && (o.password || "") === ptrim);
  if (!owner) {
    alert("Username atau Password salah");
    return;
  }

  sessionStorage.setItem("ownerAuth", owner.username);
  localStorage.setItem("owner", JSON.stringify(owner));
  // redirect
  window.location.href = "owner-dashboard.html";
}

/* ---------- Convenience wrappers for UI that called old names ---------- */
/* Provide addOwner (sync-friendly) because dashboard sometimes calls without await */
function addOwnerWrapper(u, p, name) {
  return addOwnerSync(u, p, name || u);
}

/* Provide deleteOwnerWrapper for compatibility */
function deleteOwnerWrapper(u) {
  return deleteOwnerSync(u);
}

/* Orders helpers (kept minimal — assuming other code provides loadOrders/updateOrderStatus etc.) */
/* If your app expects loadOrders() to be synchronous array, provide a safe helper */
function loadOrders() {
  try {
    const raw = localStorage.getItem("orders");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

/* expose API */
window.isRTDBReady = isRTDBReady;
window.waitForRTDB = waitForRTDB;
window.loadOwners = loadOwners;          // async
window.loadOwnersSync = loadOwnersSync;  // sync
window.addOwner = addOwnerWrapper;       // sync-friendly (returns boolean)
window.addOwnerAsync = addOwner;         // async version (returns Promise<boolean>)
window.deleteOwner = deleteOwnerWrapper; // sync-friendly
window.deleteOwnerAsync = deleteOwner;   // async version
window.ownerLogin = ownerLogin;
window.loadOrders = loadOrders;

/* ========== ORDERS: small helpers to support owner-dashboard actions ========== */
/* Paste this near the end of owner.js (before window.expose / exports) */

/**
 * saveOrders(orders)
 * - orders: array
 * Writes orders to localStorage and attempts best-effort sync to Firebase (non-blocking).
 */
function saveOrders(orders) {
  try {
    localStorage.setItem('orders', JSON.stringify(Array.isArray(orders) ? orders : []));
  } catch (e) {
    console.warn('saveOrders -> localStorage failed', e);
  }

  // best-effort: update RTDB if firebase available (do not throw)
  try {
    if (isRTDBReady() && window.firebase && firebase.database) {
      // write under /orders/<id> for compatibility with script.js pushOrderToRemote logic
      const dbRef = firebase.database().ref('orders');
      // overwrite the whole orders node with an object keyed by id (safer)
      const obj = {};
      (Array.isArray(orders) ? orders : []).forEach(o => {
        if (o && o.id) obj[o.id] = o;
      });
      Object.keys(obj).forEach(id => {
        firebase.database().ref("orders/" + id).set(obj[id]);
      });
    }
  } catch (e) {
    // ignore
  }
}

/**
 * updateOrderStatus(id, status)
 * - updates an order's status in localStorage and tries to sync to Firebase.
 * - status should be one of: 'new', 'processing', 'done' (dashboard expects these)
 */
function updateOrderStatus(id, status) {
  if (!id) return false;
  try {
    const orders = loadOrders(); // synchronous loader from owner.js
    const idx = orders.findIndex(o => o.id === id);
    if (idx === -1) return false;

    orders[idx].status = status;
    // for backward compatibility keep createdAt if present
    orders[idx].updatedAt = (new Date()).toISOString();

    saveOrders(orders);

    // if status finished, set a local flag so customer device can show notif (existing script.js polls orderReady_<id>)
    if (status === 'done' || status === 'Done' || status === 'Selesai') {
      try {
        // local flag for client-side polling
        localStorage.setItem('orderReady_' + id, 'yes');
      } catch (e) {}
      // also push a simple RTDB signal if available
      try {
        if (isRTDBReady() && window.firebase && firebase.database) {
          firebase.database().ref('orderSignals/' + id).set('yes').catch(()=>{});
        }
      } catch(e){}
    }

    return true;
  } catch (e) {
    console.warn('updateOrderStatus failed', e);
    return false;
  }
}

/**
 * deleteOrder(id)
 * - Removes order from localStorage and from RTDB (if available)
 */
function deleteOrder(id) {
  if (!id) return false;
  try {
    const orders = loadOrders();
    const filtered = orders.filter(o => o.id !== id);
    saveOrders(filtered);

    // attempt RTDB removal (best-effort)
    try {
      if (isRTDBReady() && window.firebase && firebase.database) {
        // RTDB structure used by saveOrders() was /orders/{id} => object keyed by id
        firebase.database().ref('orders/' + id).remove().catch(()=>{});
        // also remove signal
        firebase.database().ref('orderSignals/' + id).remove().catch(()=>{});
      }
    } catch (e) {}

    // cleanup local signals
    try { localStorage.removeItem('orderReady_' + id); } catch(e){}

    return true;
  } catch (e) {
    console.warn('deleteOrder failed', e);
    return false;
  }
}

/* Expose for dashboard compatibility (owner-dashboard.html expects these globals) */
window.saveOrders = saveOrders;
window.updateOrderStatus = updateOrderStatus;
window.deleteOrder = deleteOrder;

/* ========== REALTIME LISTENER FOR OWNER DASHBOARD ========== */

function startRealtimeOrderListener() {
    try {
        if (!window.firebase || !firebase.database) {
            console.warn("Firebase RTDB not ready");
            return;
        }

        const ordersRef = firebase.database().ref("orders");

        ordersRef.on("value", (snapshot) => {
            const data = snapshot.val() || {};
            const orders = Object.keys(data).map(id => data[id]);

            // simpan ke local cache
            saveOrders(orders);

            // render ulang UI dashboard
            if (typeof renderOwnerListUI === "function") {
                renderOwnerListUI(orders);
            }
        });

        console.log("Realtime listener aktif.");
    } catch (e) {
        console.warn("Gagal start realtime listener", e);
    }
}

window.startRealtimeOrderListener = startRealtimeOrderListener;