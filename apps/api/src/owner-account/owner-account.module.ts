import { Module, forwardRef } from '@nestjs/common';
import { CryptoService } from './crypto.service';
import { OwnerAccountService } from './owner-account.service';
import { FulfillmentService } from './fulfillment.service';
import { OwnerAccountController } from './owner-account.controller';
import { GameModule } from '../game/game.module';
import { OrdersModule } from '../orders/orders.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [GameModule, OrdersModule, PrismaModule],
  controllers: [OwnerAccountController],
  providers: [CryptoService, OwnerAccountService, FulfillmentService],
  exports: [CryptoService, OwnerAccountService, FulfillmentService],
})
export class OwnerAccountModule {}
