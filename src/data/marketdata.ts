import axios from "axios";
import { MarketData } from "../types/index";

// ─────────────────────────────────────────────────────────────────────────────
// Pair mappers
// ─────────────────────────────────────────────────────────────────────────────

function mapPairToCoinGecko(pair: string): string {
  const normalized = pair.toUpperCase();
  if (normalized === "BTCUSD" || normalized === "XBTUSD") return "bitcoin";
  if (normalized === "ETHUSD") return "ethereum";
  throw new Error(`Unsupported pair for CoinGecko: ${pair}`);
}

function mapPairToKraken(pair: string): string {
  const normalized = pair.toUpperCase();
  if (normalized === "BTCUSD" || normalized === "XBTUSD") return "XBTUSD";
  if (normalized === "ETHUSD") return "ETHUSD";
  throw new Error(`Unsupported pair for Kraken: ${pair}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Kraken OHLC fetch
// Candle format: [time, open, high, low, close, vwap, volume, count]
// Note: Kraken returns these as strings inside the array, not numbers.
// Using any[][] so TypeScript doesn't complain about parseFloat on string fields.
// ─────────────────────────────────────────────────────────────────────────────

async function getKrakenOHLCV(pair: string, interval = 1): Promise<any[][]> {
  const krakenPair = mapPairToKraken(pair);

  const res = await axios.get("https://api.kraken.com/0/public/OHLC", {
    params: { pair: krakenPair, interval },
  });

  if (res.data.error?.length) {
    throw new Error(`Kraken API error: ${res.data.error.join(", ")}`);
  }

  // Kraken returns result under the pair key (e.g. XXBTZUSD)
  const resultKey = Object.keys(res.data.result).find((k) => k !== "last");
  if (!resultKey) throw new Error("Kraken: no candle data in response");

  return res.data.result[resultKey];
}

// ─────────────────────────────────────────────────────────────────────────────
// Main snapshot — CoinGecko price + Kraken OHLCV volume
// CoinGecko  → price, high_24h, low_24h (reliable, widely used)
// Kraken     → per-candle volume, vwap   (matches backtest data exactly)
// ─────────────────────────────────────────────────────────────────────────────

export async function getMarketSnapshot(pair: string): Promise<MarketData> {
  const coinId = mapPairToCoinGecko(pair);

  try {
    // Fetch both in parallel
    const [geckoRes, candles] = await Promise.all([
      axios.get(`https://api.coingecko.com/api/v3/coins/${coinId}`, {
        params: { localization: false, tickers: false, market_data: true },
      }),
      getKrakenOHLCV(pair, 1),
    ]);

    const md = geckoRes.data.market_data;

    // Latest candle: [time, open, high, low, close, vwap, volume, count]
    // Kraken returns string values inside the array — parseFloat handles both
    const latest = candles[candles.length - 1];
    const krakenVwap   = parseFloat(latest[5]);
    const krakenVolume = parseFloat(latest[6]); // BTC volume per candle

    // Last 20 candle volumes for spike detection in strategy
    const recentVolumes = candles.slice(-20).map((c: any[]) => parseFloat(c[6]));

    const price = md.current_price.usd;

    // Simulated spread
    const spreadPct = 0.002;
    const bid = price * (1 - spreadPct);
    const ask = price * (1 + spreadPct);

    return {
      price,                 // CoinGecko — reliable USD price
      volume: krakenVolume,  // Kraken — per-candle BTC volume
      recentVolumes,         // Kraken — last 20 candles for spike calc
      bid,
      ask,
      pair,
      vwap: krakenVwap,     // Kraken VWAP (matches backtest schema)
      high: md.high_24h.usd, // CoinGecko 24h high
      low:  md.low_24h.usd,  // CoinGecko 24h low
      timestamp: Date.now(),
    };

  } catch (error) {
    console.error("[marketdata] Fetch failed:", error);

    return {
      price: 0,
      volume: 0,
      recentVolumes: [],
      bid: 0,
      ask: 0,
      pair,
      vwap: 0,
      high: 0,
      low: 0,
      timestamp: Date.now(),
    };
  }
}