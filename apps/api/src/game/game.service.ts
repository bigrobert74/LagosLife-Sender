import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  OnApplicationBootstrap,
  Optional,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { DatabaseService } from '../database/database.service';

export interface LagosLifePlayer {
  id: string;
  username: string;
  name: string;
  rel: number;
  known: boolean;
  look: Record<string, any> | null;
  online: boolean;
  location: string;
}

export interface PlayerSearchResponse {
  players: LagosLifePlayer[];
}

export interface GlStatusResponse {
  ok: boolean;
  on?: boolean;
  username: string;
  name: string;
  online: boolean;
  location: string;
  progression: {
    level: number;
    reputation: number;
    rank: string;
    tier: string;
  };
  badges: Array<{ id: string; name: string; icon: string }>;
  titles: string[];
  ladder: {
    rank: number;
    league: string;
    facts: {
      saved: number;
      netWorth: number;
    };
  };
  raw?: any;
}

const FALLBACK_PLAYERS: LagosLifePlayer[] = [
  {
    id: 'a999a47af3d14c57bd65',
    username: 'badeletio',
    name: 'Kelvin',
    rel: 0,
    known: true,
    look: null,
    online: false,
    location: 'home',
  },
  {
    id: '6be28efe990345e3a0f9',
    username: 'orona',
    name: 'Orona',
    rel: 90,
    known: true,
    look: { skin: 'dark', outfit: 'designer_agbada', glasses: true },
    online: true,
    location: 'Lekki Phase 1',
  },
  {
    id: 'd42fb0d8c15d4b878ed7',
    username: 'sellinglagolifemoney',
    name: 'Selling Lagos Life Money',
    rel: 100,
    known: true,
    look: { skin: 'dark', outfit: 'suit_banker', glasses: false },
    online: true,
    location: 'Central Bank Vault, Marina, Lagos',
  },
  {
    id: 'usr-001',
    username: 'Tunde_Lekki99',
    name: 'Babatunde Adeleke',
    rel: 85,
    known: true,
    look: { skin: 'dark', outfit: 'designer_agbada', glasses: true },
    online: true,
    location: 'Lekki Phase 1',
  },
  {
    id: 'usr-002',
    username: 'Emeka_Banana',
    name: 'Chukwuemeka Okonkwo',
    rel: 60,
    known: true,
    look: { skin: 'brown', outfit: 'streetwear_hoodie', glasses: false },
    online: true,
    location: 'Banana Island',
  },
];

@Injectable()
export class GameService implements OnApplicationBootstrap {
  private readonly logger = new Logger(GameService.name);
  private readonly baseUrl =
    process.env.LAGOS_LIFE_API_BASE_URL || 'https://lagoslife.eliysites.com';

  // Live Cookies Jar (ll_session, ll_pass, ll_dev, ll_vid)
  private cookies: Map<string, string> = new Map();

  // Live Owner Game Character Account State (Reflects authentic live connected Lagos Life account)
  private savedCash = 0n; // Live Lagos Life cash balance
  private netWorth = 0n; // Live Lagos Life net worth
  private ownerUsername = ''; // Authenticated character username
  private ownerDisplayName = ''; // Display name from /api/auth/me
  private ownerPlayerId = ''; // Player ID from /api/auth/me
  private ownerPin = process.env.LAGOS_LIFE_OWNER_PIN || ''; // Official 4-digit transfer PIN
  private activeChallenges = new Map<string, { username: string; expiresAt: number }>();
  private knownPlayersCache = new Map<string, LagosLifePlayer>();
  private cachedGlStatus: { data: GlStatusResponse; timestamp: number } | null = null;
  private glStatusInFlight: Promise<GlStatusResponse> | null = null;
  private lastGlStatusErrorLog = 0;

  setOwnerPin(pin: string) {
    if (pin && pin.length === 4) {
      this.ownerPin = pin;
      this.logger.log(`Owner transaction PIN synchronized in GameService.`);
    } else if (!pin) {
      this.ownerPin = '';
    }
  }

  getOwnerPin(): string {
    return this.ownerPin;
  }

  setOwnerUsername(username: string) {
    const normalized = (username || '').trim();
    if (this.ownerUsername && normalized && this.ownerUsername.toLowerCase() !== normalized.toLowerCase()) {
      this.ownerDisplayName = '';
      this.ownerPlayerId = '';
      this.savedCash = 0n;
      this.netWorth = 0n;
    }
    this.ownerUsername = normalized;
    this.cachedGlStatus = null;
    this.glStatusInFlight = null;
  }

