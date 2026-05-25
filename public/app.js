// ─── State Management ───
let powers = [];
let contestants = [];
let challenges = [];
let seasons = [];
let activeSeasonId = null;
let currentSelectedAvatar = 'images/contestants/fire.svg';

// ─── Initial Page Load ───
document.addEventListener('DOMContentLoaded', async () => {
  await loadAllData();
  
  // Auto-detect active season
  const activeSeason = seasons.find(s => s.status === 'active');
  if (activeSeason) {
    activeSeasonId = activeSeason.id;
  }
  
  renderAllViews();
});

async function loadAllData() {
  try {
    const [pRes, cRes, chRes, sRes] = await Promise.all([
      fetch('api/powers'),
      fetch('api/contestants'),
      fetch('api/challenges'),
      fetch('api/seasons')
    ]);
    
    powers = await pRes.json();
    contestants = await cRes.json();
    challenges = await chRes.json();
    seasons = await sRes.json();
  } catch (err) {
    console.error('Error loading data:', err);
  }
}

function renderAllViews() {
  renderDashboard();
  renderContestants();
  renderPowers();
  renderSeasons();
  if (activeSeasonId) {
    renderSeasonDetail(activeSeasonId);
  }
}

// ─── View Router ───
function switchView(viewName) {
  // Hide all sections
  document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  
  // Show target section
  const targetSec = document.getElementById(`view-${viewName}`);
  if (targetSec) {
    targetSec.classList.add('active');
  }
  
  // Update nav highlight
  const targetTab = document.getElementById(`tab-${viewName}`);
  if (targetTab) {
    targetTab.classList.add('active');
  }
  
  // Special rendering updates on switch
  if (viewName === 'dashboard') renderDashboard();
  if (viewName === 'contestants') renderContestants();
  if (viewName === 'powers') renderPowers();
  if (viewName === 'seasons') renderSeasons();
}

// ─── Dashboard Controller ───
function renderDashboard() {
  document.getElementById('dash-contestants-count').textContent = contestants.length;
  document.getElementById('dash-challenges-count').textContent = challenges.length;
  
  const activeS = seasons.find(s => s.status === 'active');
  const emptyState = document.getElementById('dash-season-empty-state');
  const activeState = document.getElementById('dash-season-active-state');
  
  if (activeS) {
    activeSeasonId = activeS.id;
    emptyState.classList.add('hidden');
    activeState.classList.remove('hidden');
    
    document.getElementById('dash-active-season-name').textContent = activeS.name;
    document.getElementById('dash-active-season-status').innerHTML = '<span class="color-safe">● Active Show</span>';
    
    document.getElementById('dash-active-title').textContent = activeS.name;
    document.getElementById('dash-active-meta').textContent = `${activeS.roundsCount} Rounds • ${activeS.teams.length} Teams`;
    
    // Render brief rounds breakdown
    let roundsHtml = '<div style="display:flex; flex-direction:column; gap:0.5rem; margin-top:1rem;">';
    activeS.rounds.forEach((r, idx) => {
      const chCount = r.challenges ? r.challenges.length : 0;
      const elimCount = r.eliminations ? r.eliminations.length : 0;
      roundsHtml += `
        <div class="flex-row-justify" style="font-size:0.9rem; border-bottom:1px solid var(--panel-border); padding-bottom:0.25rem;">
          <span>Round ${idx + 1}</span>
          <span style="font-weight:600; color:var(--text-muted);">
            ${chCount} Challenges ${elimCount > 0 ? `• <span class="color-danger">${elimCount} Eliminated</span>` : ''}
          </span>
        </div>
      `;
    });
    roundsHtml += '</div>';
    document.getElementById('dash-active-summary').innerHTML = roundsHtml;
  } else {
    document.getElementById('dash-active-season-name').textContent = 'None';
    document.getElementById('dash-active-season-status').textContent = 'Initialize one to start the show!';
    emptyState.classList.remove('hidden');
    activeState.classList.add('hidden');
  }

  // Populate Competitive Leaders
  const sorted = [...contestants].sort((a, b) => {
    const aWins = a.record ? a.record.challengesWon : 0;
    const bWins = b.record ? b.record.challengesWon : 0;
    return bWins - aWins;
  }).slice(0, 3);

  let leadersHtml = '';
  if (sorted.length === 0) {
    leadersHtml = '<p class="text-center">No contestants registered.</p>';
  } else {
    sorted.forEach((c, idx) => {
      const rankIcons = ['🥇', '🥈', '🥉'];
      const winCount = c.record ? c.record.challengesWon : 0;
      const powerStr = getContestantPowersHtml(c.powers);
      
      leadersHtml += `
        <div class="team-block flex-row-justify" style="border-color:${idx === 0 ? 'var(--color-winner)' : 'var(--panel-border)'}; padding: 0.5rem 0;">
          <div style="display:flex; align-items:center; gap:0.75rem;">
            <span style="font-size:1.5rem">${rankIcons[idx]}</span>
            <img src="${c.photo || 'images/contestants/fire.svg'}" style="width:36px; height:36px; border-radius:50%; object-fit:cover;" />
            <div>
              <div style="font-weight:700;">${c.name}</div>
              <div class="power-tags-row" style="margin:0">${powerStr}</div>
            </div>
          </div>
          <div class="text-right">
            <span style="font-weight:800; font-size:1.1rem; color:var(--color-winner);">${winCount}</span>
            <div style="font-size:0.65rem; color:var(--text-muted); text-transform:uppercase;">Wins</div>
          </div>
        </div>
      `;
    });
  }
  document.getElementById('dash-leaders-list').innerHTML = leadersHtml;
}

