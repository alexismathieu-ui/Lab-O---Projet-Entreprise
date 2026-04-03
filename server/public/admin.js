//─ AUTH
  let user = null;
  try { user = JSON.parse(localStorage.getItem('pulse_user') || 'null'); } catch(e) {}
  if (!user || user.role !== 'admin') { window.location.replace('/'); }
  document.getElementById('sidebar-email').textContent = user?.email || 'admin';

  function logout() {
    localStorage.removeItem('pulse_user');
    window.location.replace('/');
  }

  //─ SOCKET
  const socket = io();
  socket.on('new-post', () => { loadBadges(); if (currentPanel === 'posts') loadPosts(currentPostFilter); });
  socket.on('post-updated', () => { if (currentPanel === 'posts') loadPosts(currentPostFilter); });
  socket.on('post-deleted', () => { if (currentPanel === 'posts') loadPosts(currentPostFilter); });
  socket.on('wall-cleared', () => { toast('Mur vidé !', 'success'); loadLoopStatus(); });
  socket.on('media-updated', () => { if (currentPanel === 'medias') loadMedias(); loadLoopStatus(); });
  socket.on('alert', (a) => { toast('🚨 Alerte active : ' + a.message); loadAlertStatus(); });
  socket.on('alert-cleared', () => { loadAlertStatus(); });
  socket.on('question-updated', () => { if (currentPanel === 'question') loadQuestion(); });

  //─ NAVIGATION
  let currentPanel = 'dashboard';

  const panelTitles = {
    dashboard: 'Vue d\'ensemble',
    posts: 'Gérer les posts',
    annonces: 'Gérer les annonces',
    medias: 'Gestionnaire de médias',
    coworkers: 'Trombinoscope',
    question: 'Question du jour / Chat',
    direct: 'Contrôle du direct',
  };

  const panelActions = {
    coworkers: `<button class="btn btn-primary btn-sm" onclick="openCoworkerModal()">+ Ajouter</button>`,
    annonces: `<button class="btn btn-primary btn-sm" onclick="openAnnonceModal()">+ Créer une annonce</button>`,
  };

  function showPanel(name) {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById('panel-' + name).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => {
      if (n.getAttribute('onclick')?.includes(`'${name}'`)) n.classList.add('active');
    });
    document.getElementById('panel-title').textContent = panelTitles[name] || name;
    document.getElementById('topbar-actions').innerHTML = panelActions[name] || '';
    currentPanel = name;

    if (name === 'dashboard') { loadLoopStatus(); loadStats(); }
    if (name === 'posts') loadPosts(currentPostFilter);
    if (name === 'annonces') loadAnnonces(currentAnnonceFilter);
    if (name === 'medias') loadMedias();
    if (name === 'coworkers') loadCoworkers();
    if (name === 'question') loadQuestion();
    if (name === 'direct') loadAlertStatus();
  }

  //─ TOAST─
  function toast(msg, type = '') {
    const el = document.createElement('div');
    el.className = 'toast-item ' + type;
    el.textContent = msg;
    document.getElementById('toast').appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }

  //─ API HELPER
  async function api(method, url, body) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    return res.json();
  }

  //─ STATS & LOOP
  async function loadStats() {
    const data = await api('GET', '/api/loop/status');
    document.getElementById('stat-posts').textContent = data.posts ?? '—';
    document.getElementById('stat-medias').textContent = data.medias ?? '—';
    document.getElementById('stat-coworkers').textContent = data.coworkers ?? '—';
    // Pending badges
    loadBadges();
  }

  async function loadBadges() {
    const posts = await api('GET', '/api/posts?status=pending');
    const annonces = await api('GET', '/api/annonces?status=pending');
    const pb = Array.isArray(posts) ? posts.length : 0;
    const ab = Array.isArray(annonces) ? annonces.length : 0;
    document.getElementById('badge-posts').textContent = pb;
    document.getElementById('badge-annonces').textContent = ab;
    document.getElementById('stat-posts').textContent = pb;
    if (document.getElementById('stat-annonces')) document.getElementById('stat-annonces').textContent = ab;
  }

  async function loadLoopStatus() {
    const data = await api('GET', '/api/loop/status');
    const el = document.getElementById('loop-items');
    const chips = [];

    chips.push(`<span class="loop-chip ${data.posts > 0 ? 'on' : ''}"><span class="loop-dot"></span>Wall Social (${data.posts} posts)</span>`);
    chips.push(`<span class="loop-chip ${data.medias > 0 ? 'on' : ''}"><span class="loop-dot"></span>Médias (${data.medias} fichiers)</span>`);
    chips.push(`<span class="loop-chip ${data.coworkers > 0 ? 'on' : ''}"><span class="loop-dot"></span>Trombinoscope (${data.coworkers} profils)</span>`);
    if (data.alert) chips.push(`<span class="loop-chip on" style="color:#ff6b6b"><span class="loop-dot"></span>🚨 ALERTE ACTIVE</span>`);
    if (data.question) chips.push(`<span class="loop-chip on"><span class="loop-dot"></span>${data.question.mode === 'chat' ? '💬 Chat' : '❓ Question'}</span>`);

    el.innerHTML = chips.join('');
  }

  //─ POSTS─
  let currentPostFilter = 'pending';

  function filterPosts(status, tab) {
    currentPostFilter = status;
    document.querySelectorAll('#panel-posts .tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    loadPosts(status);
  }

  async function loadPosts(status = '') {
    const url = status ? `/api/posts?status=${status}` : '/api/posts';
    const posts = await api('GET', url);
    const el = document.getElementById('posts-list');

    if (!Array.isArray(posts) || posts.length === 0) {
      el.innerHTML = '<div class="empty"><div class="empty-icon">💬</div><p>Aucun post dans cette catégorie</p></div>';
      return;
    }

    el.innerHTML = posts.map(p => `
      <div class="post-item" id="post-${p._id}">
        <div class="post-body">
          <div class="post-text">${escHtml(p.text)}</div>
          <div class="post-meta">
            <span class="status-badge status-${p.status}">${statusLabel(p.status)}</span>
            <span class="cat-badge">${p.category}</span>
            <span>✍️ ${escHtml(p.author)}</span>
            <span>🕐 ${formatDate(p.createdAt)}</span>
          </div>
        </div>
        <div class="post-actions">
          ${p.status !== 'approved' ? `<button class="btn btn-sm" style="background:var(--green-bg);color:var(--green);border:1px solid #b8e8cc" onclick="moderatePost('${p._id}','approved')">✓ Approuver</button>` : ''}
          ${p.status !== 'rejected' ? `<button class="btn btn-sm btn-danger" onclick="moderatePost('${p._id}','rejected')">✗ Rejeter</button>` : ''}
          <button class="btn btn-sm btn-ghost btn-icon" onclick="deletePost('${p._id}')" title="Supprimer">🗑</button>
        </div>
      </div>
    `).join('');
  }

  async function moderatePost(id, status) {
    await api('PATCH', `/api/posts/${id}`, { status });
    toast(status === 'approved' ? '✓ Post approuvé' : '✗ Post rejeté', status === 'approved' ? 'success' : '');
    loadPosts(currentPostFilter);
    loadBadges();
  }

  async function deletePost(id) {
    if (!confirm('Supprimer ce post ?')) return;
    await api('DELETE', `/api/posts/${id}`);
    toast('Post supprimé');
    loadPosts(currentPostFilter);
    loadBadges();
  }

  async function clearWall() {
    if (!confirm('Vider tous les posts du mur ? Ils passeront à "rejeté".')) return;
    await api('POST', '/api/posts/clear-wall');
    toast('🗑 Mur vidé !', 'success');
    loadLoopStatus();
  }

  //─ ANNONCES
  let currentAnnonceFilter = 'pending';

  function filterAnnonces(status, tab) {
    currentAnnonceFilter = status;
    document.querySelectorAll('#panel-annonces .tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    loadAnnonces(status);
  }

  async function loadAnnonces(status = '') {
    const url = status ? `/api/annonces?status=${status}` : '/api/annonces';
    const annonces = await api('GET', url);
    const el = document.getElementById('annonces-list');

    if (!Array.isArray(annonces) || annonces.length === 0) {
      el.innerHTML = '<div class="empty"><div class="empty-icon">📌</div><p>Aucune annonce</p></div>';
      return;
    }

    el.innerHTML = annonces.map(a => `
      <div class="post-item">
        <div class="post-body">
          <div class="post-text"><strong>${escHtml(a.title)}</strong></div>
          <div class="post-text" style="font-size:.8rem;margin-top:.25rem">${escHtml(a.description)}</div>
          <div class="post-meta">
            <span class="status-badge status-${a.status}">${statusLabel(a.status)}</span>
            <span>✍️ ${escHtml(a.author)}</span>
            <span>🕐 ${formatDate(a.createdAt)}</span>
          </div>
        </div>
        <div class="post-actions">
          ${a.status !== 'approved' ? `<button class="btn btn-sm" style="background:var(--green-bg);color:var(--green);border:1px solid #b8e8cc" onclick="moderateAnnonce('${a._id}','approved')">✓</button>` : ''}
          ${a.status !== 'rejected' ? `<button class="btn btn-sm btn-danger" onclick="moderateAnnonce('${a._id}','rejected')">✗</button>` : ''}
          <button class="btn btn-sm btn-ghost btn-icon" onclick="deleteAnnonce('${a._id}')">🗑</button>
        </div>
      </div>
    `).join('');
  }

  async function moderateAnnonce(id, status) {
    await api('PATCH', `/api/annonces/${id}`, { status });
    toast(status === 'approved' ? '✓ Annonce approuvée' : '✗ Annonce rejetée', status === 'approved' ? 'success' : '');
    loadAnnonces(currentAnnonceFilter);
    loadBadges();
  }

  async function deleteAnnonce(id) {
    if (!confirm('Supprimer cette annonce ?')) return;
    await api('DELETE', `/api/annonces/${id}`);
    toast('Annonce supprimée');
    loadAnnonces(currentAnnonceFilter);
  }

  function openAnnonceModal() {
    // Formulaire inline rapide
    const title = prompt('Titre de l\'annonce :');
    if (!title) return;
    const description = prompt('Description :');
    if (!description) return;
    api('POST', '/api/annonces', { title, description, author: user.email, status: 'approved' })
      .then(() => { toast('Annonce créée', 'success'); loadAnnonces(currentAnnonceFilter); });
  }

  //─ MÉDIAS
  let dragSrcIndex = null;

  async function loadMedias() {
    const medias = await api('GET', '/api/medias');
    const el = document.getElementById('media-list');

    if (!Array.isArray(medias) || medias.length === 0) {
      el.innerHTML = '<div class="empty"><div class="empty-icon">🗂</div><p>Aucun média uploadé</p></div>';
      return;
    }

    el.innerHTML = medias.map((m, i) => `
      <div class="media-item" draggable="true" data-id="${m._id}" data-index="${i}"
        ondragstart="dragStart(event,${i})" ondragover="dragOver(event)" ondrop="dragDrop(event,${i})" ondragleave="dragLeave(event)">
        <span class="media-drag">⠿</span>
        <span class="media-icon">${m.type === 'pdf' ? '📄' : '🖼'}</span>
        <div class="media-info">
          <div class="media-name">${escHtml(m.originalName)}</div>
          <div class="media-type">${m.type.toUpperCase()}</div>
        </div>
        <div class="media-duration">
          <input type="number" value="${m.duration}" min="5" max="120"
            onchange="updateDuration('${m._id}',this.value)"> s
        </div>
        <div class="media-actions">
          <a href="/uploads/${m.filename}" target="_blank" class="btn btn-sm btn-ghost btn-icon">👁</a>
          <button class="btn btn-sm btn-danger btn-icon" onclick="deleteMedia('${m._id}')">🗑</button>
        </div>
      </div>
    `).join('');
  }

  function dragStart(e, i) { dragSrcIndex = i; e.target.classList.add('dragging'); }
  function dragOver(e) { e.preventDefault(); }
  function dragLeave(e) { e.target.closest?.('.media-item')?.classList.remove('over'); }

  async function dragDrop(e, targetIndex) {
    e.preventDefault();
    if (dragSrcIndex === null || dragSrcIndex === targetIndex) return;
    const medias = await api('GET', '/api/medias');
    const arr = [...medias];
    const [moved] = arr.splice(dragSrcIndex, 1);
    arr.splice(targetIndex, 0, moved);
    const order = arr.map((m, i) => ({ id: m._id, order: i }));
    await api('PATCH', '/api/medias/reorder', { order });
    toast('Ordre mis à jour', 'success');
    loadMedias();
  }

  async function uploadFile(input) {
    const file = input.files[0];
    if (!file) return;
    const duration = document.getElementById('upload-duration').value;
    const progress = document.getElementById('upload-progress');
    progress.style.display = 'block';

    const formData = new FormData();
    formData.append('file', file);
    formData.append('duration', duration);

    try {
      const res = await fetch('/api/medias/upload', { method: 'POST', body: formData });
      const data = await res.json();
      progress.style.display = 'none';
      input.value = '';
      if (data._id) {
        toast('✅ Fichier uploadé !', 'success');
        loadMedias();
      } else {
        toast('❌ ' + (data.message || 'Erreur upload'));
      }
    } catch {
      progress.style.display = 'none';
      toast('❌ Erreur upload');
    }
  }

  async function updateDuration(id, val) {
    await api('PATCH', `/api/medias/${id}`, { duration: parseInt(val) });
    toast('Durée mise à jour', 'success');
  }

  async function deleteMedia(id) {
    if (!confirm('Supprimer ce média ?')) return;
    await api('DELETE', `/api/medias/${id}`);
    toast('Média supprimé');
    loadMedias();
  }

  // Drag & drop sur la zone d'upload
  const zone = document.getElementById('upload-zone');
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag');
    const file = e.dataTransfer.files[0];
    if (file) {
      const dt = new DataTransfer();
      dt.items.add(file);
      document.getElementById('file-input').files = dt.files;
      uploadFile(document.getElementById('file-input'));
    }
  });

  //─ COWORKERS─
  async function loadCoworkers() {
    const coworkers = await api('GET', '/api/coworkers');
    const el = document.getElementById('coworkers-grid');

    if (!Array.isArray(coworkers) || coworkers.length === 0) {
      el.innerHTML = '<div class="empty" style="grid-column:1/-1"><div class="empty-icon">👥</div><p>Aucun coworker — ajoutez-en avec le bouton +</p></div>';
      return;
    }

    el.innerHTML = coworkers.map(c => `
      <div class="coworker-card">
        <div class="coworker-avatar">${c.logo ? `<img src="${escHtml(c.logo)}" style="width:100%;height:100%;object-fit:contain;border-radius:8px">` : '🏢'}</div>
        <div class="coworker-name">${escHtml(c.company)}</div>
        <div class="coworker-company">CEO : ${escHtml(c.name)}</div>
        <div class="coworker-floor">${escHtml(c.floor)}</div>
        <div class="coworker-actions">
          <button class="btn btn-sm btn-secondary" onclick="openCoworkerModal('${c._id}','${escAttr(c.name)}','${escAttr(c.company)}','${escAttr(c.floor)}','${escAttr(c.contact)}','${escAttr(c.website)}','${escAttr(c.bio)}')">✏️ Modifier</button>
          <button class="btn btn-sm btn-danger" onclick="deleteCoworker('${c._id}')">🗑</button>
        </div>
      </div>
    `).join('');
  }

  function openCoworkerModal(id='',name='',company='',floor='',contact='',website='',bio='') {
    document.getElementById('coworker-id').value = id;
    document.getElementById('coworker-name').value = name;
    document.getElementById('coworker-company').value = company;
    document.getElementById('coworker-floor').value = floor;
    document.getElementById('coworker-contact').value = contact;
    document.getElementById('coworker-website').value = website;
    document.getElementById('coworker-bio').value = bio;
    document.getElementById('modal-coworker-title').textContent = id ? 'Modifier le coworker' : 'Ajouter un coworker';
    document.getElementById('modal-coworker').classList.add('open');
  }

  function closeModal(id) { document.getElementById(id).classList.remove('open'); }

  async function saveCoworker() {
    const id = document.getElementById('coworker-id').value;
    const body = {
      name: document.getElementById('coworker-name').value.trim(),
      company: document.getElementById('coworker-company').value.trim(),
      floor: document.getElementById('coworker-floor').value.trim(),
      contact: document.getElementById('coworker-contact').value.trim(),
      website: document.getElementById('coworker-website').value.trim(),
      bio: document.getElementById('coworker-bio').value.trim(),
    };
    if (!body.name) { toast('Le nom est requis'); return; }

    if (id) await api('PATCH', `/api/coworkers/${id}`, body);
    else await api('POST', '/api/coworkers', body);

    toast(id ? 'Coworker mis à jour' : 'Coworker ajouté', 'success');
    closeModal('modal-coworker');
    loadCoworkers();
  }

  async function deleteCoworker(id) {
    if (!confirm('Supprimer ce coworker ?')) return;
    await api('DELETE', `/api/coworkers/${id}`);
    toast('Coworker supprimé');
    loadCoworkers();
  }

  //─ QUESTION DU JOUR
  async function loadQuestion() {
    const q = await api('GET', '/api/question');
    const box = document.getElementById('question-current-box');
    if (!q) {
      box.innerHTML = '<div class="question-meta">Aucune question active</div>';
      return;
    }
    box.innerHTML = `
      <div class="question-meta" style="margin-bottom:.5rem">${q.mode === 'chat' ? '💬 Mode Chat' : '❓ Mode Question'}</div>
      <div class="question-current">${escHtml(q.text)}</div>
      <div class="question-meta" style="margin-top:.5rem">${formatDate(q.createdAt)}</div>
      <div class="mode-toggle">
        <button class="mode-btn ${q.mode==='question'?'active':''}" onclick="toggleMode('${q._id}','question')">Question</button>
        <button class="mode-btn ${q.mode==='chat'?'active':''}" onclick="toggleMode('${q._id}','chat')">Chat</button>
      </div>
    `;
  }

  async function saveQuestion() {
    const text = document.getElementById('new-question').value.trim();
    const mode = document.getElementById('question-mode').value;
    if (!text) { toast('Entrez une question'); return; }
    await api('POST', '/api/question', { text, mode });
    toast('Question publiée !', 'success');
    document.getElementById('new-question').value = '';
    loadQuestion();
  }

  async function toggleMode(id, mode) {
    await api('PATCH', `/api/question/${id}`, { mode });
    toast('Mode mis à jour', 'success');
    loadQuestion();
  }

  //─ ALERTE
  async function loadAlertStatus() {
    const alert = await api('GET', '/api/alert');
    const el = document.getElementById('alert-current');
    if (alert && alert.active) {
      el.innerHTML = `<div class="alert-box alert-active"><div class="alert-message">🚨 ${escHtml(alert.message)}</div><div class="alert-status">Alerte en cours de diffusion</div></div>`;
    } else {
      el.innerHTML = `<div class="alert-box"><div class="alert-status" style="color:var(--green)">✅ Aucune alerte active</div></div>`;
    }
  }

  async function sendAlert() {
    const msg = document.getElementById('alert-message').value.trim();
    if (!msg) { toast('Entrez un message d\'alerte'); return; }
    await api('POST', '/api/alert', { message: msg });
    toast('🚨 Alerte diffusée !', 'success');
    document.getElementById('alert-message').value = '';
    loadAlertStatus();
  }

  async function clearAlert() {
    await api('DELETE', '/api/alert');
    toast('Alerte désactivée', 'success');
    loadAlertStatus();
  }

  //─ UTILS─
  function escHtml(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function escAttr(s) { return String(s||'').replace(/'/g,'&#39;').replace(/"/g,'&quot;'); }
  function formatDate(d) { return new Date(d).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}); }
  function statusLabel(s) { return {pending:'En attente',approved:'Approuvé',rejected:'Rejeté'}[s]||s; }

    // ─── MÉTÉO ───────────────────────────────────────────────────────────────────
  async function loadWeather() {
    try {
      const data = await api('GET', '/api/weather');
      const c = data.current;
      const codes = { 0:'☀️ Dégagé', 1:'🌤 Peu nuageux', 2:'⛅ Nuageux', 3:'☁️ Couvert', 45:'🌫 Brouillard', 48:'🌫 Brouillard', 51:'🌦 Bruine', 61:'🌧 Pluie légère', 63:'🌧 Pluie', 71:'❄️ Neige légère', 80:'🌦 Averses', 95:'⛈ Orage' };
      const desc = codes[c.weather_code] || '🌡 ' + c.weather_code;
      document.getElementById('weather-widget').innerHTML = `
        <span>🌡 <strong>${c.temperature_2m}°C</strong></span>
        <span>💨 <strong>${c.wind_speed_10m} km/h</strong></span>
        <span>💧 <strong>${c.relative_humidity_2m}%</strong></span>
        <span>${desc}</span>
      `;
    } catch(e) {
      document.getElementById('weather-widget').innerHTML = '<span style="color:var(--muted)">Météo indisponible</span>';
    }
  }

  loadWeather();
  setInterval(loadWeather, 5 * 60 * 1000); // refresh toutes les 5 min

  //─ INIT
  loadLoopStatus();
  loadStats();
setInterval(() => { loadBadges(); if(currentPanel==='dashboard') loadLoopStatus(); }, 15000);