import { isPublicBike, isPublicPart } from '../common/public-listing';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { StartConversationInput } from '@throttlelk/validation';
import { Repository } from 'typeorm';
import { paginationMeta, parsePageLimit } from '../common/pagination';
import { assertEmailVerified } from '../common/email-verified';
import { Listing } from '../listings/listing.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { PartListing } from '../part-listings/part-listing.entity';
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
    @InjectRepository(PartListing)
    private readonly partListings: Repository<PartListing>,
    private readonly notifications: NotificationsService,
    private readonly usersService: UsersService,
  ) {}

  async start(buyerUserId: string, input: StartConversationInput) {
    const buyer = await this.usersService.findByIdOrThrow(buyerUserId);
    assertEmailVerified(buyer, 'starting a conversation');
    if (input.listingId) {
      return this.startForBikeListing(
        buyerUserId,
        input.listingId,
        input.message,
      );
    }
    if (input.partListingId) {
      return this.startForPartListing(
        buyerUserId,
        input.partListingId,
        input.message,
      );
    }
    throw new BadRequestException({
      success: false,
      error: {
        code: 'SUBJECT_REQUIRED',
        message: 'Provide listingId or partListingId',
      },
    });
  }

  private async startForBikeListing(
    buyerUserId: string,
    listingId: string,
    body: string,
  ) {
    const listing = await this.listings.findOne({
      where: { id: listingId, status: 'active' },
      relations: ['seller', 'dealer', 'dealer.owner'],
    });
    if (!listing || !isPublicBike(listing)) {
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
          partListingId: null,
          buyerUserId,
          sellerUserId: listing.sellerId,
          lastMessageAt: null,
        }),
      );
    }

    return this.addMessage(conversation.id, buyerUserId, body);
  }

  private async startForPartListing(
    buyerUserId: string,
    partListingId: string,
    body: string,
  ) {
    const listing = await this.partListings.findOne({
      where: { id: partListingId, status: 'active' },
      relations: ['partsDealer', 'partsDealer.owner'],
    });
    if (!listing || !isPublicPart(listing)) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'PART_LISTING_NOT_FOUND',
          message: 'Part listing not found',
        },
      });
    }
    const sellerUserId = listing.partsDealer?.ownerUserId;
    if (!sellerUserId) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'PART_LISTING_NOT_FOUND',
          message: 'Part listing not found',
        },
      });
    }
    if (sellerUserId === buyerUserId) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'CANNOT_MESSAGE_SELF',
          message: 'You cannot message your own listing',
        },
      });
    }

    let conversation = await this.conversations.findOne({
      where: { partListingId, buyerUserId },
    });
    if (!conversation) {
      conversation = await this.conversations.save(
        this.conversations.create({
          listingId: null,
          partListingId,
          buyerUserId,
          sellerUserId,
          lastMessageAt: null,
        }),
      );
    }

    return this.addMessage(conversation.id, buyerUserId, body);
  }

  async listForUser(
    userId: string,
    paging?: {
      page?: string | number;
      limit?: string | number;
      listingId?: string;
      partListingId?: string;
      unread?: string;
    },
  ) {
    const { page, limit, skip } = parsePageLimit({
      page: paging?.page,
      limit: paging?.limit,
      defaultLimit: 20,
      maxLimit: 100,
    });
    const qb = this.conversations
      .createQueryBuilder('c')
      .leftJoin('c.listing', 'listing')
      .leftJoin('c.partListing', 'partListing')
      .addSelect([
        'listing.id',
        'listing.title',
        'listing.slug',
        'partListing.id',
        'partListing.title',
        'partListing.slug',
        'partListing.kind',
      ])
      .where('(c.buyerUserId = :userId OR c.sellerUserId = :userId)', {
        userId,
      })
      .orderBy('c.lastMessageAt', 'DESC', 'NULLS LAST')
      .addOrderBy('c.createdAt', 'DESC');
    if (paging?.listingId) {
      qb.andWhere('c.listingId = :listingId', { listingId: paging.listingId });
    }
    if (paging?.partListingId) {
      qb.andWhere('c.partListingId = :partListingId', {
        partListingId: paging.partListingId,
      });
    }
    if (paging?.unread === '1') {
      qb.andWhere(
        `EXISTS (
          SELECT 1 FROM conversation_messages m
          WHERE m.conversation_id = c.id
            AND m.sender_user_id <> :userId
            AND m.created_at > COALESCE(
              CASE
                WHEN c.buyer_user_id = :userId THEN c.buyer_last_read_at
                ELSE c.seller_last_read_at
              END,
              TIMESTAMP '1970-01-01'
            )
        )`,
      );
    }
    qb.skip(skip).take(limit);
    const [rows, total] = await qb.getManyAndCount();

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

    return {
      items: rows.map((c) => {
        const counterpartId =
          c.buyerUserId === userId ? c.sellerUserId : c.buyerUserId;
        const last = lastByConversation.get(c.id);
        const subject = this.subjectFields(c);
        return {
          id: c.id,
          ...subject,
          buyerUserId: c.buyerUserId,
          sellerUserId: c.sellerUserId,
          lastMessageAt: c.lastMessageAt,
          createdAt: c.createdAt,
          role:
            c.buyerUserId === userId ? ('buyer' as const) : ('seller' as const),
          counterpart: this.toContactCard(users.get(counterpartId) ?? null),
          lastMessagePreview: last?.body?.slice(0, 140) ?? null,
          lastMessageMine: last ? last.senderUserId === userId : false,
          unread: this.isUnread(c, last, userId),
        };
      }),
      meta: paginationMeta(total, page, limit),
    };
  }

  async getForUser(userId: string, id: string, before?: string) {
    const conversation = await this.conversations.findOne({
      where: { id },
      relations: ['listing', 'partListing'],
    });
    if (!conversation) {
      throw new NotFoundException({
        success: false,
        error: { code: 'CONVERSATION_NOT_FOUND', message: 'Not found' },
      });
    }
    this.assertParticipant(conversation, userId);
    await this.markRead(conversation, userId);
    const pageSize = 200;
    const qb = this.messages
      .createQueryBuilder('m')
      .where('m.conversationId = :id', { id })
      .orderBy('m.createdAt', 'DESC')
      .take(pageSize + 1);
    if (before) {
      const cursor = await this.messages.findOne({
        where: { id: before, conversationId: id },
      });
      if (cursor) {
        qb.andWhere('m.createdAt < :cursor', { cursor: cursor.createdAt });
      }
    }
    const rows = await qb.getMany();
    const hasOlder = rows.length > pageSize;
    const messages = rows.slice(0, pageSize).reverse();
    const counterpartId =
      conversation.buyerUserId === userId
        ? conversation.sellerUserId
        : conversation.buyerUserId;
    const counterpartUser = await this.usersService
      .findByIdOrThrow(counterpartId)
      .catch(() => null);

    return {
      id: conversation.id,
      ...this.subjectFields(conversation),
      buyerUserId: conversation.buyerUserId,
      sellerUserId: conversation.sellerUserId,
      lastMessageAt: conversation.lastMessageAt,
      role:
        conversation.buyerUserId === userId
          ? ('buyer' as const)
          : ('seller' as const),
      counterpart: this.toContactCard(counterpartUser),
      hasOlder,
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

  private subjectFields(c: Conversation) {
    if (c.partListingId) {
      return {
        listingId: null as string | null,
        partListingId: c.partListingId,
        listingTitle: c.partListing?.title ?? 'Part listing',
        listingSlug: c.partListing?.slug ?? null,
        subjectKind: 'part' as const,
        partKind: c.partListing?.kind ?? null,
      };
    }
    return {
      listingId: c.listingId,
      partListingId: null as string | null,
      listingTitle: c.listing?.title ?? 'Listing',
      listingSlug: c.listing?.slug ?? null,
      subjectKind: 'bike' as const,
      partKind: null,
    };
  }

  private async addMessage(
    conversationId: string,
    senderUserId: string,
    body: string,
  ) {
    const conversation = await this.conversations.findOne({
      where: { id: conversationId },
      relations: ['listing', 'partListing'],
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
    const subject = this.subjectFields(conversation);
    void this.notifications.newMessage(recipientId, {
      conversationId: conversation.id,
      listingTitle: subject.listingTitle,
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
    last: { senderUserId: string; createdAt: Date } | undefined,
    userId: string,
  ) {
    if (!last || last.senderUserId === userId) return false;
    const readAt =
      conversation.buyerUserId === userId
        ? conversation.buyerLastReadAt
        : conversation.sellerLastReadAt;
    if (!readAt) return true;
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