// ─── Contestants Controller ───
function renderContestants() {
  const grid = document.getElementById('contestants-grid');
  grid.innerHTML = '';
  
  if (contestants.length === 0) {
    grid.innerHTML = '<div class="glass-card text-center" style="grid-column: 1 / -1;"><p>No contestants in the pool yet. Create one!</p></div>';
    return;
  }
  
  contestants.forEach(c => {
    const powerBadges = getContestantPowersHtml(c.powers);
    const rec = c.record || { seasonsPlayed: 0, challengesWon: 0, challengesDanger: 0, eliminatedCount: 0 };
    
    // Use first power's color as a border highlight
    let themeColor = 'var(--panel-border)';
    if (c.powers && c.powers.length > 0) {
      const p = powers.find(x => x.id === c.powers[0]);
      if (p) themeColor = p.color;
    }
    
    const isEliminated = rec.eliminatedCount > 0;

    const card = document.createElement('div');
    card.className = 'glass-card contestant-grid-card';
    card.style.borderColor = themeColor;
    
    card.innerHTML = `
      <div class="contestant-card-hero">
        <img class="contestant-img" src="${c.photo || 'images/contestants/fire.svg'}" alt="${c.name}" />
        ${isEliminated ? '<div style="position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.65); display:flex; align-items:center; justify-content:center; font-size:1.2rem; font-weight:800; color:var(--color-danger); text-transform:uppercase; letter-spacing:0.1em; transform: rotate(-5deg);">ELIMINATED</div>' : ''}
      </div>
      <div class="power-tags-row">${powerBadges}</div>
      <h3 style="margin-bottom:0.25rem;">${c.name}</h3>
      <p style="font-size:0.85rem; margin-bottom:1rem; min-height:38px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${c.bio || 'No biography details provided.'}</p>
      
      <div class="contestant-card-stats">
        <div class="c-stat-box">
          <div class="val">${rec.seasonsPlayed}</div>
          <div class="label">Seasons</div>
        </div>
        <div class="c-stat-box">
          <div class="val color-winner">${rec.challengesWon}</div>
          <div class="label">Wins</div>
        </div>
        <div class="c-stat-box">
          <div class="val color-danger">${rec.challengesDanger}</div>
          <div class="label">Danger</div>
        </div>
      </div>
      
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:0.5rem; margin-top:1rem;">
        <button class="btn btn-sm" onclick="event.stopPropagation(); openHistoryModal('${c.id}')">📜 History (v${c.versions ? c.versions.length : 1})</button>
        <button class="btn btn-sm btn-accent" onclick="event.stopPropagation(); openContestantModal('${c.id}')">✏️ Edit Profile</button>
      </div>
    `;
    
    grid.appendChild(card);
  });
}

function getContestantPowersHtml(cPowers) {
  if (!cPowers || cPowers.length === 0) return '<span style="font-size:0.75rem; color:var(--text-muted);">Normal</span>';
  return cPowers.map(pId => {
    const p = powers.find(x => x.id === pId);
    if (!p) return '';
    return `<span class="power-badge" style="background:${p.color}">${p.icon} ${p.name}</span>`;
  }).join('');
}

// ─── Powers Controller ───
function renderPowers() {
  const grid = document.getElementById('powers-grid');
  grid.innerHTML = '';
  
  powers.forEach(p => {
    const card = document.createElement('div');
    card.className = 'glass-card';
    card.style.borderLeft = `5px solid ${p.color}`;
    
    card.innerHTML = `
      <div class="card-header-row" style="margin-bottom:0.5rem; padding-bottom:0.25rem;">
        <h3 style="display:flex; align-items:center; gap:0.5rem;">
          <span style="font-size:1.5rem;">${p.icon}</span> ${p.name}
        </h3>
        <span class="logo-badge" style="background:${p.color}; font-size:0.7rem;">${p.code}</span>
      </div>
      <p style="font-size:0.9rem; min-height:45px; margin-bottom:1rem;">${p.description || 'No description'}</p>
      <div class="text-right">
        <button class="btn btn-sm" onclick="openPowerModal('${p.id}')">✏️ Edit</button>
        <button class="btn btn-sm btn-danger" onclick="deletePower('${p.id}')">🗑️ Delete</button>
      </div>
    `;
    grid.appendChild(card);
  });
}

// ─── Seasons Hub Controller ───
function renderSeasons() {
  const grid = document.getElementById('seasons-grid');
  const emptyState = document.getElementById('seasons-empty-state');
  grid.innerHTML = '';
  
  if (seasons.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }
  
  emptyState.classList.add('hidden');
  
  seasons.forEach(s => {
    const isCompleted = s.status === 'completed';
    const card = document.createElement('div');
    card.className = 'glass-card';
    if (s.status === 'active') {
      card.style.borderColor = 'var(--primary)';
    }

    card.innerHTML = `
      <div class="card-header-row">
        <div>
          <h2>${s.name}</h2>
          <p>${s.roundsCount} Rounds • ${s.teams.length} Teams</p>
        </div>
        <span class="logo-badge" style="background:${isCompleted ? 'var(--panel-border)' : 'var(--primary)'}">
          ${isCompleted ? '🏆 Completed' : '🎬 Active'}
        </span>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:1.5rem;">
        <span style="font-size:0.85rem; color:var(--text-muted);">Created: ${new Date(s.createdAt).toLocaleDateString()}</span>
        <button class="btn btn-primary" onclick="viewSeasonDetail('${s.id}')">
          ${isCompleted ? '🔎 View Bracket' : '🎮 Manage Round'}
        </button>
      </div>
    `;
    grid.appendChild(card);
  });
}

