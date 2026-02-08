import { Module } from '@nestjs/common';
import { DeliveryOrdersController } from './delivery-orders.controller';
import { DeliveryOrdersService } from './delivery-orders.service';

@Module({
  controllers: [DeliveryOrdersController],
  providers: [DeliveryOrdersService],
  exports: [DeliveryOrdersService],
})
export class DeliveryOrdersModule {}
