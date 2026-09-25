import {
  ownedDealerHref,
  ownedDealerManageHref,
  pickOwnedDealer,
} from './owned-dealer';

const pending = {
  id: '1',
  name: 'Pending Parts',
  slug: 'pending-parts',
  status: 'pending',
};
const active = {
  id: '2',
  name: 'Throttle LK Modified Parts',
  slug: 'throttle-lk-modified-parts',
  status: 'active',
};

describe('pickOwnedDealer', () => {
  it('returns null when the user has no shop', () => {
    expect(pickOwnedDealer([])).toBeNull();
    expect(pickOwnedDealer(undefined)).toBeNull();
  });

  it('prefers the active shop so the apply form can show it', () => {
    expect(pickOwnedDealer([pending, active])).toEqual(active);
  });

  it('falls back to a pending application', () => {
    expect(pickOwnedDealer([pending])).toEqual(pending);
  });
});

describe('ownedDealerHref', () => {
  it('opens the public parts showroom when the shop is live', () => {
    expect(ownedDealerHref('en', 'parts', active)).toBe(
      '/en/parts-dealers/throttle-lk-modified-parts',
    );
  });

  it('stays on apply so pending shops show status instead of a new form', () => {
    expect(ownedDealerHref('en', 'parts', pending)).toBe(
      '/en/parts-dealers/apply',
    );
    expect(ownedDealerHref('si', 'bike', pending)).toBe('/si/dealers/apply');
  });
});

describe('ownedDealerManageHref', () => {
  it('sends an active parts dealer to the account showroom', () => {
    expect(ownedDealerManageHref('en', 'parts', active)).toBe(
      '/en/account/parts-showroom',
    );
  });
});
