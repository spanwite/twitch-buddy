# TwitchBuddy 🟣📣 — Telegram bot for Twitch live alerts

A telegram bot that notifies you when your favorite Twitch streamers go live or end their streams.

## ✨ Features

- ➕/➖ Add or remove streamers via bot commands
- 🗑️ Interactive removal with inline buttons
- 📋 List all tracked streamers and their status (online/offline)
- 🔔 Notify subscribers of a streamer when the stream starts or ends

## 🧰 Tech Stack

- ⚡ Bun — all-in-one Node.js runtime
- 🗄️ SQLite — embedded database
- 🤖 node-telegram-bot-api — Telegram Bot API client
- 🛑 Bottleneck — rate limiting for HTTP requests

## 🚀 Quick Start (Binary)

1. Download the binary for your OS from the GitHub Releases page
2. Create and fill the .env file (see Configuration)
3. Run the binary

## 🛠️ Build & Run from Source

```bash
# Clone
git clone https://github.com/spanwite/twitch-buddy.git
cd twitch-buddy

# Install (production-only, lockfile respected)
bun install --frozen-lockfile --production

# Start
bun run start
```

## ⚙️ Configuration (.env)

Create a .env file in the project root:

```
TWITCH_CLIENT_ID=your_twitch_client_id
TWITCH_CLIENT_SECRET=your_twitch_client_secret
DATABASE_URL=your_database_url
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
NOTIFICATION_INTERVAL=5 # in minutes
```

> Notes:
>
> - DATABASE_URL defaults to TwitchBuddy.sqlite if not set.
> - NOTIFICATION_INTERVAL defaults to 5 minutes if not set.
