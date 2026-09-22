import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Listing } from '../listings/listing.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { PartListing } from '../part-listings/part-listing.entity';
import { UsersModule } from '../users/users.module';
import { ConversationMessage } from './conversation-message.entity';
import { Conversation } from './conversation.entity';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Conversation,
      ConversationMessage,
      Listing,
      PartListing,
    ]),
    NotificationsModule,
    UsersModule,
  ],
  controllers: [ConversationsController],
  providers: [ConversationsService],
  exports: [ConversationsService],
})
export class ConversationsModule {}
