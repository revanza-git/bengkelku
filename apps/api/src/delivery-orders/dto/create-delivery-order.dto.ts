import { IsString, IsOptional, IsUUID, IsDateString, IsArray, ValidateNested, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDeliveryOrderLineDto {
  @IsOptional()
  @IsUUID()
  po_line_id?: string;

  @IsUUID()
  item_id: string;

  @IsNumber()
  @Min(0)
  qty_ordered: number;

  @IsNumber()
  @Min(0)
  qty_delivered: number;

  @IsUUID()
  warehouse_id: string;
}

export class CreateDeliveryOrderDto {
  @IsUUID()
  purchase_order_id: string;

  @IsOptional()
  @IsUUID()
  customer_id?: string;

  @IsDateString()
  delivery_date: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDeliveryOrderLineDto)
  lines: CreateDeliveryOrderLineDto[];
}
