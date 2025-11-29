// js/owner.js
// Owner system — works with Firebase RTDB (compat) if available; otherwise falls back to localStorage.

// helper: apakah RTDB ready?
function isRTDBReady() {
  return !!(window && window.rtdb && typeof window.rtdb.ref === 'function');
}

// small wait util (used on page load)
function waitForRTDB(timeoutMs = 6000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    (function check(){
      if (isRTDBReady()) return resolve(true);
      if (Date.now() - start > timeoutMs) return reject(new Error('RTDB not ready'));
      setTimeout(check, 150);
    })();
  });
}

// ----------------- OWNER helpers (DB or local) -----------------

// Read owners (returns object or array depending on storage)
async function fetchOwnersRemote() {
  const snap = await window.rtdb.ref('owners').get();
  const val = snap.exists() ? snap.val() : null;
  // firebase RTDB structure likely { id1: {username, password}, id2: ... }
  if (!val) return {};
  return val;
}
function fetchOwnersLocal() {
  const raw = localStorage.getItem('owners');
  return raw ? JSON.parse(raw) : [{ username: 'stockwise', password: 'ferrari' }];
}

async function loadOwners() {
  if (isRTDBReady()) {
    try {
      const o = await fetchOwnersRemote();
      return o || {};
    } catch (e) {
      console.warn('fetchOwnersRemote failed, using local', e);
      return arrayToObj(fetchOwnersLocal());
    }
  } else {
    const local = fetchOwnersLocal();
    // convert array -> keyed object for consistency
    return arrayToObj(local);
  }
}

function saveOwnersLocalArray(arr) {
  localStorage.setItem('owners', JSON.stringify(arr));
}

function arrayToObj(arr) {
  // arr might be array of {username,password} OR object already
  if (!arr) return {};
  if (Array.isArray(arr)) {
    const out = {};
    arr.forEach((o, i) => { out['local_' + i] = o; });
    return out;
  }
  return arr; // already object
}

// add owner (returns true/false)
async function addOwner(username, password) {
  username = String(username).trim();
  password = String(password).trim();
  if (!username || !password) return false;

  // if remote available, push new key
  if (isRTDBReady()) {
    // only allow if current session is authorized? (you can add server-side check later)
    try {
      // check duplicates
      const ownersObj = await loadOwners();
      const exists = Object.values(ownersObj).some(o=>o.username === username);
      if (exists) return false;
      const newRef = window.rtdb.ref('owners').push();
      await newRef.set({ username, password });
      return true;
    } catch (e) {
      console.warn('addOwner remote failed', e);
      return false;
    }
  } else {
    // local fallback
    try {
      let arr = fetchOwnersLocal();
      if (!Array.isArray(arr)) arr = Object.values(arr);
      if (arr.some(o => o.username === username)) return false;
      arr.push({ username, password });
      saveOwnersLocalArray(arr);
      return true;
    } catch (e) {
      console.warn('addOwner local failed', e);
      return false;
    }
  }
}

// delete owner by username (keep stockwise)
async function deleteOwner(username) {
  username = String(username);
  if (username === 'stockwise') { alert('Owner utama tidak dapat dihapus.'); return false; }

  if (isRTDBReady()) {
    try {
      const ownersObj = await loadOwners();
      const foundKey = Object.keys(ownersObj).find(k => ownersObj[k].username === username);
      if (!foundKey) return false;
      await window.rtdb.ref('owners/' + foundKey).remove();
      return true;
    } catch (e) {
      console.warn('deleteOwner remote failed', e);
      return false;
    }
  } else {
    // local fallback
    let arr = fetchOwnersLocal();
    if (!Array.isArray(arr)) arr = Object.values(arr);
    arr = arr.filter(o => o.username !== username);
    saveOwnersLocalArray(arr);
    return true;
  }
}

// ----------------- LOGIN -----------------
async function ownerLogin() {
  const username = document.getElementById("ownerUsername").value.trim();
  const password = document.getElementById("ownerPassword").value.trim();
  const msgEl = document.getElementById("err") || document.getElementById("ownerLoginMsg");

  try {
    // try remote first (if ready)
    if (isRTDBReady()) {
      // load owners object (keys -> {username,password})
      const ownersObj = await loadOwners();
      const match = Object.values(ownersObj).find(o => o.username === username && o.password === password);
      if (!match) {
        if (msgEl) { msgEl.style.display = 'block'; msgEl.textContent = 'Username atau password salah!'; }
        return;
      }
    } else {
      // fallback local
      const arr = fetchOwnersLocal();
      const found = (Array.isArray(arr) ? arr : Object.values(arr)).find(o => o.username === username && o.password === password);
      if (!found) {
        if (msgEl) { msgEl.style.display = 'block'; msgEl.textContent = 'Username atau password salah!'; }
        return;
      }
    }

    // success
    sessionStorage.setItem('ownerAuth', username);
    // redirect to dashboard
    window.location.href = 'owner-dashboard.html';
  } catch (e) {
    console.error('Login error:', e);
    if (msgEl) { msgEl.style.display = 'block'; msgEl.textContent = 'Terjadi kesalahan saat login.'; }
  }
}

