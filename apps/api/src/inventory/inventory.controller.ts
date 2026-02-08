import { Controller, Get, Param, Query } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { CurrentUser } from '../auth/decorators';
import type { CurrentUserPayload } from '../auth/decorators';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('on-hand')
  getOnHand(@CurrentUser() user: CurrentUserPayload) {
    return this.inventoryService.getOnHand(user.org_id);
  }

  @Get('available')
  getAvailableSummary(@CurrentUser() user: CurrentUserPayload) {
    return this.inventoryService.getAvailableSummary(user.org_id);
  }

  @Get('available/:itemId')
  getAvailableForItem(
    @Param('itemId') itemId: string,
    @Query('warehouse_id') warehouseId: string | undefined,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.inventoryService.getAvailableForItem(user.org_id, itemId, warehouseId);
  }
}
