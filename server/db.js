import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DatabaseSync } from 'node:sqlite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');
const DB_PATH = path.join(DATA_DIR, 'tasksorter.db');
const JSON_PATH = path.join(DATA_DIR, 'db.json');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Initialize SQLite database
const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL;');

// Initialize Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS columns (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    badgeColor TEXT,
    accent TEXT,
    icon TEXT,
    orderIndex INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS members (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    avatarColor TEXT,
    orderIndex INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    columnId TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    assigneeId TEXT,
    orderIndex INTEGER DEFAULT 0,
    checklist TEXT,
    completed INTEGER DEFAULT 0,
    createdAt TEXT,
    updatedAt TEXT,
    completedAt TEXT,
    archived INTEGER DEFAULT 0,
    archivedAt TEXT
  );
`);

// Seamless Migration from db.json if SQLite tables are empty
function autoMigrateFromJson() {
  const colCount = db.prepare('SELECT COUNT(*) as count FROM columns').get();
  if (colCount && colCount.count > 0) {
    return; // Already has data in SQLite
  }

  if (fs.existsSync(JSON_PATH)) {
    try {
      const raw = fs.readFileSync(JSON_PATH, 'utf-8');
      const data = JSON.parse(raw);

      db.exec('BEGIN TRANSACTION;');

      if (Array.isArray(data.columns)) {
        const insertCol = db.prepare(
          'INSERT OR REPLACE INTO columns (id, title, badgeColor, accent, icon, orderIndex) VALUES (?, ?, ?, ?, ?, ?)'
        );
        data.columns.forEach((col, idx) => {
          insertCol.run(
            col.id,
            col.title,
            col.badgeColor || 'blue',
            col.accent || '#3b82f6',
            col.icon || 'Square',
            idx
          );
        });
      }

      if (Array.isArray(data.members)) {
        const insertMember = db.prepare(
          'INSERT OR REPLACE INTO members (id, name, avatarColor, orderIndex) VALUES (?, ?, ?, ?)'
        );
        data.members.forEach((m, idx) => {
          insertMember.run(m.id, m.name, m.avatarColor || '#6366f1', idx);
        });
      }

      if (Array.isArray(data.tasks)) {
        const insertTask = db.prepare(
          `INSERT OR REPLACE INTO tasks (
            id, columnId, title, description, assigneeId, orderIndex,
            checklist, completed, createdAt, updatedAt, completedAt, archived, archivedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        );
        data.tasks.forEach((t, idx) => {
          insertTask.run(
            t.id,
            t.columnId || 'short',
            t.title || '',
            t.description || '',
            t.assigneeId || '',
            t.order ?? idx,
            JSON.stringify(t.checklist || []),
            t.completed ? 1 : 0,
            t.createdAt || new Date().toISOString(),
            t.updatedAt || null,
            t.completedAt || (t.completed ? (t.updatedAt || t.createdAt) : null),
            t.archived ? 1 : 0,
            t.archivedAt || null
          );
        });
      }

      db.exec('COMMIT;');
      console.log('✅ 成功将历史数据从 db.json 完整迁移至 SQLite 数据库 (tasksorter.db)');
    } catch (err) {
      db.exec('ROLLBACK;');
      console.error('❌ 从 db.json 迁移至 SQLite 失败:', err);
    }
  }
}

autoMigrateFromJson();

// Model Helpers
export function parseTaskRow(row) {
  if (!row) return null;
  let checklist = [];
  try {
    checklist = JSON.parse(row.checklist || '[]');
  } catch {
    checklist = [];
  }

  return {
    id: row.id,
    columnId: row.columnId,
    title: row.title,
    description: row.description || '',
    assigneeId: row.assigneeId || '',
    order: row.orderIndex,
    checklist,
    completed: Boolean(row.completed),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt || undefined,
    completedAt: row.completedAt || undefined,
    archived: Boolean(row.archived),
    archivedAt: row.archivedAt || undefined,
  };
}

