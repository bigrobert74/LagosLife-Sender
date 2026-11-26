import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PackagesService } from './packages.service';

@ApiTags('Packages & Pricing')
@Controller()
export class PackagesController {
  constructor(private readonly packagesService: PackagesService) {}

  // ----------------------------------------------------------------
  // PUBLIC (Storefront) — active packages only
  // ----------------------------------------------------------------
  @Get('api/v1/packages')
  @ApiOperation({ summary: 'Get all active Lagos Life cash packages (storefront)' })
  async getPackages() {
    const packages = await this.packagesService.getAllPackages();
    return { success: true, data: packages };
  }

  @Post('api/v1/packages/quote')
  @ApiOperation({ summary: 'Calculate price quote for package or custom amount' })
  async getQuote(@Body() body: { packageId?: string; customAmount?: number | string }) {
    const quote = await this.packagesService.calculateQuote(body.packageId, body.customAmount);
    return { success: true, data: quote };
  }

  @Get('api/v1/packages/settings')
  @ApiOperation({ summary: 'Get public custom-amount pricing settings' })
  async getPublicSettings() {
    const settings = await this.packagesService.getSettings();
    return { success: true, data: settings };
  }

  // ----------------------------------------------------------------
  // ADMIN — full CRUD
  // ----------------------------------------------------------------
  @Get('api/v1/admin/packages')
  @ApiOperation({ summary: '[ADMIN] Get all packages including inactive ones' })
  async getAdminPackages() {
    const packages = await this.packagesService.getAdminPackages();
    return { success: true, data: packages };
  }

  @Post('api/v1/admin/packages')
  @ApiOperation({ summary: '[ADMIN] Create a new package (starts inactive)' })
  async createPackage(
    @Body()
    body: {
      name: string;
      gameCurrencyAmount: string;
      nairaPrice: number;
      badge?: string | null;
      isPopular?: boolean;
      isActive?: boolean;
    },
  ) {
    const pkg = await this.packagesService.createPackage(body);
    return { success: true, data: pkg };
  }

  @Patch('api/v1/admin/packages/settings')
  @ApiOperation({ summary: '[ADMIN] Update custom amount pricing settings' })
  async updateSettings(
    @Body() body: { ratePerBillion?: number; minBillions?: number; maxBillions?: number },
  ) {
    const settings = await this.packagesService.updateSettings(body);
    return { success: true, data: settings };
  }

  @Get('api/v1/admin/packages/settings')
  @ApiOperation({ summary: '[ADMIN] Get custom amount pricing settings' })
  async getAdminSettings() {
    const settings = await this.packagesService.getSettings();
    return { success: true, data: settings };
  }

  @Patch('api/v1/admin/packages/:id')
  @ApiOperation({ summary: '[ADMIN] Update a package (name, price, badge, isActive, etc.)' })
  async updatePackage(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      gameCurrencyAmount?: string;
      nairaPrice?: number;
      badge?: string | null;
      isPopular?: boolean;
      isActive?: boolean;
      sortOrder?: number;
    },
  ) {
    const pkg = await this.packagesService.updatePackage(id, body);
    return { success: true, data: pkg };
  }

  @Delete('api/v1/admin/packages/:id')
  @ApiOperation({ summary: '[ADMIN] Delete a package permanently' })
  async deletePackage(@Param('id') id: string) {
    await this.packagesService.deletePackage(id);
    return { success: true, data: { deleted: id } };
  }
}
