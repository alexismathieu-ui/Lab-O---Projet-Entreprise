/* ============================================================
   js/drawer.js
   Panel de modération admin (drawer plein écran).
   7 sections navigables via la colonne de droite :
     • Posts       → gérer les diapos startups
     • Annonces    → créer/gérer des slides image (sans vérification)
     • Chat        → modérer les réponses à la question du jour
     • Calendrier  → gérer les évènements
     • Nouveautés  → gérer le ticker (avec vérification pour soumissions QR)
     • Partenaires → gérer les diapos partenaires (avec logos individuels)
     • Questions   → éditer les questions du jour
   Cloche de notification → chat en attente + nouveautés soumises.
   ============================================================ */

/* ────────────────────────────────────────
   OUVERTURE / FERMETURE
──────────────────────────────────────── */

/**
 * toggleDrawer()
 * Ouvre le panel si fermé, le ferme sinon.
 */
function toggleDrawer() {
  document.getElementById('drawer').classList.contains('open')
    ? closeDrawer() : openDrawer();
}

/**
 * openDrawer()
 * Ouvre le panel de modération.
 */
function openDrawer() {
  if (appMode !== 'admin') return;
  draft = JSON.parse(JSON.stringify(D));
  renderDrawerSection(drawerSection);
  updateNotifBadge();
  document.getElementById('drawer').classList.add('open');
  document.getElementById('drwOv').classList.add('open');
}

/**
 * closeDrawer()
 * Ferme le drawer et l'overlay.
 */
function closeDrawer() {
  document.getElementById('drawer').classList.remove('open');
  document.getElementById('drwOv').classList.remove('open');
  const np = document.getElementById('notifPanel');
  if (np) np.classList.remove('open');
}

/**
 * switchSection(section)
 * Change la section active dans le panel.
 * @param {string} section
 */
function switchSection(section) {
  drawerSection = section;
  document.querySelectorAll('.drw-nav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.section === section);
  });
  const np = document.getElementById('notifPanel');
  if (np) np.classList.remove('open');
  renderDrawerSection(section);
}

/* ────────────────────────────────────────
   RENDU DU PANEL
──────────────────────────────────────── */

/**
 * renderDrawerSection(section)
 * Injecte le HTML du panel de modération dans #drwInner.
 * @param {string} section
 */
function renderDrawerSection(section) {
  const inner = document.getElementById('drwInner');
  if (!inner) return;

  const sections = [
    { key: 'posts',       label: 'Gérer les posts' },
    { key: 'annonces',    label: 'Gérer les annonces' },
    { key: 'chat',        label: 'Gérer le chat' },
    { key: 'calendrier',  label: 'Gérer le calendrier' },
    { key: 'news',        label: 'Gérer les nouveautés' },
    { key: 'partenaires', label: 'Gérer les partenaires' },
    { key: 'questions',   label: 'Questions du jour' }
  ];

  inner.innerHTML = `
    <div class="drw-header">
      <div class="drw-title">Modération</div>
      <div class="drw-icons">
        <button class="drw-icon-btn" onclick="toggleNotifPanel()" title="Notifications">
          🔔
          <span class="notif-badge ${countPendingNotifs() > 0 ? 'show' : ''}" id="notifBadge">
            ${countPendingNotifs() > 9 ? '9+' : countPendingNotifs() || ''}
          </span>
        </button>
        <button class="drw-icon-btn" title="Profil admin">👤</button>
        <button id="dClose" onclick="closeDrawer()" title="Fermer">✕</button>
      </div>
    </div>

    <div class="drw-body">
      <div class="drw-list-col">
        <div class="drw-list-toolbar">
          <button class="drw-back-btn" onclick="closeDrawer()" title="Retour">‹</button>
          ${section !== 'chat' && section !== 'questions'
            ? `<button class="btn btn-sm btn-ghost" style="border:1.5px solid var(--red);color:var(--red);display:flex;align-items:center;gap:4px"
                 onclick="openCreateForm('${section}')">
                 <span style="font-size:16px;font-weight:700">+</span> Créer
               </button>`
            : ''}
        </div>
        <div class="drw-list" id="drwList"></div>
      </div>
      <div class="drw-nav-col">
        ${sections.map(s => `
          <button class="drw-nav-btn ${s.key === section ? 'active' : ''}"
            data-section="${s.key}"
            onclick="switchSection('${s.key}')">${s.label}</button>
        `).join('')}
      </div>
    </div>

    <div class="drw-form-overlay" id="drwFormOverlay">
      <div class="drw-form-box">
        <div class="drw-form-header">
          <div class="drw-form-title" id="drwFormTitle">Créer</div>
          <button class="drw-icon-btn" onclick="closeForm()" style="border:none;font-size:14px">✕</button>
        </div>
        <div class="drw-form-body" id="drwFormBody"></div>
        <div class="drw-form-footer">
          <button class="btn btn-red" onclick="submitForm()">✓ Enregistrer</button>
          <button class="btn btn-ghost" onclick="closeForm()">Annuler</button>
        </div>
      </div>
    </div>

    <div class="notif-panel" id="notifPanel">
      <div class="notif-panel-header">
        <div class="notif-panel-title">Notifications</div>
        <button class="drw-icon-btn" onclick="toggleNotifPanel()" style="border:none;font-size:14px">✕</button>
      </div>
      <div class="notif-list" id="notifList"></div>
    </div>
  `;

  renderSectionList(section);
}

