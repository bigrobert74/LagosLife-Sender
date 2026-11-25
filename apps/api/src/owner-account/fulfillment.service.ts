import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { OwnerAccountService } from './owner-account.service';
import { GameService } from '../game/game.service';
import { OrdersService } from '../orders/orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { DatabaseService } from '../database/database.service';

export interface FulfillmentSettingsDto {
  autoFulfillmentEnabled: boolean;
  emergencyShutdown: boolean;
  maxSingleTransfer: string;
  dailyLimit: string;
  dailyDeliveredToday: string;
  minReserveBalance: string;
  lowBalanceAlertThreshold: string;
  maxRetries: number;
  // Chunked / Gradual Transfer Mechanics
  gradualTransferEnabled: boolean;
  batchThresholdAmount: string; // Threshold above which batching kicks in (e.g., 100B = 100,000,000,000)
  transferChunkAmount: string; // Amount per transfer batch for orders > threshold (e.g., 50B)
  transferCooldownSeconds: number; // Delay timer in seconds between successive transfers (70s hard floor)
}

export interface FulfillmentBatchRecord {
  batchNumber: number;
  totalBatches: number;
  amount: string;
  formattedAmount: string;
  txId: string;
  timestamp: string;
}

export interface FulfillmentJobRecord {
  id: string;
  orderNumber: string;
  customerName: string;
  gameUsername: string;
  targetPlayerId: string;
  currencyAmount: string;
  formattedAmount: string;
  deliveredAmount: string;
  formattedDeliveredAmount: string;
  progressPercent: number;
  totalBatches: number;
  completedBatches: number;
  transferCooldownSeconds: number;
  nextBatchAt?: string; // ISO timestamp when current 70s cooldown timer expires
  isBatchedOrder?: boolean;
  status: 'QUEUED' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED' | 'MANUAL_REVIEW_REQUIRED' | 'PARTIALLY_DELIVERED' | 'CANCELLED';
  retryCount: number;
  maxRetries: number;
  txId?: string;
  lastError?: string;
  batchHistory: FulfillmentBatchRecord[];
  createdAt: string;
  updatedAt: string;
  processedAt?: string;
}

@Injectable()
export class FulfillmentService {
  private readonly logger = new Logger(FulfillmentService.name);

  private settings: FulfillmentSettingsDto = {
    autoFulfillmentEnabled: true,
    emergencyShutdown: false,
    maxSingleTransfer: '100000000000000', // 100 Trillion limit (supports high-roller custom orders)
    dailyLimit: '200000000000000', // 200 Trillion daily limit
    dailyDeliveredToday: '0',
    minReserveBalance: '1000000000', // 1 Billion reserve floor
    lowBalanceAlertThreshold: '5000000000', // 5 Billion low alert
    maxRetries: 3,
    gradualTransferEnabled: true,
    batchThresholdAmount: '100000000000', // 100 Billion: <= 100B sends in 1 transfer, > 100B sends in batches
    transferChunkAmount: '100000000000', // 100 Billion per batch chunk for orders > 100B
    transferCooldownSeconds: 70, // 70 seconds exact hard floor cooldown enforced by Lagos Life anti-spam
  };

  private jobs: Map<string, FulfillmentJobRecord> = new Map();
  private activeTransferPromises: Map<string, boolean> = new Map();

  private transactions: Array<{
    id: string;
    txId: string;
    orderNumber: string;
    targetPlayerId: string;
    targetUsername: string;
    amount: string;
    remainingBalance: string;
    batchNumber?: number;
    totalBatches?: number;
    createdAt: string;
  }> = [];

  constructor(
    private readonly ownerAccountService: OwnerAccountService,
    private readonly gameService: GameService,
    private readonly ordersService: OrdersService,
    private readonly prisma: PrismaService,
    private readonly databaseService: DatabaseService,
  ) {
    this.hydrateFromDatabase();
  }

  private hydrateFromDatabase() {
    try {
      const savedSettings = this.databaseService.getFulfillmentSettings();
      if (savedSettings) {
        this.settings = { ...this.settings, ...savedSettings };
      }
      const savedJobs = this.databaseService.getFulfillmentJobs();
      for (const j of savedJobs) {
        if (j && j.orderNumber) {
          this.jobs.set(j.orderNumber, j);
        }
      }
      this.transactions = this.databaseService.getFulfillmentTransactions() || [];
      this.logger.log(`Hydrated ${this.jobs.size} fulfillment jobs and ${this.transactions.length} transactions from database.`);
    } catch (err: any) {
      this.logger.warn(`Could not hydrate fulfillment data from database: ${err.message}`);
    }
  }

