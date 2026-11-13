# Mr. Total

A Telegram bot that reports the combined balance across several brokerage, exchange and wallet accounts.

The bot only ever **reads** balances. Every credential below is set up so that it cannot trade, withdraw or move funds. If a vendor asks you to grant anything beyond read access, don't.

| Vendor              | What you need                     | Read-only by design | Expires                     |
| ------------------- | --------------------------------- | ------------------- | --------------------------- |
| Interactive Brokers | Flex Web Service token + Query ID | Yes                 | Up to 1 year                |
| Binance             | API key + secret                  | Yes, if configured  | Never (with IP restriction) |
| Bybit               | API key + secret                  | Yes, if configured  | 3 months without IP binding |
| Telegram Walt       | Assets and APY, entered by hand   | Yes, no credentials | Never                       |
| Polymarket          | Proxy wallet address              | Yes, no secret      | Never                       |

> Vendor UIs change. If a menu item has moved, look for the same wording nearby.

---

## Daily snapshot

Once a day, without any command, the bot takes a snapshot of every balance and saves it to the database. The snapshots are the data for 1D comparison charts.

**Schedule:** every day at **06:00 UTC**, weekends included. The time is fixed in UTC, so it does not depend on the server's timezone or on daylight saving time.

---

## Interactive Brokers (Flex Web Service)

Flex Web Service returns a report that you define once in Client Portal. The token can only download reports, so it is read-only by design.

**Note:** the data is as of the close of the previous business day. It is not real-time.

### 1. Create a Flex Query

