/* ============================================
   RAJRAUSHAN DOWNLOADER — UPGRADED JS
   Dark/Light Mode + History + Toast + Clipboard
   ============================================ */

let currentFormats = [];
let currentTab = 'video';
let currentUrl = '';
let currentVideoInfo = null;
let pollInterval = null;

// ── Theme ─────────────────────────────────────
function initTheme() {
  const saved = localStorage.getItem('rr-theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeIcon(saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('rr-theme', next);
  updateThemeIcon(next);
  showToast(next === 'light' ? '☀️ Light mode on!' : '🌙 Dark mode on!', 'info');
}

function updateThemeIcon(theme) {
  const icon = document.getElementById('themeIcon');
  if (icon) icon.textContent = theme === 'light' ? '☀️' : '🌙';
}

// ── Toast ─────────────────────────────────────
let toastTimer = null;
function showToast(msg, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast ${type} show`;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
}

// ── Animated Stats Counter ────────────────────
function animateCounters() {
  const els = document.querySelectorAll('.stat-num[data-target]');
  els.forEach(el => {
    const target = parseInt(el.dataset.target);
    const duration = 1600;
    const step = target / (duration / 16);
    let current = 0;
    const timer = setInterval(() => {
      current += step;
      if (current >= target) { current = target; clearInterval(timer); }
      if (target >= 1_000_000) el.textContent = (current / 1_000_000).toFixed(1) + 'M+';
      else if (target >= 1_000) el.textContent = Math.floor(current / 1_000) + 'K+';
      else el.textContent = Math.floor(current) + (target === 100 ? '' : '+');
    }, 16);
  });
}

// ── Clipboard Paste ───────────────────────────
async function pasteFromClipboard() {
  try {
    const text = await navigator.clipboard.readText();
    if (text && text.startsWith('http')) {
      document.getElementById('urlInput').value = text;
      showToast('📋 URL paste ho gayi!', 'success');
    } else {
      showToast('Clipboard mein valid URL nahi mili', 'error');
    }
  } catch (e) {
    showToast('Clipboard access nahi mila. Manually paste karo.', 'error');
  }
}

// ── Utility ───────────────────────────────────
function formatDuration(s) {
  if (!s) return '0:00';
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h > 0 ? `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}` : `${m}:${String(sec).padStart(2,'0')}`;
}
function formatViews(n) {
  if (!n) return '0';
  if (n >= 1_000_000) return `${(n/1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n/1_000).toFixed(0)}K`;
  return String(n);
}
function timeAgo(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return 'abhi';
  if (diff < 3600) return `${Math.floor(diff/60)}m pehle`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h pehle`;
  return `${Math.floor(diff/86400)}d pehle`;
}

function setExample(url) {
  document.getElementById('urlInput').value = url;
  document.getElementById('urlInput').focus();
  showToast('URL set! Ab FETCH karo.', 'info');
}

// ── State ─────────────────────────────────────
function resetUI() {
  hide(document.getElementById('loadingState'));
  hide(document.getElementById('errorState'));
  hide(document.getElementById('infoCard'));
  hide(document.getElementById('downloadProgress'));
  hide(document.getElementById('downloadReady'));
  if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
}
function show(el) { el && el.classList.add('visible'); }
function hide(el) { el && el.classList.remove('visible'); }

function showError(msg) {
  resetUI();
  document.getElementById('errorMsg').textContent = msg;
  show(document.getElementById('errorState'));
  showToast('❌ ' + msg.substring(0, 50), 'error');
}

