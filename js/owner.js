/* ===================================================================
   OWNER.JS FINAL CLEAN VERSION (SINGLE FILE) — Firebase RTDB + Dashboard
   =================================================================== */

// --- RTDB READY CHECK ---
function isRTDBReady() {
  return window.firebase && firebase.database;
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

// --- OWNERS HELPERS ---
function normalizeOwners(obj) {
  if (!obj) return [];

  if (Array.isArray(obj)) return obj;

  if (typeof obj === "object") {
    return Object.keys(obj)
      .map((k) => ({
        username: obj[k].username || k,
        password: obj[k].password,
        name: obj[k].name || "",
      }))
      .filter((o) => o.username);
  }

  return [];
}

async function loadOwners() {
  if (isRTDBReady()) {
    try {
      const snap = await firebase.database().ref("owners").get();
      const val = snap.exists() ? snap.val() : null;
      const list = normalizeOwners(val);
      if (list.length > 0) return list;
    } catch (e) {}
  }

  const raw = localStorage.getItem("owners");
  if (!raw)
    return [
      { username: "stockwise", password: "ferrari", name: "Wellrs Admin" },
    ];

  try {
    return JSON.parse(raw);
  } catch {
    return [
      { username: "stockwise", password: "ferrari", name: "Wellrs Admin" },
    ];
  }
}

async function addOwner(username, password, name = "") {
  const owners = await loadOwners();
  if (owners.some((o) => o.username === username)) return false;

  if (isRTDBReady()) {
    try {
      await firebase
        .database()
        .ref("owners")
        .push({ username, password, name });
      return true;
    } catch {}
  }

  owners.push({ username, password, name });
  localStorage.setItem("owners", JSON.stringify(owners));
  return true;
}

async function deleteOwner(user) {
  if (user === "stockwise") return false;

  if (isRTDBReady()) {
    try {
      const snap = await firebase.database().ref("owners").get();
      const val = snap.exists() ? snap.val() : {};
      const key = Object.keys(val).find((k) => val[k].username === user);
      if (key) {
        await firebase
          .database()
          .ref("owners/" + key)
          .remove();
        return true;
      }
    } catch {}
  }

  const owners = await loadOwners();
  const filtered = owners.filter((o) => o.username !== user);
  localStorage.setItem("owners", JSON.stringify(filtered));
  return true;
}

// --- LOGIN ---
async function ownerLogin() {
  const username = document.getElementById("ownerUsername").value.trim();
  const password = document.getElementById("ownerPassword").value.trim();

  try {
    const snap = await firebase.database().ref("owners").get();
    const data = snap.exists() ? snap.val() : null;

    // Normalisasi agar jadi array
    const owners = data ? Object.values(data) : [];

    const owner = owners.find(
      (o) => o.username === username && o.password === password
    );

    if (!owner) {
      alert("Username atau password salah!");
      return;
    }

    // Login sukses
    localStorage.setItem("owner", JSON.stringify(owner));
    window.location.href = "owner-dashboard.html";
  } catch (err) {
    console.error("Login error:", err);
    alert("Terjadi kesalahan saat login.");
  }
}

// --- RENDER OWNERS LIST ---
async function renderOwnerList() {
  const owners = await loadOwners();
  const list = document.getElementById("ownerList");
  if (!list) return;

  list.innerHTML = "";

  owners.forEach((o) => {
    const row = document.createElement("div");
    row.className = "owner-row";

    const name = document.createElement("div");
    name.className = "owner-name";
    name.textContent = o.username;

    const act = document.createElement("div");

    if (o.username !== "stockwise") {
      const btn = document.createElement("button");
      btn.className = "btn-ghost";
      btn.textContent = "Hapus";
      btn.onclick = async () => {
        if (!confirm(`Hapus owner ${o.username}?`)) return;
        await deleteOwner(o.username);
        renderOwnerList();
      };
      act.appendChild(btn);
    }

    row.appendChild(name);
    row.appendChild(act);
    list.appendChild(row);
  });
}

// --- ORDERS REALTIME ---
function renderOrders(data) {
  const tbody = document.querySelector("#ordersTable tbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  const keys = Object.keys(data).reverse();

  keys.forEach((k) => {
    const o = data[k];

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${k}</td>
      <td>${o.name || "-"}</td>
      <td>${
        Array.isArray(o.items)
          ? o.items.map((i) => `${i.name} × ${i.qty}`).join("<br>")
          : "-"
      }</td>
      <td>${o.note || "-"}</td>
      <td>${o.total ? "Rp " + o.total.toLocaleString() : "-"}</td>
      <td>${o.createdAt ? new Date(o.createdAt).toLocaleString() : "-"}</td>
      <td>${o.status || "-"}</td>
      <td>
        <button class="btn-ghost" onclick='viewOrder(${JSON.stringify(
          o
        )})'>Detail</button>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

function loadOrdersRealtime() {
  if (!isRTDBReady()) return;

  firebase
    .database()
    .ref("orders")
    .on("value", (snap) => {
      const val = snap.exists() ? snap.val() : {};
      renderOrders(val);
    });
}

// --- VIEW ORDER ---
function viewOrder(o) {
  const overlay = document.getElementById("orderOverlay");
  if (!overlay) return alert(JSON.stringify(o, null, 2));

  overlay.style.display = "block";
  overlay.querySelector("pre").textContent = JSON.stringify(o, null, 2);
}

// --- PAGE INIT ---
document.addEventListener("DOMContentLoaded", async () => {
  await waitForRTDB().catch(() => {});

  // AUTO-DETECT LOGIN BUTTON (tanpa id)
  if (document.getElementById("ownerUsername")) {
    const loginBtn =
      document.querySelector("#btnLogin") ||
      document.querySelector("button.loginbtn") ||
      document.querySelector("button.button-login") ||
      document.querySelector("button[type='submit']") ||
      document.querySelector("button");

    if (loginBtn) {
      loginBtn.addEventListener("click", (e) => {
        e.preventDefault();
        ownerLogin();
      });
    }
  }

  if (document.getElementById("ownerList")) {
    renderOwnerList();
    loadOrdersRealtime();
  }
});

// expose
window.ownerLogin = ownerLogin;
window.addOwner = addOwner;
window.deleteOwner = deleteOwner;
window.renderOwnerList = renderOwnerList;
window.loadOrdersRealtime = loadOrdersRealtime;
window.viewOrder = viewOrder;