1. Log in to [Client Portal](https://www.interactivebrokers.com/portal).
2. Go to **Performance & Reports → Flex Queries**.
3. Next to **Activity Flex Query**, click **+** (Create).
4. Give it a name, e.g. `mr-total-bot`.
5. Under **Sections**, enable:
   - **Net Asset Value (NAV) in Base**: the total account value
   - **Cash Report**: cash per currency
   - **Open Positions**: optional, for a per-position breakdown
6. Under **Delivery Configuration**:
   - **Format**: `XML`
   - **Period**: `Last Business Day`
7. Save, then note the **Query ID** shown in the list of queries.

### 2. Generate a Flex Web Service token

1. On the same **Flex Queries** page, click the gear icon next to **Flex Web Service Configuration**.
2. Turn **Flex Web Service Status** on.
3. Click **Generate New Token**.
4. Choose the longest expiration (**1 year**).
5. Optional but recommended: restrict the token to your server's IP address.
6. Copy the token.

Generating a new token invalidates the previous one. A token can't be made permanent: once it expires, generate a new one and update it in the bot.

### What the bot stores

- `token`
- `queryId`

### How it is read

Fetching a report takes two steps:

```
GET https://ndcdyn.interactivebrokers.com/AccountManagement/FlexWebService/SendRequest?t={token}&q={queryId}&v=3
  → returns a ReferenceCode

GET https://ndcdyn.interactivebrokers.com/AccountManagement/FlexWebService/GetStatement?t={token}&q={referenceCode}&v=3
  → returns the XML report (retry after a few seconds if it isn't ready yet)
```

---

## Binance

### 1. Create the key

1. Log in to [binance.com](https://www.binance.com). Identity verification and 2FA must be enabled on the account.
2. Open **Profile → Account → API Management**.
3. Click **Create API**, choose **System generated** (HMAC), and enter a label, e.g. `mr-total-bot`.
4. Complete the 2FA check.
5. Copy the **API Key** and the **Secret Key**. The secret is shown **only once**.

### 2. Restrict it

Click **Edit restrictions** on the new key:

- **Enable Reading**: on (the only permission that should be enabled)
- **Enable Spot & Margin Trading**: off
- **Enable Futures**: off
- **Enable Withdrawals**: off
- every other permission: off
- **Restrict access to trusted IPs only**: on, with your server's IP address

Save.

### What the bot stores

- `apiKey`
- `apiSecret`

### How it is read

Signed requests send the `X-MBX-APIKEY` header plus `timestamp` and `signature` (HMAC-SHA256 of the query string) parameters.

- `POST /sapi/v1/asset/wallet/balance`: balance of every wallet (Spot, Funding, Futures, Earn, …), in BTC
- `GET /api/v3/account`: Spot balances per coin
- `GET /sapi/v1/simple-earn/flexible/position`: Simple Earn positions
- `GET /api/v3/ticker/price`: public prices, used to convert to USD

---

## Bybit

### 1. Create the key

1. Log in to [bybit.com](https://www.bybit.com) and enable 2FA.
2. Open **Profile → API**.
3. Click **Create New Key → System-generated API Keys**.
4. Choose **API Transaction** as the usage type, and enter a name, e.g. `mr-total-bot`.

### 2. Restrict it

- **API Key Permissions**: **Read-Only**
- Leave every permission checkbox (Orders, Positions, Withdrawal, Transfer, …) unchecked
- **IP restriction**: choose **Only IPs with permissions granted are allowed to access the OpenAPI** and enter your server's IP address

Submit, pass the 2FA check, and copy the **API Key** and **API Secret**. The secret is shown **only once**.

A key without an IP restriction expires after **3 months**. A key bound to an IP address doesn't expire.

### What the bot stores

- `apiKey`
- `apiSecret`

### How it is read

Requests are signed with the `X-BAPI-API-KEY`, `X-BAPI-TIMESTAMP`, `X-BAPI-RECV-WINDOW` and `X-BAPI-SIGN` headers. `X-BAPI-SIGN` is an HMAC-SHA256 signature.

- `GET /v5/account/wallet-balance?accountType=UNIFIED`: Unified Trading Account, including `totalEquity` in USD
- `GET /v5/asset/transfer/query-account-coins-balance?accountType=FUND`: Funding account
- `GET /v5/earn/position`: Earn positions

---

## Telegram Walt

Telegram Walt ([@wallet](https://t.me/wallet)) is a single provider in the bot, and every asset in it is entered by hand. This covers both parts of the app:

- **Custodial:** there is no way to read it automatically. Telegram offers no API for your own balance, and Wallet Pay API is for merchants and doesn't return balances. The Walt MCP server (`https://walletbot.me/bot-relay/public-api/mcp`) only covers Walt Perps: its `balance_get` tool returns Perps account balances, not the wallet. Logging in as your Telegram account (MTProto) to call the Mini App's private API would work technically, but the session gives full control of the Telegram account, including Walt itself. The bot doesn't do this.
- **Self-custodial:** it could be read from the blockchain, but its assets can sit on different networks (TON, Solana, …), each with its own address and API. Entering them by hand keeps all of Walt in one list.

### What you enter

- **Assets:** the amount of every asset, custodial and self-custodial alike, e.g. `GRAM 12.5`, `USDT 40`, `SOL 0.8`. Update an asset whenever its amount changes for a reason the bot can't predict: a deposit, a withdrawal, a transfer or a swap.
- **APY rates:** for every asset in Earn or staking, the APY shown in Walt. When Walt changes a rate, enter the new one. The old rate is kept for the period before the change.

Assets are converted to USD with public prices from the same Binance `GET /api/v3/ticker/price` endpoint as above. Prices are quoted in USDT, and USDT counts as 1 USD.

---

## Polymarket

Polymarket runs on Polygon, and your funds sit in a **proxy wallet** that Polymarket created for you. All of its data is public, so no API key is needed.

Don't use the CLOB API keys for this. They are derived from your private key and can place orders.

### 1. Get the proxy wallet address

1. Log in to [polymarket.com](https://polymarket.com).
2. Open your profile (avatar → **Profile**).
3. Copy the `0x…` address shown there.

This is the proxy wallet address. It is **not** the same as the address of the wallet or email login you sign in with.

### What the bot stores

- `address`

### How it is read

- `GET https://data-api.polymarket.com/value?user={address}`: current value of open positions, in USD
- `GET https://data-api.polymarket.com/positions?user={address}`: list of open positions
- Cash: call `balanceOf(address)` on the USDC.e contract on Polygon (`0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174`, 6 decimals) through any Polygon RPC endpoint

---

## Security checklist

- Grant read permissions only. Never enable trading, transfers or withdrawals.
- Bind every key that supports it to your server's IP address.
- Keep secrets out of git and out of logs.
- The bot must answer only to your own Telegram `chat_id`.
- If a key leaks, delete it in the vendor's UI right away and create a new one.
