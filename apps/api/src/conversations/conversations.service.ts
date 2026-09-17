import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Listing } from '../listings/listing.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { ConversationMessage } from './conversation-message.entity';
import { Conversation } from './conversation.entity';

type ContactCard = {
  id: string;
  displayName: string;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
};

@Injectable()
export class ConversationsService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversations: Repository<Conversation>,
    @InjectRepository(ConversationMessage)
    private readonly messages: Repository<ConversationMessage>,
    @InjectRepository(Listing)
    private readonly listings: Repository<Listing>,
    private readonly notifications: NotificationsService,
    private readonly usersService: UsersService,
  ) {}

  async start(buyerUserId: string, listingId: string, body: string) {
    const listing = await this.listings.findOne({
      where: { id: listingId, status: 'active' },
    });
    if (!listing) {
      throw new NotFoundException({
        success: false,
        error: { code: 'LISTING_NOT_FOUND', message: 'Listing not found' },
      });
    }
    if (listing.sellerId === buyerUserId) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'CANNOT_MESSAGE_SELF',
          message: 'You cannot message your own listing',
        },
      });
    }

    let conversation = await this.conversations.findOne({
      where: { listingId, buyerUserId },
    });
    if (!conversation) {
      conversation = await this.conversations.save(
        this.conversations.create({
          listingId,
          buyerUserId,
          sellerUserId: listing.sellerId,
          lastMessageAt: null,
        }),
      );
    }

    return this.addMessage(conversation.id, buyerUserId, body);
  }

  async listForUser(userId: string) {
    const rows = await this.conversations.find({
      where: [{ buyerUserId: userId }, { sellerUserId: userId }],
      relations: ['listing'],
      order: { lastMessageAt: 'DESC', createdAt: 'DESC' },
      take: 50,
    });

    const counterpartIds = [
      ...new Set(
        rows.map((c) =>
          c.buyerUserId === userId ? c.sellerUserId : c.buyerUserId,
        ),
      ),
    ];
    const users = await this.loadUsersByIds(counterpartIds);
    const lastByConversation = await this.loadLastMessages(
      rows.map((c) => c.id),
    );

    return rows.map((c) => {
      const counterpartId =
        c.buyerUserId === userId ? c.sellerUserId : c.buyerUserId;
      const last = lastByConversation.get(c.id);
      return {
        id: c.id,
        listingId: c.listingId,
        listingTitle: c.listing?.title ?? 'Listing',
        listingSlug: c.listing?.slug ?? null,
        buyerUserId: c.buyerUserId,
        sellerUserId: c.sellerUserId,
        lastMessageAt: c.lastMessageAt,
        createdAt: c.createdAt,
        role: c.buyerUserId === userId ? ('buyer' as const) : ('seller' as const),
        counterpart: this.toContactCard(users.get(counterpartId) ?? null),
        lastMessagePreview: last?.body?.slice(0, 140) ?? null,
        lastMessageMine: last ? last.senderUserId === userId : false,
        unread: this.isUnread(c, last, userId),
      };
    });
  }

  async getForUser(userId: string, id: string) {
    const conversation = await this.conversations.findOne({
      where: { id },
      relations: ['listing'],
    });
    if (!conversation) {
      throw new NotFoundException({
        success: false,
        error: { code: 'CONVERSATION_NOT_FOUND', message: 'Not found' },
      });
    }
    this.assertParticipant(conversation, userId);
    await this.markRead(conversation, userId);
    const messages = await this.messages.find({
      where: { conversationId: id },
      order: { createdAt: 'ASC' },
      take: 200,
    });
    const counterpartId =
      conversation.buyerUserId === userId
        ? conversation.sellerUserId
        : conversation.buyerUserId;
    const counterpartUser = await this.usersService
      .findByIdOrThrow(counterpartId)
      .catch(() => null);

    return {
      id: conversation.id,
      listingId: conversation.listingId,
      listingTitle: conversation.listing?.title ?? 'Listing',
      listingSlug: conversation.listing?.slug ?? null,
      buyerUserId: conversation.buyerUserId,
      sellerUserId: conversation.sellerUserId,
      lastMessageAt: conversation.lastMessageAt,
      role:
        conversation.buyerUserId === userId
          ? ('buyer' as const)
          : ('seller' as const),
      counterpart: this.toContactCard(counterpartUser),
      messages: messages.map((m) => ({
        id: m.id,
        senderUserId: m.senderUserId,
        body: m.body,
        createdAt: m.createdAt,
        mine: m.senderUserId === userId,
      })),
    };
  }

  async reply(userId: string, conversationId: string, body: string) {
    return this.addMessage(conversationId, userId, body);
  }

  private async addMessage(
    conversationId: string,
    senderUserId: string,
    body: string,
  ) {
    const conversation = await this.conversations.findOne({
      where: { id: conversationId },
      relations: ['listing'],
    });
    if (!conversation) {
      throw new NotFoundException({
        success: false,
        error: { code: 'CONVERSATION_NOT_FOUND', message: 'Not found' },
      });
    }
    this.assertParticipant(conversation, senderUserId);

    const previousLastAt = conversation.lastMessageAt ?? conversation.createdAt;
    const isBuyer = senderUserId === conversation.buyerUserId;
    if (isBuyer) {
      if (!conversation.sellerLastReadAt) {
        conversation.sellerLastReadAt = previousLastAt;
      }
    } else if (!conversation.buyerLastReadAt) {
      conversation.buyerLastReadAt = previousLastAt;
    }

    const message = await this.messages.save(
      this.messages.create({
        conversationId,
        senderUserId,
        body,
      }),
    );
    conversation.lastMessageAt = message.createdAt;
    if (isBuyer) conversation.buyerLastReadAt = message.createdAt;
    else conversation.sellerLastReadAt = message.createdAt;
    await this.conversations.save(conversation);

    const recipientId =
      senderUserId === conversation.buyerUserId
        ? conversation.sellerUserId
        : conversation.buyerUserId;
    void this.notifications.newMessage(recipientId, {
      conversationId: conversation.id,
      listingTitle: conversation.listing?.title ?? 'Listing',
      preview: body,
      fromBuyer: senderUserId === conversation.buyerUserId,
    });

    return {
      conversationId: conversation.id,
      message: {
        id: message.id,
        senderUserId: message.senderUserId,
        body: message.body,
        createdAt: message.createdAt,
        mine: true,
      },
    };
  }

  private isUnread(
    conversation: Conversation,
    last:
      | { senderUserId: string; createdAt: Date }
      | undefined,
    userId: string,
  ) {
    if (!last || last.senderUserId === userId) return false;
    const readAt =
      conversation.buyerUserId === userId
        ? conversation.buyerLastReadAt
        : conversation.sellerLastReadAt;
    if (!readAt) return false;
    return last.createdAt.getTime() > readAt.getTime();
  }

  private async markRead(conversation: Conversation, userId: string) {
    const now = new Date();
    if (conversation.buyerUserId === userId) {
      conversation.buyerLastReadAt = now;
    } else {
      conversation.sellerLastReadAt = now;
    }
    await this.conversations.save(conversation);
  }

  private async loadUsersByIds(ids: string[]) {
    const map = new Map<string, User>();
    if (ids.length === 0) return map;
    const rows = await this.usersService.findByIds(ids);
    for (const u of rows) map.set(u.id, u);
    return map;
  }

  private async loadLastMessages(conversationIds: string[]) {
    const map = new Map<
      string,
      { body: string; senderUserId: string; createdAt: Date }
    >();
    if (conversationIds.length === 0) return map;

    const rows = await this.messages
      .createQueryBuilder('m')
      .distinctOn(['m.conversation_id'])
      .where('m.conversation_id IN (:...ids)', { ids: conversationIds })
      .orderBy('m.conversation_id')
      .addOrderBy('m.created_at', 'DESC')
      .getMany();

    for (const m of rows) {
      map.set(m.conversationId, {
        body: m.body,
        senderUserId: m.senderUserId,
        createdAt: m.createdAt,
      });
    }
    return map;
  }

  private toContactCard(user: User | null): ContactCard | null {
    if (!user) return null;
    return {
      id: user.id,
      displayName: `${user.firstName} ${user.lastName.charAt(0)}.`.trim(),
      fullName: `${user.firstName} ${user.lastName}`.trim(),
      phone: user.phone,
      avatarUrl: user.avatarUrl,
    };
  }

  private assertParticipant(conversation: Conversation, userId: string) {
    if (
      conversation.buyerUserId !== userId &&
      conversation.sellerUserId !== userId
    ) {
      throw new ForbiddenException({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Not your conversation' },
      });
    }
  }
}
