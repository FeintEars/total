import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Snapshot } from './snapshot.entity.js';
import { SnapshotsService } from './snapshots.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Snapshot])],
  providers: [SnapshotsService],
  exports: [TypeOrmModule, SnapshotsService],
})
export class SnapshotsModule {}
