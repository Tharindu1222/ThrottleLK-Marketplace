import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type {
  CreateSavedSearchInput,
  UpdateSavedSearchInput,
} from '@throttlelk/validation';
import { Repository } from 'typeorm';
import { NotificationsService } from '../notifications/notifications.service';
import { SavedSearch } from './saved-search.entity';
import {
  savedSearchMatchesListing,
  type SavedSearchMatchListing,
} from './saved-search-match';

@Injectable()
export class SavedSearchesService {
  constructor(
    @InjectRepository(SavedSearch)
    private readonly savedSearches: Repository<SavedSearch>,
    private readonly notifications: NotificationsService,
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

  async notifyMatches(
    listing: SavedSearchMatchListing & {
      id: string;
      slug: string;
      sellerId: string;
    },
  ) {
    const pageSize = 200;
    let skip = 0;
    for (;;) {
      const rows = await this.savedSearches.find({
        where: { notificationsEnabled: true },
        order: { id: 'ASC' },
        take: pageSize,
        skip,
      });
      if (rows.length === 0) break;
      for (const row of rows) {
        if (row.userId === listing.sellerId) continue;
        if (!savedSearchMatchesListing(row.query, listing)) continue;
        await this.notifications.savedSearchMatch(row.userId, {
          id: listing.id,
          title: listing.title,
          slug: listing.slug,
          searchName: row.name,
        });
      }
      if (rows.length < pageSize) break;
      skip += pageSize;
    }
  }
}
