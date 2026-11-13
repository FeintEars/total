import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { errorMessage, toNumber } from '../../shared/http/http.js';
import {
  ACCOUNT_SNAPSHOT_SOURCES,
  type AccountSnapshotSource,
} from '../account/account-snapshot.interface.js';
import { roundMoney, roundPositions } from '../account/positions.js';
import { InputsService } from '../inputs/inputs.service.js';
import type {
  OutputSnapshot,
  OutputSnapshotError,
  OwnerSnapshot,
} from './owner-snapshot.js';
import { Owner } from './owner.entity.js';

@Injectable()
export class OwnerService {
  private readonly logger = new Logger(OwnerService.name);

  constructor(
    @InjectRepository(Owner)
    private readonly owners: Repository<Owner>,
    private readonly inputs: InputsService,
    @Inject(ACCOUNT_SNAPSHOT_SOURCES)
    private readonly sources: AccountSnapshotSource<{ id: string }>[],
  ) {}

  async getSnapshot(ownerId: string): Promise<OwnerSnapshot> {
    if (!(await this.owners.existsBy({ id: ownerId }))) {
      throw new NotFoundException(`Owner ${ownerId} not found`);
    }

    const takenAt = new Date().toISOString();
    const [inputs, accounts] = await Promise.all([
      this.inputs.findByOwner(ownerId),
      Promise.all(
        this.sources.map(async (source) =>
          (await source.findByOwner(ownerId)).map((account) => ({
            source,
            account,
          })),
        ),
      ).then((perSource) => perSource.flat()),
    ]);

    const results = await Promise.allSettled(
      accounts.map(({ source, account }) => source.getSnapshot(account)),
    );

    const outputs: OutputSnapshot[] = [];
    const errors: OutputSnapshotError[] = [];
    results.forEach((result, index) => {
      const { source, account } = accounts[index];
      const name = source.accountName?.(account) ?? source.name;
      if (result.status === 'fulfilled') {
        const { usdAmount, positions, asOf } = result.value;
        outputs.push({
          id: account.id,
          name,
          amount: roundMoney(usdAmount),
          currency: 'USD',
          positions: roundPositions(positions),
          asOf,
        });
        return;
      }

      const message = errorMessage(result.reason);
      this.logger.error(
        `${name} account ${account.id} snapshot failed: ${message}`,
        result.reason instanceof Error ? result.reason.stack : undefined,
      );
      errors.push({ id: account.id, name, message });
    });

    return {
      ownerId,
      takenAt,
      totalAmount: roundMoney(
        outputs.reduce((total, { amount }) => total + amount, 0),
      ),
      totalCurrency: 'USD',
      inputs: inputs.map(({ name, amount, currency, createdAt }) => ({
        name,
        amount: toNumber(amount),
        currency,
        createdAt: createdAt.toISOString(),
      })),
      outputs,
      errors,
    };
  }
}
