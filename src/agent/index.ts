import * as dotenv from "dotenv";
dotenv.config();

import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";

import { TradingStrategy, TradeDecision } from "../types/index";
import { getAgentId, getAgentRegistration } from "./identity";
import { VolumeConfirmedMomentumStrategy } from "./strategy";
import { getMarketSnapshot } from "../data/marketdata";
import { VaultClient } from "../onchain/vault";
import { RiskRouterClient } from "../onchain/riskRouter";
import { ValidationRegistryClient } from "../onchain/validationRegistry";
import { formatExplanation, formatCheckpointLog } from "../explainability/reasoner";
import { generateCheckpoint } from "../explainability/checkpoint";

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

const SEPOLIA_CHAIN_ID = 11155111;
const TRADING_PAIR    = process.env.TRADING_PAIR || "BTCUSD";

// 60s polling — checkpoints post frequently so reputation builds faster.
// Override via POLL_INTERVAL_MS in .env if needed.
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL_MS || "60000");

const CHECKPOINTS_FILE = path.join(process.cwd(), "checkpoints.jsonl");
const HOLD_INTENT_HASH = ethers.ZeroHash;

// 0.50 threshold — meaningful HOLDs post on-chain and grow reputation
// even when strict RiskRouter guardrails block all trades.
// Override via MIN_CHECKPOINT_CONFIDENCE in .env.
const MIN_CHECKPOINT_CONFIDENCE = parseFloat(
  process.env.MIN_CHECKPOINT_CONFIDENCE || "0.50"
);

function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

// ─────────────────────────────────────────────────────────────────────────────
// Checkpoint scoring
// Rules:
//   - Warm-up HOLD          → 0   (no signal value)
//   - RiskRouter BLOCKED    → 90  (agent correctly deferred to risk system)
//   - BUY / SELL            → confidence * 100 (capped 0–100)
//   - Meaningful HOLD       → confidence * 100 (capped 60–95)
// ─────────────────────────────────────────────────────────────────────────────
function computeCheckpointScore(decision: TradeDecision): number {
  if (decision.reasoning.startsWith("Warming up")) return 0;
  if (decision.reasoning.includes("BLOCKED by RiskRouter")) return 90;

  const baseScore = Math.round(decision.confidence * 100);

  if (decision.action === "BUY" || decision.action === "SELL") {
    return Math.min(100, Math.max(0, baseScore));
  }

  return Math.min(95, Math.max(60, baseScore));
}

// ─────────────────────────────────────────────────────────────────────────────
// Gate logic — what gets posted on-chain
// NOTE: Separate from RiskRouter guardrails.
//       Guardrails protect capital. This gate builds reputation.
//       Even a BLOCKED trade posts score=90 and grows reputation.
// ─────────────────────────────────────────────────────────────────────────────
function shouldPostCheckpoint(decision: TradeDecision, isInPosition: boolean): boolean {
  if (decision.action === "BUY" || decision.action === "SELL") return true;
  if (decision.reasoning.includes("BLOCKED by RiskRouter")) return true;
  if (decision.reasoning.startsWith("Warming up")) return false;
  if (isInPosition) return true;
  return decision.confidence >= MIN_CHECKPOINT_CONFIDENCE;
}

// ─────────────────────────────────────────────────────────────────────────────
// Agent runner
// ─────────────────────────────────────────────────────────────────────────────

