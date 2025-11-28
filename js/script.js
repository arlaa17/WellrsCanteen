
if ("Notification" in window) {
    if (Notification.permission === "default") {
        Notification.requestPermission();
    }
}

/* =========================
   NAVBAR HAMBURGER
========================= */
const navbarNav = document.querySelector(".navbar-nav");
const hamburger = document.getElementById("hamburger-menu");

hamburger.onclick = () => {
  navbarNav.classList.toggle("active");
};

document.addEventListener("click", (e) => {
  if (!hamburger.contains(e.target) && !navbarNav.contains(e.target)) {
    navbarNav.classList.remove("active");
  }
});

/* =========================
   FEATHER ICONS
========================= */
feather.replace();

/* =========================
   LIKE (HEART) TOGGLE
========================= */
document.querySelectorAll(".favorite").forEach((fav) => {
  fav.addEventListener("click", function (e) {
    e.stopPropagation();
    this.classList.toggle("liked");

    const card = this.closest(".menu-card");
    const name = card.querySelector(".menu-card-title").textContent;
    const price = card.querySelector(".menu-card-price").textContent;
    const img = card.querySelector("img").src;

    addToFavorite(name, price, img);
  });
});

/* =========================
   SEARCH BOX BEHAVIOR
========================= */
const searchToggle = document.getElementById("search");
const searchBox = document.getElementById("searchBox");
const clearSearch = document.getElementById("clearSearch");
const searchSubmit = document.getElementById("searchSubmit");
const searchInput = document.getElementById("searchInput");
const emptyMessage = document.getElementById("emptyMsg");

// buka tutup search box
searchToggle.addEventListener("click", function (e) {
  e.preventDefault();
  searchBox.classList.toggle("active");
  searchInput.focus();
});

// tombol X
clearSearch.addEventListener("click", () => {
  searchInput.value = "";
  doSearch();
  searchInput.focus();
});

// klik icon search
searchSubmit.addEventListener("click", function () {
  doSearch();
});

// tekan Enter
searchInput.addEventListener("keypress", function (e) {
  if (e.key === "Enter") {
    e.preventDefault();
    doSearch();
  }
});

// real-time search
searchInput.addEventListener("input", doSearch);

/* =========================
   SEARCH FUNCTION (FINAL)
========================= */
function doSearch() {
  const keyword = searchInput.value.toLowerCase().trim();
  const cards = [...document.querySelectorAll(".menu-card")];
  let results = [];

  cards.forEach((card) => {
    const title = card
      .querySelector(".menu-card-title")
      .textContent.toLowerCase();
    let score = 0;

    if (title === keyword) score = 3;
    else if (title.startsWith(keyword)) score = 2;
    else if (title.includes(keyword)) score = 1;

    if (score > 0) results.push({ card, score });
  });

  // Sort by relevansi
  results.sort((a, b) => b.score - a.score);

  // Reset semua dulu
  cards.forEach((card) => (card.style.display = "none"));

  // Tampilkan yang cocok
  results.forEach((item) => (item.card.style.display = "block"));

  // Scroll ke menu kalau ada input
  if (keyword.length > 0) {
    document.getElementById("menu").scrollIntoView({ behavior: "smooth" });
  }

  // Pesan tidak ditemukan
  if (results.length === 0 && keyword !== "") {
    emptyMessage.classList.add("show");
  } else {
    emptyMessage.classList.remove("show");
  }

  // Jika input kosong → tampilkan semua
  if (keyword.length === 0) {
    cards.forEach((card) => (card.style.display = "block"));
    emptyMessage.classList.remove("show");
  }
}

// hide search box ketika klik di luar
document.addEventListener("click", (e) => {
  if (!searchBox.contains(e.target) && !searchToggle.contains(e.target)) {
    searchBox.classList.remove("active");
  }
});

/* =========================
   BUY NOW → scroll ke order
========================= */
document.querySelectorAll(".btn-buy").forEach((btn) => {
  btn.addEventListener("click", () => {
    const card = btn.closest(".menu-card");
    if (!card) return;

    const nameEl = card.querySelector(".menu-card-title");
    const priceEl = card.querySelector(".menu-card-price");
    const imgEl = card.querySelector("img");

    const name = nameEl ? nameEl.textContent : "Item";
    const price = priceEl
      ? parseInt(priceEl.textContent.replace(/\D/g, ""))
      : 0;
    const imgSrc = imgEl ? imgEl.src : "";

    // 1. kosongkan cart
    cart = [];
    cartCount = 1;

    // 2. masukkan item ini
    cart.push({
      name,
      price,
      qty: 1,
      img: imgSrc,
    });

    // 3. simpan
    saveCart();
    updateBadge();
    renderCart();
    populateOrderSummary();

    // 4. tampilkan checkout
    document.getElementById("order").style.display = "block";
    document.getElementById("order").scrollIntoView({ behavior: "smooth" });
  });
});

