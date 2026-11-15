import { registerAs } from '@nestjs/config';

export default registerAs('cron', () => ({
  secret: process.env.CRON_SECRET ?? '',
}));
