import { changedKeys } from './changed-keys';

describe('changedKeys', () => {
  const current = {
    title: 'Honda Dio 2020',
    description: 'Clean bike',
    priceLkr: 450000,
    negotiable: true,
    phone: '0771234567',
    whatsapp: null as string | null,
    engineCc: 110,
  };

  it('ignores fields that match the stored listing', () => {
    expect(
      changedKeys(current, {
        title: 'Honda Dio 2020',
        description: 'Clean bike',
        priceLkr: 450000,
        negotiable: true,
        phone: '0771234567',
        engineCc: 110,
      }),
    ).toEqual([]);
  });

  it('treats a price change as price-only when the rest is unchanged', () => {
    expect(
      changedKeys(current, {
        title: 'Honda Dio 2020',
        priceLkr: 400000,
        negotiable: true,
      }),
    ).toEqual(['priceLkr']);
  });

  it('reports a real description change', () => {
    expect(
      changedKeys(current, {
        description: 'New tyres and service',
        priceLkr: 450000,
      }),
    ).toEqual(['description']);
  });

  it('treats blank strings and null as the same', () => {
    expect(changedKeys(current, { whatsapp: '' })).toEqual([]);
  });
});