  setOwnerDisplayName(name: string) {
    this.ownerDisplayName = (name || '').trim();
  }

  getOwnerDisplayName(): string {
    return this.ownerDisplayName;
  }

  getOwnerUsername(): string {
    return this.ownerUsername;
  }

  getCookiesMap(): Record<string, string> {
    const map: Record<string, string> = {};
    for (const [k, v] of this.cookies.entries()) {
      map[k] = v;
    }
    return map;
  }

  setCookiesMap(cookies: Record<string, string>) {
    this.cookies.clear();
    for (const [k, v] of Object.entries(cookies)) {
      if (v) this.cookies.set(k, v);
    }
    this.cachedGlStatus = null;
    this.glStatusInFlight = null;
    this.saveCookiesToFile();
  }

  clearCookies(preserveDeviceCookies = false) {
    const preservedDev = preserveDeviceCookies ? this.cookies.get('ll_dev') : undefined;
    const preservedVid = preserveDeviceCookies ? this.cookies.get('ll_vid') : undefined;

    this.cookies.clear();
    if (preservedDev) this.cookies.set('ll_dev', preservedDev);
    if (preservedVid) this.cookies.set('ll_vid', preservedVid);

    this.savedCash = 0n;
    this.netWorth = 0n;
    this.ownerDisplayName = '';
    this.ownerPlayerId = '';
    this.cachedGlStatus = null;
    this.glStatusInFlight = null;

    if (preserveDeviceCookies && (preservedDev || preservedVid)) {
      this.saveCookiesToFile();
      return;
    }

    this.databaseService?.deleteKV('game_cookies');
    const cookiePaths = [
      path.resolve(process.cwd(), 'game_cookies.json'),
      path.resolve(process.cwd(), 'apps', 'api', 'data', 'game_cookies.json'),
      path.resolve(process.cwd(), 'apps', 'api', 'game_cookies.json'),
    ];
    for (const cookiePath of cookiePaths) {
      try {
        if (fs.existsSync(cookiePath)) fs.unlinkSync(cookiePath);
      } catch (e) {}
    }
  }

  constructor(@Optional() private readonly databaseService?: DatabaseService) {
    this.loadDeviceCookiesFromFile();
    // Pre-seed known live players cache
    for (const p of FALLBACK_PLAYERS) {
      this.knownPlayersCache.set(p.username.toLowerCase(), p);
      this.knownPlayersCache.set(p.id, p);
    }
  }

  onApplicationBootstrap() {
    this.loadDeviceCookiesFromFile();
  }

