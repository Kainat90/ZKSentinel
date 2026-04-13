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
  private readonly VOLUME_LOOKBACK      = 10;
  private readonly OBV_SMA_PERIOD       = 10;
  private readonly EMA_PERIOD           = 9;
  private readonly tradeAmountUsd       = 490;
  private readonly MAX_VOLATILITY_PCT   = 3.0;
  private readonly MIN_VOLUME_RATIO     = 1.5;
  private readonly MIN_EMA_DELTA        = 0.12;
  private readonly STOP_LOSS            = 0.008;
  private readonly TAKE_PROFIT          = 0.015;
  private readonly MAX_CONSECUTIVE_LOSSES = 3;
  private readonly COOLDOWN_CANDLES     = 3;

  private consecutiveLosses     = 0;
  private circuitBreakerTripped = false;
  private cooldownRemaining     = 0;

  private obvHistory:   number[] = [];
  private priceHistory: number[] = [];

  private currentOBV: number       = 0;
  private ema:        number | null = null;
  private lastPrice:  number | null = null;

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
  // SHA-256 hash helper
  // ─────────────────────────────
  private hashResult(data: object): string {
    return crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex");
  }

  // ─────────────────────────────
  // Post ERC-8004 validation artifact
  // ─────────────────────────────
  private async postValidationArtifact(artifact: ValidationArtifact): Promise<void> {
    try {
      const payload = { agentId: process.env.ERC8004_AGENT_ID, ...artifact };
      console.log("[ERC-8004 ARTIFACT]", JSON.stringify(payload, null, 2));
    } catch (err) {
      console.error("[ERC-8004] Failed to post validation artifact:", err);
    }
  }

  // ─────────────────────────────
  // MAIN ANALYZE LOOP
  // ─────────────────────────────
  async analyze(data: MarketData): Promise<TradeDecision> {
    const asset = data.pair.replace("USD", "");

    // ── Circuit breaker guard ────────────────────────────────
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

    // 1. Update price history + OBV
    this.priceHistory.push(data.price);
    if (this.priceHistory.length > this.EMA_PERIOD) this.priceHistory.shift();

    // ── KRAKEN VOLUME INTEGRATION ────────────────────────────
    // recentVolumes comes from Kraken OHLCV (last 20 candles, per-candle BTC volume).
    // This replaces the old internal volumeHistory built from CoinGecko's 24h dollar
    // volume, which was too coarse for per-candle spike detection.
    // marketdata.ts fetches and supplies this array on every tick.
    const krakenVolumes = data.recentVolumes && data.recentVolumes.length >= this.VOLUME_LOOKBACK
      ? data.recentVolumes.slice(-this.VOLUME_LOOKBACK)
      : null;

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

    // ── Volatility guard ─────────────────────────────────────
    if (this.priceHistory.length >= 2) {
      const recentHigh = Math.max(...this.priceHistory);
      const recentLow  = Math.min(...this.priceHistory);
      const swingPct   = ((recentHigh - recentLow) / recentLow) * 100;

      if (swingPct > this.MAX_VOLATILITY_PCT) {
        return {
          action: "HOLD",
          asset,
          pair: data.pair,
          amount: 0,
          confidence: 0.3,
          reasoning: `Volatility guard — ${swingPct.toFixed(2)}% swing exceeds ${this.MAX_VOLATILITY_PCT}% limit`,
        };
      }
    }

    // 2. Warm-up guard
    // Use Kraken volumes if available, otherwise fall back to OBV history length
    const isWarmedUp = krakenVolumes
      ? this.obvHistory.length >= this.OBV_SMA_PERIOD
      : this.obvHistory.length >= this.OBV_SMA_PERIOD && this.priceHistory.length >= this.VOLUME_LOOKBACK;

    if (!isWarmedUp) {
      return {
        action: "HOLD",
        asset,
        pair: data.pair,
        amount: 0,
        confidence: 0.0,
        reasoning: `Warming up (${this.obvHistory.length}/${this.OBV_SMA_PERIOD} candles)`,
      };
    }

    // 3. Indicators
    const obvSMA    = this.obvHistory.reduce((a, b) => a + b, 0) / this.obvHistory.length;
    const obvRising = this.currentOBV > obvSMA;

    const trendUp    = data.price > ema;
    const emaDelta   = ((data.price - ema) / ema) * 100;
    const strongMomentum = emaDelta > this.MIN_EMA_DELTA;

    // ── Volume spike detection using Kraken candle volumes ───
    // If Kraken recentVolumes are available, use median of those candles.
    // Falls back to current tick volume vs a simple threshold if unavailable.
    let highVolume: boolean;
    let volRatio: string;

    if (krakenVolumes && krakenVolumes.length > 0) {
      const sorted    = [...krakenVolumes].sort((a, b) => a - b);
      const volMedian = sorted[Math.floor(sorted.length * 0.5)];
      const ratio     = volMedian > 0 ? data.volume / volMedian : 0;
      highVolume      = ratio > this.MIN_VOLUME_RATIO; // 1.5x median spike
      volRatio        = ratio.toFixed(2);
      console.log(`[strategy] Volume: ${data.volume.toFixed(4)} BTC | Median: ${volMedian.toFixed(4)} | Ratio: ${volRatio}x (Kraken)`);
    } else {
      // Fallback: use internal price history length as proxy (no real volume data)
      highVolume = false;
      volRatio   = "N/A (no Kraken data)";
      console.warn("[strategy] recentVolumes unavailable — volume signal disabled this tick");
    }

    // Shared checkpoint for artifacts
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
        const exitPrice   = data.price;
        this.entryPrice   = null;
        this.positionSize = 0;

        this.consecutiveLosses++;
        if (this.consecutiveLosses >= this.MAX_CONSECUTIVE_LOSSES) {
          this.circuitBreakerTripped = true;
        }
        this.cooldownRemaining = this.COOLDOWN_CANDLES;

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
        const exitPrice   = data.price;
        this.entryPrice   = null;
        this.positionSize = 0;

        this.consecutiveLosses = 0;
        this.cooldownRemaining = this.COOLDOWN_CANDLES;

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

    if (trendUp)    buyScore++;  else sellScore++;
    if (obvRising)  buyScore++;  else sellScore++;
    if (highVolume) buyScore++;  // now powered by Kraken spike detection

    // 6. Cooldown guard
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

    // 7. Entry
    if (buyScore >= 2 && this.entryPrice === null && (highVolume || strongMomentum)) {
      this.entryPrice   = data.price;
      this.positionSize = this.tradeAmountUsd / data.price;

      await this.postValidationArtifact({
        tradeIntent:        { pair: data.pair, direction: "BUY", entryPrice: data.price },
        riskCheck:          { stopLoss: `${this.STOP_LOSS * 100}%`, takeProfit: `${this.TAKE_PROFIT * 100}%`, positionSize: `$${this.tradeAmountUsd}` },
        strategyCheckpoint: checkpoint,
        outcomeHash:        null,
        timestamp:          Date.now(),
      });

      return {
        action: "BUY",
        asset,
        pair: data.pair,
        amount: this.tradeAmountUsd,
        confidence: 0.65 + buyScore * 0.1,
        reasoning: `Momentum confirmed: ${emaDelta.toFixed(2)}% above EMA, OBV ${obvRising ? "rising" : "flat"}, vol ${volRatio}x median (Kraken)`,
      };
    }

    // 8. Exit on weakening momentum
    if (this.entryPrice !== null && sellScore >= 2) {
      const pnlPct    = (((data.price / this.entryPrice) - 1) * 100).toFixed(2);
      const exitPrice = data.price;
      this.entryPrice   = null;
      this.positionSize = 0;

      if (parseFloat(pnlPct) < 0) {
        this.consecutiveLosses++;
        if (this.consecutiveLosses >= this.MAX_CONSECUTIVE_LOSSES) {
          this.circuitBreakerTripped = true;
        }
      } else {
        this.consecutiveLosses = 0;
      }
      this.cooldownRemaining = this.COOLDOWN_CANDLES;

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

    // 9. Hold
    const holdReason = this.entryPrice
      ? `Holding — PnL ${(((data.price / this.entryPrice) - 1) * 100).toFixed(2)}%, waiting for clearer exit signal (buy ${buyScore} sell ${sellScore})`
      : `No entry — waiting for stronger alignment, buy score ${buyScore}/3, price ${emaDelta.toFixed(2)}% vs EMA, vol ${volRatio}x (Kraken)`;

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