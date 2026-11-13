# Mr. Total

A Telegram bot that reports the combined balance across several brokerage, exchange and wallet accounts: Interactive Brokers, Binance, Bybit, Polymarket, and assets entered by hand (Earns).

- **Read-only.** The bot only ever reads balances. Every credential it uses is set up so that it cannot trade, withdraw or move funds.
- **Daily snapshot.** Every day at **06:00 UTC** the bot saves a snapshot of every balance to the database. The snapshots feed the 1D comparison charts.
- **Public.** The bot answers anyone who writes to it. The balances it shows are not treated as secret.

## Commands

Commands are set up in the database, not in code. Each `tg_cmd_*` table binds a command alias to what it shows:

| Table                  | One row shows                                                                  |
| ---------------------- | ------------------------------------------------------------------------------ |
| `tg_cmd_owners`        | The owner's total across all accounts. IBKR is shown per its `display_type`.   |
| `tg_cmd_accounts_ibkr` | One IBKR account in full: every sub-account with its positions, then its cash. |

An alias is the command without the slash: lowercase letters, digits and `_`, up to 32 characters. The same alias can appear in several rows and in several tables. The bot then sends one message per row: owners first, then IBKR accounts.

`/start`, `/help` and unknown commands get the list of available commands. The bot's command menu is updated at startup and after every command it answers, so a new alias shows up in the menu after a restart or after the next command. Times are in UTC.

## Connecting accounts

How to get read-only access to each account, and what the bot stores for it: [ACCOUNTS.md](ACCOUNTS.md).
