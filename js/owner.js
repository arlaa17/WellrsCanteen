/* ================================
   OWNER.JS — FINAL FIXED VERSION
   ================================ */

/* Helpers */
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

/* Normalize owners list */
function normalizeOwners(obj) {
    if (!obj) return [];
    if (Array.isArray(obj)) return obj.filter(Boolean);
    if (typeof obj === "object") {
        return Object.keys(obj).map(k => {
            const v = obj[k];
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

/* Load owners */
async function loadOwners() {
    if (isRTDBReady()) {
        try {
            const snap = await firebase.database().ref("owners").get();
            const val = snap.exists() ? snap.val() : null;
            const arr = normalizeOwners(val);
            if (arr.length > 0) return arr;
        } catch (e) {
            console.warn("RTDB read failed:", e);
        }
    }

    try {
        const raw = localStorage.getItem("owners");
        if (!raw) {
            return [{ username: "stockwise", password: "ferrari", name: "Wellrs Admin" }];
        }
        return normalizeOwners(JSON.parse(raw));
    } catch (e) {
        return [{ username: "stockwise", password: "ferrari", name: "Wellrs Admin" }];
    }
}

/* Synchronous load */
function loadOwnersSync() {
    try {
        const raw = localStorage.getItem("owners");
        if (!raw) return [{ username: "stockwise", password: "ferrari", name: "Wellrs Admin" }];
        return normalizeOwners(JSON.parse(raw));
    } catch (e) {
        return [{ username: "stockwise", password: "ferrari", name: "Wellrs Admin" }];
    }
}

/* Save owners */
function saveOwnersToLocal(ownersArray) {
    try {
        localStorage.setItem("owners", JSON.stringify(ownersArray));
    } catch (e) { console.warn(e); }
}

/* Add owner */
function addOwnerSync(u, p, n = "") {
    const current = loadOwnersSync();
    if (current.some(x => x.username === u)) return false;
    current.push({ username: u, password: p, name: n });
    saveOwnersToLocal(current);

    if (isRTDBReady()) {
        firebase.database().ref("owners").push({ username: u, password: p, name: n });
    }

    return true;
}

/* Delete owner */
function deleteOwnerSync(u) {
    if (!u || u === "stockwise") return false;

    const owners = loadOwnersSync().filter(o => o.username !== u);
    saveOwnersToLocal(owners);

    if (isRTDBReady()) {
        firebase.database().ref("owners").get().then(snap => {
            const val = snap.val() || {};
            const key = Object.keys(val).find(k => val[k].username === u);
            if (key) firebase.database().ref("owners/" + key).remove();
        });
    }

    return true;
}

/* Owner login */
async function ownerLogin() {
    const u = document.getElementById("ownerUsername").value.trim();
    const p = document.getElementById("ownerPassword").value.trim();

    let owners = [];
    if (isRTDBReady()) {
        try {
            const snap = await firebase.database().ref("owners").get();
            owners = normalizeOwners(snap.val());
        } catch {}
    }

    if (!owners.length) owners = loadOwnersSync();

    const found = owners.find(o => o.username === u && o.password === p);
    if (!found) return alert("Username atau Password salah!");

    sessionStorage.setItem("ownerAuth", found.username);
    localStorage.setItem("owner", JSON.stringify(found));
    window.location.href = "owner-dashboard.html";
}

/* Orders */
function loadOrders() {
    try {
        return JSON.parse(localStorage.getItem("orders")) || [];
    } catch { return []; }
}

function saveOrdersLocal(orders) {
    try { localStorage.setItem("orders", JSON.stringify(orders)); }
    catch {}
}

/* Update order status */
function updateOrderStatus(id, status) {
    const orders = loadOrders();
    const idx = orders.findIndex(o => o.id === id);
    if (idx === -1) return false;

    orders[idx].status = status;
    orders[idx].updatedAt = new Date().toISOString();

    saveOrdersLocal(orders);

    if (isRTDBReady()) {
        firebase.database().ref("orders/" + id).set(orders[idx]);
    }

    return true;
}

/* Delete order */
function deleteOrder(id) {
    const orders = loadOrders().filter(o => o.id !== id);
    saveOrdersLocal(orders);

    if (isRTDBReady()) {
        firebase.database().ref("orders/" + id).remove();
        firebase.database().ref("orderSignals/" + id).remove();
    }

    return true;
}

/* ================================
   REALTIME LISTENER — 100% SAFE
   ================================ */

function startRealtimeOrderListener() {
    try {
        if (!window.firebase || !firebase.database) {
            console.warn("Firebase RTDB not ready");
            return;
        }

        const ordersRef = firebase.database().ref("orders");

        ordersRef.on("value", snap => {
            const data = snap.val() || {};
            const arr = Object.keys(data).map(id => data[id]);

            // hanya simpan local (tidak overwrite Firebase)
            saveOrdersLocal(arr);

            // render UI
            if (typeof renderOwnerListUI === "function") {
                renderOwnerListUI(arr);
            }
        });

        console.log("Realtime listener aktif.");
    } catch (e) {
        console.warn("Realtime error:", e);
    }
}

/* Expose */
window.loadOwners = loadOwners;
window.loadOwnersSync = loadOwnersSync;
window.addOwner = addOwnerSync;
window.deleteOwner = deleteOwnerSync;
window.ownerLogin = ownerLogin;
window.loadOrders = loadOrders;
window.updateOrderStatus = updateOrderStatus;
window.deleteOrder = deleteOrder;
window.startRealtimeOrderListener = startRealtimeOrderListener;
