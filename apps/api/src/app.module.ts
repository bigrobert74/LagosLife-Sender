import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { PrismaModule } from './prisma/prisma.module';
import { PackagesModule } from './packages/packages.module';
import { OrdersModule } from './orders/orders.module';
import { AdminModule } from './admin/admin.module';
import { GameModule } from './game/game.module';
import { OwnerAccountModule } from './owner-account/owner-account.module';

@Module({
  imports: [
    PrismaModule,
    DatabaseModule,
    PackagesModule,
    OrdersModule,
    AdminModule,
    GameModule,
    OwnerAccountModule,
  ],
})
export class AppModule {}
