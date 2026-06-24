import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const dataDirectory = path.resolve('data');
fs.mkdirSync(dataDirectory, { recursive: true });

export const database = new DatabaseSync(path.join(dataDirectory, 'chenyao.sqlite'));
database.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');

database.exec(`
  CREATE TABLE IF NOT EXISTS admin_credentials (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    salt TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    public_id TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    gender TEXT,
    calendar TEXT,
    birth_date TEXT,
    birth_time TEXT,
    location TEXT,
    longitude REAL,
    latitude REAL,
    tags TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS charts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL UNIQUE,
    chart_json TEXT NOT NULL,
    pillars_json TEXT NOT NULL,
    day_master TEXT,
    true_solar_time TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    topic TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    review_status TEXT NOT NULL DEFAULT 'ai_replied',
    internal_note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS customer_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS prompt_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prompt_key TEXT NOT NULL,
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    version INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(prompt_key, version)
  );

  CREATE TABLE IF NOT EXISTS knowledge_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_conversations_customer ON conversations(customer_id, updated_at DESC);
  CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_customers_updated ON customers(updated_at DESC);
`);

const customerColumns = new Set(database.prepare('PRAGMA table_info(customers)').all().map((column) => column.name));
if (!customerColumns.has('phone')) database.exec('ALTER TABLE customers ADD COLUMN phone TEXT');
if (!customerColumns.has('followup_status')) database.exec("ALTER TABLE customers ADD COLUMN followup_status TEXT NOT NULL DEFAULT 'new'");
if (!customerColumns.has('admin_note')) database.exec("ALTER TABLE customers ADD COLUMN admin_note TEXT NOT NULL DEFAULT ''");

const now = () => new Date().toISOString();
const json = (value, fallback = null) => {
  try { return JSON.parse(value); } catch { return fallback; }
};

export function getAdminCredential() {
  const row = database.prepare('SELECT * FROM admin_credentials WHERE id = 1').get();
  return row ? { salt: row.salt, hash: row.password_hash, createdAt: row.created_at } : null;
}

export function saveAdminCredential({ salt, hash, createdAt = now() }) {
  database.prepare(`
    INSERT INTO admin_credentials (id, salt, password_hash, created_at, updated_at)
    VALUES (1, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET salt = excluded.salt, password_hash = excluded.password_hash, updated_at = excluded.updated_at
  `).run(salt, hash, createdAt, now());
}