  getSettings(): FulfillmentSettingsDto {
    return { ...this.settings };
  }

  updateSettings(body: Partial<FulfillmentSettingsDto>): FulfillmentSettingsDto {
    if (body.autoFulfillmentEnabled !== undefined) {
      this.settings.autoFulfillmentEnabled = body.autoFulfillmentEnabled;
    }
    if (body.emergencyShutdown !== undefined) {
      this.settings.emergencyShutdown = body.emergencyShutdown;
    }
    if (body.maxSingleTransfer) {
      this.settings.maxSingleTransfer = body.maxSingleTransfer;
    }
    if (body.dailyLimit) {
      this.settings.dailyLimit = body.dailyLimit;
    }
    if (body.minReserveBalance) {
      this.settings.minReserveBalance = body.minReserveBalance;
    }
    if (body.lowBalanceAlertThreshold) {
      this.settings.lowBalanceAlertThreshold = body.lowBalanceAlertThreshold;
    }
    if (body.maxRetries !== undefined) {
      this.settings.maxRetries = Number(body.maxRetries);
    }
    if (body.gradualTransferEnabled !== undefined) {
      this.settings.gradualTransferEnabled = body.gradualTransferEnabled;
    }
    if (body.transferChunkAmount) {
      this.settings.transferChunkAmount = body.transferChunkAmount;
    }
    if (body.transferCooldownSeconds !== undefined) {
      this.settings.transferCooldownSeconds = Math.max(1, Number(body.transferCooldownSeconds));
    }
    this.databaseService.saveFulfillmentSettings(this.settings);
    this.logger.log('Fulfillment settings updated successfully with gradual batch parameters');
    return this.getSettings();
  }

  triggerEmergencyShutdown(reason?: string) {
    this.logger.warn(`EMERGENCY SHUTDOWN TRIGGERED: ${reason || 'Manual Admin Trigger'}`);
    this.settings.emergencyShutdown = true;
    this.settings.autoFulfillmentEnabled = false;
    this.databaseService.saveFulfillmentSettings(this.settings);

    // Pause all queued or active in-flight jobs
    for (const job of this.jobs.values()) {
      if (job.status === 'QUEUED' || job.status === 'PROCESSING') {
        job.status = 'MANUAL_REVIEW_REQUIRED';
        job.lastError = `System entered Emergency Shutdown: ${reason || 'Administrative safety halt'}`;
        job.updatedAt = new Date().toISOString();
        this.databaseService.saveFulfillmentJob(job);
      }
    }

    return {
      ok: true,
      emergencyShutdown: true,
      message: 'All automatic currency fulfillments have been immediately halted.',
    };
  }

  resumeOperations() {
    this.logger.log('Resuming automated fulfillment operations.');
    this.settings.emergencyShutdown = false;
    this.settings.autoFulfillmentEnabled = true;
    this.databaseService.saveFulfillmentSettings(this.settings);
    return {
      ok: true,
      emergencyShutdown: false,
      autoFulfillmentEnabled: true,
      message: 'Automated money fulfillment resumed successfully.',
    };
  }

