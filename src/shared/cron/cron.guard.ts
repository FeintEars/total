import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import cronConfig from './cron.config.js';

@Injectable()
export class CronGuard implements CanActivate {
  constructor(
    @Inject(cronConfig.KEY)
    private readonly config: ConfigType<typeof cronConfig>,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    if (!this.config.secret) {
      return false;
    }
    const expected = Buffer.from(`Bearer ${this.config.secret}`);
    const header = context
      .switchToHttp()
      .getRequest<Request>()
      .header('authorization');
    if (!header) {
      return false;
    }
    const received = Buffer.from(header);
    return (
      received.length === expected.length && timingSafeEqual(received, expected)
    );
  }
}
