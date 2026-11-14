import {
  CASH_POSITION_NAME,
  type PositionSnapshot,
} from '../account/account-snapshot.interface.js';
import {
  IBKR_SOURCE_NAME,
  type IbkrAccountSnapshot,
} from '../account/ibkr/ibkr-account-snapshot.js';
import type { OutputSnapshot, OwnerSnapshot } from '../owner/owner-snapshot.js';
import type { TelegramCommandDescription } from './telegram-commands.service.js';
import { ibkrLabel } from './telegram-commands.service.js';

export const TELEGRAM_MESSAGE_LIMIT = 4096;
export const BALANCE_ARGUMENT = 'balance';

const MINUS = '−';
const RULE = '━'.repeat(18);
const QUOTE_OPEN = '<blockquote expandable>';
const QUOTE_CLOSE = '</blockquote>';
const GROUP_MARKER = '▸ ';
const BRANCH = '├ ';
const LAST_BRANCH = '└ ';
const DEFAULT_SOURCE_ICON = '📁';
const SOURCE_ICONS: Record<string, string> = {
  [IBKR_SOURCE_NAME]: '🏦',
  Binance: '🟡',
  Bybit: '⚫',
  Polymarket: '🎯',
  Earns: '🌱',
};
const NESTED_INDENT = '\u00a0'.repeat(4);
const QUANTITY_SIGNIFICANT_DIGITS = 5;
const QUANTITY_MAX_FRACTION_DIGITS = 10;

const dateFormat = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeZone: 'UTC',
});
const dateTimeFormat = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
  hourCycle: 'h23',
  timeZone: 'UTC',
});

export function formatOwnerSnapshot(
  ownerName: string,
  snapshot: OwnerSnapshot,
): string[] {
  const header = [
    `💼 ${bold(ownerName)}`,
    RULE,
    `💰 <b>${money(snapshot.totalAmount, snapshot.totalCurrency)}</b>`,
  ];
  const invested = snapshot.inputs.reduce(
    (total, { amount }) => total + amount,
    0,
  );
  if (invested > 0) {
    const pnl = snapshot.totalAmount - invested;
    header.push(
      `📥 Invested ${money(invested, 'USD')}`,
      `${pnlIcon(pnl)} P&amp;L ${money(pnl, 'USD', true)} (${signed(
        (pnl / invested) * 100,
      )}%)`,
    );
  }

  const blocks = [header.join('\n')];
  for (const output of snapshot.outputs) {
    blocks.push(...formatOutput(output));
  }
  if (snapshot.errors.length > 0) {
    blocks.push(
      snapshot.errors
        .map(({ name, message }) => `⚠️ ${escape(name)}: ${escape(message)}`)
        .join('\n'),
    );
  }
  blocks.push(
    `🕐 ${italic(`${dateTimeFormat.format(new Date(snapshot.takenAt))} UTC`)}`,
  );
  return blocks;
}

export function formatIbkrSnapshot(
  ownerName: string,
  snapshot: IbkrAccountSnapshot,
): string[] {
  return [
    [
      `${sourceIcon(IBKR_SOURCE_NAME)} ${bold(ibkrLabel(ownerName))}`,
      RULE,
      `💰 <b>${money(snapshot.totalAmount, snapshot.totalCurrency)}</b>`,
      `📅 ${italic(`As of ${reportDate(snapshot.asOf)} close`)}`,
    ].join('\n'),
    ...snapshot.positions.map(formatIbkrSubAccount),
  ];
}

export function formatOwnerBalance(snapshot: OwnerSnapshot): string {
  const line = money(snapshot.totalAmount, snapshot.totalCurrency);
  if (snapshot.errors.length === 0) {
    return line;
  }
  const missing = snapshot.errors.map(({ name }) => escape(name)).join(', ');
  return `${line}\n⚠️ Not included: ${missing}`;
}

export function formatIbkrBalance(snapshot: IbkrAccountSnapshot): string {
  return money(snapshot.totalAmount, snapshot.totalCurrency);
}

export function formatCommandList(
  commands: TelegramCommandDescription[],
): string {
  if (commands.length === 0) {
    return 'No commands are set up yet.';
  }
  return [
    'Available commands:',
    ...commands.map(
      ({ alias, description }) => `/${alias} — ${escape(description)}`,
    ),
    '',
    `Add ${BALANCE_ARGUMENT} for the USD total only: /${commands[0].alias} ${BALANCE_ARGUMENT}`,
  ].join('\n');
}

export function formatUnknownCommand(
  alias: string,
  commands: TelegramCommandDescription[],
): string {
  return `Unknown command /${escape(alias)}.\n\n${formatCommandList(commands)}`;
}

export function formatFailure(label: string, error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return `⚠️ ${bold(label)}: ${escape(message)}`;
}

export function splitMessage(
  blocks: string[],
  limit = TELEGRAM_MESSAGE_LIMIT,
): string[] {
  const messages: string[] = [];
  let current = '';
  for (const block of blocks.flatMap((block) => splitBlock(block, limit))) {
    const joined = current ? `${current}\n\n${block}` : block;
    if (joined.length > limit && current) {
      messages.push(current);
      current = block;
    } else {
      current = joined;
    }
  }
  if (current) {
    messages.push(current);
  }
  return messages;
}

function formatOutput(output: OutputSnapshot): string[] {
  return [
    formatSection(
      `${sourceIcon(output.source)} ${bold(output.name)} — ${money(output.amount, output.currency)}`,
      output.source === IBKR_SOURCE_NAME ? output.asOf : undefined,
      output.positions,
    ),
  ];
}

