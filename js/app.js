/* ─── Config ─── */
const API_BASE  = 'https://bymykel.github.io/CSGO-API/api/en/';
const RAW_BASE  = 'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/';
const PROXY_URL = 'https://corsproxy.io/?';
const FILES = {
  skins:     'skins.json',
  agents:    'agents.json',
  keychains: 'keychains.json',
  stickers:  'stickers.json',
  music:     'music_kits.json',
};
const PAGE_SIZE = 30;

async function fetchJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}

/* ─── Weapon defindex fallback map ─── */
const WEAPON_DEFINDEX = {
  weapon_deagle:1, weapon_elite:2, weapon_fiveseven:3, weapon_glock:4,
  weapon_ak47:7, weapon_aug:8, weapon_awp:9, weapon_famas:10,
  weapon_g3sg1:11, weapon_galilar:13, weapon_m249:14, weapon_m4a1:16,
  weapon_mac10:17, weapon_p90:19, weapon_mp5sd:23, weapon_ump45:24,
  weapon_xm1014:25, weapon_bizon:26, weapon_mag7:27, weapon_negev:28,
  weapon_sawedoff:29, weapon_tec9:30, weapon_p2000:32, weapon_mp7:33,
  weapon_mp9:34, weapon_nova:35, weapon_p250:36, weapon_scar20:38,
  weapon_sg556:39, weapon_ssg08:40, weapon_knife:42, weapon_knife_t:59,
  weapon_m4a1_silencer:60, weapon_usp_silencer:61, weapon_cz75a:63,
  weapon_revolver:64,
  // Knives
  weapon_bayonet:500, weapon_flip:505, weapon_gut:506, weapon_knifegg:507,
  weapon_knife_m9_bayonet:508, weapon_knife_tactical:509,
  weapon_knife_falchion:512, weapon_knife_bowie:514,
  weapon_knife_butterfly:515, weapon_knife_push:516,
  weapon_knife_cord:517, weapon_knife_canis:518,
  weapon_knife_ursus:519, weapon_knife_gypsy_jackknife:520,
  weapon_knife_stiletto:521, weapon_knife_widowmaker:522,
  weapon_knife_css:523, weapon_knife_skeleton:525,
  weapon_knife_outdoor:526, weapon_knife_ghost:527,
  // Gloves
  leather_handwraps:5032, motorcycle_gloves:5033, specialist_gloves:5034,
  bloodhound_gloves:5027, sporty_gloves:5030, slick_gloves:5031,
  hydra_gloves:5035, driver_gloves:5028,
};

/* ─── State ─── */
const cache = {};
const state = {};
['skins', 'agents', 'keychains', 'stickers', 'music'].forEach(t => {
  state[t] = { query: '', filter: '', filterType: 'weapon', page: 0, matches: [] };
});

/* ─── Tab switching ─── */
let currentTab = 'skins';
function switchTab(name) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('panel-' + name).classList.add('active');
  document.querySelector(`.tab-btn[data-tab="${name}"]`).classList.add('active');
  currentTab = name;
}

/* ─── API status indicator ─── */
function setDot(cls, label) {
  document.getElementById('dot').className = 'dot ' + cls;
  document.getElementById('api-label').textContent = label;
}
function setStatusBar(type, msg) {
  const el = document.getElementById('status-' + type);
  if (el) el.textContent = msg;
}

/* ─── Fetch with cache + three-level fallback ─── */
async function loadData(type) {
  if (cache[type]) return cache[type];
  setDot('loading', 'fetching ' + type + '…');

  const file = FILES[type];
  let data;

  // 1️⃣ Primary: GitHub Pages CDN
  try {
    data = await fetchJson(API_BASE + file);
  } catch (_) {}

  // 2️⃣ Fallback: raw GitHub content
  if (!data) {
    try {
      setDot('loading', 'trying raw.githubusercontent…');
      data = await fetchJson(RAW_BASE + file);
    } catch (_) {}
  }

  // 3️⃣ Last resort: CORS proxy (handles file:// origin restrictions)
  if (!data) {
    setDot('loading', 'using cors proxy…');
    data = await fetchJson(PROXY_URL + encodeURIComponent(API_BASE + file));
  }

  cache[type] = data;
  const cnt = document.getElementById('cnt-' + type);
  if (cnt) cnt.textContent = data.length.toLocaleString();

  const allTypes = ['skins', 'agents', 'keychains', 'stickers', 'music'];
  const loaded = allTypes.filter(t => cache[t]);
  if (loaded.length === allTypes.length) {
    const total = allTypes.reduce((s, t) => s + cache[t].length, 0);
    setDot('online', total.toLocaleString() + ' items cached');
  } else {
    setDot('online', type + ' loaded');
  }
  return data;
}