/* ────────────────────────────────────────
   RENDU DES LISTES PAR SECTION
──────────────────────────────────────── */

/**
 * renderSectionList(section)
 * Injecte les items de la section dans #drwList.
 * @param {string} section
 */
function renderSectionList(section) {
  const list = document.getElementById('drwList');
  if (!list) return;
  list.innerHTML = '';

  if (section === 'posts') {
    if (!D.startups.length) { list.innerHTML = emptyMsg('Aucune startup. Cliquez sur "+ Créer".'); return; }
    D.startups.forEach((s, i) => {
      list.appendChild(makeItem(s.name || 'Startup ' + (i+1), s.updatedAt || '', i, 'posts'));
    });

  } else if (section === 'annonces') {
    const anns = D.announcements || [];
    if (!anns.length) { list.innerHTML = emptyMsg('Aucune annonce. Cliquez sur "+ Créer".'); return; }
    anns.forEach((a, i) => {
      list.appendChild(makeItem(a.name || 'Annonce ' + (i+1), fmtDate(a.date), i, 'annonces'));
    });

  } else if (section === 'chat') {
    const votes   = D.votes || [];
    const answers = D.pendingAnswers || [];
    const chatItems = answers.filter(a => a.type === 'chat' || !a.type);

    if (!votes.length && !chatItems.length) {
      list.innerHTML = emptyMsg('Aucun message reçu.');
      return;
    }

    /* ── Bloc 1 : messages affichés à l'écran (D.votes) ── */
    if (votes.length) {
      const votesDiv = document.createElement('div');
      votesDiv.innerHTML = `<div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#16a34a;margin-bottom:8px;padding:0 2px">Affichés à l'écran (${votes.length})</div>`;
      votes.forEach((v, i) => {
        const item = makeItem(
          `${h(v.name)} — "${h((v.text || '').substring(0, 40))}${(v.text||'').length > 40 ? '…' : ''}"`,
          '', i, 'chat_vote'
        );
        votesDiv.appendChild(item);
      });
      list.appendChild(votesDiv);
    }

    /* ── Bloc 2 : soumissions en attente de modération ── */
    if (chatItems.length) {
      const pendDiv = document.createElement('div');
      if (votes.length) {
        pendDiv.innerHTML = `<div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--gray);margin:16px 0 8px;padding:0 2px">Soumissions reçues</div>`;
      }
      answers.forEach((a, realIdx) => {
        if (a.type && a.type !== 'chat') return;
        const item = makeItem(
          `${h(a.name)} — "${h((a.text||'').substring(0, 40))}${(a.text||'').length > 40 ? '…' : ''}"`,
          fmtDate(a.date), realIdx, 'chat',
          a.accepted ? 'accepted' : a.rejected ? 'rejected' : 'pending'
        );
        if (!a.accepted && !a.rejected) {
          const actions = item.querySelector('.drw-item-actions');
          actions.innerHTML = `
            <button class="btn-icon btn-icon-edit" onclick="acceptChat(${realIdx})" title="Accepter à l'écran" style="border-color:#16a34a;color:#16a34a">✓</button>
            <button class="btn-icon btn-icon-del"  onclick="rejectChat(${realIdx})" title="Refuser">✕</button>`;
        }
        pendDiv.appendChild(item);
      });
      list.appendChild(pendDiv);
    }

  } else if (section === 'calendrier') {
    if (!D.events.length) { list.innerHTML = emptyMsg('Aucun évènement. Cliquez sur "+ Créer".'); return; }
    D.events.forEach((e, i) => {
      list.appendChild(makeItem(e.title || 'Évènement ' + (i+1), `${e.date || ''} ${e.time ? '· ' + e.time : ''}`, i, 'calendrier'));
    });

  } else if (section === 'news') {
    /* ── Nouveautés validées + en attente ── */
    const items    = D.news || [];
    const pending  = (D.pendingNews || []).filter(n => !n.accepted && !n.rejected);

    if (pending.length) {
      const pendingDiv = document.createElement('div');
      pendingDiv.innerHTML = `<div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--red);margin-bottom:8px;padding:0 2px">En attente de validation (${pending.length})</div>`;
      pending.forEach((n, i) => {
        const realIdx = (D.pendingNews || []).indexOf(n);
        const item = makeItem(h(n.text || ''), fmtDate(n.date), realIdx, 'news_pending', 'pending');
        const actions = item.querySelector('.drw-item-actions');
        actions.innerHTML = `
          <button class="btn-icon btn-icon-edit" onclick="acceptNews(${realIdx})" title="Accepter" style="border-color:#16a34a;color:#16a34a">✓</button>
          <button class="btn-icon btn-icon-del"  onclick="rejectNews(${realIdx})"  title="Refuser">✕</button>`;
        pendingDiv.appendChild(item);
      });
      list.appendChild(pendingDiv);
    }

    if (!items.length && !pending.length) { list.innerHTML = emptyMsg('Aucune nouveauté. Cliquez sur "+ Créer".'); return; }
    if (items.length) {
      const activeDiv = document.createElement('div');
      if (pending.length) {
        activeDiv.innerHTML = `<div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--gray);margin:16px 0 8px;padding:0 2px">Actives dans le bandeau</div>`;
      }
      items.forEach((n, i) => {
        activeDiv.appendChild(makeItem(n, '', i, 'news'));
      });
      list.appendChild(activeDiv);
    }

  } else if (section === 'partenaires') {
    if (!D.partners.length) { list.innerHTML = emptyMsg('Aucun partenaire. Cliquez sur "+ Créer".'); return; }
    D.partners.forEach((p, i) => {
      const names = (p.partners || []).map(x => partnerName(x)).join(', ');
      list.appendChild(makeItem(`${p.emoji || ''} ${p.sector || 'Thématique ' + (i+1)}`, names, i, 'partenaires'));
    });

  } else if (section === 'questions') {
    renderQuestionsList(list);
  }
}

