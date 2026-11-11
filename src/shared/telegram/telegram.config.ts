import { registerAs } from '@nestjs/config';

export default registerAs('telegram', () => ({
  token: process.env.TELEGRAM_BOT_TOKEN ?? '',
  // Telegram echoes it in X-Telegram-Bot-Api-Secret-Token on every webhook call.
  webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET ?? '',
  // Long polling for local development, where Telegram can't reach the webhook.
  polling: process.env.TELEGRAM_POLLING === 'true',
}));
