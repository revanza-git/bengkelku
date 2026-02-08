import { IsString, IsOptional, IsUUID, IsDateString, IsEnum } from 'class-validator';

export class UpdatePurchaseOrderDto {
  @IsOptional()
  @IsUUID()
  supplier_id?: string;

  @IsOptional()
  @IsUUID()
  customer_id?: string;

  @IsOptional()
  @IsDateString()
  eta_date?: string;

  @IsOptional()
  @IsDateString()
  planned_delivery_start?: string;

  @IsOptional()
  @IsDateString()
  actual_delivery_date?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  status?: string;
}
