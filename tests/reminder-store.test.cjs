/* global __dirname */
/* eslint-env node */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { QueryClient, QueryObserver } = require('@tanstack/react-query');

const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../hooks/reminder-store.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const tick = () => new Promise(resolve => setImmediate(resolve));
const row = id => ({ id, title: id, priority: 'low', date: '2026-09-17', time: '12:00',
  repeatType: 'none', createdAt: '', updatedAt: '', isActive: true });
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function harness(t, initial, service = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } } });
  if (initial !== undefined) client.setQueryData(['reminders'], initial);
  const exports = {};
  vm.runInNewContext(source, { exports, require(name) {
    if (name === '@tanstack/react-query') return { useQueryClient: () => client, useMutation: options => options };
    if (name === '@/services/reminder-service') return service;
    throw new Error(`Unexpected import: ${name}`);
  }, setTimeout });
  let invalidations = 0;
  const invalidate = client.invalidateQueries.bind(client);
  client.invalidateQueries = (...args) => { invalidations++; return invalidate(...args); };
  t.after(() => client.clear());
  return { client, hooks: exports, data: () => client.getQueryData(['reminders']),
    invalidations: () => invalidations,
    run(hook, variables) {
      const mutation = client.getMutationCache().build(client, exports[hook]());
      // Attach rejection handling immediately while still exposing the result.
      return mutation.execute(variables).then(() => null, error => error);
    } };
}

test('update replaces only the existing row, strips transient flags, and isolates service mutation', async t => {
  const gate = deferred();
  const a = { ...row('a'), description: 'removed' }, b = row('b');
  const h = harness(t, [a, b], { updateReminder: value => { value.notificationId = undefined; return gate.promise; } });
  const input = { ...row('a'), isCompleted: true, snoozeClearing: true, notificationUpdating: true, notificationId: 'old' };
  const pending = h.run('useUpdateReminder', input);
  await tick();
  assert.equal(h.data()[0].isCompleted, true);
  assert.equal('description' in h.data()[0], false);
  assert.equal('snoozeClearing' in h.data()[0], false);
  assert.equal('notificationUpdating' in h.data()[0], false);
  assert.equal(h.data()[0].notificationId, 'old');
  assert.equal(h.data()[1], b);
  gate.reject(new Error('failed'));
  assert.equal((await pending).message, 'failed');
  assert.deepEqual(h.data(), [a, b]);
  assert.equal(h.invalidations(), 1);
});

test('overlapping bulk delete and completion defer refetch until both writes finish', async t => {
  const deleting = deferred(), completing = deferred();
  let storage = [row('history'), row('main')];
  let fetches = 0;
  const h = harness(t, storage, {
    deleteReminder: async id => { await deleting.promise; storage = storage.map(r => r.id === id ? { ...r, isDeleted: true, isActive: false } : r); },
    updateReminder: async value => { await completing.promise; storage = storage.map(r => r.id === value.id ? value : r); },
  });
  const observer = new QueryObserver(h.client, { queryKey: ['reminders'], queryFn: async () => { fetches++; return storage; }, staleTime: Infinity });
  const unsubscribe = observer.subscribe(() => {});
  t.after(unsubscribe);
  const first = h.run('useBulkDeleteReminders', ['history']);
  const second = h.run('useUpdateReminder', { ...row('main'), isCompleted: true });
  await tick();
  assert.equal(h.data()[0].isDeleted, true);
  assert.equal(h.data()[0].isActive, false);
  assert.equal(h.data()[1].isCompleted, true);
  deleting.resolve();
  await first;
  assert.equal(h.invalidations(), 0);
  assert.equal(fetches, 0);
  assert.equal(h.data()[1].isCompleted, true);
  completing.resolve();
  await second;
  assert.equal(h.invalidations(), 1);
  assert.equal(fetches, 1);
  assert.deepEqual(h.data(), storage);
});