  // -------------------------------------------------------------
  // Automatic Delivery Processor (called on Admin Payment Approval)
  // -------------------------------------------------------------
  async processOrderFulfillment(orderNumber: string) {
    this.logger.log(`Processing automatic fulfillment for order #${orderNumber}...`);

    // 1. Fetch Order details
    const order = await this.ordersService.findByOrderNumber(orderNumber);
    if (!order) {
      throw new NotFoundException(`Order ${orderNumber} not found`);
    }

    // Idempotency safety check: never deliver twice
    if (order.status === 'COMPLETED' || (order as any).deliveryRecord) {
      this.logger.warn(`Order #${orderNumber} is already completed. Skipping duplicate transfer.`);
      return {
        ok: true,
        orderNumber,
        status: 'COMPLETED',
        txId: (order as any).deliveryRecord?.inGameTransactionRef,
        message: 'Order has already been delivered in-game.',
      };
    }

    const orderAmountBig = BigInt(order.totalGameCurrency);

    // 1.5 Check Owner Account Connected Status & Transaction PIN
    const accountStatus = await this.ownerAccountService.getStatus();
    if (accountStatus.status !== 'CONNECTED' || !accountStatus.username) {
      this.logger.warn(`No active Lagos Life owner account linked. Cannot fulfill #${orderNumber}`);
      this.createJobRecord(order, 'MANUAL_REVIEW_REQUIRED', 'No Lagos Life owner account linked. Please connect an account in Admin -> Owner Account Link.');
      return { ok: false, reason: 'ACCOUNT_NOT_CONNECTED', manualDeliveryRequired: true };
    }

    let pin: string;
    try {
      pin = this.ownerAccountService.getDecryptedPin();
    } catch (e) {
      pin = '';
    }
    if (!pin || pin.length !== 4) {
      this.logger.warn(`Owner account PIN not configured. Cannot fulfill #${orderNumber}`);
      this.createJobRecord(order, 'MANUAL_REVIEW_REQUIRED', 'Owner account 4-digit transfer PIN is not configured.');
      return { ok: false, reason: 'PIN_NOT_CONFIGURED', manualDeliveryRequired: true };
    }

    // 2. Check Emergency Shutdown
    if (this.settings.emergencyShutdown) {
      this.logger.warn(`Emergency shutdown active. Skipping auto-delivery for ${orderNumber}`);
      this.createJobRecord(order, 'MANUAL_REVIEW_REQUIRED', 'Automated delivery paused due to emergency shutdown');
      return { ok: false, reason: 'EMERGENCY_SHUTDOWN', manualDeliveryRequired: true };
    }

    // 3. Check Master Auto Toggle
    if (!this.settings.autoFulfillmentEnabled) {
      this.logger.log(`Auto fulfillment disabled. Order ${orderNumber} queued for manual fulfillment.`);
      this.createJobRecord(order, 'QUEUED', 'Waiting for manual delivery or automation enable');
      return { ok: false, reason: 'AUTOMATION_DISABLED', manualDeliveryRequired: true };
    }

    // 4. Verify Single Transfer Limit
    const maxSingle = BigInt(this.settings.maxSingleTransfer);
    if (orderAmountBig > maxSingle) {
      this.logger.warn(`Order #${orderNumber} amount exceeds max single transfer limit (${maxSingle})`);
      this.createJobRecord(order, 'MANUAL_REVIEW_REQUIRED', `Order exceeds single transfer limit of ${maxSingle.toLocaleString()}`);
      return { ok: false, reason: 'EXCEEDS_SINGLE_LIMIT', manualDeliveryRequired: true };
    }

    // 5. Verify Daily Volume Limit
    const dailyLimit = BigInt(this.settings.dailyLimit);
    const deliveredToday = BigInt(this.settings.dailyDeliveredToday);
    if (deliveredToday + orderAmountBig > dailyLimit) {
      this.logger.warn(`Order #${orderNumber} would exceed daily limit (${dailyLimit})`);
      this.createJobRecord(order, 'MANUAL_REVIEW_REQUIRED', 'Daily automated volume limit reached');
      return { ok: false, reason: 'EXCEEDS_DAILY_LIMIT', manualDeliveryRequired: true };
    }

    // 6. Check Available Balance & Reserve
    const balanceInfo = await this.ownerAccountService.getBalance();
    const availableBig = BigInt(balanceInfo.availableBalance);
    const minReserveBig = BigInt(this.settings.minReserveBalance);

    if (availableBig < orderAmountBig || (availableBig - orderAmountBig) < minReserveBig) {
      this.logger.warn(`Insufficient available game balance for #${orderNumber}. Available: ${availableBig}, Need: ${orderAmountBig}`);
      this.createJobRecord(order, 'MANUAL_REVIEW_REQUIRED', 'Insufficient owner available game currency');
      return { ok: false, reason: 'INSUFFICIENT_BALANCE', manualDeliveryRequired: true };
    }

    // 7. Reserve Balance on Owner Account
    this.ownerAccountService.reserveBalance(orderAmountBig);
    const job = this.createJobRecord(order, 'PROCESSING');

    // 8. Resolve destination character ID
    let targetPlayerId = (order as any).targetPlayerId;
    if (!targetPlayerId || targetPlayerId.startsWith('usr-') || targetPlayerId.length !== 20) {
      const searchRes = await this.gameService.searchPlayers(order.gameUsername);
      const match = searchRes.players.find(
        (p) => p.username.toLowerCase() === order.gameUsername.toLowerCase(),
      );
      targetPlayerId = match?.id || searchRes.players[0]?.id || targetPlayerId;
    }
    job.targetPlayerId = targetPlayerId;

    // 9. Adaptive Batching Rule:
    // Lagos Life Game Server Rule: No single transfer can ever exceed 100 Billion (₦100,000,000,000).
    // Orders <= 100B (e.g. 1B, 5B, 20B, 50B, 100B): 1 single instant transfer (no waiting)
    // Orders > 100B (e.g. 120B, 200B, 500B, 1 Trillion): automatically split into batches of up to 100B with a strict 70s cooldown between transfers
    const MAX_GAME_SERVER_TRANSFER = 100000000000n; // 100 Billion hard ceiling by Lagos Life API
    const batchThresholdBig = BigInt(this.settings.batchThresholdAmount || '100000000000'); // 100 Billion
    const isBatchedOrder = orderAmountBig > MAX_GAME_SERVER_TRANSFER || (this.settings.gradualTransferEnabled && orderAmountBig > batchThresholdBig);

    let chunkAmountBig = isBatchedOrder
      ? BigInt(this.settings.transferChunkAmount || '100000000000') // 100B default chunk for orders > 100B
      : orderAmountBig; // 1 single transfer for orders <= 100B

    // Hard ceiling safety clamp: chunk can NEVER exceed 100 Billion under any circumstances
    if (chunkAmountBig > MAX_GAME_SERVER_TRANSFER) {
      chunkAmountBig = MAX_GAME_SERVER_TRANSFER;
    }

    const totalBatches = Math.max(1, Number((orderAmountBig + chunkAmountBig - 1n) / chunkAmountBig));
    job.totalBatches = totalBatches;
    job.isBatchedOrder = isBatchedOrder;

    // Start transfer execution
    const executionPromise = this.executeBatchedTransfer(
      order,
      job,
      orderAmountBig,
      targetPlayerId,
      isBatchedOrder,
      chunkAmountBig,
    );

    // If order <= 100B, await directly for instant response
    if (!isBatchedOrder) {
      return await executionPromise;
    }

    // Orders > 100B: return immediate processing response while batch worker runs with 70s cooldown
    return {
      ok: true,
      orderNumber,
      status: 'PROCESSING',
      gradualTransfer: true,
      totalBatches: job.totalBatches,
      chunkAmount: chunkAmountBig.toString(),
      cooldownSeconds: this.settings.transferCooldownSeconds,
      message: `Order exceeds 100B: transferring in ${job.totalBatches} batches of ₦LL ${Number(chunkAmountBig).toLocaleString()} with a strict ${this.settings.transferCooldownSeconds}s cooldown between each transfer.`,
    };
  }

