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
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto, UpdateSupplierDto } from './dto';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { CurrentUser, Roles } from '../auth/decorators';
import type { CurrentUserPayload } from '../auth/decorators';

@Controller('suppliers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.suppliersService.findAll(user.org_id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.suppliersService.findOne(id, user.org_id);
  }

  @Post()
  @Roles('admin', 'storekeeper', 'procurement')
  create(
    @Body() createSupplierDto: CreateSupplierDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.suppliersService.create(createSupplierDto, user.org_id);
  }

  @Put(':id')
  @Roles('admin', 'storekeeper', 'procurement')
  update(
    @Param('id') id: string,
    @Body() updateSupplierDto: UpdateSupplierDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.suppliersService.update(id, updateSupplierDto, user.org_id);
  }

  @Delete(':id')
  @Roles('admin')
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.suppliersService.remove(id, user.org_id);
  }
}
