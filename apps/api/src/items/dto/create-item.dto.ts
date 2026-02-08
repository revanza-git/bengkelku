import { IsString, IsBoolean, IsOptional, IsUUID, IsNumber, Min } from 'class-validator';

export class CreateItemDto {
  @IsString()
  sku: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsBoolean()
  is_stock?: boolean;

  @IsOptional()
  @IsString()
  uom?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  base_cost?: number;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  min_stock?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  reorder_point?: number;

  @IsOptional()
  @IsUUID()
  tax_code_id?: string;
}
