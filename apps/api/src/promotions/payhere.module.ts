import { Module } from '@nestjs/common';
import { PayHereService } from './payhere.service';

@Module({
  providers: [PayHereService],
  exports: [PayHereService],
})
export class PayHereModule {}
