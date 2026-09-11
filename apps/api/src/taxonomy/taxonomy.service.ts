import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { slugify } from '../common/slugify';
import { BikeModel } from './bike-model.entity';
import { Brand } from './brand.entity';
import { Category } from './category.entity';
import { City } from './city.entity';
import { District } from './district.entity';

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
  ) {}

  async onModuleInit() {
    await this.seedIfEmpty();
  }

  async seedIfEmpty() {
    if ((await this.categories.count()) === 0) {
      const cats = [
        'Scooter',
        'Commuter',
        'Sports',
        'Cruiser',
        'Adventure',
        'Dual-sport',
        'Electric',
        'Other',
      ];
      await this.categories.save(
        cats.map((name) =>
          this.categories.create({ name, slug: slugify(name) }),
        ),
      );
    }

    if ((await this.districts.count()) === 0) {
      const locationSeed: Record<string, string[]> = {
        Colombo: ['Colombo', 'Dehiwala', 'Moratuwa', 'Maharagama'],
        Gampaha: ['Gampaha', 'Negombo', 'Kelaniya'],
        Kandy: ['Kandy', 'Peradeniya'],
        Galle: ['Galle', 'Hikkaduwa'],
      };
      for (const [districtName, cityNames] of Object.entries(locationSeed)) {
        const district = await this.districts.save(
          this.districts.create({
            name: districtName,
            slug: slugify(districtName),
          }),
        );
        await this.cities.save(
          cityNames.map((name) =>
            this.cities.create({
              name,
              slug: `${slugify(districtName)}-${slugify(name)}`,
              districtId: district.id,
            }),
          ),
        );
      }
    }

    if ((await this.brands.count()) === 0) {
      const brandModels: Record<string, string[]> = {
        Honda: ['Dio', 'Activa', 'CB150R', 'CBR150R'],
        Yamaha: ['FZ-S', 'R15', 'NMAX'],
        Bajaj: ['Pulsar 150', 'Pulsar NS200', 'CT 100'],
        TVS: ['Apache RTR 160', 'Ntorq', 'XL100'],
        Suzuki: ['Gixxer', 'Access 125', 'Burgman'],
        Hero: ['Splendor', 'Xpulse 200', 'Pleasure'],
        'Royal Enfield': ['Classic 350', 'Hunter 350', 'Himalayan'],
        KTM: ['Duke 200', 'Duke 390', 'RC 200'],
      };
      const scooter = await this.categories.findOne({
        where: { slug: 'scooter' },
      });
      for (const [brandName, modelNames] of Object.entries(brandModels)) {
        const brand = await this.brands.save(
          this.brands.create({
            name: brandName,
            slug: slugify(brandName),
            status: 'active',
          }),
        );
        await this.models.save(
          modelNames.map((name) =>
            this.models.create({
              brandId: brand.id,
              name,
              slug: `${brand.slug}-${slugify(name)}`,
              categoryId: scooter?.id ?? null,
              status: 'active',
            }),
          ),
        );
      }
    }
  }

  listBrands() {
    return this.brands.find({
      where: { status: 'active' },
      order: { name: 'ASC' },
    });
  }

  async getBrandBySlug(slug: string) {
    const brand = await this.brands.findOne({ where: { slug } });
    if (!brand) {
      throw new NotFoundException({
        success: false,
        error: { code: 'BRAND_NOT_FOUND', message: 'Brand not found' },
      });
    }
    return brand;
  }

  listModelsByBrand(brandId: string) {
    return this.models.find({
      where: { brandId, status: 'active' },
      order: { name: 'ASC' },
    });
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

  listCategories() {
    return this.categories.find({ order: { name: 'ASC' } });
  }

  listDistricts() {
    return this.districts.find({ order: { name: 'ASC' } });
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
    return this.brands.save(
      this.brands.create({ name, slug, status: 'active' }),
    );
  }

  async adminCreateModel(
    brandId: string,
    name: string,
    categoryId?: string,
  ) {
    await this.getBrandOrThrow(brandId);
    const slug = `${slugify(name)}-${Date.now().toString(36)}`;
    return this.models.save(
      this.models.create({
        brandId,
        name,
        slug,
        categoryId: categoryId ?? null,
        status: 'active',
      }),
    );
  }

  async adminCreateDistrict(name: string) {
    const slug = slugify(name);
    const existing = await this.districts.findOne({ where: { slug } });
    if (existing) return existing;
    return this.districts.save(this.districts.create({ name, slug }));
  }

  async adminCreateCity(districtId: string, name: string) {
    const district = await this.districts.findOne({ where: { id: districtId } });
    if (!district) {
      throw new NotFoundException({
        success: false,
        error: { code: 'DISTRICT_NOT_FOUND', message: 'District not found' },
      });
    }
    return this.cities.save(
      this.cities.create({
        districtId,
        name,
        slug: `${district.slug}-${slugify(name)}`,
      }),
    );
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
