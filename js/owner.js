// js/owner.js (fixed to use window.fb helpers, preserved behavior)

// small helpers (do not redeclare if exist)
const _getDeviceId = window.getDeviceId || ( () => {
  let id = localStorage.getItem("wc_deviceId");
  if (!id) {
    id = "dev-" + Date.now().toString(36) + "-" + Math.floor(Math.random()*10000);
    localStorage.setItem("wc_deviceId", id);
  }
  return id;
});
const _isFirebaseAvailable = window.isFirebaseAvailable || (() => !!(window.fb && window.fb.db));

// use these inside functions
function getDeviceId() { return _getDeviceId(); }
function isFirebaseAvailable() { return _isFirebaseAvailable(); }

/* ===================== OWNERS ===================== */

async function loadOwners() {
  if (isFirebaseAvailable()) {
    try {
      const snap = await window.fb.get(window.fb.ref(window.fb.db, "owners"));
      const val = (snap && typeof snap.exists === "function") ? (snap.exists() ? snap.val() : null) : (snap || null);
      if (!val) {
        const defaultOwner = { stockwise: { username: "stockwise", password: "ferrari", role: "admin", createdAt: Date.now() } };
        await window.fb.set(window.fb.ref(window.fb.db, "owners"), defaultOwner);
        return Object.values(defaultOwner);
      }
      return Object.keys(val).map(k => Object.assign({}, val[k], { _key: k }));
    } catch (e) {
      console.warn("FB loadOwners failed, fallback localStorage", e);
    }
  }

  let owners = localStorage.getItem("owners");
  if (!owners) {
    owners = JSON.stringify([{ username: "stockwise", password: "ferrari", role: "admin", createdAt: Date.now() }]);
    localStorage.setItem("owners", owners);
  }
  return JSON.parse(owners);
}

async function saveOwners(list) {
  if (isFirebaseAvailable()) {
    const obj = {};
    list.forEach(o => obj[o.username] = o);
    try {
      await window.fb.set(window.fb.ref(window.fb.db, "owners"), obj);
      return;
    } catch (e) {
      console.warn("FB saveOwners failed, fallback localStorage", e);
    }
  }
  localStorage.setItem("owners", JSON.stringify(list));
}

/* LOGIN */
async function ownerLogin() {
  const u = (document.getElementById("ownerUsername") || {}).value?.trim() || "";
  const p = (document.getElementById("ownerPassword") || {}).value?.trim() || "";
  const owners = await loadOwners();
  const found = owners.find(o => o.username === u && o.password === p);
  if (!found) {
    alert("Username atau password salah.");
    return;
  }
  sessionStorage.setItem("ownerAuth", u);
  location.href = "owner-dashboard.html";
}

/* ADD / DELETE OWNER */
async function addOwner(username, password) {
  const auth = sessionStorage.getItem("ownerAuth");
  if (auth !== "stockwise") {
    alert("Hanya owner utama yang bisa menambah admin.");
    return false;
  }
  const owners = await loadOwners();
  if (owners.some(o => o.username === username)) return false;
  const newOwner = { username, password, role: "owner", createdAt: Date.now() };
  if (isFirebaseAvailable()) {
    await window.fb.set(window.fb.ref(window.fb.db, `owners/${username}`), newOwner);
    return true;
  }
  owners.push(newOwner);
  saveOwners(owners);
  return true;
}

async function deleteOwner(username) {
  const auth = sessionStorage.getItem("ownerAuth");
  if (username === "stockwise") {
    alert("Owner utama tidak dapat dihapus.");
    return;
  }
  if (auth !== "stockwise") {
    alert("Hanya owner utama yang bisa menghapus admin.");
    return;
  }
  if (isFirebaseAvailable()) {
    await window.fb.remove(window.fb.ref(window.fb.db, `owners/${username}`));
    renderOwnerList();
    return;
  }
  let owners = await loadOwners();
  owners = owners.filter(o => o.username !== username);
  saveOwners(owners);
  renderOwnerList();
}

