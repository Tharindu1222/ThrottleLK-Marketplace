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
import { ConversationMessage } from './conversation-message.entity';
import { Conversation } from './conversation.entity';

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
    return rows.map((c) => ({
      id: c.id,
      listingId: c.listingId,
      listingTitle: c.listing?.title ?? 'Listing',
      listingSlug: c.listing?.slug ?? null,
      buyerUserId: c.buyerUserId,
      sellerUserId: c.sellerUserId,
      lastMessageAt: c.lastMessageAt,
      createdAt: c.createdAt,
      role: c.buyerUserId === userId ? 'buyer' : 'seller',
    }));
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
    const messages = await this.messages.find({
      where: { conversationId: id },
      order: { createdAt: 'ASC' },
      take: 200,
    });
    return {
      id: conversation.id,
      listingId: conversation.listingId,
      listingTitle: conversation.listing?.title ?? 'Listing',
      listingSlug: conversation.listing?.slug ?? null,
      buyerUserId: conversation.buyerUserId,
      sellerUserId: conversation.sellerUserId,
      lastMessageAt: conversation.lastMessageAt,
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

    const message = await this.messages.save(
      this.messages.create({
        conversationId,
        senderUserId,
        body,
      }),
    );
    conversation.lastMessageAt = message.createdAt;
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