/**
 * makeItem(name, sub, idx, section, status)
 * Crée et retourne un élément de liste (div.drw-item).
 */
function makeItem(name, sub, idx, section, status) {
  const div = document.createElement('div');
  div.className = 'drw-item';
  const badge = status
    ? `<span class="badge-${status}" style="margin-left:6px">${status === 'accepted' ? 'Accepté' : status === 'rejected' ? 'Refusé' : 'En attente'}</span>`
    : '';
  div.innerHTML = `
    <div class="drw-item-info">
      <div class="drw-item-name">${name} ${badge}</div>
      ${sub ? `<div class="drw-item-date">${sub}</div>` : ''}
    </div>
    <div class="drw-item-actions">
      ${section !== 'chat' && section !== 'chat_vote' && section !== 'annonces_pending' && section !== 'news_pending'
        ? `<button class="btn-icon btn-icon-edit" onclick="openEditForm('${section}',${idx})" title="Modifier">✎</button>`
        : ''}
      <button class="btn-icon btn-icon-del"
        onclick="deleteItem('${section}',${idx})"
        title="${section === 'chat_vote' ? 'Retirer de l\'écran' : 'Supprimer'}">🗑</button>
    </div>`;
  return div;
}

/**
 * emptyMsg(msg)
 * Retourne un message vide stylisé.
 */
function emptyMsg(msg) {
  return `<div style="padding:20px 0;text-align:center;font-size:12px;color:var(--gray);font-weight:600">${msg}</div>`;
}

/* ────────────────────────────────────────
   ÉDITEUR DE QUESTIONS DU JOUR
──────────────────────────────────────── */

/**
 * renderQuestionsList(container)
 * Affiche l'éditeur des questions mensuelles.
 */
