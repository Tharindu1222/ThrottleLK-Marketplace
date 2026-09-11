import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type {
  CreateSavedSearchInput,
  UpdateSavedSearchInput,
} from '@throttlelk/validation';
import { Repository } from 'typeorm';
import { SavedSearch } from './saved-search.entity';

@Injectable()
export class SavedSearchesService {
  constructor(
    @InjectRepository(SavedSearch)
    private readonly savedSearches: Repository<SavedSearch>,
  ) {}

  list(userId: string) {
    return this.savedSearches.find({
      where: { userId },
      order: { updatedAt: 'DESC' },
    });
  }

  async create(userId: string, input: CreateSavedSearchInput) {
    const row = this.savedSearches.create({
      userId,
      name: input.name,
      query: input.query,
      notificationsEnabled: input.notificationsEnabled ?? false,
    });
    return this.savedSearches.save(row);
  }

  async update(userId: string, id: string, input: UpdateSavedSearchInput) {
    const row = await this.getOwned(userId, id);
    if (input.name != null) row.name = input.name;
    if (input.query != null) row.query = input.query;
    if (input.notificationsEnabled != null) {
      row.notificationsEnabled = input.notificationsEnabled;
    }
    return this.savedSearches.save(row);
  }

  async remove(userId: string, id: string) {
    const row = await this.getOwned(userId, id);
    await this.savedSearches.remove(row);
    return { id };
  }

  private async getOwned(userId: string, id: string) {
    const row = await this.savedSearches.findOne({ where: { id, userId } });
    if (!row) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'SAVED_SEARCH_NOT_FOUND',
          message: 'Saved search not found',
        },
      });
    }
    return row;
  }
}