/* =========================
   MINI CART + STORAGE + BOUNCE
========================= */

// restore cart from localStorage (if any)
let cart = JSON.parse(localStorage.getItem("cartItems")) || [];
// compute cartCount from cart (robust)
let cartCount = cart.reduce((sum, it) => sum + (it.qty || 0), 0);

// DOM refs
const miniCart = document.getElementById("miniCart");
const cartItems = document.getElementById("cartItems");
const cartTotal = document.getElementById("cartTotal");
const cartBadge = document.querySelector(".cart-badge");
const cartIconEl = document.getElementById("shopping-cart");

// save helper
function saveCart() {
  localStorage.setItem("cartItems", JSON.stringify(cart));
  localStorage.setItem("cartCount", cartCount);
}

// update badge
function updateBadge() {
  if (!cartBadge) return;
  cartBadge.textContent = cartCount;
  cartBadge.style.display = cartCount > 0 ? "inline-block" : "none";
}

// bounce feedback
function cartBounce() {
  if (!cartIconEl) return;
  cartIconEl.classList.add("bounce");
  // remove after animation (match CSS duration ~420ms)
  setTimeout(() => cartIconEl.classList.remove("bounce"), 450);
}

/* =========================
   FLY TO CART ANIMATION
========================= */

function animateFlyToCart(imageElement) {
  if (!imageElement) return;
  if (!cartIconEl) return;

  const imgRect = imageElement.getBoundingClientRect();
  const cartRect = cartIconEl.getBoundingClientRect();

  // clone image
  const flyImg = imageElement.cloneNode(true);
  flyImg.classList.add("fly-image");

  // set size & position explicitly
  flyImg.style.width = imgRect.width + "px";
  flyImg.style.height = imgRect.height + "px";
  flyImg.style.position = "fixed";
  flyImg.style.left = imgRect.left + "px";
  flyImg.style.top = imgRect.top + "px";

  document.body.appendChild(flyImg);

  requestAnimationFrame(() => {
    const dx =
      cartRect.left + cartRect.width / 2 - (imgRect.left + imgRect.width / 2);
    const dy =
      cartRect.top + cartRect.height / 2 - (imgRect.top + imgRect.height / 2);
    flyImg.style.transform = `translate(${dx}px, ${dy}px) scale(0.12)`;
    flyImg.style.opacity = "0";
  });

  setTimeout(() => flyImg.remove(), 800);
}

/* =========================
   CORE CART LOGIC
========================= */

function addToCart(name, price, imgSrc) {
  let product = cart.find((item) => item.name === name);

  if (product) {
    product.qty++;
  } else {
    cart.push({ name, price, qty: 1, img: imgSrc || "" });
  }

  cartCount++;
  saveCart();
  updateBadge();
  renderCart();
  cartBounce();
}

function changeQty(index, amount) {
  if (!cart[index]) return;

  cart[index].qty += amount;

  if (cart[index].qty <= 0) {
    // subtract the removed qty from cartCount, then remove item
    cartCount -= cart[index].qty + Math.abs(amount) === 0 ? 0 : 1; // fallback safe
    // simpler: recalc after
    cart.splice(index, 1);
  }

  // recalc total count robustly
  cartCount = cart.reduce((sum, it) => sum + (it.qty || 0), 0);

  saveCart();
  updateBadge();
  renderCart();
}

function deleteItem(index) {
  if (!cart[index]) return;
  cartCount -= cart[index].qty;
  cart.splice(index, 1);

  // recalc safe
  cartCount = cart.reduce((sum, it) => sum + (it.qty || 0), 0);

  saveCart();
  updateBadge();
  renderCart();
}

/* =========================
   RENDER CART (with subtotal per item)
========================= */

