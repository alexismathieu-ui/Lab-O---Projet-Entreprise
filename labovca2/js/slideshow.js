/* ============================================================
   js/slideshow.js
   Moteur du diaporama : rendu de toutes les diapositives
   (startup, annonce, calendrier, partenaire), transitions,
   barre de progression, ruban animé et timer automatique.
   ============================================================ */

/* ────────────────────────────────────────
   RENDU PRINCIPAL
──────────────────────────────────────── */

/**
 * renderSlideshow()
 * Point d'entrée du rendu : récupère la liste de slides,
 * affiche la diapo courante et les points de navigation.
 */
function renderSlideshow() {
  const slides = getSlides();
  if (!slides.length) {
    document.getElementById('slideWrap').innerHTML =
      '<div style="padding:36px;font-family:var(--fd);font-size:17px;font-weight:700;text-transform:uppercase;color:var(--gray)">Aucune diapositive dans cet onglet.</div>';
    document.getElementById('navDots').innerHTML = '';
    return;
  }
  if (curIdx >= slides.length) curIdx = 0;
  renderSlide(slides[curIdx]);
  renderDots(slides);
}

/**
 * renderSlide(slide)
 * Injecte le HTML de la diapositive dans #slideWrap
 * et met à jour le hero (titre, sous-titre).
 * @param {{type, data, idx}} slide
 */
function renderSlide(slide) {
  const wrap = document.getElementById('slideWrap');
  wrap.innerHTML = '';
  const el = buildSlideEl(slide);
  el.classList.add('slide-content');
  wrap.appendChild(el);

  const titles = {
    startup:      `Découvrez les <span>Startups</span><br>du Lab'O Village by CA`,
    announcement: `<span>Évènements</span> et Actualités<br>du Lab'O Village by CA`,
    calendar:     `<span>Calendrier</span> des évènements<br>du Lab'O Village by CA`,
    partner:      `Nos <span>Partenaires</span><br>du Lab'O Village by CA`
  };
  const subs = {
    startup:      `Startup ${(slide.idx || 0) + 1} / ${D.startups.length}`,
    announcement: `Annonce ${(slide.idx || 0) + 1} / ${(D.announcements || []).length}`,
    calendar:     `${D.events.length} évènement${D.events.length > 1 ? 's' : ''}`,
    partner:      `Partenaire ${(slide.idx || 0) + 1} / ${D.partners.length}`
  };
  document.getElementById('heroTitle').innerHTML = titles[slide.type] || titles.startup;
  document.getElementById('heroSub').textContent  = subs[slide.type]  || '';

  renderTicker();
}

/**
 * buildSlideEl(slide)
 * Crée et retourne le <div> contenant le HTML de la diapositive.
 * @param {{type, data, idx}} slide
 * @returns {HTMLElement}
 */
function buildSlideEl(slide) {
  const div = document.createElement('div');
  if      (slide.type === 'startup')      div.innerHTML = buildStartupSlide(slide.data);
  else if (slide.type === 'announcement') div.innerHTML = buildAnnouncementSlide(slide.data);
  else if (slide.type === 'calendar')     div.innerHTML = buildCalendarSlide(slide.data);
  else if (slide.type === 'partner')      div.innerHTML = buildPartnerSlide(slide.data);
  return div;
}

/* ────────────────────────────────────────
   BUILDERS DE DIAPOSITIVES
──────────────────────────────────────── */

/**
 * buildStartupSlide(s)
 * Génère le HTML d'une diapositive startup :
 * image gauche + infos (nom, étage, description) + footer (poste, contact, site, QR optionnel).
 * Le QR code n'apparaît que si s.qrUrl est renseigné.
 * @param {Object} s - Données startup
 * @returns {string} HTML
 */