function renderQuestionsList(container) {
  const MN = ['Janvier','Février','Mars','Avril','Mai','Juin',
              'Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  container.innerHTML = `<p style="font-size:11px;color:var(--gray);margin-bottom:12px;line-height:1.5;font-weight:600;padding:0 4px">
    Les questions changent à minuit, dans l'ordre de la liste. Elles bouclent si besoin.</p>`;

  for (let m = 1; m <= 12; m++) {
    const block = document.createElement('div');
    block.className = 'month-block';
    const qs = (D.questions[m] || []);
    block.innerHTML = `
      <div class="month-title">${MN[m-1]}</div>
      <div id="qb${m}">
        ${qs.map((q, qi) => `
          <div class="q-day-row">
            <span class="q-day-lbl">J${qi+1}</span>
            <input type="text" value="${h(q)}"
              onchange="D.questions[${m}][${qi}]=this.value;saveData()"/>
            <button class="btn btn-danger btn-sm"
              onclick="D.questions[${m}].splice(${qi},1);saveData();renderSectionList('questions')">✕</button>
          </div>`).join('')}
      </div>
      <button class="btn btn-ghost btn-sm" style="margin-top:4px;font-size:11px"
        onclick="if(!D.questions[${m}])D.questions[${m}]=[];D.questions[${m}].push('Nouvelle question');saveData();renderSectionList('questions')">
        + Question</button>`;
    container.appendChild(block);
  }
}

/* ────────────────────────────────────────
   FORMULAIRES CRÉER / ÉDITER
──────────────────────────────────────── */

let _editSection = null;
let _editIdx     = null;

/**
 * openCreateForm(section)
 * Ouvre le formulaire de création.
 */
function openCreateForm(section) {
  _editSection = section;
  _editIdx     = null;
  _formPhoto   = null;
  _partnerLogos = {};
  _partnerRowCounter = 0;
  document.getElementById('drwFormTitle').textContent = 'Créer';
  buildForm(section, null);
  document.getElementById('drwFormOverlay').classList.add('open');
}

/**
 * openEditForm(section, idx)
 * Ouvre le formulaire d'édition pour un item existant.
 */
function openEditForm(section, idx) {
  _editSection = section;
  _editIdx     = idx;
  _formPhoto   = null;
  _partnerLogos = {};
  _partnerRowCounter = 0;
  document.getElementById('drwFormTitle').textContent = 'Modifier';
  let data = null;
  if (section === 'posts')       data = D.startups[idx];
  if (section === 'annonces')    data = (D.announcements || [])[idx];
  if (section === 'calendrier')  data = D.events[idx];
  if (section === 'partenaires') data = D.partners[idx];
  if (section === 'news')        data = { text: D.news[idx] };
  buildForm(section, data);
  document.getElementById('drwFormOverlay').classList.add('open');
}

/**
 * closeForm()
 * Ferme le formulaire créer/éditer.
 */
function closeForm() {
  document.getElementById('drwFormOverlay').classList.remove('open');
}

/**
 * buildForm(section, data)
 * Génère les champs du formulaire selon la section et les données existantes.
 */
function buildForm(section, data) {
  const body = document.getElementById('drwFormBody');
  body.innerHTML = '';
  const d = data || {};

  if (section === 'posts') {
    body.innerHTML = `
      ${photoField('posts')}
      ${field('Nom de l\'entreprise', 'name', d.name)}
      ${field('Étage', 'floor', d.floor)}
      ${area('Description', 'desc', d.desc)}
      ${field('Intitulé de poste', 'poste', d.poste || d.ceo)}
      ${field('Contact', 'contact', d.contact)}
      ${field('Site Web', 'web', d.web)}
      ${field('URL du QR code (facultatif)', 'qrUrl', d.qrUrl)}`;

  } else if (section === 'annonces') {
    /* Formulaire annonce : image obligatoire + nom */
    body.innerHTML = `
      ${photoField('annonces')}
      ${field('Nom / Libellé de l\'annonce', 'name', d.name)}`;

  } else if (section === 'calendrier') {
    body.innerHTML = `
      ${field('Titre', 'title', d.title)}
      ${field('Date (ex: 15 Avril 2026)', 'date', d.date)}
      ${field('Horaire (ex: 14h00 – 17h00)', 'time', d.time)}
      ${field('Lieu', 'location', d.location)}
      ${area('Description', 'desc', d.desc)}`;

  } else if (section === 'partenaires') {
    /* Formulaire thématique partenaire avec logos individuels.
       data-idx est fixé à l'index d'origine et ne change PAS quand on supprime une ligne.
       _partnerRowCounter est initialisé au nombre de lignes existantes. */
    const partners = (d.partners || []);
    _partnerRowCounter = partners.length; /* les nouvelles lignes partiront de cet index */
    const rowsHtml = partners.map((p, i) => {
      const name = partnerName(p);
      const logo = partnerLogo(p);
      return `
        <div class="partner-row" data-idx="${i}">
          <input type="text" class="partner-name" value="${h(name)}" placeholder="Nom du partenaire"/>
          <input type="file" accept="image/*" style="display:none" id="plf_${i}" onchange="handlePartnerLogoInput(event,${i})"/>
          ${logo
            ? `<img src="${logo}" class="partner-logo-thumb" id="pth_${i}" title="Logo actuel"/>`
            : `<div class="btn-logo-add" id="pth_${i}" onclick="document.getElementById('plf_${i}').click()" title="Ajouter un logo">📷</div>`}
          <button type="button" class="btn-logo-add" onclick="document.getElementById('plf_${i}').click()" title="Changer le logo">↑</button>
          <button type="button" class="btn-remove-partner" onclick="this.closest('.partner-row').remove()">✕</button>
        </div>`;
    }).join('');

    body.innerHTML = `
      ${field('Emoji thématique (ex: 🎓)', 'emoji', d.emoji)}
      ${field('Secteur / Nom de la thématique', 'sector', d.sector)}
      ${area('Description de la thématique', 'desc', d.desc)}
      <div class="fg">
        <label>Partenaires <span class="hint">(logo facultatif par partenaire)</span></label>
        <div class="partner-rows" id="partnerRows">${rowsHtml}</div>
        <button type="button" class="btn-add-partner" onclick="addPartnerRow()">+ Ajouter un partenaire</button>
      </div>`;

  } else if (section === 'news') {
    body.innerHTML = `
      <div class="fg">
        <label>Texte de la nouveauté</label>
        <input type="text" name="text" value="${h(d.text || '')}" placeholder="Texte qui défilera dans le bandeau…"/>
      </div>`;
  }

  /* Zone de drop photo si présente */
  const pd = body.querySelector('.pdrop');
  if (pd) {
    pd.ondragover  = e => { e.preventDefault(); pd.classList.add('over'); };
    pd.ondragleave = () => pd.classList.remove('over');
    pd.ondrop      = e => handleFormDrop(e);
    pd.querySelector('input[type=file]').onchange = e => handleFormFileInput(e);
  }
}

/* ── Logos partenaires individuels ── */

/* Stockage temporaire des logos partenaires {idx → base64} */
let _partnerLogos = {};
/* Compteur global pour les nouvelles lignes partenaires — évite les collisions d'index */
let _partnerRowCounter = 0;

/**
 * compressImage(file, maxW, quality)
 * Redimensionne et compresse une image via Canvas pour réduire sa taille
 * avant stockage en localStorage. Retourne une Promise<string> (base64).
 * Les PNG conservent leur transparence (sortie PNG) ;
 * les autres formats sont convertis en JPEG compressé.
 * @param {File} file
 * @param {number} maxW  — largeur max en pixels
 * @param {number} quality — qualité JPEG (0–1), ignoré pour les PNG
 */
function compressImage(file, maxW, quality) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = ev => {
      const image = new Image();
      image.onload = () => {
        let w = image.width, q = image.height;
        if (w > maxW) { q = Math.round(q * maxW / w); w = maxW; }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = q;
        const ctx = canvas.getContext('2d');
        const isPng = file.type === 'image/png';
        if (!isPng) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, w, q);
        }
        ctx.drawImage(image, 0, 0, w, q);
        resolve(isPng
          ? canvas.toDataURL('image/png')
          : canvas.toDataURL('image/jpeg', quality));
      };
      image.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * handlePartnerLogoInput(event, idx)
 * Compresse le logo du partenaire puis met à jour l'aperçu.
 */
