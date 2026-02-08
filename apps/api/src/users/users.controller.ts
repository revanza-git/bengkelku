import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CurrentUser, Roles } from '../auth/decorators';
import type { CurrentUserPayload } from '../auth/decorators';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { CreateUserDto, UpdatePasswordDto, UpdateUserDto } from './dto';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.usersService.findAll(user.org_id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.usersService.findOne(id, user.org_id);
  }

  @Post('create')
  create(@Body() body: CreateUserDto, @CurrentUser() user: CurrentUserPayload) {
    return this.usersService.create(body, user.org_id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() body: UpdateUserDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.usersService.update(id, body, user.org_id, user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.usersService.remove(id, user.org_id, user.id);
  }

  @Post('update-password')
  updatePassword(@Body() body: UpdatePasswordDto, @CurrentUser() user: CurrentUserPayload) {
    return this.usersService.updatePassword(user.id, user.org_id, body.user_id, body.new_password);
  }
}