function buildStartupSlide(s) {
  const qrBlock = s.qrUrl
    ? `<div class="card-qr-footer">
         <div class="qrlbl-footer">En savoir<br>plus :</div>
         <div class="qrbox">
           <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(s.qrUrl)}"
                alt="QR code" width="70" height="70"/>
         </div>
       </div>`
    : '';

  return `
  <div class="startup-slide">
    <div class="card-img-col">
      ${s.photo
        ? `<img class="cimg" src="${s.photo}" alt="Photo ${h(s.name)}"/>`
        : `<div class="ph"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
             <rect x="3" y="3" width="18" height="18" rx="2"/>
             <circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
           </svg></div>`}
      <div class="deco-circ"></div>
    </div>
    <div class="card-info">
      <div class="co-head">
        <div class="co-logo">${s.name ? s.name[0].toUpperCase() : 'N'}</div>
        <div class="co-names">
          <h2>${h(s.name || 'Nom Entreprise')}</h2>
          <div class="co-floor">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            ${h(s.floor || '—')}
          </div>
        </div>
      </div>
      <div class="co-desc">${h(s.desc || '')}</div>
    </div>
  </div>
  <div class="card-footer">
    <div class="card-footer-inner">
      <div class="card-meta">
        <div class="mrow"><span class="mlbl">Intitulé de poste :</span><span class="mval">${h(s.poste || s.ceo || '—')}</span></div>
        <div class="mrow"><span class="mlbl">Contact :</span><span class="mval">${h(s.contact || '—')}</span></div>
        <div class="mrow"><span class="mlbl">Site Web :</span><span class="mval">${h(s.web || '—')}</span></div>
      </div>
      ${qrBlock}
    </div>
  </div>`;
}

/**
 * buildAnnouncementSlide(a)
 * Génère le HTML d'une diapositive annonce (image plein cadre).
 * @param {Object} a - Données annonce {name, photo}
 * @returns {string} HTML
 */
function buildAnnouncementSlide(a) {
  if (a.photo) {
    return `
    <div class="announcement-slide">
      <img class="ann-img" src="${a.photo}" alt="${h(a.name || 'Annonce')}"/>
    </div>`;
  }
  return `
  <div class="announcement-slide">
    <div class="ann-placeholder">
      <div class="ann-name">${h(a.name || 'Annonce')}</div>
    </div>
  </div>`;
}

/**
 * buildCalendarSlide(events)
 * Génère le HTML d'une diapositive calendrier regroupant tous les évènements
 * classés par date, en 2 colonnes.
 * @param {Array} events - Tableau des évènements
 * @returns {string} HTML
 */
function buildCalendarSlide(events) {
  const sorted = [...events].sort((a, b) => parseFrDate(a.date) - parseFrDate(b.date));
  const half   = Math.ceil(sorted.length / 2);
  const col1   = sorted.slice(0, half);
  const col2   = sorted.slice(half);

  const evHtml = (e) => {
    const ts    = parseFrDate(e.date);
    const dObj  = isFinite(ts) ? new Date(ts) : null;
    const DAYS  = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];
    const dayW  = dObj ? DAYS[dObj.getDay()] : '';
    const dayN  = dObj ? dObj.getDate() : (e.date ? e.date.split(/[\s/]/)[0] : '');
    return `
      <div class="cal-event">
        <div class="cal-date-badge">
          <span class="cal-day-word">${h(dayW)}</span>
          <span class="cal-day-num">${h(String(dayN))}</span>
        </div>
        <div class="cal-event-info">
          <div class="cal-event-title">${h(e.title || 'Évènement')}</div>
          ${e.time ? `<div class="cal-event-time">${h(e.time)}</div>` : ''}
          ${e.desc ? `<div class="cal-event-desc">${h(e.desc)}</div>` : ''}
        </div>
      </div>`;
  };

  return `
  <div class="calendar-slide">
    <div class="cal-header">
      <div class="cal-deco"></div>
      <h2 class="cal-title">Calendrier</h2>
    </div>
    <div class="cal-cols">
      <div>${col1.map(evHtml).join('')}</div>
      <div>${col2.map(evHtml).join('')}</div>
    </div>
    <div class="cal-deco-br"></div>
  </div>`;
}

/**
 * buildPartnerSlide(p)
 * Génère le HTML d'une diapositive partenaire sans colonne image à gauche.
 * Affiche les logos individuels dans les chips si disponibles.
 * @param {Object} p - Données thématique partenaire
 * @returns {string} HTML
 */