function renderCart() {
  cartItems.innerHTML = "";

  let totalPrice = 0;

  cart.forEach((item, index) => {
    const itemTotal = (item.price || 0) * (item.qty || 0);
    totalPrice += itemTotal;

    const div = document.createElement("div");
    div.classList.add("cart-item");

    div.innerHTML = `
      <div class="cart-item-left">
        <img src="${
          item.img || "img/placeholder.png"
        }" class="cart-item-img" alt="${item.name}">
        <div>
          <h4>${item.name}</h4>
          <p>Rp ${item.price.toLocaleString()}</p>
          <p style="font-size:13px;color:#666;margin-top:6px;">Subtotal: <strong>Rp ${itemTotal.toLocaleString()}</strong></p>
        </div>
      </div>

      <div class="cart-item-actions">
        <div class="qty-controls">
          <button class="qty-btn" onclick="changeQty(${index}, -1)">-</button>
          <span>${item.qty}</span>
          <button class="qty-btn" onclick="changeQty(${index}, 1)">+</button>
        </div>
        <button class="delete-btn" onclick="deleteItem(${index})">Hapus</button>
      </div>
    `;

    cartItems.appendChild(div);
  });

  cartTotal.textContent = "Rp " + totalPrice.toLocaleString();
}

/* =========================
   OPEN / CLOSE MINI CART
========================= */

if (cartIconEl) {
  cartIconEl.addEventListener("click", (e) => {
    e.preventDefault();
    miniCart.classList.add("active");
    renderCart();
  });
}

document.getElementById("closeCart").addEventListener("click", () => {
  miniCart.classList.remove("active");
});

// TUTUP MINI CART KETIKA KLIK DI LUAR
document.addEventListener("click", function (e) {
  const miniCart = document.getElementById("miniCart");
  const cartBtn = document.getElementById("shopping-cart");

  // Jika panel terbuka dan klik TIDAK di dalam panel dan TIDAK di tombol cart
  if (
    miniCart.classList.contains("active") &&
    !miniCart.contains(e.target) &&
    !cartBtn.contains(e.target)
  ) {
    miniCart.classList.remove("active");
  }
});

/* =========================
   INIT add-button handlers
========================= */

document.querySelectorAll(".btn-cart").forEach((btn) => {
  btn.addEventListener("click", () => {
    const card = btn.closest(".menu-card");
    if (!card) return;

    const nameEl = card.querySelector(".menu-card-title");
    const priceEl = card.querySelector(".menu-card-price");
    const imgEl = card.querySelector("img"); // your images don't have class .menu-img, use first img

    const name = nameEl ? nameEl.textContent : "Item";
    const price = priceEl
      ? parseInt(priceEl.textContent.replace(/\D/g, ""))
      : 0;
    const imgSrc = imgEl ? imgEl.src : "";

    // animate fly + add
    animateFlyToCart(imgEl);
    // add to cart (this saves and updates UI)
    addToCart(name, price, imgSrc);
  });
});

/* =========================
   INITIAL UI UPDATE (restore)
========================= */

updateBadge();
renderCart();

// Checkout button
document.getElementById("checkoutBtn").addEventListener("click", () => {
  populateOrderSummary();
  document.getElementById("miniCart").classList.remove("active");

  // scroll & show
  document.getElementById("order").style.display = "block";
  document.getElementById("order").scrollIntoView({ behavior: "smooth" });
});

document.getElementById("closeSuccess").addEventListener("click", () => {
  document.getElementById("order").style.display = "none";
});

document.querySelectorAll(".navbar-nav a").forEach((link) => {
  link.addEventListener("click", () => {
    document.getElementById("order").style.display = "none";
  });
});

/* ========== CHECKOUT: populate + submit ========== */

const orderSection = document.getElementById("order");
const orderSummary = document.getElementById("orderSummary");
const checkoutForm = document.getElementById("checkoutForm");
const confirmOrderBtn = document.getElementById("confirmOrder");
const cancelOrderBtn = document.getElementById("cancelOrder");
const orderSuccess = document.getElementById("orderSuccess");
const successMsg = document.getElementById("successMsg");
const etaText = document.getElementById("etaText");
const closeSuccess = document.getElementById("closeSuccess");
const bankInfo = document.getElementById("bankInfo");
const transferName = document.getElementById("transferName");

// helper: format
function formatRp(n) {
  return "Rp " + (n || 0).toLocaleString();
}

