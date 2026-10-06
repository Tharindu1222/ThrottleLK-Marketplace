import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { AdminAuditInterceptor } from './admin-audit.interceptor';
import { AdminAuditJobsService } from './admin-audit-jobs.service';
import { AdminAuditLog } from './admin-audit-log.entity';
import { AdminAuditService } from './admin-audit.service';

@Module({
  imports: [TypeOrmModule.forFeature([AdminAuditLog, User])],
  providers: [AdminAuditService, AdminAuditInterceptor, AdminAuditJobsService],
  exports: [AdminAuditService, AdminAuditInterceptor, TypeOrmModule],
})
export class AdminAuditModule {}
