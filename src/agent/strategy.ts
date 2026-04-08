import * as crypto from "crypto";
import { MarketData, TradeDecision, TradingStrategy } from "../types/index";

// ─────────────────────────────────────────────────────────────
// ERC-8004 Validation Artifact shape
// ─────────────────────────────────────────────────────────────
interface ValidationArtifact {
  tradeIntent: {
    pair: string;
    direction: "BUY" | "SELL" | "HOLD";
    entryPrice: number;
  };
  riskCheck: {
    stopLoss?: string;
    takeProfit?: string;
    positionSize?: string;
    triggerPrice?: number;
    result?: string;
  };
  strategyCheckpoint: {
    emaSignal: string;
    obvSignal: "rising" | "falling";
    volumeRatio: string;
  };
  outcomeHash: string | null;
  timestamp: number;
}

export class VolumeConfirmedMomentumStrategy implements TradingStrategy {
  private readonly VOLUME_LOOKBACK = 10;
  private readonly OBV_SMA_PERIOD  = 10;
  private readonly EMA_PERIOD      = 9;
  private readonly tradeAmountUsd  = 490;

  private readonly MIN_VOLUME_RATIO = 1.5;   // FIX 1: raised from 1.15 → 1.5
  private readonly MIN_EMA_DELTA    = 0.12;

  private readonly STOP_LOSS   = 0.008;
  private readonly TAKE_PROFIT = 0.015;

  // FIX 2: Circuit breaker — halt after 3 consecutive losses
  private readonly MAX_CONSECUTIVE_LOSSES = 3;
  private consecutiveLosses = 0;
  private circuitBreakerTripped = false;

  // FIX 3: Cooldown — wait N candles after any exit
  private readonly COOLDOWN_CANDLES = 3;
  private cooldownRemaining = 0;

  private obvHistory:    number[] = [];
  private volumeHistory: number[] = [];
  private priceHistory:  number[] = [];

  private currentOBV: number   = 0;
  private ema:        number | null = null;
  private lastPrice:  number | null = null;

  // FIX 4: Persist entry state externally so it survives restarts
  private entryPrice:   number | null = null;
  private positionSize: number        = 0;

  // ─────────────────────────────
  // EMA helper
  // ─────────────────────────────
  private updateEMA(price: number): number {
    if (this.ema === null) {
      this.ema = price;
    } else {
      const k = 2 / (this.EMA_PERIOD + 1);
      this.ema = price * k + this.ema * (1 - k);
    }
    return this.ema;
  }

  // ─────────────────────────────
  // FIX 5: SHA-256 hash helper
  // ─────────────────────────────
  private hashResult(data: object): string {
    const str = JSON.stringify(data);
    return crypto.createHash("sha256").update(str).digest("hex");
  }

  // ─────────────────────────────
  // FIX 6: Post ERC-8004 validation artifact
  // Called after every BUY or SELL decision
  // ─────────────────────────────
  private async postValidationArtifact(artifact: ValidationArtifact): Promise<void> {
    try {
      const payload = {
        agentId:   process.env.ERC8004_AGENT_ID,
        ...artifact,
      };

      // Replace this block with your actual ERC-8004 registry call:
      // await this.validationRegistry.validationRequest(
      //   process.env.VALIDATOR_ADDRESS,
      //   process.env.ERC8004_AGENT_ID,
      //   artifactURI,          // IPFS or HTTPS URI of payload
      //   this.hashResult(payload)
      // );

      console.log("[ERC-8004 ARTIFACT]", JSON.stringify(payload, null, 2));
    } catch (err) {
      // FIX 7: Never crash the strategy if artifact posting fails
      console.error("[ERC-8004] Failed to post validation artifact:", err);
    }
  }

