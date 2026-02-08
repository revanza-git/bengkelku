import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { CurrentUser } from '../auth/decorators';
import type { CurrentUserPayload } from '../auth/decorators';
import { StockMovementsQueryDto } from './dto';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('low-stock')
  getLowStock(@CurrentUser() user: CurrentUserPayload) {
    return this.reportsService.getLowStock(user.org_id);
  }

  @Get('stock-movements')
  getStockMovements(
    @Query() query: StockMovementsQueryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.reportsService.getStockMovements(user.org_id, query);
  }
}
