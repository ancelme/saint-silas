import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { isTeacherInactive } from '../../backend/src/middleware/auth.ts';

const dashboardLayout = await readFile(
  new URL('../../frontend/src/components/dashboard/DashboardLayout.tsx', import.meta.url),
  'utf8',
);
const navigationMatch = dashboardLayout.match(/const allNavItems = \[([\s\S]*?)\n  \];/);
assert.ok(navigationMatch, 'Dashboard navigation entries should be defined.');
const navigationItems = [...navigationMatch[1].matchAll(/\{\s*id:\s*'([^']+)'[\s\S]*?roles:\s*\[([^\]]*)\]\s*\}/g)]
  .map(([, id, roles]) => ({
    id,
    roles: [...roles.matchAll(/'([^']+)'/g)].map(([, role]) => role),
  }));
const renderedPanels = new Set([...dashboardLayout.matchAll(/activeTab === '([^']+)'/g)].map(([, id]) => id));

test('every dashboard role has a visible navigation entry', () => {
  const expectedRoles = ['owner', 'super_admin', 'admin', 'head_teacher', 'accountant', 'teacher', 'librarian', 'student', 'parent'];
  for (const role of expectedRoles) {
    assert.ok(navigationItems.some(item => item.roles.includes(role)), `Missing navigation entry for ${role}.`);
  }
});

test('every advertised dashboard tab has a rendered panel', () => {
  for (const item of navigationItems) {
    assert.ok(renderedPanels.has(item.id), `Navigation tab "${item.id}" has no rendered panel.`);
  }
});

test('inactive teachers are rejected while active teachers and other roles are unaffected', () => {
  assert.equal(isTeacherInactive({ role: 'teacher', teacher_status: 'Inactive' }), true);
  assert.equal(isTeacherInactive({ role: 'teacher', teacher_status: 'Active' }), false);
  assert.equal(isTeacherInactive({ role: 'admin', teacher_status: 'Inactive' }), false);
});

test('Vercel refuses SQLite when durable database configuration is missing', () => {
  const script = [
    "import { db } from './backend/src/db/index.ts';",
    'try { await db.init(); process.exitCode = 1; }',
    "catch (error) { if (!String(error.message).includes('SUPABASE_DB_URL is required on Vercel')) process.exitCode = 1; }",
  ].join(' ');
  const result = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', script], {
    encoding: 'utf8',
    env: { ...process.env, VERCEL: '1', SUPABASE_DB_URL: '' },
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
