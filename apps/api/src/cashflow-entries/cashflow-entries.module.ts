import { Module } from '@nestjs/common';
import { CashflowEntriesController } from './cashflow-entries.controller';
import { CashflowEntriesService } from './cashflow-entries.service';

@Module({
  controllers: [CashflowEntriesController],
  providers: [CashflowEntriesService],
})
export class CashflowEntriesModule {}
