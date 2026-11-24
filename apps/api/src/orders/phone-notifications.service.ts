import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface PhoneNotificationSettings {
  enabled: boolean;
  ntfyTopic: string;
  notifyOnOrderCreated: boolean;
  notifyOnPaymentSubmitted: boolean;
  notifyOnOrderDelivered: boolean;
  customWebhookUrl?: string;
  lastTestSentAt?: string;
}

@Injectable()
export class PhoneNotificationsService {
  private readonly logger = new Logger(PhoneNotificationsService.name);
  private readonly configPaths = [
    path.resolve(process.cwd(), 'data', 'phone_notification_settings.json'),
    path.resolve(process.cwd(), 'phone_notification_settings.json'),
    path.resolve(process.cwd(), 'apps', 'api', 'phone_notification_settings.json'),
  ];

  private settings: PhoneNotificationSettings = {
    enabled: true,
    ntfyTopic: 'lagoslife_orders_hq',
    notifyOnOrderCreated: true,
    notifyOnPaymentSubmitted: true,
    notifyOnOrderDelivered: true,
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
          if (parsed && typeof parsed.enabled === 'boolean') {
            this.settings = { ...this.settings, ...parsed };
            this.logger.log(`Phone notifications configured for topic: ${this.settings.ntfyTopic}`);
            return;
          }
        }
      }
    } catch (err: any) {
      this.logger.warn(`Could not load phone_notification_settings.json: ${err.message}`);
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
      this.logger.warn(`Could not save phone_notification_settings.json: ${err.message}`);
    }
  }

  getSettings() {
    const topic = this.settings.ntfyTopic || 'lagoslife_orders_hq';
    return {
      ...this.settings,
      subscriptionUrl: `https://ntfy.sh/${topic}`,
      iosAppInstructions: '1. Install free "ntfy" from Apple App Store on your iPhone. 2. Tap "+" and subscribe to topic: ' + topic,
      androidAppInstructions: '1. Install free "ntfy" from Google Play on your Android. 2. Tap "+" and subscribe to topic: ' + topic,
      webLink: `https://ntfy.sh/${topic}`,
    };
  }

  updateSettings(body: Partial<PhoneNotificationSettings>) {
    this.settings = { ...this.settings, ...body };
    this.saveToFile();
    return this.getSettings();
  }

  async sendPush(
    title: string,
    message: string,
    options?: {
      priority?: 'min' | 'low' | 'default' | 'high' | 'urgent';
      tags?: string;
      click?: string;
    },
  ) {
    if (!this.settings.enabled) return { sent: false, reason: 'DISABLED' };

    const topic = this.settings.ntfyTopic || 'lagoslife_orders_hq';

    // Map priority string to ntfy priority level (1=min, 3=default, 4=high, 5=urgent)
    const priorityMap: Record<string, number> = {
      min: 1,
      low: 2,
      default: 3,
      high: 4,
      urgent: 5,
    };
    const priority = options?.priority ? priorityMap[options.priority] || 4 : 4;
    const tagList = options?.tags ? options.tags.split(',').map((t) => t.trim()) : ['moneybag', 'bell'];

    try {
      // Dispatch via JSON body so UTF-8 characters, emojis (💰, 🚨), and Naira symbol (₦) work flawlessly
      const payload: Record<string, any> = {
        topic,
        title,
        message,
        priority,
        tags: tagList,
      };
      if (options?.click) {
        payload.click = options.click;
      }

      const res = await fetch('https://ntfy.sh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        this.logger.log(`[PHONE PUSH] Dispatched push to phone topic '${topic}': ${title}`);
      }

      // Also forward to custom webhook if set
      if (this.settings.customWebhookUrl) {
        fetch(this.settings.customWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, message, ...options, timestamp: new Date().toISOString() }),
        }).catch(() => {});
      }

      return { sent: true, topic };
    } catch (err: any) {
      this.logger.warn(`Could not dispatch phone push: ${err.message}`);
      return { sent: false, error: err.message };
    }
  }

  async sendTestPush() {
    this.settings.lastTestSentAt = new Date().toISOString();
    this.saveToFile();

    const topic = this.settings.ntfyTopic || 'lagoslife_orders_hq';
    return this.sendPush(
      '🔔 Lagos Life Phone Alerts Connected!',
      `Test alert confirmed on topic '${topic}'. You will receive immediate push notifications whenever a player buys in-game cash!`,
      {
        priority: 'urgent',
        tags: 'tada,iphone,android,moneybag',
        click: 'http://localhost:5174',
      },
    );
  }
}