// ─── Season Detail & Operations Controller ───
function viewSeasonDetail(sId) {
  if (!sId) sId = activeSeasonId;
  if (!sId && seasons.length > 0) sId = seasons[0].id;
  if (!sId) return;

  activeSeasonId = sId;
  renderSeasonDetail(sId);
  switchView('season-detail');
}

function renderSeasonDetail(sId) {
  const s = seasons.find(x => x.id === sId);
  if (!s) return;

  document.getElementById('detail-season-name').textContent = s.name;
  
  const statusSpan = document.getElementById('detail-season-status');
  if (s.status === 'completed') {
    statusSpan.innerHTML = '<span class="color-winner">🏆 Completed Season</span>';
    document.getElementById('btn-complete-season').classList.add('hidden');
  } else {
    statusSpan.innerHTML = '<span class="color-safe">● Active Show</span>';
    document.getElementById('btn-complete-season').classList.remove('hidden');
  }

  // 1. Teams roster render
  let teamsHtml = '';
  s.teams.forEach(team => {
    let memberPills = '';
    team.members.forEach(cId => {
      const c = contestants.find(x => x.id === cId);
      if (!c) return;
      
      // Check if contestant is eliminated in ANY round of this season
      let isEliminated = false;
      s.rounds.forEach(r => {
        if (r.eliminations && r.eliminations.includes(cId)) isEliminated = true;
      });

      memberPills += `
        <span class="member-pill ${isEliminated ? 'eliminated' : ''}">
          <img src="${c.photo || 'images/contestants/fire.svg'}" style="width:16px; height:16px; border-radius:50%; object-fit:cover; margin-right:0.25rem;" />
          ${c.name} ${isEliminated ? '🪓' : ''}
        </span>
      `;
    });

    teamsHtml += `
      <div class="team-block mb-1" style="border-color:${team.color || 'var(--primary)'}">
        <div class="team-block-title" style="color:${team.color || '#fff'}">${team.name}</div>
        <div class="team-members-list">${memberPills}</div>
      </div>
    `;
  });
  document.getElementById('detail-teams-list').innerHTML = teamsHtml;

  // 2. Bracket timeline and challenge instances
  let bracketHtml = '';
  s.rounds.forEach((round, rIdx) => {
    let challengesHtml = '';
    if (round.challenges && round.challenges.length > 0) {
      round.challenges.forEach(ch => {
        const winT = s.teams.find(t => t.id === ch.winningTeam);
        const safeT = s.teams.find(t => t.id === ch.safeTeam);
        const dangerT = s.teams.find(t => t.id === ch.dangerTeam);

        challengesHtml += `
          <div class="challenge-instance-card">
            <div class="flex-row-justify">
              <h4 style="color:#fff;">⚔️ ${ch.title}</h4>
              ${s.status === 'active' ? `
                <div class="btn-group">
                  <button class="btn btn-sm" onclick="openChallengeRecordModal(${rIdx}, '${ch.id}')">✏️ Edit</button>
                  <button class="btn btn-sm btn-danger" onclick="deleteChallengeInstance(${rIdx}, '${ch.id}')">✕</button>
                </div>
              ` : ''}
            </div>
            <p style="font-size:0.85rem; margin-top:0.25rem;">${ch.description || ''}</p>
            ${ch.narrative ? `<p style="font-style:italic; font-size:0.85rem; background:rgba(255,255,255,0.02); padding:0.5rem; border-radius:4px; margin-top:0.5rem; border-left:2px solid var(--secondary);">"${ch.narrative}"</p>` : ''}
            
            <div class="team-placement-row">
              <div class="placement-badge winner" style="${winT ? `border-color:${winT.color};` : ''}">
                <span>Win</span>
                <span style="font-size:0.75rem; color:#fff;">${winT ? winT.name : 'Unknown'}</span>
              </div>
              <div class="placement-badge safe" style="${safeT ? `border-color:${safeT.color};` : ''}">
                <span>Safe</span>
                <span style="font-size:0.75rem; color:#fff;">${safeT ? safeT.name : 'Unknown'}</span>
              </div>
              <div class="placement-badge danger" style="${dangerT ? `border-color:${dangerT.color};` : ''}">
                <span>Danger</span>
                <span style="font-size:0.75rem; color:#fff;">${dangerT ? dangerT.name : 'Unknown'}</span>
              </div>
            </div>
          </div>
        `;
      });
    } else {
      challengesHtml = '<p style="font-style:italic; color:var(--text-muted); font-size:0.9rem;">No challenges recorded for this round yet.</p>';
    }

    // Render round eliminations
    let eliminationsHtml = '';
    if (round.eliminations && round.eliminations.length > 0) {
      round.eliminations.forEach(cId => {
        const c = contestants.find(x => x.id === cId);
        if (!c) return;
        eliminationsHtml += `
          <div class="eliminated-row">
            <span>🪓 <strong>${c.name}</strong> has been voted out / eliminated this round.</span>
            ${s.status === 'active' ? `<button class="btn btn-sm btn-danger" style="margin-left:auto; padding:0.1rem 0.4rem;" onclick="removeElimination(${rIdx}, '${cId}')">Undo</button>` : ''}
          </div>
        `;
      });
    }

    // Actions for active season round
    let roundActions = '';
    if (s.status === 'active') {
      roundActions = `
        <div style="display:flex; gap:0.5rem; margin-top:1rem; border-top:1px solid var(--panel-border); padding-top:0.75rem;">
          <button class="btn btn-sm btn-primary" onclick="openChallengeRecordModal(${rIdx})">⚔️ Add Challenge Result</button>
          <button class="btn btn-sm btn-accent" onclick="openEliminationRecordModal(${rIdx})">🪓 Record Elimination</button>
        </div>
      `;
    }

    bracketHtml += `
      <div class="round-container">
        <div class="round-header">
          <span>Round ${rIdx + 1}</span>
          <span class="logo-badge" style="background:rgba(255,255,255,0.05); color:var(--text-muted);">
            ${round.challenges ? round.challenges.length : 0} Challenges
          </span>
        </div>
        ${challengesHtml}
        ${eliminationsHtml}
        ${roundActions}
      </div>
    `;
  });
  document.getElementById('detail-bracket-list').innerHTML = bracketHtml;

  // 3. Operational controls box
  let controlsHtml = '';
  if (s.status === 'active') {
    // Find active non-eliminated roster to determine if show is runnable
    controlsHtml = `
      <div class="text-center">
        <p style="font-size:0.9rem; margin-bottom:1rem;">Add challenge instances and eliminate contestants to progress the reality bracket!</p>
        <button class="btn btn-accent btn-lg" style="width:100%;" onclick="openChallengeRecordModal()">🎮 Quick Record Challenge</button>
      </div>
    `;
  } else {
    controlsHtml = `
      <div class="text-center">
        <span style="font-size:3rem;">🏆</span>
        <h3>Season Finalized</h3>
        <p style="font-size:0.9rem;">This bracket is locked. Check out the contestants profiles to review their updated proxy records!</p>
      </div>
    `;
  }
  document.getElementById('active-season-actions').innerHTML = controlsHtml;
}

