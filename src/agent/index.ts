

// import * as dotenv from "dotenv";
// dotenv.config();

// import { ethers } from "ethers";
// import * as fs from "fs";
// import * as path from "path";

// import { TradingStrategy, TradeDecision } from "../types/index";
// import { getAgentId, getAgentRegistration } from "./identity";
// import { VolumeConfirmedMomentumStrategy, } from "./strategy";
// import {getMarketSnapshot} from "../data/marketdata";
// import { VaultClient } from "../onchain/vault";
// import { RiskRouterClient } from "../onchain/riskRouter";
// import { ValidationRegistryClient } from "../onchain/validationRegistry";
// import { formatExplanation, formatCheckpointLog } from "../explainability/reasoner";
// import { generateCheckpoint } from "../explainability/checkpoint";

// // ─────────────────────────────────────────────────────────────────────────────
// // Config
// // ─────────────────────────────────────────────────────────────────────────────

// const SEPOLIA_CHAIN_ID = 11155111;
// const TRADING_PAIR    = process.env.TRADING_PAIR || "BTCUSD";
// const POLL_INTERVAL   = parseInt(process.env.POLL_INTERVAL_MS || "30000");
// const CHECKPOINTS_FILE = path.join(process.cwd(), "checkpoints.jsonl");
// const HOLD_INTENT_HASH = ethers.ZeroHash; // used for HOLD decisions (no intent submitted)

// function requireEnv(key: string): string {
//   const val = process.env[key];
//   if (!val) throw new Error(`Missing required env var: ${key}`);
//   return val;
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // Agent runner
// // ─────────────────────────────────────────────────────────────────────────────

// export async function runAgent(strategy: TradingStrategy) {
//   const rpcUrl           = requireEnv("SEPOLIA_RPC_URL");
//   const privateKey       = requireEnv("PRIVATE_KEY");
//   const registryAddress  = requireEnv("AGENT_REGISTRY_ADDRESS");
//   const vaultAddress     = requireEnv("HACKATHON_VAULT_ADDRESS");
//   const routerAddress    = requireEnv("RISK_ROUTER_ADDRESS");
//   const validationAddress = requireEnv("VALIDATION_REGISTRY_ADDRESS");

//   const provider = new ethers.JsonRpcProvider(rpcUrl);

//   // operatorWallet: owns the ERC-721 token
//   const operatorSigner = new ethers.Wallet(privateKey, provider);

//   // agentWallet: hot wallet for signing TradeIntents + checkpoints
//   // If AGENT_WALLET_PRIVATE_KEY is set, use a separate hot wallet; else reuse operator
//   const agentWalletKey = process.env.AGENT_WALLET_PRIVATE_KEY || privateKey;
//   const agentWallet = new ethers.Wallet(agentWalletKey, provider);

//   // Resolve agent identity (registers ERC-721 on first run)
//   const agentId = await getAgentId(operatorSigner, registryAddress, {
//     name: "HackathonTradingAgent",
//     description: "Autonomous AI trading agent with ERC-8004 identity, Kraken CLI execution, and EIP-712 checkpoints",
//     capabilities: ["trading", "analysis", "explainability", "eip712-signing"],
//     agentWallet: agentWallet.address,
//     agentURI: `data:application/json,${encodeURIComponent(JSON.stringify({
//       name: "HackathonTradingAgent",
//       description: "ERC-8004 compliant AI trading agent",
//       capabilities: ["trading", "analysis", "eip712-signing"],
//       agentWallet: agentWallet.address,
//       version: "1.0.0",
//     }))}`,
//   });

//   // Fetch registration to confirm agentWallet
//   const reg = await getAgentRegistration(provider, registryAddress, agentId);
//   console.log(`[agent] agentWallet: ${reg.agentWallet}`);

//   // Init clients
  
//   const vault      = new VaultClient(vaultAddress, provider);
//   const riskRouter = new RiskRouterClient(routerAddress, agentWallet, SEPOLIA_CHAIN_ID);
//   const validation = new ValidationRegistryClient(validationAddress, agentWallet);

//   console.log(`\n[agent] Starting agent loop`);
//   console.log(`[agent] agentId:  ${agentId}`);
//   console.log(`[agent] Pair:     ${TRADING_PAIR}`);
//   console.log(`[agent] Interval: ${POLL_INTERVAL / 1000}s`);
//   console.log(`[agent] Checkpoints: ${CHECKPOINTS_FILE}\n`);