test('failed bulk rollback preserves concurrent update and permanent removal', async t => {
  const bulk = deferred(), update = deferred(), remove = deferred();
  const original = [row('a'), row('b'), row('c')];
  const h = harness(t, original, { deleteReminder: () => bulk.promise, updateReminder: () => update.promise, permanentlyDeleteReminder: () => remove.promise });
  const first = h.run('useBulkDeleteReminders', ['a']);
  const second = h.run('useUpdateReminder', { ...row('b'), isCompleted: true });
  const third = h.run('usePermanentlyDeleteReminder', 'c');
  await tick();
  bulk.reject(new Error('bulk failure'));
  await first;
  assert.deepEqual(h.data().map(r => r.id), ['a', 'b']);
  assert.deepEqual(h.data()[0], original[0]);
  assert.equal(h.data()[1].isCompleted, true);
  assert.equal(h.invalidations(), 0);
  update.resolve(); remove.resolve();
  await Promise.all([second, third]);
  assert.equal(h.invalidations(), 1);
});

test('permanent-delete failure restores position without reverting another row', async t => {
  const remove = deferred(), update = deferred();
  const h = harness(t, [row('a'), row('b'), row('c')], { permanentlyDeleteReminder: () => remove.promise, updateReminder: () => update.promise });
  const first = h.run('usePermanentlyDeleteReminder', 'b');
  const second = h.run('useUpdateReminder', { ...row('c'), title: 'edited' });
  await tick();
  assert.deepEqual(h.data().map(r => r.id), ['a', 'c']);
  remove.reject(new Error('failed'));
  await first;
  assert.deepEqual(h.data().map(r => r.id), ['a', 'b', 'c']);
  assert.equal(h.data()[2].title, 'edited');
  update.resolve(); await second;
});

test('older failed update does not overwrite newer edit to the same row', async t => {
  const firstGate = deferred(), secondGate = deferred();
  const h = harness(t, [row('a')], { updateReminder: value => value.title === 'first' ? firstGate.promise : secondGate.promise });
  const first = h.run('useUpdateReminder', { ...row('a'), title: 'first' });
  await tick();
  const second = h.run('useUpdateReminder', { ...row('a'), title: 'second' });
  await tick();
  firstGate.reject(new Error('failed')); await first;
  assert.equal(h.data()[0].title, 'second');
  secondGate.resolve(); await second;
});

test('partial bulk failure waits for late success before authoritative reconciliation', async t => {
  const late = deferred();
  let storage = [row('a'), row('b')];
  const h = harness(t, storage, { deleteReminder: async id => {
    if (id === 'a') throw new Error('first failed');
    await late.promise;
    storage = storage.map(r => r.id === id ? { ...r, isDeleted: true, isActive: false } : r);
  } });
  const observer = new QueryObserver(h.client, { queryKey: ['reminders'], queryFn: async () => storage, staleTime: Infinity });
  t.after(observer.subscribe(() => {}));
  const pending = h.run('useBulkDeleteReminders', ['a', 'b']);
  await tick();
  assert.equal(h.invalidations(), 0);
  assert.equal(h.client.isMutating(), 1);
  late.resolve();
  assert.equal((await pending).message, 'first failed');
  assert.equal(h.invalidations(), 1);
  assert.deepEqual(h.data(), storage);
  assert.equal(h.data()[0].isDeleted, undefined);
  assert.equal(h.data()[1].isDeleted, true);
});

for (const initial of [undefined, [], [row('untouched')]]) {
  test(`missing targets/cache remain untouched (${JSON.stringify(initial)})`, async t => {
    const h = harness(t, initial, { updateReminder: async () => {}, deleteReminder: async () => {}, permanentlyDeleteReminder: async () => { throw new Error('missing'); } });
    await h.run('useUpdateReminder', row('missing'));
    await h.run('useBulkDeleteReminders', ['missing']);
    await h.run('useBulkDeleteReminders', []);
    await h.run('usePermanentlyDeleteReminder', 'missing');
    assert.deepEqual(h.data(), initial);
  });
}
