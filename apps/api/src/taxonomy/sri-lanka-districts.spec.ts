import { SRI_LANKA_DISTRICT_SEEDS } from './sri-lanka-districts';
import { slugify } from '../common/slugify';

describe('SRI_LANKA_DISTRICT_SEEDS', () => {
  it('lists all 25 Sri Lankan districts once', () => {
    const names = SRI_LANKA_DISTRICT_SEEDS.map((row) => row.name);
    const slugs = SRI_LANKA_DISTRICT_SEEDS.map((row) => slugify(row.name));

    expect(names).toHaveLength(25);
    expect(new Set(slugs).size).toBe(25);
    expect(names).toEqual(expect.arrayContaining([
      'Colombo',
      'Galle',
      'Gampaha',
      'Kandy',
    ]));
  });

  it('gives every district at least one city', () => {
    for (const row of SRI_LANKA_DISTRICT_SEEDS) {
      expect(row.cities.length).toBeGreaterThan(0);
    }
  });
});
