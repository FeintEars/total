# Mr. Total

A Telegram bot that reports the combined balance across several brokerage, exchange and wallet accounts: Interactive Brokers, Binance, Bybit, Polymarket, and assets entered by hand (Earns).

- **Read-only.** The bot only ever reads balances. Every credential it uses is set up so that it cannot trade, withdraw or move funds.
- **Daily snapshot.** Every day at **06:00 UTC** the bot saves a snapshot of every balance to the database. The snapshots feed the 1D comparison charts.
- **Allowlisted.** The bot answers only the users and group chats listed in the database. Everyone else gets no reply. See [Access](#access).

## Commands

Commands are set up in the database, not in code. Each `tg_cmd_*` table binds a command alias to what it shows:

| Table                  | One row shows                                                                  |
| ---------------------- | ------------------------------------------------------------------------------ |
| `tg_cmd_owners`        | The owner's total across all accounts.                                         |
| `tg_cmd_accounts_ibkr` | One IBKR account in full: every sub-account with its positions, then its cash. |

An alias is the command without the slash: lowercase letters, digits and `_`, up to 32 characters. The same alias can appear in several rows and in several tables. The bot then sends one message per row: owners first, then IBKR accounts.

`/start`, `/help` and unknown commands get the list of available commands. The bot's command menu is updated at startup and after every command it answers, so a new alias shows up in the menu after a restart or after the next command. Times are in UTC.

## Access

Who may use the bot is set up in the database, not in code:

| Table              | One row allows                                                    |
| ------------------ | ----------------------------------------------------------------- |
| `tg_allowed_users` | One user (`user_id`) to use the bot in a private chat.            |
| `tg_allowed_chats` | One group or supergroup (`chat_id`). Any member may run commands. |

To find an id, send any command to the bot from that chat. The bot logs it as `Ignored /total in private chat 123456789 from user 123456789`. Then add a row.

## Connecting accounts

How to get read-only access to each account, and what the bot stores for it: [ACCOUNTS.md](ACCOUNTS.md).