// expose functions to global scope (owner-dashboard.html uses them)
window.addOwner = addOwner;
window.deleteOwner = deleteOwner;
window.ownerLogin = ownerLogin;
window.loadOwners = loadOwners;

// ----------------- ORDERS (basic realtime render) -----------------
function loadOrdersRealtime() {
  // If RTDB available, attach onValue to 'orders' node
  if (isRTDBReady()) {
    window.rtdb.ref('orders').on('value', snapshot => {
      const data = snapshot.exists() ? snapshot.val() : {};
      renderOrders(data);
    });
  } else {
    // fallback: render from localStorage orders array
    const arr = JSON.parse(localStorage.getItem('orders') || '[]');
    // convert array -> keyed object style expected by renderOrders below
    const keyed = {};
    arr.forEach((o, i)=> keyed[o.id || 'local_' + i] = o);
    renderOrders(keyed);
  }
}

// renderOrders expects orders object {id: {name,total,...}}
function renderOrders(ordersObj) {
  // try to find table body by common ids used in owner-dashboard
  const tableBody = document.querySelector('#ordersTable tbody') || document.getElementById('ordersTable') || document.getElementById('orderTableBody') || document.querySelector('table tbody');
  if (!tableBody) return;

  // ensure it's tbody element
  let tbody = tableBody;
  if (tableBody.tagName.toLowerCase() === 'table') {
    tbody = tableBody.querySelector('tbody') || document.createElement('tbody');
  }

  tbody.innerHTML = '';

  const keys = Object.keys(ordersObj || {});
  // show newest first if possible
  keys.sort().reverse();

  keys.forEach(k => {
    const o = ordersObj[k];
    const tr = document.createElement('tr');

    // try to safely access fields
    const idVal = o.id || k;
    const name = o.name || o.custName || '-';
    const items = (o.items && Array.isArray(o.items)) ? o.items.map(i => `${i.name} × ${i.qty}`).join('<br>') : (o.items || '-');
    const note = o.note || o.catatan || '-';
    const total = typeof o.total === 'number' ? 'Rp ' + o.total.toLocaleString() : (o.total || '-');
    const time = o.createdAt ? new Date(o.createdAt).toLocaleString() : '-';
    const status = o.status || o.state || 'new';

    tr.innerHTML = `
      <td>${idVal}</td>
      <td>${name}</td>
      <td>${items}</td>
      <td>${note}</td>
      <td>${total}</td>
      <td>${time}</td>
      <td>${status}</td>
      <td>
        <button class="btn-ghost" onclick="viewOrder(${JSON.stringify(o)})">Detail</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // if tableBody was the table, attach tbody
  if (tableBody.tagName.toLowerCase() === 'table') {
    if (!tableBody.querySelector('tbody')) tableBody.appendChild(tbody);
  }
}
window.loadOrdersRealtime = loadOrdersRealtime;
window.renderOrders = renderOrders;

// ----------------- BOOT (on DOM ready) -----------------
document.addEventListener('DOMContentLoaded', async () => {
  // wait a bit if RTDB exists but not ready
  try {
    await waitForRTDB(2500).catch(()=>null); // don't fail hard, fallback allowed
  } catch(e) {}

  // initial render owner list in any page that has owner UI:
  (async function renderOwnerListUI(){
    const node = document.getElementById('ownerList') || document.getElementById('ownerTable') || document.getElementById('ownerTableBody');
    if (!node) return;

    const ownersObj = await loadOwners();
    // if ownerList div (dashboard sidebar)
    if (document.getElementById('ownerList')) {
      const ownerListNode = document.getElementById('ownerList');
      ownerListNode.innerHTML = '';
      Object.values(ownersObj).forEach(o=>{
        const div = document.createElement('div');
        div.className = 'owner-row';
        const name = document.createElement('div');
        name.className = 'owner-name';
        name.textContent = o.username;
        const actions = document.createElement('div');

        if (o.username !== 'stockwise') {
          const del = document.createElement('button');
          del.className = 'btn-ghost';
          del.textContent = 'Hapus';
          del.onclick = async ()=> {
            if (!confirm(`Hapus owner "${o.username}" ?`)) return;
            await deleteOwner(o.username);
            renderOwnerListUI();
          };
          actions.appendChild(del);
        } else {
          actions.textContent = '';
        }

        div.appendChild(name);
        div.appendChild(actions);
        ownerListNode.appendChild(div);
      });
      return;
    }

    // if table exists
    if (document.getElementById('ownerTable')) {
      const table = document.getElementById('ownerTable');
      table.innerHTML = '';
      Object.values(ownersObj).forEach(o=>{
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${o.username}</td><td>${o.username === 'stockwise' ? '-' : o.password}</td><td>${o.username !== 'stockwise' ? '<button class="delete-btn" onclick="deleteOwner(\''+o.username+'\')">Hapus</button>' : '-'}</td>`;
        table.appendChild(tr);
      });
    }
  })();

  // if dashboard orders area present, start realtime listen
  loadOrdersRealtime();
});