async function handlePartnerLogoInput(event, idx) {
  const f = event.target.files[0];
  if (!f) return;
  const compressed = await compressImage(f, 500, 0.82);
  _partnerLogos[idx] = compressed;
  const thumb = document.getElementById('pth_' + idx);
  if (thumb) {
    const img = document.createElement('img');
    img.src = compressed;
    img.className = 'partner-logo-thumb';
    img.id = 'pth_' + idx;
    img.title = 'Logo chargé';
    thumb.replaceWith(img);
  }
}

/**
 * addPartnerRow()
 * Ajoute une ligne partenaire vide dans le formulaire.
 */
function addPartnerRow() {
  const rows = document.getElementById('partnerRows');
  if (!rows) return;
  /* Utilise _partnerRowCounter (toujours croissant) pour éviter toute collision
     avec les data-idx des lignes existantes, même après des suppressions. */
  const idx = _partnerRowCounter++;
  const div = document.createElement('div');
  div.className = 'partner-row';
  div.dataset.idx = idx;
  div.innerHTML = `
    <input type="text" class="partner-name" value="" placeholder="Nom du partenaire"/>
    <input type="file" accept="image/*" style="display:none" id="plf_${idx}" onchange="handlePartnerLogoInput(event,${idx})"/>
    <div class="btn-logo-add" id="pth_${idx}" onclick="document.getElementById('plf_${idx}').click()" title="Ajouter un logo">📷</div>
    <button type="button" class="btn-logo-add" onclick="document.getElementById('plf_${idx}').click()" title="Logo">↑</button>
    <button type="button" class="btn-remove-partner" onclick="this.closest('.partner-row').remove()">✕</button>`;
  rows.appendChild(div);
}

