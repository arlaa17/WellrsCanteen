// ==========================
// OWNER.JS — FIXED & STABLE
// ==========================
// Versi lengkap, aman, tanpa menghapus fitur bawaan kamu
// Firebase menggunakan window.fb (dari firebase.js)
// Semua error infinite loop, stack overflow, dan undefined firebase diperbaiki


// =======================================================
// 1. SAFE CHECK — memastikan Firebase siap sebelum dipakai
// =======================================================
function isFirebaseAvailable() {
    return !!(window.fb && window.fb.db);
}


// =======================================================
// 2. Tunggu Firebase siap (hindari error saat page load)
// =======================================================
async function waitForFirebase() {
    let attempts = 0;
    while (!isFirebaseAvailable()) {
        await new Promise((res) => setTimeout(res, 150));
        attempts++;
        if (attempts > 40) {
            console.error("ERROR: Firebase tidak siap setelah 6 detik");
            throw new Error("Firebase gagal load");
        }
    }
}


// =======================================================
// 3. Ketika halaman siap → tunggu Firebase → jalankan sistem
// =======================================================
document.addEventListener("DOMContentLoaded", async () => {
    try {
        await waitForFirebase();
        console.log("Firebase siap untuk OWNER");

        initOwnerSystem();
    } catch (err) {
        console.error("Owner system gagal dijalankan:", err);
    }
});


// =======================================================
// 4. Init sistem owner
// =======================================================
function initOwnerSystem() {
    loadOwners();       // ambil daftar owner
    loadOrdersRealtime(); // realtime pesanan
}


// =======================================================
// 5. Ambil daftar owner dari Firebase
// =======================================================
async function loadOwners() {
    const db = window.fb.db;
    const ownersRef = window.fb.ref(db, "owners");

    const snapshot = await window.fb.get(ownersRef);
    const data = snapshot.val() || {};

    renderOwnerList(data);
    return data;
}


// =======================================================
// 6. Render daftar owner ke tabel
// =======================================================
function renderOwnerList(owners) {
    const table = document.getElementById("ownerTable");
    if (!table) return;

    table.innerHTML = "";

    Object.keys(owners).forEach((ownerId) => {
        const item = owners[ownerId];

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${item.username}</td>
            <td>${item.password}</td>
            <td><button class="delete-btn" onclick="deleteOwner('${ownerId}')">Hapus</button></td>
        `;
        table.appendChild(row);
    });
}


// =======================================================
// 7. Tambah owner baru
// =======================================================
async function addOwner() {
    const username = document.getElementById("newOwnerUsername").value.trim();
    const password = document.getElementById("newOwnerPassword").value.trim();
    const msg = document.getElementById("ownerMsg");

    if (!username || !password) {
        msg.textContent = "Isi semua data!";
        msg.style.color = "red";
        return;
    }

    const db = window.fb.db;
    const ownersRef = window.fb.ref(db, "owners");

    await window.fb.push(ownersRef, { username, password });

    msg.textContent = "Owner berhasil ditambahkan!";
    msg.style.color = "green";

    document.getElementById("newOwnerUsername").value = "";
    document.getElementById("newOwnerPassword").value = "";

    loadOwners();
}


// =======================================================
// 8. Hapus owner
// =======================================================
async function deleteOwner(id) {
    const db = window.fb.db;
    const refPath = window.fb.ref(db, `owners/${id}`);

    await window.fb.remove(refPath);
    loadOwners();
}


// =======================================================
// 9. LOGIN OWNER
// =======================================================
async function ownerLogin() {
    const username = document.getElementById("ownerUsername").value.trim();
    const password = document.getElementById("ownerPassword").value.trim();
    const msg = document.getElementById("ownerLoginMsg");

    try {
        await waitForFirebase();
        const owners = await loadOwners();

        let valid = false;
        Object.values(owners).forEach((o) => {
            if (o.username === username && o.password === password) {
                valid = true;
            }
        });

        if (!valid) {
            msg.textContent = "Username atau password salah!";
            msg.style.color = "red";
            return;
        }

        // simpan session
        localStorage.setItem("isOwner", "true");

        window.location.href = "owner-dashboard.html";
    }
    catch (err) {
        console.error("Login error:", err);
        msg.textContent = "Terjadi kesalahan.";
        msg.style.color = "red";
    }
}


// =======================================================
// 10. Load pesanan realtime di owner dashboard
// =======================================================
function loadOrdersRealtime() {
    const db = window.fb.db;
    const ordersRef = window.fb.ref(db, "orders");

    window.fb.onValue(ordersRef, (snapshot) => {
        const data = snapshot.val() || {};
        renderOrders(data);
    });
}


// =======================================================
// 11. Render pesanan
// =======================================================
function renderOrders(orders) {
    const table = document.getElementById("orderTableBody");
    if (!table) return;

    table.innerHTML = "";

    Object.keys(orders).forEach((id) => {
        const order = orders[id];

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${order.name}</td>
            <td>${order.total}</td>
            <td>${order.payment}</td>
            <td>${order.status || "Menunggu"}</td>
            <td>
                <button onclick="updateOrderStatus('${id}', 'diproses')">Diproses</button>
                <button onclick="updateOrderStatus('${id}', 'siap')">Siap</button>
                <button onclick="updateOrderStatus('${id}', 'selesai')">Selesai</button>
            </td>
        `;

        table.appendChild(row);
    });
}


// =======================================================
// 12. Update status pesanan
// =======================================================
async function updateOrderStatus(id, status) {
    const db = window.fb.db;
    const refPath = window.fb.ref(db, `orders/${id}/status`);

    await window.fb.set(refPath, status);

    console.log(`Order ${id} → ${status}`);
}


// =======================================================
// END OF OWNER.JS
// =======================================================
