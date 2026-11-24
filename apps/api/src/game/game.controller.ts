import { Controller, Get, Post, Body, Query, Param, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiParam, ApiBody } from '@nestjs/swagger';
import { GameService } from './game.service';

@ApiTags('Lagos Life Live Game Endpoints')
@Controller()
export class GameController {
  constructor(private readonly gameService: GameService) {}

  // -------------------------------------------------------------
  // 1. POST /api/auth/login — Game Account Login & 2FA
  // -------------------------------------------------------------
  @Post(['api/auth/login', 'api/v1/game/auth/login'])
  @HttpCode(200)
  @ApiOperation({
    summary: 'Lagos Life Game Account Login & 2FA verification',
    description: 'Authenticates owner character. If 2FA is triggered, returns 401 with challenge details. Submit with challenge and code to verify.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        username: { type: 'string' },
        password: { type: 'string' },
        action: { type: 'string', example: 'login' },
        challenge: { type: 'string' },
        code: { type: 'string' },
      },
    },
  })
  async login(@Body() body: any) {
    return await this.gameService.login(body);
  }

  // -------------------------------------------------------------
  // 2. GET /api/players?q=<search> — Player Lookup
  // -------------------------------------------------------------
  @Get(['api/players', 'api/v1/game/players'])
  @ApiOperation({ summary: 'Search and lookup live Lagos Life players' })
  @ApiQuery({ name: 'q', required: true, description: 'Substring match, case-insensitive player query' })
  async getPlayers(@Query('q') q: string) {
    return await this.gameService.searchPlayers(q || '');
  }

  // -------------------------------------------------------------
  // 3. POST /api/send — Transfer Money
  // -------------------------------------------------------------
  @Post(['api/send', 'api/v1/game/send'])
  @HttpCode(200)
  @ApiOperation({
    summary: 'Transfer Lagos Life game cash from owner account to customer',
    description: 'Requires target player ID, amount, and owner 4-digit PIN. Debits owner cash reserve.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['to', 'amount', 'pin'],
      properties: {
        to: { type: 'string', example: 'usr-001' },
        amount: { type: 'number', example: 50000000000 },
        pin: { type: 'string', example: '1234' },
      },
    },
  })
  async sendMoney(@Body() body: { to: string; amount: number; pin: string }) {
    return await this.gameService.sendMoney(body);
  }

  // -------------------------------------------------------------
  // 4. GET /api/gl/status — Player Status, Ladder & Saved Facts
  // -------------------------------------------------------------
  @Get(['api/gl/status', 'api/v1/game/status'])
  @ApiOperation({
    summary: 'Retrieve live owner player status, progression, badges, and ladder cash facts',
    description: 'Returns ladder.facts: saved (cash balance) and netWorth.',
  })
  async getGlStatus() {
    return await this.gameService.getGlStatus();
  }

  // Helper verify endpoint
  @Get('api/v1/game/verify/:username')
  @ApiOperation({ summary: 'Verify whether a Lagos Life username exists' })
  @ApiParam({ name: 'username', required: true, description: 'Exact character username' })
  async verifyUsername(@Param('username') username: string) {
    const res = await this.gameService.searchPlayers(username);
    const match = res.players.find(
      (p) => p.username.toLowerCase() === username.trim().toLowerCase(),
    );
    return {
      success: true,
      data: {
        exists: !!match,
        player: match || res.players[0] || null,
      },
    };
  }
}
