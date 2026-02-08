import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { InventoryTransactionsService } from './inventory-transactions.service';
import { CurrentUser, Roles } from '../auth/decorators';
import type { CurrentUserPayload } from '../auth/decorators';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { CreateInventoryTransactionDto, QueryInventoryTransactionsDto } from './dto';

@Controller('inventory-transactions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryTransactionsController {
  constructor(private readonly inventoryTransactionsService: InventoryTransactionsService) {}

  @Get()
  findAll(
    @Query() query: QueryInventoryTransactionsDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.inventoryTransactionsService.findAll(user.org_id, {
      item_id: query.item_id,
      warehouse_id: query.warehouse_id,
      trx_type: query.trx_type,
      date_from: query.date_from,
      date_to: query.date_to,
    });
  }

  @Post()
  @Roles('admin', 'storekeeper', 'warehouse', 'procurement')
  create(@Body() body: CreateInventoryTransactionDto, @CurrentUser() user: CurrentUserPayload) {
    return this.inventoryTransactionsService.create(user.org_id, body);
  }
}
