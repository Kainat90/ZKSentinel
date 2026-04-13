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
const TRADING_PAIR     = process.env.TRADING_PAIR || "BTCUSD";
const POLL_INTERVAL    = parseInt(process.env.POLL_INTERVAL_MS || "60000");

const CHECKPOINTS_FILE  = path.join(process.cwd(), "checkpoints.jsonl");
const STATS_FILE        = path.join(process.cwd(), "trade_stats.json");
const HOLD_INTENT_HASH  = ethers.ZeroHash;

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
// Gate logic
// ─────────────────────────────────────────────────────────────────────────────
function shouldPostCheckpoint(
  decision: TradeDecision,
  isInPosition: boolean
): boolean {
  if (decision.action === "BUY" || decision.action === "SELL") return true;
  if (decision.reasoning.includes("BLOCKED by RiskRouter")) return true;
  if (decision.reasoning.startsWith("Warming up")) return false;
  if (isInPosition) return true;
  return decision.confidence >= MIN_CHECKPOINT_CONFIDENCE;
}

// ─────────────────────────────────────────────────────────────────────────────
// Persist trade stats to disk so dashboard can read them
// ─────────────────────────────────────────────────────────────────────────────
function persistStats(stats: ReturnType<VolumeConfirmedMomentumStrategy["getStats"]>): void {
  try {
    fs.writeFileSync(STATS_FILE, JSON.stringify({
      ...stats,
      // Friendly formatted fields for dashboard display
      winRatePct:    parseFloat((stats.winRate * 100).toFixed(1)),
      totalPnlUsd:   parseFloat(stats.totalPnlUsd.toFixed(2)),
      avgRoiPct:     parseFloat(stats.avgRoiPct.toFixed(3)),
      updatedAt:     new Date().toISOString(),
    }, null, 2));
  } catch (err) {
    console.warn("[agent] Failed to persist trade stats:", err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Log a SELL decision's PnL prominently so it shows up in dashboard logs
// ─────────────────────────────────────────────────────────────────────────────
function logTradeOutcome(decision: TradeDecision & Record<string, unknown>): void {
  if (decision.action !== "SELL") return;
  const pnl    = decision["pnl"]    as number | undefined;
  const roi    = decision["roiPct"] as number | undefined;
  const isWin  = decision["isWin"]  as boolean | undefined;
  const entry  = decision["entryPrice"] as number | undefined;
  const exit   = decision["exitPrice"]  as number | undefined;

  console.log("─".repeat(60));
  console.log(`[TRADE CLOSED] ${isWin ? "✅ WIN" : "❌ LOSS"}`);
  console.log(`  Pair:       ${decision.pair}`);
  console.log(`  Entry:      $${entry?.toFixed(2) ?? "N/A"}`);
  console.log(`  Exit:       $${exit?.toFixed(2) ?? "N/A"}`);
  console.log(`  ROI:        ${roi?.toFixed(3) ?? "N/A"}%`);
  console.log(`  PnL:        $${pnl?.toFixed(2) ?? "N/A"}`);
  console.log("─".repeat(60));
}

// ─────────────────────────────────────────────────────────────────────────────
// Agent runner
// ─────────────────────────────────────────────────────────────────────────────
export async function runAgent(strategy: VolumeConfirmedMomentumStrategy) {
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
    name: "KSentinel",
    description:
      "Autonomous AI trading agent with ERC-8004 identity, volume-confirmed momentum strategy, and EIP-712 checkpoints",
    capabilities: ["trading", "analysis", "explainability", "eip712-signing"],
    agentWallet: agentWallet.address,
    agentURI: `data:application/json,${encodeURIComponent(
      JSON.stringify({
        name: "KSentinel",
        description: "ERC-8004 compliant AI trading agent",
        capabilities: ["trading", "analysis", "eip712-signing"],
        agentWallet: agentWallet.address,
        version: "2.0.0",
      })
    )}`,
  });

  const reg = await getAgentRegistration(provider, registryAddress, agentId);
  console.log(`[agent] agentWallet: ${reg.agentWallet}`);

  const vault      = new VaultClient(vaultAddress, provider);
  const riskRouter = new RiskRouterClient(routerAddress, agentWallet, SEPOLIA_CHAIN_ID);
  const validation = new ValidationRegistryClient(validationAddress, agentWallet);

  console.log(`\n[agent] Starting KSentinel agent loop`);
  console.log(`[agent] agentId:                   ${agentId}`);
  console.log(`[agent] Pair:                       ${TRADING_PAIR}`);
  console.log(`[agent] Interval:                   ${POLL_INTERVAL / 1000}s`);
  console.log(`[agent] Min checkpoint confidence:  ${MIN_CHECKPOINT_CONFIDENCE * 100}%`);
  console.log(`[agent] Checkpoints:                ${CHECKPOINTS_FILE}`);
  console.log(`[agent] Trade stats:                ${STATS_FILE}`);
  console.log(`[agent] Market data:                CoinGecko (price) + Kraken (OHLCV)\n`);

  // isInPosition is now derived from strategy's internal state via the SELL signal
  // to keep them in sync — we update it only when a BUY or SELL executes on-chain
  let isInPosition = false;

  // ─────────────────────────────────────────────────────────────────────────
  // Main tick
  // ─────────────────────────────────────────────────────────────────────────
  const tick = async () => {
    try {
      // 1. Market data
      const market = await getMarketSnapshot(TRADING_PAIR);
      console.log(
        `[agent] ${TRADING_PAIR} @ $${market.price.toLocaleString()} | ` +
        `vol ${market.volume.toFixed(4)} BTC | ` +
        `${market.recentVolumes?.length ?? 0} candles | ` +
        `CB: ${strategy.isCircuitBreakerTripped() ? "🔴 TRIPPED" : "🟢 OK"}`
      );

      // 2. Strategy decision
      const decision = await strategy.analyze(market) as TradeDecision & Record<string, unknown>;

      // 3. Log trade close with PnL if this is a SELL
      logTradeOutcome(decision);

      // 4. Always persist current stats (so dashboard always has fresh numbers)
      const currentStats = strategy.getStats();
      persistStats(currentStats);
      console.log(
        `[agent] Stats → trades=${currentStats.totalTrades} | ` +
        `wins=${currentStats.wins} | ` +
        `winRate=${(currentStats.winRate * 100).toFixed(1)}% | ` +
        `totalPnL=$${currentStats.totalPnlUsd.toFixed(2)} | ` +
        `avgROI=${currentStats.avgRoiPct.toFixed(3)}%`
      );

      // 5. Human-readable explanation
      const explanation = formatExplanation(decision, market);
      console.log(explanation);

      let intentHash = HOLD_INTENT_HASH;

      // 6. Actionable trade → RiskRouter
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
          console.log(`[agent] ✅ PAPER TRADE EXECUTED`);
          console.log(`[agent] ${decision.action} ${volumeBase} ${decision.pair} @ $${market.price}`);

          // Keep isInPosition in sync with confirmed executions
          if (decision.action === "BUY")  isInPosition = true;
          if (decision.action === "SELL") isInPosition = false;
        }
      }

      // 7. EIP-712 checkpoint
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

      // 8. Post to ValidationRegistry
      const cp = checkpoint as typeof checkpoint & { checkpointHash?: string };
      if (cp.checkpointHash) {
        if (shouldPostCheckpoint(decision, isInPosition)) {
          try {
            const score = computeCheckpointScore(decision);

            // Attach PnL metadata to the attestation label when closing a trade
            const pnlTag = decision.action === "SELL" && decision["pnl"] != null
              ? ` | PnL=$${(decision["pnl"] as number).toFixed(2)} ROI=${(decision["roiPct"] as number).toFixed(3)}%`
              : "";

            await validation.postCheckpointAttestation(
              agentId,
              cp.checkpointHash,
              score,
              `${decision.action} ${decision.pair} @ $${market.price}${pnlTag}`
            );
            console.log(`[agent] ✓ Checkpoint posted (score=${score}): ${cp.checkpointHash.slice(0, 20)}...`);
          } catch (e: any) {
            if (e?.reason?.includes("not an authorized validator")) {
              return;
            }
            console.warn(`[agent] ValidationRegistry post failed (non-fatal):`, e);
          }
        } else {
          console.log(
            `[agent] ⏭ Checkpoint skipped (warm-up or confidence=${(
              decision.confidence * 100
            ).toFixed(0)}% below ${MIN_CHECKPOINT_CONFIDENCE * 100}%)`
          );
        }
      }

      // 9. Always persist checkpoint locally
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

runAgent(strategy).catch((err) => {
  console.error("[agent] Fatal error:", err);
  process.exit(1);
});