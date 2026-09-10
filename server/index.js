require('dotenv').config();
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const db = require('./db');
const { verifyAdmin, changePassword, requireAuth, issueCsrfToken, requireCsrf } = require('./auth');

const app = express();
const PORT = process.env.PORT || 3603;
const SESSION_SECRET = process.env.SESSION_SECRET || 'change-this-secret-before-deploy';

app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      frameSrc: ['https://yandex.ru'],
    },
  },
}));

app.use(express.json());
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 8,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  },
}));

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Слишком много попыток входа. Попробуйте снова через 15 минут.' },
});

app.use('/api/admin', (req, res, next) => {
  const isSafeMethod = req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS';
  const isLoginRoute = req.path === '/login';
  if (isSafeMethod || isLoginRoute) return next();
  return requireCsrf(req, res, next);
});

// ===================== ПУБЛИЧНОЕ API =====================

app.get('/api/settings', (req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = {};
  for (const row of rows) settings[row.key] = row.value;
  res.json(settings);
});

app.get('/api/coaches', (req, res) => {
  const coaches = db.prepare('SELECT * FROM coaches ORDER BY sort_order').all();
  res.json({ coaches });
});

app.get('/api/groups', (req, res) => {
  const groups = db.prepare('SELECT * FROM groups ORDER BY sort_order').all();
  res.json({ groups });
});

app.get('/api/rules', (req, res) => {
  const rules = db.prepare('SELECT * FROM rules ORDER BY sort_order').all();
  res.json({ rules });
});

const leadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Слишком много заявок с этого адреса. Попробуйте позже или позвоните нам.' },
});

app.post('/api/leads', leadLimiter, (req, res) => {
  const { name, phone, childAge, message, consentGiven } = req.body || {};
  if (!name || !phone) {
    return res.status(400).json({ error: 'Укажите имя и телефон.' });
  }
  if (!consentGiven) {
    return res.status(400).json({ error: 'Необходимо согласие на обработку персональных данных.' });
  }
  db.prepare(
    'INSERT INTO leads (name, phone, child_age, message, consent_given) VALUES (?, ?, ?, ?, ?)'
  ).run(name, phone, childAge || '', message || '', 1);
  res.json({ ok: true });
});

// ===================== АДМИН API =====================

app.post('/api/admin/login', loginLimiter, (req, res) => {
  const { username, password } = req.body || {};
  if (!verifyAdmin(username, password)) {
    return res.status(401).json({ error: 'Неверный логин или пароль.' });
  }
  req.session.regenerate((err) => {
    if (err) {
      return res.status(500).json({ error: 'Ошибка сервера. Попробуйте войти снова.' });
    }
    req.session.adminUsername = username;
    const csrfToken = issueCsrfToken(req);
    res.json({ ok: true, username, csrfToken });
  });
});

app.post('/api/admin/logout', requireAuth, (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/admin/me', requireAuth, (req, res) => {
  res.json({ username: req.session.adminUsername, csrfToken: issueCsrfToken(req) });
});

app.post('/api/admin/change-password', requireAuth, (req, res) => {
  const { newPassword } = req.body || {};
  if (!newPassword || newPassword.length < 10) {
    return res.status(400).json({ error: 'Пароль должен быть не короче 10 символов.' });
  }
  changePassword(req.session.adminUsername, newPassword);
  res.json({ ok: true });
});

app.get('/api/admin/leads', requireAuth, (req, res) => {
  const leads = db.prepare('SELECT * FROM leads ORDER BY created_at DESC').all();
  res.json({ leads });
});

app.post('/api/admin/leads/:id/status', requireAuth, (req, res) => {
  const { status } = req.body || {};
  if (!['new', 'in_progress', 'done'].includes(status)) {
    return res.status(400).json({ error: 'Некорректный статус.' });
  }
  db.prepare('UPDATE leads SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ ok: true });
});

// ===================== СТАТИКА =====================

app.use(express.static(path.join(__dirname, '..', 'public')));

app.listen(PORT, () => {
  console.log(`Локомотив запущен на порту ${PORT}`);
});
