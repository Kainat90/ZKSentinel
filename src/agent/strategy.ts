import { MarketData, TradeDecision, TradingStrategy } from "../types/index";

export class VolumeConfirmedMomentumStrategy implements TradingStrategy {
  private readonly VOLUME_LOOKBACK = 10;
  private readonly OBV_SMA_PERIOD = 10;
  private readonly EMA_PERIOD = 9;
  private readonly tradeAmountUsd = 490;

  private readonly MIN_VOLUME_RATIO = 1.15;
  private readonly MIN_EMA_DELTA = 0.12; // percent

  private readonly STOP_LOSS   = 0.008;  // 0.8%
  private readonly TAKE_PROFIT = 0.015;  // 1.5%

  private obvHistory: number[] = [];
  private volumeHistory: number[] = [];
  private priceHistory: number[] = [];

  private currentOBV: number = 0;
  private ema: number | null = null;
  private lastPrice: number | null = null;

  private entryPrice: number | null = null;
  private positionSize: number = 0;

  private updateEMA(price: number): number {
    if (this.ema === null) {
      this.ema = price;
    } else {
      const k = 2 / (this.EMA_PERIOD + 1);
      this.ema = price * k + this.ema * (1 - k);
    }
    return this.ema;
  }

  async analyze(data: MarketData): Promise<TradeDecision> {
    const asset = data.pair.replace("USD", "");

    // ─────────────────────────────
    // 1. Update histories & OBV
    // ─────────────────────────────
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

    // ─────────────────────────────
    // 2. Warm-up guard
    // ─────────────────────────────
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

    // ─────────────────────────────
    // 3. Indicators
    // ─────────────────────────────
    const obvSMA = this.obvHistory.reduce((a, b) => a + b, 0) / this.obvHistory.length;
    const obvRising = this.currentOBV > obvSMA;

    const trendUp = data.price > ema;
    const emaDelta = ((data.price - ema) / ema) * 100;

    const sortedVols = [...this.volumeHistory].sort((a, b) => a - b);
    const volMedian = sortedVols[Math.floor(sortedVols.length * 0.5)];
    const highVolume = data.volume > volMedian * this.MIN_VOLUME_RATIO;
    const volRatio = (data.volume / volMedian).toFixed(2);

    const strongMomentum = emaDelta > this.MIN_EMA_DELTA;

    // ─────────────────────────────
    // 4. Risk management
    // ─────────────────────────────
    if (this.entryPrice !== null && this.positionSize > 0) {
      const pnl = data.price / this.entryPrice - 1;
      const pnlPct = (pnl * 100).toFixed(2);

      if (pnl < -this.STOP_LOSS) {
        this.entryPrice = null;
        this.positionSize = 0;
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
        this.entryPrice = null;
        this.positionSize = 0;
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

    // ─────────────────────────────
    // 5. Score signals
    // ─────────────────────────────
    let buyScore = 0;
    let sellScore = 0;

    if (trendUp) buyScore++; else sellScore++;
    if (obvRising) buyScore++; else sellScore++;
    if (highVolume) buyScore++;

    // ─────────────────────────────
    // 6. Entry
    // ─────────────────────────────
    if (buyScore >= 2 && this.entryPrice === null && (highVolume || strongMomentum)) {
      this.entryPrice = data.price;
      this.positionSize = this.tradeAmountUsd / data.price;
      return {
        action: "BUY",
        asset,
        pair: data.pair,
        amount: this.tradeAmountUsd,
        confidence: 0.65 + buyScore * 0.1,
        reasoning: `Momentum confirmed: ${emaDelta.toFixed(2)}% above EMA, OBV rising, vol ${volRatio}x median`,
      };
    }

    // ─────────────────────────────
    // 7. Exit on weakening momentum
    // ─────────────────────────────
    if (this.entryPrice !== null && sellScore >= 2) {
      const pnlPct = (((data.price / this.entryPrice) - 1) * 100).toFixed(2);
      this.entryPrice = null;
      this.positionSize = 0;
      return {
        action: "SELL",
        asset,
        pair: data.pair,
        amount: this.tradeAmountUsd,
        confidence: 0.65 + sellScore * 0.05,
        reasoning: `Momentum fading (PnL ${pnlPct}%, sell score ${sellScore}/3)`,
      };
    }

    // ─────────────────────────────
    // 8. Hold
    // ─────────────────────────────
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