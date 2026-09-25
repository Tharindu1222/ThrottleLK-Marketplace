import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CacheService } from '../common/cache.service';
import { slugify } from '../common/slugify';
import { BikeModel } from './bike-model.entity';
import { Brand } from './brand.entity';
import { Category } from './category.entity';
import { City } from './city.entity';
import {
  mapToPublicCategory,
  normalizeFuelType,
  PUBLIC_CATEGORY_SEEDS,
  PUBLIC_CATEGORY_SLUGS,
  INTERNAL_CATEGORY_SEEDS,
} from './category-map';
import { District } from './district.entity';
import { SRI_LANKA_DISTRICT_SEEDS } from './sri-lanka-districts';

@Injectable()
export class TaxonomyService implements OnModuleInit {
  constructor(
    @InjectRepository(Brand) private readonly brands: Repository<Brand>,
    @InjectRepository(BikeModel) private readonly models: Repository<BikeModel>,
    @InjectRepository(Category)
    private readonly categories: Repository<Category>,
    @InjectRepository(District)
    private readonly districts: Repository<District>,
    @InjectRepository(City) private readonly cities: Repository<City>,
    private readonly cache: CacheService,
  ) {}

  async onModuleInit() {
    await this.seedIfEmpty();
  }

  async seedIfEmpty() {
    for (const name of [...PUBLIC_CATEGORY_SEEDS, ...INTERNAL_CATEGORY_SEEDS]) {
      const slug = slugify(name);
      const existing = await this.categories.findOne({ where: { slug } });
      if (!existing) {
        await this.categories.save(this.categories.create({ name, slug }));
      }
    }

    let locationsChanged = false;
    for (const { name: districtName, cities: cityNames } of SRI_LANKA_DISTRICT_SEEDS) {
      const slug = slugify(districtName);
      let district = await this.districts.findOne({ where: { slug } });
      if (!district) {
        district = await this.districts.save(
          this.districts.create({ name: districtName, slug }),
        );
        locationsChanged = true;
      }
      for (const cityName of cityNames) {
        const citySlug = `${slug}-${slugify(cityName)}`;
        const existingCity = await this.cities.findOne({
          where: { slug: citySlug },
        });
        if (existingCity) continue;
        await this.cities.save(
          this.cities.create({
            name: cityName,
            slug: citySlug,
            districtId: district.id,
          }),
        );
        locationsChanged = true;
      }
    }
    if (locationsChanged) {
      void this.cache.invalidateTaxonomy();
    }

    // Minimal brands only if empty — full catalogue via `npm run seed:bike-catalog`
    if ((await this.brands.count()) === 0) {
      const brandModels: Record<string, string[]> = {
        Honda: ['Dio', 'Activa', 'CB150R', 'CBR150R'],
        Yamaha: ['FZ-S', 'R15', 'NMAX'],
        Bajaj: ['Pulsar 150', 'Pulsar NS200', 'CT 100'],
      };
      for (const [brandName, modelNames] of Object.entries(brandModels)) {
        const brand = await this.brands.save(
          this.brands.create({
            name: brandName,
            slug: slugify(brandName),
            aliases: [],
            status: 'active',
          }),
        );
        await this.models.save(
          modelNames.map((name) =>
            this.models.create({
              brandId: brand.id,
              name,
              slug: slugify(name),
              aliases: [],
              marketOrigins: [],
              modelStatus: 'REVIEW_REQUIRED',
              status: 'active',
            }),
          ),
        );
      }
    }

    await this.brands
      .createQueryBuilder()
      .update(Brand)
      .set({ status: 'inactive' })
      .where('LOWER(name) LIKE :p OR LOWER(slug) LIKE :p', { p: '%phase7%' })
      .execute();
  }

  async listBrands(search?: string) {
    const useCache = !search?.trim();
    if (useCache) {
      const cached = await this.cache.get<Brand[]>(this.cache.keys.taxonomyBrands);
      if (cached) return cached;
    }
    const qb = this.brands
      .createQueryBuilder('brand')
      .where('brand.status = :status', { status: 'active' })
      .andWhere('LOWER(brand.name) NOT LIKE :phase7', { phase7: '%phase7%' })
      .orderBy('brand.name', 'ASC')
      .take(100);

    if (search?.trim()) {
      const q = `%${search.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(brand.name) LIKE :q OR LOWER(brand.aliases::text) LIKE :q)',
        { q },
      );
    }

    const rows = await qb.getMany();
    if (useCache) {
      await this.cache.set(this.cache.keys.taxonomyBrands, rows, 1800);
    }
    return rows;
  }

  async getBrandBySlug(slug: string) {
    const brand = await this.brands.findOne({ where: { slug } });
    if (!brand || brand.status !== 'active') {
      throw new NotFoundException({
        success: false,
        error: { code: 'BRAND_NOT_FOUND', message: 'Brand not found' },
      });
    }
    return brand;
  }

  async listModelsByBrand(brandId: string, search?: string) {
    await this.getBrandOrThrow(brandId);
    const qb = this.models
      .createQueryBuilder('model')
      .where('model.brand_id = :brandId', { brandId })
      .andWhere('model.status = :status', { status: 'active' })
      .orderBy('model.name', 'ASC')
      .take(150);

    if (search?.trim()) {
      const q = `%${search.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(model.name) LIKE :q OR LOWER(model.aliases::text) LIKE :q)',
        { q },
      );
    }

