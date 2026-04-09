<div align="center">

# ZK Sentinel

**Autonomous AI trading agent with on-chain identity, EIP-712 verified checkpoints, and a live React dashboard**

[![Network](https://img.shields.io/badge/Network-Sepolia%20Testnet-8B2235?style=flat-square)](https://sepolia.etherscan.io)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.24-363636?style=flat-square&logo=solidity)](https://soliditylang.org)
[![Node](https://img.shields.io/badge/Node.js-20+-339933?style=flat-square&logo=nodedotjs)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)

</div>

---

## Overview

ZK Sentinel is a production-ready autonomous trading agent that combines:

- **ERC-8004 on-chain identity** — every agent is a registered, addressable entity on Sepolia
- **EIP-712 signed checkpoints** — every decision (BUY, SELL, HOLD) is cryptographically signed and verifiable on-chain
- **Volume-confirmed momentum strategy** — EMA + On-Balance Volume with configurable thresholds
- **On-chain risk gating** — all trade intents pass through a `RiskRouter` smart contract before execution
- **Live React dashboard** — real-time decisions, ZK proof status, reputation score, and agent logs via WebSocket
- **Dual dashboard** — a legacy Agent Terminal at `:3001` alongside the modern React UI at `:5173`

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        ZK Sentinel                          │
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
| AgentRegistry | [`0xf91d541378F2b301d7137837b9D8A942E177606c`](https://sepolia.etherscan.io/address/0xf91d541378F2b301d7137837b9D8A942E177606c) |
| HackathonVault | [`0x44A98eB741ca924Bc0b29e3a63BfA389EbFDC673`](https://sepolia.etherscan.io/address/0x44A98eB741ca924Bc0b29e3a63BfA389EbFDC673) |
| RiskRouter | [`0xdd9a28932dD65E8FdbE5241f112f7dfBfD578aC6`](https://sepolia.etherscan.io/address/0xdd9a28932dD65E8FdbE5241f112f7dfBfD578aC6) |
| ReputationRegistry | [`0x8C185007AAf8a3996180E455e13753FfF6E14e56`](https://sepolia.etherscan.io/address/0x8C185007AAf8a3996180E455e13753FfF6E14e56) |
| ValidationRegistry | [`0xf94468ffa3c364f0CA4E5c0F66F5c3108ec54414`](https://sepolia.etherscan.io/address/0xf94468ffa3c364f0CA4E5c0F66F5c3108ec54414) |

> Deployed on **2026-03-31** by `0xED4c3a2508AdE21cD431f7eb8F3D2E7C42F1B307`

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
git clone https://github.com/your-username/ZKSentinel.git
cd ZKSentinel

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
AGENT_REGISTRY_ADDRESS=0xf91d541378F2b301d7137837b9D8A942E177606c
HACKATHON_VAULT_ADDRESS=0x44A98eB741ca924Bc0b29e3a63BfA389EbFDC673
RISK_ROUTER_ADDRESS=0xdd9a28932dD65E8FdbE5241f112f7dfBfD578aC6
REPUTATION_REGISTRY_ADDRESS=0x8C185007AAf8a3996180E455e13753FfF6E14e56
VALIDATION_REGISTRY_ADDRESS=0xf94468ffa3c364f0CA4E5c0F66F5c3108ec54414

# ── Agent config ──────────────────────────────────────────────
AGENT_ID=1
TRADING_PAIR=XBTUSD
POLL_INTERVAL_MS=600000      # 10 minutes (recommended)
MIN_CHECKPOINT_CONFIDENCE=0.70
```

### Kraken API key permissions

In Kraken Pro → **Settings → API**, create a key with only:

- **Funds:** Query
- **Orders and trades:** Query open orders & trades · Create & modify orders · Cancel & close orders

---

## Running the Project

ZK Sentinel has three services. Open **three terminals**:

### Terminal 1 — Trading Agent

```bash
npm run run-agent
```

The agent warms up for 5 ticks (collecting price samples), then evaluates momentum every `POLL_INTERVAL_MS` milliseconds. Every decision generates an EIP-712 signed checkpoint appended to `checkpoints.jsonl`.

```
[agent] Starting agent loop
[agent] agentId:         1
[agent] Pair:            XBTUSD
[agent] Interval:        600s (10 min)
[agent] Min checkpoint confidence: 70%

[agent] XBTUSD @ $67,311.00
[agent] HOLD — Volume below threshold
[agent] ✓ Checkpoint posted (score=72): 0x65da6b3f...
```

### Terminal 2 — Dashboard API Server

```bash
# Uses port 3001 (port 3000 may be occupied by other services)
DASHBOARD_PORT=3001 npx tsx scripts/dashboard.ts
```

Starts two interfaces:
- **Agent Terminal** (legacy) → `http://localhost:3001`
- **REST + WebSocket API** → `http://localhost:3001/api/*` and `ws://localhost:3001/ws`

### Terminal 3 — React Dashboard

```bash
cd zk-agent-frontend
npm run dev
```

Opens the live React dashboard at **`http://localhost:5173`**

---

## Dashboard Views

| View | URL | Description |
|---|---|---|
| Dashboard | `/` | Live decisions, ZK proof status, reputation overview |
| ZK Proofs | `/zk-proofs` | All EIP-712 proof records with pass/fail status |
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

Copy the 5 printed addresses into your `.env`, then register your agent:

```bash
npm run register
```

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

See [`src/agent/strategy.ts`](src/agent/strategy.ts) for the full `VolumeConfirmedMomentumStrategy` implementation and `LLMStrategy` stub.

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
ZKSentinel/
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
│   ├── explainability/
│   │   ├── reasoner.ts            # Human-readable explanation formatter
│   │   └── checkpoint.ts          # EIP-712 checkpoint generation + verification
│   └── backtesting/
│       └── backtest.ts            # Strategy backtesting harness
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
│   │   ├── pages/                 # Dashboard, ZKProofs, TradeHistory, Reputation, Config
│   │   ├── context/               # AgentDataContext (WebSocket + HTTP merge)
│   │   ├── hooks/                 # useWebSocket, useAgentData, useTheme, useUptime
│   │   └── types/                 # Frontend TypeScript types
│   └── .env                       # VITE_API_URL, VITE_WS_URL
│
├── tutorial/                      # Step-by-step walkthrough (7 parts)
├── checkpoints.jsonl              # Signed audit log (auto-generated)
├── deployed.json                  # Deployed contract addresses
├── agent-id.json                  # Registered agent identity
├── hardhat.config.ts
├── .env.example
└── package.json
```

---

## Tutorial

Step-by-step walkthrough in the [`tutorial/`](tutorial/) folder:

1. [What is ERC-8004 and why does it matter?](tutorial/01-erc8004-intro.md)
2. [Registering your agent on-chain](tutorial/02-register-agent.md)
3. [Connecting to Kraken API](tutorial/03-kraken-connection.md)
4. [The Vault and Risk Router](tutorial/04-vault-riskrouter.md)
5. [Building the explanation layer](tutorial/05-explanation-layer.md)
6. [EIP-712 signed checkpoints](tutorial/06-eip712-checkpoints.md)
7. [Using this as a reusable template](tutorial/07-reusable-template.md)

---

## Security Notes

- **Never commit your `.env` file** — it contains private keys
- `KRAKEN_SANDBOX=true` keeps the agent in paper trading mode; set to `false` only when ready for live execution
- The agent wallet (`AGENT_WALLET_PRIVATE_KEY`) is a hot wallet used only for signing — keep it separate from your operator wallet
- All contract addresses and private keys in this repo's `.env` are for **Sepolia testnet only**

---

## License

[MIT](LICENSE) — built by Kainat Khan & Kelvin Momanyi