export function getOrCreateCustomer(publicId) {
  let row = database.prepare('SELECT * FROM customers WHERE public_id = ?').get(publicId);
  if (!row) {
    const timestamp = now();
    database.prepare(`
      INSERT INTO customers (public_id, display_name, created_at, updated_at, last_seen_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(publicId, `访客 ${publicId.slice(0, 4).toUpperCase()}`, timestamp, timestamp, timestamp);
    row = database.prepare('SELECT * FROM customers WHERE public_id = ?').get(publicId);
  } else {
    database.prepare('UPDATE customers SET last_seen_at = ?, updated_at = ? WHERE id = ?').run(now(), now(), row.id);
  }
  return row;
}

export function saveCustomerProfile(publicId, birth, chart) {
  const customer = getOrCreateCustomer(publicId);
  const timestamp = now();
  database.prepare(`
    UPDATE customers SET
      gender = ?, calendar = ?, birth_date = ?, birth_time = ?, location = ?,
      longitude = ?, latitude = ?, updated_at = ?, last_seen_at = ?
    WHERE id = ?
  `).run(
    birth.gender || null,
    birth.calendar || null,
    birth.date || null,
    birth.clockTime || birth.time || null,
    birth.location || null,
    birth.longitude ?? null,
    birth.latitude ?? null,
    timestamp,
    timestamp,
    customer.id,
  );
  if (chart) {
    const pillars = chart.originalChart?.pillars || chart.pillars || [];
    const dayMaster = chart.originalChart?.dayMaster || chart.dayMaster || '';
    const trueSolarTime = chart.solarTimeAudit?.trueSolarTime || chart.trueSolarTime || '';
    database.prepare(`
      INSERT INTO charts (customer_id, chart_json, pillars_json, day_master, true_solar_time, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(customer_id) DO UPDATE SET
        chart_json = excluded.chart_json,
        pillars_json = excluded.pillars_json,
        day_master = excluded.day_master,
        true_solar_time = excluded.true_solar_time,
        updated_at = excluded.updated_at
    `).run(customer.id, JSON.stringify(chart), JSON.stringify(pillars), dayMaster, trueSolarTime, timestamp, timestamp);
  }
  return getCustomerById(customer.id);
}

export function getCustomerById(id) {
  const row = database.prepare(`
    SELECT c.*, ch.chart_json, ch.pillars_json, ch.day_master, ch.true_solar_time
    FROM customers c LEFT JOIN charts ch ON ch.customer_id = c.id
    WHERE c.id = ?
  `).get(id);
  return serializeCustomer(row);
}

export function getCustomerByPublicId(publicId) {
  const row = database.prepare(`
    SELECT c.*, ch.chart_json, ch.pillars_json, ch.day_master, ch.true_solar_time
    FROM customers c LEFT JOIN charts ch ON ch.customer_id = c.id
    WHERE c.public_id = ?
  `).get(publicId);
  return serializeCustomer(row);
}

function serializeCustomer(row) {
  if (!row) return null;
  return {
    id: row.id,
    publicId: row.public_id,
    name: row.display_name,
    phone: row.phone || '',
    gender: row.gender,
    calendar: row.calendar,
    birthDate: row.birth_date,
    birthTime: row.birth_time,
    location: row.location,
    longitude: row.longitude,
    latitude: row.latitude,
    tags: json(row.tags, []),
    status: row.status,
    followupStatus: row.followup_status || 'new',
    adminNote: row.admin_note || '',
    pillars: json(row.pillars_json, []),
    chart: json(row.chart_json, null),
    dayMaster: row.day_master,
    trueSolarTime: row.true_solar_time,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastSeenAt: row.last_seen_at,
  };
}

export function listCustomers({ query = '', limit = 100 } = {}) {
  const term = `%${query}%`;
  return database.prepare(`
    SELECT c.*, ch.pillars_json, ch.day_master, ch.true_solar_time,
      (SELECT COUNT(*) FROM conversations cv WHERE cv.customer_id = c.id) AS conversation_count
    FROM customers c LEFT JOIN charts ch ON ch.customer_id = c.id
    WHERE c.display_name LIKE ? OR COALESCE(c.phone, '') LIKE ? OR COALESCE(c.birth_date, '') LIKE ? OR COALESCE(c.location, '') LIKE ?
    ORDER BY c.updated_at DESC LIMIT ?
  `).all(term, term, term, term, limit).map((row) => ({
    ...serializeCustomer(row),
    conversationCount: Number(row.conversation_count || 0),
  }));
}

export function updateCustomer(id, patch) {
  const existing = database.prepare('SELECT * FROM customers WHERE id = ?').get(id);
  if (!existing) return null;
  const allowedStatuses = new Set(['new', 'following', 'waiting', 'completed']);
  const followupStatus = allowedStatuses.has(patch.followupStatus) ? patch.followupStatus : existing.followup_status;
  const tags = Array.isArray(patch.tags)
    ? patch.tags.map((item) => String(item).trim()).filter(Boolean).slice(0, 12)
    : json(existing.tags, []);
  database.prepare(`
    UPDATE customers SET
      display_name = ?, phone = ?, tags = ?, followup_status = ?, admin_note = ?, updated_at = ?
    WHERE id = ?
  `).run(
    String(patch.name ?? existing.display_name).trim().slice(0, 80) || existing.display_name,
    String(patch.phone ?? existing.phone ?? '').trim().slice(0, 30),
    JSON.stringify(tags),
    followupStatus,
    String(patch.adminNote ?? existing.admin_note ?? '').slice(0, 10000),
    now(),
    id,
  );
  return getCustomerById(id);
}

export function getOrCreateActiveConversation(customerId, question) {
  let row = database.prepare(`
    SELECT * FROM conversations WHERE customer_id = ? AND status = 'active'
    ORDER BY updated_at DESC LIMIT 1
  `).get(customerId);
  if (!row) {
    const timestamp = now();
    const title = String(question || '新咨询').slice(0, 26);
    const result = database.prepare(`
      INSERT INTO conversations (customer_id, title, topic, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(customerId, title, title, timestamp, timestamp);
    row = database.prepare('SELECT * FROM conversations WHERE id = ?').get(Number(result.lastInsertRowid));
  }
  return row;
}

export function addMessage(conversationId, role, content) {
  const timestamp = now();
  database.prepare('INSERT INTO messages (conversation_id, role, content, created_at) VALUES (?, ?, ?, ?)')
    .run(conversationId, role, String(content).slice(0, 20000), timestamp);
  database.prepare(`
    UPDATE conversations SET updated_at = ?, review_status = ?
    WHERE id = ?
  `).run(timestamp, role === 'assistant' ? 'ai_replied' : 'waiting_ai', conversationId);
}

export function listConversations({ customerId, limit = 100 } = {}) {
  const where = customerId ? 'WHERE cv.customer_id = ?' : '';
  const params = customerId ? [customerId, limit] : [limit];
  return database.prepare(`
    SELECT cv.*, c.display_name, c.birth_date, c.location,
      (SELECT content FROM messages m WHERE m.conversation_id = cv.id ORDER BY m.id DESC LIMIT 1) AS last_message,
      (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = cv.id) AS message_count
    FROM conversations cv JOIN customers c ON c.id = cv.customer_id
    ${where}
    ORDER BY cv.updated_at DESC LIMIT ?
  `).all(...params).map((row) => ({
    id: row.id,
    customerId: row.customer_id,
    customerName: row.display_name,
    birthDate: row.birth_date,
    location: row.location,
    title: row.title,
    topic: row.topic,
    status: row.status,
    reviewStatus: row.review_status,
    internalNote: row.internal_note,
    lastMessage: row.last_message || '',
    messageCount: Number(row.message_count || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export function getConversation(id) {
  const conversation = database.prepare(`
    SELECT cv.*, c.display_name, c.birth_date, c.location
    FROM conversations cv JOIN customers c ON c.id = cv.customer_id
    WHERE cv.id = ?
  `).get(id);
  if (!conversation) return null;
  return {
    id: conversation.id,
    customerId: conversation.customer_id,
    customerName: conversation.display_name,
    birthDate: conversation.birth_date,
    location: conversation.location,
    title: conversation.title,
    topic: conversation.topic,
    status: conversation.status,
    reviewStatus: conversation.review_status,
    internalNote: conversation.internal_note,
    messages: database.prepare('SELECT id, role, content, created_at AS createdAt FROM messages WHERE conversation_id = ? ORDER BY id').all(id),
    createdAt: conversation.created_at,
    updatedAt: conversation.updated_at,
  };
}

export function updateConversation(id, patch) {
  const existing = database.prepare('SELECT * FROM conversations WHERE id = ?').get(id);
  if (!existing) return null;
  database.prepare(`
    UPDATE conversations SET review_status = ?, internal_note = ?, status = ?, updated_at = ? WHERE id = ?
  `).run(
    patch.reviewStatus ?? existing.review_status,
    patch.internalNote ?? existing.internal_note,
    patch.status ?? existing.status,
    now(),
    id,
  );
  return getConversation(id);
}

export function getOverview() {
  const customers = database.prepare('SELECT COUNT(*) AS count FROM customers').get().count;
  const consultations = database.prepare('SELECT COUNT(*) AS count FROM conversations').get().count;
  const aiReplies = database.prepare("SELECT COUNT(*) AS count FROM messages WHERE role = 'assistant'").get().count;
  const today = new Date().toISOString().slice(0, 10);
  const activeToday = database.prepare('SELECT COUNT(*) AS count FROM customers WHERE last_seen_at >= ?').get(`${today}T00:00:00.000Z`).count;
  return { customers: Number(customers), consultations: Number(consultations), activeToday: Number(activeToday), aiReplies: Number(aiReplies) };
}

export function getLatestPrompt(promptKey = 'chenyao-system') {
  const row = database.prepare(`
    SELECT * FROM prompt_versions WHERE prompt_key = ? ORDER BY version DESC LIMIT 1
  `).get(promptKey);
  return row ? {
    id: row.id, key: row.prompt_key, name: row.name, content: row.content,
    version: row.version, status: row.status, createdAt: row.created_at, updatedAt: row.updated_at,
  } : null;
}

export function savePrompt({ key = 'chenyao-system', name = '宸垚老师系统提示词', content, status = 'published' }) {
  const latest = getLatestPrompt(key);
  const version = (latest?.version || 0) + 1;
  const timestamp = now();
  database.prepare(`
    INSERT INTO prompt_versions (prompt_key, name, content, version, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(key, name, content, version, status, timestamp, timestamp);
  return getLatestPrompt(key);
}

export function listPrompts(promptKey = 'chenyao-system') {
  return database.prepare(`
    SELECT id, prompt_key AS key, name, content, version, status, created_at AS createdAt, updated_at AS updatedAt
    FROM prompt_versions WHERE prompt_key = ? ORDER BY version DESC
  `).all(promptKey);
}

export function listKnowledgeDocuments() {
  return database.prepare(`
    SELECT id, title, content, status, created_at AS createdAt, updated_at AS updatedAt
    FROM knowledge_documents ORDER BY updated_at DESC
  `).all();
}

export function saveKnowledgeDocument({ title, content = '', status = 'draft' }) {
  const timestamp = now();
  const result = database.prepare(`
    INSERT INTO knowledge_documents (title, content, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(title, content, status, timestamp, timestamp);
  return database.prepare(`
    SELECT id, title, content, status, created_at AS createdAt, updated_at AS updatedAt
    FROM knowledge_documents WHERE id = ?
  `).get(Number(result.lastInsertRowid));
}

export function seedPrompt(content) {
  if (!getLatestPrompt()) savePrompt({ content, status: 'published' });
}

export function makePublicId() {
  return crypto.randomBytes(12).toString('hex');
}
