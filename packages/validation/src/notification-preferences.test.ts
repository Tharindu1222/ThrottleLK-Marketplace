import { test } from 'node:test';
import assert from 'node:assert/strict';
import { notificationPreferencesSchema } from './index';

test('notification preferences accept partial boolean changes', () => {
  assert.deepEqual(
    notificationPreferencesSchema.parse({ email: false, messages: true }),
    { email: false, messages: true },
  );
  assert.deepEqual(notificationPreferencesSchema.parse({}), {});
});

test('notification preferences reject unknown fields and non-boolean values', () => {
  for (const input of [
    { email: 'false' },
    { inApp: null },
    { userId: 'another-user' },
    { email: false, roles: ['admin'] },
  ]) {
    assert.equal(notificationPreferencesSchema.safeParse(input).success, false);
  }
});
