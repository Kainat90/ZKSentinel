/**
 * ZKSentinel Backtester
 * Uses your EXACT VolumeConfirmedMomentumStrategy from the repo
 * Free — uses CCXT + Kraken historical data
 */

import * as dotenv from "dotenv";
dotenv.config();

import ccxt from "ccxt";
import { VolumeConfirmedMomentumStrategy } from "../agent/strategy";
import { MarketData, TradeDecision } from "../types/index";
import fs from "fs";
import path from "path";

// ========================= CONFIG =========================
const SYMBOL = "BTC/USD";
const TIMEFRAME = "1h";           // change to "15m", "4h", etc.
const DAYS_BACK = 365;            // 1 year free data
const INITIAL_CAPITAL = 10000;

// Optional: match your .env settings
process.env.MIN_SESSION_BARS = "30";
process.env.DEV_MODE = "true";
// =========================================================

const exchange = new ccxt.kraken();
const strategy = new VolumeConfirmedMomentumStrategy();

let equity = INITIAL_CAPITAL;
let position = 0; // 0 = flat, amount in USD when long
let entryPrice = 0;
const trades: any[] = [];
const equityCurve: number[] = [INITIAL_CAPITAL];

async function runBacktest() {
  console.log(`🔄 Fetching ${DAYS_BACK} days of ${TIMEFRAME} BTC/USD data from Kraken...`);

  const since = Date.now() - DAYS_BACK * 24 * 60 * 60 * 1000;
  const ohlcv = await exchange.fetchOHLCV(SYMBOL, TIMEFRAME, since);

  console.log(`✅ Loaded ${ohlcv.length} candles\n`);

  for (let i = 0; i < ohlcv.length; i++) {
    const candle = ohlcv[i];
    const timestamp = candle[0];
    const open = candle[1];
    const high = candle[2];
    const low = candle[3];
    const close = candle[4];
    const volumeBtc = candle[5];

    // guard against incomplete data
    if (timestamp === undefined || open === undefined || high === undefined || low === undefined || close === undefined || volumeBtc === undefined) {
      console.warn(`Skipping candle at index ${i} due to missing candle data`);
      continue;
    }

    // TS narrowing guarantees number types below
    const safeTimestamp = timestamp;
    const safeOpen = open;
    const safeHigh = high;
    const safeLow = low;
    const safeClose = close;
    const safeVolumeBtc = volumeBtc;

    // Convert to your exact MarketData format (CoinGecko style)
    const volumeUsd = volumeBtc * close;
    const spreadPct = 0.004; // 0.4% like your live logs
    const marketData: MarketData = {
      pair: "BTCUSD",
      price: close,
      bid: close * (1 - spreadPct),
      ask: close * (1 + spreadPct),
      volume: volumeUsd,           // ← important: USD volume like your agent uses
      vwap: close,                 // simplified
      high,
      low,
      timestamp,
    };

    // Run your EXACT strategy
    const decision: TradeDecision = await strategy.analyze(marketData);

    // Simulate trade
    if (decision.action === "BUY" && position === 0) {
      position = decision.amount;
      entryPrice = close;
      trades.push({ time: new Date(timestamp), action: "BUY", price: close, amount: position });
    } 
    else if (decision.action === "SELL" && position > 0) {
      const pnlPct = (close - entryPrice) / entryPrice;
      equity = equity * (1 + pnlPct);
      trades.push({ time: new Date(timestamp), action: "SELL", price: close, pnlPct: pnlPct * 100 });
      position = 0;
    }

    equityCurve.push(equity);

    // Progress every 100 candles
    if (i % 100 === 0) {
      console.log(`[${new Date(timestamp).toISOString()}] ${decision.action} | Price $${close.toLocaleString()} | Equity $${equity.toFixed(2)}`);
    }
  }

  // ========================= RESULTS =========================
  const finalEquity = equityCurve[equityCurve.length - 1];
  const totalReturn = ((finalEquity / INITIAL_CAPITAL) - 1) * 100;
  const maxDrawdown = Math.min(...equityCurve.map((e, i) => (e / Math.max(...equityCurve.slice(0, i + 1)) - 1) * 100));

  console.log("\n" + "=".repeat(60));
  console.log("✅ ZKSENTINEL BACKTEST COMPLETE");
  console.log("=".repeat(60));

  const startTimestamp = ohlcv[0]?.[0] as number | undefined;
  const endTimestamp = ohlcv[ohlcv.length - 1]?.[0] as number | undefined;
  const startDate = startTimestamp ? new Date(startTimestamp).toDateString() : "N/A";
  const endDate = endTimestamp ? new Date(endTimestamp).toDateString() : "N/A";

  console.log(`Period          : ${startDate} → ${endDate}`);
  console.log(`Initial capital : $${INITIAL_CAPITAL.toLocaleString()}`);
  console.log(`Final equity    : $${finalEquity.toFixed(2)}`);
  console.log(`Total return    : ${totalReturn.toFixed(2)}%`);
  console.log(`Max drawdown    : ${maxDrawdown.toFixed(2)}%`);
  console.log(`Total trades    : ${trades.length}`);
  console.log(`Strategy used   : VolumeConfirmedMomentumStrategy (EXACT repo version)`);

  console.log("\nLast 10 decisions:");
  trades.slice(-10).forEach(t => console.log(t));

  // Save results
  fs.writeFileSync(path.join(process.cwd(), "backtest-results.json"), JSON.stringify({
    equityCurve,
    trades,
    finalEquity,
    totalReturn,
    maxDrawdown
  }, null, 2));

  console.log("\n💾 Results saved to backtest-results.json");
  console.log("You can open it in Excel or paste into Google Colab for charts.");
}

runBacktest().catch((err) => {
  console.error("Backtest failed:", err);
  process.exit(1);
});