  private loadDeviceCookiesFromFile() {
    // 0. Check DatabaseService KV first (Postgres / unified dataDir is authoritative)
    const kvSession = this.databaseService?.getKV<any>('owner_account_session');
    const kvCookies = this.databaseService?.getKV<Record<string, string>>('game_cookies');

    if (kvSession) {
      if (kvSession.status === 'NOT_CONNECTED' || !kvSession.username) {
        this.cookies.clear();
        this.ownerUsername = '';
        this.ownerDisplayName = '';
        this.ownerPlayerId = '';
        this.savedCash = 0n;
        this.netWorth = 0n;
        return;
      }

      this.cookies.clear();
      if (kvSession.cookies) {
        for (const [k, v] of Object.entries(kvSession.cookies)) {
          if (v) this.cookies.set(k, v as string);
        }
      }
      if (kvCookies) {
        for (const [k, v] of Object.entries(kvCookies)) {
          if (v) this.cookies.set(k, v);
        }
      }
      if (kvSession.username) this.ownerUsername = kvSession.username;
      if (kvSession.displayName) this.ownerDisplayName = kvSession.displayName;
      if (kvSession.savedCash !== undefined) this.savedCash = BigInt(kvSession.savedCash || '0');
      if (kvSession.netWorth !== undefined) this.netWorth = BigInt(kvSession.netWorth || '0');
      this.cachedGlStatus = null;
      return;
    }

    if (kvCookies && Object.keys(kvCookies).length > 0) {
      this.cookies.clear();
      for (const [k, v] of Object.entries(kvCookies)) {
        if (v) this.cookies.set(k, v);
      }
    }

    // 1. Only inspect legacy disk session files if KV has no active session
    try {
      const sessionPaths = [
        ...(this.databaseService
          ? [path.join(this.databaseService.getDataDirectory(), 'owner_account_session.json')]
          : []),
        path.resolve(process.cwd(), 'apps', 'api', 'data', 'owner_account_session.json'),
        path.resolve(process.cwd(), 'owner_account_session.json'),
        path.resolve(process.cwd(), 'apps', 'api', 'owner_account_session.json'),
        path.resolve(__dirname, '..', '..', 'owner_account_session.json'),
        path.resolve(__dirname, '..', '..', '..', 'owner_account_session.json'),
      ];
      for (const sp of sessionPaths) {
        if (fs.existsSync(sp)) {
          const raw = fs.readFileSync(sp, 'utf-8');
          const parsed = JSON.parse(raw);
          if (parsed?.status === 'CONNECTED' && parsed?.username) {
            this.cookies.clear();
            if (parsed.cookies) {
              for (const [k, v] of Object.entries(parsed.cookies)) {
                if (v) this.cookies.set(k, v as string);
              }
            }
            this.ownerUsername = parsed.username;
            if (parsed.displayName) this.ownerDisplayName = parsed.displayName;
            if (parsed.savedCash !== undefined) this.savedCash = BigInt(parsed.savedCash || '0');
            if (parsed.netWorth !== undefined) this.netWorth = BigInt(parsed.netWorth || '0');
            this.logger.log(`Loaded active character session for @${this.ownerUsername}`);
          }
          break;
        }
      }
    } catch (err: any) {
      this.logger.debug(`Session file check skipped: ${err.message}`);
    }

    // 2. Check game_cookies.json only if cookies are still empty
    if (this.cookies.size === 0) {
      try {
        const cookieFile = path.resolve(process.cwd(), 'game_cookies.json');
        if (fs.existsSync(cookieFile)) {
          const raw = JSON.parse(fs.readFileSync(cookieFile, 'utf-8'));
          for (const [k, v] of Object.entries(raw)) {
            if (v) this.cookies.set(k, v as string);
          }
        }
      } catch (err: any) {
        // ignore
      }
    }
  }

