/* =====================================================================
   shetwarp — front-end logic
   ---------------------------------------------------------------------
   Storage layer: everything below reads/writes localStorage so the
   site is fully clickable right now (register, login, buy a rank,
   open a ticket). Swap SW_DB for real API calls when the backend and
   payment gateway are ready — every function that needs to change is
   marked with "// BACKEND:".
===================================================================== */

const SW_DB = {
  users:   () => JSON.parse(localStorage.getItem('sw_users')   || '[]'),
  orders:  () => JSON.parse(localStorage.getItem('sw_orders')  || '[]'),
  tickets: () => JSON.parse(localStorage.getItem('sw_tickets') || '[]'),
  save(key, val){ localStorage.setItem('sw_' + key, JSON.stringify(val)); },
  session(){ return JSON.parse(localStorage.getItem('sw_session') || 'null'); },
  setSession(v){ v ? localStorage.setItem('sw_session', JSON.stringify(v)) : localStorage.removeItem('sw_session'); }
};

const RANKS = {
  vip:   { name: 'VIP',   price: 49000,  tier: 1 },
  mvp:   { name: 'MVP',   price: 99000,  tier: 2 },
  elite: { name: 'Elite', price: 199000, tier: 3 }
};

/* ---------------------------- utils ---------------------------- */
function swToast(msg, kind){
  let stack = document.querySelector('.toast-stack');
  if(!stack){
    stack = document.createElement('div');
    stack.className = 'toast-stack';
    document.body.appendChild(stack);
  }
  const t = document.createElement('div');
  t.className = 'toast';
  t.style.borderColor = kind === 'error' ? 'rgba(241,101,101,0.4)' : 'var(--border-hi)';
  t.textContent = msg;
  stack.appendChild(t);
  setTimeout(() => t.remove(), 3600);
}

function swFormatToman(n){
  return n.toLocaleString('fa-IR') + ' تومان';
}

function swInitials(name){
  return (name || '?').trim().slice(0,2).toUpperCase();
}

/* ---------------------------- shared chrome (nav / bg / footer) ---------------------------- */
const SW_LOGO_SVG = `
<svg class="brand-mark" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="20" cy="20" r="18" stroke="url(#swg1)" stroke-width="2"/>
  <circle cx="20" cy="20" r="11.5" stroke="url(#swg2)" stroke-width="1.6" stroke-dasharray="3 4"/>
  <circle cx="20" cy="20" r="6" fill="url(#swg3)"/>
  <defs>
    <linearGradient id="swg1" x1="2" y1="2" x2="38" y2="38" gradientUnits="userSpaceOnUse">
      <stop stop-color="#b09bff"/><stop offset="1" stop-color="#38bdf8"/>
    </linearGradient>
    <linearGradient id="swg2" x1="8" y1="8" x2="32" y2="32" gradientUnits="userSpaceOnUse">
      <stop stop-color="#8b5cf6"/><stop offset="1" stop-color="#34d399"/>
    </linearGradient>
    <radialGradient id="swg3" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(17 17) rotate(45) scale(9.9)">
      <stop stop-color="#cabaff"/><stop offset="1" stop-color="#7c3aed"/>
    </radialGradient>
  </defs>
</svg>`;

const NAV_ITEMS = [
  { href:'index.html',   label:'خانه',   key:'index' },
  { href:'index.html#ranks', label:'رنک‌ها', key:'ranks' },
  { href:'tickets.html', label:'تیکت پشتیبانی', key:'tickets' },
];

function swRenderChrome(){
  const page = document.body.dataset.page || '';

  // backdrop
  if(!document.querySelector('.bg-scene')){
    const scene = document.createElement('div'); scene.className = 'bg-scene';
    const noise = document.createElement('div'); noise.className = 'bg-noise';
    document.body.prepend(noise);
    document.body.prepend(scene);
  }

  const navRoot = document.getElementById('nav-root');
  if(navRoot){
    const session = SW_DB.session();
    const links = NAV_ITEMS.map(item =>
      `<a href="${item.href}" class="${item.key===page ? 'active' : ''}">${item.label}</a>`
    ).join('');
    navRoot.innerHTML = `
      <nav class="nav">
        <div class="nav-inner">
          <a href="index.html" class="brand">${SW_LOGO_SVG}<span>shetwarp</span></a>
          <div class="nav-links">${links}</div>
          <div class="nav-actions">
            <div id="nav-auth-slot" style="display:flex;gap:10px;"></div>
            <button class="nav-toggle" aria-label="باز کردن منو">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M2 4.5H16M2 9H16M2 13.5H16" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
            </button>
          </div>
        </div>
      </nav>`;

    const toggle = navRoot.querySelector('.nav-toggle');
    const linksEl = navRoot.querySelector('.nav-links');
    toggle.addEventListener('click', () => linksEl.classList.toggle('open'));
    linksEl.querySelectorAll('a').forEach(a => a.addEventListener('click', () => linksEl.classList.remove('open')));

    const authSlot = document.getElementById('nav-auth-slot');
    if(session){
      authSlot.innerHTML = `<a href="dashboard.html" class="btn btn-primary btn-sm">داشبورد من</a>`;
    } else {
      authSlot.innerHTML = `
        <a href="login.html" class="btn btn-ghost btn-sm">ورود</a>
        <a href="register.html" class="btn btn-primary btn-sm">ثبت‌نام</a>`;
    }
  }

  const footRoot = document.getElementById('footer-root');
  if(footRoot){
    footRoot.innerHTML = `
      <footer class="footer">
        <div class="container footer-inner">
          <div class="footer-brand">${SW_LOGO_SVG}<span style="font-family:var(--font-display);font-weight:700;">shetwarp</span></div>
          <div class="footer-links">
            <a href="index.html">خانه</a>
            <a href="index.html#ranks">رنک‌ها</a>
            <a href="tickets.html">تیکت پشتیبانی</a>
          </div>
          <div class="footer-copy">© ${new Date().getFullYear()} shetwarp — تمام حقوق محفوظ است</div>
        </div>
      </footer>`;
  }
}