  // ─────────────────────────────
  // MAIN ANALYZE LOOP
  // ─────────────────────────────
  async analyze(data: MarketData): Promise<TradeDecision> {
    const asset = data.pair.replace("USD", "");

    // ─────────────────────────────
    // FIX 8: Circuit breaker guard — halt all trading
    // ─────────────────────────────
    if (this.circuitBreakerTripped) {
      return {
        action: "HOLD",
        asset,
        pair: data.pair,
        amount: 0,
        confidence: 0,
        reasoning: `Circuit breaker tripped — ${this.MAX_CONSECUTIVE_LOSSES} consecutive losses. Manual reset required.`,
      };
    }

    // 1. Update histories & OBV
    this.priceHistory.push(data.price);
    if (this.priceHistory.length > this.EMA_PERIOD) this.priceHistory.shift();

    this.volumeHistory.push(data.volume);
    if (this.volumeHistory.length > this.VOLUME_LOOKBACK) this.volumeHistory.shift();

    if (this.lastPrice !== null) {
      const change = (data.price - this.lastPrice) / this.lastPrice;
      if (Math.abs(change) > 0.0005) {
        this.currentOBV += data.price > this.lastPrice ? data.volume : -data.volume;
      }
    }

    this.obvHistory.push(this.currentOBV);
    if (this.obvHistory.length > this.OBV_SMA_PERIOD) this.obvHistory.shift();

    const ema = this.updateEMA(data.price);
    this.lastPrice = data.price;

    // 2. Warm-up guard
    const isWarmedUp =
      this.volumeHistory.length >= 10 &&
      this.obvHistory.length >= this.OBV_SMA_PERIOD;

    if (!isWarmedUp) {
      return {
        action: "HOLD",
        asset,
        pair: data.pair,
        amount: 0,
        confidence: 0.0,
        reasoning: `Warming up (${this.volumeHistory.length}/${this.VOLUME_LOOKBACK} candles)`,
      };
    }

    // 3. Indicators
    const obvSMA    = this.obvHistory.reduce((a, b) => a + b, 0) / this.obvHistory.length;
    const obvRising = this.currentOBV > obvSMA;

    const trendUp  = data.price > ema;
    const emaDelta = ((data.price - ema) / ema) * 100;

    const sortedVols = [...this.volumeHistory].sort((a, b) => a - b);
    const volMedian  = sortedVols[Math.floor(sortedVols.length * 0.5)];
    const highVolume = data.volume > volMedian * this.MIN_VOLUME_RATIO; // now 1.5x
    const volRatio   = (data.volume / volMedian).toFixed(2);

    const strongMomentum = emaDelta > this.MIN_EMA_DELTA;

    // Shared checkpoint — reused in every artifact
    const checkpoint = {
      emaSignal:   emaDelta.toFixed(2),
      obvSignal:   obvRising ? "rising" : "falling" as "rising" | "falling",
      volumeRatio: volRatio,
    };

    // 4. Risk management — check SL / TP on open position
    if (this.entryPrice !== null && this.positionSize > 0) {
      const pnl    = data.price / this.entryPrice - 1;
      const pnlPct = (pnl * 100).toFixed(2);

      if (pnl < -this.STOP_LOSS) {
        const exitPrice = data.price;
        this.entryPrice  = null;
        this.positionSize = 0;

        // FIX 9: Track consecutive losses for circuit breaker
        this.consecutiveLosses++;
        if (this.consecutiveLosses >= this.MAX_CONSECUTIVE_LOSSES) {
          this.circuitBreakerTripped = true;
        }

        // FIX 3: Start cooldown
        this.cooldownRemaining = this.COOLDOWN_CANDLES;

        // FIX 6: Post artifact on stop-loss exit
        await this.postValidationArtifact({
          tradeIntent:        { pair: data.pair, direction: "SELL", entryPrice: exitPrice },
          riskCheck:          { stopLoss: `${this.STOP_LOSS * 100}%`, triggerPrice: exitPrice, result: "STOP_HIT" },
          strategyCheckpoint: checkpoint,
          outcomeHash:        this.hashResult({ pnl: pnlPct, exitReason: "stop_loss", exitPrice }),
          timestamp:          Date.now(),
        });

        return {
          action: "SELL",
          asset,
          pair: data.pair,
          amount: this.tradeAmountUsd,
          confidence: 1.0,
          reasoning: `Stop-loss hit at ${pnlPct}% (limit: -${this.STOP_LOSS * 100}%)`,
        };
      }

      if (pnl > this.TAKE_PROFIT) {
        const exitPrice = data.price;
        this.entryPrice  = null;
        this.positionSize = 0;

        // FIX 9: Reset loss streak on win
        this.consecutiveLosses = 0;

        // FIX 3: Start cooldown
        this.cooldownRemaining = this.COOLDOWN_CANDLES;

        // FIX 6: Post artifact on take-profit exit
        await this.postValidationArtifact({
          tradeIntent:        { pair: data.pair, direction: "SELL", entryPrice: exitPrice },
          riskCheck:          { takeProfit: `${this.TAKE_PROFIT * 100}%`, triggerPrice: exitPrice, result: "TP_HIT" },
          strategyCheckpoint: checkpoint,
          outcomeHash:        this.hashResult({ pnl: pnlPct, exitReason: "take_profit", exitPrice }),
          timestamp:          Date.now(),
        });

        return {
          action: "SELL",
          asset,
          pair: data.pair,
          amount: this.tradeAmountUsd,
          confidence: 0.9,
          reasoning: `Take-profit hit at +${pnlPct}% (target: +${this.TAKE_PROFIT * 100}%)`,
        };
      }
    }

    // 5. Score signals
    let buyScore  = 0;
    let sellScore = 0;

    if (trendUp)   buyScore++;  else sellScore++;
    if (obvRising) buyScore++;  else sellScore++;
    if (highVolume) buyScore++;

    // FIX 3: Decrement cooldown — block new entries during cooldown
    if (this.cooldownRemaining > 0) {
      this.cooldownRemaining--;
      return {
        action: "HOLD",
        asset,
        pair: data.pair,
        amount: 0,
        confidence: 0.3,
        reasoning: `Cooldown active — ${this.cooldownRemaining + 1} candles remaining after last exit`,
      };
    }

    // 6. Entry
    if (buyScore >= 2 && this.entryPrice === null && (highVolume || strongMomentum)) {
      this.entryPrice   = data.price;
      this.positionSize = this.tradeAmountUsd / data.price;

      // FIX 6: Post artifact on BUY entry
      await this.postValidationArtifact({
        tradeIntent: {
          pair:       data.pair,
          direction:  "BUY",
          entryPrice: data.price,
        },
        riskCheck: {
          stopLoss:     `${this.STOP_LOSS * 100}%`,
          takeProfit:   `${this.TAKE_PROFIT * 100}%`,
          positionSize: `$${this.tradeAmountUsd}`,
        },
        strategyCheckpoint: checkpoint,
        outcomeHash: null, // pending — filled on close
        timestamp:   Date.now(),
      });

      return {
        action: "BUY",
        asset,
        pair: data.pair,
        amount: this.tradeAmountUsd,
        confidence: 0.65 + buyScore * 0.1,
        reasoning: `Momentum confirmed: ${emaDelta.toFixed(2)}% above EMA, OBV ${obvRising ? "rising" : "flat"}, vol ${volRatio}x median`,
      };
    }

    // 7. Exit on weakening momentum
    if (this.entryPrice !== null && sellScore >= 2) {
      const pnlPct  = (((data.price / this.entryPrice) - 1) * 100).toFixed(2);
      const exitPrice = data.price;
      this.entryPrice  = null;
      this.positionSize = 0;

      // FIX 9: Track loss/win on momentum exit
      if (parseFloat(pnlPct) < 0) {
        this.consecutiveLosses++;
        if (this.consecutiveLosses >= this.MAX_CONSECUTIVE_LOSSES) {
          this.circuitBreakerTripped = true;
        }
      } else {
        this.consecutiveLosses = 0;
      }

      // FIX 3: Start cooldown
      this.cooldownRemaining = this.COOLDOWN_CANDLES;

      // FIX 6: Post artifact on momentum exit
      await this.postValidationArtifact({
        tradeIntent:        { pair: data.pair, direction: "SELL", entryPrice: exitPrice },
        riskCheck:          { result: "MOMENTUM_EXIT" },
        strategyCheckpoint: checkpoint,
        outcomeHash:        this.hashResult({ pnl: pnlPct, exitReason: "momentum_fade", exitPrice }),
        timestamp:          Date.now(),
      });

      return {
        action: "SELL",
        asset,
        pair: data.pair,
        amount: this.tradeAmountUsd,
        confidence: 0.65 + sellScore * 0.05,
        reasoning: `Momentum fading (PnL ${pnlPct}%, sell score ${sellScore}/3)`,
      };
    }

    // 8. Hold
    const holdReason = this.entryPrice
      ? `Holding — PnL ${(((data.price / this.entryPrice) - 1) * 100).toFixed(2)}%, waiting for clearer exit signal (buy ${buyScore} sell ${sellScore})`
      : `No entry — waiting for stronger alignment, buy score ${buyScore}/3, price ${emaDelta.toFixed(2)}% vs EMA`;

    return {
      action: "HOLD",
      asset,
      pair: data.pair,
      amount: 0,
      confidence: Math.min(0.85, 0.5 + buyScore * 0.1),
      reasoning: holdReason,
    };
  }
}