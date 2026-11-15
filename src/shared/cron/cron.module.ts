import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CronGuard } from './cron.guard.js';
import cronConfig from './cron.config.js';

const config = ConfigModule.forFeature(cronConfig);

@Module({
  imports: [config],
  providers: [CronGuard],
  exports: [config, CronGuard],
})
export class CronModule {}
