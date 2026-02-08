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
import { WarehousesService } from './warehouses.service';
import { CreateWarehouseDto, UpdateWarehouseDto } from './dto';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { CurrentUser, Roles } from '../auth/decorators';
import type { CurrentUserPayload } from '../auth/decorators';

@Controller('warehouses')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WarehousesController {
  constructor(private readonly warehousesService: WarehousesService) {}

  @Get()
  findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.warehousesService.findAll(user.org_id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.warehousesService.findOne(id, user.org_id);
  }

  @Get(':id/inventory')
  getInventory(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.warehousesService.getInventoryByWarehouse(id, user.org_id);
  }

  @Post()
  @Roles('admin', 'storekeeper', 'warehouse')
  create(
    @Body() createWarehouseDto: CreateWarehouseDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.warehousesService.create(createWarehouseDto, user.org_id);
  }

  @Put(':id')
  @Roles('admin', 'storekeeper', 'warehouse')
  update(
    @Param('id') id: string,
    @Body() updateWarehouseDto: UpdateWarehouseDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.warehousesService.update(id, updateWarehouseDto, user.org_id);
  }

  @Delete(':id')
  @Roles('admin')
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.warehousesService.remove(id, user.org_id);
  }
}
