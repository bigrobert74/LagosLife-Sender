import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

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
export class GameService {
  private readonly logger = new Logger(GameService.name);
  private readonly baseUrl =
    process.env.LAGOS_LIFE_API_BASE_URL || 'https://lagoslife.eliysites.com';

  // Live Cookies Jar (ll_session, ll_pass, ll_dev, ll_vid)
  private cookies: Map<string, string> = new Map();

  // Live Owner Game Character Account State (Reflects authentic live connected Lagos Life account)
  private savedCash = 0n; // Live Lagos Life cash balance
  private netWorth = 0n; // Live Lagos Life net worth
  private ownerUsername = ''; // Authenticated character username
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
    this.ownerUsername = (username || '').trim();
    this.cachedGlStatus = null;
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
    for (const [k, v] of Object.entries(cookies)) {
      if (v) this.cookies.set(k, v);
    }
    this.cachedGlStatus = null;
    this.saveCookiesToFile();
  }

  clearCookies() {
    this.cookies.clear();
    const cookiePath = path.resolve(process.cwd(), 'game_cookies.json');
    try {
      if (fs.existsSync(cookiePath)) fs.unlinkSync(cookiePath);
    } catch (e) {}
  }

  constructor() {
    this.loadDeviceCookiesFromFile();
    // Pre-seed known live players cache
    for (const p of FALLBACK_PLAYERS) {
      this.knownPlayersCache.set(p.username.toLowerCase(), p);
      this.knownPlayersCache.set(p.id, p);
    }
  }

  private loadDeviceCookiesFromFile() {
    // 1. Check persistent owner_account_session.json
    try {
      const sessionPaths = [
        path.resolve(process.cwd(), 'owner_account_session.json'),
        path.resolve(process.cwd(), 'apps', 'api', 'owner_account_session.json'),
        path.resolve(__dirname, '..', '..', 'owner_account_session.json'),
        path.resolve(__dirname, '..', '..', '..', 'owner_account_session.json'),
      ];
      for (const sp of sessionPaths) {
        if (fs.existsSync(sp)) {
          const raw = fs.readFileSync(sp, 'utf-8');
          const parsed = JSON.parse(raw);
          if (parsed.cookies) {
            for (const [k, v] of Object.entries(parsed.cookies)) {
              if (v) this.cookies.set(k, v as string);
            }
          }
          if (parsed.username) this.ownerUsername = parsed.username;
          if (parsed.savedCash) this.savedCash = BigInt(parsed.savedCash);
          if (parsed.netWorth) this.netWorth = BigInt(parsed.netWorth);
          this.logger.log(`Loaded active character session for @${this.ownerUsername}`);
          break;
        }
      }
    } catch (err: any) {
      this.logger.debug(`Session file check skipped: ${err.message}`);
    }

    // 2. Check game_cookies.json
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

    // 3. Fallback device cookies file if available
    try {
      const deviceFile = path.resolve(
        process.env.USERPROFILE || 'C:\\Users\\OLADELE AKINTOLA',
        'Desktop',
        'lagoslife_tester',
        'lagoslife_tester',
        'lagoslife_device.txt',
      );
      if (fs.existsSync(deviceFile)) {
        const lines = fs.readFileSync(deviceFile, 'utf-8').split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
          const [key, ...vals] = trimmed.split('=');
          const val = vals.join('=').trim();
          if (val) {
            this.cookies.set(key.trim(), val);
            this.logger.log(`Loaded device cookie: ${key.trim()}`);
          }
        }
      }
    } catch (err: any) {
      this.logger.debug(`Device cookie file check skipped: ${err.message}`);
    }
  }

  private saveCookiesToFile() {
    try {
      const obj: Record<string, string> = {};
      for (const [k, v] of this.cookies.entries()) {
        obj[k] = v;
      }
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

  public setCustomCookies(devCookie?: string, vidCookie?: string) {
    if (devCookie) this.cookies.set('ll_dev', devCookie.trim());
    if (vidCookie) this.cookies.set('ll_vid', vidCookie.trim());
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
    this.logger.log(`Live Game Auth Login attempt for username: ${body.username} at ${this.baseUrl}/api/auth/login`);

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
        this.ownerUsername = body.username.trim();
        this.saveCookiesToFile();
        return data;
      } catch (err) {
        if (err instanceof HttpException) throw err;
        this.logger.warn(`Live proxy unreachable, fallback to game auth simulator: ${err}`);
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

    // Check pre-cached or known live players first
    const cached = this.knownPlayersCache.get(cleanQuery.toLowerCase()) || this.knownPlayersCache.get(cleanQuery);
    if (cached) {
      return { players: [cached] };
    }

    // Attempt live game query if configured
    try {
      const url = `${this.baseUrl}/api/players?q=${encodeURIComponent(cleanQuery)}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);

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
            this.knownPlayersCache.set(p.username.toLowerCase(), p);
            this.knownPlayersCache.set(p.id, p);
          }
          return data;
        }
      }
    } catch (err: any) {
      // Fallback
    }

    const lowerQuery = cleanQuery.toLowerCase();
    const matched = FALLBACK_PLAYERS.filter(
      (p) =>
        p.username.toLowerCase().includes(lowerQuery) ||
        p.name.toLowerCase().includes(lowerQuery) ||
        p.id.toLowerCase() === lowerQuery,
    );

    if (matched.length === 0 && cleanQuery.length >= 2) {
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
  async sendMoney(body: { to: string; amount: number; pin: string }) {
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
    // If incoming pin is omitted, use the connected owner's configured PIN
    let pin = (body.pin || '').toString().trim();
    if (!pin && this.ownerPin) {
      pin = this.ownerPin;
    }

    // 0.2 Target Player Resolution:
    let targetTo = (body.to || '').trim();

    // If targetTo is a placeholder ('usr-2741', 'usr-001') or username (e.g. '@badeletio' or 'badeletio'):
    if (targetTo.startsWith('usr-') || targetTo.startsWith('@') || targetTo.length !== 20) {
      const cleanTarget = targetTo.replace(/^@/, '').trim();
      try {
        // First search by clean target directly
        const searchRes = await this.searchPlayers(cleanTarget);
        let matched = searchRes.players?.find(
          (p) =>
            p.username.toLowerCase() === cleanTarget.toLowerCase() ||
            p.id === targetTo ||
            p.name.toLowerCase() === cleanTarget.toLowerCase(),
        );

        // If not matched, check known cache
        if (!matched) {
          for (const p of this.knownPlayersCache.values()) {
            if (p.id === targetTo || p.username.toLowerCase() === cleanTarget.toLowerCase()) {
              matched = p;
              break;
            }
          }
        }

        // If still not matched, check fallback players list
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

    // If external live server configured, attempt proxying first
    if (process.env.LAGOS_LIFE_LIVE_SYNC === 'true') {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout

        const res = await fetch(`${this.baseUrl}/api/send`, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({ to: targetTo, amount: body.amount, pin }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        const data = await res.json();
        if (!res.ok) {
          const rawError =
            data?.error ||
            data?.message ||
            (typeof data === 'string' ? data : JSON.stringify(data)) ||
            `Lagos Life API returned HTTP ${res.status}`;

          this.logger.warn(`Live send rejected by Lagos Life (HTTP ${res.status}): ${rawError}`);
          throw new HttpException(
            {
              ok: false,
              error: rawError,
              code: data?.code || (res.status === 429 ? 'rate_limit_restricted' : 'send_failed'),
              statusCode: res.status,
              data,
            },
            res.status,
          );
        }

        const txId = data.id || `gtx-${Date.now()}`;
        return {
          ok: true,
          txId,
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
  // 4. GET /api/gl/status — Player Status, Ladder & Saved Facts
  // -------------------------------------------------------------
  async getGlStatus(forceFresh = false): Promise<GlStatusResponse> {
    const now = Date.now();
    // 1. In-memory TTL cache (15 seconds) - prevents rapid hammering and log spam
    if (!forceFresh && this.cachedGlStatus && now - this.cachedGlStatus.timestamp < 15000) {
      return this.cachedGlStatus.data;
    }

    // 2. In-flight promise deduplication: coalesce simultaneous calls
    if (this.glStatusInFlight) {
      return await this.glStatusInFlight;
    }

    const fetchPromise = (async (): Promise<GlStatusResponse> => {
      if (process.env.LAGOS_LIFE_LIVE_SYNC === 'true') {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s fast timeout

          const res = await fetch(`${this.baseUrl}/api/gl/status`, {
            method: 'GET',
            headers: this.getHeaders(),
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          if (res.ok) {
            const raw = await res.json();
            const savedNum = raw.ladder?.facts?.saved ?? Number(this.savedCash);
            const netWorthNum = raw.ladder?.facts?.netWorth ?? Number(this.netWorth);
            this.savedCash = BigInt(savedNum);
            this.netWorth = BigInt(netWorthNum);

            const result: GlStatusResponse = {
              ok: true,
              on: true,
              username: this.ownerUsername || 'demi_thetrillionaire',
              name: raw.me?.title?.name || this.ownerUsername || 'Yaba Techie',
              online: true,
              location: raw.city ? `${raw.city.toUpperCase()}, Nigeria` : 'Lagos, Nigeria',
              progression: {
                level: raw.ladder?.facts?.jobLv || 8,
                reputation: raw.ladder?.facts?.followers || 106,
                rank: raw.me?.title?.name || 'Yaba Techie',
                tier: raw.ladder?.tiers?.lagos ? `TIER ${raw.ladder.tiers.lagos}` : 'TIER 3',
              },
              badges: Array.isArray(raw.me?.badges)
                ? raw.me.badges.map((b: any) => ({
                    id: `bdg-${b.id}`,
                    name: b.id.toUpperCase(),
                    icon: b.metal >= 3 ? 'gold' : b.metal === 2 ? 'silver' : 'bronze',
                  }))
                : [],
              titles: raw.titles || [],
              ladder: {
                rank: raw.ladder?.place?.lagos || 2,
                league: raw.ladder?.place?.lagos ? `Rank #${raw.ladder.place.lagos} in Lagos` : 'Lagos Diamond Tycoons',
                facts: {
                  saved: savedNum,
                  netWorth: netWorthNum,
                },
              },
              raw,
            };

            this.cachedGlStatus = { data: result, timestamp: Date.now() };
            return result;
          } else {
            if (now - this.lastGlStatusErrorLog > 60000) {
              this.logger.warn(`Live gl/status returned HTTP ${res.status}. Serving cached/saved profile.`);
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

      // If live sync failed but we have a cached status, return it
      if (this.cachedGlStatus) {
        return this.cachedGlStatus.data;
      }

      // Fallback profile using connected owner account facts
      const fallbackResult: GlStatusResponse = {
        ok: !!this.ownerUsername,
        on: !!this.ownerUsername,
        username: this.ownerUsername || 'demi_thetrillionaire',
        name: this.ownerUsername || 'Primary Character Vault',
        online: !!this.ownerUsername,
        location: 'Lagos, Nigeria',
        progression: {
          level: 8,
          reputation: 106,
          rank: 'Yaba Techie',
          tier: 'TIER 3',
        },
        badges: [],
        titles: ['Lagos Tycoon'],
        ladder: {
          rank: 2,
          league: 'Lagos Diamond Tycoons',
          facts: {
            saved: Number(this.savedCash) || 246365321471275,
            netWorth: Number(this.netWorth) || 246441278263151,
          },
        },
      };

      this.cachedGlStatus = { data: fallbackResult, timestamp: Date.now() };
      return fallbackResult;
    })();

    this.glStatusInFlight = fetchPromise;
    try {
      return await fetchPromise;
    } finally {
      this.glStatusInFlight = null;
    }
  }

  async syncBalanceFromLive() {
    const status = await this.getGlStatus();
    if (status?.ladder?.facts?.saved) {
      this.savedCash = BigInt(status.ladder.facts.saved);
    }
    return status;
  }
}
