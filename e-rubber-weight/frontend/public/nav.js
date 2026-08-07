function renderNav(active) {
  const user = JSON.parse(localStorage.getItem('erw_user') || 'null');
  if (!user) { window.location.href = 'index.html'; return; }
  const menu = [
    { href: 'dashboard.html', label: 'Dashboard', icon: '📊' },
    { href: 'input-sadap.html', label: 'Input Sadap', icon: '📝' },
    { href: 'data-master.html', label: 'Data Master', icon: '🗂️' },
    { href: 'rekap-upah.html', label: 'Rekap Upah', icon: '💰' },
    { href: 'riwayat.html', label: 'Riwayat & Log', icon: '📜' },
  ];
  const nav = document.createElement('nav');
  nav.className = 'navbar navbar-expand-lg navbar-dark mb-4';
  nav.style.background = '#2d6a4f';
  nav.innerHTML = `
    <div class="container-fluid">
      <a class="navbar-brand fw-bold" href="dashboard.html">🌱 E-Rubber Weight</a>
      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navMenu">
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="collapse navbar-collapse" id="navMenu">
        <ul class="navbar-nav me-auto">
          ${menu.map(m => `<li class="nav-item"><a class="nav-link ${active===m.href?'active fw-bold':''}" href="${m.href}">${m.icon} ${m.label}</a></li>`).join('')}
        </ul>
        <span class="navbar-text text-white me-3">👤 ${user.nama || user.username}</span>
        <button class="btn btn-outline-light btn-sm" onclick="logout()">Keluar</button>
      </div>
    </div>
  `;
  document.body.prepend(nav);
}
function logout() {
  localStorage.removeItem('erw_user');
  window.location.href = 'index.html';
}
function getUser() {
  return JSON.parse(localStorage.getItem('erw_user') || 'null');
}