/* ─── Filter helpers ─── */
function setWeaponFilter(btn, wid) {
  document.querySelectorAll('#weapon-filters .filter-pill').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  state.skins.filter = wid;
  state.skins.filterType = 'weapon';
  if (state.skins.matches.length || state.skins.query) execSearch('skins');
}

function setCatFilter(btn, cat) {
  document.querySelectorAll('#weapon-filters .filter-pill').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  state.skins.filter = cat;
  state.skins.filterType = 'category';
  if (state.skins.matches.length || state.skins.query) execSearch('skins');
}

function setTeamFilter(btn, team) {
  document.querySelectorAll('#panel-agents .filter-pill').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  state.agents.filter = team;
  if (state.agents.matches.length || state.agents.query) execSearch('agents');
}

/* ─── Search / Browse ─── */
async function execSearch(type) {
  const q = (document.getElementById('q-' + type)?.value ?? '').trim().toLowerCase();
  if (!q && !state[type].filter) {
    setStatusBar(type, '// enter a search term or click Browse All');
    return;
  }
  state[type].query = q;
  state[type].page  = 0;
  try {
    const data = await loadData(type);
    state[type].matches = filterData(type, data, q);
    renderPage(type);
  } catch (e) {
    setDot('error', 'fetch failed');
    setStatusBar(type, '// error: ' + e.message);
    console.error(e);
  }
}

async function browseAll(type) {
  state[type].query = '';
  state[type].page  = 0;
  const input = document.getElementById('q-' + type);
  if (input) input.value = '';
  try {
    const data = await loadData(type);
    state[type].matches = filterData(type, data, '');
    renderPage(type);
  } catch (e) {
    setDot('error', 'fetch failed');
    setStatusBar(type, '// error: ' + e.message);
    console.error(e);
  }
}

function filterData(type, data, q) {
  if (type === 'skins') {
    const { filter, filterType } = state.skins;
    return data.filter(s => {
      const nameOk = !q || s.name.toLowerCase().includes(q);
      let filterOk = true;
      if (filter) {
        if (filterType === 'weapon')   filterOk = s.weapon?.id === filter;
        if (filterType === 'category') filterOk = s.category?.id === filter;
      }
      return nameOk && filterOk;
    });
  }
  if (type === 'agents') {
    const team = state.agents.filter;
    return data.filter(a => {
      const nameOk = !q || a.name.toLowerCase().includes(q);
      const teamOk = !team || a.team?.id === team;
      return nameOk && teamOk;
    });
  }
  return data.filter(item => !q || item.name.toLowerCase().includes(q));
}

/* ─── Render pagination ─── */
function renderPage(type) {
  const { matches, page } = state[type];
  const total = matches.length;
  const shown = Math.min(PAGE_SIZE * (page + 1), total);
  const slice = matches.slice(0, shown);

  const q = state[type].query;
  const statusParts = [`// ${total.toLocaleString()} result${total !== 1 ? 's' : ''} — showing ${shown}`];
  if (q) statusParts.push(`for "${q}"`);
  if (type === 'skins' && state.skins.filter) statusParts.push('filter: ' + state.skins.filter);
  if (type === 'agents' && state.agents.filter) statusParts.push('team: ' + state.agents.filter);
  setStatusBar(type, statusParts.join(' · '));

  const container = document.getElementById('results-' + type);
  if (!slice.length) {
    container.innerHTML = '<div class="state-msg"><span class="big">∅</span>No results found. Try a broader search.</div>';
    document.getElementById('lm-' + type).style.display = 'none';
    return;
  }

  const builders = {
    skins:     buildSkinCard,
    agents:    buildAgentCard,
    keychains: buildKeychainCard,
    stickers:  buildStickerCard,
    music:     buildMusicCard,
  };
  container.innerHTML = slice.map((item, i) => builders[type](item, i)).join('');

  const lm = document.getElementById('lm-' + type);
  lm.style.display = shown < total ? 'flex' : 'none';
}

