import { Module, forwardRef } from '@nestjs/common';
import { AdminController, PublicSettingsController } from './admin.controller';
import { AdminService } from './admin.service';
import { OrdersModule } from '../orders/orders.module';
import { OwnerAccountModule } from '../owner-account/owner-account.module';

@Module({
  imports: [OrdersModule, forwardRef(() => OwnerAccountModule)],
  controllers: [AdminController, PublicSettingsController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
