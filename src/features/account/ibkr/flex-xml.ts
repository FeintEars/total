import { toNumber } from '../../../shared/http/http.js';
import type {
  AccountSnapshot,
  PositionSnapshot,
  SubpositionSnapshot,
} from '../account-snapshot.interface.js';
import { roundMoney, todayAsOf } from '../positions.js';

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
};

function decode(value: string): string {
  return value.replace(/&(#x?[0-9a-f]+|\w+);/gi, (match, entity: string) => {
    if (entity.startsWith('#x') || entity.startsWith('#X')) {
      return String.fromCodePoint(parseInt(entity.slice(2), 16));
    }
    if (entity.startsWith('#')) {
      return String.fromCodePoint(parseInt(entity.slice(1), 10));
    }
    return ENTITIES[entity] ?? match;
  });
}

export function elementText(xml: string, tag: string): string | undefined {
  const match = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`).exec(xml);
  return match ? decode(match[1].trim()) : undefined;
}

export function elementsAttributes(
  xml: string,
  tag: string,
): Record<string, string>[] {
  const elements = xml.matchAll(new RegExp(`<${tag}(\\s[^>]*?)?/?>`, 'g'));
  return [...elements].map(([, attributes = '']) =>
    Object.fromEntries(
      [...attributes.matchAll(/([\w:-]+)="([^"]*)"/g)].map(
        ([, name, value]) => [name, decode(value)],
      ),
    ),
  );
}

type FlexPosition = PositionSnapshot & { amount: number };

export function parseFlexStatements(xml: string): AccountSnapshot {
  const statements = flexStatements(xml);
  const toUsd = usdRates(xml);
  const subAccounts = statements.map(parseSubAccount);
  return withReportDate(xml, {
    usdAmount: totalUsd(subAccounts, toUsd),
    positions: sortByUsd(subAccounts, toUsd),
  });
}

export function parseFlexPositions(xml: string): AccountSnapshot {
  const statements = flexStatements(xml);
  const toUsd = usdRates(xml);
  const subAccounts = statements.map((statement) => {
    const subAccount = parseSubAccount(statement);
    return {
      ...subAccount,
      subpositions: [
        parseOpenPositions(statement),
        parseCash(statement, subAccount.currency),
      ].flatMap((subpositions) =>
        sortByUsd(
          subpositions.filter((subposition) => !isZero(subposition)),
          toUsd,
        ),
      ),
    };
  });
  return withReportDate(xml, {
    usdAmount: totalUsd(subAccounts, toUsd),
    positions: sortByUsd(subAccounts, toUsd),
  });
}

function withReportDate(
  xml: string,
  snapshot: Omit<AccountSnapshot, 'asOf'>,
): AccountSnapshot {
  const date = elementsAttributes(xml, 'FlexStatement')
    .map(({ toDate = '' }) => toDate)
    .filter((toDate) => /^\d{8}$/.test(toDate))
    .sort()
    .at(-1);
  return {
    ...snapshot,
    asOf: date
      ? `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6)}`
      : todayAsOf(),
  };
}

function flexStatements(xml: string): string[] {
  const statements = [
    ...xml.matchAll(/<FlexStatement[\s>][\s\S]*?<\/FlexStatement>/g),
  ].map(([statement]) => statement);
  if (statements.length === 0) {
    throw new Error('IBKR report has no FlexStatement');
  }
  return statements;
}

function totalUsd(
  positions: FlexPosition[],
  toUsd: (currency: string) => number,
): number {
  return positions.reduce(
    (total, { amount, currency }) => total + amount * toUsd(currency),
    0,
  );
}

function sortByUsd<T extends { amount: number; currency: string }>(
  positions: T[],
  toUsd: (currency: string) => number,
): T[] {
  return positions
    .map((position) => ({
      position,
      usdAmount: position.amount * toUsd(position.currency),
    }))
    .sort((a, b) => b.usdAmount - a.usdAmount)
    .map(({ position }) => position);
}

function usdRates(xml: string): (currency: string) => number {
  const latest = new Map<string, { date: string; rate: number }>();
  for (const {
    fromCurrency,
    toCurrency,
    rate,
    reportDate = '',
  } of elementsAttributes(xml, 'ConversionRate')) {
    const value = toNumber(rate);
    if (!fromCurrency || !toCurrency || value === 0) {
      continue;
    }
    const pair = `${fromCurrency}/${toCurrency}`;
    const known = latest.get(pair);
    if (!known || reportDate > known.date) {
      latest.set(pair, { date: reportDate, rate: value });
    }
  }

  const rate = (from: string, to: string) => latest.get(`${from}/${to}`)?.rate;
  const pivots = new Set([...latest.keys()].map((pair) => pair.split('/')[1]));

  return (currency) => {
    if (currency === 'USD') {
      return 1;
    }
    const direct = rate(currency, 'USD');
    if (direct !== undefined) {
      return direct;
    }
    const inverse = rate('USD', currency);
    if (inverse !== undefined) {
      return 1 / inverse;
    }
    for (const pivot of pivots) {
      const toPivot = rate(currency, pivot);
      const usdToPivot = rate('USD', pivot);
      if (toPivot !== undefined && usdToPivot !== undefined) {
        return toPivot / usdToPivot;
      }
    }
    throw new Error(
      `IBKR report has no ${currency}/USD rate: enable "Conversion Rates" in the Flex Query`,
    );
  };
}

function section(statement: string, tag: string, flexName: string): string {
  const match = new RegExp(
    `<${tag}(?:\\s[^>]*?)?(?:/>|>([\\s\\S]*?)</${tag}>)`,
  ).exec(statement);
  if (!match) {
    throw new Error(
      `IBKR report has no ${flexName}: enable "${flexName}" in the Flex Query`,
    );
  }
  return match[1] ?? '';
}

function parseOpenPositions(statement: string): SubpositionSnapshot[] {
  return elementsAttributes(
    section(statement, 'OpenPositions', 'Open Positions'),
    'OpenPosition',
  )
    .filter(
      ({ levelOfDetail }) => !levelOfDetail || levelOfDetail === 'SUMMARY',
    )
    .map(({ symbol, description, position, positionValue, currency }) => ({
      name: symbol || description,
      quantity: toNumber(position),
      amount: toNumber(positionValue),
      currency,
    }));
}

function parseCash(
  statement: string,
  baseCurrency: string,
): SubpositionSnapshot[] {
  const rows = elementsAttributes(
    section(statement, 'CashReport', 'Cash Report'),
    'CashReportCurrency',
  );
  const byCurrency = rows.filter(
    ({ currency, levelOfDetail }) =>
      currency !== 'BASE_SUMMARY' &&
      (!levelOfDetail || levelOfDetail === 'Currency'),
  );
  const summary = rows.find(({ currency }) => currency === 'BASE_SUMMARY');
  const cash =
    byCurrency.length > 0 || !summary
      ? byCurrency
      : [{ ...summary, currency: baseCurrency }];
  return cash.map(({ currency, endingCash }) => ({
    name: 'Cash',
    amount: toNumber(endingCash),
    currency,
  }));
}

function isZero({
  quantity,
  amount,
}: {
  quantity?: number;
  amount: number;
}): boolean {
  return quantity === undefined ? roundMoney(amount) === 0 : quantity === 0;
}

function parseSubAccount(statement: string): FlexPosition {
  const nav = elementsAttributes(statement, 'EquitySummaryByReportDateInBase')
    .sort((a, b) => (a.reportDate ?? '').localeCompare(b.reportDate ?? ''))
    .at(-1);
  if (!nav?.total) {
    throw new Error(
      'IBKR report has no NAV: enable "Net Asset Value (NAV) in Base" in the Flex Query',
    );
  }

  const account = elementsAttributes(statement, 'AccountInformation')[0];
  const currency = nav.currency || account?.currency;
  if (!currency) {
    throw new Error('IBKR report does not say the base currency');
  }

  return {
    name: nav.acctAlias || account?.acctAlias || nav.accountId,
    amount: toNumber(nav.total),
    currency,
  };
}