    const rows = await qb.getMany();
    return rows.map((m) => this.serializeModel(m));
  }

  serializeModel(model: BikeModel) {
    return {
      id: model.id,
      name: model.name,
      slug: model.slug,
      aliases: model.aliases ?? [],
      defaultCategory: model.defaultCategory,
      publicCategory: mapToPublicCategory(model.defaultCategory),
      defaultEngineCc: model.defaultEngineCc,
      fuelType: model.fuelType,
      fuelTypeNormalized: normalizeFuelType(model.fuelType),
      modelStatus: model.modelStatus,
      marketOrigins: model.marketOrigins ?? [],
      isCurrent: model.isCurrent,
      status: model.status,
      brandId: model.brandId,
      categoryId: model.categoryId,
    };
  }

  async getModelBySlug(slug: string) {
    const model = await this.models.findOne({
      where: { slug },
      relations: ['brand'],
    });
    if (!model) {
      throw new NotFoundException({
        success: false,
        error: { code: 'MODEL_NOT_FOUND', message: 'Model not found' },
      });
    }
    return model;
  }

  async listCategories(scope?: string) {
    if (scope === 'public') {
      const cached = await this.cache.get<Category[]>(
        this.cache.keys.taxonomyCategoriesPublic,
      );
      if (cached) return cached;
      const rows = await this.categories
        .createQueryBuilder('category')
        .where('category.slug IN (:...slugs)', { slugs: PUBLIC_CATEGORY_SLUGS })
        .orderBy('category.name', 'ASC')
        .getMany();
      const order = new Map<string, number>(
        PUBLIC_CATEGORY_SLUGS.map((slug, i) => [slug, i]),
      );
      const sorted = rows.sort(
        (a, b) => (order.get(a.slug) ?? 99) - (order.get(b.slug) ?? 99),
      );
      await this.cache.set(this.cache.keys.taxonomyCategoriesPublic, sorted, 1800);
      return sorted;
    }
    return this.categories.find({ order: { name: 'ASC' } });
  }

  async listDistricts() {
    const cached = await this.cache.get<District[]>(
      this.cache.keys.taxonomyDistricts,
    );
    if (cached) return cached;
    const rows = await this.districts.find({ order: { name: 'ASC' } });
    await this.cache.set(this.cache.keys.taxonomyDistricts, rows, 1800);
    return rows;
  }

  async getDistrictBySlug(slug: string) {
    const district = await this.districts.findOne({ where: { slug } });
    if (!district) {
      throw new NotFoundException({
        success: false,
        error: { code: 'DISTRICT_NOT_FOUND', message: 'District not found' },
      });
    }
    return district;
  }

  listCities(districtId: string) {
    return this.cities.find({
      where: { districtId },
      order: { name: 'ASC' },
    });
  }

  async adminCreateBrand(name: string) {
    const slug = slugify(name);
    const existing = await this.brands.findOne({ where: { slug } });
    if (existing) return existing;
    const saved = await this.brands.save(
      this.brands.create({
        name,
        slug,
        aliases: [],
        status: 'active',
      }),
    );
    void this.cache.invalidateTaxonomy();
    return saved;
  }

  async adminCreateModel(
    brandId: string,
    name: string,
    categoryId?: string,
  ) {
    await this.getBrandOrThrow(brandId);
    const base = slugify(name);
    let slug = base;
    let n = 0;
    while (await this.models.findOne({ where: { brandId, slug } })) {
      n += 1;
      slug = `${base}-${n}`;
    }
    return this.models.save(
      this.models.create({
        brandId,
        name,
        slug,
        aliases: [],
        marketOrigins: [],
        modelStatus: 'REVIEW_REQUIRED',
        categoryId: categoryId ?? null,
        status: 'active',
      }),
    );
  }

  async adminCreateDistrict(name: string) {
    const slug = slugify(name);
    const existing = await this.districts.findOne({ where: { slug } });
    if (existing) return existing;
    const saved = await this.districts.save(this.districts.create({ name, slug }));
    void this.cache.invalidateTaxonomy();
    return saved;
  }

  async adminCreateCity(districtId: string, name: string) {
    const district = await this.districts.findOne({ where: { id: districtId } });
    if (!district) {
      throw new NotFoundException({
        success: false,
        error: { code: 'DISTRICT_NOT_FOUND', message: 'District not found' },
      });
    }
    const saved = await this.cities.save(
      this.cities.create({
        districtId,
        name,
        slug: `${district.slug}-${slugify(name)}`,
      }),
    );
    void this.cache.invalidateTaxonomy();
    return saved;
  }

  listBrandsAdmin() {
    return this.brands.find({ order: { name: 'ASC' } });
  }

  private async getBrandOrThrow(id: string) {
    const brand = await this.brands.findOne({ where: { id } });
    if (!brand) {
      throw new NotFoundException({
        success: false,
        error: { code: 'BRAND_NOT_FOUND', message: 'Brand not found' },
      });
    }
    return brand;
  }
}