/**
 * field(label, name, value)
 * Helper : génère un groupe label + input.
 */
function field(label, name, value) {
  return `<div class="fg"><label>${label}</label>
    <input type="text" name="${name}" value="${h(value || '')}"/></div>`;
}

/**
 * area(label, name, value)
 * Helper : génère un groupe label + textarea.
 */
function area(label, name, value) {
  return `<div class="fg"><label>${label}</label>
    <textarea name="${name}">${h(value || '')}</textarea></div>`;
}

/**
 * photoField()
 * Helper : génère la zone de dépôt photo.
 */
function photoField() {
  return `<div class="fg"><label>Photo / Illustration</label>
    <div class="pdrop" id="formPdrop">
      <input type="file" accept="image/*"/>
      <p class="dlbl">📷 <em>Glissez une photo</em> ou cliquez</p>
    </div></div>`;
}

let _formPhoto = null;

/**
 * handleFormDrop(e)
 * Gère le drag & drop de photo dans le formulaire.
 */
function handleFormDrop(e) {
  e.preventDefault();
  document.getElementById('formPdrop')?.classList.remove('over');
  const f = e.dataTransfer.files[0];
  if (f && f.type.startsWith('image/')) readFormPhoto(f);
}

/**
 * handleFormFileInput(e)
 * Gère la sélection d'une photo via l'input file.
 */
function handleFormFileInput(e) {
  const f = e.target.files[0];
  if (f) readFormPhoto(f);
}

/**
 * readFormPhoto(file)
 * Compresse l'image via Canvas puis met à jour l'aperçu dans le formulaire.
 */
async function readFormPhoto(file) {
  const compressed = await compressImage(file, 900, 0.78);
  _formPhoto = compressed;
  const pd = document.getElementById('formPdrop');
  if (pd) {
    pd.innerHTML = `<input type="file" accept="image/*"/>
      <img class="pdrop-prev" src="${compressed}" alt="Aperçu"/>
      <p class="dlbl" style="margin-top:5px"><em>Changer</em> ou glisser</p>`;
    pd.querySelector('input[type=file]').onchange = handleFormFileInput;
    pd.ondragover  = ev => { ev.preventDefault(); pd.classList.add('over'); };
    pd.ondragleave = () => pd.classList.remove('over');
    pd.ondrop      = ev => handleFormDrop(ev);
  }
}

/**
 * submitForm()
 * Lit tous les champs du formulaire et applique la création ou la modification.
 */
