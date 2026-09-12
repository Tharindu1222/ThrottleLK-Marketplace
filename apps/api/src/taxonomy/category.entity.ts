import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 80 })
  name!: string;

  @Column({ unique: true, length: 100 })
  slug!: string;

  @Column({ name: 'cover_storage_key', type: 'varchar', length: 500, nullable: true })
  coverStorageKey!: string | null;

  @Column({ name: 'cover_image_url', type: 'varchar', length: 1000, nullable: true })
  coverImageUrl!: string | null;
}
