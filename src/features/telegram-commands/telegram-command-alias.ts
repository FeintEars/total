export const TELEGRAM_COMMAND_ALIAS_CHECK = `"alias" ~ '^[a-z0-9_]{1,32}$'`;

export function normalizeTelegramCommandAlias(command: string): string {
  return command.trim().replace(/^\//, '').split('@')[0].toLowerCase();
}