function formatSection(
  header: string,
  reportAsOf: string | undefined,
  positions: PositionSnapshot[],
): string {
  const grouped = positions.some(({ subpositions }) => subpositions?.length);
  const marker = grouped ? GROUP_MARKER : '';
  const entries = positions.map((position) =>
    isOutcome(position)
      ? [
          `${marker}${escape(position.name)}`,
          `${NESTED_INDENT}${outcomeAmounts(position)}`,
        ]
      : [
          `${marker}${positionText(position)}`,
          ...(position.subpositions ?? []).map(
            (subposition) => `${NESTED_INDENT}${positionText(subposition)}`,
          ),
        ],
  );
  const separator = grouped || positions.some(isOutcome) ? '\n\n' : '\n';
  const lines = [
    header,
    ...(reportAsOf ? [italic(`As of ${reportDate(reportAsOf)} close`)] : []),
  ];
  if (entries.length > 0) {
    lines.push(
      `${QUOTE_OPEN}${entries.map((entry) => entry.join('\n')).join(separator)}${QUOTE_CLOSE}`,
    );
  }
  return lines.join('\n');
}

function formatIbkrSubAccount(subAccount: PositionSnapshot): string {
  const holdings = subAccount.subpositions ?? [];
  return [
    `📂 ${bold(subAccount.name)} — ${amount(subAccount)}`,
    ...holdings.map(
      (holding, index) =>
        `${index === holdings.length - 1 ? LAST_BRANCH : BRANCH}${positionText(holding)}`,
    ),
  ].join('\n');
}

function isOutcome(position: PositionSnapshot): position is PositionSnapshot & {
  entryAmount: number;
  payoutAmount: number;
} {
  return (
    position.entryAmount !== undefined && position.payoutAmount !== undefined
  );
}

function outcomeAmounts(
  position: PositionSnapshot & { entryAmount: number; payoutAmount: number },
): string {
  const { entryAmount, payoutAmount, currency } = position;
  return `Entry ${money(entryAmount, currency)} · Now ${amount(position)} · Win ${money(payoutAmount, currency)}`;
}

function sourceIcon(source: string): string {
  return SOURCE_ICONS[source] ?? DEFAULT_SOURCE_ICON;
}

function pnlIcon(pnl: number): string {
  if (Math.round(pnl * 100) === 0) {
    return '⚪';
  }
  return pnl > 0 ? '🟢' : '🔴';
}

function positionText(position: PositionSnapshot): string {
  const quantity =
    position.quantity === undefined
      ? ''
      : ` ×${formatQuantity(position.quantity)}`;
  const icon = isCash(position) ? '💵 ' : '';
  return `${icon}${escape(position.name)}${quantity} — ${amount(position)}`;
}

function isCash({ name, quantity }: PositionSnapshot): boolean {
  return name === CASH_POSITION_NAME && quantity === undefined;
}

function amount({ amount, currency }: PositionSnapshot): string {
  return amount === null ? `n/a ${escape(currency)}` : money(amount, currency);
}

function money(value: number, currency: string, showPlus = false): string {
  return `${decimal(value, showPlus)} ${escape(currency)}`;
}

function decimal(value: number, showPlus = false): string {
  const formatted = Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const sign =
    value < 0 && formatted !== '0.00'
      ? MINUS
      : showPlus && value > 0
        ? '+'
        : '';
  return `${sign}${formatted}`;
}

function signed(value: number): string {
  const formatted = Math.abs(value).toFixed(2);
  if (formatted === '0.00') {
    return formatted;
  }
  return `${value < 0 ? MINUS : '+'}${formatted}`;
}

export function formatQuantity(quantity: number): string {
  const absolute = Math.abs(quantity);
  const integerDigits =
    absolute === 0 ? 1 : Math.floor(Math.log10(absolute)) + 1;
  const fractionDigits = Math.min(
    QUANTITY_MAX_FRACTION_DIGITS,
    Math.max(0, QUANTITY_SIGNIFICANT_DIGITS - integerDigits),
  );
  const formatted = absolute.toLocaleString('en-US', {
    maximumFractionDigits: fractionDigits,
  });
  return quantity < 0 ? `${MINUS}${formatted}` : formatted;
}

function reportDate(isoDate: string): string {
  return dateFormat.format(new Date(`${isoDate}T00:00:00Z`));
}

function splitBlock(block: string, limit: number): string[] {
  if (block.length <= limit) {
    return [block];
  }
  const budget = block.includes(QUOTE_OPEN)
    ? limit - QUOTE_OPEN.length - QUOTE_CLOSE.length
    : limit;
  const parts: string[] = [];
  let current = '';
  for (const line of block.split('\n')) {
    const fitted =
      line.length > budget ? `${line.slice(0, budget - 1)}…` : line;
    const joined = current ? `${current}\n${fitted}` : fitted;
    if (joined.length > budget && current) {
      parts.push(current);
      current = fitted;
    } else {
      current = joined;
    }
  }
  if (current) {
    parts.push(current);
  }
  return balanceQuotes(parts);
}

function balanceQuotes(parts: string[]): string[] {
  let carried = false;
  return parts.map((part) => {
    const text = carried ? `${QUOTE_OPEN}${part}` : part;
    carried = text.lastIndexOf(QUOTE_OPEN) > text.lastIndexOf(QUOTE_CLOSE);
    return carried ? `${text}${QUOTE_CLOSE}` : text;
  });
}

function bold(text: string): string {
  return `<b>${escape(text)}</b>`;
}

function italic(text: string): string {
  return `<i>${escape(text)}</i>`;
}

function escape(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}
