import { IsString, IsOptional, IsDateString } from 'class-validator';

export class UpdateDeliveryOrderDto {
  @IsOptional()
  @IsDateString()
  delivery_date?: string;

  @IsOptional()
  @IsDateString()
  actual_delivery_date?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

export class ProcessDeliveryDto {
  @IsDateString()
  actual_delivery_date: string;
}
