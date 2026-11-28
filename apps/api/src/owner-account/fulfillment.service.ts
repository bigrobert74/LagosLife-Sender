import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  OnApplicationBootstrap,
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
  chunkAmount?: string;
  formattedChunkAmount?: string;
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
export class FulfillmentService implements OnApplicationBootstrap {
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
  private pendingTwoStepCodes: Map<string, string> = new Map();

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

  onApplicationBootstrap() {
    this.hydrateFromDatabase();
  }

  public hydrateFromDatabase() {
    try {
      const savedSettings = this.databaseService.getFulfillmentSettings();
      if (savedSettings) {
        this.settings = { ...this.settings, ...savedSettings };
        if (this.settings.transferChunkAmount === '50000000000') {
          this.settings.transferChunkAmount = '100000000000';
        }
        this.settings.transferCooldownSeconds = Math.max(70, Number(this.settings.transferCooldownSeconds || 70));
      }
      const savedJobs = this.databaseService.getFulfillmentJobs();
      this.jobs.clear();
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
    if (body.batchThresholdAmount) {
      this.settings.batchThresholdAmount = body.batchThresholdAmount;
    }
    if (body.transferChunkAmount) {
      const requested = BigInt(body.transferChunkAmount);
      this.settings.transferChunkAmount =
        requested > 100_000_000_000n ? '100000000000' : requested.toString();
    }
    if (body.transferCooldownSeconds !== undefined) {
      this.settings.transferCooldownSeconds = Math.max(70, Number(body.transferCooldownSeconds) || 70);
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

    // Idempotency safety check: never deliver twice or spawn duplicate background loops
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

    if (this.activeTransferPromises.get(orderNumber)) {
      const activeJob = this.jobs.get(orderNumber);
      this.logger.warn(`Order #${orderNumber} already has an active batched transfer loop running.`);
      return {
        ok: true,
        orderNumber,
        status: 'PROCESSING',
        gradualTransfer: true,
        totalBatches: activeJob?.totalBatches || 1,
        completedBatches: activeJob?.completedBatches || 0,
        deliveredAmount: activeJob?.deliveredAmount || '0',
        chunkAmount: activeJob?.chunkAmount || this.settings.transferChunkAmount,
        cooldownSeconds: activeJob?.transferCooldownSeconds || this.settings.transferCooldownSeconds || 70,
        nextBatchAt: activeJob?.nextBatchAt,
        message: `Batched delivery is already running for #${orderNumber}.`,
      };
    }

    const orderAmountBig = BigInt(order.totalGameCurrency);

    // 1.5 Check Owner Account Connected Status & Transaction PIN
    const accountStatus = await this.ownerAccountService.getStatus();
    if (accountStatus.status !== 'CONNECTED' || !accountStatus.username) {
      const msg = 'No Lagos Life owner account linked. Please connect an account in Admin -> Owner Account Link.';
      this.logger.warn(`Cannot fulfill #${orderNumber}: ${msg}`);
      this.createJobRecord(order, 'MANUAL_REVIEW_REQUIRED', msg);
      return { ok: false, reason: 'ACCOUNT_NOT_CONNECTED', error: msg, manualDeliveryRequired: true };
    }

    let pin: string;
    try {
      pin = this.ownerAccountService.getDecryptedPin();
    } catch (e) {
      pin = '';
    }
    if (!pin || pin.length !== 4) {
      const msg = 'Owner account 4-digit transfer PIN is not configured.';
      this.logger.warn(`Cannot fulfill #${orderNumber}: ${msg}`);
      this.createJobRecord(order, 'MANUAL_REVIEW_REQUIRED', msg);
      return { ok: false, reason: 'PIN_NOT_CONFIGURED', error: msg, manualDeliveryRequired: true };
    }

    // 2. Check Emergency Shutdown
    if (this.settings.emergencyShutdown) {
      const msg = 'Automated delivery paused due to emergency shutdown';
      this.logger.warn(`Emergency shutdown active. Skipping auto-delivery for ${orderNumber}`);
      this.createJobRecord(order, 'MANUAL_REVIEW_REQUIRED', msg);
      return { ok: false, reason: 'EMERGENCY_SHUTDOWN', error: msg, manualDeliveryRequired: true };
    }

    // 3. Check Master Auto Toggle
    if (!this.settings.autoFulfillmentEnabled) {
      const msg = 'Automatic fulfillment is currently turned off in Fulfillment Rules';
      this.logger.log(`Auto fulfillment disabled. Order ${orderNumber} queued for manual fulfillment.`);
      this.createJobRecord(order, 'QUEUED', msg);
      return { ok: false, reason: 'AUTOMATION_DISABLED', error: msg, manualDeliveryRequired: true };
    }

    // 4. Verify Single Transfer Limit
    const maxSingle = BigInt(this.settings.maxSingleTransfer);
    if (orderAmountBig > maxSingle) {
      const msg = `Order exceeds configured max single order limit (${maxSingle.toLocaleString()})`;
      this.logger.warn(`Order #${orderNumber}: ${msg}`);
      this.createJobRecord(order, 'MANUAL_REVIEW_REQUIRED', msg);
      return { ok: false, reason: 'EXCEEDS_SINGLE_LIMIT', error: msg, manualDeliveryRequired: true };
    }

    // 5. Verify Daily Volume Limit
    const dailyLimit = BigInt(this.settings.dailyLimit);
    const deliveredToday = BigInt(this.settings.dailyDeliveredToday);
    if (deliveredToday + orderAmountBig > dailyLimit) {
      const msg = `Daily automated volume limit reached (${Number(deliveredToday).toLocaleString()} / ${Number(dailyLimit).toLocaleString()})`;
      this.logger.warn(`Order #${orderNumber}: ${msg}`);
      this.createJobRecord(order, 'MANUAL_REVIEW_REQUIRED', msg);
      return { ok: false, reason: 'EXCEEDS_DAILY_LIMIT', error: msg, manualDeliveryRequired: true };
    }

    // 6. Sync Live Owner Balance & Check Available Balance
    const balanceInfo = await this.ownerAccountService.syncBalance().catch(() => this.ownerAccountService.getBalance());
    const availableBig = BigInt(balanceInfo.availableBalance || '0');
    const minReserveBig = BigInt(this.settings.minReserveBalance);

    if (availableBig < orderAmountBig || availableBig - orderAmountBig < minReserveBig) {
      const msg = `Insufficient owner available cash (Available: ₦LL ${Number(availableBig).toLocaleString()}, Needed: ₦LL ${Number(orderAmountBig).toLocaleString()})`;
      this.logger.warn(`Order #${orderNumber}: ${msg}`);
      this.createJobRecord(order, 'MANUAL_REVIEW_REQUIRED', msg);
      return { ok: false, reason: 'INSUFFICIENT_BALANCE', error: msg, manualDeliveryRequired: true };
    }

    // 7. Resolve live destination character ID before transferring
    let targetPlayerId = (order as any).targetPlayerId;
    if (!targetPlayerId || targetPlayerId.startsWith('usr-') || targetPlayerId.length !== 20) {
      const searchRes = await this.gameService.searchPlayers(order.gameUsername);
      const match =
        searchRes.players.find((p) => p.username.toLowerCase() === order.gameUsername.replace(/^@/, '').toLowerCase()) ||
        searchRes.players[0];
      if (match?.id) {
        targetPlayerId = match.id;
      }
    }

    if (
      process.env.LAGOS_LIFE_LIVE_SYNC === 'true' &&
      (!targetPlayerId || targetPlayerId.startsWith('usr-') || targetPlayerId.length < 16)
    ) {
      const msg = `Could not find Lagos Life player @${order.gameUsername}. Verify exact in-game username.`;
      this.logger.warn(`Order #${orderNumber}: ${msg}`);
      this.createJobRecord(order, 'FAILED', msg);
      return { ok: false, reason: 'PLAYER_NOT_FOUND', error: msg, manualDeliveryRequired: true };
    }

    // 8. Reserve remaining balance on Owner Account
    const existingJob = this.jobs.get(order.orderNumber);
    const alreadyDeliveredBig = BigInt(existingJob?.deliveredAmount || '0');
    const remainingToSendBig = orderAmountBig > alreadyDeliveredBig ? orderAmountBig - alreadyDeliveredBig : orderAmountBig;
    this.ownerAccountService.reserveBalance(remainingToSendBig);

    const job = this.createJobRecord(order, 'PROCESSING');
    job.targetPlayerId = targetPlayerId;

    // 9. Adaptive Batching Rule:
    // Lagos Life Game Server Rule: No single transfer can exceed 100 Billion (₦100,000,000,000),
    // and accounts with lower limits automatically step down to the highest per-70s cap returned by the server.
    const MAX_GAME_SERVER_TRANSFER = 100000000000n; // 100 Billion ceiling
    const batchThresholdBig = BigInt(this.settings.batchThresholdAmount || '100000000000');
    const isBatchedOrder =
      orderAmountBig > MAX_GAME_SERVER_TRANSFER ||
      (this.settings.gradualTransferEnabled && orderAmountBig > batchThresholdBig);

    let chunkAmountBig = isBatchedOrder
      ? BigInt(this.settings.transferChunkAmount || '100000000000')
      : orderAmountBig;

    if (chunkAmountBig > MAX_GAME_SERVER_TRANSFER) {
      chunkAmountBig = MAX_GAME_SERVER_TRANSFER;
    }

    const totalBatches =
      (job.completedBatches || 0) +
      Math.max(1, Number((remainingToSendBig + chunkAmountBig - 1n) / chunkAmountBig));
    job.totalBatches = totalBatches;
    job.isBatchedOrder = isBatchedOrder;
    job.chunkAmount = chunkAmountBig.toString();
    job.formattedChunkAmount = Number(chunkAmountBig).toLocaleString();

    // Await ONLY the first step (Batch 1 result or initial cooldown trigger) so HTTP never times out on multi-batch countdowns,
    // while failing loudly if Batch 1 is rejected immediately and continuing background batches every 70s until 100% done!
    return await new Promise<any>((resolveFirstStep) => {
      let firstStepSettled = false;
      const settleFirstStep = (payload: any) => {
        if (!firstStepSettled) {
          firstStepSettled = true;
          resolveFirstStep(payload);
        }
      };

      this.executeBatchedTransfer(
        order,
        job,
        orderAmountBig,
        targetPlayerId,
        isBatchedOrder,
        chunkAmountBig,
        settleFirstStep,
      )
        .then((finalOutcome) => {
          settleFirstStep(finalOutcome);
        })
        .catch((err) => {
          settleFirstStep({ ok: false, error: err?.message || 'Fulfillment execution error', status: 'FAILED' });
        });
    });
  }

  private parseServerTransferLimit(errStr: string, respObj?: any): bigint | null {
    if (respObj?.statusCode === 429 || respObj?.code === 'rate_limit_restricted') {
      return null;
    }

    const parseUnitNum = (numStr: string, suffix?: string): bigint | null => {
      const cleaned = numStr.replace(/,/g, '').trim();
      const val = Number(cleaned);
      if (!Number.isFinite(val) || val <= 0) return null;
      const s = (suffix || '').toLowerCase();
      const mult =
        s === 't' || s === 'trillion'
          ? 1e12
          : s === 'b' || s === 'billion'
            ? 1e9
            : s === 'm' || s === 'million'
              ? 1e6
              : s === 'k' || s === 'thousand'
                ? 1e3
                : 1;
      const result = Math.floor(val * mult);
      return result >= 1000 ? BigInt(result) : null;
    };

    const jsonLimit = respObj?.leftToday ?? respObj?.maxAmount ?? respObj?.maxSend ?? respObj?.limit ?? respObj?.max;
    if (jsonLimit !== undefined && jsonLimit !== null) {
      const parsed = Math.floor(Number(jsonLimit));
      if (Number.isFinite(parsed) && parsed >= 1000) return BigInt(parsed);
    }

    const leftMatch = errStr.match(/₦\s*([\d,]+(?:\.\d+)?)\s*([kmbt])?(?![a-z])\s*left today/i);
    if (leftMatch?.[1]) {
      return parseUnitNum(leftMatch[1], leftMatch[2]);
    }

    const nairaCapMatch = errStr.match(
      /(?:up to|max(?:imum)?(?: of)?|limit(?: is| of)?)\s*(?:₦|NGN)\s*([\d,]+(?:\.\d+)?)\s*([kmbt])?(?![a-z])/i,
    );
    if (nairaCapMatch?.[1]) {
      return parseUnitNum(nairaCapMatch[1], nairaCapMatch[2]);
    }

    const nairaUnitCapMatch = errStr.match(
      /₦\s*([\d,]+(?:\.\d+)?)\s*([kmbt])?(?![a-z])\s*(?:at a time|per transfer|per send|a day|per day|limit|max)/i,
    );
    if (nairaUnitCapMatch?.[1]) {
      return parseUnitNum(nairaUnitCapMatch[1], nairaUnitCapMatch[2]);
    }

    const wordUnitCapMatch = errStr.match(
      /(?:up to|max(?:imum)?(?: of)?|limit(?: is| of)?)\s*([\d,]+(?:\.\d+)?)\s*(thousand|million|billion|trillion)\b/i,
    );
    if (wordUnitCapMatch?.[1]) {
      return parseUnitNum(wordUnitCapMatch[1], wordUnitCapMatch[2]);
    }

    return null;
  }

  private parseCooldownSeconds(errStr: string, respObj?: any, defaultSec = 70): number | null {
    const fromJson = Number(respObj?.retryAfterSeconds || respObj?.retryAfter || respObj?.retry_after || respObj?.cooldown || 0);
    if (Number.isFinite(fromJson) && fromJson > 0) {
      return Math.max(5, Math.ceil(fromJson));
    }
    const minMatch = errStr.match(/(?:wait|cooldown|try again in|after)\s*(\d+)\s*(?:m|min|mins|minute|minutes)\b/i);
    if (minMatch?.[1]) {
      const mins = Number(minMatch[1]);
      if (Number.isFinite(mins) && mins > 0) return Math.max(60, mins * 60);
    }
    const textMatch = errStr.match(/(?:wait|cooldown|try again in|after)\s*(\d+)\s*(?:s|sec|secs|second|seconds)\b/i);
    if (textMatch?.[1]) {
      const sec = Number(textMatch[1]);
      if (Number.isFinite(sec) && sec > 0) return Math.max(5, sec);
    }
    if (respObj?.statusCode === 429 || respObj?.code === 'rate_limit_restricted' || /cooldown|too fast|rate limit/i.test(errStr)) {
      return Math.max(70, defaultSec);
    }
    return null;
  }

  private syncLiveOrderProgress(orderNumber: string, job: FulfillmentJobRecord, statusOverride?: string) {
    try {
      const liveOrder = this.databaseService.getOrder(orderNumber);
      if (liveOrder) {
        if (statusOverride) liveOrder.status = statusOverride;
        (liveOrder as any).deliveredAmount = job.deliveredAmount;
        (liveOrder as any).completedBatches = job.completedBatches;
        (liveOrder as any).totalBatches = job.totalBatches;
        (liveOrder as any).chunkAmount = job.chunkAmount;
        (liveOrder as any).transferCooldownSeconds = job.transferCooldownSeconds;
        (liveOrder as any).nextBatchAt = job.nextBatchAt;
        if (job.lastError) (liveOrder as any).lastDeliveryError = job.lastError;
        this.databaseService.saveOrder(liveOrder);
      }
    } catch (syncErr: any) {
      this.logger.warn(`Could not sync live order progress for #${orderNumber}: ${syncErr.message}`);
    }
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
    onFirstStep?: (payload: any) => void,
  ) {
    const defaultCooldownSec = Math.max(10, Number(this.settings.transferCooldownSeconds || 70));
    const cooldownMs = defaultCooldownSec * 1000;
    const alreadyDeliveredBig = BigInt(job.deliveredAmount || '0');
    let remainingAmountBig = totalAmountBig > alreadyDeliveredBig ? totalAmountBig - alreadyDeliveredBig : 0n;
    let totalBatches =
      remainingAmountBig > 0n
        ? (job.completedBatches || 0) +
          Math.max(1, Number((remainingAmountBig + chunkAmountBig - 1n) / chunkAmountBig))
        : Math.max(1, job.completedBatches || 1);
    let currentBatchNum = (job.completedBatches || 0) + 1;

    job.totalBatches = totalBatches;
    job.isBatchedOrder = isBatchedOrder;
    job.chunkAmount = chunkAmountBig.toString();
    job.formattedChunkAmount = Number(chunkAmountBig).toLocaleString();
    job.status = 'PROCESSING';
    job.lastError = undefined;
    job.transferCooldownSeconds = defaultCooldownSec;
    this.activeTransferPromises.set(order.orderNumber, true);
    this.databaseService.saveFulfillmentJob(job);

    this.logger.log(
      `Fulfillment for #${order.orderNumber}: Total ₦LL ${totalAmountBig} (${
        isBatchedOrder
          ? `BATCHED in ${totalBatches} batches of ₦LL ${Number(chunkAmountBig).toLocaleString()} with ${defaultCooldownSec}s cooldown`
          : 'SINGLE INSTANT TRANSFER'
      })`,
    );

    try {
      while (remainingAmountBig > 0n) {
        if (this.settings.emergencyShutdown) {
          throw new Error('Transfer paused by Emergency Shutdown');
        }

        if ((job.status as string) === 'CANCELLED') {
          throw new Error('Transfer cancelled by administrator');
        }

        const batchSizeInitial = remainingAmountBig > chunkAmountBig ? chunkAmountBig : remainingAmountBig;
        let batchSizeBig = batchSizeInitial;

        const decryptedPin = this.ownerAccountService.getDecryptedPin();

        let sendResult: any = null;
        let batchErrorMsg: string | null = null;
        let attempt = 0;
        const maxAttempts = 5;

        while (attempt < maxAttempts) {
          attempt += 1;
          this.logger.log(
            `Executing ${isBatchedOrder ? `Batch ${currentBatchNum}/${totalBatches}` : 'Transfer'} (Attempt ${attempt}/${maxAttempts}): Sending ₦LL ${batchSizeBig} to ${targetPlayerId}...`,
          );

          try {
            const twoStepCode = this.pendingTwoStepCodes.get(order.orderNumber);
            if (twoStepCode) {
              this.pendingTwoStepCodes.delete(order.orderNumber);
            }
            sendResult = await this.gameService.sendMoney({
              to: targetPlayerId,
              amount: Number(batchSizeBig),
              pin: decryptedPin,
              ...(twoStepCode ? { twoStepCode } : {}),
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

            this.ownerAccountService.recordFulfillmentLog(
              'SEND_REJECTED',
              'WARNING',
              `#${order.orderNumber} (${targetPlayerId}) attempted ₦LL ${Number(batchSizeBig).toLocaleString()}: HTTP ${resp?.statusCode || '?'} - ${errStr}`,
            );

            // 1. CHECK ACTIVE COOLDOWN FIRST (HTTP 429 or "wait X seconds/minutes") -> Wait countdown cleanly without cutting batch size!
            const waitCooldownSec = this.parseCooldownSeconds(
              errStr,
              typeof resp === 'object' ? resp : undefined,
              defaultCooldownSec,
            );
            if (waitCooldownSec && attempt < maxAttempts) {
              const waitMs = waitCooldownSec * 1000;
              const nextAt = new Date(Date.now() + waitMs).toISOString();
              job.isBatchedOrder = true;
              job.transferCooldownSeconds = waitCooldownSec;
              job.nextBatchAt = nextAt;
              job.status = 'PROCESSING';
              this.databaseService.saveFulfillmentJob(job);
              this.syncLiveOrderProgress(order.orderNumber, job, 'DELIVERY_PROCESSING');

              onFirstStep?.({
                ok: true,
                orderNumber: order.orderNumber,
                status: 'PROCESSING',
                gradualTransfer: true,
                totalBatches: job.totalBatches,
                completedBatches: job.completedBatches,
                deliveredAmount: job.deliveredAmount,
                chunkAmount: chunkAmountBig.toString(),
                cooldownSeconds: waitCooldownSec,
                nextBatchAt: nextAt,
                message: `Cooldown active (${waitCooldownSec}s countdown). Delivering ₦LL ${Number(chunkAmountBig).toLocaleString()} per ${waitCooldownSec}s until complete.`,
              });

              this.logger.log(
                `Lagos Life cooldown active for #${order.orderNumber}. Waiting ${waitCooldownSec}s (until ${nextAt}) before Batch ${currentBatchNum}/${totalBatches}...`,
              );
              await new Promise((r) => setTimeout(r, waitMs));
              if ((job.status as string) === 'CANCELLED') {
                throw new Error('Transfer cancelled by administrator');
              }
              job.nextBatchAt = undefined;
              this.databaseService.saveFulfillmentJob(job);
              continue;
            }

            // 2. DYNAMIC LIMIT ADAPTATION (Only for genuine currency caps without creating impractical micro-batches)
            const serverHighestLimit = this.parseServerTransferLimit(errStr, typeof resp === 'object' ? resp : undefined);
            if (serverHighestLimit && serverHighestLimit > 0n && batchSizeBig > serverHighestLimit) {
              const projectedBatches = Number((remainingAmountBig + serverHighestLimit - 1n) / serverHighestLimit);
              if (serverHighestLimit < 1_000_000_000n && projectedBatches > 200) {
                batchErrorMsg = `Lagos Life rejected ₦LL ${Number(batchSizeBig).toLocaleString()}: "${errStr}" (cap ₦LL ${Number(serverHighestLimit).toLocaleString()} would require ${projectedBatches.toLocaleString()} batches at 70s each).`;
                this.ownerAccountService.recordFulfillmentLog('CAP_TOO_LOW', 'FAILED', batchErrorMsg);
                break;
              }
              this.logger.log(
                `Adaptive Limit Applied: Lagos Life cap detected (₦LL ${Number(serverHighestLimit).toLocaleString()} per transfer) from "${errStr}".`,
              );
              chunkAmountBig = serverHighestLimit;
              isBatchedOrder = totalAmountBig > chunkAmountBig;
              batchSizeBig = remainingAmountBig > chunkAmountBig ? chunkAmountBig : remainingAmountBig;
              totalBatches =
                (job.completedBatches || 0) +
                Math.max(1, Number((remainingAmountBig + chunkAmountBig - 1n) / chunkAmountBig));
              job.totalBatches = totalBatches;
              job.isBatchedOrder = isBatchedOrder;
              job.chunkAmount = chunkAmountBig.toString();
              job.formattedChunkAmount = Number(chunkAmountBig).toLocaleString();
              this.databaseService.saveFulfillmentJob(job);
              this.syncLiveOrderProgress(order.orderNumber, job);
              continue;
            }

            // 3. Transient network glitch retry
            if ((resp?.code === 'network_error' || err?.code === 'network_error') && attempt < maxAttempts) {
              this.logger.warn(`Network glitch communicating with Lagos Life. Retrying in 3s...`);
              await new Promise((r) => setTimeout(r, 3000));
              continue;
            }

            break;
          }
        }

        if (!sendResult || !sendResult.ok) {
          const finalErrMsg = batchErrorMsg || `Game server transfer rejected on batch ${currentBatchNum}`;
          this.logger.warn(`Transfer stopped on batch ${currentBatchNum}: ${finalErrMsg}`);

          const alreadyDeliveredNow = BigInt(job.deliveredAmount);
          if (alreadyDeliveredNow > 0n) {
            job.status = 'PARTIALLY_DELIVERED';
            job.lastError = `Delivered ₦LL ${Number(alreadyDeliveredNow).toLocaleString()} in ${job.completedBatches} batches. Paused: ${finalErrMsg}`;
          } else {
            job.status = 'FAILED';
            job.lastError = `Transfer failed: ${finalErrMsg}`;
          }

          job.nextBatchAt = undefined;
          this.ownerAccountService.releaseReservedBalance(remainingAmountBig);
          job.updatedAt = new Date().toISOString();
          this.databaseService.saveFulfillmentJob(job);
          this.activeTransferPromises.delete(order.orderNumber);

          const failedOrderStatus = alreadyDeliveredNow > 0n ? 'PARTIALLY_DELIVERED' : 'DELIVERY_FAILED';
          this.syncLiveOrderProgress(order.orderNumber, job, failedOrderStatus);
          await this.ordersService.updateOrderStatus(order.orderNumber, failedOrderStatus, job.lastError);

          return {
            ok: false,
            error: finalErrMsg,
            status: job.status,
            batchesCompleted: job.completedBatches,
            totalBatches: job.totalBatches,
            deliveredAmount: job.deliveredAmount,
          };
        }

        // Batch succeeded -> deduct owner balance & record progress
        this.ownerAccountService.deductActualBalance(batchSizeBig);
        const deliveredToday = BigInt(this.settings.dailyDeliveredToday);
        this.settings.dailyDeliveredToday = (deliveredToday + batchSizeBig).toString();

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

        const safeBalance =
          sendResult?.balance != null
            ? String(sendResult.balance)
            : sendResult?.newBalance != null
            ? String(sendResult.newBalance)
            : sendResult?.currentBalance != null
            ? String(sendResult.currentBalance)
            : 'N/A';

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

        remainingAmountBig -= batchSizeBig;
        currentBatchNum += 1;

        this.databaseService.saveFulfillmentJob(job);
        this.databaseService.saveFulfillmentSettings(this.settings);
        this.syncLiveOrderProgress(
          order.orderNumber,
          job,
          remainingAmountBig > 0n ? 'DELIVERY_PROCESSING' : undefined,
        );

        // If more batches remain, set the live 70-second cooldown countdown timer BEFORE sleeping!
        if (remainingAmountBig > 0n) {
          const nextBatchAt = new Date(Date.now() + cooldownMs).toISOString();
          job.isBatchedOrder = true;
          job.nextBatchAt = nextBatchAt;
          job.status = 'PROCESSING';
          this.databaseService.saveFulfillmentJob(job);
          this.syncLiveOrderProgress(order.orderNumber, job, 'DELIVERY_PROCESSING');

          onFirstStep?.({
            ok: true,
            orderNumber: order.orderNumber,
            status: 'PROCESSING',
            gradualTransfer: true,
            totalBatches: job.totalBatches,
            completedBatches: job.completedBatches,
            deliveredAmount: job.deliveredAmount,
            chunkAmount: chunkAmountBig.toString(),
            cooldownSeconds: defaultCooldownSec,
            nextBatchAt,
            message: `Batch ${job.completedBatches}/${job.totalBatches} sent! Sending ₦LL ${Number(chunkAmountBig).toLocaleString()} every ${defaultCooldownSec}s until complete.`,
          });

          this.logger.log(
            `Batch ${job.completedBatches}/${totalBatches} delivered (₦LL ${Number(batchSizeBig).toLocaleString()} sent). Enforcing ${defaultCooldownSec}s cooldown until ${nextBatchAt}...`,
          );

          await new Promise((resolve) => setTimeout(resolve, cooldownMs));

          job.nextBatchAt = undefined;
          this.databaseService.saveFulfillmentJob(job);
          this.syncLiveOrderProgress(order.orderNumber, job, 'DELIVERY_PROCESSING');
        }
      }

      // All batches completed successfully!
      job.status = 'SUCCEEDED';
      job.progressPercent = 100;
      job.nextBatchAt = undefined;
      job.processedAt = new Date().toISOString();
      job.updatedAt = new Date().toISOString();
      this.databaseService.saveFulfillmentJob(job);
      this.syncLiveOrderProgress(order.orderNumber, job);

      const allTxRefs = job.batchHistory.map((b) => b.txId).join(', ');

      await this.ordersService.completeDelivery(order.orderNumber, {
        inGameTxRef: allTxRefs,
        adminNotes: job.isBatchedOrder
          ? `Batched fulfillment completed: ${job.completedBatches} batches delivered (₦LL ${Number(chunkAmountBig).toLocaleString()} every ${defaultCooldownSec}s). (TXs: ${allTxRefs})`
          : `Single instant fulfillment completed. (TX: ${allTxRefs})`,
      });

      this.activeTransferPromises.delete(order.orderNumber);
      this.logger.log(`Order #${order.orderNumber} 100% completed! All ${job.completedBatches} batches fulfilled.`);

      return {
        ok: true,
        orderNumber: order.orderNumber,
        txId: job.txId,
        allTxRefs,
        totalBatches: job.totalBatches,
        completedBatches: job.completedBatches,
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
      job.nextBatchAt = undefined;
      job.lastError = cleanErrMsg;
      job.updatedAt = new Date().toISOString();

      const deliveredSoFar = BigInt(job.deliveredAmount || '0');
      job.status = deliveredSoFar > 0n ? 'PARTIALLY_DELIVERED' : 'FAILED';
      this.databaseService.saveFulfillmentJob(job);
      this.syncLiveOrderProgress(order.orderNumber, job, deliveredSoFar > 0n ? 'PARTIALLY_DELIVERED' : 'DELIVERY_FAILED');

      this.activeTransferPromises.delete(order.orderNumber);

      return {
        ok: false,
        error: cleanErrMsg,
        retryCount: job.retryCount,
        status: job.status,
        batchesCompleted: job.completedBatches,
        totalBatches: job.totalBatches,
        deliveredAmount: job.deliveredAmount,
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
            ord.status === 'PARTIALLY_DELIVERED' ||
            ord.status === 'COMPLETED') &&
          !this.jobs.has(ord.orderNumber)
        ) {
          const initialStatus =
            ord.status === 'COMPLETED'
              ? 'SUCCEEDED'
              : ord.status === 'DELIVERY_FAILED'
              ? 'FAILED'
              : ord.status === 'PARTIALLY_DELIVERED'
              ? 'PARTIALLY_DELIVERED'
              : ord.status === 'DELIVERY_PROCESSING'
              ? 'PROCESSING'
              : 'QUEUED';
          const job = this.createJobRecord(ord, initialStatus as any, (ord as any).lastDeliveryError);
          if (ord.status === 'COMPLETED') {
            job.deliveredAmount = ord.totalGameCurrency;
            job.formattedDeliveredAmount = ord.formattedGameAmount;
            job.progressPercent = 100;
            job.completedBatches = job.totalBatches;
            if (ord.deliveryRecord?.inGameTransactionRef) {
              job.txId = ord.deliveryRecord.inGameTransactionRef;
            }
            this.databaseService.saveFulfillmentJob(job);
          } else if (ord.status === 'PARTIALLY_DELIVERED') {
            job.deliveredAmount = (ord as any).deliveredAmount || '0';
            job.formattedDeliveredAmount = Number(BigInt(job.deliveredAmount || '0')).toLocaleString();
            job.completedBatches = (ord as any).completedBatches || 0;
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

  async retryJob(orderNumber: string, twoStepCode?: string) {
    if (twoStepCode && twoStepCode.trim()) {
      this.pendingTwoStepCodes.set(orderNumber, twoStepCode.trim());
    }
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
    job.nextBatchAt = undefined;
    job.lastError = 'Cancelled by administrator';
    job.updatedAt = new Date().toISOString();
    this.activeTransferPromises.delete(orderNumber);
    const totalBig = BigInt(job.currencyAmount || '0');
    const deliveredBig = BigInt(job.deliveredAmount || '0');
    if (totalBig > deliveredBig) {
      this.ownerAccountService.releaseReservedBalance(totalBig - deliveredBig);
    }
    this.databaseService.saveFulfillmentJob(job);
    this.syncLiveOrderProgress(orderNumber, job, 'CANCELLED');
    return { ok: true, job };
  }

  getTransactions() {
    return this.transactions;
  }
}
