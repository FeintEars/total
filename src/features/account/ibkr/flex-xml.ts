import { toNumber } from '../../../shared/http/http.js';
import type {
  AccountSnapshot,
  PositionSnapshot,
} from '../account-snapshot.interface.js';

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

export function parseFlexStatements(xml: string): AccountSnapshot {
  const statements = [
    ...xml.matchAll(/<FlexStatement[\s>][\s\S]*?<\/FlexStatement>/g),
  ].map(([statement]) => statement);
  if (statements.length === 0) {
    throw new Error('IBKR report has no FlexStatement');
  }

  const toUsd = usdRates(xml);
  const subAccounts = statements
    .map((statement) => {
      const position = parseSubAccount(statement);
      return {
        position,
        usdAmount: position.amount * toUsd(position.currency),
      };
    })
    .sort((a, b) => b.usdAmount - a.usdAmount);

  return {
    usdAmount: subAccounts.reduce(
      (total, { usdAmount }) => total + usdAmount,
      0,
    ),
    positions: subAccounts.map(({ position }) => position),
  };
}

function usdRates(xml: string): (currency: string) => number {
  const rates = new Map<string, { date: string; rate: number }>();
  for (const {
    fromCurrency,
    toCurrency,
    rate,
    reportDate = '',
  } of elementsAttributes(xml, 'ConversionRate')) {
    const pairs: [string, number][] = [];
    if (toCurrency === 'USD') {
      pairs.push([fromCurrency, toNumber(rate)]);
    } else if (fromCurrency === 'USD' && toNumber(rate) !== 0) {
      pairs.push([toCurrency, 1 / toNumber(rate)]);
    }
    for (const [currency, usdRate] of pairs) {
      const known = rates.get(currency);
      if (!known || reportDate > known.date) {
        rates.set(currency, { date: reportDate, rate: usdRate });
      }
    }
  }

  return (currency) => {
    if (currency === 'USD') {
      return 1;
    }
    const rate = rates.get(currency)?.rate;
    if (rate === undefined) {
      throw new Error(
        `IBKR report has no ${currency}/USD rate: enable "Conversion Rates" in the Flex Query`,
      );
    }
    return rate;
  };
}

function parseSubAccount(
  statement: string,
): PositionSnapshot & { amount: number } {
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
