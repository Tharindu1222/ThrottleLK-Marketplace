import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type {
  CreatePartCategoryInput,
  UpdatePartCategoryInput,
} from '@throttlelk/validation';
import { Repository } from 'typeorm';
import { slugify } from '../common/slugify';
import { PartCategory } from './part-category.entity';
import { PartListing } from './part-listing.entity';

export type PartCategoryDto = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  parentName: string | null;
};

@Injectable()
export class PartCategoriesService {
  constructor(
    @InjectRepository(PartCategory)
    private readonly categories: Repository<PartCategory>,
    @InjectRepository(PartListing)
    private readonly partListings: Repository<PartListing>,
  ) {}

  async listAll(): Promise<PartCategoryDto[]> {
    const rows = await this.categories.find({ order: { name: 'ASC' } });
    return this.toDtos(rows);
  }

  /** Leaf categories only (for listing / filter dropdowns). */
  async listPublic(): Promise<PartCategoryDto[]> {
    const rows = await this.categories.find({ order: { name: 'ASC' } });
    const parentIds = new Set(
      rows.map((r) => r.parentId).filter((id): id is string => Boolean(id)),
    );
    const leaves = rows.filter((r) => !parentIds.has(r.id));
    return this.toDtos(leaves, rows);
  }

  adminCreate(input: CreatePartCategoryInput) {
    return this.create(input);
  }

  adminUpdate(id: string, input: UpdatePartCategoryInput) {
    return this.update(id, input);
  }

  adminDelete(id: string) {
    return this.remove(id);
  }

  async create(input: CreatePartCategoryInput) {
    const parentId = input.parentId ?? null;
    if (parentId) await this.getById(parentId);
    const slugBase = parentId
      ? slugify(
          `${(await this.getById(parentId)).name}-${input.name}`,
        )
      : slugify(input.name);
    const slug = await this.allocateUniqueSlug(slugBase || input.name);
    return this.categories.save(
      this.categories.create({
        name: input.name,
        slug,
        parentId,
      }),
    );
  }

  async update(id: string, input: UpdatePartCategoryInput) {
    const category = await this.getById(id);
    if (input.parentId !== undefined) {
      if (input.parentId === id) {
        throw new BadRequestException({
          success: false,
          error: {
            code: 'INVALID_PARENT',
            message: 'Category cannot be its own parent',
          },
        });
      }
      if (input.parentId) await this.getById(input.parentId);
      category.parentId = input.parentId;
    }
    if (input.name) {
      category.name = input.name;
      const slugBase = category.parentId
        ? slugify(
            `${(await this.getById(category.parentId)).name}-${input.name}`,
          )
        : slugify(input.name);
      category.slug = await this.allocateUniqueSlug(
        slugBase || input.name,
        category.id,
      );
    }
    return this.categories.save(category);
  }

  async remove(id: string) {
    const category = await this.getById(id);
    const childCount = await this.categories.count({
      where: { parentId: id },
    });
    if (childCount > 0) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'CATEGORY_HAS_CHILDREN',
          message: 'Delete subcategories first',
        },
      });
    }
    const inUse = await this.partListings.count({
      where: { categoryId: id },
    });
    if (inUse > 0) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'CATEGORY_IN_USE',
          message: 'Cannot delete a category that has part listings',
        },
      });
    }
    await this.categories.remove(category);
    return { id, deleted: true as const };
  }

  async getById(id: string) {
    const category = await this.categories.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'PART_CATEGORY_NOT_FOUND',
          message: 'Part category not found',
        },
      });
    }
    return category;
  }

  private async allocateUniqueSlug(nameOrSlug: string, excludeId?: string) {
    const base = slugify(nameOrSlug) || 'part-category';
    let candidate = base;
    let n = 1;
    for (;;) {
      const existing = await this.categories.findOne({
        where: { slug: candidate },
        select: ['id'],
      });
      if (!existing || existing.id === excludeId) return candidate;
      n += 1;
      candidate = `${base}-${n}`;
    }
  }

  async assertExists(id: string) {
    const category = await this.categories.findOne({
      where: { id },
      select: ['id', 'parentId'],
    });
    if (!category) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'PART_CATEGORY_NOT_FOUND',
          message: 'Part category not found',
        },
      });
    }
    const childCount = await this.categories.count({
      where: { parentId: id },
    });
    if (childCount > 0) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'PART_CATEGORY_NOT_LEAF',
          message: 'Select a subcategory, not a parent category',
        },
      });
    }
  }

  private toDtos(
    rows: PartCategory[],
    all?: PartCategory[],
  ): PartCategoryDto[] {
    const lookup = all ?? rows;
    const byId = new Map(lookup.map((r) => [r.id, r]));
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      parentId: r.parentId ?? null,
      parentName: r.parentId ? (byId.get(r.parentId)?.name ?? null) : null,
    }));
  }
}
