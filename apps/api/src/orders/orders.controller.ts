import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { OrdersService } from './orders.service';

@ApiTags('Orders & Checkout')
@Controller('api/v1/orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Initialize a new order and snapshot bank details' })
  async createOrder(
    @Body()
    body: {
      packageId?: string;
      customAmount?: number | string;
      gameUsername: string;
      customerEmail?: string;
      customerPhone?: string;
    },
  ) {
    const result = await this.ordersService.createOrder(body);
    return { success: true, data: result };
  }

  @Get('bank-instructions')
  @ApiOperation({ summary: 'Retrieve dynamic live bank account details for customer storefront checkout' })
  async getLiveBankInstructions() {
    const liveBank = this.ordersService.getLiveBankSettings();
    return {
      success: true,
      data: liveBank,
    };
  }

  @Get(':orderNumber')
  @ApiOperation({ summary: 'Get order details and live payment status' })
  async getOrder(@Param('orderNumber') orderNumber: string) {
    const order = await this.ordersService.getOrderByNumber(orderNumber);
    return { success: true, data: order };
  }

  @Get(':orderNumber/payment-instructions')
  @ApiOperation({ summary: 'Retrieve dynamic bank account details for order payment' })
  async getPaymentInstructions(@Param('orderNumber') orderNumber: string) {
    const order = await this.ordersService.getOrderByNumber(orderNumber);
    return {
      success: true,
      data: {
        orderNumber: order.orderNumber,
        amountToPay: order.totalNairaAmount,
        bankName: order.bankNameSnapshot,
        accountName: order.accountNameSnapshot,
        accountNumber: order.accountNumberSnapshot,
        referenceCode: order.orderNumber,
        expiresAt: order.expiresAt,
        status: order.status,
      },
    };
  }

  @Post(':orderNumber/submit-payment')
  @ApiOperation({ summary: 'Submit manual bank transfer reference and proof' })
  async submitPayment(
    @Param('orderNumber') orderNumber: string,
    @Body()
    body: {
      senderAccountName: string;
      senderBankName: string;
      transactionReference: string;
      receiptStorageKey?: string;
      notes?: string;
    },
  ) {
    const result = await this.ordersService.submitPayment(orderNumber, body);
    return { success: true, data: result };
  }
}