/* ---------------------------- auth ---------------------------- */
// BACKEND: replace with POST /api/register
function swRegister({ username, mcname, email, password }){
  const users = SW_DB.users();
  if(users.some(u => u.username.toLowerCase() === username.toLowerCase())){
    return { ok:false, error:'این نام کاربری قبلاً ثبت شده' };
  }
  if(users.some(u => u.email.toLowerCase() === email.toLowerCase())){
    return { ok:false, error:'این ایمیل قبلاً استفاده شده' };
  }
  const user = {
    id: 'u_' + Date.now().toString(36),
    username, mcname, email,
    password, // BACKEND: never store/compare plaintext — hash server-side
    rank: null,
    createdAt: new Date().toISOString()
  };
  users.push(user);
  SW_DB.save('users', users);
  SW_DB.setSession({ id: user.id });
  return { ok:true, user };
}

// BACKEND: replace with POST /api/login
function swLogin({ identifier, password }){
  const users = SW_DB.users();
  const user = users.find(u =>
    (u.username.toLowerCase() === identifier.toLowerCase() || u.email.toLowerCase() === identifier.toLowerCase())
    && u.password === password
  );
  if(!user) return { ok:false, error:'نام کاربری/ایمیل یا رمز عبور اشتباه است' };
  SW_DB.setSession({ id: user.id });
  return { ok:true, user };
}

function swLogout(){
  SW_DB.setSession(null);
  window.location.href = 'index.html';
}

function swCurrentUser(){
  const s = SW_DB.session();
  if(!s) return null;
  return SW_DB.users().find(u => u.id === s.id) || null;
}

function swRequireAuth(){
  const u = swCurrentUser();
  if(!u){
    window.location.href = 'login.html';
  }
  return u;
}

/* ---------------------------- orders / ranks ---------------------------- */
// BACKEND: replace with POST /api/checkout — this is where the real
// payment gateway (e.g. ZarinPal/IDPay) redirect + callback verification goes.
function swCreateOrder(rankKey){
  const user = swCurrentUser();
  if(!user) return { ok:false, error:'ابتدا وارد حساب کاربری شوید' };
  const rank = RANKS[rankKey];
  const orders = SW_DB.orders();
  const order = {
    id: 'ord_' + Date.now().toString(36),
    userId: user.id,
    rank: rankKey,
    price: rank.price,
    status: 'pending', // BACKEND: 'pending' -> 'paid' after gateway callback verification
    createdAt: new Date().toISOString()
  };
  orders.push(order);
  SW_DB.save('orders', orders);
  return { ok:true, order };
}

function swUpdateUserRank(rankKey){
  const session = SW_DB.session();
  if(!session) return;
  const users = SW_DB.users();
  const idx = users.findIndex(u => u.id === session.id);
  if(idx > -1){
    users[idx].rank = rankKey;
    SW_DB.save('users', users);
  }
}

/* ---------------------------- tickets ---------------------------- */
function swCreateTicket({ subject, category, message }){
  const user = swCurrentUser();
  if(!user) return { ok:false, error:'ابتدا وارد حساب کاربری شوید' };
  const tickets = SW_DB.tickets();
  const ticket = {
    id: 'tkt_' + Date.now().toString(36).toUpperCase(),
    userId: user.id,
    subject, category, message,
    status: 'open',
    createdAt: new Date().toISOString()
  };
  tickets.push(ticket);
  SW_DB.save('tickets', tickets);
  return { ok:true, ticket };
}

function swUserTickets(){
  const user = swCurrentUser();
  if(!user) return [];
  return SW_DB.tickets().filter(t => t.userId === user.id).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
}

const TICKET_STATUS_LABEL = { open:'باز', progress:'در حال بررسی', closed:'بسته شده' };
const TICKET_STATUS_CLASS = { open:'badge-open', progress:'badge-progress', closed:'badge-closed' };
const TICKET_CATEGORY_LABEL = {
  purchase:'خرید رنک', technical:'مشکل فنی', report:'گزارش تخلف', other:'سایر'
};

document.addEventListener('DOMContentLoaded', swRenderChrome);