// build order summary from cart (reads localStorage)
function populateOrderSummary() {
  const cart = JSON.parse(localStorage.getItem("cartItems")) || [];
  orderSummary.innerHTML = "";

  if (!cart.length) {
    orderSummary.innerHTML =
      '<p class="muted">Keranjang kosong. Tambahkan item dulu.</p>';
    confirmOrderBtn.disabled = true;
    return;
  }

  let total = 0;
  cart.forEach((item) => {
    const itemTotal = (item.price || 0) * (item.qty || 0);
    total += itemTotal;

    const node = document.createElement("div");
    node.className = "order-item";
    node.innerHTML = `
      <div class="order-item-left">
        <img src="${
          item.img || "img/placeholder.png"
        }" class="order-item-img" alt="${item.name}">
        <div class="order-item-meta">
          <h4>${item.name}</h4>
          <p>${formatRp(item.price)} × ${item.qty}</p>
        </div>
      </div>
      <div class="order-item-right">
        <strong>${formatRp(itemTotal)}</strong>
      </div>
    `;
    orderSummary.appendChild(node);
  });

  const totalDiv = document.createElement("div");
  totalDiv.className = "order-total";
  totalDiv.innerHTML = `<span>Total Pesanan</span><span>${formatRp(
    total
  )}</span>`;
  orderSummary.appendChild(totalDiv);

  confirmOrderBtn.disabled = false;
}

// make sure populate when user goes to order section
// you might have a checkout button that scrolls to #order — call populateOrderSummary() then
document.getElementById("checkoutBtn")?.addEventListener("click", () => {
  // open miniCart closed then scroll to order
  populateOrderSummary();
  document.getElementById("miniCart")?.classList.remove("active");
  orderSection.scrollIntoView({ behavior: "smooth" });
});

// also populate on load so order page reflects current cart
populateOrderSummary();

// confirm submit
confirmOrderBtn.addEventListener("click", () => {
    const cart = JSON.parse(localStorage.getItem("cartItems")) || [];
    if (!cart.length) {
        alert("Keranjang kosong.");
        return;
    }

    // validate form
    const name = document.getElementById("custName").value.trim();
    const contact = document.getElementById("custContact").value.trim();
    const note = document.getElementById("custNote").value.trim();
    const payment = checkoutForm.payment.value;

    if (!name) return alert("Mohon isi nama pemesan.");
    if (!payment) return alert("Pilih metode pembayaran.");

    // formatting items
    const items = cart.map(i => ({
      name: i.name,
      qty: i.qty,
      price: i.price,
      img: i.img
    }));

    // local helper: tolerant lookup waktu masak (works even if waktuMasak not yet declared)
    function lookupTimePerItem(itemName) {
        const map = window.waktuMasak || {};
        const nameLower = (itemName || "").toLowerCase();

        // try exact match first
        if (map[itemName]) return map[itemName];

        // fuzzy includes match
        for (const key in map) {
            if (nameLower.includes(String(key).toLowerCase())) return map[key];
        }

        // fallback default
        return 5;
    }

    // compute ETA minutes based on items (robust even if waktuMasak is declared later)
    const etaMinutes = items.reduce((sum, it) => {
        const qty = it.qty || 1;
        return sum + lookupTimePerItem(it.name) * qty;
    }, 0);

    // build order in DASHBOARD FORMAT
    const order = {
        id: "ORD-" + Date.now(),
        name,
        contact,
        note,
        items,
        payment,
        total: items.reduce((s,i)=>s + i.price*i.qty, 0),
        createdAt: new Date().toISOString(),
        status: "new",
        // ETA fields
        eta: etaMinutes + " menit",
        etaTimestamp: Date.now() + (etaMinutes * 60 * 1000)
    };

    // save into localStorage orders (save AFTER order has etaTimestamp)
    const orders = JSON.parse(localStorage.getItem("orders")) || [];
    orders.unshift(order);
    localStorage.setItem("orders", JSON.stringify(orders));
    localStorage.setItem("myLastOrderId", order.id);

    // success UI (use etaMinutes variable)
    successMsg.textContent = `Pesanan #${order.id} diterima. Terima kasih ${name}!`;
    etaText.textContent = `Estimasi selesai: sekitar ${etaMinutes} menit.`;
    orderSuccess.style.display = "flex";

    // clear cart
    localStorage.removeItem("cartItems");
    localStorage.removeItem("cartCount");
    cart.length = 0;

    updateBadge();
    renderCart();
});

// cancel / close
cancelOrderBtn.addEventListener("click", () => {
  orderSection.style.display = "none";
  document.getElementById("menu").scrollIntoView({ behavior: "smooth" });
});

