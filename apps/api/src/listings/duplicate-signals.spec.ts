import { duplicateReasons, normalizeListingTitle } from './duplicate-signals';

const base = {
  id: 'a',
  sellerId: 's1',
  modelId: 'm1',
  manufactureYear: 2020,
  phone: '0771234567',
  title: 'Honda Dio 2020 Colombo',
};

describe('duplicateReasons', () => {
  it('flags same seller + model + year', () => {
    const reasons = duplicateReasons(base, {
      ...base,
      id: 'b',
      title: 'Honda Dio sport',
      phone: '0710000000',
    });
    expect(reasons).toContain('same_seller_model_year');
  });

  it('flags same phone + model from another seller', () => {
    const reasons = duplicateReasons(base, {
      ...base,
      id: 'b',
      sellerId: 's2',
      manufactureYear: 2018,
      title: 'Different title here',
    });
    expect(reasons).toContain('same_phone_model');
  });

  it('normalizes titles for comparison', () => {
    expect(normalizeListingTitle('Honda  Dio!!!')).toBe('honda dio');
  });
});
