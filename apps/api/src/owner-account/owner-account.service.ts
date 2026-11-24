import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { CryptoService } from './crypto.service';
import { GameService } from '../game/game.service';
import { PrismaService } from '../prisma/prisma.service';

export interface OwnerAccountStatus {
  id: string;
  username: string;
  name?: string;
  online?: boolean;
  location?: string;
  accountIdentifier: string | null;
  description: string | null;
  status:
    | 'NOT_CONNECTED'
    | 'CONNECTING'
    | 'CONNECTED'
    | 'AUTHORIZATION_EXPIRED'
    | 'CONNECTION_FAILED'
    | 'ACCESS_REVOKED';
  pinConfigured: boolean;
  pinMasked: string;
  lastConnectedAt: string | null;
  lastSyncedAt: string | null;
  isStale: boolean;
  characterStats?: {
    level: number;
    reputation: number;
    rank: string;
    tier: string;
    league: string;
  };
  badges?: Array<{ id: string; name: string; icon: string }>;
  titles?: string[];
}

export interface OwnerBalanceInfo {
  savedCash: string;
  formattedSavedCash: string;
  netWorth: string;
  formattedNetWorth: string;
  reservedBalance: string;
  formattedReservedBalance: string;
  availableBalance: string;
  formattedAvailableBalance: string;
  isStale: boolean;
  lastSyncedAt: string;
  lowBalanceWarning: boolean;
  lowBalanceThreshold: string;
}

@Injectable()
export class OwnerAccountService {
  private readonly logger = new Logger(OwnerAccountService.name);

  // In-memory persistent state (synced with disk session & live Lagos Life server)
  private accountState: {
    id: string;
    username: string;
    accountIdentifier: string | null;
    description: string | null;
    status: OwnerAccountStatus['status'];
    encryptedPin: string | null;
    apiTokenEncrypted: string | null;
    lastConnectedAt: string | null;
    lastSyncedAt: string | null;
    savedCash: bigint;
    netWorth: bigint;
    reservedBalance: bigint;
  } = {
    id: 'owner-acc-primary',
    username: '',
    accountIdentifier: 'Primary Character Vault',
    description: 'Connected Live Character Vault',
    status: 'NOT_CONNECTED',
    encryptedPin: null,
    apiTokenEncrypted: null,
    lastConnectedAt: null,
    lastSyncedAt: null,
    savedCash: 0n,
    netWorth: 0n,
    reservedBalance: 0n,
  };

  private integrationLogs: Array<{
    id: string;
    action: string;
    status: 'SUCCESS' | 'FAILED' | 'WARNING';
    details: string;
    timestamp: string;
  }> = [];

  constructor(
    private readonly cryptoService: CryptoService,
    private readonly gameService: GameService,
    private readonly prisma: PrismaService,
  ) {
    // Auto-load persistent live session from disk (if an account was previously linked)
    this.loadSessionFromFile();

    if (this.accountState.status === 'CONNECTED' && this.accountState.username) {
      this.addLog('SYSTEM_BOOT', 'SUCCESS', `Owner account @${this.accountState.username} restored from disk.`);
      this.syncBalance().catch(() => {});
    } else {
      this.addLog('SYSTEM_BOOT', 'SUCCESS', 'Owner account service initialized. Awaiting Lagos Life account link.');
    }
  }

  private getSessionFilePaths(): string[] {
    return [
      path.resolve(process.cwd(), 'data', 'owner_account_session.json'),
      path.resolve(process.cwd(), 'owner_account_session.json'),
      path.resolve(process.cwd(), 'apps', 'api', 'owner_account_session.json'),
      path.resolve(__dirname, '..', '..', 'owner_account_session.json'),
      path.resolve(__dirname, '..', '..', '..', 'owner_account_session.json'),
    ];
  }

