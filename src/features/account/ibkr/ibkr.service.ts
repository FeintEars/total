import { createHash } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';
import { CACHE_MANAGER, type Cache } from '@nestjs/cache-manager';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { fetchText } from '../../../shared/http/http.js';
import type {
  AccountSnapshot,
  AccountSnapshotSource,
} from '../account-snapshot.interface.js';
import { roundMoney, roundPositions } from '../positions.js';
import {
  elementText,
  parseFlexPositions,
  parseFlexStatements,
} from './flex-xml.js';
import { IbkrAccount } from './ibkr-account.entity.js';
import {
  IBKR_SOURCE_NAME,
  type IbkrAccountSnapshot,
} from './ibkr-account-snapshot.js';

const FLEX_URL =
  'https://ndcdyn.interactivebrokers.com/AccountManagement/FlexWebService';
const REPORT_CACHE_TTL_MS = 60 * 60 * 1000;
const STATEMENT_ATTEMPTS = 10;
const STATEMENT_RETRY_DELAY_MS = 3_000;
const RETRYABLE_ERROR_CODES = new Set([
  '1001',
  '1004',
  '1005',
  '1006',
  '1007',
  '1008',
  '1009',
  '1018',
  '1019',
  '1021',
]);

@Injectable()
export class IbkrService implements AccountSnapshotSource<IbkrAccount> {
  readonly name = IBKR_SOURCE_NAME;

  constructor(
    @InjectRepository(IbkrAccount)
    private readonly accounts: Repository<IbkrAccount>,
    @Inject(CACHE_MANAGER)
    private readonly cache: Cache,
  ) {}

  findByOwner(ownerId: string): Promise<IbkrAccount[]> {
    return this.accounts.findBy({ ownerId });
  }

  getSnapshot(account: IbkrAccount): Promise<AccountSnapshot> {
    return account.displayType === 'full'
      ? this.getFullSnapshot(account)
      : this.getShortSnapshot(account);
  }

  async getShortSnapshot(account: IbkrAccount): Promise<AccountSnapshot> {
    return parseFlexStatements(await this.fetchReport(account));
  }

  async getFullSnapshot(account: IbkrAccount): Promise<AccountSnapshot> {
    return parseFlexPositions(await this.fetchReport(account));
  }

  async getAccountSnapshot(accountId: string): Promise<IbkrAccountSnapshot> {
    const account = await this.accounts.findOneBy({ id: accountId });
    if (!account) {
      throw new NotFoundException(`IBKR account ${accountId} not found`);
    }

    const takenAt = new Date().toISOString();
    const { usdAmount, positions, asOf } = await this.getFullSnapshot(account);
    return {
      accountId,
      takenAt,
      totalAmount: roundMoney(usdAmount),
      totalCurrency: 'USD',
      positions: roundPositions(positions),
      asOf,
    };
  }

  private fetchReport(account: IbkrAccount): Promise<string> {
    return this.cache.wrap(
      reportCacheKey(account),
      async () => {
        const referenceCode = await this.requestStatement(account);
        return this.downloadStatement(account, referenceCode);
      },
      REPORT_CACHE_TTL_MS,
    );
  }

  private async requestStatement(account: IbkrAccount): Promise<string> {
    const query = new URLSearchParams({
      t: account.token,
      q: account.queryId,
      v: '3',
    });
    const response = await fetchText(`${FLEX_URL}/SendRequest?${query}`);

    const referenceCode = elementText(response, 'ReferenceCode');
    if (elementText(response, 'Status') !== 'Success' || !referenceCode) {
      throw flexError('SendRequest', response);
    }
    return referenceCode;
  }

  private async downloadStatement(
    account: IbkrAccount,
    referenceCode: string,
  ): Promise<string> {
    const query = new URLSearchParams({
      t: account.token,
      q: referenceCode,
      v: '3',
    });

    for (let attempt = 1; ; attempt++) {
      await sleep(STATEMENT_RETRY_DELAY_MS);
      const response = await fetchText(`${FLEX_URL}/GetStatement?${query}`);
      if (!response.includes('<FlexStatementResponse')) {
        return response;
      }

      const code = elementText(response, 'ErrorCode') ?? '';
      if (!RETRYABLE_ERROR_CODES.has(code) || attempt >= STATEMENT_ATTEMPTS) {
        throw flexError('GetStatement', response);
      }
    }
  }
}

function reportCacheKey({ id, token, queryId }: IbkrAccount): string {
  const credentials = createHash('sha256')
    .update(`${token}\u0000${queryId}`)
    .digest('hex');
  return `ibkr-report:${id}:${credentials}`;
}

function flexError(step: string, response: string): Error {
  const code = elementText(response, 'ErrorCode') ?? 'unknown';
  const message =
    elementText(response, 'ErrorMessage') ?? response.slice(0, 200);
  return new Error(`IBKR Flex ${step} failed with ${code}: ${message}`);
}
