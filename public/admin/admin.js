let csrfToken = null;

async function api(path, opts = {}) {
  const headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
  if (csrfToken) headers['X-CSRF-Token'] = csrfToken;
  const res = await fetch(path, Object.assign({}, opts, { headers }));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Ошибка запроса');
  return data;
}

function showApp(show) {
  document.getElementById('loginBox').hidden = show;
  document.getElementById('app').hidden = !show;
}

function fmtDate(iso) {
  if (!iso) return '';
  return new Date(iso.replace(' ', 'T') + 'Z').toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

const STATUS_LABELS = { new: 'Новая', in_progress: 'В работе', done: 'Завершена' };

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s || '';
  return d.innerHTML;
}

async function loadLeads() {
  const { leads } = await api('/api/admin/leads');
  const body = document.getElementById('leadsBody');
  body.innerHTML = leads.map((l) => `
    <tr>
      <td>${fmtDate(l.created_at)}</td>
      <td>${escapeHtml(l.name)}</td>
      <td><a href="tel:${l.phone.replace(/[^\d+]/g, '')}">${escapeHtml(l.phone)}</a></td>
      <td>${escapeHtml(l.child_age || '')}</td>
      <td>
        <select data-id="${l.id}">
          ${Object.entries(STATUS_LABELS).map(([v, label]) => `<option value="${v}" ${v === l.status ? 'selected' : ''}>${label}</option>`).join('')}
        </select>
      </td>
    </tr>
  `).join('');

  body.querySelectorAll('select').forEach((sel) => {
    sel.addEventListener('change', async () => {
      await api(`/api/admin/leads/${sel.dataset.id}/status`, {
        method: 'POST',
        body: JSON.stringify({ status: sel.value }),
      });
    });
  });
}

async function tryRestoreSession() {
  try {
    const data = await api('/api/admin/me');
    csrfToken = data.csrfToken;
    showApp(true);
    loadLeads();
  } catch {
    showApp(false);
  }
}

document.getElementById('loginBtn').addEventListener('click', async () => {
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errEl = document.getElementById('loginError');
  errEl.hidden = true;
  try {
    const data = await api('/api/admin/login', { method: 'POST', body: JSON.stringify({ username, password }) });
    csrfToken = data.csrfToken;
    showApp(true);
    loadLeads();
  } catch (e) {
    errEl.textContent = e.message;
    errEl.hidden = false;
  }
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await api('/api/admin/logout', { method: 'POST' });
  csrfToken = null;
  showApp(false);
});

document.getElementById('changePasswordBtn').addEventListener('click', async () => {
  const newPassword = document.getElementById('newPassword').value;
  const msgEl = document.getElementById('passwordMsg');
  msgEl.hidden = true;
  try {
    await api('/api/admin/change-password', { method: 'POST', body: JSON.stringify({ newPassword }) });
    msgEl.textContent = 'Пароль изменён.';
    msgEl.className = 'form-msg success';
    msgEl.hidden = false;
    document.getElementById('newPassword').value = '';
  } catch (e) {
    msgEl.textContent = e.message;
    msgEl.className = 'form-msg error';
    msgEl.hidden = false;
  }
});

tryRestoreSession();
