import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsString()
  full_name?: string;

  @IsIn(['admin', 'storekeeper', 'technician', 'viewer', 'procurement', 'warehouse', 'finance'])
  role: string;
}
