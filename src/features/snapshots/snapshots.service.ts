import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { errorMessage } from '../../shared/http/http.js';
import { roundMoney } from '../account/positions.js';
import { Snapshot } from './snapshot.entity.js';

export interface SnapshotRecord {
  ownerId: string;
  takenAt: string;
  amountStocks: number;
  amountCrypto: number;
  amountInputs: number;
}

@Injectable()
export class SnapshotsService {
  private readonly logger = new Logger(SnapshotsService.name);

  constructor(
    @InjectRepository(Snapshot)
    private readonly snapshots: Repository<Snapshot>,
  ) {}

  async record({
    ownerId,
    takenAt,
    amountStocks,
    amountCrypto,
    amountInputs,
  }: SnapshotRecord): Promise<void> {
    try {
      await this.snapshots.insert({
        ownerId,
        amount: String(roundMoney(amountStocks + amountCrypto)),
        amountStocks: String(amountStocks),
        amountCrypto: String(amountCrypto),
        amountInputs: String(amountInputs),
        createdAt: new Date(takenAt),
      });
    } catch (error) {
      this.logger.error(
        `Failed to record snapshot of owner ${ownerId}: ${errorMessage(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
