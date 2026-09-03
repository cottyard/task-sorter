import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { readDb, writeDb, backupDb, getArchivedTasks, archiveTask, unarchiveTask, db } from './db.js';
import { getLanIps } from './lanIp.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

const PORT = process.env.PORT || 80;
const DIST_PATH = path.resolve(__dirname, '../dist');

app.use(cors());
app.use(express.json());

// API: Get entire active board state
app.get('/api/data', async (req, res) => {
  try {
    const data = await readDb();
    const lanIps = getLanIps();
    res.json({
      ...data,
      lanIps,
      serverPort: PORT,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to read database' });
  }
});

// API: Get archived tasks
app.get('/api/tasks/archived', (req, res) => {
  try {
    const tasks = getArchivedTasks();
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch archived tasks' });
  }
});

// API: Create task
app.post('/api/tasks', async (req, res) => {
  try {
    const data = await readDb();
    const newTask = {
      id: req.body.id || `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      columnId: req.body.columnId || (data.columns[0] ? data.columns[0].id : 'short'),
      title: (req.body.title || '').trim(),
      description: (req.body.description || '').trim(),
      assigneeId: req.body.assigneeId || (data.members[0] ? data.members[0].id : ''),
      order: req.body.order ?? 0,
      checklist: Array.isArray(req.body.checklist) ? req.body.checklist : [],
      completed: Boolean(req.body.completed),
      createdAt: req.body.createdAt || new Date().toISOString(),
      completedAt: req.body.completed ? (req.body.completedAt || new Date().toISOString()) : null,
      archived: false,
    };

    // Prepend or reorder
    const columnTasks = data.tasks.filter((t) => t.columnId === newTask.columnId);
    columnTasks.forEach((t) => t.order++);
    data.tasks.push(newTask);

    await writeDb(data);
    io.emit('task:created', newTask);
    res.status(201).json(newTask);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// API: Update task
app.put('/api/tasks/:id', async (req, res) => {
  try {
    const data = await readDb();
    const index = data.tasks.findIndex((t) => t.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const wasCompleted = data.tasks[index].completed;
    const isNowCompleted = req.body.completed !== undefined ? Boolean(req.body.completed) : wasCompleted;

    const updatedTask = {
      ...data.tasks[index],
      ...req.body,
      id: req.params.id, // prevent id change
      completed: isNowCompleted,
      completedAt: isNowCompleted ? (data.tasks[index].completedAt || new Date().toISOString()) : null,
      updatedAt: new Date().toISOString(),
    };

    data.tasks[index] = updatedTask;
    await writeDb(data);
    io.emit('task:updated', updatedTask);
    res.json(updatedTask);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// API: Archive task
app.post('/api/tasks/:id/archive', (req, res) => {
  try {
    const archived = archiveTask(req.params.id);
    if (!archived) {
      return res.status(404).json({ error: 'Task not found' });
    }
    io.emit('task:archived', archived);
    res.json(archived);
  } catch (err) {
    res.status(500).json({ error: 'Failed to archive task' });
  }
});

// API: Unarchive task (restore to board)
app.post('/api/tasks/:id/unarchive', (req, res) => {
  try {
    const unarchived = unarchiveTask(req.params.id);
    if (!unarchived) {
      return res.status(404).json({ error: 'Task not found' });
    }
    io.emit('task:unarchived', unarchived);
    res.json(unarchived);
  } catch (err) {
    res.status(500).json({ error: 'Failed to unarchive task' });
  }
});

// API: Delete task (permanent delete)
app.delete('/api/tasks/:id', async (req, res) => {
  try {
    db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
    io.emit('task:deleted', req.params.id);
    res.json({ success: true, id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// API: Reorder tasks (Drag and Drop bulk update)
app.post('/api/tasks/reorder', async (req, res) => {
  try {
    const { updates } = req.body; // Array of { id, columnId, order }
    if (!Array.isArray(updates)) {
      return res.status(400).json({ error: 'Invalid updates payload' });
    }

    const data = await readDb();
    const updatesMap = new Map(updates.map((u) => [u.id, u]));

    data.tasks = data.tasks.map((task) => {
      if (updatesMap.has(task.id)) {
        const u = updatesMap.get(task.id);
        return {
          ...task,
          columnId: u.columnId !== undefined ? u.columnId : task.columnId,
          order: u.order !== undefined ? u.order : task.order,
        };
      }
      return task;
    });

    await writeDb(data);
    io.emit('tasks:reordered', updates);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reorder tasks' });
  }
});

// API: Create column
app.post('/api/columns', async (req, res) => {
  try {
    const data = await readDb();
    const title = (req.body.title || '').trim();
    if (!title) {
      return res.status(400).json({ error: 'Column title is required' });
    }

    const newColumn = {
      id: `col-${Date.now()}`,
      title,
      badgeColor: 'blue',
      accent: '#3b82f6',
      icon: 'Square',
    };

    data.columns.push(newColumn);
    await writeDb(data);
    io.emit('columns:updated', data.columns);
    res.status(201).json(newColumn);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create column' });
  }
});

// API: Update column
app.put('/api/columns/:id', async (req, res) => {
  try {
    const data = await readDb();
    const index = data.columns.findIndex((c) => c.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Column not found' });
    }

    const updatedColumn = {
      ...data.columns[index],
      ...req.body,
      id: req.params.id,
    };

    data.columns[index] = updatedColumn;
    await writeDb(data);
    io.emit('columns:updated', data.columns);
    res.json(updatedColumn);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update column' });
  }
});

// API: Delete column
app.delete('/api/columns/:id', async (req, res) => {
  try {
    const data = await readDb();
    const colIndex = data.columns.findIndex((c) => c.id === req.params.id);
    if (colIndex === -1) {
      return res.status(404).json({ error: 'Column not found' });
    }

    data.columns.splice(colIndex, 1);
    data.tasks = data.tasks.filter((t) => t.columnId !== req.params.id);

    await writeDb(data);
    io.emit('columns:updated', data.columns);
    io.emit('tasks:deleted_all_for_column', req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete column' });
  }
});

// API: Update members
app.put('/api/members', async (req, res) => {
  try {
    const { members } = req.body;
    if (!Array.isArray(members)) {
      return res.status(400).json({ error: 'Invalid members format' });
    }

    const data = await readDb();
    data.members = members;
    await writeDb(data);
    io.emit('members:updated', members);
    res.json(members);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update members' });
  }
});

// Serve frontend in production
if (fs.existsSync(DIST_PATH)) {
  app.use(express.static(DIST_PATH));
  app.get('*', (req, res) => {
    res.sendFile(path.join(DIST_PATH, 'index.html'));
  });
}

// Socket.io Handlers
io.on('connection', (socket) => {
  console.log(`[Socket] 客户端已连接: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`[Socket] 客户端已断开: ${socket.id}`);
  });
});

// Daily Backup Timer (Every 24 hours)
setInterval(
  () => {
    backupDb();
  },
  24 * 60 * 60 * 1000
);

server.listen(PORT, '0.0.0.0', () => {
  const lanIps = getLanIps();
  console.log('\n✨ ==============================================');
  console.log('🚀 TaskSorter 团队任务跟踪服务已就绪 (SQLite 驱动)！');
  console.log(`📡 本机访问:   http://localhost${PORT === 80 ? '' : `:${PORT}`}`);
  console.log('🌐 局域网访问:');
  lanIps.forEach((ip) => {
    console.log(`   ➜ [${ip.interface}]: http://${ip.address}${PORT === 80 ? '' : `:${PORT}`}`);
  });
  console.log('📁 数据存储位置: data/tasksorter.db (高性能 SQLite 数据库)');
  console.log('==============================================\n');
});