function buildPartnerSlide(p) {
  const chips = (p.partners || []).map(partner => {
    const name = partnerName(partner);
    const logo = partnerLogo(partner);
    if (logo) {
      return `<div class="pt-logo-chip pt-logo-chip--img-only">
        <img src="${logo}" alt="${h(name)}" class="pt-logo-chip-img"/>
      </div>`;
    }
    return `<div class="pt-logo-chip"><span>${h(name)}</span></div>`;
  }).join('');

  return `
  <div class="partner-slide">
    <div class="pt-info">
      <div class="pt-sector-badge">${h(p.emoji || '')} ${h(p.sector || 'Partenaires')}</div>
      <div class="pt-name">${h(p.sector || 'Partenaires')}</div>
      ${p.desc ? `<div class="pt-desc">${h(p.desc)}</div>` : ''}
      <div class="pt-logos-grid">${chips}</div>
    </div>
  </div>`;
}

/* ────────────────────────────────────────
   POINTS DE NAVIGATION
──────────────────────────────────────── */

/**
 * renderDots(slides)
 * Génère les points de navigation sous le hero.
 * @param {Array} slides
 */
function renderDots(slides) {
  const el = document.getElementById('navDots');
  el.innerHTML = '';
  slides.forEach((_, i) => {
    const d = document.createElement('div');
    d.className = 'dot' + (i === curIdx ? ' active' : '');
    d.onclick = () => goToSlide(i);
    el.appendChild(d);
  });
}

/**
 * goToSlide(idx)
 * Navigation manuelle vers une diapo précise (clic sur un point).
 * @param {number} idx
 */
function goToSlide(idx) {
  if (idx === curIdx) return;
  curIdx = idx;
  sweepTransition(() => renderSlideshow());
  resetProgress();
}

/* ────────────────────────────────────────
   BARRE DE PROGRESSION
──────────────────────────────────────── */

/**
 * resetProgress()
 * Remet la barre à 0 puis la lance sur SLIDE_MS.
 */
function resetProgress() {
  const fill = document.getElementById('pbarFill');
  fill.style.transition = 'none';
  fill.style.width = '0%';
  requestAnimationFrame(() => {
    fill.style.transition = `width ${SLIDE_MS}ms linear`;
    fill.style.width = '100%';
  });
}

/* ────────────────────────────────────────
   TIMER DU DIAPORAMA
──────────────────────────────────────── */

/**
 * startSlideshow()
 * Lance le diaporama automatique avec transition sweep et barre de progression.
 */
function startSlideshow() {
  stopSlideshow();
  initRibbon();
  resetProgress();
  slideTimer = setInterval(() => {
    const slides = getSlides();
    if (!slides.length) return;
    curIdx = (curIdx + 1) % slides.length;
    sweepTransition(() => renderSlideshow());
    resetProgress();
  }, SLIDE_MS);
}

/**
 * stopSlideshow()
 * Arrête le diaporama, le ruban et remet la barre à 0.
 */
function stopSlideshow() {
  clearInterval(slideTimer); slideTimer = null;
  ribbonAnims.forEach(a => cancelAnimationFrame(a));
  ribbonAnims = [];
  document.getElementById('pbarFill').style.width = '0%';
}

/* ────────────────────────────────────────
   NAVIGATION ONGLETS
──────────────────────────────────────── */

/**
 * setTab(el, tab)
 * Change l'onglet du diaporama.
 * @param {HTMLElement} el
 * @param {string} tab
 */
function setTab(el, tab) {
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  const changed = (tab !== curTab);
  curTab = tab; curIdx = 0;
  if (changed) circleTransition(() => renderSlideshow());
  else          sweepTransition(() => renderSlideshow());
  if (appMode === 'screen') { stopSlideshow(); startSlideshow(); }
  resetProgress();
}

/* ────────────────────────────────────────
   TRANSITIONS
──────────────────────────────────────── */

/**
 * sweepTransition(cb)
 * Balayage rouge/beige entre slides du même onglet.
 * @param {Function} cb
 */
function sweepTransition(cb) {
  const ov = document.getElementById('sweepOverlay');
  ov.classList.remove('sweeping');
  void ov.offsetWidth;
  ov.classList.add('sweeping');
  setTimeout(cb, 280);
  setTimeout(() => ov.classList.remove('sweeping'), 640);
}

/**
 * circleTransition(cb)
 * Explosion circulaire lors d'un changement d'onglet.
 * @param {Function} cb
 */