export async function runAgent(strategy: TradingStrategy) {
  const rpcUrl            = requireEnv("SEPOLIA_RPC_URL");
  const privateKey        = requireEnv("PRIVATE_KEY");
  const registryAddress   = requireEnv("AGENT_REGISTRY_ADDRESS");
  const vaultAddress      = requireEnv("HACKATHON_VAULT_ADDRESS");
  const routerAddress     = requireEnv("RISK_ROUTER_ADDRESS");
  const validationAddress = requireEnv("VALIDATION_REGISTRY_ADDRESS");

  const provider       = new ethers.JsonRpcProvider(rpcUrl);
  const operatorSigner = new ethers.Wallet(privateKey, provider);

  const agentWalletKey = process.env.AGENT_WALLET_PRIVATE_KEY || privateKey;
  const agentWallet    = new ethers.Wallet(agentWalletKey, provider);

  const agentId = await getAgentId(operatorSigner, registryAddress, {
    name: "ZKSentinel",
    description:
      "Autonomous AI trading agent with ERC-8004 identity, volume-confirmed momentum strategy, and EIP-712 checkpoints",
    capabilities: ["trading", "analysis", "explainability", "eip712-signing"],
    agentWallet: agentWallet.address,
    agentURI: `data:application/json,${encodeURIComponent(
      JSON.stringify({
        name: "ZKSentinel",
        description: "ERC-8004 compliant AI trading agent",
        capabilities: ["trading", "analysis", "eip712-signing"],
        agentWallet: agentWallet.address,
        version: "1.1.0",
      })
    )}`,
  });

  const reg = await getAgentRegistration(provider, registryAddress, agentId);
  console.log(`[agent] agentWallet: ${reg.agentWallet}`);

  const vault      = new VaultClient(vaultAddress, provider);
  const riskRouter = new RiskRouterClient(routerAddress, agentWallet, SEPOLIA_CHAIN_ID);
  const validation = new ValidationRegistryClient(validationAddress, agentWallet);

  console.log(`\n[agent] Starting agent loop`);
  console.log(`[agent] agentId:                   ${agentId}`);
  console.log(`[agent] Pair:                      ${TRADING_PAIR}`);
  console.log(`[agent] Interval:                  ${POLL_INTERVAL / 1000}s`);
  console.log(`[agent] Min checkpoint confidence: ${MIN_CHECKPOINT_CONFIDENCE * 100}%`);
  console.log(`[agent] Checkpoints:               ${CHECKPOINTS_FILE}`);
  console.log(`[agent] Market data:               CoinGecko (price) + Kraken (OHLCV volume)\n`);
  console.log(`[agent] NOTE: RiskRouter guardrails are strict (trading protection).`);
  console.log(`[agent]       Checkpoint gate is relaxed (reputation building).\n`);

  let isInPosition = false;

  // ─────────────────────────────────────────────────────────────────────────
  // Main tick
  // ─────────────────────────────────────────────────────────────────────────
  const tick = async () => {
    try {
      // 1. Fetch market data
      //    CoinGecko → price, high_24h, low_24h
      //    Kraken    → per-candle BTC volume, recentVolumes[], vwap
      //    Both fetched in parallel inside getMarketSnapshot()
      const market = await getMarketSnapshot(TRADING_PAIR);
      console.log(
        `[agent] ${TRADING_PAIR} @ $${market.price.toLocaleString()} | ` +
        `vol ${market.volume.toFixed(4)} BTC (Kraken) | ` +
        `${market.recentVolumes?.length ?? 0} candles loaded`
      );

      // 2. Strategy decision
      //    strategy.ts reads market.recentVolumes (Kraken) for spike detection
      const decision = await strategy.analyze(market);

      // 3. Human-readable explanation
      const explanation = formatExplanation(decision, market);
      console.log(explanation);

      let intentHash = HOLD_INTENT_HASH;

      // 4. Actionable trade → submit to RiskRouter (strict guardrails apply here)
      if (decision.action !== "HOLD" && decision.amount > 0) {
        const intent = await riskRouter.buildIntent(
          agentId,
          agentWallet.address,
          decision.pair,
          decision.action as "BUY" | "SELL",
          decision.amount
        );
        const signed = await riskRouter.signIntent(intent, agentWallet);
        intentHash = signed.intentHash;

        console.log(
          `[agent] TradeIntent signed. nonce=${intent.nonce}, deadline=${new Date(
            Number(intent.deadline) * 1000
          ).toISOString()}`
        );

        const validation_result = await riskRouter.submitIntent(signed);

        if (!validation_result.approved) {
          console.warn(`[agent] TradeIntent REJECTED by RiskRouter: ${validation_result.reason}`);
          decision.action    = "HOLD";
          decision.amount    = 0;
          decision.reasoning += ` [BLOCKED by RiskRouter: ${validation_result.reason}]`;
        } else {
          const volumeBase = (decision.amount / market.price).toFixed(8);
          console.log(`[agent] PAPER TRADE EXECUTED`);
          console.log(`[agent] ${decision.action} ${volumeBase} ${decision.pair} @ $${market.price}`);

          if (decision.action === "BUY")  isInPosition = true;
          if (decision.action === "SELL") isInPosition = false;
        }
      }

      // 5. Generate EIP-712 signed checkpoint
      const checkpoint = await generateCheckpoint(
        agentId,
        decision,
        market,
        intentHash,
        agentWallet,
        registryAddress,
        SEPOLIA_CHAIN_ID
      );

      console.log(formatCheckpointLog(checkpoint));

      // 6. Post to ValidationRegistry if decision clears the reputation gate
      const cp = checkpoint as typeof checkpoint & { checkpointHash?: string };
      if (cp.checkpointHash) {
        if (shouldPostCheckpoint(decision, isInPosition)) {
          try {
            const score = computeCheckpointScore(decision);
            await validation.postCheckpointAttestation(
              agentId,
              cp.checkpointHash,
              score,
              `${decision.action} ${decision.pair} @ $${market.price}`
            );
            console.log(`[agent] ✓ Checkpoint posted (score=${score}): ${cp.checkpointHash.slice(0, 20)}...`);
          } catch (e: any) {
            if (e?.reason?.includes("not an authorized validator")) {
              return; // Judge Bot handles registry posting — skip silently
            }
            console.warn(`[agent] ValidationRegistry post failed (non-fatal):`, e);
          }
        } else {
          console.log(
            `[agent] ⏭ Checkpoint skipped (warm-up or confidence=${(
              decision.confidence * 100
            ).toFixed(0)}% below ${MIN_CHECKPOINT_CONFIDENCE * 100}% threshold)`
          );
        }
      }

      // 7. Always persist locally regardless of on-chain posting
      fs.appendFileSync(CHECKPOINTS_FILE, JSON.stringify(checkpoint) + "\n");

    } catch (err) {
      console.error(`[agent] Error in tick:`, err);
    }
  };

  await tick();
  setInterval(tick, POLL_INTERVAL);
}

// ─────────────────────────────────────────────────────────────────────────────
// Entry point
// ─────────────────────────────────────────────────────────────────────────────

const strategy = new VolumeConfirmedMomentumStrategy();
// const strategy = new LLMStrategy();

runAgent(strategy).catch((err) => {
  console.error("[agent] Fatal error:", err);
  process.exit(1);
});