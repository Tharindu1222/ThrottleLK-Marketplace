import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { District } from './district.entity';

@Entity('cities')
@Index('IDX_cities_district_id', ['districtId'])
export class City {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'district_id' })
  districtId!: string;

  @ManyToOne(() => District, (district) => district.cities, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'district_id' })
  district!: District;

  @Column({ length: 80 })
  name!: string;

  @Column({ length: 120 })
  slug!: string;
}
