import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { CurrentUser } from '../auth/decorators';
import type { CurrentUserPayload } from '../auth/decorators';

@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.invoicesService.findAll(user.org_id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.invoicesService.findOne(id, user.org_id);
  }

  @Post()
  create(@Body() body: any, @CurrentUser() user: CurrentUserPayload) {
    return this.invoicesService.create(user.org_id, body);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.invoicesService.update(id, user.org_id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.invoicesService.remove(id, user.org_id);
  }
}