function loadMore(type) {
  state[type].page++;
  renderPage(type);
  const container = document.getElementById('results-' + type);
  const cards = container.querySelectorAll('.skin-card, .item-card');
  const startIdx = PAGE_SIZE * state[type].page;
  if (cards[startIdx]) cards[startIdx].scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ─── Card builders ─── */
function buildSkinCard(skin, i) {
  const weaponId    = skin.weapon?.id ?? '';
  const defindex    = skin.weapon?.weapon_id ?? WEAPON_DEFINDEX[weaponId] ?? '?';
  const paint       = parseInt(skin.paint_index) || 0;
  const imgUrl      = skin.image ?? '';
  const collection  = skin.collections?.[0]?.name ?? '';
  const rarity      = skin.rarity?.name ?? '';
  const rarityColor = skin.rarity?.color ?? '#888';
  const hasST       = skin.stattrak;
  const hasSou      = skin.souvenir;
  const legacy      = skin.legacy_model ?? false;
  const minF        = skin.min_float ?? null;
  const maxF        = skin.max_float ?? null;
  const floatStr    = (minF !== null && maxF !== null) ? `${minF} – ${maxF}` : '';
  const weaponShort = weaponId.replace('weapon_', '');

  const entry = { weapon_defindex: defindex, weapon_name: weaponId, paint, image: imgUrl, paint_name: skin.name, legacy_model: legacy };
  const entryJson   = JSON.stringify(entry, null, 4) + ',';
  const highlighted = syntaxHighlight(entryJson);
  const escaped     = entryJson.replace(/\\/g, '\\\\').replace(/`/g, '\\`');
  const id = 'sk_' + i;

  return `<div class="skin-card" id="${id}">
  <div class="card-main">
    <div class="card-img-wrap">
      <img class="card-img" src="${esc(imgUrl)}" loading="lazy" onerror="this.style.opacity=0.15" alt="" />
    </div>
    <div class="card-body">
      <div class="card-name">${esc(skin.name)}</div>
      <div class="card-meta">
        <span class="rarity-pip" style="background:${rarityColor}"></span>
        <span class="meta-text">${esc(rarity)}${collection ? ' · ' + esc(collection) : ''}</span>
        ${hasST  ? '<span class="st-badge">StatTrak™</span>' : ''}
        ${hasSou ? '<span class="sou-badge">Souvenir</span>' : ''}
      </div>
      ${floatStr ? `<div class="float-range">float ${esc(floatStr)}</div>` : ''}
    </div>
    <div class="card-codes">
      <div class="code-pair">
        <span class="code-label">defindex</span>
        <span class="code-val" onclick="copyVal(this,'${defindex}')" title="copy defindex">${defindex}</span>
      </div>
      <div class="code-pair">
        <span class="code-label">paint</span>
        <span class="code-val" onclick="copyVal(this,'${paint}')" title="copy paint index">${paint}</span>
      </div>
      <div class="code-pair">
        <span class="code-label">weapon</span>
        <span class="code-val wide" onclick="copyVal(this,'${esc(weaponId)}')" title="copy weapon name">${esc(weaponShort)}</span>
      </div>
    </div>
  </div>
  <button class="expand-btn" onclick="toggleCard('${id}')">
    <span class="expand-arrow" id="arr_${id}">▼</span>
    plugin entry json
  </button>
  <div class="card-footer" id="foot_${id}">
    <div class="footer-actions">
      <button class="action-btn" onclick="copyFull(this,\`${escaped}\`)">⎘ copy json</button>
      <button class="action-btn" onclick="copyFull(this,'${defindex}')">⎘ defindex</button>
      <button class="action-btn" onclick="copyFull(this,'${paint}')">⎘ paint</button>
    </div>
    <div class="json-output">${highlighted}</div>
  </div>
</div>`;
}

function buildAgentCard(agent, i) {
  const defindex    = agent.def_index ?? '?';
  const imgUrl      = agent.image ?? '';
  const rarity      = agent.rarity?.name ?? '';
  const rarityColor = agent.rarity?.color ?? '#888';
  const team        = agent.team?.name ?? '';
  const collection  = agent.collections?.[0]?.name ?? '';

  const entry = { agent_name: agent.name, def_index: parseInt(defindex) || defindex, team: agent.team?.id ?? '', model_player: agent.model_player ?? '' };
  const entryJson   = JSON.stringify(entry, null, 4) + ',';
  const highlighted = syntaxHighlight(entryJson);
  const escaped     = entryJson.replace(/\\/g, '\\\\').replace(/`/g, '\\`');
  const id = 'ag_' + i;

  return `<div class="item-card" id="${id}">
  <div class="card-main">
    <div class="card-img-wrap">
      <img class="card-img" src="${esc(imgUrl)}" loading="lazy" onerror="this.style.opacity=0.15" alt="" style="width:56px;height:56px;object-fit:cover;object-position:top" />
    </div>
    <div class="card-body">
      <div class="card-name">${esc(agent.name)}</div>
      <div class="card-meta">
        <span class="rarity-pip" style="background:${rarityColor}"></span>
        <span class="meta-text">${esc(rarity)}${team ? ' · ' + esc(team) : ''}${collection ? ' · ' + esc(collection) : ''}</span>
      </div>
    </div>
    <div class="card-codes">
      <div class="code-pair">
        <span class="code-label">def_index</span>
        <span class="code-val" onclick="copyVal(this,'${defindex}')" title="copy def_index">${defindex}</span>
      </div>
    </div>
  </div>
  <button class="expand-btn" onclick="toggleCard('${id}')">
    <span class="expand-arrow" id="arr_${id}">▼</span>
    agent entry json
  </button>
  <div class="card-footer" id="foot_${id}">
    <div class="footer-actions">
      <button class="action-btn" onclick="copyFull(this,\`${escaped}\`)">⎘ copy json</button>
      <button class="action-btn" onclick="copyFull(this,'${defindex}')">⎘ def_index</button>
    </div>
    <div class="json-output">${highlighted}</div>
  </div>
</div>`;
}

function buildKeychainCard(kc, i) {
  const defindex    = kc.def_index ?? '?';
  const imgUrl      = kc.image ?? '';
  const rarity      = kc.rarity?.name ?? '';
  const rarityColor = kc.rarity?.color ?? '#888';
  const collection  = kc.collections?.[0]?.name ?? '';

  const entry = { keychain_name: kc.name, def_index: parseInt(defindex) || defindex };
  const entryJson   = JSON.stringify(entry, null, 4) + ',';
  const highlighted = syntaxHighlight(entryJson);
  const escaped     = entryJson.replace(/\\/g, '\\\\').replace(/`/g, '\\`');
  const id = 'kc_' + i;

  return `<div class="item-card" id="${id}">
  <div class="card-main">
    <div class="card-img-wrap">
      <img class="card-img" src="${esc(imgUrl)}" loading="lazy" onerror="this.style.opacity=0.15" alt="" style="width:56px;height:56px;object-fit:contain" />
    </div>
    <div class="card-body">
      <div class="card-name">${esc(kc.name)}</div>
      <div class="card-meta">
        <span class="rarity-pip" style="background:${rarityColor}"></span>
        <span class="meta-text">${esc(rarity)}${collection ? ' · ' + esc(collection) : ''}</span>
      </div>
    </div>
    <div class="card-codes">
      <div class="code-pair">
        <span class="code-label">def_index</span>
        <span class="code-val" onclick="copyVal(this,'${defindex}')" title="copy def_index">${defindex}</span>
      </div>
    </div>
  </div>
  <button class="expand-btn" onclick="toggleCard('${id}')">
    <span class="expand-arrow" id="arr_${id}">▼</span>
    keychain entry json
  </button>
  <div class="card-footer" id="foot_${id}">
    <div class="footer-actions">
      <button class="action-btn" onclick="copyFull(this,\`${escaped}\`)">⎘ copy json</button>
      <button class="action-btn" onclick="copyFull(this,'${defindex}')">⎘ def_index</button>
    </div>
    <div class="json-output">${highlighted}</div>
  </div>
</div>`;
}

function buildStickerCard(sticker, i) {
  const stickerIdNum = parseInt((sticker.id ?? '').replace(/\D/g, '')) || 0;
  const imgUrl       = sticker.image ?? '';
  const rarity       = sticker.rarity?.name ?? '';
  const rarityColor  = sticker.rarity?.color ?? '#888';
  const type         = sticker.type ?? '';
  const tournament   = sticker.tournament_event ?? '';

  const entry = { sticker_name: sticker.name, sticker_id: stickerIdNum };
  const entryJson   = JSON.stringify(entry, null, 4) + ',';
  const highlighted = syntaxHighlight(entryJson);
  const escaped     = entryJson.replace(/\\/g, '\\\\').replace(/`/g, '\\`');
  const id = 'st_' + i;

  return `<div class="item-card" id="${id}">
  <div class="card-main">
    <div class="card-img-wrap">
      <img class="card-img" src="${esc(imgUrl)}" loading="lazy" onerror="this.style.opacity=0.15" alt="" style="width:56px;height:56px;object-fit:contain" />
    </div>
    <div class="card-body">
      <div class="card-name">${esc(sticker.name)}</div>
      <div class="card-meta">
        <span class="rarity-pip" style="background:${rarityColor}"></span>
        <span class="meta-text">${esc(rarity)}${type ? ' · ' + esc(type) : ''}${tournament ? ' · ' + esc(tournament) : ''}</span>
      </div>
    </div>
    <div class="card-codes">
      <div class="code-pair">
        <span class="code-label">sticker_id</span>
        <span class="code-val" onclick="copyVal(this,'${stickerIdNum}')" title="copy sticker_id">${stickerIdNum}</span>
      </div>
    </div>
  </div>
  <button class="expand-btn" onclick="toggleCard('${id}')">
    <span class="expand-arrow" id="arr_${id}">▼</span>
    sticker entry json
  </button>
  <div class="card-footer" id="foot_${id}">
    <div class="footer-actions">
      <button class="action-btn" onclick="copyFull(this,\`${escaped}\`)">⎘ copy json</button>
      <button class="action-btn" onclick="copyFull(this,'${stickerIdNum}')">⎘ sticker_id</button>
    </div>
    <div class="json-output">${highlighted}</div>
  </div>
</div>`;
}

function buildMusicCard(mk, i) {
  const musicId     = parseInt((mk.id ?? '').replace(/\D/g, '')) || 0;
  const imgUrl      = mk.image ?? '';
  const rarity      = mk.rarity?.name ?? '';
  const rarityColor = mk.rarity?.color ?? '#888';
  const exclusive   = mk.exclusive ?? false;

  const entry = { music_kit_name: mk.name, music_kit_id: musicId };
  const entryJson   = JSON.stringify(entry, null, 4) + ',';
  const highlighted = syntaxHighlight(entryJson);
  const escaped     = entryJson.replace(/\\/g, '\\\\').replace(/`/g, '\\`');
  const id = 'mk_' + i;

  return `<div class="item-card" id="${id}">
  <div class="card-main">
    <div class="card-img-wrap">
      <img class="card-img" src="${esc(imgUrl)}" loading="lazy" onerror="this.style.opacity=0.15" alt="" style="width:56px;height:56px;object-fit:contain" />
    </div>
    <div class="card-body">
      <div class="card-name">${esc(mk.name)}</div>
      <div class="card-meta">
        <span class="rarity-pip" style="background:${rarityColor}"></span>
        <span class="meta-text">${esc(rarity)}${exclusive ? ' · StatTrak Exclusive' : ''}</span>
      </div>
    </div>
    <div class="card-codes">
      <div class="code-pair">
        <span class="code-label">music_id</span>
        <span class="code-val" onclick="copyVal(this,'${musicId}')" title="copy music_kit_id">${musicId}</span>
      </div>
    </div>
  </div>
  <button class="expand-btn" onclick="toggleCard('${id}')">
    <span class="expand-arrow" id="arr_${id}">▼</span>
    music kit entry json
  </button>
  <div class="card-footer" id="foot_${id}">
    <div class="footer-actions">
      <button class="action-btn" onclick="copyFull(this,\`${escaped}\`)">⎘ copy json</button>
      <button class="action-btn" onclick="copyFull(this,'${musicId}')">⎘ music_id</button>
    </div>
    <div class="json-output">${highlighted}</div>
  </div>
</div>`;
}

/* ─── Shared utilities ─── */
function toggleCard(id) {
  const foot = document.getElementById('foot_' + id);
  const arr  = document.getElementById('arr_'  + id);
  const open = foot.classList.toggle('open');
  arr.classList.toggle('open', open);
}

function copyVal(el, val) {
  navigator.clipboard.writeText(val)
    .then(() => {
      const orig = el.textContent;
      el.classList.add('copied');
      el.textContent = '✓';
      setTimeout(() => { el.classList.remove('copied'); el.textContent = orig; }, 1200);
    })
    .catch(() => fallbackCopy(val));
}

function copyFull(btn, text) {
  navigator.clipboard.writeText(text)
    .then(() => {
      const orig = btn.textContent;
      btn.classList.add('copied');
      btn.textContent = '✓ copied!';
      setTimeout(() => { btn.classList.remove('copied'); btn.textContent = orig; }, 1500);
    })
    .catch(() => fallbackCopy(text));
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;opacity:0';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
}

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function syntaxHighlight(json) {
  return json
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+\.?\d*)/g, m => {
      if (/^"/.test(m)) {
        if (/:$/.test(m)) return '<span class="j-key">' + m + '</span>';
        return '<span class="j-str">' + m + '</span>';
      }
      if (/true|false/.test(m)) return '<span class="j-bool">' + m + '</span>';
      return '<span class="j-num">' + m + '</span>';
    });
}

/* ─── Keyboard shortcuts ─── */
document.addEventListener('keydown', e => {
  const tag = document.activeElement.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') {
    if (e.key === 'Enter') execSearch(currentTab);
    return;
  }
  if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
    const input = document.getElementById('q-' + currentTab);
    if (input) input.focus();
  }
});
