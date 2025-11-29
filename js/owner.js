// owner.js — fixed, robust version
// - normalizes owners from multiple shapes (array, keyed object, username-keyed object)
// - robust RTDB shim handling (compat or modular helper window.fb)
// - safe fallbacks to localStorage
// - login/add/delete owners work consistently

// -------- RTDB shim & helpers --------
(function(){
  // prefer compat if available
  if (window.firebase && firebase.database) {
    window.rtdb = firebase.database();
    console.info('RTDB: Using Firebase compat database()');
  }

  // if a modular helper named "fb" exists, map minimal API to compat-like ref()
  if (!window.rtdb && window.fb && (typeof window.fb.get === 'function')) {
    console.info('RTDB SHIM: Mapping window.fb -> window.rtdb');
    window.rtdb = (function(fb){
      function ref(path) {
        return {
          async get() {
            try {
              const val = await fb.get(path);
              // return compat-like snapshot object with exists() & val()
              return {
                exists: () => val !== null && typeof val !== 'undefined',
                val: () => val
              };
            } catch(e) { throw e; }
          },
          on(event, cb) {
            if (event !== 'value' || typeof fb.onValue !== 'function') return;
            return fb.onValue(path, snap => {
              cb({
                exists: () => snap !== null && typeof snap !== 'undefined',
                val: () => snap
              });
            });
          },
          push() {
            const key = 'k' + Date.now() + Math.floor(Math.random()*1000);
            return {
              key,
              set: (v) => fb.set((path + '/' + key).replace(/\/+/g,'/'), v)
            };
          },
          remove() { return fb.remove(path); }
        };
      }
      return { ref };
    })(window.fb);
  }

  // fallback: a tiny localStorage-backed "ref" that uses path as key
  if (!window.rtdb) {
    console.warn('RTDB fallback: using localStorage-only shim');
    window.rtdb = {
      ref(path) {
        return {
          async get() {
            const raw = localStorage.getItem(path);
            const parsed = raw ? JSON.parse(raw) : null;
            return {
              exists: () => parsed !== null,
              val: () => parsed
            };
          },
          // basic set/remove for push emulation if used
          async set(value) { localStorage.setItem(path, JSON.stringify(value)); return true; },
          async remove() { localStorage.removeItem(path); return true; }
        };
      }
    };
  }
})();

// helper: apakah rtdb siap
function isRTDBReady() {
  return !!(window && window.rtdb && typeof window.rtdb.ref === 'function');
}

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

// -------- Owners local/remote normalization --------
// Accepts localStorage "owners" value in any of:
// - array [{username, password, name?}, ...]
// - object keyed by random ids { key1: {username, password}, ... }
// - object keyed by username { username: {password, name?}, ... }
// Returns array of canonical owner objects: [{username, password, name?}, ...]
function normalizeOwnersValue(val) {
  if (!val) return [];
  if (Array.isArray(val)) {
    return val.map(o => ({ username: o.username, password: o.password, name: o.name || '' }));
  }
  if (typeof val === 'object') {
    // detect if keys are usernames (key equals inner username or inner has no username)
    const keys = Object.keys(val);
    // case: { username: { password, name } }
    const looksLikeUsernameKeyed = keys.every(k => {
      const v = val[k];
      return v && typeof v === 'object' && (!v.username || v.username === k);
    });
    if (looksLikeUsernameKeyed) {
      return keys.map(k => ({ username: k, password: val[k].password, name: val[k].name || '' }));
    }
    // else: treat as keyed by random id, each value should have username property
    return keys.map(k => {
      const v = val[k] || {};
      return { username: v.username, password: v.password, name: v.name || '' };
    }).filter(o => o.username);
  }
  return [];
}

function fetchOwnersLocalRaw() {
  try {
    const raw = localStorage.getItem('owners');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn('fetchOwnersLocalRaw parse failed', e);
    return null;
  }
}

