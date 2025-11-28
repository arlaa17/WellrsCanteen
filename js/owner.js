/* =======================
   OWNER SYSTEM (AMAN)
   ======================= */

   if (o.status === "process") {
    o.status = "done";

    // 🔔 beri sinyal ke customer
    localStorage.setItem("orderReady_" + o.id, "yes");
}


// Load owners safely
function loadOwners() {
    let owners = localStorage.getItem("owners");
    if (!owners) {
        // Jika belum ada, buat default owner
        owners = JSON.stringify([{ username: "stockwise", password: "ferrari" }]);
        localStorage.setItem("owners", owners);
    }
    return JSON.parse(owners);
}

// Save owners safely
function saveOwners(list) {
    localStorage.setItem("owners", JSON.stringify(list));
}

/* =======================
   LOGIN OWNER
   ======================= */

function ownerLogin() {
    const u = document.getElementById("ownerUsername").value.trim();
    const p = document.getElementById("ownerPassword").value.trim();

    const owners = loadOwners();
    const found = owners.find(o => o.username === u && o.password === p);

    if (!found) {
        alert("Username atau password salah.");
        return;
    }

    // Simpan sesi login
    sessionStorage.setItem("ownerAuth", u);

    // Pindah ke dashboard
    location.href = "owner-dashboard.html";
}

/* =======================
   ADD OWNER (HANYA STOCKWISE)
   ======================= */

function addOwner(username, password) {
    const auth = sessionStorage.getItem("ownerAuth");

    // Hanya stockwise boleh tambah owner
    if (auth !== "stockwise") {
        alert("Hanya owner utama yang bisa menambah admin.");
        return false;
    }

    let owners = loadOwners();

    // Cek duplikasi
    if (owners.some(o => o.username === username)) {
        return false;
    }

    owners.push({ username, password });
    saveOwners(owners);
    return true;
}

/* =======================
   DELETE OWNER (HANYA STOCKWISE)
   ======================= */

function deleteOwner(username) {
    const auth = sessionStorage.getItem("ownerAuth");

    // Tidak boleh hapus stockwise
    if (username === "stockwise") {
        alert("Owner utama tidak dapat dihapus.");
        return;
    }

    // Hanya stockwise boleh menghapus owner
    if (auth !== "stockwise") {
        alert("Hanya owner utama yang bisa menghapus admin.");
        return;
    }

    let owners = loadOwners();
    owners = owners.filter(o => o.username !== username);
    saveOwners(owners);

    renderOwnerList();
}

/* =======================
   RENDER OWNER LIST
   ======================= */

function renderOwnerList() {
    const table = document.getElementById("ownerTable");
    const auth = sessionStorage.getItem("ownerAuth");

    const owners = loadOwners();
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

/* =======================
   TAMBAH OWNER BUTTON HANDLER
   ======================= */

document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("addOwner");
    if (!btn) return;

    btn.addEventListener("click", () => {
        const u = document.getElementById("newOwnerUsername").value.trim();
        const p = document.getElementById("newOwnerPassword").value.trim();
        const msg = document.getElementById("ownerMsg");

        msg.textContent = "";

        if (!u || !p) {
            msg.textContent = "Isi username & password.";
            return;
        }

        const ok = addOwner(u, p);
        if (!ok) {
            msg.textContent = "Username sudah digunakan atau anda tidak memiliki akses.";
            return;
        }

        msg.textContent = "Owner berhasil ditambahkan!";
        document.getElementById("newOwnerUsername").value = "";
        document.getElementById("newOwnerPassword").value = "";

        renderOwnerList();
    });
});

/* =======================
   ORDER SYSTEM
   ======================= */

// Load orders
function loadOrders() {
    return JSON.parse(localStorage.getItem("orders")) || [];
}

// Save orders
function saveOrders(list) {
    localStorage.setItem("orders", JSON.stringify(list));
}

// Render orders (dipanggil di owner-dashboard.html)
function renderOrders() {
    const orders = loadOrders();
    const table = document.getElementById("orderTableBody");

    if (!table) return;

    table.innerHTML = "";

    orders.forEach(o => {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${o.id}</td>
            <td>${o.name}</td>
            <td>${o.items.map(i => `${i.name} × ${i.qty}`).join("<br>")}</td>
            <td>Rp ${o.total.toLocaleString()}</td>
            <td>${new Date(o.createdAt).toLocaleString()}</td>
            <td>${o.status || "new"}</td>
            <td>
                <button class="btn small" onclick='viewOrder(${JSON.stringify(o)})'>Detail</button>
            </td>
              <button class="btn small" onclick='viewOrder(${JSON.stringify(o)})'>Detail</button>
              ${o.status !== "done" ? 
             `<button class="btn small" onclick="updateOrderStatus('${o.id}')">Next</button>` 
             : ""
            }
        `;

        table.appendChild(row);
    });
}

function updateOrderStatus(orderId) {
    let orders = loadOrders();

    orders = orders.map(o => {
        if (o.id === orderId) {
            if (o.status === "new") {
                o.status = "process";
            } else if (o.status === "process") {
                o.status = "done";
            }
        }
        return o;
    });

    saveOrders(orders);
    renderOrders();
}

function deleteOrder(orderId) {
    let orders = loadOrders();

    // hapus order berdasarkan ID
    orders = orders.filter(o => o.id !== orderId);

    saveOrders(orders);
    renderOrders();
}
