function renderNav(active) {
  const user = JSON.parse(localStorage.getItem('erw_user') || 'null');
  if (!user) { window.location.href = 'index.html'; return; }
  const menu = [
    { href: 'dashboard.html', label: 'Dashboard' },
    { href: 'input-sadap.html', label: 'Input Sadap' },
    { href: 'data-master.html', label: 'Data Master' },
    { href: 'rekap-upah.html', label: 'Rekap Produksi' },
    { href: 'riwayat.html', label: 'Riwayat & Log' },
    { href: 'pengguna.html', label: 'Pengguna' },
  ];
  const nav = document.createElement('nav');
  nav.className = 'navbar navbar-expand-lg navbar-dark mb-4';
  nav.style.background = '#2d6a4f';
  nav.innerHTML = `
    <div class="container-fluid">
      <a class="navbar-brand d-flex align-items-center gap-2" href="dashboard.html">
        <img src="logo-ptpn4.png" alt="Logo" style="height:32px;">
        <span class="fw-bold">E-Rubber Weight</span>
      </a>
      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navMenu">
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="collapse navbar-collapse" id="navMenu">
        <ul class="navbar-nav me-auto">
          ${menu.map(m => `<li class="nav-item"><a class="nav-link ${active===m.href?'active fw-bold':''}" href="${m.href}">${m.label}</a></li>`).join('')}
        </ul>
        <div class="dropdown">
          <button class="btn btn-outline-light btn-sm dropdown-toggle" data-bs-toggle="dropdown">
            ${user.nama || user.username} <span class="badge bg-light text-dark ms-1">${user.role}</span>
          </button>
          <ul class="dropdown-menu dropdown-menu-end">
            <li><a class="dropdown-item" href="#" onclick="bukaGantiPassword(); return false;">Ganti Password</a></li>
            <li><hr class="dropdown-divider"></li>
            <li><a class="dropdown-item" href="#" onclick="logout(); return false;">Keluar</a></li>
          </ul>
        </div>
      </div>
    </div>
  `;
  document.body.prepend(nav);
  renderModalGantiPassword();
}

function renderModalGantiPassword() {
  const modalHtml = `
  <div class="modal fade" id="modalGantiPassword" tabindex="-1">
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header"><h6 class="modal-title">Ganti Password</h6></div>
        <div class="modal-body">
          <div class="mb-2">
            <label class="form-label small">Password Lama</label>
            <input type="password" class="form-control" id="passwordLama">
          </div>
          <div class="mb-2">
            <label class="form-label small">Password Baru (min. 6 karakter)</label>
            <input type="password" class="form-control" id="passwordBaru">
          </div>
          <div class="mb-2">
            <label class="form-label small">Ulangi Password Baru</label>
            <input type="password" class="form-control" id="passwordBaruUlang">
          </div>
          <div id="msgGantiPassword" class="alert py-2 d-none"></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" data-bs-dismiss="modal">Batal</button>
          <button class="btn text-white" style="background:#2d6a4f;" onclick="simpanGantiPassword()">Simpan</button>
        </div>
      </div>
    </div>
  </div>`;
  const div = document.createElement('div');
  div.innerHTML = modalHtml;
  document.body.appendChild(div);
}

function bukaGantiPassword() {
  document.getElementById('passwordLama').value = '';
  document.getElementById('passwordBaru').value = '';
  document.getElementById('passwordBaruUlang').value = '';
  document.getElementById('msgGantiPassword').classList.add('d-none');
  new bootstrap.Modal(document.getElementById('modalGantiPassword')).show();
}

async function simpanGantiPassword() {
  const user = getUser();
  const password_lama = document.getElementById('passwordLama').value;
  const password_baru = document.getElementById('passwordBaru').value;
  const password_baru_ulang = document.getElementById('passwordBaruUlang').value;
  const msg = document.getElementById('msgGantiPassword');

  if (password_baru !== password_baru_ulang) {
    msg.className = 'alert alert-danger py-2';
    msg.textContent = 'Password baru dan pengulangannya tidak sama';
    msg.classList.remove('d-none');
    return;
  }

  const res = await fetch('/api/ganti-password', {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ user_id: user.id, password_lama, password_baru })
  });
  const data = await res.json();
  msg.classList.remove('d-none');
  if (!res.ok) {
    msg.className = 'alert alert-danger py-2';
    msg.textContent = data.error;
  } else {
    msg.className = 'alert alert-success py-2';
    msg.textContent = 'Password berhasil diubah';
    setTimeout(() => bootstrap.Modal.getInstance(document.getElementById('modalGantiPassword')).hide(), 1000);
  }
}

function logout() {
  localStorage.removeItem('erw_user');
  window.location.href = 'index.html';
}
function getUser() {
  return JSON.parse(localStorage.getItem('erw_user') || 'null');
}
function formatRupiah(angka) {
  return 'Rp ' + Number(angka || 0).toLocaleString('id-ID');
}
