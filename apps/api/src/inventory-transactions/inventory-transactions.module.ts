import { Module } from '@nestjs/common';
import { InventoryTransactionsController } from './inventory-transactions.controller';
import { InventoryTransactionsService } from './inventory-transactions.service';

@Module({
  controllers: [InventoryTransactionsController],
  providers: [InventoryTransactionsService],
})
export class InventoryTransactionsModule {}
