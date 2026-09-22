import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { paginationMeta, parsePageLimit } from '../common/pagination';
import { UsersService } from '../users/users.service';
import { EmailService } from './email.service';
import { Notification } from './notification.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notifications: Repository<Notification>,
    private readonly users: UsersService,
    private readonly email: EmailService,
  ) {}

  async listForUser(
    userId: string,
    paging?: { page?: string | number; limit?: string | number },
  ) {
    const { page, limit, skip } = parsePageLimit({
      page: paging?.page,
      limit: paging?.limit,
      defaultLimit: 20,
      maxLimit: 100,
    });
    const [rows, total] = await this.notifications.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });
    return { items: rows, meta: paginationMeta(total, page, limit) };
  }

  async unreadCount(userId: string) {
    return this.notifications.count({
      where: { userId, readAt: IsNull() },
    });
  }

  async markRead(userId: string, id: string) {
    const row = await this.notifications.findOne({ where: { id, userId } });
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
      .execute();
    return { ok: true };
  }

  async notifyUser(input: {
    userId: string;
    type: string;
    title: string;
    message: string;
    data?: Record<string, unknown>;
    emailSubject?: string;
    emailHtml?: string;
  }) {
    const row = await this.notifications.save(
      this.notifications.create({
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        dataJson: input.data ?? null,
      }),
    );

    void this.users
      .findByIdOrThrow(input.userId)
      .then((user) =>
        this.email.send(
          user.email,
          input.emailSubject ?? input.title,
          input.emailHtml ?? `<p>${input.message}</p>`,
        ),
      )
      .catch(() => undefined);

    return row;
  }

  async listingApproved(sellerId: string, listing: { id: string; title: string; slug: string }) {
    return this.notifyUser({
      userId: sellerId,
      type: 'listing_approved',
      title: 'Listing approved',
      message: `"${listing.title}" is now live on ThrottleLK.`,
      data: { listingId: listing.id, slug: listing.slug },
      emailSubject: 'Your ThrottleLK listing is live',
      emailHtml: `<p>Your listing <strong>${listing.title}</strong> was approved and is now public.</p>`,
    });
  }

  async listingRejected(
    sellerId: string,
    listing: { id: string; title: string },
    reason: string,
  ) {
    return this.notifyUser({
      userId: sellerId,
      type: 'listing_rejected',
      title: 'Listing needs changes',
      message: `"${listing.title}" was rejected: ${reason}`,
      data: { listingId: listing.id, reason },
      emailSubject: 'ThrottleLK listing rejected',
      emailHtml: `<p>Your listing <strong>${listing.title}</strong> was rejected.</p><p>Reason: ${reason}</p>`,
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
      emailHtml: `<p>We received a report about your listing <strong>${listing.title}</strong>.</p><p>${message}</p><p>Please review and fix any issues. Further violations may lead to removal.</p>`,
    });
  }

  async dealerApproved(ownerUserId: string, dealer: { id: string; name: string; slug: string }) {
    return this.notifyUser({
      userId: ownerUserId,
      type: 'dealer_approved',
      title: 'Dealer profile approved',
      message: `"${dealer.name}" is approved. You can attach listings to your showroom.`,
      data: { dealerId: dealer.id, slug: dealer.slug },
      emailSubject: 'Your ThrottleLK dealer profile is approved',
      emailHtml: `<p>Your dealer profile <strong>${dealer.name}</strong> is now active.</p>`,
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
      emailHtml: `<p>Your dealer application <strong>${dealer.name}</strong> was rejected.</p><p>Reason: ${dealer.reason}</p>`,
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
      emailHtml: `<p>Your parts shop <strong>${dealer.name}</strong> is now active.</p>`,
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
      emailHtml: `<p>Your parts shop application <strong>${dealer.name}</strong> was rejected.</p><p>Reason: ${dealer.reason}</p>`,
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
      emailHtml: `<p>You have a new message about <strong>${input.listingTitle}</strong>.</p><p>${input.preview}</p>`,
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
          emailHtml: `<p>A listing <strong>${listing.title}</strong> was submitted and is waiting for admin review.</p>`,
        }),
      ),
    );
  }

  async dealerPendingReview(dealer: { id: string; name: string; slug: string }) {
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
          emailHtml: `<p>A dealer application for <strong>${dealer.name}</strong> is waiting for review.</p>`,
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
          emailHtml: `<p>A parts dealer application for <strong>${dealer.name}</strong> is waiting for review.</p>`,
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
      emailHtml: `<p>Your part listing <strong>${listing.title}</strong> was approved and is now public.</p>`,
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
      emailHtml: `<p>Your part listing <strong>${listing.title}</strong> was rejected.</p><p>Reason: ${reason}</p>`,
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
          emailHtml: `<p>A part listing <strong>${listing.title}</strong> was submitted and is waiting for admin review.</p>`,
        }),
      ),
    );
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
      emailHtml: `<p><strong>${listing.title}</strong> dropped from Rs. ${oldPrice.toLocaleString('en-LK')} to Rs. ${newPrice.toLocaleString('en-LK')}.</p>`,
    });
  }
}