  private saveCookiesToFile() {
    try {
      const obj: Record<string, string> = {};
      for (const [k, v] of this.cookies.entries()) {
        obj[k] = v;
      }
      this.databaseService?.setKV('game_cookies', obj);
      const p1 = path.resolve(process.cwd(), 'game_cookies.json');
      fs.writeFileSync(p1, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (e: any) {
      this.logger.debug(`Could not save cookies to file: ${e.message}`);
    }
  }

  public getHeaders(): Record<string, string> {
    const cookieHeader = Array.from(this.cookies.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');

    return {
      origin: this.baseUrl,
      referer: `${this.baseUrl}/?source=pwa`,
      'user-agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36',
      accept: '*/*',
      'content-type': 'application/json',
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
    };
  }

  private parseResponseCookies(res: Response) {
    try {
      const cookiesList: string[] =
        typeof (res.headers as any).getSetCookie === 'function'
          ? (res.headers as any).getSetCookie()
          : [res.headers.get('set-cookie') || ''];

      for (const raw of cookiesList) {
        if (!raw) continue;
        const cookiePair = raw.split(';')[0].trim();
        if (cookiePair.includes('=')) {
          const [k, ...vs] = cookiePair.split('=');
          this.cookies.set(k.trim(), vs.join('=').trim());
          this.logger.debug(`Stored session cookie: ${k.trim()}`);
        }
      }
    } catch (err) {
      // ignore
    }
  }

  public setCustomCookies(devCookie?: string, vidCookie?: string, extraCookies?: Record<string, string>) {
    if (devCookie && devCookie.trim()) this.cookies.set('ll_dev', devCookie.trim());
    if (vidCookie && vidCookie.trim()) this.cookies.set('ll_vid', vidCookie.trim());
    if (extraCookies) {
      for (const [k, v] of Object.entries(extraCookies)) {
        if (k.trim() && v && v.trim()) {
          this.cookies.set(k.trim(), v.trim());
        }
      }
    }
    this.cachedGlStatus = null;
    this.glStatusInFlight = null;
    this.saveCookiesToFile();
  }

  public importCookieString(rawCookieHeader: string): string[] {
    const cleaned = (rawCookieHeader || '').replace(/^cookie:\s*/i, '').trim();
    const importedKeys: string[] = [];
    if (!cleaned) return importedKeys;

    for (const part of cleaned.split(';')) {
      const idx = part.indexOf('=');
      if (idx <= 0) continue;
      const key = part.slice(0, idx).trim();
      const val = part.slice(idx + 1).trim();
      if (key && val) {
        this.cookies.set(key, val);
        importedKeys.push(key);
      }
    }

    if (importedKeys.length > 0) {
      this.cachedGlStatus = null;
      this.glStatusInFlight = null;
      this.saveCookiesToFile();
    }
    return importedKeys;
  }

  // -------------------------------------------------------------
  // 1. POST /api/auth/login — Game Authentication & 2FA
  // -------------------------------------------------------------
  async login(body: {
    action?: string;
    challenge?: string;
    code?: string;
    username: string;
    password?: string;
  }) {
    const cleanUsername = (body.username || '').trim();
    const isTwoFactorStep = Boolean(body.challenge || body.action === 'login');
    this.logger.log(`Live Game Auth Login attempt for username: ${cleanUsername} (2FA step: ${isTwoFactorStep}) at ${this.baseUrl}/api/auth/login`);

    // On initial login for a character, clear previous account's session cookies & cached state
    if (!isTwoFactorStep) {
      this.cookies.delete('ll_session');
      this.cookies.delete('ll_pass');
      this.savedCash = 0n;
      this.netWorth = 0n;
      this.ownerDisplayName = '';
      this.ownerPlayerId = '';
      this.cachedGlStatus = null;
      this.glStatusInFlight = null;
    }

    // If external live server configured, attempt proxying first
    if (process.env.LAGOS_LIFE_LIVE_SYNC === 'true') {
      try {
        const res = await fetch(`${this.baseUrl}/api/auth/login`, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(body),
        });

        this.parseResponseCookies(res);
        const data = await res.json();

        if (!res.ok) {
          throw new HttpException(data, res.status);
        }

        this.ownerUsername = data?.user?.username || cleanUsername;
        if (data?.user?.name) this.ownerDisplayName = data.user.name;
        if (data?.user?.id) this.ownerPlayerId = data.user.id;
        this.cachedGlStatus = null;
        this.glStatusInFlight = null;
        this.saveCookiesToFile();
        return data;
      } catch (err: any) {
        if (err instanceof HttpException) throw err;
        this.logger.error(`Live Lagos Life login error for ${cleanUsername}: ${err?.message || err}`);
        throw new HttpException(
          {
            error: `Unable to reach Lagos Life login server: ${err?.message || 'network error'}`,
            code: 'live_auth_unreachable',
          },
          HttpStatus.BAD_GATEWAY,
        );
      }
    }

    // Step 2: 2FA Verification (action: "login", challenge: "...", code: "...")
    if (body.action === 'login' || body.challenge) {
      if (!body.code || body.code.trim().length === 0) {
        throw new HttpException(
          { error: 'Verification code is required', code: 'two_factor_invalid' },
          HttpStatus.UNAUTHORIZED,
        );
      }

      const challengeToken = body.challenge || '';
      const isValidCode = body.code === '123456' || body.code.length >= 4;

      if (!isValidCode) {
        throw new HttpException(
          { error: 'Invalid two-factor authentication code', code: 'invalid_code' },
          HttpStatus.UNAUTHORIZED,
        );
      }

      this.activeChallenges.delete(challengeToken);
      this.logger.log(`2FA verified successfully for game user: ${body.username}`);
      return { ok: true, username: body.username };
    }

    // Step 1: Initial Login Credentials
    if (!body.username || !body.password) {
      throw new HttpException(
        { error: 'Username and password are required', code: 'missing_credentials' },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Trigger 2FA if requested by security policy
    const shouldTrigger2Fa =
      body.username.toLowerCase().includes('2fa') ||
      body.password === 'trigger2fa' ||
      body.password === 'SecurePassword2026!';

    if (shouldTrigger2Fa && !body.challenge) {
      const challengeJwt = `ch_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
      this.activeChallenges.set(challengeJwt, {
        username: body.username,
        expiresAt: Date.now() + 10 * 60 * 1000,
      });

      this.logger.log(`Triggering 2FA challenge for ${body.username} (challenge: ${challengeJwt})`);
      throw new HttpException(
        {
          error: 'Two-factor authentication required for this device',
          code: 'two_factor',
          challenge: challengeJwt,
          method: 'email',
          to: 'm***@lagoslifemoney.shop',
          username: body.username,
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    this.ownerUsername = body.username.trim();
    this.saveCookiesToFile();
    return { ok: true, username: body.username };
  }

  // -------------------------------------------------------------
  // 2. GET /api/players?q=<search> — Player Lookup
  // -------------------------------------------------------------
  async searchPlayers(query: string): Promise<PlayerSearchResponse> {
    if (!query || query.trim().length === 0) {
      return { players: [] };
    }

    const trimmed = query.trim();
    const cleanQuery = trimmed.replace(/^@/, '');

    // Check pre-cached live players first (ignore synthetic usr- placeholders)
    const cached = this.knownPlayersCache.get(cleanQuery.toLowerCase()) || this.knownPlayersCache.get(cleanQuery);
    if (cached && cached.id && !cached.id.startsWith('usr-')) {
      return { players: [cached] };
    }

    // Attempt live game query if configured
    try {
      const url = `${this.baseUrl}/api/players?q=${encodeURIComponent(cleanQuery)}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = (await res.json()) as PlayerSearchResponse;
        if (data && Array.isArray(data.players) && data.players.length > 0) {
          for (const p of data.players) {
            if (p.username) this.knownPlayersCache.set(p.username.toLowerCase(), p);
            if (p.id) this.knownPlayersCache.set(p.id, p);
          }
          return data;
        }
      }
    } catch (err: any) {
      this.logger.warn(`Live player search error for '${cleanQuery}': ${err?.message || err}`);
    }

    const lowerQuery = cleanQuery.toLowerCase();
    const matched = FALLBACK_PLAYERS.filter(
      (p) =>
        p.username.toLowerCase().includes(lowerQuery) ||
        p.name.toLowerCase().includes(lowerQuery) ||
        p.id.toLowerCase() === lowerQuery,
    );

    if (matched.length === 0 && process.env.LAGOS_LIFE_LIVE_SYNC !== 'true' && cleanQuery.length >= 2) {
      matched.push({
        id: `usr-${Math.floor(1000 + Math.random() * 9000)}`,
        username: cleanQuery,
        name: cleanQuery.replace(/_/g, ' '),
        rel: 50,
        known: true,
        look: null,
        online: true,
        location: 'Lagos Mainland',
      });
    }

    return { players: matched };
  }

  // -------------------------------------------------------------
  // 3. POST /api/send — Transfer Money
  // -------------------------------------------------------------
  async sendMoney(body: { to: string; amount: number; pin: string; twoStepCode?: string }) {
    this.logger.log(`Live Cash Send: transferring ${body.amount} to recipient ID: ${body.to} at ${this.baseUrl}/api/send`);

    // 0. Lagos Life Game Server Rule: Maximum 100 Billion per single transfer
    if (body.amount > 100_000_000_000) {
      throw new HttpException(
        {
          error: 'You can send up to ₦100,000,000,000 at a time',
          code: 'exceeds_max_batch',
          limit: 100000000000,
          recommendation: 'Orders exceeding ₦100B must be sent in batches of up to ₦100B with a 70-second cooldown.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // 0.1 Security PIN Resolution:
    let pin = (body.pin || '').toString().trim();
    if (!pin && this.ownerPin) {
      pin = this.ownerPin;
    }

    // 0.2 Target Player Resolution:
    let targetTo = (body.to || '').trim();

    if (targetTo.startsWith('usr-') || targetTo.startsWith('@') || targetTo.length !== 20) {
      const cleanTarget = targetTo.replace(/^@/, '').trim();
      try {
        const searchRes = await this.searchPlayers(cleanTarget);
        let matched = searchRes.players?.find(
          (p) =>
            p.username.toLowerCase() === cleanTarget.toLowerCase() ||
            p.id === targetTo ||
            p.name.toLowerCase() === cleanTarget.toLowerCase(),
        );

        if (!matched) {
          for (const p of this.knownPlayersCache.values()) {
            if (p.id === targetTo || p.username.toLowerCase() === cleanTarget.toLowerCase()) {
              matched = p;
              break;
            }
          }
        }

        if (!matched) {
          for (const p of FALLBACK_PLAYERS) {
            if (p.id === targetTo || p.username.toLowerCase() === cleanTarget.toLowerCase()) {
              matched = p;
              break;
            }
          }
        }

        if (matched && matched.id && matched.id.length === 20 && !matched.id.startsWith('usr-')) {
          this.logger.log(`Auto-resolved recipient '${targetTo}' to live Lagos Life player ID: ${matched.id} (@${matched.username})`);
          targetTo = matched.id;
        }
      } catch (err) {
        this.logger.warn(`Could not resolve player '${targetTo}': ${err}`);
      }
    }

    // If external live server configured, attempt proxying
    if (process.env.LAGOS_LIFE_LIVE_SYNC === 'true') {
      if (!targetTo || targetTo.startsWith('usr-') || targetTo.length < 16) {
        throw new HttpException(
          {
            ok: false,
            error: `Recipient character '${body.to}' could not be resolved to a valid Lagos Life player ID.`,
            code: 'recipient_not_found',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);

        const sendPayload: Record<string, any> = {
          to: targetTo,
          amount: body.amount,
          pin,
        };
        if (body.twoStepCode && body.twoStepCode.trim()) {
          sendPayload.code = body.twoStepCode.trim();
          sendPayload.twoStepCode = body.twoStepCode.trim();
        }

        const res = await fetch(`${this.baseUrl}/api/send`, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(sendPayload),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        this.parseResponseCookies(res);
        this.saveCookiesToFile();

        const retryAfterHeader = res.headers.get('retry-after');
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const rawError =
            data?.error ||
            data?.message ||
            (typeof data === 'string' && data ? data : JSON.stringify(data)) ||
            `Lagos Life API returned HTTP ${res.status}`;

          const retryAfterSeconds =
            Number(data?.retryAfter || data?.retry_after || data?.cooldown || retryAfterHeader || 0) || undefined;

          this.logger.warn(`Live send rejected by Lagos Life (HTTP ${res.status}): ${rawError}`);
          throw new HttpException(
            {
              ok: false,
              error: rawError,
              code: data?.code || (res.status === 429 ? 'rate_limit_restricted' : 'send_failed'),
              statusCode: res.status,
              limit: data?.limit ?? data?.max ?? data?.maxAmount,
              left: data?.left,
              retryAfterSeconds,
              data,
            },
            res.status,
          );
        }

        // Update live cached cash immediately on success
        const updatedBal = data?.balance ?? data?.newBalance ?? data?.currentBalance;
        if (updatedBal !== undefined && updatedBal !== null && !Number.isNaN(Number(updatedBal))) {
          this.savedCash = BigInt(Math.max(0, Math.floor(Number(updatedBal))));
        } else if (this.savedCash >= BigInt(Math.floor(body.amount || 0))) {
          this.savedCash -= BigInt(Math.floor(body.amount || 0));
        }
        this.cachedGlStatus = null;

        const txId = data?.id || data?.txId || `gtx-${Date.now()}`;
        return {
          ok: true,
          txId,
          balance: Number(this.savedCash),
          ...data,
        };
      } catch (err: any) {
        if (err instanceof HttpException) throw err;
        this.logger.warn(`Live send proxy error: ${err.message || err}`);
        throw new HttpException(
          {
            ok: false,
            error: err.message || 'Lagos Life live transfer connection failed',
            code: 'network_error',
            statusCode: HttpStatus.BAD_GATEWAY,
          },
          HttpStatus.BAD_GATEWAY,
        );
      }
    }

    // 0. Enforce Connected Owner Account
    if (!this.ownerUsername) {
      throw new HttpException(
        { error: 'No Lagos Life owner character is connected to dispatch payment from. Link an account in Owner Account Link.', code: 'account_not_connected' },
        HttpStatus.FORBIDDEN,
      );
    }

    // 1. Validate Target Player Exists
    const allPlayers = [...FALLBACK_PLAYERS];
    const targetPlayer = allPlayers.find(
      (p) => p.id === body.to || p.username.toLowerCase() === body.to.toLowerCase(),
    );

    if (!body.to || (!targetPlayer && !body.to.startsWith('usr-') && body.to.length < 8)) {
      throw new HttpException(
        { error: 'Player not found with specified character ID', code: 'bad_id' },
        HttpStatus.NOT_FOUND,
      );
    }

    // 2. Validate 4-digit PIN against connected owner account PIN
    if (!pin || pin.length !== 4) {
      throw new HttpException(
        { error: 'A valid 4-digit security PIN is required', code: 'invalid_pin' },
        HttpStatus.FORBIDDEN,
      );
    }

    if (!this.ownerPin || pin !== this.ownerPin) {
      throw new HttpException(
        { error: 'Incorrect 4-digit security PIN entered for linked account', code: 'incorrect_pin' },
        HttpStatus.FORBIDDEN,
      );
    }

    // 3. Debit owner account cash
    const amountBig = BigInt(Math.floor(body.amount || 0));
    if (amountBig > this.savedCash) {
      throw new HttpException(
        { error: `Insufficient character balance in owner account @${this.ownerUsername}`, code: 'insufficient_funds' },
        HttpStatus.BAD_REQUEST,
      );
    }

    this.savedCash -= amountBig;
    const txId = `LL-TX-${Date.now().toString().slice(-6)}`;

    return {
      ok: true,
      txId,
      to: body.to,
      recipientUsername: targetPlayer?.username || body.to,
      amount: Number(body.amount),
      balance: Number(this.savedCash),
      timestamp: new Date().toISOString(),
    };
  }

  // -------------------------------------------------------------
  // 4. GET /api/auth/me, /api/save & /api/gl/status — Live Account Data Collection
  // -------------------------------------------------------------
  async getAuthMe(): Promise<{ id?: string; username?: string; name?: string } | null> {
    if (process.env.LAGOS_LIFE_LIVE_SYNC !== 'true' || this.cookies.size === 0) {
      return null;
    }
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${this.baseUrl}/api/auth/me`, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) return null;
      const data = await res.json();
      const user = data?.user;
      if (user) {
        if (user.username) this.ownerUsername = user.username;
        if (user.name) this.ownerDisplayName = user.name;
        if (user.id) this.ownerPlayerId = user.id;
        return { id: user.id, username: user.username, name: user.name };
      }
      return null;
    } catch {
      return null;
    }
  }

  async getSaveSummary(): Promise<{ name?: string; money?: number; city?: string } | null> {
    if (process.env.LAGOS_LIFE_LIVE_SYNC !== 'true' || this.cookies.size === 0) {
      return null;
    }
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${this.baseUrl}/api/save`, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) return null;
      const data = await res.json();
      const simName = data?.game?.sim?.name;
      const money = data?.game?.money;
      const city = data?.game?.city || data?.game?.sim?.city;
      if (simName && !this.ownerDisplayName) {
        this.ownerDisplayName = simName;
      }
      return {
        name: simName,
        money: typeof money === 'number' ? money : undefined,
        city,
      };
    } catch {
      return null;
    }
  }

  async getGlStatus(forceFresh = false): Promise<GlStatusResponse> {
    const now = Date.now();
    // 1. In-memory TTL cache (15 seconds) - prevents rapid hammering and log spam
    if (!forceFresh && this.cachedGlStatus && now - this.cachedGlStatus.timestamp < 15000) {
      return this.cachedGlStatus.data;
    }

    // 2. In-flight promise deduplication: coalesce simultaneous calls
    if (!forceFresh && this.glStatusInFlight) {
      return await this.glStatusInFlight;
    }

    const fetchPromise = (async (): Promise<GlStatusResponse> => {
      if (process.env.LAGOS_LIFE_LIVE_SYNC === 'true' && (this.cookies.size > 0 || this.ownerUsername)) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s fast timeout

          const [glRes, authMe] = await Promise.all([
            fetch(`${this.baseUrl}/api/gl/status`, {
              method: 'GET',
              headers: this.getHeaders(),
              signal: controller.signal,
            }),
            this.getAuthMe(),
          ]);
          clearTimeout(timeoutId);

          if (glRes.ok) {
            const raw = await glRes.json();
            const needsSaveFallback =
              raw?.ladder?.facts?.saved === undefined ||
              raw?.ladder?.facts?.saved === null ||
              (!authMe?.name && !this.ownerDisplayName) ||
              forceFresh;
            const saveSummary = needsSaveFallback ? await this.getSaveSummary() : null;

            const savedRaw = raw?.ladder?.facts?.saved;
            const savedNum =
              savedRaw !== undefined && savedRaw !== null
                ? Number(savedRaw)
                : saveSummary?.money !== undefined
                  ? Number(saveSummary.money)
                  : Number(this.savedCash);
            const netWorthNum =
              raw?.ladder?.facts?.netWorth !== undefined && raw?.ladder?.facts?.netWorth !== null
                ? Number(raw.ladder.facts.netWorth)
                : savedNum || Number(this.netWorth);

            this.savedCash = BigInt(Math.max(0, Math.floor(savedNum || 0)));
            this.netWorth = BigInt(Math.max(0, Math.floor(netWorthNum || 0)));

            const resolvedUsername = authMe?.username || this.ownerUsername || '';
            const resolvedDisplayName =
              authMe?.name ||
              saveSummary?.name ||
              this.ownerDisplayName ||
              raw?.me?.title?.name ||
              resolvedUsername ||
              'Connected Account';

            if (authMe?.name || saveSummary?.name) {
              this.ownerDisplayName = authMe?.name || saveSummary?.name || this.ownerDisplayName;
            }
            if (resolvedUsername) {
              this.ownerUsername = resolvedUsername;
            }

            const cityRaw = raw?.city || saveSummary?.city;
            const placeRank = raw?.ladder?.place?.lagos;
            const tierVal = raw?.ladder?.tiers?.lagos;
            const titleName = raw?.me?.title?.name;

            const result: GlStatusResponse = {
              ok: true,
              on: raw?.on !== undefined ? Boolean(raw.on) : true,
              username: resolvedUsername,
              name: resolvedDisplayName,
              online: Boolean(raw?.on ?? true),
              location: cityRaw ? `${String(cityRaw).toUpperCase()}, Nigeria` : 'Lagos, Nigeria',
              progression: {
                level: raw?.ladder?.facts?.jobLv ?? 0,
                reputation: raw?.ladder?.facts?.followers ?? 0,
                rank: titleName || 'Unranked',
                tier: tierVal !== undefined && tierVal !== null ? `TIER ${tierVal}` : 'Unranked',
              },
              badges: Array.isArray(raw?.me?.badges)
                ? raw.me.badges.map((b: any) => ({
                    id: `bdg-${b.id}`,
                    name: String(b.id || '').toUpperCase(),
                    icon: b.metal >= 3 ? 'gold' : b.metal === 2 ? 'silver' : 'bronze',
                  }))
                : [],
              titles: Array.isArray(raw?.titles) ? raw.titles : [],
              ladder: {
                rank: placeRank ?? 0,
                league: placeRank ? `Rank #${placeRank} in Lagos` : 'Unplaced in Lagos',
                facts: {
                  saved: savedNum || 0,
                  netWorth: netWorthNum || 0,
                },
              },
              raw,
            };

            this.cachedGlStatus = { data: result, timestamp: Date.now() };
            return result;
          } else {
            if (now - this.lastGlStatusErrorLog > 60000) {
              this.logger.warn(`Live gl/status returned HTTP ${glRes.status}. Attempting fallback profile.`);
              this.lastGlStatusErrorLog = now;
            }
          }
        } catch (err: any) {
          // Throttled warning: log at most once every 60 seconds to prevent console flooding
          if (now - this.lastGlStatusErrorLog > 60000) {
            this.logger.warn(`Live gl/status proxy issue: ${err.message || err}. Serving cached/saved profile.`);
            this.lastGlStatusErrorLog = now;
          }
        }
      }

      // If live sync failed but we have a cached status for the SAME owner, return it
      if (this.cachedGlStatus && this.cachedGlStatus.data.username === this.ownerUsername) {
        return this.cachedGlStatus.data;
      }

      // Honest fallback profile derived strictly from current connected owner state (zero hardcoded accounts/stats)
      return {
        ok: !!this.ownerUsername,
        on: !!this.ownerUsername,
        username: this.ownerUsername || '',
        name: this.ownerDisplayName || this.ownerUsername || 'Not Connected',
        online: false,
        location: 'Lagos, Nigeria',
        progression: {
          level: 0,
          reputation: 0,
          rank: 'Unranked',
          tier: 'Unranked',
        },
        badges: [],
        titles: [],
        ladder: {
          rank: 0,
          league: this.ownerUsername ? 'Awaiting Live Sync' : 'Not Connected',
          facts: {
            saved: Number(this.savedCash) || 0,
            netWorth: Number(this.netWorth) || 0,
          },
        },
      };
    })();

    this.glStatusInFlight = fetchPromise;
    try {
      return await fetchPromise;
    } finally {
      this.glStatusInFlight = null;
    }
  }

  async syncBalanceFromLive() {
    const status = await this.getGlStatus(true);
    if (status?.ladder?.facts?.saved !== undefined) {
      this.savedCash = BigInt(Math.max(0, Math.floor(status.ladder.facts.saved)));
    }
    if (status?.ladder?.facts?.netWorth !== undefined) {
      this.netWorth = BigInt(Math.max(0, Math.floor(status.ladder.facts.netWorth)));
    }
    return status;
  }
}