// returns canonical array
function fetchOwnersLocal() {
  const raw = fetchOwnersLocalRaw();
  const arr = normalizeOwnersValue(raw);
  // if nothing found, ensure default owner present as array form
  if (!arr || arr.length === 0) {
    return [{ username: 'stockwise', password: 'ferrari', name: 'Wellrs Admin' }];
  }
  return arr;
}

function saveOwnersLocalArray(arr) {
  if (!Array.isArray(arr)) arr = Array.isArray(arr) ? arr : [];
  localStorage.setItem('owners', JSON.stringify(arr));
}

// convert array to keyed object (used when code expects object)
function ownersArrayToKeyedObj(arr) {
  const out = {};
  arr.forEach((o,i) => {
    const key = typeof o.username === 'string' ? o.username : ('local_' + i);
    out[key] = { username: o.username, password: o.password, name: o.name || '' };
  });
  return out;
}

// -------- Remote (RTDB) helpers --------
async function fetchOwnersRemote() {
  try {
    const snap = await window.rtdb.ref('owners').get();
    const val = snap && typeof snap.exists === 'function' && snap.exists() ? snap.val() : snap && snap.val ? snap.val() : null;
    if (!val) return [];
    // val might be object keyed by random keys OR object keyed by username
    return normalizeOwnersValue(val);
  } catch (e) {
    console.warn('fetchOwnersRemote error', e);
    return [];
  }
}

// unified loader: prefer remote if ready, otherwise local
async function loadOwners() {
  if (isRTDBReady()) {
    try {
      await waitForRTDB(1500).catch(()=>null);
      const remote = await fetchOwnersRemote();
      if (remote && remote.length > 0) return remote;
      // fallback to local
    } catch (e) { /* ignore */ }
  }
  return fetchOwnersLocal();
}

// add owner (returns boolean)
async function addOwner(username, password, name='') {
  username = String(username || '').trim();
  password = String(password || '').trim();
  if (!username || !password) return false;

  // check existing in local (and remote if available)
  const current = await loadOwners();
  if (current.some(o => o.username === username)) return false;

  if (isRTDBReady()) {
    try {
      const newRef = window.rtdb.ref('owners').push();
      await newRef.set({ username, password, name });
      return true;
    } catch (e) {
      console.warn('addOwner remote failed, falling back to local', e);
    }
  }
  // local fallback
  try {
    const arr = fetchOwnersLocal();
    arr.push({ username, password, name });
    saveOwnersLocalArray(arr);
    return true;
  } catch (e) {
    console.warn('addOwner local failed', e);
    return false;
  }
}

// delete owner (by username)
async function deleteOwner(username) {
  username = String(username || '');
  if (!username) return false;
  if (username === 'stockwise') { alert('Owner utama tidak dapat dihapus.'); return false; }

  if (isRTDBReady()) {
    try {
      // find key in remote keyed object
      const snap = await window.rtdb.ref('owners').get();
      const val = snap && snap.exists ? (snap.exists() ? snap.val() : null) : (snap ? snap.val() : null);
      if (val && typeof val === 'object') {
        const key = Object.keys(val).find(k => {
          const it = val[k];
          return it && (it.username === username || k === username);
        });
        if (key) {
          await window.rtdb.ref('owners/' + key).remove();
          return true;
        }
      }
    } catch (e) { console.warn('deleteOwner remote failed', e); }
  }
  // local fallback
  try {
    let arr = fetchOwnersLocal();
    arr = arr.filter(o => o.username !== username);
    saveOwnersLocalArray(arr);
    return true;
  } catch (e) { console.warn('deleteOwner local failed', e); return false; }
}

