import { config as loadEnv } from 'dotenv';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { DataSource, IsNull } from 'typeorm';
import { PartCategory } from '../src/part-listings/part-category.entity';
import { slugify } from '../src/common/slugify';

loadEnv({ path: path.resolve(__dirname, '../../../.env') });
loadEnv({ path: path.resolve(__dirname, '../.env') });

type SeedGroup = {
  name: string;
  subcategories: string[];
};

async function uniqueSlug(
  repo: ReturnType<DataSource['getRepository']> extends infer R ? R : never,
  base: string,
  excludeId?: string,
) {
  const categoryRepo = repo as import('typeorm').Repository<PartCategory>;
  let candidate = base || 'part-category';
  let n = 1;
  for (;;) {
    const existing = await categoryRepo.findOne({
      where: { slug: candidate },
      select: ['id'],
    });
    if (!existing || existing.id === excludeId) return candidate;
    n += 1;
    candidate = `${base}-${n}`;
  }
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  const seedPath = path.resolve(
    __dirname,
    '../seed-data/part-categories.seed.json',
  );
  if (!fs.existsSync(seedPath)) {
    throw new Error(`Seed file not found: ${seedPath}`);
  }
  const groups = JSON.parse(fs.readFileSync(seedPath, 'utf8')) as SeedGroup[];

  const ds = new DataSource({
    type: 'postgres',
    url: databaseUrl,
    entities: [PartCategory],
    synchronize: false,
  });
  await ds.initialize();

  await ds.query(`
    ALTER TABLE "part_categories"
    ALTER COLUMN "slug" TYPE character varying(120)
  `);
  await ds.query(`
    ALTER TABLE "part_categories"
    ADD COLUMN IF NOT EXISTS "parent_id" uuid NULL
    REFERENCES "part_categories"("id") ON DELETE CASCADE
  `);
  await ds.query(`
    CREATE INDEX IF NOT EXISTS "IDX_part_categories_parent_id"
    ON "part_categories" ("parent_id")
  `);

  const repo = ds.getRepository(PartCategory);
  let parents = 0;
  let children = 0;

  for (const group of groups) {
    let parent = await repo.findOne({
      where: { name: group.name, parentId: IsNull() },
    });
    if (!parent) {
      const parentSlug = await uniqueSlug(repo, slugify(group.name));
      parent = await repo.save(
        repo.create({
          name: group.name,
          slug: parentSlug,
          parentId: null,
        }),
      );
      parents += 1;
      console.log(`+ parent ${group.name}`);
    } else {
      console.log(`= parent ${group.name}`);
    }

    for (const subName of group.subcategories) {
      let child = await repo.findOne({
        where: { name: subName, parentId: parent.id },
      });
      if (!child) {
        const slug = await uniqueSlug(
          repo,
          slugify(`${group.name}-${subName}`),
        );
        child = await repo.save(
          repo.create({
            name: subName,
            slug,
            parentId: parent.id,
          }),
        );
        children += 1;
        console.log(`  + ${subName}`);
      } else {
        console.log(`  = ${subName}`);
      }
    }
  }

  const total = await repo.count();
  console.log(
    `Done. Added ${parents} parents, ${children} subcategories. Total categories: ${total}`,
  );
  await ds.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
