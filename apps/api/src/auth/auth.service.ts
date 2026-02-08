import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto } from './dto';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  org_id: string;
}

export interface AuthUser {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  org_id: string;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async validateUser(email: string, password: string): Promise<AuthUser | null> {
    // Find user in auth.users table
    const authUser = await this.prisma.auth_users.findFirst({
      where: { email },
      include: { public_users: true },
    });

    if (!authUser || !authUser.encrypted_password) {
      return null;
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, authUser.encrypted_password);
    if (!isPasswordValid) {
      return null;
    }

    // Check if linked public user exists
    if (!authUser.public_users) {
      return null;
    }

    return {
      id: authUser.id,
      email: authUser.public_users.email,
      full_name: authUser.public_users.full_name,
      role: authUser.public_users.role,
      org_id: authUser.public_users.org_id,
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      org_id: user.org_id,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: 900, // 15 minutes
    });

    return {
      access_token: accessToken,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        org_id: user.org_id,
      },
    };
  }

  async register(registerDto: RegisterDto) {
    // Check if email already exists
    const existingUser = await this.prisma.auth_users.findFirst({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // Get default organization (first org or demo org)
    const defaultOrg = await this.prisma.orgs.findFirst({
      orderBy: { created_at: 'asc' },
    });

    if (!defaultOrg) {
      throw new BadRequestException('No organization found. Please run seed data first.');
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(registerDto.password, saltRounds);

    // Create user in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create auth user
      const authUser = await tx.auth_users.create({
        data: {
          email: registerDto.email,
          encrypted_password: hashedPassword,
        },
      });

      // Create public user linked to auth user
      const publicUser = await tx.public_users.create({
        data: {
          id: authUser.id,
          org_id: defaultOrg.id,
          email: registerDto.email,
          full_name: registerDto.full_name || null,
          role: 'viewer',
        },
      });

      return { authUser, publicUser };
    });

    // Generate JWT
    const payload: JwtPayload = {
      sub: result.authUser.id,
      email: registerDto.email,
      role: 'viewer',
      org_id: defaultOrg.id,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: 900, // 15 minutes
    });

    return {
      access_token: accessToken,
      user: {
        id: result.authUser.id,
        email: registerDto.email,
        full_name: registerDto.full_name || null,
        role: 'viewer',
        org_id: defaultOrg.id,
      },
    };
  }

  async getProfile(userId: string): Promise<AuthUser> {
    const user = await this.prisma.public_users.findUnique({
      where: { id: userId },
      include: { orgs: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      org_id: user.org_id,
    };
  }

  async updatePassword(userId: string, newPassword: string): Promise<void> {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    await this.prisma.auth_users.update({
      where: { id: userId },
      data: { encrypted_password: hashedPassword },
    });
  }
}
