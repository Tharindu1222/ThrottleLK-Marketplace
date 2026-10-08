import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createListingSchema, updateListingSchema } from './index';

test('PATCH preserves zero mileage and supports clearing nullable bike fields', () => {
  const values = {
    mileage: 0,
    engineCc: null,
    registrationYear: null,
    colour: null,
    whatsapp: null,
  };
  assert.deepEqual(updateListingSchema.parse(values), values);
  assert.deepEqual(updateListingSchema.parse({}), {});
  assert.equal(updateListingSchema.safeParse({ mileage: -1 }).success, false);
  assert.equal(
    createListingSchema.shape.engineCc.safeParse(null).success,
    false,
  );
});

test('registration dropdown values are accepted by create and PATCH without a year', () => {
  const id = '8be56a66-ab3e-47a2-8f9b-71312bbf73e9';
  const input = {
    brandId: id,
    modelId: id,
    categoryId: id,
    districtId: id,
    cityId: id,
    title: 'Honda CBR1000RR 2026',
    description: 'A well maintained motorbike available in Colombo.',
    priceLkr: 2100000,
    manufactureYear: 2026,
    engineCc: 1000,
    mileage: 2000,
    fuelType: 'petrol',
    transmission: 'manual',
    condition: 'used',
    phone: '0700000000',
  };
  for (const registrationStatus of ['registered', 'unregistered'] as const) {
    const parsed = createListingSchema.parse({ ...input, registrationStatus });
    assert.equal(parsed.registrationStatus, registrationStatus);
    assert.equal(parsed.registrationYear, undefined);
    assert.equal(parsed.costPriceLkr, undefined);
    assert.equal(parsed.purchaseDate, undefined);
    assert.deepEqual(updateListingSchema.parse({ registrationStatus }), {
      registrationStatus,
    });
  }
  assert.equal(createListingSchema.safeParse(input).success, true);
  assert.equal(
    updateListingSchema.safeParse({ registrationStatus: 'unregister' }).success,
    false,
  );
  // The old free-text field converted 'unregister' to NaN, serialized as null.
  assert.equal(
    createListingSchema.safeParse({ ...input, registrationYear: null }).success,
    false,
  );
});
