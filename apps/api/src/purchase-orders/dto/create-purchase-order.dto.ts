import { IsString, IsOptional, IsUUID, IsDateString, IsArray, ValidateNested, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePoLineDto {
  @IsUUID()
  item_id: string;

  @IsNumber()
  @Min(0)
  qty: number;

  @IsNumber()
  @Min(0)
  unit_cost: number;
}

export class CreatePurchaseOrderDto {
  @IsUUID()
  supplier_id: string;

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
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePoLineDto)
  lines: CreatePoLineDto[];
}