/* RENDER OWNER LIST */
async function renderOwnerList() {
  const table = document.getElementById("ownerTable");
  if (!table) return;
  const auth = sessionStorage.getItem("ownerAuth");
  const owners = await loadOwners();
  table.innerHTML = "";
  owners.forEach(o => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${o.username}</td>
      <td>${o.username === "stockwise" ? "-" : o.password}</td>
      <td>
        ${auth === "stockwise" && o.username !== "stockwise"
          ? `<button class="btn small danger" onclick="deleteOwner('${o.username}')">Hapus</button>`
          : "-"}
      </td>
    `;
    table.appendChild(row);
  });
}

/* INIT add owner button (if exists) */
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("addOwner");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    const u = (document.getElementById("newOwnerUsername")||{}).value?.trim() || "";
    const p = (document.getElementById("newOwnerPassword")||{}).value?.trim() || "";
    const msg = document.getElementById("ownerMsg");
    if (msg) msg.textContent = "";
    if (!u || !p) {
      if (msg) msg.textContent = "Isi username & password.";
      return;
    }
    const ok = await addOwner(u,p);
    if (!ok) {
      if (msg) msg.textContent = "Username sudah digunakan atau anda tidak memiliki akses.";
      return;
    }
    if (msg) msg.textContent = "Owner berhasil ditambahkan!";
    (document.getElementById("newOwnerUsername")||{}).value = "";
    (document.getElementById("newOwnerPassword")||{}).value = "";
    await renderOwnerList();
  });
});

/* ================= ORDERS (same logic, using window.fb) ================= */

async function loadOrders() {
  if (isFirebaseAvailable()) {
    try {
      const snap = await window.fb.get(window.fb.ref(window.fb.db, "orders"));
      const val = (snap && typeof snap.exists === "function") ? (snap.exists() ? snap.val() : null) : (snap || null);
      if (!val) return [];
      return Object.keys(val).map(k => val[k]).sort((a,b) => (b.createdAt||0) - (a.createdAt||0));
    } catch (e) {
      console.warn("FB loadOrders failed, fallback localStorage", e);
    }
  }
  return JSON.parse(localStorage.getItem("orders")) || [];
}

async function saveOrders(list) {
  if (isFirebaseAvailable()) {
    const obj = {};
    list.forEach(o => obj[o.id] = o);
    await window.fb.set(window.fb.ref(window.fb.db, "orders"), obj);
    return;
  }
  localStorage.setItem("orders", JSON.stringify(list));
}

async function renderOrders() {
  const orders = await loadOrders();
  const table = document.getElementById("orderTableBody");
  if (!table) return;
  table.innerHTML = "";
  orders.forEach(o => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${o.id}</td>
      <td>${o.name}</td>
      <td>${o.items.map(i => `${i.name} × ${i.qty}`).join("<br>")}</td>
      <td>Rp ${Number(o.total || 0).toLocaleString()}</td>
      <td>${new Date(o.createdAt).toLocaleString()}</td>
      <td>${o.status || "new"}</td>
      <td>
        <button class="btn small" onclick='viewOrder(${JSON.stringify(o)})'>Detail</button>
        ${o.status !== "done" ? `<button class="btn small" onclick="updateOrderStatus('${o.id}')">Next</button>` : ""}
        <button class="btn small danger" onclick="deleteOrder('${o.id}')">Hapus</button>
      </td>
    `;
    table.appendChild(row);
  });
}

if (isFirebaseAvailable()) {
  try {
    window.fb.onValue(window.fb.ref(window.fb.db, "orders"), () => renderOrders());
  } catch (e) { console.warn("realtime orders listener setup failed", e); }
}

async function updateOrderStatus(orderId) {
  const orders = await loadOrders();
  const updated = orders.map(o => {
    if (o.id === orderId) {
      if (o.status === "new") o.status = "process";
      else if (o.status === "process") o.status = "done";
    }
    return o;
  });
  await saveOrders(updated);
  const target = updated.find(x => x.id === orderId);
  if (target && target.status === "done") {
    if (isFirebaseAvailable()) {
      await window.fb.set(window.fb.ref(window.fb.db, `orderSignals/${orderId}`), "yes");
    } else {
      localStorage.setItem("orderReady_" + orderId, "yes");
    }
  }
  renderOrders();
}

async function deleteOrder(orderId) {
  if (isFirebaseAvailable()) {
    await window.fb.remove(window.fb.ref(window.fb.db, `orders/${orderId}`));
    return renderOrders();
  }
  let orders = JSON.parse(localStorage.getItem("orders")) || [];
  orders = orders.filter(o => o.id !== orderId);
  localStorage.setItem("orders", JSON.stringify(orders));
  renderOrders();
}

/* expose for console/html */
window.renderOwnerList = renderOwnerList;
window.renderOrders = renderOrders;
window.ownerLogin = ownerLogin;
window.addOwner = addOwner;
window.deleteOwner = deleteOwner;
window.updateOrderStatus = updateOrderStatus;
window.deleteOrder = deleteOrder;