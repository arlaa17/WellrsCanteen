/* OWNER + ORDER SYSTEM (Firebase-enabled, fallback localStorage) */

/* -------------------------
   Utilities: deviceId + isFirebaseAvailable
   ------------------------- */
function getDeviceId() {
  let id = localStorage.getItem("wc_deviceId");
  if (!id) {
    id = "dev-" + Date.now().toString(36) + "-" + Math.floor(Math.random() * 10000);
    localStorage.setItem("wc_deviceId", id);
  }
  return id;
}

function isFirebaseAvailable() {
  return window.fb && window.fb.db && window.fb.ref;
}

/* =======================
   OWNERS (DB: /owners/)
   ======================= */

async function loadOwners() {
  if (isFirebaseAvailable()) {
    try {
      const snap = await window.fb.get(window.fb.ref(window.fb.db, "owners"));
      const val = snap.exists() ? snap.val() : null;
      if (!val) {
        // make default owner
        const defaultOwner = { stockwise: { username: "stockwise", password: "ferrari", role: "admin", createdAt: Date.now() } };
        await window.fb.set(window.fb.ref(window.fb.db, "owners"), defaultOwner);
        return Object.values(defaultOwner);
      }
      // val is object keyed by ownerId or username; normalize to array
      return Object.keys(val).map(k => Object.assign({}, val[k], { _key: k }));
    } catch (e) {
      console.warn("FB loadOwners failed, fallback localStorage", e);
    }
  }

  // fallback localStorage (legacy)
  let owners = localStorage.getItem("owners");
  if (!owners) {
    owners = JSON.stringify([{ username: "stockwise", password: "ferrari", role: "admin", createdAt: Date.now() }]);
    localStorage.setItem("owners", owners);
  }
  return JSON.parse(owners);
}

async function saveOwners(list) {
  if (isFirebaseAvailable()) {
    // convert array -> object keyed by username
    const obj = {};
    list.forEach(o => {
      obj[o.username] = o;
    });
    try {
      await window.fb.set(window.fb.ref(window.fb.db, "owners"), obj);
      return;
    } catch (e) {
      console.warn("FB saveOwners failed, fallback localStorage", e);
    }
  }

  localStorage.setItem("owners", JSON.stringify(list));
}

/* ========== LOGIN ========== */
async function ownerLogin() {
  const u = document.getElementById("ownerUsername").value.trim();
  const p = document.getElementById("ownerPassword").value.trim();

  const owners = await loadOwners();
  const found = owners.find(o => o.username === u && o.password === p);

  if (!found) {
    alert("Username atau password salah.");
    return;
  }

  sessionStorage.setItem("ownerAuth", u);
  location.href = "owner-dashboard.html";
}

/* ========== ADD / DELETE OWNER ========== */
async function addOwner(username, password) {
  const auth = sessionStorage.getItem("ownerAuth");
  if (auth !== "stockwise") {
    alert("Hanya owner utama yang bisa menambah admin.");
    return false;
  }
  const owners = await loadOwners();
  if (owners.some(o => o.username === username)) return false;

  const newOwner = { username, password, role: "owner", createdAt: Date.now() };

  // write to DB if available
  if (isFirebaseAvailable()) {
    // write under owners/{username}
    await window.fb.set(window.fb.ref(window.fb.db, `owners/${username}`), newOwner);
    return true;
  }

  // fallback local
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

  let owners = loadOwners();
  owners = owners.filter(o => o.username !== username);
  saveOwners(owners);
  renderOwnerList();
}

/* ========== RENDER OWNER LIST ========== */
async function renderOwnerList() {
  const table = document.getElementById("ownerTable");
  const auth = sessionStorage.getItem("ownerAuth");
  if (!table) return;

  const owners = await loadOwners();
  table.innerHTML = "";

  owners.forEach(o => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${o.username}</td>
      <td>${o.username === "stockwise" ? "-" : o.password}</td>
      <td>
        ${
          auth === "stockwise" && o.username !== "stockwise"
            ? `<button class="btn small danger" onclick="deleteOwner('${o.username}')">Hapus</button>`
            : "-"
        }
      </td>
    `;
    table.appendChild(row);
  });
}

/* init add owner button */
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("addOwner");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    const u = document.getElementById("newOwnerUsername").value.trim();
    const p = document.getElementById("newOwnerPassword").value.trim();
    const msg = document.getElementById("ownerMsg");
    msg.textContent = "";
    if (!u || !p) {
      msg.textContent = "Isi username & password.";
      return;
    }
    const ok = await addOwner(u, p);
    if (!ok) {
      msg.textContent = "Username sudah digunakan atau anda tidak memiliki akses.";
      return;
    }
    msg.textContent = "Owner berhasil ditambahkan!";
    document.getElementById("newOwnerUsername").value = "";
    document.getElementById("newOwnerPassword").value = "";
    await renderOwnerList();
  });
});

/* =======================
   ORDERS (DB: /orders/) 
   - renderOrders jadi realtime jika Firebase aktif
   ======================= */

async function loadOrders() {
  if (isFirebaseAvailable()) {
    try {
      const snap = await window.fb.get(window.fb.ref(window.fb.db, "orders"));
      if (!snap.exists()) return [];
      const val = snap.val();
      // val is object keyed by orderId; convert to array sorted by createdAt desc
      return Object.keys(val).map(k => val[k]).sort((a,b)=> (b.createdAt||0) - (a.createdAt||0));
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

/* Realtime listener untuk orders jika fb tersedia */
if (isFirebaseAvailable()) {
  // set up realtime listener
  window.fb.onValue(window.fb.ref(window.fb.db, "orders"), (snap) => {
    // re-render when changed
    renderOrders();
  }, (err) => {
    console.warn("Realtime orders listener error", err);
  });
}

async function updateOrderStatus(orderId) {
  // load orders, modify, save
  const orders = await loadOrders();
  const updated = orders.map(o => {
    if (o.id === orderId) {
      if (o.status === "new") o.status = "process";
      else if (o.status === "process") o.status = "done";
    }
    return o;
  });
  await saveOrders(updated);

  // send ready signal if done
  const target = updated.find(x => x.id === orderId);
  if (target && target.status === "done") {
    // write a small signal path orderSignals/{orderId}: "yes"
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

/* expose for console / html buttons */
window.renderOwnerList = renderOwnerList;
window.renderOrders = renderOrders;
window.ownerLogin = ownerLogin;
window.addOwner = addOwner;
window.deleteOwner = deleteOwner;
window.updateOrderStatus = updateOrderStatus;
window.deleteOrder = deleteOrder;