// -------- Login --------
async function ownerLogin() {
  const username = (document.getElementById('ownerUsername') || {}).value || '';
  const password = (document.getElementById('ownerPassword') || {}).value || '';
  const msgEl = document.getElementById('err') || document.getElementById('ownerLoginMsg');

  if (!username || !password) {
    if (msgEl) { msgEl.style.display = 'block'; msgEl.textContent = 'Masukkan username & password.'; }
    return;
  }

  try {
    const owners = await loadOwners(); // canonical array
    const found = owners.find(o => o.username === username && o.password === password);
    if (!found) {
      if (msgEl) { msgEl.style.display = 'block'; msgEl.textContent = 'Username atau password salah!'; }
      return;
    }
    // success
    sessionStorage.setItem('ownerAuth', username);
    window.location.href = 'owner-dashboard.html';
  } catch (e) {
    console.error('Login error:', e);
    if (msgEl) { msgEl.style.display = 'block'; msgEl.textContent = 'Terjadi kesalahan saat login.'; }
  }
}

// expose to window
window.addOwner = addOwner;
window.deleteOwner = deleteOwner;
window.ownerLogin = ownerLogin;
window.loadOwners = loadOwners;

// -------- Orders / render (kept mostly same, defensive) --------
function loadOrdersRealtime() {
  if (isRTDBReady()) {
    try {
      window.rtdb.ref('orders').on('value', snapshot => {
        const data = (snapshot && typeof snapshot.exists === 'function' && snapshot.exists()) ? snapshot.val() : (snapshot && snapshot.val ? snapshot.val() : {});
        renderOrders(data);
      });
    } catch (e) { console.warn('orders realtime attach failed', e); }
  } else {
    const arr = JSON.parse(localStorage.getItem('orders') || '[]');
    const keyed = {};
    arr.forEach((o, i)=> keyed[o.id || 'local_' + i] = o);
    renderOrders(keyed);
  }
}

function renderOrders(ordersObj) {
  const tableBody = document.querySelector('#ordersTable tbody') || document.getElementById('ordersTable') || document.getElementById('orderTableBody') || document.querySelector('table tbody');
  if (!tableBody) return;
  let tbody = tableBody;
  if (tableBody.tagName && tableBody.tagName.toLowerCase() === 'table') {
    tbody = tableBody.querySelector('tbody') || document.createElement('tbody');
  }
  tbody.innerHTML = '';
  const keys = Object.keys(ordersObj || {});
  keys.sort().reverse();
  keys.forEach(k => {
    const o = ordersObj[k];
    const tr = document.createElement('tr');
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
        <button class="btn-ghost" onclick='try{ viewOrder(${JSON.stringify(o)}) }catch(e){ console.warn(e) }'>Detail</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  if (tableBody.tagName && tableBody.tagName.toLowerCase() === 'table') {
    if (!tableBody.querySelector('tbody')) tableBody.appendChild(tbody);
  }
}
window.loadOrdersRealtime = loadOrdersRealtime;
window.renderOrders = renderOrders;

// -------- Boot on DOM ready (render owners UI if present) --------
document.addEventListener('DOMContentLoaded', async () => {
  try { await waitForRTDB(2000).catch(()=>null); } catch(e){}
  (async function renderOwnerListUI(){
    const node = document.getElementById('ownerList') || document.getElementById('ownerTable') || document.getElementById('ownerTableBody');
    if (!node) return;
    const owners = await loadOwners();
    if (document.getElementById('ownerList')) {
      const ownerListNode = document.getElementById('ownerList');
      ownerListNode.innerHTML = '';
      owners.forEach(o=>{
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
        }
        div.appendChild(name);
        div.appendChild(actions);
        ownerListNode.appendChild(div);
      });
      return;
    }
    if (document.getElementById('ownerTable')) {
      const table = document.getElementById('ownerTable');
      table.innerHTML = '';
      owners.forEach(o=>{
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${o.username}</td><td>${o.username === 'stockwise' ? '-' : o.password}</td><td>${o.username !== 'stockwise' ? '<button class="delete-btn" onclick="deleteOwner(\\''+o.username+'\\')">Hapus</button>' : '-'}</td>`;
        table.appendChild(tr);
      });
    }
  })();

  // start orders realtime if on dashboard
  loadOrdersRealtime();
});