closeSuccess.addEventListener("click", () => {
  orderSuccess.style.display = "none";
  // optional: scroll to top or to menu
  document.getElementById("menu").scrollIntoView({ behavior: "smooth" });
});

const cashMethod = document.getElementById("cashMethod");
const transferMethod = document.getElementById("transferMethod");

const transferOptions = document.getElementById("transferOptions");
const bankMethod = document.getElementById("bankMethod");
const ewalletMethod = document.getElementById("ewalletMethod");

const bankDetail = document.getElementById("bankDetail");
const ewalletDetail = document.getElementById("ewalletDetail");

// Saat pilih CASH
cashMethod.addEventListener("change", () => {
    transferOptions.style.display = "none";
    bankDetail.style.display = "none";
    ewalletDetail.style.display = "none";
});

// Saat pilih TRANSFER
transferMethod.addEventListener("change", () => {
    transferOptions.style.display = "block";
    bankDetail.style.display = "none";
    ewalletDetail.style.display = "none";
});

// Saat pilih BANK
bankMethod.addEventListener("change", () => {
    bankDetail.style.display = "block";
    ewalletDetail.style.display = "none";
});

// Saat pilih EWALLET
ewalletMethod.addEventListener("change", () => {
    ewalletDetail.style.display = "block";
    bankDetail.style.display = "none";
});

/* ===== ORDER HISTORY MODAL (for user) - shown after success ===== */

(function () {
  // create modal DOM
  const histModal = document.createElement("div");
  histModal.className = "order-history-modal";
  histModal.id = "orderHistoryModal";
  histModal.innerHTML = `
    <div class="order-history-card">
      <button class="order-history-close" id="closeHistory">Tutup</button>
      <h3>Riwayat Pesanan</h3>
      <div class="order-history-list" id="orderHistoryList"></div>
    </div>
  `;
  document.body.appendChild(histModal);

  function renderHistoryList() {
    const list = document.getElementById("orderHistoryList");
    const orders = JSON.parse(localStorage.getItem("orders")) || [];
    list.innerHTML = "";
    if (!orders.length) {
      list.innerHTML = "<p>Belum ada riwayat pesanan.</p>";
      return;
    }
    orders.forEach((o) => {
      const div = document.createElement("div");
      div.className = "order-history-item";
      const items = o.items.map((i) => `${i.name} ×${i.qty}`).join(", ");
      div.innerHTML = `
        <div style="display:flex; gap:10px; align-items:center;">
          <div><img src="${
            o.items[0]?.img || "img/placeholder.png"
          }" alt=""></div>
          <div>
            <strong>${o.id}</strong><br/>
            ${o.name} • ${o.payment} • ${new Date(
        o.createdAt
      ).toLocaleString()}<br/>
            <small>${items}</small>
          </div>
        </div>
        <div style="text-align:right;">
          <div><strong>${"Rp " + (o.total || 0).toLocaleString()}</strong></div>
          <div style="margin-top:6px">${o.status || "waiting"}</div>
        </div>
      `;
      list.appendChild(div);
    });
  }

  document.getElementById("closeHistory").addEventListener("click", () => {
    histModal.style.display = "none";
  });

  // expose showHistory
  window.showOrderHistoryModal = function () {
    renderHistoryList();
    histModal.style.display = "flex";
  };
})();

/* ===== add "Lihat Riwayat" button to success overlay (if present) ===== */
(function () {
  const successEl = document.getElementById("orderSuccess");
  if (!successEl) return;

  // add button if not exists
  if (!document.getElementById("viewHistoryBtn")) {
    const btn = document.createElement("button");
    btn.id = "viewHistoryBtn";
    btn.className = "btn-muted";
    btn.style.marginLeft = "10px";
    btn.textContent = "Lihat Riwayat";
    btn.addEventListener("click", () => {
      // hide overlay then show modal
      successEl.style.display = "none";
      window.showOrderHistoryModal();
    });

    // append to success card actions
    const card = successEl.querySelector(".order-success-card");
    if (card) card.appendChild(btn);
  }
})();

/* =========================
   FAVORITE SYSTEM
========================= */

// Load existing favorite list
let favoriteList = JSON.parse(localStorage.getItem("favoriteItems")) || [];

// Navbar elements
const favoriteBtn = document.getElementById("favoriteBtn");
const favoriteCount = document.getElementById("favoriteCount");
const miniFavorite = document.getElementById("miniFavorite");
const favoriteItemsEl = document.getElementById("favoriteItems");
const closeFavorite = document.getElementById("closeFavorite");

