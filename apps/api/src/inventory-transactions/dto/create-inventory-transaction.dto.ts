import { IsIn, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateInventoryTransactionDto {
  @IsUUID()
  item_id: string;

  @IsUUID()
  warehouse_id: string;

  @IsIn(['GRN', 'SHIP_PO', 'ADJ_PLUS', 'ADJ_MINUS', 'TRANSFER', 'ADJ+', 'ADJ-'])
  trx_type: string;

  @IsOptional()
  @IsString()
  ref_table?: string;

  @IsOptional()
  @IsUUID()
  ref_id?: string;

  @IsNumber()
  qty: number;

  @IsOptional()
  @IsNumber()
  unit_cost?: number;
}
