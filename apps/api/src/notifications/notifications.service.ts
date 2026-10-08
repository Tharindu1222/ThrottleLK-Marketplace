import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository, type EntityManager } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { paginationMeta, parsePageLimit } from '../common/pagination';
import { UsersService } from '../users/users.service';
import { EmailService } from './email.service';
import { Notification } from './notification.entity';
import { escapeHtml } from '../common/html-escape';
import { User } from '../users/user.entity';
import { NotificationEmail } from './notification-email.entity';
import { notificationChannels } from './notification-policy';

export type NotificationInput = {
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  emailSubject?: string;
  emailHtml?: string;
  eventKey?: string;
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notifications: Repository<Notification>,
    private readonly users: UsersService,
    private readonly email: EmailService,
  ) {}

  async listForUser(
    userId: string,
    paging?: {
      page?: string | number;
      limit?: string | number;
      unread?: string;
    },
  ) {
    const { page, limit, skip } = parsePageLimit({
      page: paging?.page,
      limit: paging?.limit,
      defaultLimit: 20,
      maxLimit: 100,
    });
    const [rows, total] = await this.notifications.findAndCount({
      where: {
        userId,
        inAppEnabled: true,
        ...(paging?.unread === '1' ? { readAt: IsNull() } : {}),
      },
      order: { createdAt: 'DESC', id: 'DESC' },
      skip,
      take: limit,
    });
    return { items: rows, meta: paginationMeta(total, page, limit) };
  }

  async unreadCount(userId: string) {
    return this.notifications.count({
      where: { userId, inAppEnabled: true, readAt: IsNull() },
    });
  }

  async markRead(userId: string, id: string) {
    const row = await this.notifications.findOne({
      where: { id, userId, inAppEnabled: true },
    });
    if (!row) return null;
    if (!row.readAt) {
      row.readAt = new Date();
      await this.notifications.save(row);
    }
    return row;
  }

  async markAllRead(userId: string) {
    await this.notifications
      .createQueryBuilder()
      .update(Notification)
      .set({ readAt: () => 'NOW()' })
      .where('user_id = :userId', { userId })
      .andWhere('read_at IS NULL')
      .andWhere('in_app_enabled = true')
      .execute();
    return { ok: true };
  }

  async notifyUser(input: NotificationInput, manager?: EntityManager) {
    const id = randomUUID();
    const eventKey = input.eventKey ?? id;
    const persist = async (transaction: EntityManager) => {
      const user = manager
        ? await transaction
            .getRepository(User)
            .findOne({ where: { id: input.userId } })
        : await this.users.findByIdOrThrow(input.userId);
      if (!user) throw new Error('Notification recipient not found');
      const channels = notificationChannels(
        input.type,
        user.notificationPreferences,
      );
      const active = !user.status || user.status === 'active';
      const repo = transaction.getRepository(Notification);
      await repo
        .createQueryBuilder()
        .insert()
        .into(Notification)
        .values({
          id,
          eventKey,
          userId: input.userId,
          type: input.type,
          title: input.title,
          message: input.message,
          dataJson: () => 'CAST(:notificationData AS jsonb)',
          inAppEnabled: active && channels.inApp,
        })
        .setParameter('notificationData', JSON.stringify(input.data ?? null))
        .orIgnore()
        .execute();
      const row = await repo.findOneByOrFail({ eventKey });
      if (row.id !== id) return row; // A retry must not enqueue another email.
      if (active && channels.email) {
        const deliveries = transaction.getRepository(NotificationEmail);
        await deliveries.save(
          deliveries.create({
            notificationId: id,
            userId: input.userId,
            type: input.type,
            recipient: user.email,
            sender: this.email.sender(),
            subject: input.emailSubject ?? input.title,
            html: input.emailHtml ?? `<p>${escapeHtml(input.message)}</p>`,
          }),
        );
      }
      return row;
    };
    // An explicit transaction belongs to the business operation; let failures roll it back.
    if (manager) return persist(manager);
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.notifications.manager.transaction(persist);
      } catch (error) {
        if (attempt >= 2) throw error;
        this.logger.warn(
          `Retrying notification persistence type=${input.type}`,
        );
        await new Promise((resolve) => setTimeout(resolve, 100 * 2 ** attempt));
      }
    }
  }

  async listingApproved(
    sellerId: string,
    listing: { id: string; title: string; slug: string },
  ) {
    return this.notifyUser({
      userId: sellerId,
      type: 'listing_approved',
      title: 'Listing approved',
      message: `"${listing.title}" is now live on ThrottleLK.`,
      data: { listingId: listing.id, slug: listing.slug },
      emailSubject: 'Your ThrottleLK listing is live',
      emailHtml: `<p>Your listing <strong>${escapeHtml(listing.title)}</strong> was approved and is now public.</p>`,
    });
  }

  async listingInquiry(
    sellerId: string,
    listing: { id: string; title: string; slug: string },
    buyer: { name: string; phone: string; email?: string | null },
  ) {
    const contact = [buyer.phone, buyer.email].filter(Boolean).join(' · ');
    const who = contact ? `${buyer.name} (${contact})` : buyer.name;
    return this.notifyUser({
      userId: sellerId,
      type: 'listing_inquiry',
      title: 'New listing enquiry',
      message: `${who} sent a message about "${listing.title}".`,
      data: {
        listingId: listing.id,
        slug: listing.slug,
        buyerPhone: buyer.phone,
        buyerEmail: buyer.email ?? null,
      },
      emailSubject: 'New ThrottleLK listing enquiry',
      emailHtml: `<p>${escapeHtml(who)} asked about <strong>${escapeHtml(listing.title)}</strong>.</p>`,
    });
  }

  async listingRejected(
    sellerId: string,
    listing: { id: string; title: string; slug?: string },
    reason: string,
  ) {
    return this.notifyUser({
      userId: sellerId,
      type: 'listing_rejected',
      title: 'Listing needs changes',
      message: `"${listing.title}" was rejected: ${reason}`,
      data: { listingId: listing.id, slug: listing.slug, reason },
      emailSubject: 'ThrottleLK listing rejected',
      emailHtml: `<p>Your listing <strong>${escapeHtml(listing.title)}</strong> was rejected.</p><p>Reason: ${escapeHtml(reason)}</p>`,
    });
  }

  async listingWarning(
    sellerId: string,
    listing: { id: string; title: string; slug: string },
    message: string,
  ) {
    return this.notifyUser({
      userId: sellerId,
      type: 'listing_warning',
      title: 'Listing warning',
      message: `"${listing.title}": ${message}`,
      data: { listingId: listing.id, slug: listing.slug, reason: message },
      emailSubject: 'ThrottleLK listing warning',
      emailHtml: `<p>We received a report about your listing <strong>${escapeHtml(listing.title)}</strong>.</p><p>${escapeHtml(message)}</p><p>Please review and fix any issues. Further violations may lead to removal.</p>`,
    });
  }

  async partListingWarning(
    userId: string,
    listing: { id: string; title: string; slug: string; kind: string },
    reason: string,
  ) {
    return this.notifyUser({
      userId,
      type: 'part_listing_warning',
      title: 'Part listing warning',
      message: `"${listing.title}": ${reason}`,
      data: {
        partListingId: listing.id,
        slug: listing.slug,
        kind: listing.kind,
        reason,
      },
      emailHtml: `<p>Please review <strong>${escapeHtml(listing.title)}</strong>.</p><p>${escapeHtml(reason)}</p>`,
    });
  }

  async dealerApproved(
    ownerUserId: string,
    dealer: { id: string; name: string; slug: string },
  ) {
    return this.notifyUser({
      userId: ownerUserId,
      type: 'dealer_approved',
      title: 'Dealer profile approved',
      message: `"${dealer.name}" is approved. You can attach listings to your showroom.`,
      data: { dealerId: dealer.id, slug: dealer.slug },
      emailSubject: 'Your ThrottleLK dealer profile is approved',
      emailHtml: `<p>Your dealer profile <strong>${escapeHtml(dealer.name)}</strong> is now active.</p>`,
    });
  }

  async dealerRejected(
    ownerUserId: string,
    dealer: { id: string; name: string; reason: string },
  ) {
    return this.notifyUser({
      userId: ownerUserId,
      type: 'dealer_rejected',
      title: 'Dealer application rejected',
      message: `"${dealer.name}" was rejected: ${dealer.reason}`,
      data: { dealerId: dealer.id, reason: dealer.reason },
      emailSubject: 'ThrottleLK dealer application rejected',
      emailHtml: `<p>Your dealer application <strong>${escapeHtml(dealer.name)}</strong> was rejected.</p><p>Reason: ${escapeHtml(dealer.reason)}</p>`,
    });
  }

  async partsDealerApproved(
    ownerUserId: string,
    dealer: { id: string; name: string; slug: string },
  ) {
    return this.notifyUser({
      userId: ownerUserId,
      type: 'parts_dealer_approved',
      title: 'Parts shop approved',
      message: `"${dealer.name}" is approved. You can list spare and modified parts.`,
      data: { partsDealerId: dealer.id, slug: dealer.slug },
      emailSubject: 'Your ThrottleLK parts shop is approved',
      emailHtml: `<p>Your parts shop <strong>${escapeHtml(dealer.name)}</strong> is now active.</p>`,
    });
  }

  async partsDealerRejected(
    ownerUserId: string,
    dealer: { id: string; name: string; reason: string },
  ) {
    return this.notifyUser({
      userId: ownerUserId,
      type: 'parts_dealer_rejected',
      title: 'Parts shop application rejected',
      message: `"${dealer.name}" was rejected: ${dealer.reason}`,
      data: { partsDealerId: dealer.id, reason: dealer.reason },
      emailSubject: 'ThrottleLK parts shop application rejected',
      emailHtml: `<p>Your parts shop application <strong>${escapeHtml(dealer.name)}</strong> was rejected.</p><p>Reason: ${escapeHtml(dealer.reason)}</p>`,
    });
  }

  async newMessage(
    userId: string,
    input: {
      conversationId: string;
      listingTitle: string;
      preview: string;
      fromBuyer: boolean;
    },
  ) {
    const who = input.fromBuyer ? 'buyer' : 'seller';
    return this.notifyUser({
      userId,
      type: 'new_message',
      title: `New message from ${who}`,
      message: `${input.listingTitle}: ${input.preview.slice(0, 120)}`,
      data: { conversationId: input.conversationId },
      emailSubject: `New ThrottleLK message — ${input.listingTitle}`,
      emailHtml: `<p>You have a new message about <strong>${escapeHtml(input.listingTitle)}</strong>.</p><p>${escapeHtml(input.preview)}</p>`,
    });
  }

  async listingPendingReview(listing: {
    id: string;
    title: string;
    slug: string;
  }) {
    const adminIds = await this.users.findActiveAdminIds();
    await Promise.all(
      adminIds.map((userId) =>
        this.notifyUser({
          userId,
          type: 'listing_pending_review',
          title: 'Listing pending review',
          message: `"${listing.title}" is waiting for approval.`,
          data: { listingId: listing.id, slug: listing.slug },
          emailSubject: `ThrottleLK: listing pending review — ${listing.title}`,
          emailHtml: `<p>A listing <strong>${escapeHtml(listing.title)}</strong> was submitted and is waiting for admin review.</p>`,
        }),
      ),
    );
  }

  async dealerPendingReview(dealer: {
    id: string;
    name: string;
    slug: string;
  }) {
    const adminIds = await this.users.findActiveAdminIds();
    await Promise.all(
      adminIds.map((userId) =>
        this.notifyUser({
          userId,
          type: 'dealer_pending_review',
          title: 'Dealer application pending',
          message: `"${dealer.name}" applied as a bike dealer.`,
          data: { dealerId: dealer.id, slug: dealer.slug },
          emailSubject: `ThrottleLK: dealer application — ${dealer.name}`,
          emailHtml: `<p>A dealer application for <strong>${escapeHtml(dealer.name)}</strong> is waiting for review.</p>`,
        }),
      ),
    );
  }

  async partsDealerPendingReview(dealer: {
    id: string;
    name: string;
    slug: string;
  }) {
    const adminIds = await this.users.findActiveAdminIds();
    await Promise.all(
      adminIds.map((userId) =>
        this.notifyUser({
          userId,
          type: 'parts_dealer_pending_review',
          title: 'Parts dealer application pending',
          message: `"${dealer.name}" applied as a parts dealer.`,
          data: { partsDealerId: dealer.id, slug: dealer.slug },
          emailSubject: `ThrottleLK: parts dealer application — ${dealer.name}`,
          emailHtml: `<p>A parts dealer application for <strong>${escapeHtml(dealer.name)}</strong> is waiting for review.</p>`,
        }),
      ),
    );
  }

  async partListingApproved(
    ownerUserId: string,
    listing: { id: string; title: string; slug: string; kind: string },
  ) {
    return this.notifyUser({
      userId: ownerUserId,
      type: 'part_listing_approved',
      title: 'Part listing approved',
      message: `"${listing.title}" is now live on ThrottleLK.`,
      data: {
        partListingId: listing.id,
        slug: listing.slug,
        kind: listing.kind,
      },
      emailSubject: 'Your ThrottleLK part listing is live',
      emailHtml: `<p>Your part listing <strong>${escapeHtml(listing.title)}</strong> was approved and is now public.</p>`,
    });
  }

  async partListingExpired(
    ownerUserId: string,
    listing: { id: string; title: string; slug: string; kind: string },
  ) {
    return this.notifyUser({
      userId: ownerUserId,
      type: 'part_listing_expired',
      title: 'Part listing expired',
      message: `"${listing.title}" is no longer in public search. Renew it to publish again.`,
      data: {
        partListingId: listing.id,
        slug: listing.slug,
        kind: listing.kind,
      },
      emailSubject: 'Your ThrottleLK part listing expired',
      emailHtml: `<p>Your part listing <strong>${escapeHtml(listing.title)}</strong> expired and was removed from public search. Renew it from your account to publish again.</p>`,
    });
  }

  async partListingRejected(
    ownerUserId: string,
    listing: { id: string; title: string; slug: string; kind: string },
    reason: string,
  ) {
    return this.notifyUser({
      userId: ownerUserId,
      type: 'part_listing_rejected',
      title: 'Part listing needs changes',
      message: `"${listing.title}" was rejected: ${reason}`,
      data: {
        partListingId: listing.id,
        slug: listing.slug,
        kind: listing.kind,
        reason,
      },
      emailSubject: 'ThrottleLK part listing rejected',
      emailHtml: `<p>Your part listing <strong>${escapeHtml(listing.title)}</strong> was rejected.</p><p>Reason: ${escapeHtml(reason)}</p>`,
    });
  }

  async partListingPendingReview(listing: {
    id: string;
    title: string;
    slug: string;
    kind: string;
  }) {
    const adminIds = await this.users.findActiveAdminIds();
    await Promise.all(
      adminIds.map((userId) =>
        this.notifyUser({
          userId,
          type: 'part_listing_pending_review',
          title: 'Part listing pending review',
          message: `"${listing.title}" (${listing.kind}) is waiting for approval.`,
          data: {
            partListingId: listing.id,
            slug: listing.slug,
            kind: listing.kind,
          },
          emailSubject: `ThrottleLK: part listing pending — ${listing.title}`,
          emailHtml: `<p>A part listing <strong>${escapeHtml(listing.title)}</strong> was submitted and is waiting for admin review.</p>`,
        }),
      ),
    );
  }

  async promoApproved(
    userId: string,
    listing: {
      title: string;
      endsAt: Date;
      listingId: string | null;
      partListingId: string | null;
      requestId?: string;
      tier?: string;
      surfaces?: string[];
    },
    manager?: EntityManager,
  ) {
    const until = listing.endsAt.toLocaleDateString('en-LK', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Colombo',
    });
    const surfaces = listing.surfaces ?? ['home', 'browse', 'detail'];
    const placement = surfaces.includes('home')
      ? 'the homepage'
      : 'bike and parts browsing pages';
    return this.notifyUser(
      {
        userId,
        type: 'promo_approved',
        title: 'Promotion approved',
        message: `"${listing.title}" is promoted on ${placement} until ${until}.`,
        eventKey: listing.requestId
          ? `promo-approved:${listing.requestId}`
          : undefined,
        data: {
          listingId: listing.listingId,
          partListingId: listing.partListingId,
          endsAt: listing.endsAt.toISOString(),
          tier: listing.tier,
          surfaces,
        },
        emailSubject: 'Your ThrottleLK promotion is approved',
        emailHtml: `<p><strong>${escapeHtml(listing.title)}</strong> is promoted on ${placement} until ${until}.</p>`,
      },
      manager,
    );
  }

  async promoRejected(
    userId: string,
    listing: {
      title: string;
      reason: string;
      listingId: string | null;
      partListingId: string | null;
      requestId?: string;
    },
    manager?: EntityManager,
  ) {
    return this.notifyUser(
      {
        userId,
        type: 'promo_rejected',
        title: 'Promotion request rejected',
        message: `"${listing.title}" was rejected: ${listing.reason}`,
        eventKey: listing.requestId
          ? `promo-rejected:${listing.requestId}`
          : undefined,
        data: {
          listingId: listing.listingId,
          partListingId: listing.partListingId,
          reason: listing.reason,
        },
        emailSubject: 'ThrottleLK promotion request rejected',
        emailHtml: `<p>Your promotion request for <strong>${escapeHtml(listing.title)}</strong> was rejected.</p><p>Reason: ${escapeHtml(listing.reason)}</p>`,
      },
      manager,
    );
  }

  async savedSearchMatch(
    userId: string,
    listing: { id: string; title: string; slug: string; searchName: string },
  ) {
    return this.notifyUser({
      userId,
      type: 'saved_search_match',
      title: 'New bike matches a saved search',
      message: `"${listing.title}" matches "${listing.searchName}".`,
      data: {
        listingId: listing.id,
        slug: listing.slug,
        searchName: listing.searchName,
      },
      emailSubject: `New match: ${listing.title}`,
      emailHtml: `<p>A new listing <strong>${escapeHtml(listing.title)}</strong> matches your saved search <strong>${escapeHtml(listing.searchName)}</strong>.</p>`,
    });
  }

  async listingExpired(
    sellerId: string,
    listing: { id: string; title: string; slug?: string },
  ) {
    return this.notifyUser({
      userId: sellerId,
      type: 'listing_expired',
      title: 'Listing expired',
      message: `"${listing.title}" is no longer in public search. Renew it to publish again.`,
      data: { listingId: listing.id, slug: listing.slug },
      emailSubject: 'Your ThrottleLK listing expired',
      emailHtml: `<p>Your listing <strong>${escapeHtml(listing.title)}</strong> expired and was removed from public search. Renew it from your account to publish again.</p>`,
    });
  }

  async listingExpiringSoon(
    userId: string,
    listing: {
      id: string;
      title: string;
      slug: string;
      expiresAt: Date;
      kind?: string;
    },
  ) {
    const part = Boolean(listing.kind);
    const until = listing.expiresAt.toLocaleDateString('en-LK', {
      timeZone: 'Asia/Colombo',
    });
    return this.notifyUser({
      userId,
      type: part ? 'part_listing_expiring_soon' : 'listing_expiring_soon',
      title: 'Listing expires soon',
      message: `"${listing.title}" expires on ${until}. Review it in your account.`,
      eventKey: `expiring:${listing.id}:${listing.expiresAt.toISOString()}`,
      data: {
        [part ? 'partListingId' : 'listingId']: listing.id,
        slug: listing.slug,
        kind: listing.kind,
        expiresAt: listing.expiresAt.toISOString(),
      },
    });
  }

  async priceDrop(
    userId: string,
    listing: { id: string; title: string; slug: string },
    oldPrice: number,
    newPrice: number,
  ) {
    return this.notifyUser({
      userId,
      type: 'price_drop',
      title: 'Price drop on a saved bike',
      message: `"${listing.title}" dropped from Rs. ${oldPrice.toLocaleString('en-LK')} to Rs. ${newPrice.toLocaleString('en-LK')}.`,
      data: {
        listingId: listing.id,
        slug: listing.slug,
        oldPrice,
        newPrice,
      },
      emailSubject: `Price drop: ${listing.title}`,
      emailHtml: `<p><strong>${escapeHtml(listing.title)}</strong> dropped from Rs. ${oldPrice.toLocaleString('en-LK')} to Rs. ${newPrice.toLocaleString('en-LK')}.</p>`,
    });
  }
}
