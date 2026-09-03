import test from 'node:test';
import assert from 'node:assert/strict';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost';

test('API Baseline Tests: GET /api/data', async () => {
  const res = await fetch(`${BASE_URL}/api/data`);
  assert.equal(res.status, 200, 'Status should be 200');
  const data = await res.json();
  assert.ok(Array.isArray(data.columns), 'columns should be an array');
  assert.ok(Array.isArray(data.members), 'members should be an array');
  assert.ok(Array.isArray(data.tasks), 'tasks should be an array');
  assert.ok(data.columns.length > 0, 'columns should not be empty');
  assert.ok(data.members.length > 0, 'members should not be empty');
});

test('API Baseline Tests: Task CRUD & Reorder Lifecycle', async () => {
  // 1. Create task
  const createRes = await fetch(`${BASE_URL}/api/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: '自动化测试任务',
      description: '测试任务详细内容说明',
      columnId: 'short',
      assigneeId: 'm1',
      checklist: [{ id: 'c1', text: '子任务1', completed: false }],
    }),
  });
  assert.ok([200, 201].includes(createRes.status), 'Create task status should be 200 or 201');
  const createdTask = await createRes.json();
  assert.ok(createdTask.id, 'Created task must have an ID');
  assert.equal(createdTask.title, '自动化测试任务');
  assert.equal(createdTask.completed, false);

  // 2. Update task
  const updateRes = await fetch(`${BASE_URL}/api/tasks/${createdTask.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: '自动化测试任务 (已修改)',
      completed: true,
    }),
  });
  assert.equal(updateRes.status, 200, 'Update task status should be 200');
  const updatedTask = await updateRes.json();
  assert.equal(updatedTask.title, '自动化测试任务 (已修改)');
  assert.equal(updatedTask.completed, true);

  // 3. Reorder tasks
  const reorderRes = await fetch(`${BASE_URL}/api/tasks/reorder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      updates: [{ id: createdTask.id, columnId: 'mid', order: 0 }],
    }),
  });
  assert.equal(reorderRes.status, 200, 'Reorder status should be 200');

  // Verify reorder updated columnId
  const dataRes = await fetch(`${BASE_URL}/api/data`);
  const data = await dataRes.json();
  const foundTask = data.tasks.find((t) => t.id === createdTask.id);
  assert.ok(foundTask, 'Task should exist after reorder');
  assert.equal(foundTask.columnId, 'mid', 'Task should have moved to mid column');

  // 4. Delete task
  const deleteRes = await fetch(`${BASE_URL}/api/tasks/${createdTask.id}`, {
    method: 'DELETE',
  });
  assert.equal(deleteRes.status, 200, 'Delete task status should be 200');

  // Verify deletion
  const verifyRes = await fetch(`${BASE_URL}/api/data`);
  const verifyData = await verifyRes.json();
  const deletedFound = verifyData.tasks.find((t) => t.id === createdTask.id);
  assert.equal(deletedFound, undefined, 'Task should not exist after deletion');
});

test('API Baseline Tests: Column Management Lifecycle', async () => {
  // 1. Create Column
  const addColRes = await fetch(`${BASE_URL}/api/columns`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: '测试泳道' }),
  });
  assert.ok([200, 201].includes(addColRes.status), 'Add column status should be 200 or 201');
  const createdCol = await addColRes.json();
  assert.ok(createdCol.id, 'New column must have an ID');
  assert.equal(createdCol.title, '测试泳道');

  // 2. Rename Column
  const renameColRes = await fetch(`${BASE_URL}/api/columns/${createdCol.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: '测试泳道 (重命名)' }),
  });
  assert.equal(renameColRes.status, 200, 'Rename column status should be 200');
  const renamedCol = await renameColRes.json();
  assert.equal(renamedCol.title, '测试泳道 (重命名)');

  // 3. Delete Column
  const deleteColRes = await fetch(`${BASE_URL}/api/columns/${createdCol.id}`, {
    method: 'DELETE',
  });
  assert.equal(deleteColRes.status, 200, 'Delete column status should be 200');

  // Verify deletion
  const verifyRes = await fetch(`${BASE_URL}/api/data`);
  const verifyData = await verifyRes.json();
  const colFound = verifyData.columns.find((c) => c.id === createdCol.id);
  assert.equal(colFound, undefined, 'Column should not exist after deletion');
});

test('API Baseline Tests: Member Update Persistence', async () => {
  const dataRes = await fetch(`${BASE_URL}/api/data`);
  const initialData = await dataRes.json();
  const members = initialData.members;

  // Update a member name slightly
  const originalName = members[0].name;
  const updatedMembers = members.map((m, idx) =>
    idx === 0 ? { ...m, name: `${originalName}_test` } : m
  );

  const saveRes = await fetch(`${BASE_URL}/api/members`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ members: updatedMembers }),
  });
  assert.equal(saveRes.status, 200, 'Save members status should be 200');

  // Verify update
  const verifyRes = await fetch(`${BASE_URL}/api/data`);
  const verifyData = await verifyRes.json();
  assert.equal(verifyData.members[0].name, `${originalName}_test`);

  // Restore original name
  const restoreMembers = members.map((m, idx) =>
    idx === 0 ? { ...m, name: originalName } : m
  );
  await fetch(`${BASE_URL}/api/members`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ members: restoreMembers }),
  });
});

test('API Tests: Task Archiving & Unarchiving Lifecycle', async () => {
  // 1. Create a task to archive
  const createRes = await fetch(`${BASE_URL}/api/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: '即将归档的任务',
      description: '归档测试详情',
      columnId: 'short',
      assigneeId: 'm1',
    }),
  });
  const task = await createRes.json();
  assert.ok(task.id);

  // 2. Archive the task
  const archiveRes = await fetch(`${BASE_URL}/api/tasks/${task.id}/archive`, {
    method: 'POST',
  });
  assert.equal(archiveRes.status, 200, 'Archive status should be 200');
  const archivedTask = await archiveRes.json();
  assert.equal(archivedTask.archived, true, 'Task must be marked archived');
  assert.ok(archivedTask.archivedAt, 'Task must have archivedAt timestamp');

  // 3. Verify task is NOT in active board data
  const boardRes = await fetch(`${BASE_URL}/api/data`);
  const boardData = await boardRes.json();
  assert.equal(
    boardData.tasks.some((t) => t.id === task.id),
    false,
    'Archived task must not appear in active board'
  );

  // 4. Verify task IS in archived tasks endpoint
  const archivedListRes = await fetch(`${BASE_URL}/api/tasks/archived`);
  assert.equal(archivedListRes.status, 200);
  const archivedList = await archivedListRes.json();
  assert.ok(
    archivedList.some((t) => t.id === task.id),
    'Task must appear in archived list'
  );

  // 5. Unarchive the task
  const unarchiveRes = await fetch(`${BASE_URL}/api/tasks/${task.id}/unarchive`, {
    method: 'POST',
  });
  assert.equal(unarchiveRes.status, 200);
  const unarchivedTask = await unarchiveRes.json();
  assert.equal(unarchivedTask.archived, false);

  // 6. Verify task IS back in active board data
  const restoredBoardRes = await fetch(`${BASE_URL}/api/data`);
  const restoredBoardData = await restoredBoardRes.json();
  assert.ok(
    restoredBoardData.tasks.some((t) => t.id === task.id),
    'Restored task must appear in active board'
  );

  // Clean up
  await fetch(`${BASE_URL}/api/tasks/${task.id}`, { method: 'DELETE' });
});
