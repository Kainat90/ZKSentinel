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

// ─────────────────────────────────────────────────────────────
// Trade stats — used by agent.ts to report PnL / winrate / ROI
// ─────────────────────────────────────────────────────────────
export interface TradeStats {
  totalTrades:  number;
  wins:         number;
  losses:       number;
  winRate:      number;   // 0–1
  totalPnlUsd:  number;   // running dollar PnL
  totalRoiPct:  number;   // running ROI %
  avgRoiPct:    number;   // average ROI per trade
}

export class VolumeConfirmedMomentumStrategy implements TradingStrategy {

  // ── Constants ─────────────────────────────────────────────
  private readonly VOLUME_LOOKBACK        = 10;
  private readonly OBV_SMA_PERIOD         = 10;
  private readonly EMA_FAST_PERIOD        = 9;
  private readonly EMA_SLOW_PERIOD        = 21;
  private readonly RSI_PERIOD             = 14;
  private readonly tradeAmountUsd         = 490;
  private readonly MAX_VOLATILITY_PCT     = 3.0;
  private readonly MIN_VOLUME_RATIO       = 1.5;
  private readonly MIN_EMA_DELTA          = 0.0012;  // 0.12% as a ratio
  private readonly STOP_LOSS              = 0.008;   // 0.8%
  private readonly TAKE_PROFIT           = 0.015;   // 1.5%
  private readonly MAX_CONSECUTIVE_LOSSES = 3;
  private readonly COOLDOWN_CANDLES       = 3;
  private readonly AUTO_RESET_CANDLES     = 20;      // auto-reset CB after 20 candles of silence
  private readonly MIN_SCORE_TO_BUY       = 3;       // raised from 2 → fewer false entries
  private readonly WARMUP_CANDLES         = 21;      // wait for slow EMA to be valid

  // ── Circuit breaker state ──────────────────────────────────
  private consecutiveLosses     = 0;
  private circuitBreakerTripped = false;
  private cooldownRemaining     = 0;
  private cbResetCountdown      = 0;   // counts down to auto-reset

  // ── Indicator state ───────────────────────────────────────
  private obvHistory:    number[] = [];
  private volumeHistory: number[] = [];
  private priceHistory:  number[] = [];
  private rsiGains:      number[] = [];
  private rsiLosses:     number[] = [];
  private candleCount            = 0;

  private currentOBV:  number       = 0;
  private emaFast:     number | null = null;
  private emaSlow:     number | null = null;
  private lastPrice:   number | null = null;
  private avgGain:     number | null = null;
  private avgLoss:     number | null = null;

  // ── Position tracking ─────────────────────────────────────
  private entryPrice:   number | null = null;
  private positionSize: number        = 0;

  // ── Stats (reported to agent.ts) ──────────────────────────
  private stats: TradeStats = {
    totalTrades: 0,
    wins:        0,
    losses:      0,
    winRate:     0,
    totalPnlUsd: 0,
    totalRoiPct: 0,
    avgRoiPct:   0,
  };

  // ─────────────────────────────
  // Public: get current stats
  // ─────────────────────────────
  public getStats(): Readonly<TradeStats> {
    return { ...this.stats };
  }

  // ─────────────────────────────
  // Public: manual circuit breaker reset (wired to dashboard button)
  // ─────────────────────────────
  public resetCircuitBreaker(): void {
    this.circuitBreakerTripped = false;
    this.consecutiveLosses     = 0;
    this.cooldownRemaining     = 0;
    this.cbResetCountdown      = 0;
    console.log("[CircuitBreaker] Manually reset by operator.");
  }

  // ─────────────────────────────
  // Public: is circuit breaker tripped?
  // ─────────────────────────────
  public isCircuitBreakerTripped(): boolean {
    return this.circuitBreakerTripped;
  }

  // ─────────────────────────────
  // EMA helper
  // ─────────────────────────────
  private updateEMA(price: number, period: number, prev: number | null): number {
    if (prev === null) return price;
    const k = 2 / (period + 1);
    return price * k + prev * (1 - k);
  }

