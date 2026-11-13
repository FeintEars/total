import { setTimeout as sleep } from 'node:timers/promises';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { fetchText } from '../../../shared/http/http.js';
import type {
  AccountSnapshot,
  AccountSnapshotSource,
} from '../account-snapshot.interface.js';
import { elementText, parseFlexStatements } from './flex-xml.js';
import { IbkrAccount } from './ibkr-account.entity.js';

const FLEX_URL =
  'https://ndcdyn.interactivebrokers.com/AccountManagement/FlexWebService';
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
  readonly name = 'IBKR';

  constructor(
    @InjectRepository(IbkrAccount)
    private readonly accounts: Repository<IbkrAccount>,
  ) {}

  findByOwner(ownerId: string): Promise<IbkrAccount[]> {
    return this.accounts.findBy({ ownerId });
  }

  async getSnapshot(account: IbkrAccount): Promise<AccountSnapshot> {
    const referenceCode = await this.requestStatement(account);
    return parseFlexStatements(
      await this.downloadStatement(account, referenceCode),
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

function flexError(step: string, response: string): Error {
  const code = elementText(response, 'ErrorCode') ?? 'unknown';
  const message =
    elementText(response, 'ErrorMessage') ?? response.slice(0, 200);
  return new Error(`IBKR Flex ${step} failed with ${code}: ${message}`);
}
