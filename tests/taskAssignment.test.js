import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import app from '../src/server.js';
import { TaskStore } from '../src/models/store.js';

let server;
let baseUrl;

describe('STMS-12: Task Assignment Feature Tests', () => {
  before(async () => {
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    // Reset test task-103 to unassigned state
    try {
      await TaskStore.assignTask('task-103', null, 'test-suite');
    } catch (_) {}

    await new Promise((resolve) => server.close(resolve));
  });

  test('GET /api/tasks returns tasks with populated assignee', async () => {
    const res = await fetch(`${baseUrl}/api/tasks`);
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(Array.isArray(json.data));

    // Find task-101 which is pre-assigned to usr-101
    const task101 = json.data.find((t) => t.id === 'task-101');
    assert.ok(task101);
    assert.equal(task101.assigneeId, 'usr-101');
    assert.equal(task101.assignee.name, 'R Srujan Kumar');
  });

  test('PATCH /api/tasks/task-103/assign assigns task to a team member', async () => {
    const res = await fetch(`${baseUrl}/api/tasks/task-103/assign`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assigneeId: 'usr-102',
        assignedBy: 'usr-101',
      }),
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.assigneeId, 'usr-102');
    assert.ok(json.data.assignee);
    assert.equal(json.data.assignee.name, 'Spoorthi C');
    assert.ok(json.data.assignedAt);
  });

  test('PATCH /api/tasks/task-103/assign reassigns task to another team member', async () => {
    const res = await fetch(`${baseUrl}/api/tasks/task-103/assign`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assigneeId: 'usr-104',
        assignedBy: 'usr-101',
      }),
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.assigneeId, 'usr-104');
    assert.equal(json.data.assignee.name, 'Priya Patel');

    // Verify history recorded the reassignment
    const latestHistory = json.data.history[0];
    assert.equal(latestHistory.action, 'REASSIGNED');
    assert.equal(latestHistory.to, 'usr-104');
  });

  test('PATCH /api/tasks/task-103/assign unassigns a task when assigneeId is null', async () => {
    const res = await fetch(`${baseUrl}/api/tasks/task-103/assign`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assigneeId: null,
        assignedBy: 'usr-101',
      }),
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.assigneeId, null);
    assert.equal(json.data.assignee, null);
  });

  test('PATCH /api/tasks/task-103/assign fails with 400 for non-existent user', async () => {
    const res = await fetch(`${baseUrl}/api/tasks/task-103/assign`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assigneeId: 'non-existent-user-999',
      }),
    });

    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.equal(json.error, 'USER_NOT_FOUND');
  });

  test('PATCH /api/tasks/invalid-task-id/assign fails with 404 for non-existent task', async () => {
    const res = await fetch(`${baseUrl}/api/tasks/invalid-task-999/assign`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assigneeId: 'usr-101',
      }),
    });

    assert.equal(res.status, 404);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.equal(json.error, 'TASK_NOT_FOUND');
  });
});