function submitForm() {
  const body = document.getElementById('drwFormBody');
  const get  = (name) => {
    const el = body.querySelector(`[name="${name}"]`);
    return el ? el.value.trim() : '';
  };

  if (_editSection === 'posts') {
    const obj = {
      name: get('name'), floor: get('floor'), desc: get('desc'),
      poste: get('poste'), contact: get('contact'), web: get('web'),
      qrUrl: get('qrUrl'),
      photo: _formPhoto || (_editIdx !== null ? D.startups[_editIdx]?.photo : null),
      updatedAt: new Date().toISOString()
    };
    if (_editIdx !== null) D.startups[_editIdx] = obj;
    else D.startups.push(obj);

  } else if (_editSection === 'annonces') {
    /* Annonce directe, pas de vérification admin */
    if (!_formPhoto && _editIdx === null) {
      alert('Veuillez ajouter une image pour cette annonce.');
      return;
    }
    const obj = {
      name:  get('name') || 'Annonce',
      photo: _formPhoto || (_editIdx !== null ? (D.announcements || [])[_editIdx]?.photo : null),
      date:  new Date().toISOString()
    };
    if (!D.announcements) D.announcements = [];
    if (_editIdx !== null) D.announcements[_editIdx] = obj;
    else D.announcements.push(obj);

  } else if (_editSection === 'calendrier') {
    const obj = {
      title: get('title'), date: get('date'), time: get('time'),
      location: get('location'), desc: get('desc'),
      photo: null
    };
    if (_editIdx !== null) D.events[_editIdx] = obj;
    else D.events.push(obj);

  } else if (_editSection === 'partenaires') {
    /* Collecte des lignes partenaire avec leurs logos.
       On utilise row.dataset.idx (index d'origine de la ligne dans le formulaire)
       plutôt que le compteur i du forEach, qui se décale quand on supprime une ligne. */
    const rows    = body.querySelectorAll('.partner-row');
    const partners = [];
    rows.forEach((row) => {
      const nameEl   = row.querySelector('.partner-name');
      const name     = nameEl ? nameEl.value.trim() : '';
      if (!name) return;
      const origIdx  = parseInt(row.dataset.idx, 10);
      const existingLogo = (() => {
        if (_editIdx !== null && D.partners[_editIdx]) {
          const prev = D.partners[_editIdx].partners[origIdx];
          return prev ? partnerLogo(prev) : null;
        }
        return null;
      })();
      const logo = _partnerLogos[origIdx] !== undefined ? _partnerLogos[origIdx] : (existingLogo || null);
      partners.push({ name, logo });
    });
    const obj = {
      emoji: get('emoji'), sector: get('sector'), desc: get('desc'),
      partners
    };
    if (_editIdx !== null) D.partners[_editIdx] = obj;
    else D.partners.push(obj);

  } else if (_editSection === 'news') {
    const text = get('text');
    if (!text) return;
    if (!D.news) D.news = [];
    if (_editIdx !== null) D.news[_editIdx] = text;
    else D.news.push(text);
  }

  _formPhoto    = null;
  _partnerLogos = {};
  saveData();
  closeForm();
  renderSectionList(_editSection);
  if (['posts', 'annonces', 'calendrier', 'partenaires'].includes(_editSection)) {
    if (curIdx >= getSlides().length) curIdx = 0;
    renderSlideshow();
    renderTicker();
  }
  if (_editSection === 'news') renderTicker();
}

/* ────────────────────────────────────────
   SUPPRESSION
──────────────────────────────────────── */

/**
 * deleteItem(section, idx)
 * Supprime un item après confirmation.
 */
function deleteItem(section, idx) {
  if (!confirm('Supprimer cet élément ?')) return;
  if (section === 'posts')       { D.startups.splice(idx, 1); if (curIdx >= D.startups.length) curIdx = 0; }
  if (section === 'annonces')    { (D.announcements || []).splice(idx, 1); }
  if (section === 'chat')        { (D.pendingAnswers || []).splice(idx, 1); }
  if (section === 'chat_vote')   { (D.votes || []).splice(idx, 1); }
  if (section === 'calendrier')  { D.events.splice(idx, 1); }
  if (section === 'partenaires') { D.partners.splice(idx, 1); if (curIdx >= D.partners.length) curIdx = 0; }
  if (section === 'news')        { (D.news || []).splice(idx, 1); }
  if (section === 'news_pending'){ (D.pendingNews || []).splice(idx, 1); }
  saveData();
  renderSectionList(drawerSection);
  if (['posts','annonces','calendrier','partenaires'].includes(section)) { renderSlideshow(); renderTicker(); }
  if (section === 'news' || section === 'news_pending') renderTicker();
  if (section === 'chat' || section === 'chat_vote') { renderVotes(); updateNotifBadge(); }
}

/* ────────────────────────────────────────
   MODÉRATION CHAT
──────────────────────────────────────── */

/**
 * acceptChat(idx)
 * Accepte une réponse à la question du jour.
 */