// ─── Modal Openers/Closers ───
function openContestantModal(cId = null) {
  const modal = document.getElementById('contestant-modal');
  const title = document.getElementById('contestant-modal-title');
  const form = document.getElementById('contestant-form');
  
  // Render checkboxes of all powers
  let powerBoxesHtml = '';
  powers.forEach(p => {
    powerBoxesHtml += `
      <label style="display:inline-flex; align-items:center; gap:0.4rem; margin-right:1rem; cursor:pointer; color:#fff;">
        <input type="checkbox" name="w-powers" value="${p.id}" />
        <span>${p.icon} ${p.name}</span>
      </label>
    `;
  });
  document.getElementById('contestant-powers-checkboxes').innerHTML = powerBoxesHtml;

  if (cId) {
    title.textContent = 'Edit Contestant Profile';
    const c = contestants.find(x => x.id === cId);
    if (!c) return;

    document.getElementById('contestant-id').value = c.id;
    document.getElementById('contestant-name').value = c.name;
    document.getElementById('contestant-bio').value = c.bio || '';
    document.getElementById('contestant-photo').value = c.photo || '';
    document.getElementById('contestant-change-desc-group').classList.remove('hidden');
    document.getElementById('contestant-change-desc').value = '';

    // Mark selected avatar option
    currentSelectedAvatar = c.photo || 'images/contestants/fire.svg';
    document.querySelectorAll('.avatar-option').forEach(opt => {
      const img = opt.querySelector('img');
      if (img && img.getAttribute('src') === currentSelectedAvatar) {
        opt.classList.add('selected');
      } else {
        opt.classList.remove('selected');
      }
    });

    // Check powers
    if (c.powers) {
      c.powers.forEach(pId => {
        const chk = form.querySelector(`input[name="w-powers"][value="${pId}"]`);
        if (chk) chk.checked = true;
      });
    }
  } else {
    title.textContent = 'Create New Stuffed Animal';
    form.reset();
    document.getElementById('contestant-id').value = '';
    document.getElementById('contestant-change-desc-group').classList.add('hidden');
    
    // Select first avatar by default
    currentSelectedAvatar = 'images/contestants/fire.svg';
    document.querySelectorAll('.avatar-option').forEach((opt, idx) => {
      if (idx === 0) opt.classList.add('selected');
      else opt.classList.remove('selected');
    });
  }

  modal.classList.add('active');
}

function selectAvatarOption(element, srcPath) {
  document.querySelectorAll('.avatar-option').forEach(opt => opt.classList.remove('selected'));
  element.classList.add('selected');
  currentSelectedAvatar = srcPath;
  document.getElementById('contestant-photo').value = srcPath; // prefill custom URL box
}

function closeContestantModal() {
  document.getElementById('contestant-modal').classList.remove('active');
}