// Update badge number
function updateFavoriteBadge() {
  favoriteCount.textContent = favoriteList.length;
  favoriteCount.style.display = favoriteList.length > 0 ? "flex" : "none";
}

updateFavoriteBadge();

function addToFavorite(name, price, imgSrc) {
  // Cek apakah sudah ada
  const exists = favoriteList.some(item => item.name === name);

  if (!exists) {
    favoriteList.push({ name, price, img: imgSrc });
    localStorage.setItem("favoriteItems", JSON.stringify(favoriteList));
    updateFavoriteBadge();
    renderFavoriteList();
  }
}

function renderFavoriteList() {
  favoriteItemsEl.innerHTML = "";

  if (favoriteList.length === 0) {
    favoriteItemsEl.innerHTML = "<p style='color:#444;'>Belum ada favorit.</p>";
    return;
  }

  favoriteList.forEach((item, index) => {
    const div = document.createElement("div");
    div.classList.add("fav-item");
    div.innerHTML = `
      <img src="${item.img}">
      <div>
        <h4>${item.name}</h4>
        <p>${item.price}</p>
      </div>
      <button class="fav-remove" onclick="removeFavorite(${index})">Hapus</button>
    `;

    favoriteItemsEl.appendChild(div);
  });
}
renderFavoriteList();

function removeFavorite(index) {
  favoriteList.splice(index, 1);
  localStorage.setItem("favoriteItems", JSON.stringify(favoriteList));
  updateFavoriteBadge();
  renderFavoriteList();
}

function toggleFavorite() {
  miniFavorite.classList.add("active");
}

favoriteBtn.addEventListener("click", (e) => {
  e.preventDefault();
  miniFavorite.classList.add("active");
});

closeFavorite.addEventListener("click", () => {
  miniFavorite.classList.remove("active");
});

// Klik luar → tutup
document.addEventListener("click", (e) => {
  if (!miniFavorite.contains(e.target) && !favoriteBtn.contains(e.target)) {
    miniFavorite.classList.remove("active");
  }
});

function animateFlyToFavorite(imgEl) {
  const favIcon = document.querySelector("#favoriteBtn i");

  if (!imgEl || !favIcon) return;

  const imgRect = imgEl.getBoundingClientRect();
  const iconRect = favIcon.getBoundingClientRect();

  const flyImg = imgEl.cloneNode(true);
  flyImg.classList.add("fly-image");

  flyImg.style.left = imgRect.left + "px";
  flyImg.style.top = imgRect.top + "px";
  flyImg.style.width = imgRect.width + "px";
  flyImg.style.height = imgRect.height + "px";

  document.body.appendChild(flyImg);

  requestAnimationFrame(() => {
    const dx = iconRect.left - imgRect.left;
    const dy = iconRect.top - imgRect.top;

    flyImg.style.transform = `translate(${dx}px, ${dy}px) scale(0.1)`;
    flyImg.style.opacity = "0";
  });

  setTimeout(() => flyImg.remove(), 800);
}

document.querySelectorAll(".favorite").forEach((fav) => {
  fav.addEventListener("click", function (e) {
    e.stopPropagation();

    this.classList.toggle("liked");

    const card = this.closest(".menu-card");
    const name = card.querySelector(".menu-card-title").textContent;
    const price = card.querySelector(".menu-card-price").textContent;
    const img = card.querySelector("img").src;

    animateFlyToFavorite(card.querySelector("img"));
    addToFavorite(name, price, img);
  });
});

// OPEN order popup
function showOrderStatus() {
  const overlay = document.getElementById("orderStatusOverlay");
  const bar = document.getElementById("os-progress-bar");
  const statusText = document.getElementById("os-status-text");
  const estimasi = document.getElementById("os-estimasi");

  overlay.style.display = "flex";

  // Random estimasi waktu
  let waktu = Math.floor(Math.random() * 6) + 10; // 10 - 15 menit
  estimasi.textContent = "Estimasi selesai: " + waktu + " menit";
  function waktuPesanan(order) {
    let total = 0;
    order.items.forEach(i => {
        const w = waktuMasak[i.name] || 5; // default 5 menit
        total += w * i.qty;
    });
    return total;
  }

  // Progress berjalan
  let progress = 0;
  let step = 100 / waktu; // update tiap menit (bisa disesuaikan)

  let interval = setInterval(() => {
    progress += step;
    if (progress >= 100) {
      progress = 100;
      statusText.textContent = "Status: Siap Diambil";
      clearInterval(interval);
    } else if (progress > 60) {
      statusText.textContent = "Status: Sedang dimasak";
    } else {
      statusText.textContent = "Status: Pesanan diterima";
    }

    bar.style.width = progress + "%";
  }, 600); // 0.6 detik per update (biar cepat)
}

