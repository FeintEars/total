import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { IBKR_SOURCE_NAME } from '../account/ibkr/ibkr-account-snapshot.js';
import { normalizeTelegramCommandAlias } from './telegram-command-alias.js';
import { TelegramCommandIbkrAccount } from './telegram-command-ibkr-account.entity.js';
import { TelegramCommandOwner } from './telegram-command-owner.entity.js';

export interface TelegramCommandOwnerTarget {
  ownerId: string;
  ownerName: string;
}

export interface TelegramCommandIbkrTarget {
  ibkrAccountId: string;
  ownerName: string;
}

export interface TelegramCommandTargets {
  alias: string;
  owners: TelegramCommandOwnerTarget[];
  ibkrAccounts: TelegramCommandIbkrTarget[];
}

export interface TelegramCommandDescription {
  alias: string;
  description: string;
}

const DESCRIPTION_MAX_LENGTH = 256;

@Injectable()
export class TelegramCommandsService {
  constructor(
    @InjectRepository(TelegramCommandOwner)
    private readonly owners: Repository<TelegramCommandOwner>,
    @InjectRepository(TelegramCommandIbkrAccount)
    private readonly ibkrAccounts: Repository<TelegramCommandIbkrAccount>,
  ) {}

  async findTargets(command: string): Promise<TelegramCommandTargets> {
    const alias = normalizeTelegramCommandAlias(command);
    const [owners, ibkrAccounts] = await Promise.all([
      this.findOwnerRows({ alias }),
      this.findIbkrRows({ alias }),
    ]);
    return {
      alias,
      owners: owners.map(ownerTarget).sort(byOwnerName),
      ibkrAccounts: ibkrAccounts.map(ibkrTarget).sort(byOwnerName),
    };
  }

  async listCommands(): Promise<TelegramCommandDescription[]> {
    const [owners, ibkrAccounts] = await Promise.all([
      this.findOwnerRows({}),
      this.findIbkrRows({}),
    ]);

    const labels = new Map<string, string[]>();
    const add = (alias: string, label: string) =>
      labels.set(alias, [...(labels.get(alias) ?? []), label]);
    owners
      .map((row) => ({ alias: row.alias, ...ownerTarget(row) }))
      .sort(byOwnerName)
      .forEach(({ alias, ownerName }) => add(alias, ownerName));
    ibkrAccounts
      .map((row) => ({ alias: row.alias, ...ibkrTarget(row) }))
      .sort(byOwnerName)
      .forEach(({ alias, ownerName }) => add(alias, ibkrLabel(ownerName)));

    return [...labels.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([alias, aliasLabels]) => ({
        alias,
        description: truncate(aliasLabels.join(', '), DESCRIPTION_MAX_LENGTH),
      }));
  }

  private findOwnerRows(where: { alias?: string }) {
    return this.owners.find({ where, relations: { owner: true } });
  }

  private findIbkrRows(where: { alias?: string }) {
    return this.ibkrAccounts.find({
      where,
      relations: { ibkrAccount: { owner: true } },
    });
  }
}

export function ibkrLabel(ownerName: string): string {
  return `${IBKR_SOURCE_NAME} · ${ownerName}`;
}

function ownerTarget(row: TelegramCommandOwner): TelegramCommandOwnerTarget {
  return { ownerId: row.ownerId, ownerName: row.owner?.name ?? row.ownerId };
}

function ibkrTarget(
  row: TelegramCommandIbkrAccount,
): TelegramCommandIbkrTarget {
  return {
    ibkrAccountId: row.ibkrAccountId,
    ownerName: row.ibkrAccount?.owner?.name ?? row.ibkrAccountId,
  };
}

function byOwnerName(a: { ownerName: string }, b: { ownerName: string }) {
  return a.ownerName.localeCompare(b.ownerName);
}

function truncate(text: string, maxLength: number): string {
  return text.length <= maxLength ? text : `${text.slice(0, maxLength - 1)}…`;
}
