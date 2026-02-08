import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto } from './dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(orgId: string) {
    const users = await this.prisma.public_users.findMany({
      where: { org_id: orgId },
      orderBy: { created_at: 'desc' },
    });

    return users.map((user) => ({
      ...user,
      is_active: true,
    }));
  }

  async findOne(id: string, orgId: string) {
    const user = await this.prisma.public_users.findFirst({
      where: { id, org_id: orgId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      ...user,
      is_active: true,
    };
  }

  async create(createUserDto: CreateUserDto, actorOrgId: string) {
    const existing = await this.prisma.auth_users.findFirst({
      where: { email: createUserDto.email },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const created = await this.prisma.$transaction(async (tx) => {
      const authUser = await tx.auth_users.create({
        data: {
          email: createUserDto.email,
          encrypted_password: hashedPassword,
        },
      });

      const publicUser = await tx.public_users.create({
        data: {
          id: authUser.id,
          org_id: actorOrgId,
          email: createUserDto.email,
          full_name: createUserDto.full_name || null,
          role: createUserDto.role as any,
        },
      });

      return publicUser;
    });

    return {
      ...created,
      is_active: true,
    };
  }

  async update(id: string, updateUserDto: UpdateUserDto, orgId: string, actorId: string) {
    await this.findOne(id, orgId);

    if (id === actorId && updateUserDto.role && updateUserDto.role !== 'admin') {
      throw new BadRequestException('Admin cannot downgrade their own role');
    }

    const updated = await this.prisma.public_users.update({
      where: { id },
      data: {
        ...(updateUserDto.full_name !== undefined ? { full_name: updateUserDto.full_name } : {}),
        ...(updateUserDto.role ? { role: updateUserDto.role as any } : {}),
      },
    });

    return {
      ...updated,
      is_active: true,
    };
  }

  async remove(id: string, orgId: string, actorId: string) {
    await this.findOne(id, orgId);

    if (id === actorId) {
      throw new ForbiddenException('Cannot delete your own account');
    }

    await this.prisma.auth_users.delete({
      where: { id },
    });

    return { success: true, message: 'User deleted successfully' };
  }

  async updatePassword(userId: string, orgId: string, targetUserId: string, newPassword: string) {
    await this.findOne(targetUserId, orgId);

    if (!newPassword || newPassword.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.auth_users.update({
      where: { id: targetUserId },
      data: {
        encrypted_password: hashedPassword,
      },
    });

    return {
      success: true,
      message: userId === targetUserId ? 'Password updated' : 'User password updated',
    };
  }
}
