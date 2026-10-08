import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { EmailService } from './email.service';
import { Notification } from './notification.entity';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationEmail } from './notification-email.entity';
import { NotificationDeliveryService } from './notification-delivery.service';

@Module({
  imports: [TypeOrmModule.forFeature([Notification, NotificationEmail]), UsersModule],
  providers: [NotificationsService, EmailService, NotificationDeliveryService],
  controllers: [NotificationsController],
  exports: [NotificationsService, EmailService],
})
export class NotificationsModule {}
