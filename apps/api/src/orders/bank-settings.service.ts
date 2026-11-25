import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { DatabaseService } from '../database/database.service';

export interface BankAccountSettings {
  bankName: string;
  accountName: string;
  accountNumber: string;
  paymentDeadlineMinutes: number;
  instructions: string;
  supportMessage: string;
  isActive: boolean;
  lastUpdatedBy: string;
  lastUpdatedAt: string;
}

@Injectable()
export class BankSettingsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(BankSettingsService.name);

  private settings: BankAccountSettings = {
    bankName: 'Moniepoint Microfinance Bank',
    accountName: 'Lagos Life Virtual Hub',
    accountNumber: '8123456789',
    paymentDeadlineMinutes: 60,
    instructions: 'Transfer the exact order amount from any commercial bank app. Upload screenshot or enter sender name.',
    supportMessage: 'Payments are verified within 5-15 minutes by an administrator.',
    isActive: true,
    lastUpdatedBy: 'lead_admin',
    lastUpdatedAt: new Date().toISOString(),
  };

  constructor(private readonly databaseService: DatabaseService) {
    this.hydrateSettings();
  }

  onApplicationBootstrap() {
    this.hydrateSettings();
  }

  private getConfigPaths(): string[] {
    return [
      path.join(this.databaseService.getDataDirectory(), 'bank_settings.json'),
      path.resolve(process.cwd(), 'apps', 'api', 'data', 'bank_settings.json'),
      path.resolve(process.cwd(), 'data', 'bank_settings.json'),
      path.resolve(process.cwd(), 'bank_settings.json'),
      path.resolve(process.cwd(), 'apps', 'api', 'bank_settings.json'),
    ];
  }

  private hydrateSettings() {
    const fromKv = this.databaseService.getKV<BankAccountSettings>('bank_settings');
    if (fromKv && fromKv.bankName && fromKv.accountNumber) {
      this.settings = { ...this.settings, ...fromKv };
      this.logger.log(`Loaded persisted live bank account: ${this.settings.bankName} - ${this.settings.accountNumber}`);
      return;
    }

    try {
      for (const cp of this.getConfigPaths()) {
        if (fs.existsSync(cp)) {
          const parsed = JSON.parse(fs.readFileSync(cp, 'utf-8'));
          if (parsed && parsed.bankName && parsed.accountNumber) {
            this.settings = { ...this.settings, ...parsed };
            this.databaseService.setKV('bank_settings', this.settings);
            this.logger.log(`Loaded persisted live bank account from disk: ${this.settings.bankName} - ${this.settings.accountNumber}`);
            return;
          }
        }
      }
    } catch (err: any) {
      this.logger.warn(`Could not load bank_settings.json: ${err.message}`);
    }
  }

  private persistSettings() {
    this.databaseService.setKV('bank_settings', this.settings);
  }

  getSettings(): BankAccountSettings {
    return { ...this.settings };
  }

  updateSettings(body: Partial<BankAccountSettings>, updatedBy = 'admin'): BankAccountSettings {
    this.settings = {
      ...this.settings,
      ...body,
      lastUpdatedBy: updatedBy,
      lastUpdatedAt: new Date().toISOString(),
    };
    this.persistSettings();
    this.logger.log(`Live bank settings updated: ${this.settings.bankName} (${this.settings.accountNumber}) by ${updatedBy}`);
    return this.getSettings();
  }
}