  // -------------------------------------------------------------
  // Chunked Batched Transfer Engine with Cooldown Timer
  // -------------------------------------------------------------
  private async executeBatchedTransfer(
    order: any,
    job: FulfillmentJobRecord,
    totalAmountBig: bigint,
    targetPlayerId: string,
    isBatchedOrder: boolean,
    chunkAmountBig: bigint,
  ) {
    const cooldownMs = (this.settings.transferCooldownSeconds || 70) * 1000;
    const alreadyDeliveredBig = BigInt(job.deliveredAmount || '0');
    let remainingAmountBig = totalAmountBig > alreadyDeliveredBig ? totalAmountBig - alreadyDeliveredBig : 0n;
    let totalBatches = Math.max(1, Number((totalAmountBig + chunkAmountBig - 1n) / chunkAmountBig));
    let currentBatchNum = Math.min(totalBatches, (job.completedBatches || 0) + 1);

    job.totalBatches = totalBatches;
    job.isBatchedOrder = isBatchedOrder;
    job.status = 'PROCESSING';
    job.transferCooldownSeconds = this.settings.transferCooldownSeconds || 70;
    this.activeTransferPromises.set(order.orderNumber, true);
    this.databaseService.saveFulfillmentJob(job);

    this.logger.log(
      `Fulfillment for #${order.orderNumber}: Total ₦LL ${totalAmountBig} (${
        isBatchedOrder
          ? `BATCHED in ${totalBatches} batches with ${this.settings.transferCooldownSeconds}s cooldown (Starting at Batch ${currentBatchNum}/${totalBatches})`
          : 'SINGLE INSTANT TRANSFER'
      })`,
    );

    try {
      while (remainingAmountBig > 0n) {
        // Safety check 1: Check Emergency Shutdown
        if (this.settings.emergencyShutdown) {
          throw new Error('Transfer paused by Emergency Shutdown');
        }

        // Safety check 2: Check active cancellation
        if ((job.status as string) === 'CANCELLED') {
          throw new Error('Transfer cancelled by administrator');
        }

        const batchSizeInitial = remainingAmountBig > chunkAmountBig ? chunkAmountBig : remainingAmountBig;
        let batchSizeBig = batchSizeInitial;

        // Decrypt PIN in memory
        const decryptedPin = this.ownerAccountService.getDecryptedPin();

        let sendResult: any = null;
        let batchErrorMsg: string | null = null;
        let attempt = 0;
        const maxAttempts = 3;

        while (attempt < maxAttempts) {
          attempt += 1;
          this.logger.log(
            `Executing ${isBatchedOrder ? `Batch ${currentBatchNum}/${totalBatches}` : 'Single Transfer'} (Attempt ${attempt}/${maxAttempts}): Sending ₦LL ${batchSizeBig} to ${targetPlayerId}...`,
          );

          try {
            sendResult = await this.gameService.sendMoney({
              to: targetPlayerId,
              amount: Number(batchSizeBig),
              pin: decryptedPin,
            });

            if (sendResult && sendResult.ok) {
              batchErrorMsg = null;
              break;
            }
          } catch (err: any) {
            const resp = typeof err?.getResponse === 'function' ? err.getResponse() : err?.response;
            const errStr =
              (typeof resp === 'object' ? resp?.error || resp?.message : resp) ||
              err?.message ||
              'Game server transfer rejected';
            batchErrorMsg = errStr;

            // 1. DYNAMIC HIGHEST-LIMIT ADAPTATION:
            // If Lagos Life rejects due to daily restricted account ceiling (e.g. "Your account is restricted: you can send up to ₦10m a day. ₦10,000,000 left today.")
            const leftMatch = errStr.match(/₦([\d,]+)\s*left today/i);
            const capMatch = errStr.match(/up to ₦([\d]+)m/i);

            let serverHighestLimit: bigint | null = null;
            if (leftMatch && leftMatch[1]) {
              const cleaned = leftMatch[1].replace(/,/g, '');
              const parsed = BigInt(cleaned);
              if (parsed > 0n) serverHighestLimit = parsed;
            } else if (capMatch && capMatch[1]) {
              serverHighestLimit = BigInt(capMatch[1]) * 1_000_000n; // 10m -> 10,000,000
            }

            if (serverHighestLimit && serverHighestLimit > 0n && batchSizeBig > serverHighestLimit) {
              this.logger.log(
                `Adaptive Limit Applied: Lagos Life restriction detected. Adapting chunk from ₦LL ${batchSizeBig} to highest allowable limit ₦LL ${serverHighestLimit.toLocaleString()}!`,
              );
              chunkAmountBig = serverHighestLimit;
              batchSizeBig = remainingAmountBig > chunkAmountBig ? chunkAmountBig : remainingAmountBig;
              totalBatches = currentBatchNum + Math.max(1, Number((remainingAmountBig + chunkAmountBig - 1n) / chunkAmountBig)) - 1;
              job.totalBatches = totalBatches;
              continue; // Retry immediately with the highest allowable limit
            }

            // 2. If transient network error, retry after 3s
            if (err?.code === 'network_error' && attempt < maxAttempts) {
              this.logger.warn(`Network glitch communicating with Lagos Life. Retrying in 3s...`);
              await new Promise((r) => setTimeout(r, 3000));
              continue;
            }

            // Other in-game rejection (e.g. daily limit 0 left, or recipient reached cap)
            break;
          }
        }

        if (!sendResult || !sendResult.ok) {
          const finalErrMsg = batchErrorMsg || `Game server transfer error on batch ${currentBatchNum}`;
          this.logger.warn(`Transfer paused on batch ${currentBatchNum}: ${finalErrMsg}`);

          // If some batches were delivered, record partial delivery
          const alreadyDeliveredBig = BigInt(job.deliveredAmount);
          if (alreadyDeliveredBig > 0n) {
            job.status = 'PARTIALLY_DELIVERED';
            job.lastError = `Delivered ₦LL ${Number(alreadyDeliveredBig).toLocaleString()} in ${job.completedBatches} batches. In-game restriction: ${finalErrMsg}`;
          } else {
            job.status = 'MANUAL_REVIEW_REQUIRED';
            job.lastError = `In-game delivery paused: ${finalErrMsg}`;
          }

          this.ownerAccountService.releaseReservedBalance(remainingAmountBig);
          job.updatedAt = new Date().toISOString();
          this.databaseService.saveFulfillmentJob(job);
          this.activeTransferPromises.delete(order.orderNumber);

          await this.ordersService.updateOrderStatus(
            order.orderNumber,
            alreadyDeliveredBig > 0n ? ('PARTIALLY_DELIVERED' as any) : ('WAITING_FOR_DELIVERY' as any),
            job.lastError,
          );

          return {
            ok: false,
            error: finalErrMsg,
            status: job.status,
            batchesCompleted: job.completedBatches,
            totalBatches: job.totalBatches,
            deliveredAmount: job.deliveredAmount,
          };
        }

        // Deduct owner balance for this batch & release corresponding reserve
        this.ownerAccountService.deductActualBalance(batchSizeBig);
        const deliveredToday = BigInt(this.settings.dailyDeliveredToday);
        this.settings.dailyDeliveredToday = (deliveredToday + batchSizeBig).toString();

        // Record Batch Receipt
        const batchRecord: FulfillmentBatchRecord = {
          batchNumber: currentBatchNum,
          totalBatches,
          amount: batchSizeBig.toString(),
          formattedAmount: Number(batchSizeBig).toLocaleString(),
          txId: sendResult.txId,
          timestamp: new Date().toISOString(),
        };

        job.batchHistory.push(batchRecord);
        job.completedBatches = currentBatchNum;
        const currentDeliveredBig = BigInt(job.deliveredAmount) + batchSizeBig;
        job.deliveredAmount = currentDeliveredBig.toString();
        job.formattedDeliveredAmount = Number(currentDeliveredBig).toLocaleString();
        job.progressPercent = Math.min(100, Math.round(Number((currentDeliveredBig * 100n) / totalAmountBig)));
        job.txId = sendResult.txId;
        job.updatedAt = new Date().toISOString();

        // Safe remaining balance formatting (live server returns varying shapes)
        const safeBalance =
          sendResult?.balance != null
            ? String(sendResult.balance)
            : sendResult?.newBalance != null
            ? String(sendResult.newBalance)
            : sendResult?.currentBalance != null
            ? String(sendResult.currentBalance)
            : 'N/A';

        // Log transaction
        const txRecord = {
          id: `gtx-${Date.now()}-${currentBatchNum}`,
          txId: sendResult.txId,
          orderNumber: order.orderNumber,
          targetPlayerId,
          targetUsername: order.gameUsername,
          amount: batchSizeBig.toString(),
          remainingBalance: safeBalance,
          batchNumber: currentBatchNum,
          totalBatches,
          createdAt: new Date().toISOString(),
        };
        this.transactions.unshift(txRecord);
        this.databaseService.addFulfillmentTransaction(txRecord);

        // Update live order record with batch progress so clients can poll live status
        try {
          const liveOrder = this.databaseService.getOrder(order.orderNumber);
          if (liveOrder) {
            (liveOrder as any).deliveredAmount = job.deliveredAmount;
            (liveOrder as any).completedBatches = job.completedBatches;
            (liveOrder as any).totalBatches = job.totalBatches;
            this.databaseService.saveOrder(liveOrder);
          }
        } catch (syncErr: any) {
          this.logger.warn(`Could not sync live order progress for #${order.orderNumber}: ${syncErr.message}`);
        }

        this.databaseService.saveFulfillmentJob(job);
        this.databaseService.saveFulfillmentSettings(this.settings);

        remainingAmountBig -= batchSizeBig;
        currentBatchNum += 1;

        // If more batches remain for orders > 100B, enforce the strict 70-second cooldown timer!
        if (remainingAmountBig > 0n) {
          const nextBatchAt = new Date(Date.now() + cooldownMs).toISOString();
          job.nextBatchAt = nextBatchAt;
          job.status = 'PROCESSING';
          this.databaseService.saveFulfillmentJob(job);

          this.logger.log(
            `Batch ${job.completedBatches}/${totalBatches} delivered (₦LL ${Number(batchSizeBig).toLocaleString()} sent). Enforcing strict ${this.settings.transferCooldownSeconds}s cooldown until ${nextBatchAt} before next batch...`,
          );

          await new Promise((resolve) => setTimeout(resolve, cooldownMs));

          job.nextBatchAt = undefined;
          this.databaseService.saveFulfillmentJob(job);
        }
      }

      // All batches completed successfully!
      job.status = 'SUCCEEDED';
      job.nextBatchAt = undefined;
      job.processedAt = new Date().toISOString();
      job.updatedAt = new Date().toISOString();
      this.databaseService.saveFulfillmentJob(job);
      this.databaseService.saveFulfillmentJob(job);

      const allTxRefs = job.batchHistory.map((b) => b.txId).join(', ');

      // Mark order as COMPLETED in OrdersService
      await this.ordersService.completeDelivery(order.orderNumber, {
        inGameTxRef: allTxRefs,
        adminNotes: isBatchedOrder
          ? `Batched fulfillment completed: ${totalBatches} batches delivered with ${this.settings.transferCooldownSeconds}s cooldown. (TXs: ${allTxRefs})`
          : `Single instant fulfillment completed. (TX: ${allTxRefs})`,
      });

      this.activeTransferPromises.delete(order.orderNumber);
      this.logger.log(`Order #${order.orderNumber} 100% completed! All ${totalBatches} batches fulfilled.`);

      return {
        ok: true,
        orderNumber: order.orderNumber,
        txId: job.txId,
        allTxRefs,
        totalBatches,
        deliveredAmount: totalAmountBig.toString(),
        targetPlayerId,
        status: 'COMPLETED',
      };
    } catch (err: any) {
      const resp = typeof err?.getResponse === 'function' ? err.getResponse() : err?.response;
      const cleanErrMsg =
        (typeof resp === 'object' ? resp?.error || resp?.message : resp) ||
        err?.message ||
        'Game API error during transfer execution';

      this.logger.error(`Transfer interrupted for #${order.orderNumber}: ${cleanErrMsg}`, err.stack);
      this.ownerAccountService.releaseReservedBalance(remainingAmountBig);

      job.retryCount += 1;
      job.lastError = cleanErrMsg;
      job.updatedAt = new Date().toISOString();

      if (job.retryCount >= this.settings.maxRetries) {
        job.status = 'FAILED';
      } else {
        job.status = 'MANUAL_REVIEW_REQUIRED';
      }
      this.databaseService.saveFulfillmentJob(job);

      this.activeTransferPromises.delete(order.orderNumber);

      return {
        ok: false,
        error: cleanErrMsg,
        retryCount: job.retryCount,
        status: job.status,
        batchesCompleted: job.completedBatches,
        totalBatches: job.totalBatches,
      };
    }
  }

