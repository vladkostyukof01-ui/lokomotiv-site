const bcrypt = require('bcryptjs');
const db = require('./db');
const { coaches } = require('./seed_coaches');
const { groups } = require('./seed_groups');
const { rules } = require('./seed_rules');
const { settings } = require('./seed_settings');

const adminUsername = process.env.ADMIN_USERNAME || 'admin';
const adminPassword = process.env.ADMIN_PASSWORD || 'change-this-password';

const existingAdmin = db.prepare('SELECT id FROM admins WHERE username = ?').get(adminUsername);
if (!existingAdmin) {
  const hash = bcrypt.hashSync(adminPassword, 12);
  db.prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)').run(adminUsername, hash);
  console.log(`Создан администратор: ${adminUsername}`);
} else {
  console.log('Администратор уже существует, пропускаю.');
}

const settingsCount = db.prepare('SELECT COUNT(*) AS c FROM settings').get().c;
if (settingsCount === 0) {
  const insert = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
  for (const [key, value] of Object.entries(settings)) {
    insert.run(key, value);
  }
  console.log('Настройки заполнены.');
} else {
  console.log('Настройки уже заполнены, пропускаю.');
}

const coachesCount = db.prepare('SELECT COUNT(*) AS c FROM coaches').get().c;
if (coachesCount === 0) {
  const insert = db.prepare('INSERT INTO coaches (name, body, sort_order) VALUES (?, ?, ?)');
  coaches.forEach((c, i) => insert.run(c.name, c.body, i));
  console.log(`Тренеры заполнены: ${coaches.length}`);
} else {
  console.log('Тренеры уже заполнены, пропускаю.');
}

const groupsCount = db.prepare('SELECT COUNT(*) AS c FROM groups').get().c;
if (groupsCount === 0) {
  const insert = db.prepare('INSERT INTO groups (title, sort_order) VALUES (?, ?)');
  groups.forEach((g, i) => insert.run(g.title, i));
  console.log(`Группы заполнены: ${groups.length}`);
} else {
  console.log('Группы уже заполнены, пропускаю.');
}

const rulesCount = db.prepare('SELECT COUNT(*) AS c FROM rules').get().c;
if (rulesCount === 0) {
  const insert = db.prepare('INSERT INTO rules (body, sort_order) VALUES (?, ?)');
  rules.forEach((r, i) => insert.run(r.body, i));
  console.log(`Правила заполнены: ${rules.length}`);
} else {
  console.log('Правила уже заполнены, пропускаю.');
}
