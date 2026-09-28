import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsModule } from '../notifications/notifications.module';
import { SavedSearch } from './saved-search.entity';
import { SavedSearchesController } from './saved-searches.controller';
import { SavedSearchesService } from './saved-searches.service';

@Module({
  imports: [TypeOrmModule.forFeature([SavedSearch]), NotificationsModule],
  controllers: [SavedSearchesController],
  providers: [SavedSearchesService],
  exports: [SavedSearchesService],
})
export class SavedSearchesModule {}
