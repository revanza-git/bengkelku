import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { DeliveryOrdersService } from './delivery-orders.service';
import { CreateDeliveryOrderDto, UpdateDeliveryOrderDto, ProcessDeliveryDto } from './dto';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { CurrentUser, Roles } from '../auth/decorators';
import type { CurrentUserPayload } from '../auth/decorators';

@Controller('delivery-orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DeliveryOrdersController {
  constructor(private readonly deliveryOrdersService: DeliveryOrdersService) {}

  @Get()
  findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.deliveryOrdersService.findAll(user.org_id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.deliveryOrdersService.findOne(id, user.org_id);
  }

  @Post()
  @Roles('admin', 'storekeeper', 'technician', 'procurement', 'warehouse')
  create(
    @Body() createDeliveryOrderDto: CreateDeliveryOrderDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.deliveryOrdersService.create(
      createDeliveryOrderDto,
      user.id,
      user.org_id,
    );
  }

  @Put(':id')
  @Roles('admin', 'storekeeper', 'technician', 'procurement', 'warehouse')
  update(
    @Param('id') id: string,
    @Body() updateDeliveryOrderDto: UpdateDeliveryOrderDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.deliveryOrdersService.update(id, updateDeliveryOrderDto, user.org_id);
  }

  /**
   * Process delivery - This is the critical endpoint that replaces the Supabase edge function
   * POST /api/delivery-orders/:id/process
   */
  @Post(':id/process')
  @Roles('admin', 'storekeeper', 'procurement', 'warehouse')
  processDelivery(
    @Param('id') id: string,
    @Body() processDeliveryDto: ProcessDeliveryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.deliveryOrdersService.processDelivery(id, processDeliveryDto, user.org_id);
  }

  @Delete(':id')
  @Roles('admin')
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.deliveryOrdersService.remove(id, user.org_id);
  }
}
