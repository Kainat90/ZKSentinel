<div align="center">

# Sentinel

**Autonomous AI trading agent with on-chain identity, EIP-712 verified checkpoints, and a live React dashboard**

[![Network](https://img.shields.io/badge/Network-Sepolia%20Testnet-8B2235?style=flat-square)](https://sepolia.etherscan.io)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.24-363636?style=flat-square&logo=solidity)](https://soliditylang.org)
[![Node](https://img.shields.io/badge/Node.js-20+-339933?style=flat-square&logo=nodedotjs)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)

</div>

---

## Overview

Sentinel is a production-ready autonomous trading agent that combines:

- **ERC-8004 on-chain identity** — every agent is a registered, addressable entity on Sepolia
- **EIP-712 signed checkpoints** — every decision (BUY, SELL, HOLD) is cryptographically signed and verifiable on-chain
- **Volume-confirmed momentum strategy** — EMA + On-Balance Volume with volatility guard
- **On-chain risk gating** — all trade intents pass through a `RiskRouter` smart contract before execution
- **Live React dashboard** — real-time decisions, EIP-712 proof status, reputation score, and agent logs via WebSocket
- **Dual dashboard** — a legacy Agent Terminal at `:3001` alongside the modern React UI at `:5173`

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Sentinel                            │
│                                                             │
│   Market Data (CoinGecko)                                   │
│         │                                                   │
│         ▼                                                   │
│   VolumeConfirmedMomentumStrategy                           │
│   (EMA-9 + OBV + volatility gate)                           │
│         │                                                   │
│         ▼                                                   │
│   [On-chain] RiskRouter.validateTrade()  ──── REJECT        │
│         │ APPROVE                                           │
│         ▼                                                   │
│   [Exchange] Kraken REST API (paper / live)                 │
│         │                                                   │
│         ▼                                                   │
│   EIP-712 Checkpoint  ──▶  ValidationRegistry (Sepolia)     │
│         │                                                   │
│         ▼                                                   │
│   checkpoints.jsonl  ──▶  Dashboard API  ──▶  React UI      │
└─────────────────────────────────────────────────────────────┘
```

---

## Features

| Feature | Description |
|---|---|
| ERC-8004 Agent Identity | On-chain ERC-721 token representing the agent's identity |
| EIP-712 Signed Decisions | Every checkpoint is typed, signed, and verifiable |
| Risk Router Gating | Smart contract validates every trade intent before execution |
| Reputation Registry | On-chain score built from checkpoint attestations |
| Live WebSocket Dashboard | Real-time feed of decisions, proofs, and logs |
| Agent Terminal | Legacy terminal-style dashboard at `localhost:3001` |
| Paper Trading Mode | Safe sandbox mode via Kraken API (`KRAKEN_SANDBOX=true`) |
| Pluggable Strategy | Swap in any `TradingStrategy` implementation in one line |

---

## Tech Stack

**Backend / Agent**
- Node.js 20+ · TypeScript 5.3
- [ethers.js v6](https://docs.ethers.org/v6/) — wallet, signing, contract calls
- [Hardhat 3](https://hardhat.org) — contract compilation and deployment
- [Express 5](https://expressjs.com) + [ws](https://github.com/websockets/ws) — dashboard API + WebSocket server
- [ccxt](https://github.com/ccxt/ccxt) — Kraken exchange integration

**Smart Contracts** (Solidity 0.8.24, EVM Cancun)
- `AgentRegistry.sol` — ERC-8004 identity registry
- `HackathonVault.sol` — per-agent capital allocation
- `RiskRouter.sol` — on-chain trade intent validation
- `ReputationRegistry.sol` — attestation-based reputation scoring
- `ValidationRegistry.sol` — checkpoint attestation storage

**Frontend**
- [React 19](https://react.dev) · TypeScript · [Vite 8](https://vite.dev)
- [Recharts](https://recharts.org) — live charts
- [react-router-dom v7](https://reactrouter.com) — client-side routing
- [lucide-react](https://lucide.dev) — icons

---

## Deployed Contracts (Sepolia)

| Contract | Address |
|---|---|
| AgentRegistry | [`0x97b07dDc405B0c28B17559aFFE63BdB3632d0ca3`](https://sepolia.etherscan.io/address/0x97b07dDc405B0c28B17559aFFE63BdB3632d0ca3) |
| HackathonVault | [`0x0E7CD8ef9743FEcf94f9103033a044caBD45fC90`](https://sepolia.etherscan.io/address/0x0E7CD8ef9743FEcf94f9103033a044caBD45fC90) |
| RiskRouter | [`0xd6A6952545FF6E6E6681c2d15C59f9EB8F40FdBC`](https://sepolia.etherscan.io/address/0xd6A6952545FF6E6E6681c2d15C59f9EB8F40FdBC) |
| ReputationRegistry | [`0x423a9904e39537a9997fbaF0f220d79D7d545763`](https://sepolia.etherscan.io/address/0x423a9904e39537a9997fbaF0f220d79D7d545763) |
| ValidationRegistry | [`0x92bF63E5C7Ac6980f237a7164Ab413BE226187F1`](https://sepolia.etherscan.io/address/0x92bF63E5C7Ac6980f237a7164Ab413BE226187F1) |

> Agent ID: **6** · Wallet: `0xED4c3a2508AdE21cD431f7eb8F3D2E7C42F1B307`

---

## Prerequisites

- **Node.js** 20 or higher
- **npm** 9 or higher
- A **Sepolia RPC URL** — free from [Alchemy](https://alchemy.com) or [Infura](https://infura.io)
- A **funded Sepolia wallet** — get test ETH from [sepoliafaucet.com](https://sepoliafaucet.com)
- A **Kraken Pro account** with API keys (for live/paper trading)
- **Etherscan API key** — for contract verification (optional)

---

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/your-username/Sentinel.git
cd Sentinel

# 2. Install backend dependencies
npm install

# 3. Install frontend dependencies
cd zk-agent-frontend && npm install && cd ..

# 4. Configure environment
cp .env.example .env
# Edit .env with your keys (see Configuration section below)
```

---

## Configuration

Copy `.env.example` to `.env` and fill in all values:

```env
# ── Ethereum / Sepolia ────────────────────────────────────────
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
PRIVATE_KEY=your_wallet_private_key_here
ETHERSCAN_API_KEY=your_etherscan_api_key

# ── Agent wallet (optional — falls back to PRIVATE_KEY) ───────
AGENT_WALLET_PRIVATE_KEY=your_hot_wallet_key

# ── Kraken API ────────────────────────────────────────────────
KRAKEN_API_KEY=your_kraken_api_key
KRAKEN_API_SECRET=your_kraken_api_secret
KRAKEN_SANDBOX=true          # Set to false for live trading

# ── Deployed contract addresses ───────────────────────────────
AGENT_REGISTRY_ADDRESS=0x97b07dDc405B0c28B17559aFFE63BdB3632d0ca3
HACKATHON_VAULT_ADDRESS=0x0E7CD8ef9743FEcf94f9103033a044caBD45fC90
RISK_ROUTER_ADDRESS=0xd6A6952545FF6E6E6681c2d15C59f9EB8F40FdBC
REPUTATION_REGISTRY_ADDRESS=0x423a9904e39537a9997fbaF0f220d79D7d545763
VALIDATION_REGISTRY_ADDRESS=0x92bF63E5C7Ac6980f237a7164Ab413BE226187F1

# ── Agent config ──────────────────────────────────────────────
AGENT_ID=6
TRADING_PAIR=BTCUSD
POLL_INTERVAL_MS=60000
MIN_CHECKPOINT_CONFIDENCE=0.70
DEV_MODE=true
```

### Kraken API key permissions

In Kraken Pro → **Settings → API**, create a key with only:

- **Funds:** Query
- **Orders and trades:** Query open orders & trades · Create & modify orders · Cancel & close orders

---

## Running the Project

Sentinel has three services. Open **three terminals** (use PowerShell on Windows):

### Terminal 1 — Trading Agent

```powershell
npm run run-agent
```

The agent warms up for 10 ticks, then evaluates momentum every `POLL_INTERVAL_MS` milliseconds. Every decision generates an EIP-712 signed checkpoint appended to `checkpoints.jsonl`.

```
[agent] Starting agent loop
[agent] agentId:         6
[agent] Pair:            BTCUSD
[agent] Interval:        60s (1 min)

[agent] BTCUSD @ $71,959
[agent] HOLD — Warming up (1/10 candles)
```

### Terminal 2 — Dashboard API Server

```powershell
# PowerShell syntax for environment variables
$env:DASHBOARD_PORT=3001
npx tsx scripts/dashboard.ts
```

Starts two interfaces:
- **Agent Terminal** (legacy) → `http://localhost:3001`
- **REST + WebSocket API** → `http://localhost:3001/api/*` and `ws://localhost:3001/ws`

### Terminal 3 — React Dashboard

```powershell
cd zk-agent-frontend
npm run dev
```

Opens the live React dashboard at **`http://localhost:5173`**

> **Note:** The React frontend reads `VITE_API_URL` and `VITE_WS_URL` from `zk-agent-frontend/.env`. Both should point to the dashboard port (default: `3001`).

---

## Dashboard Views

| View | URL | Description |
|---|---|---|
| Dashboard | `/` | Live decisions, EIP-712 proof status, reputation overview |
| EIP-712 Proofs | `/proofs` | All EIP-712 proof records with pass/fail status |
| Trade History | `/trade-history` | Full decision log with confidence and PnL |
| Reputation | `/reputation` | On-chain reputation score, charts, and registry contracts |
| Config | `/config` | Agent configuration and contract addresses |

### API Endpoints

| Endpoint | Description |
|---|---|
| `GET /api/status` | Agent config and contract addresses |
| `GET /api/decisions` | Last 50 trade decisions (from `checkpoints.jsonl`) |
| `GET /api/proofs` | Last 50 EIP-712 proof records |
| `GET /api/reputation` | Live reputation score computed from checkpoints |
| `GET /api/checkpoints` | Raw checkpoint data |
| `WS  /ws` | Real-time push of decisions, proofs, logs, and reputation updates |

---

## Deploying Your Own Contracts

If you want to deploy fresh contracts instead of using the pre-deployed ones:

```bash
# Compile
npm run compile

# Deploy to Sepolia
npm run deploy
```

Copy the 5 printed addresses into your `.env`, then clear `AGENT_ID` and register your agent:

```bash
npm run register
```

> **Important:** Before running `register`, comment out or remove `AGENT_ID` from `.env`. If `AGENT_ID` is set, the script will skip the on-chain mint and return the cached value without verifying the token exists.

Copy the printed `AGENT_ID` to your `.env`.

---

## Swapping in Your Own Strategy

Edit `src/agent/index.ts` to use any class that implements `TradingStrategy`:

```typescript
// Current default
const strategy = new VolumeConfirmedMomentumStrategy();

// Switch to LLM-powered strategy
// const strategy = new LLMStrategy();

// Or bring your own
// const strategy = new MyCustomStrategy();
```

Any strategy just needs to implement one method:

```typescript
interface TradingStrategy {
  analyze(data: MarketData): Promise<TradeDecision>;
}
```

See [`src/agent/strategy.ts`](src/agent/strategy.ts) for the full `VolumeConfirmedMomentumStrategy` implementation.

---

## Verifying a Checkpoint

Every checkpoint in `checkpoints.jsonl` can be independently verified:

```typescript
import { verifyCheckpoint } from "./src/explainability/checkpoint";

const valid = verifyCheckpoint(
  checkpoint,
  process.env.AGENT_REGISTRY_ADDRESS!,
  11155111, // Sepolia chain ID
  process.env.AGENT_WALLET_PRIVATE_KEY! // expected signer
);

console.log(valid); // true
```

---

## Project Structure

```
Sentinel/
│
├── contracts/
│   ├── AgentRegistry.sol          # ERC-8004 agent identity (ERC-721)
│   ├── HackathonVault.sol         # Per-agent capital vault
│   ├── RiskRouter.sol             # On-chain trade intent validation
│   ├── ReputationRegistry.sol     # Attestation-based reputation scoring
│   └── ValidationRegistry.sol    # Checkpoint attestation storage
│
├── src/
│   ├── types/index.ts             # Shared TypeScript interfaces
│   ├── agent/
│   │   ├── index.ts               # Main agent loop
│   │   ├── identity.ts            # ERC-8004 registration + resolution
│   │   ├── strategy.ts            # TradingStrategy interface + implementations
│   │   └── checkparams.ts        # Parameter validation
│   ├── data/
│   │   ├── marketdata.ts          # CoinGecko market data fetcher
│   │   └── coingecko.ts           # CoinGecko API client
│   ├── exchange/
│   │   └── kraken.ts              # Kraken REST API client
│   ├── onchain/
│   │   ├── vault.ts               # HackathonVault contract client
│   │   ├── riskRouter.ts          # RiskRouter contract client + EIP-712 signing
│   │   ├── validationRegistry.ts  # ValidationRegistry client
│   │   └── reputationRegistry.ts  # ReputationRegistry client
│   └── explainability/
│       ├── reasoner.ts            # Human-readable explanation formatter
│       └── checkpoint.ts          # EIP-712 checkpoint generation + verification
│
├── scripts/
│   ├── deploy.ts                  # Deploy all contracts to Sepolia
│   ├── register-agent.ts          # Register agent on-chain
│   ├── run-agent.ts               # Agent entry point
│   └── dashboard.ts               # Express API server + legacy terminal UI
│
├── zk-agent-frontend/             # React 19 + Vite dashboard
│   ├── src/
│   │   ├── components/            # Header, Sidebar, Cards, Charts
│   │   ├── pages/                 # Dashboard, Proofs, TradeHistory, Reputation, Config
│   │   ├── context/               # AgentDataContext (WebSocket + HTTP merge)
│   │   ├── hooks/                 # useWebSocket, useAgentData, useTheme, useUptime
│   │   └── types/                 # Frontend TypeScript types
│   └── .env                       # VITE_API_URL=http://localhost:3001, VITE_WS_URL=ws://localhost:3001/ws
│
├── checkpoints.jsonl              # Signed audit log (auto-generated)
├── deployed.json                  # Deployed contract addresses
├── agent-id.json                  # Registered agent identity
├── hardhat.config.ts
├── .env.example
└── package.json
```

---

## Known Issues & Notes

- **`AGENT_ID` in `.env` skips on-chain verification** — if you redeploy contracts, comment out `AGENT_ID` before running `npm run register`. The identity script returns the cached value without checking whether the token exists on the new contract.
- **PowerShell env vars** — use `$env:VAR=value; command` or set variables on separate lines before running commands. Unix-style `VAR=value command` syntax does not work in PowerShell.
- **Dashboard port** — the dashboard defaults to port `3000`. Set `$env:DASHBOARD_PORT=3001` before starting if you want port `3001`. The React frontend's `zk-agent-frontend/.env` must match whichever port the dashboard uses.
- **Volatility guard** — the `VolumeConfirmedMomentumStrategy` rejects trades when price swing exceeds 3%. This is intentional and will show as `Volatility guard` in checkpoint reasoning.

---

## Security Notes

- **Never commit your `.env` file** — it contains private keys
- `KRAKEN_SANDBOX=true` keeps the agent in paper trading mode; set to `false` only when ready for live execution
- The agent wallet (`AGENT_WALLET_PRIVATE_KEY`) is a hot wallet used only for signing — keep it separate from your operator wallet
- All contract addresses and private keys in this repo's `.env` are for **Sepolia testnet only**

---

## License

[MIT](LICENSE) — built by Kainat Khan & Kelvin Momanyi
