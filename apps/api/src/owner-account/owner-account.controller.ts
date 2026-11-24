import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { OwnerAccountService } from './owner-account.service';
import { FulfillmentService, FulfillmentSettingsDto } from './fulfillment.service';

@Controller('api/v1/admin')
export class OwnerAccountController {
  constructor(
    private readonly ownerAccountService: OwnerAccountService,
    private readonly fulfillmentService: FulfillmentService,
  ) {}

  // -------------------------------------------------------------
  // Owner Account Management Endpoints
  // -------------------------------------------------------------
  @Post('owner-account/connect')
  @HttpCode(HttpStatus.OK)
  async connectAccount(
    @Body()
    body: {
      username: string;
      password?: string;
      action?: string;
      challenge?: string;
      code?: string;
      accountIdentifier?: string;
      description?: string;
      pin: string;
      apiToken?: string;
    },
  ) {
    const res = await this.ownerAccountService.connectAccount(body);
    return { success: true, data: res };
  }

  @Post('owner-account/login-connect')
  @HttpCode(HttpStatus.OK)
  async loginAndConnect(
    @Body()
    body: {
      username: string;
      password?: string;
      action?: string;
      challenge?: string;
      code?: string;
      accountIdentifier?: string;
      description?: string;
      pin: string;
    },
  ) {
    const res = await this.ownerAccountService.loginAndConnect(body);
    return { success: true, data: res };
  }

  @Post('owner-account/test-connection')
  @HttpCode(HttpStatus.OK)
  async testConnection() {
    const res = await this.ownerAccountService.testConnection();
    return { success: true, data: res };
  }

  @Get('owner-account/status')
  async getStatus() {
    const res = await this.ownerAccountService.getStatus();
    return { success: true, data: res };
  }

  @Get('owner-account/balance')
  async getBalance() {
    const res = await this.ownerAccountService.getBalance();
    return { success: true, data: res };
  }

  @Post('owner-account/sync-balance')
  @HttpCode(HttpStatus.OK)
  async syncBalance() {
    const res = await this.ownerAccountService.syncBalance();
    return { success: true, data: res };
  }

  @Patch('owner-account/credentials')
  async updateCredentials(
    @Body()
    body: {
      pin?: string;
      apiToken?: string;
      description?: string;
    },
  ) {
    const res = await this.ownerAccountService.updateCredentials(body);
    return { success: true, data: res };
  }

  @Delete('owner-account/disconnect')
  async disconnectAccountDelete() {
    const res = await this.ownerAccountService.disconnectAccount();
    return { success: true, data: res };
  }

  @Post('owner-account/disconnect')
  async disconnectAccountPost() {
    const res = await this.ownerAccountService.disconnectAccount();
    return { success: true, data: res };
  }

  @Get('owner-account/logs')
  async getLogs() {
    const res = this.ownerAccountService.getLogs();
    return { success: true, data: res };
  }

  // -------------------------------------------------------------
  // Automatic Fulfillment Endpoints
  // -------------------------------------------------------------
  @Get('fulfillment/settings')
  async getSettings() {
    const res = this.fulfillmentService.getSettings();
    return { success: true, data: res };
  }

  @Patch('fulfillment/settings')
  async updateSettings(@Body() body: Partial<FulfillmentSettingsDto>) {
    const res = this.fulfillmentService.updateSettings(body);
    return { success: true, data: res };
  }

  @Post('fulfillment/emergency-shutdown')
  @HttpCode(HttpStatus.OK)
  async emergencyShutdown(@Body() body: { reason?: string }) {
    const res = this.fulfillmentService.triggerEmergencyShutdown(body?.reason);
    return { success: true, data: res };
  }

  @Post('fulfillment/resume')
  @HttpCode(HttpStatus.OK)
  async resumeOperations() {
    const res = this.fulfillmentService.resumeOperations();
    return { success: true, data: res };
  }

  @Get('fulfillment/queue')
  async getQueue() {
    const res = await this.fulfillmentService.getQueue();
    return { success: true, data: res };
  }

  @Post('fulfillment/retry/:orderNumber')
  @HttpCode(HttpStatus.OK)
  async retryJob(@Param('orderNumber') orderNumber: string) {
    const res = await this.fulfillmentService.retryJob(orderNumber);
    return { success: true, data: res };
  }

  @Post('fulfillment/dispatch/:orderNumber')
  @HttpCode(HttpStatus.OK)
  async dispatchOrder(@Param('orderNumber') orderNumber: string) {
    const res = await this.fulfillmentService.dispatchOrder(orderNumber);
    return { success: true, data: res };
  }

  @Post('fulfillment/cancel/:orderNumber')
  @HttpCode(HttpStatus.OK)
  async cancelJob(@Param('orderNumber') orderNumber: string) {
    const res = this.fulfillmentService.cancelJob(orderNumber);
    return { success: true, data: res };
  }

  @Get('fulfillment/transactions')
  async getTransactions() {
    const res = this.fulfillmentService.getTransactions();
    return { success: true, data: res };
  }
}
