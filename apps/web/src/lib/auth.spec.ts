import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { sessionUserHint, type AuthUser } from './auth';

const dealer: AuthUser = {
  id: 'user-1',
  firstName: 'Tharindu',
  lastName: 'Dilshan',
  email: 'dealer@example.com',
  phone: '0704608282',
  roles: ['buyer', 'dealer'],
  emailVerifiedAt: '2026-01-01T00:00:00.000Z',
  avatarUrl: '/avatars/1.jpg',
};

describe('sessionUserHint', () => {
  it('keeps roles so dealer and parts-dealer nav can render', () => {
    const hint = sessionUserHint(dealer);
    assert.deepEqual(hint.roles, ['buyer', 'dealer']);

    const parts = sessionUserHint({
      ...dealer,
      roles: ['buyer', 'parts_dealer'],
    });
    assert.deepEqual(parts.roles, ['buyer', 'parts_dealer']);
  });

  it('stores an empty role list when the user has none', () => {
    const hint = sessionUserHint({ ...dealer, roles: [] });
    assert.deepEqual(hint.roles, []);
  });

  it('does not persist email or phone in the UI hint', () => {
    const hint = sessionUserHint(dealer);
    assert.equal(hint.email, '');
    assert.equal(hint.phone, null);
  });

  it('keeps identity fields used by the account chrome', () => {
    const hint = sessionUserHint(dealer);
    assert.equal(hint.id, dealer.id);
    assert.equal(hint.firstName, dealer.firstName);
    assert.equal(hint.lastName, dealer.lastName);
    assert.equal(hint.emailVerifiedAt, dealer.emailVerifiedAt);
    assert.equal(hint.avatarUrl, dealer.avatarUrl);
  });

  it('copies roles so later mutation of the source user cannot hide nav', () => {
    const roles = ['buyer', 'dealer'];
    const hint = sessionUserHint({ ...dealer, roles });
    roles.pop();
    assert.deepEqual(hint.roles, ['buyer', 'dealer']);
  });
});