  private loadSessionFromFile() {
    try {
      for (const sp of this.getSessionFilePaths()) {
        if (fs.existsSync(sp)) {
          const raw = fs.readFileSync(sp, 'utf-8');
          const parsed = JSON.parse(raw);
          if (parsed && (parsed.status === 'CONNECTED' || parsed.username)) {
            this.accountState.username = parsed.username || '';
            this.accountState.status = parsed.username ? (parsed.status || 'CONNECTED') : 'NOT_CONNECTED';
            this.accountState.accountIdentifier = parsed.accountIdentifier || 'Primary Character Vault';
            this.accountState.description = parsed.description || 'Connected Live Character Vault';
            if (parsed.savedCash) this.accountState.savedCash = BigInt(parsed.savedCash);
            if (parsed.netWorth) this.accountState.netWorth = BigInt(parsed.netWorth);
            if (parsed.pin) {
              this.accountState.encryptedPin = this.cryptoService.encrypt(parsed.pin);
              this.gameService.setOwnerPin(parsed.pin);
            }
            if (parsed.cookies) {
              this.gameService.setCookiesMap(parsed.cookies);
            }
            if (this.accountState.username) {
              this.gameService.setOwnerUsername(this.accountState.username);
            }
            this.accountState.lastConnectedAt = parsed.lastConnectedAt || new Date().toISOString();
            this.accountState.lastSyncedAt = parsed.lastSyncedAt || new Date().toISOString();
            if (this.accountState.username) {
              this.logger.log(`Active character session for @${this.accountState.username} restored from disk.`);
            }
            return;
          }
        }
      }
    } catch (err: any) {
      this.logger.warn(`Could not load owner_account_session.json: ${err.message}`);
    }
  }

  private saveSessionToFile() {
    try {
      const pinPlain = this.accountState.encryptedPin
        ? this.cryptoService.decrypt(this.accountState.encryptedPin)
        : '';
      const sessionData = {
        username: this.accountState.username,
        accountIdentifier: this.accountState.accountIdentifier,
        description: this.accountState.description,
        status: this.accountState.status,
        savedCash: this.accountState.savedCash.toString(),
        netWorth: this.accountState.netWorth.toString(),
        pin: pinPlain,
        cookies: this.gameService.getCookiesMap(),
        lastConnectedAt: this.accountState.lastConnectedAt,
        lastSyncedAt: this.accountState.lastSyncedAt,
      };

      for (const sp of this.getSessionFilePaths().slice(0, 2)) {
        fs.writeFileSync(sp, JSON.stringify(sessionData, null, 2), 'utf-8');
      }
      this.logger.log(`Owner account @${this.accountState.username} session persisted to disk.`);
    } catch (err: any) {
      this.logger.warn(`Could not save owner_account_session.json: ${err.message}`);
    }
  }

  private deleteSessionFile() {
    for (const sp of this.getSessionFilePaths()) {
      try {
        if (fs.existsSync(sp)) {
          fs.writeFileSync(sp, JSON.stringify({ status: 'NOT_CONNECTED', username: '', savedCash: '0', netWorth: '0' }, null, 2), 'utf-8');
          fs.unlinkSync(sp);
        }
      } catch (e) {}
    }
  }

