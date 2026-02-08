import { IsDateString, IsIn, IsOptional, IsUUID } from 'class-validator';

export class StockMovementsQueryDto {
  @IsOptional()
  @IsUUID()
  item_id?: string;

  @IsOptional()
  @IsUUID()
  warehouse_id?: string;

  @IsOptional()
  @IsIn(['GRN', 'SHIP_PO', 'ADJ_PLUS', 'ADJ_MINUS', 'TRANSFER', 'ADJ+', 'ADJ-'])
  trx_type?: string;

  @IsOptional()
  @IsDateString()
  date_from?: string;

  @IsOptional()
  @IsDateString()
  date_to?: string;
}