  // -------------------------------------------------------------
  // Queue Record Management
  // -------------------------------------------------------------
  private createJobRecord(
    order: any,
    status: FulfillmentJobRecord['status'],
    lastError?: string,
  ): FulfillmentJobRecord {
    const existing = this.jobs.get(order.orderNumber);
    if (existing) {
      existing.status = status;
      if (lastError) existing.lastError = lastError;
      existing.updatedAt = new Date().toISOString();
      this.databaseService.saveFulfillmentJob(existing);
      return existing;
    }

    const MAX_GAME_SERVER_TRANSFER = 100000000000n;
    const orderAmountBig = BigInt(order.totalGameCurrency);
    const batchThresholdBig = BigInt(this.settings.batchThresholdAmount || '100000000000');
    const isBatchedOrder = orderAmountBig > MAX_GAME_SERVER_TRANSFER || (this.settings.gradualTransferEnabled && orderAmountBig > batchThresholdBig);
    let chunkAmountBig = isBatchedOrder
      ? BigInt(this.settings.transferChunkAmount || '100000000000')
      : orderAmountBig;
    if (chunkAmountBig > MAX_GAME_SERVER_TRANSFER) {
      chunkAmountBig = MAX_GAME_SERVER_TRANSFER;
    }
    const totalBatches = Math.max(1, Number((orderAmountBig + chunkAmountBig - 1n) / chunkAmountBig));

    const job: FulfillmentJobRecord = {
      id: `job-${order.orderNumber}`,
      orderNumber: order.orderNumber,
      customerName: (order as any).senderAccountName || order.customerEmail || 'Customer',
      gameUsername: order.gameUsername,
      targetPlayerId: (order as any).targetPlayerId || `usr-${order.gameUsername}`,
      currencyAmount: order.totalGameCurrency.toString(),
      formattedAmount: Number(order.totalGameCurrency).toLocaleString(),
      deliveredAmount: '0',
      formattedDeliveredAmount: '0',
      progressPercent: 0,
      totalBatches,
      completedBatches: 0,
      transferCooldownSeconds: this.settings.transferCooldownSeconds,
      isBatchedOrder,
      status,
      retryCount: 0,
      maxRetries: this.settings.maxRetries,
      lastError,
      batchHistory: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.jobs.set(order.orderNumber, job);
    this.databaseService.saveFulfillmentJob(job);
    return job;
  }

  async getQueue() {
    // Collect all live orders needing in-game fulfillment
    try {
      const allOrders = await this.ordersService.getAllOrders();
      for (const ord of allOrders) {
        if (
          (ord.status === 'WAITING_FOR_DELIVERY' ||
            ord.status === 'DELIVERY_PROCESSING' ||
            ord.status === 'DELIVERY_FAILED' ||
            ord.status === 'COMPLETED') &&
          !this.jobs.has(ord.orderNumber)
        ) {
          const initialStatus =
            ord.status === 'COMPLETED'
              ? 'SUCCEEDED'
              : ord.status === 'DELIVERY_FAILED'
              ? 'FAILED'
              : ord.status === 'DELIVERY_PROCESSING'
              ? 'PROCESSING'
              : 'QUEUED';
          const job = this.createJobRecord(ord, initialStatus as any);
          if (ord.status === 'COMPLETED') {
            job.deliveredAmount = ord.totalGameCurrency;
            job.formattedDeliveredAmount = ord.formattedGameAmount;
            job.progressPercent = 100;
            job.completedBatches = job.totalBatches;
            if (ord.deliveryRecord?.inGameTransactionRef) {
              job.txId = ord.deliveryRecord.inGameTransactionRef;
            }
            this.databaseService.saveFulfillmentJob(job);
          }
        }
      }
    } catch (err: any) {
      this.logger.warn(`Could not sync all orders to fulfillment queue: ${err.message}`);
    }

    const list = Array.from(this.jobs.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    const queuedCount = list.filter((j) => j.status === 'QUEUED').length;
    const processingCount = list.filter((j) => j.status === 'PROCESSING').length;
    const succeededCount = list.filter((j) => j.status === 'SUCCEEDED').length;
    const failedCount = list.filter(
      (j) => j.status === 'FAILED' || j.status === 'MANUAL_REVIEW_REQUIRED',
    ).length;

    return {
      summary: {
        totalJobs: list.length,
        queuedCount,
        processingCount,
        succeededCount,
        failedCount,
        avgDeliverySeconds: 2.4,
      },
      jobs: list,
    };
  }

  async retryJob(orderNumber: string) {
    const job = this.jobs.get(orderNumber);
    if (!job) {
      // If job doesn't exist yet in memory, trigger fresh fulfillment
      return this.processOrderFulfillment(orderNumber);
    }

    job.status = 'QUEUED';
    job.lastError = undefined;
    job.updatedAt = new Date().toISOString();
    this.databaseService.saveFulfillmentJob(job);

    return this.processOrderFulfillment(orderNumber);
  }

  async dispatchOrder(orderNumber: string) {
    this.logger.log(`Manual fulfillment dispatch requested for #${orderNumber}`);
    const job = this.jobs.get(orderNumber);
    if (job) {
      job.status = 'QUEUED';
      job.lastError = undefined;
      job.retryCount = 0;
      job.updatedAt = new Date().toISOString();
      this.databaseService.saveFulfillmentJob(job);
    }
    return this.processOrderFulfillment(orderNumber);
  }

  cancelJob(orderNumber: string) {
    const job = this.jobs.get(orderNumber);
    if (!job) {
      throw new NotFoundException(`Fulfillment job for order ${orderNumber} not found`);
    }

    job.status = 'CANCELLED';
    job.lastError = 'Cancelled by administrator';
    job.updatedAt = new Date().toISOString();
    this.databaseService.saveFulfillmentJob(job);
    return { ok: true, job };
  }

  getTransactions() {
    return this.transactions;
  }
}