// CLOSE popup
document.getElementById("os-close").onclick = () => {
  document.getElementById("orderStatusOverlay").style.display = "none";
};

// Klik luar popup → close
document.getElementById("orderStatusOverlay").onclick = (e) => {
  if (e.target.id === "orderStatusOverlay") {
    e.target.style.display = "none";
  }
};

// --- FITUR CEK STATUS PESANAN ---

function openOrderStatus() {
    const orders = JSON.parse(localStorage.getItem("orders") || "[]");

    if (orders.length === 0) {
        alert("Belum ada pesanan.");
        return;
    }

    // 👉 Ambil pesanan terbaru (karena kamu pakai unshift)
    const lastOrder = orders[0];

    const etaEl = document.getElementById("os-estimasi");
    const statusText = document.getElementById("os-status-text");
    const bar = document.getElementById("os-progress-bar");

    // 👉 Jalankan ETA realtime jika ada timestamp
    if (lastOrder.etaTimestamp) {
        startRealTimeETA(lastOrder, etaEl);
    } else {
        etaEl.textContent = "Estimasi selesai: Tidak tersedia";
    }

    // 👉 Update status teks
    statusText.textContent = "Status: " + lastOrder.status;

    // 👉 Progress bar berdasarkan status
    if (lastOrder.status === "new") bar.style.width = "20%";
    if (lastOrder.status === "Diproses") bar.style.width = "50%";
    if (lastOrder.status === "Dimasak") bar.style.width = "80%";
    if (lastOrder.status === "Siap Diambil") bar.style.width = "100%";

    // Tampilkan overlay
    document.getElementById("orderStatusOverlay").style.display = "flex";
}

// Tutup popup
document.getElementById("os-close").addEventListener("click", () => {
    document.getElementById("orderStatusOverlay").style.display = "none";
});

function openPurchaseActivity() {
    const orders = JSON.parse(localStorage.getItem("orders") || "[]");
    const listBox = document.getElementById("activityList");

    listBox.innerHTML = "";

    if (orders.length === 0) {
        listBox.innerHTML = "<p>Tidak ada aktivitas pembelian.</p>";
    } else {
        orders.forEach(o => {
            const div = document.createElement("div");
            div.style.padding = "10px";
            div.style.borderBottom = "1px solid #ddd";

            div.innerHTML = `
                <strong>${o.id}</strong><br>
                ${new Date(o.createdAt).toLocaleString()}<br>
                Total: Rp ${o.total.toLocaleString()}<br>
                Status: ${o.status}
            `;

            listBox.appendChild(div);
        });
    }

    document.getElementById("activityOverlay").style.display = "flex";
}

document.getElementById("act-close").addEventListener("click", () => {
    document.getElementById("activityOverlay").style.display = "none";
});

// Tutup popup Log Aktivitas
const actCloseBtn = document.getElementById("act-close");
if (actCloseBtn) {
    actCloseBtn.addEventListener("click", () => {
        document.getElementById("activityOverlay").style.display = "none";
    });
}


// Tutup popup Status Pesanan
const osCloseBtn = document.getElementById("os-close");
if (osCloseBtn) {
    osCloseBtn.addEventListener("click", () => {
        document.getElementById("orderStatusOverlay").style.display = "none";
    });
}

function openStatusOverlay(message) {
    document.getElementById("statusMessage").innerHTML = message;
    document.getElementById("statusOverlay").classList.remove("hidden");
}

function closeStatusOverlay() {
    document.getElementById("statusOverlay").classList.add("hidden");
}

function openHistoryOverlay() {
    const orders = JSON.parse(localStorage.getItem("orders")) || [];
    const list = document.getElementById("historyList");

    if (orders.length === 0) {
        list.innerHTML = "<p>Tidak ada riwayat.</p>";
    } else {
        list.innerHTML = orders
            .map(o => `
                <div class="history-item">
                    <strong>${o.id}</strong><br>
                    ${new Date(o.createdAt).toLocaleString()}<br>
                    Total: Rp ${o.total.toLocaleString()}<br>
                    Status: ${o.status}
                </div>
            `)
            .join("");
    }

    document.getElementById("historyOverlay").classList.remove("hidden");
}

