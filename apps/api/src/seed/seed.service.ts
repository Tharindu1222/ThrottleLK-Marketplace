import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { slugify } from '../common/slugify';
import { Listing } from '../listings/listing.entity';
import { BikeModel } from '../taxonomy/bike-model.entity';
import { Brand } from '../taxonomy/brand.entity';
import { Category } from '../taxonomy/category.entity';
import { City } from '../taxonomy/city.entity';
import { District } from '../taxonomy/district.entity';
import { UsersService } from '../users/users.service';

const DEMO_TITLES = [
  'Honda Dio 2022 Excellent',
  'Yamaha FZ-S Well Maintained',
  'Bajaj Pulsar NS200 Sporty',
  'TVS Apache RTR 160 Clean',
  'Suzuki Access 125 Commuter',
  'Hero Xpulse 200 Adventure',
  'Royal Enfield Classic 350',
  'Honda CB150R Low Mileage',
  'Yamaha R15 V3 Quick Sale',
  'Bajaj CT 100 Economy',
  'TVS Ntorq Fresh Import',
  'Suzuki Gixxer Single Owner',
  'Honda Activa Family Scooter',
  'Yamaha NMAX City Ready',
  'Bajaj Pulsar 150 Reliable',
  'Hero Splendor Daily Runner',
  'RE Hunter 350 Stylish',
  'Honda CBR150R Track Ready',
  'TVS XL100 Workhorse',
  'Suzuki Burgman Comfort',
  'Yamaha FZ-S ABS 2021',
  'Honda Dio Smart Key',
  'Bajaj Pulsar NS200 Full Spec',
  'Royal Enfield Himalayan Tour',
];

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly config: ConfigService,
    @InjectRepository(Listing) private readonly listings: Repository<Listing>,
    @InjectRepository(Brand) private readonly brands: Repository<Brand>,
    @InjectRepository(BikeModel) private readonly models: Repository<BikeModel>,
    @InjectRepository(Category)
    private readonly categories: Repository<Category>,
    @InjectRepository(District)
    private readonly districts: Repository<District>,
    @InjectRepository(City) private readonly cities: Repository<City>,
  ) {}

  async onModuleInit() {
    await this.usersService.ensureRoles();
    await this.bootstrapAdmin();
    await this.seedDemoListingsIfNeeded();
  }

  private async bootstrapAdmin() {
    const email =
      this.config.get<string>('ADMIN_BOOTSTRAP_EMAIL') ??
      'admin@throttlelk.lk';
    const password =
      this.config.get<string>('ADMIN_BOOTSTRAP_PASSWORD') ??
      'ChangeMeAdmin1!';

    const existing = await this.usersService.findByEmail(email);
    if (!existing) {
      await this.usersService.createUser(
        {
          firstName: 'Throttle',
          lastName: 'Admin',
          email,
          password,
        },
        ['admin', 'buyer', 'seller'],
      );
      this.logger.log(`Bootstrapped admin user ${email}`);
    }
  }

  /**
   * Seeds a small active inventory for local / staging when empty.
   * Set SEED_DEMO=false to skip. Never auto-seeds when NODE_ENV=production
   * unless SEED_DEMO=true is explicit.
   */
  private async seedDemoListingsIfNeeded() {
    const force = this.config.get<string>('SEED_DEMO') === 'true';
    const disabled = this.config.get<string>('SEED_DEMO') === 'false';
    const isProd = this.config.get<string>('NODE_ENV') === 'production';
    if (disabled || (isProd && !force)) return;

    const activeCount = await this.listings.count({
      where: { status: 'active' },
    });
    if (activeCount > 0 && !force) return;

    const brands = await this.brands.find({ where: { status: 'active' } });
    const categories = await this.categories.find();
    const districts = await this.districts.find();
    if (!brands.length || !categories.length || !districts.length) {
      this.logger.warn('Taxonomy incomplete — skip demo listings');
      return;
    }

    let seller = await this.usersService.findByEmail('demo@throttlelk.lk');
    if (!seller) {
      seller = await this.usersService.createUser(
        {
          firstName: 'Demo',
          lastName: 'Seller',
          email: 'demo@throttlelk.lk',
          phone: '0770000001',
          password: 'DemoSeller1!',
        },
        ['buyer', 'seller'],
      );
      this.logger.log('Bootstrapped demo seller demo@throttlelk.lk');
    }

    const created: Listing[] = [];
    for (let i = 0; i < DEMO_TITLES.length; i++) {
      const title = DEMO_TITLES[i]!;
      const brand = brands[i % brands.length]!;
      const brandModels = await this.models.find({
        where: { brandId: brand.id, status: 'active' },
      });
      const model = brandModels[i % Math.max(brandModels.length, 1)];
      if (!model) continue;
      const category =
        categories.find((c) => c.id === model.categoryId) ?? categories[0]!;
      const district = districts[i % districts.length]!;
      const cities = await this.cities.find({
        where: { districtId: district.id },
      });
      const city = cities[0];
      if (!city) continue;

      const year = 2018 + (i % 7);
      const priceLkr = 185000 + i * 17500;
      const slug = `${slugify(title)}-${Date.now().toString(36)}-${i}`;
      created.push(
        this.listings.create({
          sellerId: seller.id,
          dealerId: null,
          brandId: brand.id,
          modelId: model.id,
          categoryId: category.id,
          districtId: district.id,
          cityId: city.id,
          title,
          slug,
          description: `${title} listed on ThrottleLK for demo. Well kept, papers clear, Colombo inspection welcome. Contact via listing for details.`,
          priceLkr,
          negotiable: true,
          manufactureYear: year,
          registrationYear: year,
          engineCc: 100 + (i % 10) * 15,
          mileage: 5000 + i * 1200,
          fuelType: 'petrol',
          transmission: i % 3 === 0 ? 'automatic' : 'manual',
          condition: 'used',
          colour: i % 2 === 0 ? 'Black' : 'Red',
          phone: '0770000001',
          whatsapp: '0770000001',
          status: 'active',
          publishedAt: new Date(),
        }),
      );
    }

    if (created.length) {
      await this.listings.save(created);
      this.logger.log(`Seeded ${created.length} demo active listings`);
    }
  }
}
