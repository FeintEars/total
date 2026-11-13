# Mr. Total

A Telegram bot that reports the combined balance across several brokerage, exchange and wallet accounts: Interactive Brokers, Binance, Bybit, Polymarket, and assets entered by hand (Earns).

- **Read-only.** The bot only ever reads balances. Every credential it uses is set up so that it cannot trade, withdraw or move funds.
- **Daily snapshot.** Every day at **06:00 UTC** the bot saves a snapshot of every balance to the database. The snapshots feed the 1D comparison charts.
- **Private.** The bot answers only to your own Telegram `chat_id`.

## Connecting accounts

How to get read-only access to each account, and what the bot stores for it: [ACCOUNTS.md](ACCOUNTS.md).
