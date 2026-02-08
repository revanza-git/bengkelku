import { IsString, IsOptional, IsEmail, IsNumber, Min } from 'class-validator';

export class CreateSupplierDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  lead_time_days?: number;

  @IsOptional()
  @IsString()
  npwp?: string;
}
