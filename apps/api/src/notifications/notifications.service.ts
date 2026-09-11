import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
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

  async listForUser(userId: string, limit = 50) {
    return this.notifications.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
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