async function saveContestant(e) {
  e.preventDefault();
  const cId = document.getElementById('contestant-id').value;
  const name = document.getElementById('contestant-name').value;
  const bio = document.getElementById('contestant-bio').value;
  const photo = document.getElementById('contestant-photo').value || currentSelectedAvatar;
  const changeDescription = document.getElementById('contestant-change-desc').value;

  // Selected powers tags
  const selectedPowers = [];
  document.querySelectorAll('input[name="w-powers"]:checked').forEach(chk => {
    selectedPowers.push(chk.value);
  });

  const payload = { name, bio, photo, powers: selectedPowers, changeDescription };

  try {
    let response;
    if (cId) {
      response = await fetch(`api/contestants/${cId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } else {
      response = await fetch('api/contestants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }

    if (!response.ok) throw new Error('Failed to save contestant');
    
    closeContestantModal();
    await loadAllData();
    renderAllViews();
  } catch (err) {
    alert(err.message);
  }
}

// ─── Powers Modal Controllers ───
function openPowerModal(pId = null) {
  const modal = document.getElementById('power-modal');
  const title = document.getElementById('power-modal-title');
  const form = document.getElementById('power-form');

  if (pId) {
    title.textContent = 'Edit Superpower';
    const p = powers.find(x => x.id === pId);
    if (!p) return;

    document.getElementById('power-id').value = p.id;
    document.getElementById('power-name').value = p.name;
    document.getElementById('power-code').value = p.code;
    document.getElementById('power-description').value = p.description || '';
    document.getElementById('power-icon').value = p.icon || '✨';
    document.getElementById('power-color').value = p.color || '#888888';
  } else {
    title.textContent = 'Create New Superpower';
    form.reset();
    document.getElementById('power-id').value = '';
  }

  modal.classList.add('active');
}

function closePowerModal() {
  document.getElementById('power-modal').classList.remove('active');
}

async function savePower(e) {
  e.preventDefault();
  const pId = document.getElementById('power-id').value;
  const name = document.getElementById('power-name').value;
  const code = document.getElementById('power-code').value;
  const description = document.getElementById('power-description').value;
  const icon = document.getElementById('power-icon').value;
  const color = document.getElementById('power-color').value;

  const payload = { name, code, description, icon, color };

  try {
    let response;
    if (pId) {
      response = await fetch(`api/powers/${pId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } else {
      response = await fetch('api/powers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || 'Failed to save power');
    }

    closePowerModal();
    await loadAllData();
    renderAllViews();
  } catch (err) {
    alert(err.message);
  }
}

async function deletePower(pId) {
  if (!confirm('Are you sure you want to delete this superpower from the global library?')) return;
  try {
    const response = await fetch(`api/powers/${pId}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Failed to delete power');
    await loadAllData();
    renderAllViews();
  } catch (err) {
    alert(err.message);
  }
}

// ─── Version History Modal Controller ───
function openHistoryModal(cId) {
  const c = contestants.find(x => x.id === cId);
  if (!c) return;

  document.getElementById('history-contestant-name').textContent = `${c.name} — Profile Version Log`;
  
  const container = document.getElementById('history-timeline-container');
  container.innerHTML = '';

  const vers = c.versions || [];
  if (vers.length === 0) {
    container.innerHTML = '<p>No history tracking found.</p>';
  } else {
    // Show newest first
    [...vers].reverse().forEach(v => {
      const item = document.createElement('div');
      item.className = 'timeline-item';
      
      const formattedTime = new Date(v.timestamp).toLocaleString();
      const pBadges = v.powers ? v.powers.map(pId => {
        const p = powers.find(x => x.id === pId);
        return p ? `<span class="power-badge" style="background:${p.color}; font-size:0.6rem; padding:0.15rem 0.4rem;">${p.icon} ${p.name}</span>` : '';
      }).join(' ') : 'None';

      item.innerHTML = `
        <div class="timeline-dot"></div>
        <div class="timeline-header">
          <span class="timeline-ver">Profile Version ${v.version}</span>
          <span class="timeline-time">${formattedTime}</span>
        </div>
        <div class="timeline-desc">
          <strong>Change Details:</strong> ${v.changeDescription || 'No modification details provided.'}
          <div style="margin-top:0.4rem; font-size:0.8rem; color:var(--text-muted);">
            Name: "${v.name}" • Powers: ${pBadges}
          </div>
        </div>
      `;
      container.appendChild(item);
    });
  }

  document.getElementById('history-modal').classList.add('active');
}

function closeHistoryModal() {
  document.getElementById('history-modal').classList.remove('active');
}

// ─── Season Wizard Setup Controller ───
function openNewSeasonWizard() {
  if (contestants.length < 2) {
    alert('Please register at least 2 contestants in the pool before starting a season show!');
    return;
  }
  
  const modal = document.getElementById('season-wizard-modal');
  document.getElementById('season-wizard-form').reset();
  generateTeamSetupInputs();
  modal.classList.add('active');
}

function closeSeasonWizard() {
  document.getElementById('season-wizard-modal').classList.remove('active');
}

function generateTeamSetupInputs() {
  const numTeams = parseInt(document.getElementById('season-w-teams').value, 10);
  const container = document.getElementById('wizard-teams-setup');
  container.innerHTML = '';

  const colors = ['#e91e63', '#00bcd4', '#4caf50', '#ffeb3b'];
  const teamNames = ['Team Inferno', 'Team Aurora', 'Team Wildwood', 'Team Zenith'];

  for (let i = 0; i < numTeams; i++) {
    const defaultColor = colors[i % colors.length];
    const defaultName = teamNames[i % teamNames.length];
    
    // Naming / color picking
    const teamDiv = document.createElement('div');
    teamDiv.style.borderLeft = `4px solid ${defaultColor}`;
    teamDiv.style.paddingLeft = '0.75rem';
    teamDiv.style.background = 'rgba(255,255,255,0.02)';
    teamDiv.style.padding = '0.75rem';
    teamDiv.style.borderRadius = 'var(--radius-md)';
    
    let membersCheckboxes = '';
    contestants.forEach(c => {
      membersCheckboxes += `
        <label style="display:inline-flex; align-items:center; gap:0.25rem; font-size:0.85rem; margin-right:0.75rem; cursor:pointer;">
          <input type="checkbox" name="team-${i}-members" value="${c.id}" />
          <span>${c.name}</span>
        </label>
      `;
    });

    teamDiv.innerHTML = `
      <div class="grid-cols-2 mb-1" style="gap:0.75rem;">
        <div>
          <label style="font-size:0.75rem; text-transform:uppercase;">Team ${i + 1} Name</label>
          <input type="text" id="team-${i}-name" value="${defaultName}" required />
        </div>
        <div>
          <label style="font-size:0.75rem; text-transform:uppercase;">Team Color</label>
          <input type="text" id="team-${i}-color" value="${defaultColor}" required />
        </div>
      </div>
      <div>
        <label style="font-size:0.75rem; text-transform:uppercase; margin-bottom:0.25rem;">Select Draft Members</label>
        <div style="background:rgba(0,0,0,0.15); padding:0.5rem; border-radius:var(--radius-sm); max-height:100px; overflow-y:auto;">
          ${membersCheckboxes}
        </div>
      </div>
    `;

    container.appendChild(teamDiv);
  }
}

async function saveSeason(e) {
  e.preventDefault();
  const name = document.getElementById('season-w-name').value;
  const roundsCount = parseInt(document.getElementById('season-w-rounds').value, 10);
  const numTeams = parseInt(document.getElementById('season-w-teams').value, 10);

  const teams = [];
  const draftedContestants = new Set();
  let draftError = false;

  for (let i = 0; i < numTeams; i++) {
    const tName = document.getElementById(`team-${i}-name`).value;
    const tColor = document.getElementById(`team-${i}-color`).value;
    
    const members = [];
    document.querySelectorAll(`input[name="team-${i}-members"]:checked`).forEach(chk => {
      members.push(chk.value);
      if (draftedContestants.has(chk.value)) {
        draftError = true;
      }
      draftedContestants.add(chk.value);
    });

    if (members.length === 0) {
      alert(`Please select at least 1 member for ${tName}!`);
      return;
    }

    teams.push({
      id: 'team_' + i + '_' + Date.now(),
      name: tName,
      color: tColor,
      members
    });
  }

  if (draftError) {
    alert('A contestant cannot be drafted into multiple teams simultaneously!');
    return;
  }

  const payload = { name, roundsCount, teamsCount: numTeams, teams };

  try {
    const response = await fetch('api/seasons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error('Failed to create season');
    
    const created = await response.json();
    activeSeasonId = created.id;
    
    closeSeasonWizard();
    await loadAllData();
    renderAllViews();
    switchView('season-detail');
  } catch (err) {
    alert(err.message);
  }
}

// ─── Challenge Instance Modals Controllers ───
function openChallengeRecordModal(rIdx = 0, chInstId = null) {
  const s = seasons.find(x => x.id === activeSeasonId);
  if (!s) return;

  const modal = document.getElementById('challenge-record-modal');
  const form = document.getElementById('challenge-record-form');
  
  document.getElementById('challenge-record-round-idx').value = rIdx;
  document.getElementById('challenge-record-inst-id').value = chInstId || '';

  // Populate challenge selection library
  let selectHtml = '<option value="">-- Create custom challenge or select --</option>';
  challenges.forEach(ch => {
    selectHtml += `<option value="${ch.id}">${ch.title}</option>`;
  });
  document.getElementById('ch-rec-select').innerHTML = selectHtml;

  // Populate team selector drop downs
  let teamOpts = '<option value="">-- Select Team --</option>';
  s.teams.forEach(team => {
    teamOpts += `<option value="${team.id}">${team.name}</option>`;
  });
  document.getElementById('ch-rec-winning').innerHTML = teamOpts;
  document.getElementById('ch-rec-safe').innerHTML = teamOpts;
  document.getElementById('ch-rec-danger').innerHTML = teamOpts;

  if (chInstId) {
    const round = s.rounds[rIdx];
    const ch = round.challenges.find(c => c.id === chInstId);
    if (!ch) return;

    document.getElementById('ch-rec-select').value = ch.challengeId || '';
    document.getElementById('ch-rec-title').value = ch.title;
    document.getElementById('ch-rec-desc').value = ch.description || '';
    document.getElementById('ch-rec-winning').value = ch.winningTeam || '';
    document.getElementById('ch-rec-safe').value = ch.safeTeam || '';
    document.getElementById('ch-rec-danger').value = ch.dangerTeam || '';
    document.getElementById('ch-rec-narrative').value = ch.narrative || '';
  } else {
    form.reset();
  }

  modal.classList.add('active');
}

function closeChallengeRecordModal() {
  document.getElementById('challenge-record-modal').classList.remove('active');
}

function populateChallengeDetailsFromLibrary() {
  const libId = document.getElementById('ch-rec-select').value;
  if (!libId) return;

  const ch = challenges.find(x => x.id === libId);
  if (ch) {
    document.getElementById('ch-rec-title').value = ch.title;
    document.getElementById('ch-rec-desc').value = ch.description || '';
  }
}

async function saveChallengeInstance(e) {
  e.preventDefault();
  const rIdx = parseInt(document.getElementById('challenge-record-round-idx').value, 10);
  const chInstId = document.getElementById('challenge-record-inst-id').value;
  const challengeId = document.getElementById('ch-rec-select').value;
  const title = document.getElementById('ch-rec-title').value;
  const description = document.getElementById('ch-rec-desc').value;
  const winningTeam = document.getElementById('ch-rec-winning').value;
  const safeTeam = document.getElementById('ch-rec-safe').value;
  const dangerTeam = document.getElementById('ch-rec-danger').value;
  const narrative = document.getElementById('ch-rec-narrative').value;

  const payload = {
    challengeId: challengeId || null,
    title,
    description,
    winningTeam,
    safeTeam,
    dangerTeam,
    narrative
  };

  try {
    let url = `api/seasons/${activeSeasonId}/rounds/${rIdx}/challenges`;
    let method = 'POST';

    if (chInstId) {
      url += `/${chInstId}`;
      method = 'PUT';
    }

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error('Failed to record challenge instance');

    closeChallengeRecordModal();
    await loadAllData();
    renderAllViews();
  } catch (err) {
    alert(err.message);
  }
}

async function deleteChallengeInstance(rIdx, chInstId) {
  if (!confirm('Are you sure you want to delete this challenge result?')) return;
  try {
    const response = await fetch(`api/seasons/${activeSeasonId}/rounds/${rIdx}/challenges/${chInstId}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete challenge');
    await loadAllData();
    renderAllViews();
  } catch (err) {
    alert(err.message);
  }
}

// ─── Elimination Modal Controllers ───
function openEliminationRecordModal(rIdx) {
  const s = seasons.find(x => x.id === activeSeasonId);
  if (!s) return;

  const modal = document.getElementById('elimination-record-modal');
  document.getElementById('elimination-record-round-idx').value = rIdx;

  // Gather active (non-eliminated) members from teams
  // Let's filter to ONLY members on teams that were dangerTeam in this round's challenges!
  const round = s.rounds[rIdx];
  const dangerTeams = new Set();
  if (round.challenges) {
    round.challenges.forEach(ch => {
      if (ch.dangerTeam) dangerTeams.add(ch.dangerTeam);
    });
  }

  // Find who has already been eliminated in this season
  const pastEliminated = new Set();
  s.rounds.forEach((r, idx) => {
    if (r.eliminations) {
      r.eliminations.forEach(cId => pastEliminated.add(cId));
    }
  });

  let optionsHtml = '<option value="">-- Select Contestant --</option>';
  s.teams.forEach(team => {
    // If the round has danger teams recorded, restrict to those. Otherwise, anyone is eligible
    if (dangerTeams.size > 0 && !dangerTeams.has(team.id)) return;

    team.members.forEach(cId => {
      if (pastEliminated.has(cId)) return; // already out
      const c = contestants.find(x => x.id === cId);
      if (c) {
        optionsHtml += `<option value="${c.id}">${c.name} (${team.name})</option>`;
      }
    });
  });

  document.getElementById('elim-select').innerHTML = optionsHtml;
  modal.classList.add('active');
}

function closeEliminationRecordModal() {
  document.getElementById('elimination-record-modal').classList.remove('active');
}

async function saveElimination(e) {
  e.preventDefault();
  const rIdx = parseInt(document.getElementById('elimination-record-round-idx').value, 10);
  const contestantId = document.getElementById('elim-select').value;

  try {
    const response = await fetch(`api/seasons/${activeSeasonId}/rounds/${rIdx}/eliminations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contestantId })
    });

    if (!response.ok) throw new Error('Failed to record elimination');

    closeEliminationRecordModal();
    await loadAllData();
    renderAllViews();
  } catch (err) {
    alert(err.message);
  }
}

async function removeElimination(rIdx, contestantId) {
  try {
    const response = await fetch(`api/seasons/${activeSeasonId}/rounds/${rIdx}/eliminations/${contestantId}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete elimination');
    await loadAllData();
    renderAllViews();
  } catch (err) {
    alert(err.message);
  }
}

// ─── Finish/Delete Season Controllers ───
async function completeSeason() {
  if (!confirm('Are you sure you want to finish and lock this season? All placements will be saved!')) return;
  try {
    const response = await fetch(`api/seasons/${activeSeasonId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' })
    });
    if (!response.ok) throw new Error('Failed to complete season');
    await loadAllData();
    renderAllViews();
  } catch (err) {
    alert(err.message);
  }
}

async function deleteActiveSeason() {
  if (!confirm('Are you sure you want to delete this season bracket entirely? This action is irreversible.')) return;
  try {
    const response = await fetch(`api/seasons/${activeSeasonId}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Failed to delete season');
    activeSeasonId = null;
    await loadAllData();
    renderAllViews();
    switchView('seasons');
  } catch (err) {
    alert(err.message);
  }
}

// ─── Custom Canvas Image Cropping & Uploading Controller ───
let cropImg = null;
let cropZoom = 1.0;
let cropPanX = 0;
let cropPanY = 0;
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;

function handleImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    cropImg = new Image();
    cropImg.onload = function() {
      // Open crop modal
      document.getElementById('crop-modal').classList.add('active');
      
      // Reset variables
      cropZoom = 1.0;
      cropPanX = 0;
      cropPanY = 0;
      document.getElementById('crop-zoom').value = 1.0;
      
      initCropCanvas();
    };
    cropImg.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function initCropCanvas() {
  const canvas = document.getElementById('crop-canvas');
  const ctx = canvas.getContext('2d');
  
  // Set drawing dimensions
  canvas.width = 300;
  canvas.height = 300;
  
  // Draw initial canvas state
  drawCropCanvas();

  // Remove existing listeners by cloning canvas (avoid multiple event listener binding bug)
  const newCanvas = canvas.cloneNode(true);
  canvas.parentNode.replaceChild(newCanvas, canvas);
  
  // Re-bind listeners on fresh canvas
  newCanvas.addEventListener('mousedown', startDrag);
  newCanvas.addEventListener('mousemove', drag);
  newCanvas.addEventListener('mouseup', endDrag);
  newCanvas.addEventListener('mouseleave', endDrag);
  
  newCanvas.addEventListener('touchstart', startDragTouch);
  newCanvas.addEventListener('touchmove', dragTouch);
  newCanvas.addEventListener('touchend', endDrag);

  // Bind zoom slider
  const zoomSlider = document.getElementById('crop-zoom');
  zoomSlider.oninput = function() {
    cropZoom = parseFloat(this.value);
    drawCropCanvas();
  };
}

function drawCropCanvas() {
  const canvas = document.getElementById('crop-canvas');
  if (!canvas || !cropImg) return;
  
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Center coordinates of canvas
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  
  // Calculate responsive drawing box
  const dw = cropImg.width * cropZoom;
  const dh = cropImg.height * cropZoom;
  
  // Center position offsetted by pan coordinates
  const dx = cx - dw / 2 + cropPanX;
  const dy = cy - dh / 2 + cropPanY;
  
  ctx.drawImage(cropImg, dx, dy, dw, dh);
}

function startDrag(e) {
  isDragging = true;
  dragStartX = e.clientX - cropPanX;
  dragStartY = e.clientY - cropPanY;
}

function drag(e) {
  if (!isDragging) return;
  cropPanX = e.clientX - dragStartX;
  cropPanY = e.clientY - dragStartY;
  drawCropCanvas();
}

function startDragTouch(e) {
  if (e.touches.length !== 1) return;
  isDragging = true;
  dragStartX = e.touches[0].clientX - cropPanX;
  dragStartY = e.touches[0].clientY - cropPanY;
}

function dragTouch(e) {
  if (!isDragging || e.touches.length !== 1) return;
  e.preventDefault(); // prevent scrolling while dragging
  cropPanX = e.touches[0].clientX - dragStartX;
  cropPanY = e.touches[0].clientY - dragStartY;
  drawCropCanvas();
}

function endDrag() {
  isDragging = false;
}

function closeCropModal() {
  document.getElementById('crop-modal').classList.remove('active');
  document.getElementById('contestant-upload').value = ''; // reset file input
}

async function applyCrop() {
  if (!cropImg) return;
  
  // Bounding guide variables
  const canvasWidth = 300;
  const canvasHeight = 300;
  const cropGuideRadius = 110; // circle guide is 220px wide (radius 110)
  
  // Calculate source dimensions and offsets matching crop guide
  const dw = cropImg.width * cropZoom;
  const dh = cropImg.height * cropZoom;
  
  const dx = (canvasWidth / 2) - (dw / 2) + cropPanX;
  const dy = (canvasHeight / 2) - (dh / 2) + cropPanY;
  
  // Center of crop guide in source image coordinates
  const sx = ((canvasWidth / 2) - dx) / cropZoom;
  const sy = ((canvasHeight / 2) - dy) / cropZoom;
  const sr = cropGuideRadius / cropZoom;
  
  // Source crop bounding box parameters
  const cropX = sx - sr;
  const cropY = sy - sr;
  const cropW = sr * 2;
  const cropH = sr * 2;
  
  // Render cropped frame to offscreen 500x500 canvas (reasonable max dimensions)
  const offscreen = document.createElement('canvas');
  offscreen.width = 500;
  offscreen.height = 500;
  const oCtx = offscreen.getContext('2d');
  
  // Enable high quality scaling
  oCtx.imageSmoothingEnabled = true;
  oCtx.imageSmoothingQuality = 'high';
  
  oCtx.drawImage(cropImg, cropX, cropY, cropW, cropH, 0, 0, 500, 500);
  
  // Convert cropped frame to compressed JPEG at 0.85 quality (highly optimized storage footprint, ~30KB)
  const dataUrl = offscreen.toDataURL('image/jpeg', 0.85);
  
  try {
    const response = await fetch('api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: dataUrl })
    });
    
    if (!response.ok) throw new Error('Upload failed');
    
    const result = await response.json();
    
    // Save to form URL input
    document.getElementById('contestant-photo').value = result.photo;
    
    // Set preview option
    currentSelectedAvatar = result.photo;
    document.querySelectorAll('.avatar-option').forEach(opt => opt.classList.remove('selected'));
    
    // Successfully applied
    closeCropModal();
  } catch (err) {
    alert('Cropping error: ' + err.message);
  }
}
