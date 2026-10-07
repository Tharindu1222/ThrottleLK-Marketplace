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
