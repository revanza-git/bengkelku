import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  UseGuards,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ItemsService } from './items.service';
import { CreateItemDto, UpdateItemDto } from './dto';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { CurrentUser, Roles } from '../auth/decorators';
import type { CurrentUserPayload } from '../auth/decorators';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';

@Controller('items')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Get()
  findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.itemsService.findAll(user.org_id);
  }

  @Get('stock')
  findStockItems(@CurrentUser() user: CurrentUserPayload) {
    return this.itemsService.findStockItems(user.org_id);
  }

  @Get('inventory-summary')
  getInventorySummary(@CurrentUser() user: CurrentUserPayload) {
    return this.itemsService.getInventorySummary(user.org_id);
  }

  @Get('low-stock')
  getLowStock(@CurrentUser() user: CurrentUserPayload) {
    return this.itemsService.getLowStock(user.org_id);
  }

  @Get('export/csv')
  @Roles('admin')
  async exportCsv(@CurrentUser() user: CurrentUserPayload, @Res() res: Response) {
    const csv = await this.itemsService.exportItemsCsv(user.org_id);
    const timestamp = new Date().toISOString().slice(0, 10);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="parts-${timestamp}.csv"`);
    return res.send(csv);
  }

  @Post('import/csv')
  @Roles('admin')
  @UseInterceptors(FileInterceptor('file'))
  importCsv(
    @UploadedFile() file: { buffer: Buffer } | undefined,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('CSV file is required');
    }

    return this.itemsService.importItemsCsv(user.org_id, file.buffer);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.itemsService.findOne(id, user.org_id);
  }

  @Post()
  @Roles('admin', 'storekeeper', 'procurement')
  create(
    @Body() createItemDto: CreateItemDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.itemsService.create(createItemDto, user.org_id);
  }

  @Put(':id')
  @Roles('admin', 'storekeeper', 'procurement')
  update(
    @Param('id') id: string,
    @Body() updateItemDto: UpdateItemDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.itemsService.update(id, updateItemDto, user.org_id);
  }

  @Delete(':id')
  @Roles('admin')
  remove(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.itemsService.remove(id, user.org_id);
  }
}
