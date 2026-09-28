const API = process.env.API_URL ?? 'http://localhost:3001';

async function req(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    throw new Error(
      `${method} ${path} ${res.status}: ${JSON.stringify(json.error ?? json)}`,
    );
  }
  return json;
}

function pickLeaf(categories, name) {
  const row = categories.find((c) => c.name === name && c.parentId);
  if (!row) throw new Error(`Missing category: ${name}`);
  return row.id;
}

const PARTS = [
  {
    title: 'CRF250L OEM brake pads',
    kind: 'spare',
    category: 'Brake Pads',
    priceLkr: 8500,
    condition: 'new',
    model: 'CRF250L',
    description:
      'Genuine-spec front brake pads for Honda CRF250L. Strong bite in wet and dry conditions.',
  },
  {
    title: 'CRF250L chain and sprocket kit',
    kind: 'spare',
    category: 'Chain & Sprocket Kits',
    priceLkr: 18500,
    condition: 'new',
    model: 'CRF250L',
    description:
      'Complete drive kit for Honda CRF250L. Includes chain, front and rear sprockets.',
  },
  {
    title: 'CRF250L aftermarket exhaust',
    kind: 'modified',
    category: 'Modified Exhausts',
    priceLkr: 42000,
    condition: 'used',
    model: 'CRF250L',
    description:
      'Used stainless slip-on exhaust for Honda CRF250L. Louder note, lighter than stock.',
  },
  {
    title: 'Dio CVT drive belt',
    kind: 'spare',
    category: 'Drive Belts',
    priceLkr: 4500,
    condition: 'new',
    model: 'Dio',
    description:
      'Replacement CVT drive belt for Honda Dio. Smooth take-off and city commuting.',
  },
  {
    title: 'Dio rear brake shoes',
    kind: 'spare',
    category: 'Brake Shoes',
    priceLkr: 2800,
    condition: 'new',
    model: 'Dio',
    description:
      'New rear brake shoes for Honda Dio. Easy fitment, quiet braking.',
  },
  {
    title: 'Dio LED headlight assembly',
    kind: 'modified',
    category: 'LED Lights',
    priceLkr: 12500,
    condition: 'reconditioned',
    model: 'Dio',
    description:
      'Bright LED headlight conversion for Honda Dio. Clear beam for night riding.',
  },
  {
    title: 'FZ-S iridium spark plug',
    kind: 'spare',
    category: 'Spark Plugs',
    priceLkr: 3200,
    condition: 'new',
    model: 'FZ-S',
    description:
      'Iridium spark plug for Yamaha FZ-S. Cleaner idle and easier cold starts.',
  },
  {
    title: 'FZ-S performance exhaust',
    kind: 'modified',
    category: 'Performance Exhausts',
    priceLkr: 38000,
    condition: 'used',
    model: 'FZ-S',
    description:
      'Used performance exhaust for Yamaha FZ-S. Deep tone, ready to bolt on.',
  },
  {
    title: 'RC 200 high-flow air filter',
    kind: 'spare',
    category: 'Air Filters',
    priceLkr: 6500,
    condition: 'new',
    model: 'RC 200',
    description:
      'High-flow air filter for KTM RC 200. Better throttle response on the street.',
  },
  {
    title: 'RC 200 tail tidy kit',
    kind: 'modified',
    category: 'Number Plate Holders',
    priceLkr: 9800,
    condition: 'new',
    model: 'RC 200',
    description:
      'Short tail tidy and number plate holder for KTM RC 200. Cleaner rear end.',
  },
];

async function main() {
  const login = await req('/api/v1/auth/login', {
    method: 'POST',
    body: {
      email: process.env.ADMIN_BOOTSTRAP_EMAIL ?? 'admin@throttlelk.lk',
      password: process.env.ADMIN_BOOTSTRAP_PASSWORD ?? 'ChangeMeAdmin1!',
    },
  });
  const token = login.data.accessToken;
  const adminId = login.data.user.id;

  const listings = (await req('/api/v1/listings')).data;
  const bikes = {};
  for (const row of listings) {
    if (row.modelName) bikes[row.modelName] = row;
  }
  const missingModels = PARTS.map((p) => p.model).filter((name) => !bikes[name]);
  if (missingModels.length) {
    throw new Error(`Missing bike models: ${[...new Set(missingModels)].join(', ')}`);
  }

  const sample = listings[0];
  const districtId = sample.districtId;
  const cityId = sample.cityId;
  if (!districtId || !cityId) {
    const detail = (await req(`/api/v1/listings/${sample.slug}`)).data;
    if (!detail.districtId || !detail.cityId) {
      throw new Error('Could not resolve district/city from listings');
    }
  }

  const locListing = (await req(`/api/v1/listings/${sample.slug}`)).data;
  const loc = {
    districtId: locListing.districtId,
    cityId: locListing.cityId,
  };

  const categories = (await req('/api/v1/part-categories')).data;
  const dealersRes = await req('/api/v1/admin/parts-dealers?limit=20', { token });
  let dealer = (dealersRes.data ?? []).find((d) => d.status === 'active');
  if (!dealer) {
    dealer = (
      await req('/api/v1/admin/parts-dealers', {
        method: 'POST',
        token,
        body: {
          ownerUserId: adminId,
          name: 'Throttle Demo Parts',
          phone: '0771234567',
          whatsapp: '0771234567',
          districtId: loc.districtId,
          cityId: loc.cityId,
          address: 'Colombo',
          description: 'Demo parts shop for local development.',
          status: 'active',
        },
      })
    ).data;
    console.log('Created parts dealer', dealer.id, dealer.name);
  } else {
    console.log('Using parts dealer', dealer.id, dealer.name);
  }

  const existing = (await req('/api/v1/admin/part-listings?limit=50', { token }))
    .data;
  const existingTitles = new Set((existing ?? []).map((p) => p.title));

  let created = 0;
  for (const part of PARTS) {
    if (existingTitles.has(part.title)) {
      console.log('= exists', part.title);
      continue;
    }
    const bike = bikes[part.model];
    const saved = (
      await req('/api/v1/admin/part-listings', {
        method: 'POST',
        token,
        body: {
          partsDealerId: dealer.id,
          kind: part.kind,
          categoryId: pickLeaf(categories, part.category),
          districtId: loc.districtId,
          cityId: loc.cityId,
          title: part.title,
          description: part.description,
          priceLkr: part.priceLkr,
          negotiable: true,
          condition: part.condition,
          phone: '0771234567',
          whatsapp: '0771234567',
          status: 'active',
          fitments: [{ brandId: bike.brandId, modelId: bike.modelId }],
        },
      })
    ).data;
    created += 1;
    console.log('+ ', saved.title, saved.kind, part.model);
  }

  console.log(`Done. Created ${created} parts.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
