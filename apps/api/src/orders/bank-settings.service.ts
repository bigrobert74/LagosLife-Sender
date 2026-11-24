import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

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
export class BankSettingsService {
  private readonly logger = new Logger(BankSettingsService.name);
  private readonly configPaths = [
    path.resolve(process.cwd(), 'data', 'bank_settings.json'),
    path.resolve(process.cwd(), 'bank_settings.json'),
    path.resolve(process.cwd(), 'apps', 'api', 'bank_settings.json'),
  ];

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

  constructor() {
    this.loadFromFile();
  }

  private loadFromFile() {
    try {
      for (const cp of this.configPaths) {
        if (fs.existsSync(cp)) {
          const raw = fs.readFileSync(cp, 'utf-8');
          const parsed = JSON.parse(raw);
          if (parsed && parsed.bankName && parsed.accountNumber) {
            this.settings = { ...this.settings, ...parsed };
            this.logger.log(`Loaded persisted live bank account: ${this.settings.bankName} - ${this.settings.accountNumber}`);
            return;
          }
        }
      }
    } catch (err: any) {
      this.logger.warn(`Could not load bank_settings.json: ${err.message}`);
    }
  }

  private saveToFile() {
    try {
      for (const cp of this.configPaths) {
        try {
          const dir = path.dirname(cp);
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(cp, JSON.stringify(this.settings, null, 2), 'utf-8');
        } catch (_) {}
      }
    } catch (err: any) {
      this.logger.warn(`Could not save bank_settings.json: ${err.message}`);
    }
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
    this.saveToFile();
    this.logger.log(`Live bank settings updated: ${this.settings.bankName} (${this.settings.accountNumber}) by ${updatedBy}`);
    return this.getSettings();
  }
}
