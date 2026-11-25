import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  public isConnected = false;
  private readyPromise: Promise<boolean> | null = null;

  constructor() {
    super({
      datasources: {
        db: {
          url:
            process.env.DATABASE_URL ||
            'postgresql://postgres:postgres@localhost:5432/lagos_life_db?schema=public',
        },
      },
    });
  }

  async onModuleInit() {
    await this.ensureReady();
  }

  /** Connects once to PostgreSQL (retrying cloud connections) and ensures key-value store exists. */
  ensureReady(): Promise<boolean> {
    if (!this.readyPromise) {
      this.readyPromise = this.connectAndInitSchema();
    }
    return this.readyPromise;
  }

  private async connectAndInitSchema(): Promise<boolean> {
    const dbUrl = process.env.DATABASE_URL || '';
    const isRemoteDb =
      Boolean(dbUrl) && !dbUrl.includes('localhost') && !dbUrl.includes('127.0.0.1');
    const maxAttempts = isRemoteDb ? 3 : 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await this.$connect();
        await this.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS persistent_table_store (
            table_name TEXT PRIMARY KEY,
            payload TEXT NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `);
        this.isConnected = true;
        this.logger.log('Connected to PostgreSQL database and verified persistent_table_store.');
        return true;
      } catch (err: any) {
        if (attempt < maxAttempts) {
          this.logger.warn(
            `PostgreSQL connection attempt ${attempt}/${maxAttempts} failed (${err.message}); retrying in 2s...`,
          );
          await new Promise((r) => setTimeout(r, 2000));
        } else {
          this.isConnected = false;
          this.logger.log(
            'Running in local persistent disk mode (PostgreSQL unreachable or unconfigured). All workflows remain operational.',
          );
        }
      }
    }

    return false;
  }

  async onModuleDestroy() {
    if (this.isConnected) {
      await this.$disconnect();
    }
  }
}
