// ============================================================
// CONFIG
// ============================================================
const API = 'http://localhost:5000/api';

// ============================================================
// STATE
// ============================================================
let currentUser = null;
let token = localStorage.getItem('ce_token') || null;
let currentTab = 'all';
let events = [];
let announcements = [];

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
  if (token) await restoreSession();
  await Promise.all([loadEvents(), loadAnnouncements(), loadGallery()]);
  updateCategoryCounts();
  renderTrending();
  animateStats();
  initNavScroll();
  setMinDate();
  setInterval(updateAllCountdowns, 1000);
});

// ============================================================
// API HELPER
// ============================================================
async function api(method, path, body = null, isForm = false) {
  const opts = {
    method,
    headers: {}
  };
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body && !isForm) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  } else if (body && isForm) {
    opts.body = body; // FormData
  }
  const res = await fetch(`${API}${path}`, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

// ============================================================
// SESSION RESTORE
// ============================================================
async function restoreSession() {
  try {
    const data = await api('GET', '/auth/me');
    currentUser = data.user;
    updateNavForUser();
    if (currentUser.role === 'admin') {
      document.getElementById('addAnnouncementCard').style.display = 'block';
    }
    if (currentUser.role !== 'student') {
      document.getElementById('galleryUploadBar').style.display = 'flex';
    }
  } catch {
    token = null;
    localStorage.removeItem('ce_token');
  }
}

// ============================================================
// EVENTS
// ============================================================
async function loadEvents(search = '', category = '') {
  try {
    let q = [];
    if (search) q.push(`search=${encodeURIComponent(search)}`);
    if (category) q.push(`category=${category}`);
    events = await api('GET', `/events${q.length ? '?' + q.join('&') : ''}`);
    renderEvents(events);
    updateCategoryCounts();
    renderTrending();
  } catch (err) {
    showToast('❌ Failed to load events: ' + err.message, 'error');
  }
}

// Per-event curated Unsplash photo map (keyed by title keywords or category fallback)
const EVENT_PHOTOS = {
  'hackathon':        'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=600&q=80',
  'cultural night':   'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&q=80',
  'rang de':          'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&q=80',
  'cricket':          'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=600&q=80',
  'ai':               'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=600&q=80',
  'ml':               'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=600&q=80',
  'entrepreneurship': 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=600&q=80',
  'summit':           'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=600&q=80',
  'photography':      'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=600&q=80',
  'robotics':         'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=600&q=80',
  'yoga':             'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&q=80',
  'wellness':         'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&q=80',
  'web dev':          'https://images.unsplash.com/photo-1547658719-da2b51169166?w=600&q=80',
  'bootcamp':         'https://images.unsplash.com/photo-1547658719-da2b51169166?w=600&q=80',
  // category fallbacks
  'technical':  'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=600&q=80',
  'cultural':   'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&q=80',
  'sports':     'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=600&q=80',
  'workshop':   'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=600&q=80',
  'seminar':    'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&q=80',
};

function getEventPhoto(ev) {
  const title = ev.title.toLowerCase();
  for (const [key, url] of Object.entries(EVENT_PHOTOS)) {
    if (title.includes(key)) return url;
  }
  return EVENT_PHOTOS[ev.category] || 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=600&q=80';
}

function renderEvents(list) {
  const grid = document.getElementById('eventsGrid');
  const noEvents = document.getElementById('noEvents');
  grid.innerHTML = '';
  const filtered = currentTab === 'all' ? list : list.filter(e => e.category === currentTab);
  if (!filtered.length) { noEvents.style.display = 'block'; return; }
  noEvents.style.display = 'none';

  filtered.forEach(ev => {
    const pct = Math.min(Math.round((ev.registered / ev.seats) * 100), 100);
    const isFull = ev.registered >= ev.seats;
    const barColor = pct > 80 ? '#f5576c' : pct > 50 ? '#fee140' : '#43e97b';
    const alreadyReg = currentUser?.registeredEvents?.some(r => (r._id || r) === ev._id);
    const photo = getEventPhoto(ev);
    const card = document.createElement('div');
    card.className = 'event-card';
    card.innerHTML = `
      <div class="event-card-banner event-card-photo">
        <img src="${photo}" alt="${ev.title}" loading="lazy"
          onerror="this.parentElement.classList.add('cat-${ev.category}');this.style.display='none';this.nextElementSibling.style.display='flex'"/>
        <div class="event-photo-fallback cat-${ev.category}" style="display:none">
          <span style="font-size:3rem">${ev.icon}</span>
        </div>
        <div class="event-photo-overlay"></div>
        <span class="event-category-badge">${ev.category}</span>
        <span class="event-seats-badge">${isFull ? '🔴 Full' : `${ev.seats - ev.registered} left`}</span>
      </div>
      <div class="event-card-body">
        <h3>${ev.title}</h3>
        <div class="event-meta">
          <div class="event-meta-item"><i class="fas fa-calendar"></i>${formatDate(ev.date)}</div>
          <div class="event-meta-item"><i class="fas fa-clock"></i>${formatTime(ev.time)}</div>
          <div class="event-meta-item"><i class="fas fa-map-marker-alt"></i>${ev.venue}</div>
          <div class="event-meta-item"><i class="fas fa-users"></i>${ev.organizer}</div>
        </div>
        <div class="countdown-box">
          <i class="fas fa-hourglass-half"></i>
          <span class="countdown-timer" id="cd-${ev._id}">${getCountdown(ev.date, ev.time)}</span>
        </div>
        <div class="progress-wrap">
          <div class="progress-label"><span>Registrations</span><span>${ev.registered}/${ev.seats}</span></div>
          <div class="progress-bar"><div class="progress-fill" style="width:${pct}%;background:${barColor}"></div></div>
        </div>
        <div class="event-card-footer">
          <span class="event-fee">${ev.fee === 'Free' ? '🎟 Free' : ev.fee}</span>
          <button class="btn-register" onclick="event.stopPropagation();registerEvent('${ev._id}')"
            ${isFull || alreadyReg ? 'disabled' : ''}>
            ${alreadyReg ? '✅ Registered' : isFull ? 'Full' : 'Register'}
          </button>
        </div>
      </div>`;
    card.addEventListener('click', () => openEventDetail(ev._id));
    grid.appendChild(card);
  });
}

function filterEvents() {
  const search = document.getElementById('searchInput').value;
  const cat = document.getElementById('categoryFilter').value;
  loadEvents(search, cat);
}

function filterByTab(tab, btn) {
  currentTab = tab;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  else document.querySelectorAll('.tab-btn')[0].classList.add('active');
  renderEvents(events);
  if (tab !== 'all') smoothScroll('events');
}

// ============================================================
// ADD EVENT
// ============================================================
async function addEvent(e) {
  e.preventDefault();
  if (!currentUser) { showToast('⚠️ Please login first.', 'error'); return; }
  const icons = { technical:'💻', cultural:'🎭', sports:'🏆', workshop:'🛠', seminar:'🎤' };
  const cat = document.getElementById('evCategory').value;
  const payload = {
    title:     document.getElementById('evTitle').value,
    category:  cat,
    date:      document.getElementById('evDate').value,
    time:      document.getElementById('evTime').value,
    venue:     document.getElementById('evVenue').value,
    organizer: document.getElementById('evOrganizer').value || currentUser.name,
    desc:      document.getElementById('evDesc').value || 'Join us for this exciting event!',
    seats:     parseInt(document.getElementById('evSeats').value) || 100,
    fee:       document.getElementById('evFee').value || 'Free',
    icon:      icons[cat] || '🎉'
  };
  try {
    await api('POST', '/events', payload);
    closeModal('addEventModal');
    e.target.reset();
    currentTab = 'all';
    document.querySelectorAll('.tab-btn').forEach((b, i) => b.classList.toggle('active', i === 0));
    await loadEvents();
    showToast('🎉 Event published!', 'success');
    smoothScroll('events');
  } catch (err) {
    showToast('❌ ' + err.message, 'error');
  }
}

// ============================================================
// REGISTER FOR EVENT
// ============================================================
async function registerEvent(id) {
  if (!currentUser) { showToast('⚠️ Please login to register.', 'error'); openModal('loginModal'); return; }
  try {
    await api('POST', `/events/${id}/register`);
    await loadEvents();
    await restoreSession(); // refresh registeredEvents list
    showToast('✅ Registered successfully!', 'success');
  } catch (err) {
    showToast('❌ ' + err.message, 'error');
  }
}

// ============================================================
// EVENT DETAIL
// ============================================================
async function openEventDetail(id) {
  try {
    const ev = await api('GET', `/events/${id}`);
    document.getElementById('detailTitle').textContent = ev.title;
    const pct = Math.min(Math.round((ev.registered / ev.seats) * 100), 100);
    const isFull = ev.registered >= ev.seats;
    const alreadyReg = currentUser?.registeredEvents?.some(r => (r._id || r) === id);
    const photo = getEventPhoto(ev);
    document.getElementById('eventDetailBody').innerHTML = `
      <div class="event-detail-banner event-detail-photo">
        <img src="${photo}" alt="${ev.title}"
          onerror="this.parentElement.classList.add('cat-${ev.category}');this.style.display='none';this.nextElementSibling.style.display='flex'"/>
        <div class="event-photo-fallback cat-${ev.category}" style="display:none;height:100%;align-items:center;justify-content:center;font-size:4rem">${ev.icon}</div>
        <div class="event-photo-overlay"></div>
        <div class="event-detail-photo-title">
          <span class="event-category-badge" style="position:relative;top:auto;left:auto">${ev.category}</span>
          <h2>${ev.title}</h2>
        </div>
      </div>
      <div class="event-detail-info">
        <div class="detail-item"><label>Date</label><span>${formatDate(ev.date)}</span></div>
        <div class="detail-item"><label>Time</label><span>${formatTime(ev.time)}</span></div>
        <div class="detail-item"><label>Venue</label><span>${ev.venue}</span></div>
        <div class="detail-item"><label>Organizer</label><span>${ev.organizer}</span></div>
        <div class="detail-item"><label>Category</label><span style="text-transform:capitalize">${ev.category}</span></div>
        <div class="detail-item"><label>Fee</label><span>${ev.fee}</span></div>
      </div>
      <p class="event-detail-desc">${ev.desc}</p>
      <div style="margin-bottom:1.5rem">
        <div style="display:flex;justify-content:space-between;font-size:.85rem;color:var(--muted);margin-bottom:8px">
          <span>Registrations</span><span>${ev.registered}/${ev.seats} (${pct}%)</span>
        </div>
        <div style="background:var(--bg3);border-radius:50px;height:8px;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:${pct>80?'#f5576c':pct>50?'#fee140':'#43e97b'};border-radius:50px"></div>
        </div>
      </div>
      <div class="countdown-box" style="margin-bottom:1.5rem">
        <i class="fas fa-hourglass-half"></i>
        <span>Starts in: </span>
        <span class="countdown-timer">${getCountdown(ev.date, ev.time)}</span>
      </div>
      <button class="btn-hero-primary" style="width:100%;justify-content:center"
        onclick="registerEvent('${ev._id}');closeModal('eventDetailModal')"
        ${isFull || alreadyReg ? 'disabled style="opacity:.5;cursor:not-allowed"' : ''}>
        ${alreadyReg ? '✅ Already Registered' : isFull ? '🔴 Full' : '🎟 Register Now'}
      </button>`;
    openModal('eventDetailModal');
  } catch (err) {
    showToast('❌ ' + err.message, 'error');
  }
}

// ============================================================
// ANNOUNCEMENTS
// ============================================================
async function loadAnnouncements() {
  try {
    announcements = await api('GET', '/announcements');
    renderAnnouncements();
  } catch (err) {
    console.error('Announcements load failed:', err.message);
  }
}

function renderAnnouncements() {
  const list = document.getElementById('announcementsList');
  const icons = { info:'fa-info-circle', warning:'fa-exclamation-triangle', success:'fa-check-circle' };
  if (!announcements.length) {
    list.innerHTML = '<p style="color:var(--muted);text-align:center;padding:2rem">No announcements yet.</p>';
    return;
  }
  list.innerHTML = announcements.map(a => `
    <div class="ann-card ${a.type}" id="ann-${a._id}">
      <div class="ann-icon"><i class="fas ${icons[a.type] || 'fa-info-circle'}"></i></div>
      <div class="ann-content">
        <h4>${a.title}</h4>
        <p>${a.body}</p>
        <div class="ann-meta">
          <i class="fas fa-user"></i> ${a.author} &nbsp;·&nbsp;
          <i class="fas fa-calendar"></i> ${new Date(a.createdAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}
        </div>
      </div>
      ${currentUser?.role === 'admin' ? `<button class="ann-delete" onclick="deleteAnnouncement('${a._id}')"><i class="fas fa-trash"></i></button>` : ''}
    </div>`).join('');
}

async function addAnnouncement(e) {
  e.preventDefault();
  try {
    await api('POST', '/announcements', {
      title: document.getElementById('annTitle').value,
      body:  document.getElementById('annBody').value,
      type:  document.getElementById('annType').value
    });
    e.target.reset();
    await loadAnnouncements();
    showToast('📢 Announcement posted!', 'success');
  } catch (err) {
    showToast('❌ ' + err.message, 'error');
  }
}

async function deleteAnnouncement(id) {
  try {
    await api('DELETE', `/announcements/${id}`);
    await loadAnnouncements();
    showToast('🗑 Deleted.', 'info');
  } catch (err) {
    showToast('❌ ' + err.message, 'error');
  }
}

// ============================================================
// GALLERY
// ============================================================
async function loadGallery() {
  try {
    const items = await api('GET', '/gallery');
    const grid = document.getElementById('galleryGrid');
    // Keep the default gradient items, append DB items
    items.forEach(item => {
      const div = document.createElement('div');
      div.className = 'gallery-item';
      div.innerHTML = `
        <img src="http://localhost:5000${item.imageUrl}" alt="${item.label}" style="width:100%;height:100%;object-fit:cover"/>
        <div class="gallery-overlay"><span>${item.label}</span></div>
        ${currentUser?.role === 'admin' ? `<button class="gallery-delete" onclick="deleteGalleryItem('${item._id}',this)"><i class="fas fa-trash"></i></button>` : ''}`;
      grid.appendChild(div);
    });
  } catch (err) {
    console.error('Gallery load failed:', err.message);
  }
}

async function handleGalleryUpload(e) {
  const files = Array.from(e.target.files);
  for (const file of files) {
    const fd = new FormData();
    fd.append('image', file);
    fd.append('label', file.name.replace(/\.[^.]+$/, ''));
    try {
      const item = await api('POST', '/gallery', fd, true);
      const grid = document.getElementById('galleryGrid');
      const div = document.createElement('div');
      div.className = 'gallery-item';
      div.innerHTML = `
        <img src="http://localhost:5000${item.imageUrl}" alt="${item.label}" style="width:100%;height:100%;object-fit:cover"/>
        <div class="gallery-overlay"><span>${item.label}</span></div>
        ${currentUser?.role === 'admin' ? `<button class="gallery-delete" onclick="deleteGalleryItem('${item._id}',this)"><i class="fas fa-trash"></i></button>` : ''}`;
      grid.appendChild(div);
    } catch (err) {
      showToast('❌ Upload failed: ' + err.message, 'error');
    }
  }
  showToast(`📸 ${files.length} photo(s) uploaded!`, 'success');
}

async function deleteGalleryItem(id, btn) {
  try {
    await api('DELETE', `/gallery/${id}`);
    btn.closest('.gallery-item').remove();
    showToast('🗑 Photo removed.', 'info');
  } catch (err) {
    showToast('❌ ' + err.message, 'error');
  }
}

// ============================================================
// AUTH
// ============================================================
async function handleLogin(e) {
  e.preventDefault();
  try {
    const data = await api('POST', '/auth/login', {
      email:    document.getElementById('loginEmail').value,
      password: document.getElementById('loginPass').value
    });
    token = data.token;
    currentUser = data.user;
    localStorage.setItem('ce_token', token);
    closeModal('loginModal');
    updateNavForUser();
    await loadAnnouncements();
    if (currentUser.role === 'admin') document.getElementById('addAnnouncementCard').style.display = 'block';
    if (currentUser.role !== 'student') document.getElementById('galleryUploadBar').style.display = 'flex';
    showToast(`👋 Welcome back, ${currentUser.name}!`, 'success');
  } catch (err) {
    showToast('❌ ' + err.message, 'error');
  }
}

async function handleRegister(e) {
  e.preventDefault();
  try {
    const data = await api('POST', '/auth/register', {
      name:     document.getElementById('regName').value,
      email:    document.getElementById('regEmail').value,
      password: document.getElementById('regPass').value,
      role:     document.getElementById('regRole').value
    });
    token = data.token;
    currentUser = data.user;
    localStorage.setItem('ce_token', token);
    closeModal('registerModal');
    updateNavForUser();
    if (currentUser.role === 'admin') document.getElementById('addAnnouncementCard').style.display = 'block';
    if (currentUser.role !== 'student') document.getElementById('galleryUploadBar').style.display = 'flex';
    showToast(`🎉 Welcome, ${currentUser.name}!`, 'success');
  } catch (err) {
    showToast('❌ ' + err.message, 'error');
  }
}

function logout() {
  token = null;
  currentUser = null;
  localStorage.removeItem('ce_token');
  updateNavForUser();
  document.getElementById('addAnnouncementCard').style.display = 'none';
  document.getElementById('galleryUploadBar').style.display = 'none';
  loadAnnouncements();
  showToast('👋 Logged out.', 'info');
}

function updateNavForUser() {
  const actions = document.getElementById('navActions');
  if (currentUser) {
    actions.innerHTML = `
      <button class="btn-outline btn-sm" onclick="openProfile()"><i class="fas fa-user-circle"></i> ${currentUser.name.split(' ')[0]}</button>
      ${currentUser.role === 'admin' ? `<button class="btn-primary btn-sm" onclick="openAdmin()"><i class="fas fa-tachometer-alt"></i> Admin</button>` : ''}
      <button class="btn-danger btn-sm" onclick="logout()"><i class="fas fa-sign-out-alt"></i></button>`;
  } else {
    actions.innerHTML = `
      <button class="btn-outline" onclick="openModal('loginModal')">Login</button>
      <button class="btn-primary" onclick="openModal('registerModal')">Register</button>`;
  }
}

// ============================================================
// PROFILE
// ============================================================
async function openProfile() {
  if (!currentUser) return;
  try {
    const user = await api('GET', '/users/profile');
    const myEvents = user.registeredEvents || [];
    document.getElementById('profileBody').innerHTML = `
      <div class="profile-header">
        <div class="profile-avatar">${user.name.charAt(0).toUpperCase()}</div>
        <div class="profile-info">
          <h3>${user.name}</h3>
          <p>${user.email}</p>
          <span class="profile-badge">${user.role}</span>
        </div>
      </div>
      <div class="profile-stats">
        <div class="profile-stat"><div class="num">${myEvents.length}</div><div class="lbl">Registered</div></div>
        <div class="profile-stat"><div class="num">${new Date(user.createdAt).getFullYear()}</div><div class="lbl">Joined</div></div>
        <div class="profile-stat"><div class="num">${user.role === 'admin' ? '👑' : user.role === 'organizer' ? '🎯' : '🎓'}</div><div class="lbl">Role</div></div>
      </div>
      <div class="profile-events">
        <h4><i class="fas fa-ticket-alt" style="color:var(--primary);margin-right:8px"></i>My Registered Events</h4>
        ${myEvents.length ? myEvents.map(ev => `
          <div class="profile-event-item">
            <span class="pe-icon">${ev.icon}</span>
            <div class="pe-info">
              <div class="pe-title">${ev.title}</div>
              <div class="pe-meta">${formatDate(ev.date)} · ${ev.venue}</div>
            </div>
            <span class="pe-badge">Registered</span>
          </div>`).join('') :
          `<p style="color:var(--muted);text-align:center;padding:2rem">No events yet.
            <a onclick="closeModal('profileModal');smoothScroll('events')" style="color:var(--primary);cursor:pointer">Browse events →</a>
          </p>`}
      </div>`;
    openModal('profileModal');
  } catch (err) {
    showToast('❌ ' + err.message, 'error');
  }
}

// ============================================================
// ADMIN DASHBOARD
// ============================================================
async function openAdmin() {
  await renderAdminDashboard('events');
  openModal('adminModal');
}

async function renderAdminDashboard(tab) {
  try {
    const [stats, allEvents, allAnnouncements, allUsers] = await Promise.all([
      api('GET', '/users/stats'),
      api('GET', '/events'),
      api('GET', '/announcements'),
      api('GET', '/users')
    ]);

    document.getElementById('adminBody').innerHTML = `
      <div class="admin-stats">
        <div class="admin-stat-card"><div class="a-icon">📅</div><div class="a-num">${stats.totalEvents}</div><div class="a-lbl">Total Events</div></div>
        <div class="admin-stat-card"><div class="a-icon">👥</div><div class="a-num">${stats.totalRegistrations}</div><div class="a-lbl">Registrations</div></div>
        <div class="admin-stat-card"><div class="a-icon">🧑‍🎓</div><div class="a-num">${stats.totalUsers}</div><div class="a-lbl">Users</div></div>
        <div class="admin-stat-card"><div class="a-icon">📢</div><div class="a-num">${stats.totalAnnouncements}</div><div class="a-lbl">Announcements</div></div>
      </div>
      <div class="admin-tabs">
        <button class="admin-tab ${tab==='events'?'active':''}" onclick="renderAdminDashboard('events')">Events</button>
        <button class="admin-tab ${tab==='users'?'active':''}" onclick="renderAdminDashboard('users')">Users</button>
        <button class="admin-tab ${tab==='announcements'?'active':''}" onclick="renderAdminDashboard('announcements')">Announcements</button>
      </div>
      ${tab === 'events' ? renderAdminEventsTable(allEvents) :
        tab === 'users'  ? renderAdminUsersTable(allUsers) :
        renderAdminAnnouncementsTable(allAnnouncements)}`;
  } catch (err) {
    showToast('❌ ' + err.message, 'error');
  }
}

function renderAdminEventsTable(evList) {
  return `<div class="admin-table-wrap"><table class="admin-table">
    <thead><tr><th>Event</th><th>Category</th><th>Date</th><th>Registrations</th><th>Fee</th><th>Action</th></tr></thead>
    <tbody>${evList.map(ev => `<tr>
      <td><span style="margin-right:8px">${ev.icon}</span>${ev.title}</td>
      <td style="text-transform:capitalize;color:var(--muted)">${ev.category}</td>
      <td>${formatDate(ev.date)}</td>
      <td><span style="color:${ev.registered>=ev.seats?'#f5576c':'#43e97b'};font-weight:700">${ev.registered}</span>/<span style="color:var(--muted)">${ev.seats}</span></td>
      <td>${ev.fee}</td>
      <td><button class="btn-danger" onclick="adminDeleteEvent('${ev._id}')"><i class="fas fa-trash"></i></button></td>
    </tr>`).join('')}</tbody>
  </table></div>`;
}

function renderAdminUsersTable(users) {
  return `<div class="admin-table-wrap"><table class="admin-table">
    <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th>Action</th></tr></thead>
    <tbody>${users.map(u => `<tr>
      <td>${u.name}</td>
      <td style="color:var(--muted)">${u.email}</td>
      <td><span class="profile-badge" style="font-size:.75rem">${u.role}</span></td>
      <td style="color:var(--muted)">${new Date(u.createdAt).toLocaleDateString('en-IN')}</td>
      <td><button class="btn-danger" onclick="adminDeleteUser('${u._id}')"><i class="fas fa-trash"></i></button></td>
    </tr>`).join('')}</tbody>
  </table></div>`;
}

function renderAdminAnnouncementsTable(list) {
  return `<div class="admin-table-wrap"><table class="admin-table">
    <thead><tr><th>Title</th><th>Type</th><th>Author</th><th>Date</th><th>Action</th></tr></thead>
    <tbody>${list.map(a => `<tr>
      <td>${a.title}</td>
      <td style="text-transform:capitalize;color:var(--muted)">${a.type}</td>
      <td>${a.author}</td>
      <td style="color:var(--muted)">${new Date(a.createdAt).toLocaleDateString('en-IN')}</td>
      <td><button class="btn-danger" onclick="adminDeleteAnn('${a._id}')"><i class="fas fa-trash"></i></button></td>
    </tr>`).join('')}</tbody>
  </table></div>`;
}

async function adminDeleteEvent(id) {
  if (!confirm('Delete this event?')) return;
  try {
    await api('DELETE', `/events/${id}`);
    await loadEvents();
    await renderAdminDashboard('events');
    showToast('🗑 Event deleted.', 'info');
  } catch (err) { showToast('❌ ' + err.message, 'error'); }
}

async function adminDeleteUser(id) {
  if (!confirm('Delete this user?')) return;
  try {
    await api('DELETE', `/users/${id}`);
    await renderAdminDashboard('users');
    showToast('🗑 User deleted.', 'info');
  } catch (err) { showToast('❌ ' + err.message, 'error'); }
}

async function adminDeleteAnn(id) {
  try {
    await api('DELETE', `/announcements/${id}`);
    await loadAnnouncements();
    await renderAdminDashboard('announcements');
    showToast('🗑 Deleted.', 'info');
  } catch (err) { showToast('❌ ' + err.message, 'error'); }
}

// ============================================================
// COUNTDOWN TIMERS
// ============================================================
function getCountdown(date, time) {
  const target = new Date(`${date}T${time}:00`);
  const diff = target - new Date();
  if (diff <= 0) return '🔴 Event Started';
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `⚡ ${m}m ${s}s`;
}

function updateAllCountdowns() {
  events.forEach(ev => {
    const el = document.getElementById(`cd-${ev._id}`);
    if (el) {
      const val = getCountdown(ev.date, ev.time);
      el.textContent = val;
      el.classList.toggle('urgent', val.startsWith('⚡'));
    }
  });
}

// ============================================================
// CATEGORY COUNTS
// ============================================================
function updateCategoryCounts() {
  ['technical','cultural','sports','workshop','seminar'].forEach(cat => {
    const el = document.getElementById(`cnt-${cat}`);
    if (el) el.textContent = `${events.filter(e => e.category === cat).length} Events`;
  });
}

function renderTrending() {
  const sorted = [...events].sort((a, b) => b.registered - a.registered).slice(0, 4);
  const el = document.getElementById('trendingList');
  if (!el) return;
  el.innerHTML = sorted.map(ev => `
    <div class="trending-item" onclick="openEventDetail('${ev._id}')">
      <span class="t-icon">${ev.icon}</span>
      <div class="t-info">
        <div class="t-title">${ev.title}</div>
        <div class="t-meta">${formatDate(ev.date)}</div>
      </div>
      <span class="t-reg">${ev.registered} reg</span>
    </div>`).join('');
}

// ============================================================
// MODALS
// ============================================================
function openModal(id)  { document.getElementById(id).classList.add('active'); document.body.style.overflow = 'hidden'; }
function closeModal(id) { document.getElementById(id).classList.remove('active'); document.body.style.overflow = ''; }
function closeModalOutside(e, id) { if (e.target.id === id) closeModal(id); }
function switchModal(from, to) { closeModal(from); setTimeout(() => openModal(to), 200); }

// ============================================================
// CONTACT
// ============================================================
function submitContact(e) {
  e.preventDefault();
  e.target.reset();
  showToast('📨 Message sent! We\'ll get back to you soon.', 'success');
}

// ============================================================
// TOAST
// ============================================================
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast ${type} show`;
  setTimeout(() => t.classList.remove('show'), 3500);
}

// ============================================================
// STATS ANIMATION
// ============================================================
function animateStats() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseInt(el.dataset.target);
      let current = 0;
      const step = target / 60;
      const timer = setInterval(() => {
        current = Math.min(current + step, target);
        el.textContent = Math.floor(current) + '+';
        if (current >= target) clearInterval(timer);
      }, 25);
      observer.unobserve(el);
    });
  }, { threshold: 0.5 });
  document.querySelectorAll('.stat-num').forEach(n => observer.observe(n));
}

// ============================================================
// NAV
// ============================================================
function initNavScroll() {
  window.addEventListener('scroll', () => {
    document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 50);
    const sections = ['home','announcements','events','categories','gallery','contact'];
    let current = '';
    sections.forEach(id => {
      const el = document.getElementById(id);
      if (el && window.scrollY >= el.offsetTop - 100) current = id;
    });
    document.querySelectorAll('.nav-links a').forEach(a =>
      a.classList.toggle('active', a.getAttribute('href') === `#${current}`)
    );
  });
}

function toggleMenu() { document.getElementById('navLinks').classList.toggle('open'); }
function smoothScroll(id) { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); }

// ============================================================
// THEME TOGGLE
// ============================================================
function toggleTheme() {
  const isLight = document.body.classList.toggle('light');
  localStorage.setItem('ce_theme', isLight ? 'light' : 'dark');
}

// Apply saved theme on load
(function () {
  if (localStorage.getItem('ce_theme') === 'light') {
    document.body.classList.add('light');
  }
})();

// ============================================================
// HELPERS
// ============================================================
function formatDate(d) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' });
}
function formatTime(t) {
  const [h, m] = t.split(':');
  const hr = parseInt(h);
  return `${hr > 12 ? hr - 12 : hr || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
}
function setMinDate() {
  const d = document.getElementById('evDate');
  if (d) d.min = new Date().toISOString().split('T')[0];
}
