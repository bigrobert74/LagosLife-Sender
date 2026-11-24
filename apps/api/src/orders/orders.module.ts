import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { BankSettingsService } from './bank-settings.service';
import { PhoneNotificationsService } from './phone-notifications.service';
import { PackagesModule } from '../packages/packages.module';

@Module({
  imports: [PackagesModule],
  controllers: [OrdersController],
  providers: [OrdersService, BankSettingsService, PhoneNotificationsService],
  exports: [OrdersService, BankSettingsService, PhoneNotificationsService],
})
export class OrdersModule {}
