import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { IsNull, Not, Repository } from 'typeorm';
import type {
  CreateInventoryItemInput,
  InventoryDocumentType,
  MarkSoldInput,
  UpdateInventoryItemInput,
} from '@throttlelk/validation';
import { StorageService } from '../storage/storage.service';
import { Listing } from '../listings/listing.entity';
import { User } from '../users/user.entity';
import { DealerInventoryItem } from './dealer-inventory-item.entity';
import {
  InventoryDocument,
  type InventoryDocumentType as DocType,
} from './inventory-document.entity';
import { DealersService } from './dealers.service';

const DOC_TYPES: DocType[] = ['insurance', 'revenue_license', 'ownership_cr'];
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);
const MAX_BYTES = 8 * 1024 * 1024;
const EXPIRING_SOON_DAYS = 30;

export type DocExpiryStatus = 'missing' | 'ok' | 'expiring_soon' | 'expired';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(DealerInventoryItem)
    private readonly items: Repository<DealerInventoryItem>,
    @InjectRepository(InventoryDocument)
    private readonly documents: Repository<InventoryDocument>,
    @InjectRepository(Listing)
    private readonly listings: Repository<Listing>,
    private readonly dealersService: DealersService,
    private readonly storage: StorageService,
  ) {}

  async listMine(owner: User) {
    const dealer = await this.requireActiveDealer(owner.id);
    await this.backfillFromListings(dealer.id, owner.id);

    const rows = await this.items.find({
      where: { dealerId: dealer.id },
      relations: ['documents', 'listing', 'listing.brand', 'listing.model'],
      order: { updatedAt: 'DESC' },
    });
    return rows.map((row) => this.toDto(row));
  }

  async create(owner: User, input: CreateInventoryItemInput) {
    const dealer = await this.requireActiveDealer(owner.id);
    const item = this.items.create({
      dealerId: dealer.id,
      ownerUserId: owner.id,
      title: input.title.trim(),
      brandName: input.brandName?.trim() || null,
      modelName: input.modelName?.trim() || null,
      manufactureYear: input.manufactureYear ?? null,
      purchaseDate: input.purchaseDate ?? null,
      costPriceLkr: input.costPriceLkr ?? null,
      askingPriceLkr: input.askingPriceLkr ?? null,
      soldPriceLkr: null,
      soldAt: null,
      listingId: null,
    });
    const saved = await this.items.save(item);
    return this.toDto(await this.reload(saved.id));
  }

  async update(owner: User, id: string, input: UpdateInventoryItemInput) {
    const item = await this.getOwnedItem(owner.id, id);
    if (input.title !== undefined) item.title = input.title.trim();
    if (input.brandName !== undefined)
      item.brandName = input.brandName?.trim() || null;
    if (input.modelName !== undefined)
      item.modelName = input.modelName?.trim() || null;
    if (input.manufactureYear !== undefined)
      item.manufactureYear = input.manufactureYear ?? null;
    if (input.purchaseDate !== undefined)
      item.purchaseDate = input.purchaseDate ?? null;
    if (input.costPriceLkr !== undefined)
      item.costPriceLkr = input.costPriceLkr ?? null;
    if (input.askingPriceLkr !== undefined)
      item.askingPriceLkr = input.askingPriceLkr ?? null;
    await this.items.save(item);
    return this.toDto(await this.reload(id));
  }

  async markSold(owner: User, id: string, input: MarkSoldInput) {
    const item = await this.getOwnedItem(owner.id, id);
    item.soldPriceLkr = input.soldPriceLkr;
    item.soldAt = input.soldAt
      ? new Date(`${input.soldAt}T12:00:00.000Z`)
      : new Date();
    await this.items.save(item);

    if (item.listingId) {
      const listing = await this.listings.findOne({
        where: { id: item.listingId },
      });
      if (listing && ['active', 'paused'].includes(listing.status)) {
        listing.status = 'sold';
        listing.soldAt = item.soldAt;
        listing.soldPriceLkr = input.soldPriceLkr;
        await this.listings.save(listing);
      }
    }

    return this.toDto(await this.reload(id));
  }

  async upsertFromListing(listing: Listing, ownerUserId: string) {
    if (!listing.dealerId) return;
    const existing = await this.items.findOne({
      where: { listingId: listing.id },
    });
    const title =
      listing.title?.trim() ||
      [listing.brand?.name, listing.model?.name, listing.manufactureYear]
        .filter(Boolean)
        .join(' ') ||
      'Listing';

    if (existing) {
      existing.title = title;
      existing.askingPriceLkr = listing.priceLkr;
      if (listing.brand?.name) existing.brandName = listing.brand.name;
      if (listing.model?.name) existing.modelName = listing.model.name;
      if (listing.manufactureYear)
        existing.manufactureYear = listing.manufactureYear;
      if (listing.costPriceLkr != null && existing.costPriceLkr == null) {
        existing.costPriceLkr = listing.costPriceLkr;
      }
      if (listing.purchaseDate && !existing.purchaseDate) {
        existing.purchaseDate = listing.purchaseDate;
      }
      if (listing.status === 'sold') {
        existing.soldAt = listing.soldAt ?? existing.soldAt ?? new Date();
        existing.soldPriceLkr =
          listing.soldPriceLkr ?? existing.soldPriceLkr ?? listing.priceLkr;
      }
      await this.items.save(existing);
      return;
    }

    await this.items.save(
      this.items.create({
        dealerId: listing.dealerId,
        ownerUserId,
        title,
        brandName: listing.brand?.name ?? null,
        modelName: listing.model?.name ?? null,
        manufactureYear: listing.manufactureYear ?? null,
        purchaseDate: listing.purchaseDate ?? null,
        costPriceLkr: listing.costPriceLkr ?? null,
        askingPriceLkr: listing.priceLkr,
        soldPriceLkr: listing.soldPriceLkr ?? null,
        soldAt: listing.soldAt ?? null,
        listingId: listing.id,
      }),
    );
  }

  async uploadDocument(
    owner: User,
    id: string,
    type: InventoryDocumentType,
    file?: Express.Multer.File,
    expiresAt?: string | null,
  ) {
    const item = await this.getOwnedItem(owner.id, id);
    if (!file) {
      throw new BadRequestException({
        success: false,
        error: { code: 'FILE_REQUIRED', message: 'Document file is required' },
      });
    }
    if (!ALLOWED_MIME.has(file.mimetype)) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'INVALID_TYPE',
          message: 'Only JPEG, PNG, WebP, or PDF files are allowed',
        },
      });
    }
    if (file.size > MAX_BYTES) {
      throw new BadRequestException({
        success: false,
        error: { code: 'FILE_TOO_LARGE', message: 'Max file size is 8MB' },
      });
    }

    const needsExpiry = type === 'insurance' || type === 'revenue_license';
    if (needsExpiry) {
      if (!expiresAt || !/^\d{4}-\d{2}-\d{2}$/.test(expiresAt)) {
        throw new BadRequestException({
          success: false,
          error: {
            code: 'EXPIRES_REQUIRED',
            message: 'expiresAt (YYYY-MM-DD) is required for this document type',
          },
        });
      }
    }

    const ext =
      file.mimetype === 'application/pdf'
        ? 'pdf'
        : file.mimetype === 'image/png'
          ? 'png'
          : file.mimetype === 'image/webp'
            ? 'webp'
            : 'jpg';
    const storageKey = `inventory/${item.id}/${type}-${randomUUID()}.${ext}`;
    const stored = await this.storage.putObject(
      storageKey,
      file.buffer,
      file.mimetype,
    );

    let doc = await this.documents.findOne({
      where: { inventoryItemId: item.id, type },
    });
    if (doc) {
      try {
        await this.storage.deleteObject(doc.storageKey);
      } catch {
        // best-effort cleanup
      }
      doc.fileUrl = stored.publicUrl;
      doc.storageKey = stored.storageKey;
      doc.fileName = file.originalname || `${type}.${ext}`;
      doc.mimeType = file.mimetype;
      doc.expiresAt = needsExpiry ? expiresAt! : null;
    } else {
      doc = this.documents.create({
        inventoryItemId: item.id,
        type,
        fileUrl: stored.publicUrl,
        storageKey: stored.storageKey,
        fileName: file.originalname || `${type}.${ext}`,
        mimeType: file.mimetype,
        expiresAt: needsExpiry ? expiresAt! : null,
      });
    }
    await this.documents.save(doc);
    return this.toDto(await this.reload(id));
  }

  async deleteDocument(
    owner: User,
    id: string,
    type: InventoryDocumentType,
  ) {
    const item = await this.getOwnedItem(owner.id, id);
    const doc = await this.documents.findOne({
      where: { inventoryItemId: item.id, type },
    });
    if (!doc) {
      throw new NotFoundException({
        success: false,
        error: { code: 'DOCUMENT_NOT_FOUND', message: 'Document not found' },
      });
    }
    try {
      await this.storage.deleteObject(doc.storageKey);
    } catch {
      // best-effort
    }
    await this.documents.remove(doc);
    return this.toDto(await this.reload(id));
  }

  private async backfillFromListings(dealerId: string, ownerUserId: string) {
    const linked = await this.items.find({
      where: { dealerId, listingId: Not(IsNull()) },
      select: ['listingId'],
    });
    const linkedIds = new Set(
      linked.map((r) => r.listingId).filter((id): id is string => Boolean(id)),
    );
    const listings = await this.listings.find({
      where: { dealerId },
      relations: ['brand', 'model'],
    });
    for (const listing of listings) {
      if (linkedIds.has(listing.id)) continue;
      await this.upsertFromListing(listing, ownerUserId);
    }
  }

  private async requireActiveDealer(ownerUserId: string) {
    const dealer = await this.dealersService.findActiveOwned(ownerUserId);
    if (!dealer) {
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'DEALER_REQUIRED',
          message: 'Active dealer account required',
        },
      });
    }
    return dealer;
  }

  private async getOwnedItem(ownerUserId: string, id: string) {
    const item = await this.items.findOne({ where: { id } });
    if (!item || item.ownerUserId !== ownerUserId) {
      throw new NotFoundException({
        success: false,
        error: { code: 'INVENTORY_NOT_FOUND', message: 'Inventory item not found' },
      });
    }
    return item;
  }

  private async reload(id: string) {
    const row = await this.items.findOne({
      where: { id },
      relations: ['documents', 'listing', 'listing.brand', 'listing.model'],
    });
    if (!row) {
      throw new NotFoundException({
        success: false,
        error: { code: 'INVENTORY_NOT_FOUND', message: 'Inventory item not found' },
      });
    }
    return row;
  }

  private daysInStock(item: DealerInventoryItem, asOf = new Date()): number {
    const start = item.purchaseDate
      ? new Date(item.purchaseDate)
      : item.createdAt;
    if (!start || Number.isNaN(start.getTime())) return 0;
    const end = item.soldAt ?? asOf;
    return Math.max(
      0,
      Math.floor((end.getTime() - start.getTime()) / 86_400_000),
    );
  }

  private marginFields(item: DealerInventoryItem, asking: number | null) {
    if (item.costPriceLkr == null) {
      return { marginLkr: null as number | null, marginPercent: null as number | null };
    }
    const sell =
      item.soldPriceLkr != null ? item.soldPriceLkr : asking ?? null;
    if (sell == null) {
      return { marginLkr: null, marginPercent: null };
    }
    const marginLkr = sell - item.costPriceLkr;
    const marginPercent =
      item.costPriceLkr > 0
        ? Math.round((marginLkr / item.costPriceLkr) * 1000) / 10
        : null;
    return { marginLkr, marginPercent };
  }

  private expiryStatus(expiresAt: string | null | undefined): DocExpiryStatus {
    if (!expiresAt) return 'ok';
    const end = new Date(`${expiresAt}T23:59:59.000Z`);
    const now = new Date();
    if (end.getTime() < now.getTime()) return 'expired';
    const soon = new Date();
    soon.setUTCDate(soon.getUTCDate() + EXPIRING_SOON_DAYS);
    if (end.getTime() <= soon.getTime()) return 'expiring_soon';
    return 'ok';
  }

  private toDto(item: DealerInventoryItem) {
    const listing = item.listing ?? null;
    const asking =
      listing?.priceLkr ?? item.askingPriceLkr ?? null;
    const status: string = listing
      ? listing.status
      : item.soldAt
        ? 'sold'
        : 'in_stock';

    const docsByType = new Map(
      (item.documents ?? []).map((d) => [d.type, d] as const),
    );
    const documents = DOC_TYPES.map((type) => {
      const doc = docsByType.get(type);
      if (!doc) {
        return {
          type,
          present: false as const,
          status: 'missing' as DocExpiryStatus,
          fileUrl: null,
          fileName: null,
          expiresAt: null,
        };
      }
      const status =
        type === 'ownership_cr' ? ('ok' as const) : this.expiryStatus(doc.expiresAt);
      return {
        type,
        present: true as const,
        status,
        fileUrl: doc.fileUrl,
        fileName: doc.fileName,
        expiresAt: doc.expiresAt,
      };
    });

    const worstDoc = documents.reduce<DocExpiryStatus>((acc, d) => {
      if (d.status === 'expired') return 'expired';
      if (d.status === 'expiring_soon' && acc !== 'expired') return 'expiring_soon';
      if (d.status === 'missing' && acc === 'ok') return 'missing';
      return acc;
    }, 'ok');

    return {
      id: item.id,
      title: item.title,
      brandName: item.brandName ?? listing?.brand?.name ?? null,
      modelName: item.modelName ?? listing?.model?.name ?? null,
      manufactureYear:
        item.manufactureYear ?? listing?.manufactureYear ?? null,
      purchaseDate: item.purchaseDate,
      costPriceLkr: item.costPriceLkr,
      askingPriceLkr: asking,
      soldPriceLkr: item.soldPriceLkr,
      soldAt: item.soldAt?.toISOString() ?? null,
      listingId: item.listingId,
      listingSlug: listing?.slug ?? null,
      status,
      daysInStock: this.daysInStock(item),
      ...this.marginFields(item, asking),
      documents,
      documentAlert: worstDoc,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }
}
