import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

// Feature modules
import { ItemsModule } from './items/items.module';
import { CustomersModule } from './customers/customers.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { WarehousesModule } from './warehouses/warehouses.module';
import { PurchaseOrdersModule } from './purchase-orders/purchase-orders.module';
import { DeliveryOrdersModule } from './delivery-orders/delivery-orders.module';
import { InventoryModule } from './inventory/inventory.module';
import { InventoryTransactionsModule } from './inventory-transactions/inventory-transactions.module';
import { InvoicesModule } from './invoices/invoices.module';
import { CashflowEntriesModule } from './cashflow-entries/cashflow-entries.module';
import { ReportsModule } from './reports/reports.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule,
    // Feature modules
    ItemsModule,
    CustomersModule,
    SuppliersModule,
    WarehousesModule,
    PurchaseOrdersModule,
    DeliveryOrdersModule,
    InventoryModule,
    InventoryTransactionsModule,
    InvoicesModule,
    CashflowEntriesModule,
    ReportsModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Apply JWT auth guard globally - use @Public() decorator to skip auth
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
