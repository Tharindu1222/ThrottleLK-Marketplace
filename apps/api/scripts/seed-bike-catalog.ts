import { config as loadEnv } from 'dotenv';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { DataSource } from 'typeorm';
import { Brand } from '../src/taxonomy/brand.entity';
import { BikeModel } from '../src/taxonomy/bike-model.entity';
import { Category } from '../src/taxonomy/category.entity';
import { slugify } from '../src/common/slugify';
import { PUBLIC_CATEGORY_SEEDS } from '../src/taxonomy/category-map';

loadEnv({ path: path.resolve(__dirname, '../../../.env') });
loadEnv({ path: path.resolve(__dirname, '../.env') });

type SeedModel = {
  name: string;
  slug: string;
  aliases?: string[];
  defaultCategory?: string | null;
  defaultEngineCc?: number | null;
  fuelType?: string | null;
  modelStatus?: string;
  marketOrigins?: string[];
  isCurrent?: boolean | null;
  status?: string;
};

type SeedBrand = {
  name: string;
  slug: string;
  aliases?: string[];
  status?: string;
  models: SeedModel[];
};

type SeedFile = {
  brands: SeedBrand[];
};

function mapStatus(raw: string | undefined): string {
  if (!raw) return 'active';
  const n = raw.toLowerCase();
  if (n === 'active' || n === 'inactive') return n;
  return n === 'ACTIVE' ? 'active' : n === 'INACTIVE' ? 'inactive' : 'active';
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  const seedPath = path.resolve(__dirname, '../seed-data/bike-catalog.seed.json');
  if (!fs.existsSync(seedPath)) {
    throw new Error(`Seed file not found: ${seedPath}`);
  }
  const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8')) as SeedFile;

  const ds = new DataSource({
    type: 'postgres',
    url: databaseUrl,
    entities: [Brand, BikeModel, Category],
    synchronize: true,
  });
  await ds.initialize();

  const brandRepo = ds.getRepository(Brand);
  const modelRepo = ds.getRepository(BikeModel);
  const categoryRepo = ds.getRepository(Category);

  for (const name of [
    ...PUBLIC_CATEGORY_SEEDS,
    'Commuter',
    'Other',
  ] as const) {
    const slug = slugify(name);
    const existing = await categoryRepo.findOne({ where: { slug } });
    if (!existing) {
      await categoryRepo.save(categoryRepo.create({ name, slug }));
    }
  }

  let brandsCreated = 0;
  let brandsUpdated = 0;
  let modelsCreated = 0;
  let modelsUpdated = 0;

  for (const b of seed.brands) {
    if (/phase7/i.test(b.name) || /phase7/i.test(b.slug)) {
      continue;
    }

    let brand = await brandRepo.findOne({ where: { slug: b.slug } });
    const brandValues = {
      name: b.name,
      slug: b.slug,
      aliases: b.aliases ?? [],
      status: mapStatus(b.status),
    };
    if (!brand) {
      brand = brandRepo.create(brandValues);
      brandsCreated += 1;
    } else {
      Object.assign(brand, brandValues);
      brandsUpdated += 1;
    }
    brand = await brandRepo.save(brand);

    for (const m of b.models) {
      let model = await modelRepo.findOne({
        where: { brandId: brand.id, slug: m.slug },
      });
      const values = {
        brandId: brand.id,
        name: m.name,
        slug: m.slug,
        aliases: m.aliases ?? [],
        defaultCategory: m.defaultCategory ?? null,
        defaultEngineCc: m.defaultEngineCc ?? null,
        fuelType: m.fuelType ?? null,
        modelStatus: m.modelStatus ?? 'REVIEW_REQUIRED',
        marketOrigins: m.marketOrigins ?? [],
        isCurrent: m.isCurrent ?? null,
        status: mapStatus(m.status),
      };
      if (!model) {
        model = modelRepo.create(values);
        modelsCreated += 1;
      } else {
        Object.assign(model, values);
        modelsUpdated += 1;
      }
      await modelRepo.save(model);
    }
  }

  const phase7 = await brandRepo.find({
    where: [{ slug: 'phase7brand' }, { name: 'Phase7Brand' }],
  });
  for (const b of phase7) {
    b.status = 'inactive';
    await brandRepo.save(b);
  }

  // eslint-disable-next-line no-console
  console.log({
    brandsCreated,
    brandsUpdated,
    modelsCreated,
    modelsUpdated,
    phase7Deactivated: phase7.length,
  });

  await ds.destroy();
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
