import type { PositionSnapshot } from '../account/account-snapshot.interface.js';
import {
  IBKR_SOURCE_NAME,
  type IbkrAccountSnapshot,
} from '../account/ibkr/ibkr-account-snapshot.js';
import type { OutputSnapshot, OwnerSnapshot } from '../owner/owner-snapshot.js';
import type { TelegramCommandDescription } from './telegram-commands.service.js';
import { ibkrLabel } from './telegram-commands.service.js';

export const TELEGRAM_MESSAGE_LIMIT = 4096;

const MINUS = '−';
const NESTED_INDENT = ' '.repeat(3);
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
    `${bold(ownerName)} — ${money(snapshot.totalAmount, snapshot.totalCurrency)}`,
  ];
  const invested = snapshot.inputs.reduce(
    (total, { amount }) => total + amount,
    0,
  );
  if (invested > 0) {
    const pnl = snapshot.totalAmount - invested;
    header.push(
      `Invested ${money(invested, 'USD')} · P&amp;L ${money(pnl, 'USD', true)} (${signed(
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
    italic(`${dateTimeFormat.format(new Date(snapshot.takenAt))} UTC`),
  );
  return blocks;
}

export function formatIbkrSnapshot(
  ownerName: string,
  snapshot: IbkrAccountSnapshot,
): string[] {
  return [
    formatSection(
      `${bold(ibkrLabel(ownerName))} — ${money(snapshot.totalAmount, snapshot.totalCurrency)}`,
      snapshot.asOf,
      snapshot.positions,
    ),
  ];
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
      `${bold(output.name)} — ${money(output.amount, output.currency)}`,
      output.name === IBKR_SOURCE_NAME ? output.asOf : undefined,
      output.positions,
    ),
  ];
}

function formatSection(
  header: string,
  reportAsOf: string | undefined,
  positions: PositionSnapshot[],
): string {
  return [
    header,
    ...(reportAsOf ? [italic(`As of ${reportDate(reportAsOf)} close`)] : []),
    ...positions.flatMap((position) => [
      formatPosition(position),
      ...(position.subpositions ?? []).map(formatNestedPosition),
    ]),
  ].join('\n');
}

function formatPosition(position: PositionSnapshot): string {
  return `• ${positionText(position)}`;
}

function formatNestedPosition(position: PositionSnapshot): string {
  return `${NESTED_INDENT}◦ ${positionText(position)}`;
}

function positionText(position: PositionSnapshot): string {
  const quantity =
    position.quantity === undefined
      ? ''
      : ` ×${formatQuantity(position.quantity)}`;
  return `${escape(position.name)}${quantity} — ${amount(position)}`;
}

function amount({ amount, currency }: PositionSnapshot): string {
  return amount === null ? `n/a ${escape(currency)}` : money(amount, currency);
}

function money(value: number, currency: string, showPlus = false): string {
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
  return `${sign}${formatted} ${escape(currency)}`;
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
  const parts: string[] = [];
  let current = '';
  for (const line of block.split('\n')) {
    const fitted = line.length > limit ? `${line.slice(0, limit - 1)}…` : line;
    const joined = current ? `${current}\n${fitted}` : fitted;
    if (joined.length > limit && current) {
      parts.push(current);
      current = fitted;
    } else {
      current = joined;
    }
  }
  if (current) {
    parts.push(current);
  }
  return parts;
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
