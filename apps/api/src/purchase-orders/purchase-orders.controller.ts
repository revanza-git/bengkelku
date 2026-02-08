import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { PurchaseOrdersService } from './purchase-orders.service';
import { CreatePurchaseOrderDto, UpdatePurchaseOrderDto } from './dto';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { CurrentUser, Roles } from '../auth/decorators';
import type { CurrentUserPayload } from '../auth/decorators';

@Controller('purchase-orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrdersService: PurchaseOrdersService) {}

  @Get()
  findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query('includeDeleted') includeDeleted?: string,
  ) {
    return this.purchaseOrdersService.findAll(
      user.org_id,
      includeDeleted === 'true',
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.purchaseOrdersService.findOne(id, user.org_id);
  }

  @Post()
  @Roles('admin', 'storekeeper', 'procurement')
  create(
    @Body() createPurchaseOrderDto: CreatePurchaseOrderDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.purchaseOrdersService.create(
      createPurchaseOrderDto,
      user.id,
      user.org_id,
    );
  }

  @Put(':id')
  @Roles('admin', 'storekeeper', 'procurement')
  update(
    @Param('id') id: string,
    @Body() updatePurchaseOrderDto: UpdatePurchaseOrderDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.purchaseOrdersService.update(
      id,
      updatePurchaseOrderDto,
      user.org_id,
    );
  }

  @Put(':id/status')
  @Roles('admin', 'storekeeper', 'procurement')
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.purchaseOrdersService.updateStatus(
      id,
      status as any,
      user.org_id,
      user.id,
    );
  }

  @Post(':id/reserve')
  @Roles('admin', 'storekeeper', 'procurement', 'warehouse')
  reserveStock(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.purchaseOrdersService.reserveStock(id, user.org_id);
  }

  @Delete(':id')
  @Roles('admin')
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.purchaseOrdersService.softDelete(id, user.org_id);
  }
}