  // ─────────────────────────────
  // RSI helper
  // ─────────────────────────────
  private updateRSI(price: number): number | null {
    if (this.lastPrice === null) return null;

    const change = price - this.lastPrice;
    const gain   = change > 0 ? change : 0;
    const loss   = change < 0 ? Math.abs(change) : 0;

    this.rsiGains.push(gain);
    this.rsiLosses.push(loss);

    if (this.rsiGains.length < this.RSI_PERIOD) return null;
    if (this.rsiGains.length > this.RSI_PERIOD) {
      this.rsiGains.shift();
      this.rsiLosses.shift();
    }

    if (this.avgGain === null) {
      this.avgGain = this.rsiGains.reduce((a, b) => a + b, 0) / this.RSI_PERIOD;
      this.avgLoss = this.rsiLosses.reduce((a, b) => a + b, 0) / this.RSI_PERIOD;
    } else {
      this.avgGain = (this.avgGain * (this.RSI_PERIOD - 1) + gain) / this.RSI_PERIOD;
      this.avgLoss = (this.avgLoss! * (this.RSI_PERIOD - 1) + loss) / this.RSI_PERIOD;
    }

    if (this.avgLoss === 0) return 100;
    const rs  = this.avgGain / this.avgLoss!;
    return 100 - 100 / (1 + rs);
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
  // Record closed trade → update stats
  // ─────────────────────────────
  private recordTrade(entryPrice: number, exitPrice: number, amountUsd: number): void {
    const roiPct   = ((exitPrice / entryPrice) - 1) * 100;
    const pnlUsd   = amountUsd * (roiPct / 100);
    const isWin    = roiPct > 0;

    this.stats.totalTrades++;
    if (isWin) this.stats.wins++; else this.stats.losses++;
    this.stats.winRate     = this.stats.wins / this.stats.totalTrades;
    this.stats.totalPnlUsd += pnlUsd;
    this.stats.totalRoiPct += roiPct;
    this.stats.avgRoiPct   = this.stats.totalRoiPct / this.stats.totalTrades;

    console.log(
      `[Strategy] Trade closed | ROI: ${roiPct.toFixed(3)}% | PnL: $${pnlUsd.toFixed(2)} | ` +
      `Win: ${isWin} | Total trades: ${this.stats.totalTrades} | ` +
      `Win rate: ${(this.stats.winRate * 100).toFixed(1)}% | ` +
      `Total PnL: $${this.stats.totalPnlUsd.toFixed(2)}`
    );
  }

  // ─────────────────────────────
  // Buy score — 5 signals, need MIN_SCORE_TO_BUY (3) to enter
  // ─────────────────────────────
  private calculateBuyScore(data: MarketData): {
    score: number;
    emaSignal: string;
    obvSignal: "rising" | "falling";
    volumeRatio: string;
    rsi: number | null;
  } {
    let score = 0;

    // ── 1. Fast EMA above Slow EMA (trend confirmation) ──
    let emaSignal = "neutral";
    if (this.emaFast !== null && this.emaSlow !== null) {
      const delta = (this.emaFast - this.emaSlow) / this.emaSlow;
      if (delta >= this.MIN_EMA_DELTA) {
        score++;
        emaSignal = `bullish (+${(delta * 100).toFixed(3)}%)`;
      } else if (delta < 0) {
        score--;
        emaSignal = `bearish (${(delta * 100).toFixed(3)}%)`;
      }
    }

    // ── 2. Price above fast EMA ──
    if (this.emaFast !== null && data.price > this.emaFast) {
      score++;
    }

    // ── 3. OBV rising above its SMA ──
    let obvSignal: "rising" | "falling" = "falling";
    if (this.lastPrice !== null) {
      const vol = data.volume ?? 0;
      if (data.price > this.lastPrice)      this.currentOBV += vol;
      else if (data.price < this.lastPrice) this.currentOBV -= vol;
    }
    this.obvHistory.push(this.currentOBV);
    if (this.obvHistory.length > this.OBV_SMA_PERIOD) this.obvHistory.shift();

    if (this.obvHistory.length >= this.OBV_SMA_PERIOD) {
      const obvSMA = this.obvHistory.reduce((a, b) => a + b, 0) / this.obvHistory.length;
      if (this.currentOBV > obvSMA) {
        score++;
        obvSignal = "rising";
      }
    }

    // ── 4. Volume spike ──
    const vol = data.volume ?? 0;
    this.volumeHistory.push(vol);
    if (this.volumeHistory.length > this.VOLUME_LOOKBACK) this.volumeHistory.shift();

    let volumeRatio = "N/A";
    if (this.volumeHistory.length >= this.VOLUME_LOOKBACK) {
      const avgVol = this.volumeHistory.reduce((a, b) => a + b, 0) / this.volumeHistory.length;
      const ratio  = avgVol > 0 ? vol / avgVol : 0;
      volumeRatio  = ratio.toFixed(2) + "x";
      if (ratio >= this.MIN_VOLUME_RATIO) score++;
    }

    // ── 5. RSI in buy zone (40–65, not overbought) ──
    const rsi = this.updateRSI(data.price);
    if (rsi !== null) {
      if (rsi >= 40 && rsi <= 65) score++;
      else if (rsi > 75)          score--;  // overbought — penalise
    }

    // ── 6. Volatility filter (deduct if too choppy) ──
    if (data.high != null && data.low != null && data.price > 0) {
      const volatilityPct = ((data.high - data.low) / data.price) * 100;
      if (volatilityPct > this.MAX_VOLATILITY_PCT) score--;
    }

    return { score, emaSignal, obvSignal, volumeRatio, rsi };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MAIN ANALYZE LOOP
  // ─────────────────────────────────────────────────────────────────────────
  async analyze(data: MarketData): Promise<TradeDecision> {
    const asset = data.pair.replace("USD", "");
    this.candleCount++;

    // ── Update EMAs ──
    this.emaFast = this.updateEMA(data.price, this.EMA_FAST_PERIOD, this.emaFast);
    this.emaSlow = this.updateEMA(data.price, this.EMA_SLOW_PERIOD, this.emaSlow);

    // ── Warm-up: wait until slow EMA has enough data ──
    if (this.candleCount < this.WARMUP_CANDLES) {
      this.lastPrice = data.price;
      return {
        action:     "HOLD",
        asset,
        pair:       data.pair,
        amount:     0,
        confidence: 0,
        reasoning:  `Warming up (${this.candleCount}/${this.WARMUP_CANDLES} candles)`,
      };
    }

    // ── Circuit breaker: tripped ──
    if (this.circuitBreakerTripped) {
      this.cbResetCountdown++;
      if (this.cbResetCountdown >= this.AUTO_RESET_CANDLES) {
        this.resetCircuitBreaker();
        console.log("[CircuitBreaker] Auto-reset after cooldown period.");
      } else {
        this.lastPrice = data.price;
        return {
          action:     "HOLD",
          asset,
          pair:       data.pair,
          amount:     0,
          confidence: 0,
          reasoning:  `Circuit breaker tripped — ${this.consecutiveLosses} consecutive losses. ` +
                      `Auto-reset in ${this.AUTO_RESET_CANDLES - this.cbResetCountdown} candles, ` +
                      `or use manual reset.`,
        };
      }
    }

    // ── Cooldown after individual loss ──
    if (this.cooldownRemaining > 0) {
      this.cooldownRemaining--;
      this.lastPrice = data.price;
      return {
        action:     "HOLD",
        asset,
        pair:       data.pair,
        amount:     0,
        confidence: 0.3,
        reasoning:  `Cooldown active — ${this.cooldownRemaining} candles remaining.`,
      };
    }

    // ── EXIT: check open position ──
    if (this.entryPrice !== null) {
      const pnl = (data.price / this.entryPrice) - 1;

      const hitStopLoss   = pnl <= -this.STOP_LOSS;
      const hitTakeProfit = pnl >= this.TAKE_PROFIT;

      if (hitStopLoss || hitTakeProfit) {
        const exitPrice  = data.price;
        const entrySnap  = this.entryPrice;
        const isWin      = pnl > 0;

        // Record PnL before clearing position
        this.recordTrade(entrySnap, exitPrice, this.positionSize);

        // Update circuit breaker state
        if (!isWin) {
          this.consecutiveLosses++;
          this.cooldownRemaining = this.COOLDOWN_CANDLES;
          if (this.consecutiveLosses >= this.MAX_CONSECUTIVE_LOSSES) {
            this.circuitBreakerTripped = true;
            this.cbResetCountdown      = 0;
            console.log("[CircuitBreaker] Tripped after 3 consecutive losses.");
          }
        } else {
          this.consecutiveLosses = 0;
        }

        // Post ERC-8004 artifact
        await this.postValidationArtifact({
          tradeIntent: { pair: data.pair, direction: "SELL", entryPrice: entrySnap },
          riskCheck: {
            stopLoss:     `${(this.STOP_LOSS * 100).toFixed(1)}%`,
            takeProfit:   `${(this.TAKE_PROFIT * 100).toFixed(1)}%`,
            positionSize: `$${this.positionSize}`,
            triggerPrice: exitPrice,
            result:       isWin ? "WIN" : "LOSS",
          },
          strategyCheckpoint: {
            emaSignal:   this.emaFast !== null ? `fast=${this.emaFast.toFixed(2)}` : "N/A",
            obvSignal:   "falling",
            volumeRatio: "N/A",
          },
          outcomeHash: this.hashResult({ pair: data.pair, entrySnap, exitPrice, pnl }),
          timestamp:   Date.now(),
        });

        // Clear position
        this.entryPrice   = null;
        this.positionSize = 0;
        this.lastPrice    = data.price;

        const tag = hitStopLoss ? "Stop loss" : "Take profit";
        return {
          action:     "SELL",
          asset,
          pair:       data.pair,
          amount:     this.tradeAmountUsd,
          confidence: 1.0,
          reasoning:  `${tag} hit. Closed at ${(pnl * 100).toFixed(3)}% PnL ($${(this.tradeAmountUsd * pnl).toFixed(2)}).`,
          // ── Fields for dashboard PnL tracking ──
          pnl:        parseFloat((this.tradeAmountUsd * pnl).toFixed(2)),
          roiPct:     parseFloat((pnl * 100).toFixed(3)),
          entryPrice: entrySnap,
          exitPrice,
          isWin,
        } as TradeDecision & Record<string, unknown>;
      }

      // Still in position — report current unrealised PnL
      this.lastPrice = data.price;
      return {
        action:     "HOLD",
        asset,
        pair:       data.pair,
        amount:     0,
        confidence: 0.5,
        reasoning:  `Holding position. Entry: $${this.entryPrice.toFixed(2)} | ` +
                    `Current: $${data.price.toFixed(2)} | ` +
                    `Unrealised PnL: ${(pnl * 100).toFixed(3)}%`,
        unrealisedPnlPct: parseFloat((pnl * 100).toFixed(3)),
      } as TradeDecision & Record<string, unknown>;
    }

    // ── ENTRY: calculate buy score ──
    const { score, emaSignal, obvSignal, volumeRatio, rsi } = this.calculateBuyScore(data);

    if (score >= this.MIN_SCORE_TO_BUY) {
      this.entryPrice   = data.price;
      this.positionSize = this.tradeAmountUsd;

      await this.postValidationArtifact({
        tradeIntent: { pair: data.pair, direction: "BUY", entryPrice: data.price },
        riskCheck: {
          stopLoss:     `${(this.STOP_LOSS * 100).toFixed(1)}%`,
          takeProfit:   `${(this.TAKE_PROFIT * 100).toFixed(1)}%`,
          positionSize: `$${this.tradeAmountUsd}`,
        },
        strategyCheckpoint: {
          emaSignal,
          obvSignal,
          volumeRatio,
        },
        outcomeHash: null,
        timestamp:   Date.now(),
      });

      this.lastPrice = data.price;
      return {
        action:     "BUY",
        asset,
        pair:       data.pair,
        amount:     this.tradeAmountUsd,
        confidence: Math.min(0.99, 0.6 + score * 0.08),
        reasoning:  `Entry signal. Score=${score}/6 | EMA: ${emaSignal} | ` +
                    `OBV: ${obvSignal} | Vol: ${volumeRatio} | RSI: ${rsi?.toFixed(1) ?? "N/A"}`,
        entryPrice: data.price,
      } as TradeDecision & Record<string, unknown>;
    }

    this.lastPrice = data.price;
    return {
      action:     "HOLD",
      asset,
      pair:       data.pair,
      amount:     0,
      confidence: Math.max(0.1, score * 0.15),
      reasoning:  `Scanning. Score=${score}/${this.MIN_SCORE_TO_BUY} needed | ` +
                  `EMA: ${emaSignal} | OBV: ${obvSignal} | Vol: ${volumeRatio} | ` +
                  `RSI: ${rsi?.toFixed(1) ?? "N/A"}`,
    };
  }
}