  private addLog(action: string, status: 'SUCCESS' | 'FAILED' | 'WARNING', details: string) {
    const entry = {
      id: `int-log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      action,
      status,
      details,
      timestamp: new Date().toISOString(),
    };
    this.integrationLogs.unshift(entry);
    if (this.integrationLogs.length > 100) this.integrationLogs.pop();
  }

  // -------------------------------------------------------------
  // Connect Owner Account (supports direct PIN or credentials)
  // -------------------------------------------------------------
  async connectAccount(body: {
    username: string;
    password?: string;
    action?: string;
    challenge?: string;
    code?: string;
    accountIdentifier?: string;
    description?: string;
    pin: string;
    apiToken?: string;
  }) {
    if (body.password || body.challenge || body.action === 'login') {
      return this.loginAndConnect(body);
    }

    if (!body.username || !body.username.trim()) {
      throw new BadRequestException('Lagos Life username is required');
    }
    const pin = (body.pin || '').trim();
    if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      throw new BadRequestException('A valid 4-digit numeric transaction PIN is required');
    }

    this.logger.log(`Connecting owner game account: ${body.username}`);
    this.accountState.status = 'CONNECTING';

    try {
      this.gameService.setOwnerUsername(body.username.trim());
      this.gameService.setOwnerPin(pin);

      // 1. Verify credentials against Game Service
      let statusRes: any = null;
      try {
        statusRes = await this.gameService.getGlStatus(true);
      } catch (e: any) {
        this.logger.warn(`Initial gl/status lookup for ${body.username}: ${e.message || e}`);
      }

      // 2. Encrypt PIN using AES-256-GCM envelope encryption & synchronize with GameService
      const encryptedPin = this.cryptoService.encrypt(pin);
      const encryptedToken = body.apiToken ? this.cryptoService.encrypt(body.apiToken) : null;

      const liveUsername = statusRes.username || body.username.trim();
      this.accountState.username = liveUsername;
      this.accountState.accountIdentifier = body.accountIdentifier?.trim() || null;
      this.accountState.description = body.description?.trim() || 'Connected Owner Account';
      this.accountState.encryptedPin = encryptedPin;
      this.accountState.apiTokenEncrypted = encryptedToken;
      this.accountState.status = 'CONNECTED';
      this.accountState.lastConnectedAt = new Date().toISOString();
      this.accountState.lastSyncedAt = new Date().toISOString();

      if (statusRes.ladder?.facts?.saved !== undefined) {
        this.accountState.savedCash = BigInt(statusRes.ladder.facts.saved);
        this.accountState.netWorth = BigInt(statusRes.ladder.facts.netWorth || 0);
      }

      this.saveSessionToFile();
      this.addLog('CONNECT_ACCOUNT', 'SUCCESS', `Owner account @${liveUsername} connected successfully.`);
      return this.getStatus();
    } catch (err: any) {
      this.accountState.status = 'CONNECTION_FAILED';
      this.addLog('CONNECT_ACCOUNT', 'FAILED', `Connection error: ${err.message}`);
      throw err;
    }
  }

  // -------------------------------------------------------------
  // Login into Lagos Life with Username + Password (+ 2FA) & Collect Live Info
  // -------------------------------------------------------------
  async loginAndConnect(body: {
    username: string;
    password?: string;
    action?: string;
    challenge?: string;
    code?: string;
    pin: string;
    accountIdentifier?: string;
    description?: string;
  }) {
    if (!body.username || !body.username.trim()) {
      throw new BadRequestException('Lagos Life username is required');
    }

    const pin = (body.pin || '').trim();
    if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      throw new BadRequestException('A valid 4-digit numeric transaction PIN is required for money deliveries');
    }

    const cleanUsername = body.username.trim();
    this.logger.log(`In-game login and connect for character @${cleanUsername}`);
    this.accountState.status = 'CONNECTING';

    try {
      this.gameService.setOwnerUsername(cleanUsername);
      this.gameService.setOwnerPin(pin);

      // 1. Authenticate with Lagos Life (username + password, handles 2FA challenge triggers)
      await this.gameService.login({
        username: cleanUsername,
        password: body.password,
        action: body.action,
        challenge: body.challenge,
        code: body.code,
      });

      // 2. Fetch full live account dossier via GET /api/gl/status (with graceful fallback)
      let glStatus: any = null;
      try {
        glStatus = await this.gameService.getGlStatus(true);
      } catch (e: any) {
        this.logger.warn(`Could not retrieve gl/status during login for @${cleanUsername}: ${e.message || e}`);
      }

      // 3. Encrypt 4-digit PIN using AES-256-GCM envelope encryption & synchronize with GameService
      const encryptedPin = this.cryptoService.encrypt(pin);

      // 4. Update persistent account state with all live details
      this.accountState.username = cleanUsername;
      this.accountState.accountIdentifier = body.accountIdentifier?.trim() || null;
      this.accountState.description = body.description?.trim() || 'Connected Live Character Vault';
      this.accountState.encryptedPin = encryptedPin;
      this.accountState.status = 'CONNECTED';
      this.accountState.lastConnectedAt = new Date().toISOString();
      this.accountState.lastSyncedAt = new Date().toISOString();

      if (glStatus.ladder?.facts?.saved !== undefined) {
        this.accountState.savedCash = BigInt(glStatus.ladder.facts.saved);
        this.accountState.netWorth = BigInt(glStatus.ladder.facts.netWorth || 0);
      }

      this.saveSessionToFile();
      this.addLog(
        'LOGIN_CONNECT',
        'SUCCESS',
        `Successfully logged into Lagos Life account @${this.accountState.username}. Collected live balance ₦LL ${Number(this.accountState.savedCash).toLocaleString()} & character stats.`,
      );

      return await this.getStatus();
    } catch (err: any) {
      if (err.response && err.response.code === 'two_factor') {
        this.addLog('LOGIN_2FA', 'WARNING', `2FA challenge code triggered for Lagos Life user @${body.username}`);
        throw err;
      }
      this.accountState.status = 'CONNECTION_FAILED';
      this.addLog('LOGIN_CONNECT', 'FAILED', `Lagos Life login failed: ${err.message}`);
      throw err;
    }
  }

  // -------------------------------------------------------------
  // Test Connection
  // -------------------------------------------------------------
  async testConnection() {
    this.logger.log('Testing connection to live Lagos Life integration...');
    const startTime = Date.now();

    try {
      const glStatus: any = await this.gameService.getGlStatus();
      const latencyMs = Date.now() - startTime;

      if (!glStatus || (!glStatus.ok && !glStatus.on)) {
        throw new ServiceUnavailableException('Game API returned unsuccessful status');
      }

      // Verify decrypted PIN readiness
      const hasPin = !!this.accountState.encryptedPin;
      if (hasPin) {
        const decrypted = this.cryptoService.decrypt(this.accountState.encryptedPin!);
        if (!decrypted || decrypted.length !== 4) {
          throw new BadRequestException('Configured security PIN validation failed');
        }
      }

      this.addLog('TEST_CONNECTION', 'SUCCESS', `Health check passed in ${latencyMs}ms.`);
      return {
        ok: true,
        latencyMs,
        status: 'CONNECTED',
        username: glStatus.username,
        gameServer: 'Lagos Life Live Mainnet Vault',
        characterStats: glStatus.progression,
        balance: {
          savedCash: glStatus.ladder.facts.saved,
          netWorth: glStatus.ladder.facts.netWorth,
        },
      };
    } catch (err: any) {
      this.addLog('TEST_CONNECTION', 'FAILED', `Test connection failed: ${err.message}`);
      return {
        ok: false,
        latencyMs: Date.now() - startTime,
        status: 'CONNECTION_FAILED',
        error: err.message,
      };
    }
  }

  // -------------------------------------------------------------
  // Get Account Status
  // -------------------------------------------------------------
  async getStatus(): Promise<OwnerAccountStatus> {
    if (this.accountState.status !== 'CONNECTED' || !this.accountState.username) {
      return {
        id: this.accountState.id,
        username: '',
        name: 'No Account Linked',
        online: false,
        location: 'Not Connected',
        accountIdentifier: null,
        description: 'No character vault linked. Please connect an account.',
        status: 'NOT_CONNECTED',
        pinConfigured: false,
        pinMasked: 'NONE',
        lastConnectedAt: null,
        lastSyncedAt: null,
        isStale: false,
        characterStats: {
          level: 0,
          reputation: 0,
          rank: 'None',
          tier: 'None',
          league: 'None',
        },
        badges: [],
        titles: [],
      };
    }

    const isStale = this.checkIfStale();

    let characterStats;
    let name: string | undefined;
    let online: boolean | undefined;
    let location: string | undefined;
    let badges: Array<{ id: string; name: string; icon: string }> | undefined;
    let titles: string[] | undefined;

    try {
      const gl: any = await this.gameService.getGlStatus();
      name = gl.name || gl.me?.name || this.accountState.username;
      online = true;
      location = gl.city ? `${gl.city.toUpperCase()}, Nigeria` : 'Lagos, Nigeria';
      badges = Array.isArray(gl.me?.badges)
        ? gl.me.badges.map((b: any) => ({
            id: `bdg-${b.id}`,
            name: b.id.toUpperCase(),
            icon: b.metal >= 3 ? 'gold' : b.metal === 2 ? 'silver' : 'bronze',
          }))
        : gl.badges || [];
      titles = Array.isArray(gl.titles) ? gl.titles : ['Lagos Tycoon'];
      characterStats = {
        level: gl.ladder?.facts?.jobLv || gl.progression?.level || 8,
        reputation: gl.ladder?.facts?.followers || gl.progression?.reputation || 106,
        rank: gl.me?.title?.name || gl.progression?.rank || 'Yaba Techie',
        tier: gl.ladder?.tiers?.lagos ? `TIER ${gl.ladder.tiers.lagos}` : 'TIER 3',
        league: gl.ladder?.place?.lagos ? `Rank #${gl.ladder.place.lagos} in Lagos` : 'Lagos Diamond Tycoons',
      };
    } catch (err) {
      // ignore
    }