function circleTransition(cb) {
  const ov = document.getElementById('circleOverlay');
  ov.innerHTML = '';
  const burst = document.createElement('div');
  burst.className = 'circle-burst';
  const rect = document.getElementById('slideWrap').getBoundingClientRect();
  burst.style.left = (Math.random() * rect.width) + 'px';
  burst.style.top  = (Math.random() * rect.height) + 'px';
  ov.appendChild(burst);
  requestAnimationFrame(() => {
    burst.classList.add('expanding');
    setTimeout(cb, 300);
    setTimeout(() => { ov.innerHTML = ''; }, 740);
  });
}

/* ────────────────────────────────────────
   RUBAN ANIMÉ ARRIÈRE-PLAN
──────────────────────────────────────── */

/**
 * initRibbon()
 * Lance 3 rubans SVG animés en arrière-plan des slides.
 */
function initRibbon() {
  const canvas = document.getElementById('ribbonCanvas');
  canvas.innerHTML = '';
  ribbonAnims.forEach(a => cancelAnimationFrame(a));
  ribbonAnims = [];

  const colors = [
    'rgba(200,16,46,0.09)',
    'rgba(232,86,106,0.07)',
    'rgba(216,207,191,0.45)'
  ];

  for (let i = 0; i < 3; i++) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none';
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', colors[i]);
    path.setAttribute('stroke-width', String(2 + i * 1.6));
    path.setAttribute('stroke-linecap', 'round');
    svg.appendChild(path);
    canvas.appendChild(svg);

    const st = {
      points: [], vx: (Math.random() - 0.5) * 1.1, vy: (Math.random() - 0.5) * 1.1,
      x: Math.random() * 800, y: Math.random() * 500,
      maxPts: 55 + i * 18, phase: Math.random() * Math.PI * 2,
      freq: 0.007 + Math.random() * 0.005
    };

    /**
     * animate()
     * Boucle rAF du ruban : déplacement brownien + sinusoïde + rebond + courbe Bézier.
     */
    function animate() {
      const t = Date.now() * 0.001;
      const w = canvas.offsetWidth, hh = canvas.offsetHeight;
      if (!w || !hh) { ribbonAnims.push(requestAnimationFrame(animate)); return; }
      st.vx += (Math.random() - 0.5) * 0.11; st.vy += (Math.random() - 0.5) * 0.11;
      st.vx = Math.max(-1.3, Math.min(1.3, st.vx)); st.vy = Math.max(-1.3, Math.min(1.3, st.vy));
      st.x += st.vx + Math.sin(t * st.freq * 60 + st.phase) * 1.0;
      st.y += st.vy + Math.cos(t * st.freq * 45 + st.phase) * 1.0;
      if (st.x < -50)    st.vx += 0.22; if (st.x > w + 50) st.vx -= 0.22;
      if (st.y < -50)    st.vy += 0.22; if (st.y > hh + 50) st.vy -= 0.22;
      st.points.push([st.x, st.y]);
      if (st.points.length > st.maxPts) st.points.shift();
      if (st.points.length > 2) {
        let d = `M ${st.points[0][0]} ${st.points[0][1]}`;
        for (let j = 1; j < st.points.length - 1; j++) {
          const mx = (st.points[j][0] + st.points[j+1][0]) / 2;
          const my = (st.points[j][1] + st.points[j+1][1]) / 2;
          d += ` Q ${st.points[j][0]} ${st.points[j][1]} ${mx} ${my}`;
        }
        path.setAttribute('d', d);
      }
      ribbonAnims.push(requestAnimationFrame(animate));
    }
    ribbonAnims.push(requestAnimationFrame(animate));
  }
}

/* ────────────────────────────────────────
   TICKER
──────────────────────────────────────── */

/**
 * renderTicker()
 * Met à jour le ticker dans la bannière rouge.
 */
function renderTicker() {
  let items;
  if (D.news && D.news.length) {
    items = D.news;
  } else {
    items = D.ticker.split('|').map(t => t.trim()).filter(Boolean);
  }
  document.getElementById('tickerInner').innerHTML =
    [...items, ...items].map(t => `<span class="ti">${h(t)}<span class="ts">|</span></span>`).join('');
  document.getElementById('bannerTitle').textContent = D.banner || "Nouveauté LAB'O le Village by CA";
}