function acceptChat(idx) {
  const pending = D.pendingAnswers || [];
  const a = pending[idx];
  if (!a) return;
  D.votes.push({ name: a.name, text: a.text });
  D.prevAnswers.push({ name: a.name, text: a.text, question: a.question });
  pending.splice(idx, 1);
  saveData();
  renderVotes();
  renderSectionList('chat');
  updateNotifBadge();
}

/**
 * rejectChat(idx)
 * Rejette une réponse à la question du jour.
 */
function rejectChat(idx) {
  const pending = D.pendingAnswers || [];
  if (!pending[idx]) return;
  pending.splice(idx, 1);
  saveData();
  renderSectionList('chat');
  updateNotifBadge();
}

/* ────────────────────────────────────────
   MODÉRATION NOUVEAUTÉS (pendingNews)
──────────────────────────────────────── */

/**
 * acceptNews(idx)
 * Accepte une nouveauté soumise via QR et l'ajoute dans D.news.
 */
function acceptNews(idx) {
  const n = (D.pendingNews || [])[idx];
  if (!n) return;
  n.accepted = true;
  if (!D.news) D.news = [];
  if (n.text) D.news.push(n.text);
  saveData();
  renderTicker();
  renderSectionList('news');
  updateNotifBadge();
}

/**
 * rejectNews(idx)
 * Rejette une nouveauté soumise via QR.
 */
function rejectNews(idx) {
  const n = (D.pendingNews || [])[idx];
  if (!n) return;
  n.rejected = true;
  saveData();
  renderSectionList('news');
  updateNotifBadge();
}

/* ────────────────────────────────────────
   PANNEAU NOTIFICATIONS (cloche)
──────────────────────────────────────── */

/**
 * toggleNotifPanel()
 * Affiche ou masque le panneau de notifications.
 */
function toggleNotifPanel() {
  const panel = document.getElementById('notifPanel');
  if (!panel) return;
  const isOpen = panel.classList.contains('open');
  if (isOpen) { panel.classList.remove('open'); return; }

  const list = document.getElementById('notifList');
  list.innerHTML = '';

  const chatPending = (D.pendingAnswers || []).filter(a => !a.accepted && !a.rejected);
  const newsPending = (D.pendingNews    || []).filter(n => !n.accepted && !n.rejected);

  if (!chatPending.length && !newsPending.length) {
    list.innerHTML = '<div style="padding:20px;text-align:center;font-size:12px;color:var(--gray);font-weight:600">Aucune notification en attente.</div>';
  } else {
    chatPending.forEach(a => {
      const realIdx = (D.pendingAnswers || []).indexOf(a);
      const div = document.createElement('div');
      div.className = 'notif-item fade-in';
      div.innerHTML = `
        <div class="notif-item-meta">
          <span class="notif-type">Chat</span>
          ${h(a.name)} · ${fmtDate(a.date)}
        </div>
        <div class="notif-item-text">${h(a.text)}</div>
        <div class="notif-item-actions">
          <button class="btn btn-green btn-sm" onclick="acceptChat(${realIdx});renderNotifList()">✓ Accepter</button>
          <button class="btn btn-danger btn-sm" onclick="rejectChat(${realIdx});renderNotifList()">✕ Refuser</button>
        </div>`;
      list.appendChild(div);
    });

    newsPending.forEach(n => {
      const realIdx = (D.pendingNews || []).indexOf(n);
      const div = document.createElement('div');
      div.className = 'notif-item fade-in';
      div.innerHTML = `
        <div class="notif-item-meta">
          <span class="notif-type">Nouveauté</span>
          ${h(n.name || 'Anonyme')} · ${fmtDate(n.date)}
        </div>
        <div class="notif-item-text">${h(n.text || '')}</div>
        <div class="notif-item-actions">
          <button class="btn btn-green btn-sm" onclick="acceptNews(${realIdx});renderNotifList()">✓ Accepter</button>
          <button class="btn btn-danger btn-sm" onclick="rejectNews(${realIdx});renderNotifList()">✕ Refuser</button>
        </div>`;
      list.appendChild(div);
    });
  }

  panel.classList.add('open');
}

/**
 * renderNotifList()
 * Re-rend la liste des notifications sans rouvrir le panel.
 */
function renderNotifList() {
  const panel = document.getElementById('notifPanel');
  if (panel && panel.classList.contains('open')) toggleNotifPanel();
  updateNotifBadge();
  toggleNotifPanel();
}
