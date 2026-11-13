import { registerAs } from '@nestjs/config';

export default registerAs('telegram', () => ({
  token: process.env.TELEGRAM_BOT_TOKEN ?? '',
  webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET ?? '',
  polling: process.env.TELEGRAM_POLLING === 'true',
}));