function closeHistoryOverlay() {
    document.getElementById("historyOverlay").classList.add("hidden");
}

document.getElementById("statusOverlay").addEventListener("click", function(e) {
    if (e.target.id === "statusOverlay") closeStatusOverlay();
});

document.getElementById("historyOverlay").addEventListener("click", function(e) {
    if (e.target.id === "historyOverlay") closeHistoryOverlay();
});

/* =========================
   WAKTU MASAK (per-item)
   + fuzzy matching
========================= */

const waktuMasak = {
  "Cireng": 5,
  "Seblak": 15,
  "Risol": 5,
  "Mie Ayam": 15,
  "Gorengan": 5,
  "Wonton": 8,
  "Mie instan": 7,
  "Pop mie": 5,
  "Soto": 6,
  "Bakso": 10,
  "Nutrisari": 3,
  "Pop ice": 5,
  "Chocolatos": 4,
  "Milo": 4,
  "Teh": 3,
  "Kopi": 4,
  "Teh Tarik": 4,
  "Le minerale": 3,
  "Capcin": 5,
  "Teajus": 5
};

// fuzzy match waktu masak
function lookupTimePerItem(itemName) {
    const nameLower = itemName.toLowerCase();
    for (const key in waktuMasak) {
        if (nameLower.includes(key.toLowerCase())) return waktuMasak[key];
    }
    return 5; // default
}

// hitung total waktu masak 1 pesanan
function waktuPesanan(order) {
    let total = 0;
    order.items.forEach(i => {
        total += lookupTimePerItem(i.name) * (i.qty || 1);
    });
    return total;
}

/* =========================
   HITUNG ESTIMASI (FINAL)
========================= */

function hitungEstimasi(orderId) {
    const queue = JSON.parse(localStorage.getItem("orderQueue")) || [];
    const index = queue.findIndex(o => o.id === orderId);

    if (index === -1) return "Pesanan tidak ditemukan.";

    const order = queue[index];

    // pesanan sebelum dia yang belum selesai
    const sebelum = queue.slice(0, index).filter(o => o.status !== "Selesai");

    let waktuAntrean = 0;
    sebelum.forEach(o => waktuAntrean += waktuPesanan(o));

    const waktuSendiri = waktuPesanan(order);
    const total = waktuAntrean + waktuSendiri;

    if (order.status === "Selesai") return "Sudah siap diambil";
    return `${total} menit`;
}

/* =========================
   REALTIME ETA
========================= */

function startRealTimeETA(order, element) {
    function update() {
        const now = Date.now();
        let sisa = Math.floor((order.etaTimestamp - now) / 1000);

       if (sisa <= 0) {
          element.textContent = "Siap diambil";

          order.status = "Siap Diambil";
          localStorage.setItem("orders",
            JSON.stringify(JSON.parse(localStorage.getItem("orders")).map(o =>
                o.id === order.id ? order : o
            ))
         );

          // 🔔 KIRIM NOTIF KE CUSTOMER
         sendReadyNotification(order);

          clearInterval(timer);
         return;
        }

        const menit = Math.floor(sisa / 60);
        const detik = sisa % 60;

        element.textContent = `Sekitar ${menit} menit ${detik} detik`;
    }

    update();
    const timer = setInterval(update, 1000);
}

function sendReadyNotification(order) {
    if (!("Notification" in window)) return;

    if (Notification.permission === "granted") {
        new Notification("Pesanan Siap!", {
            body: `Pesanan ${order.id} sudah siap diambil.`,
            icon: "img/chef.png" 
        });
    }
}

// ==== CHECK ORDER READY NOTIFICATION ====

function checkOrderReady() {
    const orders = JSON.parse(localStorage.getItem("orders")) || [];

    orders.forEach(order => {
        const signal = localStorage.getItem("orderReady_" + order.id);

        if (signal === "yes") {
            // Tampilkan notifikasi
            if (Notification.permission === "granted") {
                new Notification("Pesanan Siap!", {
                    body: `Pesanan #${order.id} atas nama ${order.name} sudah siap diambil.`,
                    icon: "img/favicon.png"
                });
            }

            // Hapus sinyal setelah notif muncul
            localStorage.removeItem("orderReady_" + order.id);
        }
    });
}

// Cek setiap 3 detik
setInterval(checkOrderReady, 3000);

