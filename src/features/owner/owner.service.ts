import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { errorMessage, toNumber } from '../../shared/http/http.js';
import {
  ACCOUNT_SNAPSHOT_SOURCES,
  type AccountKind,
  type AccountSnapshotSource,
} from '../account/account-snapshot.interface.js';
import { roundMoney, roundPositions } from '../account/positions.js';
import { InputsService } from '../inputs/inputs.service.js';
import { SnapshotsService } from '../snapshots/snapshots.service.js';
import type {
  InputSnapshot,
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
    private readonly snapshots: SnapshotsService,
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
    const amountsByKind: Record<AccountKind, number> = { stocks: 0, crypto: 0 };
    results.forEach((result, index) => {
      const { source, account } = accounts[index];
      const name = source.accountName?.(account) ?? source.name;
      if (result.status === 'fulfilled') {
        const { usdAmount, positions, asOf } = result.value;
        const amount = roundMoney(usdAmount);
        amountsByKind[source.kind] += amount;
        outputs.push({
          id: account.id,
          source: source.name,
          name,
          amount,
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

    const inputSnapshots: InputSnapshot[] = inputs.map(
      ({ name, amount, currency, createdAt }) => ({
        name,
        amount: toNumber(amount),
        currency,
        createdAt: createdAt.toISOString(),
      }),
    );

    if (accounts.length > 0 && errors.length === 0) {
      await this.snapshots.record({
        ownerId,
        takenAt,
        amountStocks: roundMoney(amountsByKind.stocks),
        amountCrypto: roundMoney(amountsByKind.crypto),
        amountInputs: roundMoney(
          inputSnapshots.reduce((total, { amount }) => total + amount, 0),
        ),
      });
    }

    return {
      ownerId,
      takenAt,
      totalAmount: roundMoney(
        outputs.reduce((total, { amount }) => total + amount, 0),
      ),
      totalCurrency: 'USD',
      inputs: inputSnapshots,
      outputs,
      errors,
    };
  }
}
