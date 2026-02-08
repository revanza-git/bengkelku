import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  full_name?: string;

  @IsOptional()
  @IsIn(['admin', 'storekeeper', 'technician', 'viewer', 'procurement', 'warehouse', 'finance'])
  role?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
