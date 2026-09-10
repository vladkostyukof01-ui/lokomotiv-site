function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s || '';
  return d.innerHTML;
}

async function loadPage() {
  const settings = await loadSettingsGlobal();

  document.getElementById('heroEyebrow').textContent = settings.hero_eyebrow || '';
  document.getElementById('heroTitle').textContent = settings.hero_title || '';
  document.getElementById('heroLede').textContent = settings.hero_lede || '';
  document.getElementById('aboutText').textContent = settings.about_text || '';
  document.getElementById('achievementsText').textContent = settings.achievements_text || '';
  document.getElementById('competitionText').textContent = settings.competition_text || '';
  document.getElementById('partnerText').textContent = settings.partner_text || '';
  document.getElementById('naborText').textContent = settings.nabor_text || '';
  document.getElementById('footerBrand').textContent = settings.brand_name || '';

  document.getElementById('address').textContent = settings.legal_address || '';

  document.getElementById('phoneMainNote').textContent = settings.phone_main_note || '';
  const phoneMainLink = document.getElementById('phoneMainLink');
  phoneMainLink.textContent = settings.phone_main || '';
  phoneMainLink.href = 'tel:' + (settings.phone_main || '').replace(/[^\d+]/g, '');

  document.getElementById('phoneAdminNote').textContent = settings.phone_admin_note || '';
  const phoneAdminLink = document.getElementById('phoneAdminLink');
  phoneAdminLink.textContent = settings.phone_admin || '';
  phoneAdminLink.href = 'tel:' + (settings.phone_admin || '').replace(/[^\d+]/g, '');

  const emailLink = document.getElementById('emailMainLink');
  emailLink.textContent = settings.email_main || '';
  emailLink.href = 'mailto:' + (settings.email_main || '');

  document.getElementById('mapFrame').src = settings.map_embed_url || '';

  const footerParts = [];
  if (settings.phone_main) footerParts.push(`<a href="tel:${settings.phone_main.replace(/[^\d+]/g, '')}">${escapeHtml(settings.phone_main)}</a>`);
  if (settings.email_main) footerParts.push(`<a href="mailto:${settings.email_main}">${escapeHtml(settings.email_main)}</a>`);
  document.getElementById('footerContacts').innerHTML = footerParts.join(' · ');

  const groupsRes = await fetch('/api/groups');
  const { groups } = await groupsRes.json();
  document.getElementById('groupsGrid').innerHTML = groups.map((g, i) => `
    <div class="group-card reveal" style="--reveal-delay: ${Math.min(i * 0.06, 0.3)}s">${escapeHtml(g.title)}</div>
  `).join('');

  const coachesRes = await fetch('/api/coaches');
  const { coaches } = await coachesRes.json();
  document.getElementById('coachesGrid').innerHTML = coaches.map((c, i) => `
    <div class="coach-card reveal" style="--reveal-delay: ${Math.min(i * 0.08, 0.3)}s">
      <h3>${escapeHtml(c.name)}</h3>
      <p>${escapeHtml(c.body)}</p>
    </div>
  `).join('');

  const rulesRes = await fetch('/api/rules');
  const { rules } = await rulesRes.json();
  document.getElementById('rulesList').innerHTML = rules.map((r, i) => `
    <li class="reveal" style="--reveal-delay: ${Math.min(i * 0.05, 0.25)}s">${escapeHtml(r.body)}</li>
  `).join('');
}

document.getElementById('leadForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msgEl = document.getElementById('formMsg');
  msgEl.hidden = true;
  const payload = {
    name: document.getElementById('name').value.trim(),
    phone: document.getElementById('phone').value.trim(),
    childAge: document.getElementById('childAge').value.trim(),
    message: document.getElementById('message').value.trim(),
    consentGiven: document.getElementById('consent').checked,
  };
  try {
    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Ошибка отправки');
    msgEl.textContent = 'Спасибо! Мы свяжемся с вами в ближайшее время.';
    msgEl.className = 'form-msg success';
    msgEl.hidden = false;
    document.getElementById('leadForm').reset();
  } catch (err) {
    msgEl.textContent = err.message;
    msgEl.className = 'form-msg error';
    msgEl.hidden = false;
  }
});

loadPage();
