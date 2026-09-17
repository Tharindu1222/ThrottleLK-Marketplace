import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { District } from '../taxonomy/district.entity';
import { City } from '../taxonomy/city.entity';
import { DealerImage } from './dealer-image.entity';

@Entity('dealers')
@Index('IDX_dealers_status_name', ['status', 'name'])
@Index('IDX_dealers_owner_user_id', ['ownerUserId'])
export class Dealer {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'owner_user_id' })
  ownerUserId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'owner_user_id' })
  owner!: User;

  @Column({ length: 120 })
  name!: string;

  @Column({ unique: true, length: 140 })
  slug!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ length: 20 })
  phone!: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  whatsapp!: string | null;

  @Column({ type: 'varchar', nullable: true })
  email!: string | null;

  @Column({ type: 'varchar', nullable: true })
  website!: string | null;

  @Column({ type: 'varchar', length: 300, nullable: true })
  address!: string | null;

  @Column({ name: 'district_id' })
  districtId!: string;

  @ManyToOne(() => District)
  @JoinColumn({ name: 'district_id' })
  district!: District;

  @Column({ name: 'city_id' })
  cityId!: string;

  @ManyToOne(() => City)
  @JoinColumn({ name: 'city_id' })
  city!: City;

  @Column({ length: 40, default: 'pending' })
  status!: 'pending' | 'active' | 'rejected' | 'suspended';

  @Column({ name: 'verified_at', type: 'timestamptz', nullable: true })
  verifiedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => DealerImage, (image) => image.dealer)
  images!: DealerImage[];
}