//   // ─────────────────────────────────────────────────────────────────────────
//   // Main tick
//   // ─────────────────────────────────────────────────────────────────────────
//   const tick = async () => {
//     try {
//       // 1. Fetch market data via CoinGecko API
//       const market = await getMarketSnapshot(TRADING_PAIR);
//       console.log(`[agent] ${TRADING_PAIR} @ $${market.price.toLocaleString()}`);

//       // 2. Strategy decision
//       const decision = await strategy.analyze(market);

//       // 3. Human-readable explanation
//       const explanation = formatExplanation(decision, market);
//       console.log(explanation);

//       let intentHash = HOLD_INTENT_HASH; 
    

//       // 4. Actionable trade: submit signed TradeIntent to RiskRouter
//       if (decision.action !== "HOLD" && decision.amount > 0) {

//         // 4a. Build + sign the TradeIntent (EIP-712)
//         const intent = await riskRouter.buildIntent(
//           agentId,
//           agentWallet.address,
//           decision.pair,
//           decision.action as "BUY" | "SELL",
//           decision.amount
//         );
//         const signed = await riskRouter.signIntent(intent, agentWallet);
//         intentHash = signed.intentHash;

//         console.log(`[agent] TradeIntent signed. nonce=${intent.nonce}, deadline=${new Date(Number(intent.deadline) * 1000).toISOString()}`);

//         // 4b. Submit to RiskRouter — on-chain validation
//         const validation_result = await riskRouter.submitIntent(signed);

//         if (!validation_result.approved) {
//           console.warn(`[agent] TradeIntent REJECTED by RiskRouter: ${validation_result.reason}`);
//           // Don't execute — fall through to checkpoint (HOLD behaviour)
//           decision.action = "HOLD";
//           decision.amount = 0;
//           decision.reasoning += ` [BLOCKED by RiskRouter: ${validation_result.reason}]`;
//         } else {
//           // 4c. Execute via Kraken CLI
//           const volumeBase = (decision.amount / market.price).toFixed(8);

//           console.log(`[agent] PAPER TRADE EXECUTED`);
//           console.log(`[agent] ${decision.action} ${volumeBase} ${decision.pair} @ $${market.price}`);
//         }
//       }

//       // 5. Generate EIP-712 signed checkpoint
//       const checkpoint = await generateCheckpoint(
//         agentId,
//         decision,
//         market,
//         intentHash,
//         agentWallet,
//         registryAddress,
//         SEPOLIA_CHAIN_ID
//       );

//       console.log(formatCheckpointLog(checkpoint));

//       // 6. Post checkpoint hash to ValidationRegistry
//       const cp = checkpoint as typeof checkpoint & { checkpointHash?: string };
//       if (cp.checkpointHash) {
//         try {
//           const score = computeCheckpointScore(decision);
//           await validation.postCheckpointAttestation(
//             agentId,
//             cp.checkpointHash,
//             score,
//             `${decision.action} ${decision.pair} @ $${market.price}`
//           );
//           console.log(`[agent] Checkpoint posted to ValidationRegistry: ${cp.checkpointHash.slice(0, 20)}...`);
//         } catch (e) {
//           console.warn(`[agent] ValidationRegistry post failed (non-fatal):`, e);
//         }
//       }

//       // 7. Persist to checkpoints.jsonl
//       fs.appendFileSync(CHECKPOINTS_FILE, JSON.stringify(checkpoint) + "\n");

//     } catch (err) {
//       console.error(`[agent] Error in tick:`, err);
//     }
//   };

//   await tick();
//   setInterval(tick, POLL_INTERVAL);
// }

// function computeCheckpointScore(decision: TradeDecision): number {
//   const baseScore = Math.round(decision.confidence * 100);

//   if (decision.action === "HOLD") {
//     if (decision.reasoning.startsWith("Warming up")) {
//       return 80;
//     }
//     if (decision.reasoning.includes("BLOCKED by RiskRouter")) {
//       return 90;
//     }
//     return Math.min(95, Math.max(60, baseScore));
//   }

//   return Math.min(100, Math.max(0, baseScore));
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // Entry point — your strategy goes here
// // ─────────────────────────────────────────────────────────────────────────────



