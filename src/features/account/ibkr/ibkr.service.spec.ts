import { NotFoundException } from '@nestjs/common';
import { createCache } from 'cache-manager';
import type { IbkrAccount } from './ibkr-account.entity.js';
import { IbkrService } from './ibkr.service.js';

const ACCOUNT_ID = '00000000-0000-4000-8000-000000000002';

const REPORT = `<FlexQueryResponse><FlexStatement accountId="U1">
<EquitySummaryByReportDateInBase acctAlias="Main" currency="USD" total="100" />
<OpenPositions><OpenPosition currency="USD" symbol="AAPL" position="1" positionValue="90" levelOfDetail="SUMMARY" /></OpenPositions>
<CashReport><CashReportCurrency currency="USD" endingCash="10" /></CashReport>
</FlexStatement></FlexQueryResponse>`;

function service(account: object | null) {
  const accounts = { findOneBy: vi.fn().mockResolvedValue(account) };
  return {
    accounts,
    ibkr: new IbkrService(accounts as never, createCache() as never),
  };
}

function flexApi(ibkr: IbkrService) {
  const flex = ibkr as unknown as {
    requestStatement(account: IbkrAccount): Promise<string>;
    downloadStatement(account: IbkrAccount, code: string): Promise<string>;
  };
  return {
    requestStatement: vi
      .spyOn(flex, 'requestStatement')
      .mockResolvedValue('reference-code'),
    downloadStatement: vi
      .spyOn(flex, 'downloadStatement')
      .mockResolvedValue(REPORT),
  };
}

function ibkrAccount(token = 'token'): IbkrAccount {
  return {
    id: ACCOUNT_ID,
    token,
    queryId: 'query',
    ownerId: 'owner',
    displayType: 'short',
  };
}

describe('IbkrService.getAccountSnapshot', () => {
  it('returns every position of the account, rounded to cents', async () => {
    const account = { id: ACCOUNT_ID };
    const { accounts, ibkr } = service(account);
    const getFullSnapshot = vi
      .spyOn(ibkr, 'getFullSnapshot')
      .mockResolvedValue({
        usdAmount: 2825.0183,
        asOf: '2026-11-12',
        positions: [
          {
            name: 'Innovations',
            amount: 324.9077,
            currency: 'USD',
            subpositions: [
              { name: 'GOOG', quantity: 1.1, amount: 324.894, currency: 'USD' },
              { name: 'Cash', amount: 0.0137, currency: 'USD' },
            ],
          },
        ],
      });

    const snapshot = await ibkr.getAccountSnapshot(ACCOUNT_ID);

    expect(accounts.findOneBy).toHaveBeenCalledWith({ id: ACCOUNT_ID });
    expect(getFullSnapshot).toHaveBeenCalledWith(account);
    expect(snapshot).toEqual({
      accountId: ACCOUNT_ID,
      takenAt: expect.any(String),
      totalAmount: 2825.02,
      totalCurrency: 'USD',
      asOf: '2026-11-12',
      positions: [
        {
          name: 'Innovations',
          amount: 324.91,
          currency: 'USD',
          subpositions: [
            { name: 'GOOG', quantity: 1.1, amount: 324.89, currency: 'USD' },
            { name: 'Cash', amount: 0.01, currency: 'USD' },
          ],
        },
      ],
    });
  });

  it('throws NotFoundException for an unknown account', async () => {
    await expect(
      service(null).ibkr.getAccountSnapshot(ACCOUNT_ID),
    ).rejects.toThrow(NotFoundException);
  });
});

describe('IbkrService.getSnapshot', () => {
  const short = { usdAmount: 1, positions: [], asOf: '2026-11-12' };
  const full = { usdAmount: 2, positions: [], asOf: '2026-11-12' };

  function spies() {
    const { ibkr } = service(null);
    return {
      ibkr,
      getShortSnapshot: vi
        .spyOn(ibkr, 'getShortSnapshot')
        .mockResolvedValue(short),
      getFullSnapshot: vi
        .spyOn(ibkr, 'getFullSnapshot')
        .mockResolvedValue(full),
    };
  }

  it('shows sub-accounts for the short display type', async () => {
    const { ibkr, getShortSnapshot, getFullSnapshot } = spies();
    const account = { id: ACCOUNT_ID, displayType: 'short' } as never;

    await expect(ibkr.getSnapshot(account)).resolves.toBe(short);
    expect(getShortSnapshot).toHaveBeenCalledWith(account);
    expect(getFullSnapshot).not.toHaveBeenCalled();
  });

  it('shows positions for the full display type', async () => {
    const { ibkr, getShortSnapshot, getFullSnapshot } = spies();
    const account = { id: ACCOUNT_ID, displayType: 'full' } as never;

    await expect(ibkr.getSnapshot(account)).resolves.toBe(full);
    expect(getFullSnapshot).toHaveBeenCalledWith(account);
    expect(getShortSnapshot).not.toHaveBeenCalled();
  });
});

describe('IbkrService report cache', () => {
  it('downloads the report once for concurrent short and full snapshots', async () => {
    const { ibkr } = service(null);
    const { requestStatement } = flexApi(ibkr);
    const account = ibkrAccount();

    const [short, full] = await Promise.all([
      ibkr.getShortSnapshot(account),
      ibkr.getFullSnapshot(account),
    ]);
    await ibkr.getShortSnapshot(account);

    expect(requestStatement).toHaveBeenCalledTimes(1);
    expect(short.positions).toEqual([
      { name: 'Main', amount: 100, currency: 'USD' },
    ]);
    expect(full.positions[0].subpositions).toHaveLength(2);
  });

  it('does not cache a failed download', async () => {
    const { ibkr } = service(null);
    const { requestStatement } = flexApi(ibkr);
    requestStatement.mockRejectedValueOnce(new Error('IBKR is down'));
    const account = ibkrAccount();

    await expect(ibkr.getShortSnapshot(account)).rejects.toThrow(
      'IBKR is down',
    );
    await expect(ibkr.getShortSnapshot(account)).resolves.toBeDefined();
    expect(requestStatement).toHaveBeenCalledTimes(2);
  });

  it('downloads a new report after the token changes', async () => {
    const { ibkr } = service(null);
    const { requestStatement } = flexApi(ibkr);

    await ibkr.getShortSnapshot(ibkrAccount('old-token'));
    await ibkr.getShortSnapshot(ibkrAccount('new-token'));

    expect(requestStatement).toHaveBeenCalledTimes(2);
  });
});