// Get active board data (only non-archived tasks)
export async function readDb() {
  const cols = db
    .prepare('SELECT * FROM columns ORDER BY orderIndex ASC')
    .all();

  const members = db
    .prepare('SELECT * FROM members ORDER BY orderIndex ASC')
    .all()
    .map((m) => ({ id: m.id, name: m.name, avatarColor: m.avatarColor }));

  const taskRows = db
    .prepare('SELECT * FROM tasks WHERE archived = 0 ORDER BY orderIndex ASC')
    .all();

  const tasks = taskRows.map(parseTaskRow);

  return {
    columns: cols.map((c) => ({
      id: c.id,
      title: c.title,
      badgeColor: c.badgeColor,
      accent: c.accent,
      icon: c.icon,
    })),
    members,
    tasks,
  };
}

// Get all archived tasks
export function getArchivedTasks() {
  const taskRows = db
    .prepare(
      'SELECT * FROM tasks WHERE archived = 1 ORDER BY completedAt DESC, archivedAt DESC'
    )
    .all();
  return taskRows.map(parseTaskRow);
}

// Archive a task
export function archiveTask(taskId) {
  const now = new Date().toISOString();
  db.prepare(
    'UPDATE tasks SET archived = 1, archivedAt = ?, completed = 1, completedAt = COALESCE(completedAt, ?) WHERE id = ?'
  ).run(now, now, taskId);

  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
  return parseTaskRow(row);
}

// Unarchive a task (restore to board)
export function unarchiveTask(taskId) {
  db.prepare(
    'UPDATE tasks SET archived = 0, archivedAt = NULL WHERE id = ?'
  ).run(taskId);

  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
  return parseTaskRow(row);
}

// Write entire state (used for compatibility)
export async function writeDb(data) {
  db.exec('BEGIN TRANSACTION;');
  try {
    if (Array.isArray(data.columns)) {
      db.exec('DELETE FROM columns;');
      const insertCol = db.prepare(
        'INSERT INTO columns (id, title, badgeColor, accent, icon, orderIndex) VALUES (?, ?, ?, ?, ?, ?)'
      );
      data.columns.forEach((c, idx) => {
        insertCol.run(c.id, c.title, c.badgeColor || 'blue', c.accent || '#3b82f6', c.icon || 'Square', idx);
      });
    }

    if (Array.isArray(data.members)) {
      db.exec('DELETE FROM members;');
      const insertMember = db.prepare(
        'INSERT INTO members (id, name, avatarColor, orderIndex) VALUES (?, ?, ?, ?)'
      );
      data.members.forEach((m, idx) => {
        insertMember.run(m.id, m.name, m.avatarColor || '#6366f1', idx);
      });
    }

    if (Array.isArray(data.tasks)) {
      // Retain archived tasks in database
      db.exec('DELETE FROM tasks WHERE archived = 0;');
      const insertTask = db.prepare(
        `INSERT INTO tasks (
          id, columnId, title, description, assigneeId, orderIndex,
          checklist, completed, createdAt, updatedAt, completedAt, archived, archivedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      data.tasks.forEach((t, idx) => {
        insertTask.run(
          t.id,
          t.columnId || 'short',
          t.title || '',
          t.description || '',
          t.assigneeId || '',
          t.order ?? idx,
          JSON.stringify(t.checklist || []),
          t.completed ? 1 : 0,
          t.createdAt || new Date().toISOString(),
          t.updatedAt || null,
          t.completedAt || null,
          t.archived ? 1 : 0,
          t.archivedAt || null
        );
      });
    }

    db.exec('COMMIT;');
    return true;
  } catch (err) {
    db.exec('ROLLBACK;');
    console.error('writeDb transaction error:', err);
    throw err;
  }
}

// SQLite Backup Routine
export async function backupDb() {
  try {
    if (!fs.existsSync(DB_PATH)) return;
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(BACKUP_DIR, `tasksorter-backup-${dateStr}.db`);
    await fs.promises.copyFile(DB_PATH, backupFile);

    const files = await fs.promises.readdir(BACKUP_DIR);
    if (files.length > 10) {
      files.sort();
      const toDelete = files.slice(0, files.length - 10);
      for (const f of toDelete) {
        await fs.promises.unlink(path.join(BACKUP_DIR, f)).catch(() => {});
      }
    }
  } catch (err) {
    console.error('Backup error:', err);
  }
}

export { db };