// // ── PICK ONE ────────────────────────────────────────────────────────────────
// const strategy = new VolumeConfirmedMomentumStrategy();      // ← your rule-based strategy (recommended for first test)
// // const strategy = new LLMStrategy();                      // ← Groq AI version
// // ────────────────────────────────────────────────────────────────────────────

// runAgent(strategy).catch((err) => {
//   console.error("[agent] Fatal error:", err);
//   process.exit(1);
// });
import * as dotenv from "dotenv";
dotenv.config();

import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";

import { TradingStrategy, TradeDecision } from "../types/index";
import { getAgentId, getAgentRegistration } from "./identity";
import { VolumeConfirmedMomentumStrategy, } from "./strategy";
import {getMarketSnapshot} from "../data/marketdata";
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

// FIX #1: Default poll interval raised to 10 minutes (600000ms) to match
// candle frequency and prevent burning faucet gas on redundant ticks.
// Override via POLL_INTERVAL_MS in .env if needed.
const POLL_INTERVAL   = parseInt(process.env.POLL_INTERVAL_MS || "600000");

const CHECKPOINTS_FILE = path.join(process.cwd(), "checkpoints.jsonl");
const HOLD_INTENT_HASH = ethers.ZeroHash;

// FIX #2: Minimum confidence threshold for posting a HOLD checkpoint on-chain.
// BUY/SELL decisions always get posted regardless of confidence.
// Tune via MIN_CHECKPOINT_CONFIDENCE in .env (default: 0.70).
const MIN_CHECKPOINT_CONFIDENCE = parseFloat(
  process.env.MIN_CHECKPOINT_CONFIDENCE || "0.70"
);

function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

// ─────────────────────────────────────────────────────────────────────────────
// FIX #3: Honest checkpoint scoring — warm-up HOLDs no longer self-report 80.
// Scoring is now:
//   - Warm-up HOLD       → 0   (no useful signal)
//   - BUY / SELL         → confidence * 100 (capped 0–100)
//   - Meaningful HOLD    → confidence * 100 (capped 60–95)
//   - RiskRouter BLOCKED → 90  (agent correctly deferred to risk system)
// ─────────────────────────────────────────────────────────────────────────────
function computeCheckpointScore(decision: TradeDecision): number {
  if (decision.reasoning.startsWith("Warming up")) {
    return 0; // was incorrectly returning 80 — warm-up carries no signal value
  }

  if (decision.reasoning.includes("BLOCKED by RiskRouter")) {
    return 90; // agent deferred correctly, high trust signal
  }

  const baseScore = Math.round(decision.confidence * 100);

  if (decision.action === "BUY" || decision.action === "SELL") {
    return Math.min(100, Math.max(0, baseScore));
  }

  // Meaningful HOLD (in-position or high-confidence wait)
  return Math.min(95, Math.max(60, baseScore));
}

// ─────────────────────────────────────────────────────────────────────────────
// FIX #4: Gate logic — decides whether a decision is worth posting on-chain.
// Rules:
//   1. Always post BUY or SELL (actionable signals)
//   2. Post HOLD only if confidence >= MIN_CHECKPOINT_CONFIDENCE
//   3. Never post warm-up HOLDs (0% confidence, no information value)
//   4. Always post if currently in a position (to keep on-chain state fresh)
// ─────────────────────────────────────────────────────────────────────────────
function shouldPostCheckpoint(decision: TradeDecision, isInPosition: boolean): boolean {
  // Always post trade actions
  if (decision.action === "BUY" || decision.action === "SELL") return true;

  // Never post warm-up noise
  if (decision.reasoning.startsWith("Warming up")) return false;

  // Always post while in a position (holding update)
  if (isInPosition) return true;

  // Post HOLD only if confidence is meaningful
  return decision.confidence >= MIN_CHECKPOINT_CONFIDENCE;
}

// ─────────────────────────────────────────────────────────────────────────────
// Agent runner
// ─────────────────────────────────────────────────────────────────────────────

