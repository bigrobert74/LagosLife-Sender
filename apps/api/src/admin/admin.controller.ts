import { Controller, Get, Post, Patch, Param, Body, Query, Headers, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';
import { AdminService } from './admin.service';

@ApiTags('Admin Control Centre')
@Controller('api/v1/admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // -------------------------------------------------------------
  // AUTHENTICATION & SESSION
  // -------------------------------------------------------------
  @Post('auth/login')
  @ApiOperation({ summary: 'Authenticate administrator and create secure session' })
  async loginAdmin(@Body() body: { usernameOrEmail: string; password?: string }) {
    const data = await this.adminService.loginAdmin(body);
    return { success: true, data };
  }

  @Post('auth/logout')
  @ApiOperation({ summary: 'Terminate administrator session' })
  async logoutAdmin(@Body() body: { adminUsername?: string }) {
    const data = await this.adminService.logoutAdmin(body?.adminUsername || 'lead_admin');
    return { success: true, data };
  }

  @Get('auth/me')
  @ApiOperation({ summary: 'Get currently authenticated administrator profile' })
  async getCurrentAdmin(@Headers('authorization') authHeader?: string) {
    const data = await this.adminService.getCurrentAdmin(authHeader);
    return { success: true, data };
  }

  // -------------------------------------------------------------
  // DASHBOARD & ANALYTICS
  // -------------------------------------------------------------
  @Get('dashboard/overview')
  @ApiOperation({ summary: 'Get executive dashboard statistics & KPIs' })
  async getDashboardOverview() {
    const data = await this.adminService.getDashboardOverview();
    return { success: true, data };
  }

  @Get('dashboard/analytics')
  @ApiOperation({ summary: 'Get revenue, orders & delivery trend series' })
  async getDashboardAnalytics() {
    const data = await this.adminService.getDashboardAnalytics();
    return { success: true, data };
  }

  @Get('dashboard/alerts')
  @ApiOperation({ summary: 'Get active alerts (low stock, pending verifications, failures)' })
  async getDashboardAlerts() {
    const data = await this.adminService.getDashboardAlerts();
    return { success: true, data };
  }

  // -------------------------------------------------------------
  // ORDERS MANAGEMENT
  // -------------------------------------------------------------
  @Get('orders')
  @ApiOperation({ summary: 'List all orders with status and search filters' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  async getOrders(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const data = await this.adminService.getOrders({ status, search, page, limit });
    return { success: true, data };
  }

  @Get('orders/:orderNumber')
  @ApiOperation({ summary: 'Get complete order details, timeline, and receipts' })
  async getOrderById(@Param('orderNumber') orderNumber: string) {
    const data = await this.adminService.getOrderById(orderNumber);
    return { success: true, data };
  }

  @Post('orders/:orderNumber/cancel')
  @ApiOperation({ summary: 'Cancel an order with a recorded reason' })
  async cancelOrder(
    @Param('orderNumber') orderNumber: string,
    @Body() body: { reason: string },
  ) {
    const data = await this.adminService.cancelOrder(orderNumber, body.reason, 'lead_admin');
    return { success: true, data };
  }

  // -------------------------------------------------------------
  // PAYMENT VERIFICATION
  // -------------------------------------------------------------
  @Get('payments/pending')
  @ApiOperation({ summary: 'Queue of payments submitted by customers awaiting bank check' })
  async getPendingPayments() {
    const data = await this.adminService.getPendingPayments();
    return { success: true, data };
  }

  @Post('orders/:orderNumber/verify-payment')
  @ApiOperation({ summary: 'Approve payment after confirming actual bank credit' })
  async verifyPayment(
    @Param('orderNumber') orderNumber: string,
    @Body() body: { confirmedAmount: number; bankStatementReference: string; adminNotes?: string },
  ) {
    const data = await this.adminService.verifyPayment(orderNumber, body, 'lead_admin');
    return { success: true, data };
  }

  @Post('orders/:orderNumber/reject-payment')
  @ApiOperation({ summary: 'Reject payment with reason code and notes' })
  async rejectPayment(
    @Param('orderNumber') orderNumber: string,
    @Body() body: { rejectionReason: string; adminNotes: string },
  ) {
    const data = await this.adminService.rejectPayment(orderNumber, body, 'lead_admin');
    return { success: true, data };
  }

  // -------------------------------------------------------------
  // CURRENCY DELIVERY MANAGEMENT
  // -------------------------------------------------------------
  @Get('deliveries')
  @ApiOperation({ summary: 'Fulfillment queue of paid orders ready for in-game delivery' })
  async getDeliveryQueue() {
    const data = await this.adminService.getDeliveryQueue();
    return { success: true, data };
  }

  @Post('orders/:orderNumber/start-delivery')
  @ApiOperation({ summary: 'Lock order to DELIVERY_PROCESSING state' })
  async startDelivery(@Param('orderNumber') orderNumber: string) {
    const data = await this.adminService.startDelivery(orderNumber, 'runner_boss');
    return { success: true, data };
  }

  @Post('orders/:orderNumber/complete-delivery')
  @ApiOperation({ summary: 'Confirm in-game cash was sent from owner character account' })
  async completeDelivery(
    @Param('orderNumber') orderNumber: string,
    @Body() body: { inGameTransactionRef?: string; deliveryNotes?: string },
  ) {
    const data = await this.adminService.completeDelivery(orderNumber, body, 'runner_boss');
    return { success: true, data };
  }

  @Post('orders/:orderNumber/fail-delivery')
  @ApiOperation({ summary: 'Record failed delivery attempt (e.g. customer settings blocked)' })
  async failDelivery(
    @Param('orderNumber') orderNumber: string,
    @Body() body: { failureReason: string; notes?: string },
  ) {
    const data = await this.adminService.failDelivery(orderNumber, body, 'runner_boss');
    return { success: true, data };
  }

  // -------------------------------------------------------------
  // INVENTORY LEDGER & OWNER GAME ACCOUNT
  // -------------------------------------------------------------
  @Get('inventory')
  @ApiOperation({ summary: 'Inventory summary: available, reserved, and threshold' })
  async getInventorySummary() {
    const data = await this.adminService.getInventorySummary();
    return { success: true, data };
  }

  @Get('inventory/ledger')
  @ApiOperation({ summary: 'Audit ledger of all virtual currency deposits, debits, and reservations' })
  async getInventoryLedger() {
    const data = await this.adminService.getInventoryLedger();
    return { success: true, data };
  }

  @Post('inventory/adjust')
  @ApiOperation({ summary: 'Manually adjust recorded owner game cash balance' })
  async adjustInventory(@Body() body: { type: 'INCREASE' | 'DECREASE'; amount: string; reason: string }) {
    const data = await this.adminService.adjustInventory(body, 'lead_admin');
    return { success: true, data };
  }

  @Post('inventory/reconcile')
  @ApiOperation({ summary: 'Reconcile recorded balance against physical in-game game balance' })
  async reconcileInventory(@Body() body: { currentPhysicalGameBalance: string; notes?: string }) {
    const data = await this.adminService.reconcileInventory(body, 'lead_admin');
    return { success: true, data };
  }

  @Get('owner-account')
  @ApiOperation({ summary: 'Get configured owner Lagos Life game account' })
  async getOwnerAccount() {
    const summary = await this.adminService.getInventorySummary();
    return { success: true, data: summary.ownerAccount };
  }

  @Patch('owner-account')
  @ApiOperation({ summary: 'Update owner Lagos Life account metadata' })
  async updateOwnerAccount(@Body() body: any) {
    const data = await this.adminService.updateOwnerAccountSettings(body, 'lead_admin');
    return { success: true, data };
  }

  // -------------------------------------------------------------
  // BANK ACCOUNT SETTINGS
  // -------------------------------------------------------------
  @Get('settings/bank-account')
  @ApiOperation({ summary: 'Get business bank details configured for customer checkout' })
  async getBankAccountSettings() {
    const data = await this.adminService.getBankAccountSettings();
    return { success: true, data };
  }

  @Patch('settings/bank-account')
  @ApiOperation({ summary: 'Update bank details shown on customer checkout' })
  async updateBankAccountSettings(@Body() body: any) {
    const data = await this.adminService.updateBankAccountSettings(body, 'lead_admin');
    return { success: true, data };
  }

  // -------------------------------------------------------------
  // CUSTOMER MANAGEMENT
  // -------------------------------------------------------------
  @Get('customers')
  @ApiOperation({ summary: 'List all customer profiles and spending records' })
  async getCustomers() {
    const data = await this.adminService.getCustomers();
    return { success: true, data };
  }

  // -------------------------------------------------------------
  // SUPPORT TICKETS
  // -------------------------------------------------------------
  @Get('support/tickets')
  @ApiOperation({ summary: 'List customer support inquiries and disputes' })
  async getSupportTickets() {
    const data = await this.adminService.getSupportTickets();
    return { success: true, data };
  }

  @Post('support/tickets/:id/reply')
  @ApiOperation({ summary: 'Reply to customer support ticket' })
  async replySupportTicket(@Param('id') id: string, @Body() body: { text: string }) {
    const data = await this.adminService.replySupportTicket(id, body.text, 'lead_admin');
    return { success: true, data };
  }

  // -------------------------------------------------------------
  // PROMOTIONS & COUPONS
  // -------------------------------------------------------------
  @Get('coupons')
  @ApiOperation({ summary: 'List promotional coupons and usage' })
  async getCoupons() {
    const data = await this.adminService.getCoupons();
    return { success: true, data };
  }

  @Post('coupons')
  @ApiOperation({ summary: 'Create new promo coupon code' })
  async createCoupon(@Body() body: any) {
    const data = await this.adminService.createCoupon(body, 'lead_admin');
    return { success: true, data };
  }

  // -------------------------------------------------------------
  // STAFF, AUDIT LOGS, SYSTEM SETTINGS & HEALTH
  // -------------------------------------------------------------
  @Get('staff')
  @ApiOperation({ summary: 'List administrators and staff users' })
  async getStaff() {
    const data = await this.adminService.getStaff();
    return { success: true, data };
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'Immutable audit logs of all administrative actions' })
  async getAuditLogs() {
    const data = await this.adminService.getAuditLogs();
    return { success: true, data };
  }

  @Get('settings')
  @ApiOperation({ summary: 'Get general platform settings' })
  async getSystemSettings() {
    const data = await this.adminService.getSystemSettings();
    return { success: true, data };
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Update platform settings (e.g. maintenance mode, limits)' })
  async updateSystemSettings(@Body() body: any) {
    const data = await this.adminService.updateSystemSettings(body, 'lead_admin');
    return { success: true, data };
  }

  @Get('health')
  @ApiOperation({ summary: 'System diagnostics and infrastructure health' })
  async getSystemHealth() {
    const data = await this.adminService.getSystemHealth();
    return { success: true, data };
  }

  @Post('system/clear-database')
  @ApiOperation({ summary: 'Clear orders, customers, fulfillment history, and reset ledger (requires admin credentials)' })
  async clearDatabase(
    @Body() body: { usernameOrEmail?: string; adminUsername?: string; password?: string },
    @Req() req: any,
  ) {
    const data = await this.adminService.clearDatabase(body, req?.ip || '127.0.0.1');
    return { success: true, data };
  }

  @Get('search')
  @ApiOperation({ summary: 'Global search across orders, customers, and payment references' })
  async globalSearch(@Query('q') q: string) {
    const data = await this.adminService.globalSearch(q || '');
    return { success: true, data };
  }

  // -------------------------------------------------------------
  // PHONE NOTIFICATIONS (Instant iOS & Android Push via ntfy.sh)
  // -------------------------------------------------------------
  @Get('notifications/settings')
  @ApiOperation({ summary: 'Get phone push notification configuration' })
  async getNotificationSettings() {
    const data = await this.adminService.getPhoneNotificationSettings();
    return { success: true, data };
  }

  @Patch('notifications/settings')
  @ApiOperation({ summary: 'Update phone push notification configuration' })
  async updateNotificationSettings(@Body() body: any) {
    const data = await this.adminService.updatePhoneNotificationSettings(body, 'lead_admin');
    return { success: true, data };
  }

  @Post('notifications/test-phone-push')
  @ApiOperation({ summary: 'Trigger a test live notification to the admin phone' })
  async sendTestPhonePush() {
    const data = await this.adminService.sendTestPhoneNotification();
    return { success: true, data };
  }
}
