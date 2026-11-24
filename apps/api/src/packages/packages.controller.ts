import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PackagesService } from './packages.service';

@ApiTags('Packages & Pricing')
@Controller('api/v1/packages')
export class PackagesController {
  constructor(private readonly packagesService: PackagesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all active Lagos Life cash packages' })
  async getPackages() {
    const packages = await this.packagesService.getAllPackages();
    return { success: true, data: packages };
  }

  @Post('quote')
  @ApiOperation({ summary: 'Calculate price quote for package or custom amount' })
  async getQuote(@Body() body: { packageId?: string; customAmount?: number | string }) {
    const quote = await this.packagesService.calculateQuote(body.packageId, body.customAmount);
    return { success: true, data: quote };
  }
}
