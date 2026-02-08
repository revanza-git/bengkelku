import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { CashflowEntriesService } from './cashflow-entries.service';
import { CurrentUser } from '../auth/decorators';
import type { CurrentUserPayload } from '../auth/decorators';

@Controller('cashflow-entries')
export class CashflowEntriesController {
  constructor(private readonly cashflowEntriesService: CashflowEntriesService) {}

  @Get()
  findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.cashflowEntriesService.findAll(user.org_id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.cashflowEntriesService.findOne(id, user.org_id);
  }

  @Post()
  create(@Body() body: any, @CurrentUser() user: CurrentUserPayload) {
    return this.cashflowEntriesService.create(user.org_id, user.id, body);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.cashflowEntriesService.update(id, user.org_id, user.id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.cashflowEntriesService.remove(id, user.org_id);
  }
}