// ── Fetch Video Info ──────────────────────────
async function fetchInfo() {
  const url = document.getElementById('urlInput').value.trim();
  if (!url) { document.getElementById('urlInput').focus(); showToast('URL daalo pehle!', 'error'); return; }

  currentUrl = url;
  resetUI();

  const btn = document.getElementById('fetchBtn');
  const btnText = document.getElementById('fetchBtnText');
  btn.disabled = true;
  btnText.textContent = 'LOADING...';
  show(document.getElementById('loadingState'));

  try {
    const res = await fetch('/api/info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || 'Failed to fetch');
    currentVideoInfo = data;
    displayInfo(data);
    showToast('✅ Video info mil gayi!', 'success');
  } catch (err) {
    showError(err.message || 'URL check karo aur dobara try karo.');
  } finally {
    btn.disabled = false;
    btnText.textContent = 'FETCH';
    hide(document.getElementById('loadingState'));
  }
}

function displayInfo(data) {
  currentFormats = data.formats || [];
  document.getElementById('videoTitle').textContent = data.title || 'Unknown';
  document.getElementById('thumbnail').src = data.thumbnail || '';
  document.getElementById('uploaderChip').textContent = `👤 ${data.uploader || 'Unknown'}`;
  document.getElementById('durationChip').textContent = `⏱ ${formatDuration(data.duration)}`;
  document.getElementById('viewsChip').textContent = `👁 ${formatViews(data.view_count)} views`;

  // Quality badges
  const badges = document.getElementById('qualityBadges');
  const hasUHD = currentFormats.some(f => f.label.includes('2160'));
  const hasFHD = currentFormats.some(f => f.label.includes('1080'));
  const hasHD = currentFormats.some(f => f.label.includes('720'));
  const hasAudio = currentFormats.some(f => f.type === 'audio');
  let bhtml = '';
  if (hasUHD) bhtml += `<span class="q-badge uhd">4K UHD</span>`;
  if (hasFHD) bhtml += `<span class="q-badge fhd">1080p FHD</span>`;
  if (hasHD) bhtml += `<span class="q-badge hd">720p HD</span>`;
  if (hasAudio) bhtml += `<span class="q-badge audio">AUDIO</span>`;
  badges.innerHTML = bhtml;

  switchTab('video');
  show(document.getElementById('infoCard'));
  document.getElementById('infoCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Tab Switching ─────────────────────────────
function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  renderFormats(tab);
}

function renderFormats(tab) {
  const grid = document.getElementById('formatGrid');
  const filtered = currentFormats.filter(f => f.type === tab);
  if (filtered.length === 0) {
    grid.innerHTML = `<div class="no-formats">❌ Koi ${tab} format nahi mila is URL ke liye.</div>`;
    return;
  }
  grid.innerHTML = filtered.map(f => `
    <div class="format-item" onclick="startDownload('${f.format_id}', '${f.type}')">
      <div class="format-type">${f.type.toUpperCase()}</div>
      <div class="format-label">${f.label}</div>
      <div class="format-size">${f.size}</div>
      <button class="format-dl-btn">⬇ DOWNLOAD</button>
    </div>
  `).join('');
}

// ── Download Flow ─────────────────────────────
let currentDownloadType = 'video';
async function startDownload(formatId, type) {
  currentDownloadType = type;
  hide(document.getElementById('downloadReady'));
  show(document.getElementById('downloadProgress'));
  document.getElementById('progressLabel').textContent = 'Starting...';
  document.getElementById('progressPercent').textContent = '0%';
  document.getElementById('progressBar').style.width = '0%';
  document.getElementById('progressSpeed').textContent = 'Speed: --';
  document.getElementById('progressEta').textContent = 'ETA: --';
  document.getElementById('downloadProgress').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  showToast('⬇ Download shuru ho raha hai...', 'info');

  try {
    const res = await fetch('/api/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: currentUrl, format_id: formatId, type })
    });
    const data = await res.json();
    if (!res.ok || !data.task_id) throw new Error(data.error || 'Download start nahi hua');
    pollProgress(data.task_id);
  } catch (err) {
    hide(document.getElementById('downloadProgress'));
    showError(err.message);
  }
}

function pollProgress(taskId) {
  if (pollInterval) clearInterval(pollInterval);
  pollInterval = setInterval(async () => {
    try {
      const res = await fetch(`/api/progress/${taskId}`);
      const data = await res.json();
      updateProgress(data, taskId);
    } catch (e) {}
  }, 700);
}

function updateProgress(data, taskId) {
  const label = document.getElementById('progressLabel');
  const pct = document.getElementById('progressPercent');
  const bar = document.getElementById('progressBar');

  if (data.status === 'starting') {
    label.textContent = 'Taiyari ho rahi hai...';
  } else if (data.status === 'downloading') {
    label.textContent = 'Download ho raha hai...';
    const p = data.percent || 0;
    pct.textContent = `${p}%`;
    bar.style.width = `${p}%`;
    document.getElementById('progressSpeed').textContent = `Speed: ${data.speed || '--'}`;
    document.getElementById('progressEta').textContent = data.eta ? `ETA: ${data.eta}s` : 'ETA: --';
  } else if (data.status === 'finished' || data.status === 'done') {
    pct.textContent = '100%';
    bar.style.width = '100%';
    label.textContent = 'Processing...';
    clearInterval(pollInterval);
    setTimeout(() => showDownloadReady(taskId), 1200);
  } else if (data.status === 'error') {
    clearInterval(pollInterval);
    hide(document.getElementById('downloadProgress'));
    showError(data.error || 'Download fail ho gayi.');
  }
}

function showDownloadReady(taskId) {
  hide(document.getElementById('downloadProgress'));
  document.getElementById('downloadLink').href = `/api/serve/${taskId}`;
  show(document.getElementById('downloadReady'));
  document.getElementById('downloadReady').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  showToast('🎉 Download taiyar hai!', 'success');

  // Add to history
  if (currentVideoInfo) addToHistory(currentVideoInfo, currentDownloadType);
}

function resetDownload() {
  hide(document.getElementById('downloadReady'));
  hide(document.getElementById('downloadProgress'));
  document.getElementById('urlInput').value = '';
  currentUrl = '';
  currentVideoInfo = null;
  hide(document.getElementById('infoCard'));
  window.scrollTo({ top: 0, behavior: 'smooth' });
  showToast('Naya download shuru karo!', 'info');
}

// ── Download History ──────────────────────────
function addToHistory(info, type) {
  const history = getHistory();
  const item = {
    id: Date.now(),
    title: info.title || 'Unknown',
    thumbnail: info.thumbnail || '',
    type,
    url: currentUrl,
    timestamp: Date.now()
  };
  history.unshift(item);
  if (history.length > 10) history.pop(); // max 10 items
  localStorage.setItem('rr-history', JSON.stringify(history));
  renderHistory();
}

function getHistory() {
  try { return JSON.parse(localStorage.getItem('rr-history') || '[]'); } catch { return []; }
}

function renderHistory() {
  const history = getHistory();
  const section = document.getElementById('historySection');
  const list = document.getElementById('historyList');
  if (!history.length) { section.style.display = 'none'; return; }
  section.style.display = 'block';
  list.innerHTML = history.map(item => `
    <div class="history-item">
      <img class="history-thumb" src="${item.thumbnail}" alt="" onerror="this.style.display='none'" />
      <div class="history-info">
        <div class="history-name">${item.title}</div>
        <div class="history-meta">${item.url.substring(0,50)}...</div>
      </div>
      <span class="history-type ${item.type}">${item.type.toUpperCase()}</span>
      <span class="history-time">${timeAgo(item.timestamp)}</span>
    </div>
  `).join('');
}

function clearHistory() {
  localStorage.removeItem('rr-history');
  renderHistory();
  showToast('🗑 History clear!', 'info');
}

// ── Init ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  animateCounters();
  renderHistory();

  document.getElementById('urlInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') fetchInfo();
  });

  // Auto-detect pasted URL
  document.getElementById('urlInput').addEventListener('paste', e => {
    setTimeout(() => {
      const val = document.getElementById('urlInput').value.trim();
      if (val.startsWith('http')) showToast('URL paste! FETCH dabao.', 'info');
    }, 100);
  });
});

// ── Copy Email ────────────────────────────────
function copyEmail() {
  const email = 'rajraushankumar360@gmail.com';
  navigator.clipboard.writeText(email).then(() => {
    showToast('📋 Email copy ho gayi!', 'success');
    // Update both copy buttons
    const btn = document.getElementById('copyBtnText');
    if (btn) {
      btn.textContent = '✅ Copied!';
      const parent = btn.closest('button');
      if (parent) parent.classList.add('copied');
      setTimeout(() => {
        btn.textContent = '📋 Email Address Copy Karo';
        if (parent) parent.classList.remove('copied');
      }, 2500);
    }
  }).catch(() => {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = email;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('📋 Email copy ho gayi!', 'success');
  });
}