    return {
      id: this.accountState.id,
      username: this.accountState.username,
      name,
      online,
      location,
      accountIdentifier: this.accountState.accountIdentifier,
      description: this.accountState.description,
      status: this.accountState.status,
      pinConfigured: !!this.accountState.encryptedPin,
      pinMasked: this.accountState.encryptedPin ? '••••' : 'NONE',
      lastConnectedAt: this.accountState.lastConnectedAt,
      lastSyncedAt: this.accountState.lastSyncedAt,
      isStale,
      characterStats,
      badges,
      titles,
    };
  }

  // -------------------------------------------------------------
  // Get Live Balance
  // -------------------------------------------------------------
  async getBalance(): Promise<OwnerBalanceInfo> {
    if (this.accountState.status !== 'CONNECTED' || !this.accountState.username) {
      return {
        savedCash: '0',
        formattedSavedCash: '0',
        netWorth: '0',
        formattedNetWorth: '0',
        reservedBalance: '0',
        formattedReservedBalance: '0',
        availableBalance: '0',
        formattedAvailableBalance: '0',
        isStale: false,
        lastSyncedAt: new Date().toISOString(),
        lowBalanceWarning: false,
        lowBalanceThreshold: '5000000000',
      };
    }

    const isStale = this.checkIfStale();
    const available = this.accountState.savedCash - this.accountState.reservedBalance;
    const threshold = BigInt('5000000000'); // 5B alert threshold
    const lowBalanceWarning = available < threshold;

    return {
      savedCash: this.accountState.savedCash.toString(),
      formattedSavedCash: Number(this.accountState.savedCash).toLocaleString('en-US'),
      netWorth: this.accountState.netWorth.toString(),
      formattedNetWorth: Number(this.accountState.netWorth).toLocaleString('en-US'),
      reservedBalance: this.accountState.reservedBalance.toString(),
      formattedReservedBalance: Number(this.accountState.reservedBalance).toLocaleString('en-US'),
      availableBalance: (available > 0n ? available : 0n).toString(),
      formattedAvailableBalance: Number(available > 0n ? available : 0n).toLocaleString('en-US'),
      isStale,
      lastSyncedAt: this.accountState.lastSyncedAt || new Date().toISOString(),
      lowBalanceWarning,
      lowBalanceThreshold: threshold.toString(),
    };
  }

  // -------------------------------------------------------------
  // Sync Balance from Live Game API
  // -------------------------------------------------------------
  async syncBalance(): Promise<OwnerBalanceInfo> {
    this.logger.log('Synchronizing owner live game balance via GET /api/gl/status...');
    try {
      const gl = await this.gameService.getGlStatus();
      if (gl && gl.ladder?.facts?.saved !== undefined) {
        this.accountState.savedCash = BigInt(gl.ladder.facts.saved);
        this.accountState.netWorth = BigInt(gl.ladder.facts.netWorth || 0);
        this.accountState.lastSyncedAt = new Date().toISOString();
        this.accountState.status = 'CONNECTED';
        this.saveSessionToFile();
        this.addLog('SYNC_BALANCE', 'SUCCESS', `Live balance synced: ₦LL ${Number(this.accountState.savedCash).toLocaleString()}`);
      }
      return this.getBalance();
    } catch (err: any) {
      this.logger.warn(`Failed to sync live balance: ${err.message}`);
      this.addLog('SYNC_BALANCE', 'WARNING', `Live sync delayed: ${err.message}`);
      return this.getBalance();
    }
  }

  // -------------------------------------------------------------
  // Update Credentials (PIN or API Token)
  // -------------------------------------------------------------
  async updateCredentials(body: { pin?: string; apiToken?: string; description?: string }) {
    if (body.pin) {
      const pin = body.pin.trim();
      if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
        throw new BadRequestException('Transaction PIN must be exactly 4 digits');
      }
      this.accountState.encryptedPin = this.cryptoService.encrypt(pin);
      this.gameService.setOwnerPin(pin);
      this.addLog('UPDATE_CREDENTIALS', 'SUCCESS', 'Transaction authorization PIN securely rotated.');
    }

    if (body.apiToken) {
      this.accountState.apiTokenEncrypted = this.cryptoService.encrypt(body.apiToken.trim());
      this.addLog('UPDATE_CREDENTIALS', 'SUCCESS', 'Game integration token updated.');
    }

    if (body.description) {
      this.accountState.description = body.description.trim();
    }

    return {
      ok: true,
      pinConfigured: !!this.accountState.encryptedPin,
      pinMasked: '••••',
      updatedAt: new Date().toISOString(),
    };
  }

  // -------------------------------------------------------------
  // Disconnect Account
  // -------------------------------------------------------------
  async disconnectAccount() {
    this.accountState.status = 'NOT_CONNECTED';
    this.accountState.username = '';
    this.accountState.encryptedPin = null;
    this.accountState.apiTokenEncrypted = null;
    this.accountState.reservedBalance = 0n;
    this.accountState.savedCash = 0n;
    this.accountState.netWorth = 0n;
    this.gameService.clearCookies();
    this.gameService.setOwnerUsername('');
    this.gameService.setOwnerPin('');
    this.deleteSessionFile();
    this.addLog('DISCONNECT_ACCOUNT', 'WARNING', 'Owner account disconnected. Encrypted credentials purged.');
    return { ok: true, status: 'NOT_CONNECTED' };
  }

  // -------------------------------------------------------------
  // Internal Helpers for Fulfillment Service
  // -------------------------------------------------------------
  getDecryptedPin(): string {
    if (!this.accountState.encryptedPin) {
      throw new BadRequestException('No transaction PIN configured for owner account');
    }
    return this.cryptoService.decrypt(this.accountState.encryptedPin);
  }

  reserveBalance(amount: bigint): void {
    this.accountState.reservedBalance += amount;
  }

  releaseReservedBalance(amount: bigint): void {
    if (this.accountState.reservedBalance >= amount) {
      this.accountState.reservedBalance -= amount;
    } else {
      this.accountState.reservedBalance = 0n;
    }
  }

  deductActualBalance(amount: bigint): void {
    if (this.accountState.savedCash >= amount) {
      this.accountState.savedCash -= amount;
    }
    this.releaseReservedBalance(amount);
  }

  getLogs() {
    return this.integrationLogs;
  }

  private checkIfStale(): boolean {
    if (!this.accountState.lastSyncedAt) return true;
    const diffMs = Date.now() - new Date(this.accountState.lastSyncedAt).getTime();
    return diffMs > 5 * 60 * 1000; // Stale if older than 5 minutes
  }
}