export async function runAgent(strategy: TradingStrategy) {
  const rpcUrl           = requireEnv("SEPOLIA_RPC_URL");
  const privateKey       = requireEnv("PRIVATE_KEY");
  const registryAddress  = requireEnv("AGENT_REGISTRY_ADDRESS");
  const vaultAddress     = requireEnv("HACKATHON_VAULT_ADDRESS");
  const routerAddress    = requireEnv("RISK_ROUTER_ADDRESS");
  const validationAddress = requireEnv("VALIDATION_REGISTRY_ADDRESS");

  const provider = new ethers.JsonRpcProvider(rpcUrl);

  const operatorSigner = new ethers.Wallet(privateKey, provider);

  const agentWalletKey = process.env.AGENT_WALLET_PRIVATE_KEY || privateKey;
  const agentWallet = new ethers.Wallet(agentWalletKey, provider);

  const agentId = await getAgentId(operatorSigner, registryAddress, {
    name: "ZKSentinel",
    description: "Autonomous AI trading agent with ERC-8004 identity, volume-confirmed momentum strategy, and EIP-712 checkpoints",
    capabilities: ["trading", "analysis", "explainability", "eip712-signing"],
    agentWallet: agentWallet.address,
    agentURI: `data:application/json,${encodeURIComponent(JSON.stringify({
      name: "ZKSentinel",
      description: "ERC-8004 compliant AI trading agent",
      capabilities: ["trading", "analysis", "eip712-signing"],
      agentWallet: agentWallet.address,
      version: "1.1.0",
    }))}`,
  });

  const reg = await getAgentRegistration(provider, registryAddress, agentId);
  console.log(`[agent] agentWallet: ${reg.agentWallet}`);

  const vault      = new VaultClient(vaultAddress, provider);
  const riskRouter = new RiskRouterClient(routerAddress, agentWallet, SEPOLIA_CHAIN_ID);
  const validation = new ValidationRegistryClient(validationAddress, agentWallet);

  console.log(`\n[agent] Starting agent loop`);
  console.log(`[agent] agentId:         ${agentId}`);
  console.log(`[agent] Pair:            ${TRADING_PAIR}`);
  console.log(`[agent] Interval:        ${POLL_INTERVAL / 1000}s (${POLL_INTERVAL / 60000} min)`);
  console.log(`[agent] Min checkpoint confidence: ${MIN_CHECKPOINT_CONFIDENCE * 100}%`);
  console.log(`[agent] Checkpoints:     ${CHECKPOINTS_FILE}\n`);

  // Track position state locally so the gate knows when we're in a trade
  let isInPosition = false;

  // ─────────────────────────────────────────────────────────────────────────
  // Main tick
  // ─────────────────────────────────────────────────────────────────────────
  const tick = async () => {
    try {
      // 1. Fetch market data
      const market = await getMarketSnapshot(TRADING_PAIR);
      console.log(`[agent] ${TRADING_PAIR} @ $${market.price.toLocaleString()}`);

      // 2. Strategy decision
      const decision = await strategy.analyze(market);

      // 3. Human-readable explanation
      const explanation = formatExplanation(decision, market);
      console.log(explanation);

      let intentHash = HOLD_INTENT_HASH;

      // 4. Actionable trade: submit signed TradeIntent to RiskRouter
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

        console.log(`[agent] TradeIntent signed. nonce=${intent.nonce}, deadline=${new Date(Number(intent.deadline) * 1000).toISOString()}`);

        const validation_result = await riskRouter.submitIntent(signed);

        if (!validation_result.approved) {
          console.warn(`[agent] TradeIntent REJECTED by RiskRouter: ${validation_result.reason}`);
          decision.action = "HOLD";
          decision.amount = 0;
          decision.reasoning += ` [BLOCKED by RiskRouter: ${validation_result.reason}]`;
        } else {
          const volumeBase = (decision.amount / market.price).toFixed(8);
          console.log(`[agent] PAPER TRADE EXECUTED`);
          console.log(`[agent] ${decision.action} ${volumeBase} ${decision.pair} @ $${market.price}`);

          // Update local position tracking
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

      // 6. FIX: Only post to ValidationRegistry if decision clears the gate
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
          } catch (e) {
            console.warn(`[agent] ValidationRegistry post failed (non-fatal):`, e);
          }
        } else {
          // Still persist locally — just don't burn gas on it
          console.log(`[agent] ⏭ Checkpoint skipped (${decision.action} confidence=${(decision.confidence * 100).toFixed(0)}% below threshold or warm-up)`);
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

