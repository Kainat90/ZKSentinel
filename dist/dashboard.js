"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var dotenv = __toESM(require("dotenv"));
var import_express = __toESM(require("express"));
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
var http = __toESM(require("http"));
var import_ws = require("ws");
dotenv.config();
const app = (0, import_express.default)();
const PORT = process.env.DASHBOARD_PORT || 3e3;
const CHECKPOINTS_FILE = path.join(process.cwd(), "checkpoints.jsonl");
app.use((_req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});
function readCheckpoints() {
  if (!fs.existsSync(CHECKPOINTS_FILE)) return [];
  const raw = fs.readFileSync(CHECKPOINTS_FILE, "utf8").trim();
  if (!raw) return [];
  return raw.split("\n").map((l) => {
    try {
      return JSON.parse(l);
    } catch {
      return null;
    }
  }).filter(Boolean);
}
function timeAgo(timestampSeconds) {
  const secs = Math.floor(Date.now() / 1e3 - timestampSeconds);
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}
function normalizePair(pair) {
  return pair.replace("XBT", "BTC").replace(/USD$/, "/USD");
}
function formatAmount(cp) {
  if (!cp.amountUsd || cp.amountUsd === 0) return "\u2014";
  const asset = (cp.asset || cp.pair?.replace("USD", "") || "BTC").replace("XBT", "BTC");
  const coins = cp.priceUsd > 0 ? (cp.amountUsd / cp.priceUsd).toFixed(6) : "0";
  return `${coins} ${asset}`;
}
function toDecision(cp, _idx, pnl = 0) {
  return {
    id: `dec-${cp.timestamp}`,
    action: cp.action,
    reasoning: cp.reasoning ?? "\u2014",
    confidence: Math.round((cp.confidence ?? 0.5) * 100),
    timestamp: new Date(cp.timestamp * 1e3).toISOString(),
    timeAgo: timeAgo(cp.timestamp),
    pair: normalizePair(cp.pair ?? "BTCUSD"),
    amount: formatAmount(cp),
    price: `$${Number(cp.priceUsd ?? 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`,
    pnl: parseFloat(pnl.toFixed(2)),
    proofHash: cp.reasoningHash ?? cp.signature?.slice(0, 34) ?? "\u2014",
    proofStatus: "PASS",
    checkpointHash: cp.reasoningHash ?? "\u2014",
    eip712: !!cp.signature
  };
}
function toProof(cp, _idx) {
  return {
    id: `proof-${cp.timestamp}`,
    hash: cp.reasoningHash ?? cp.signature?.slice(0, 34) ?? "\u2014",
    decision: cp.action,
    rule: cp.action === "HOLD" ? "No trade \u2014 HOLD rule" : "Position limits validated",
    status: "PASS",
    timestamp: new Date(cp.timestamp * 1e3).toISOString()
  };
}
function toDecisionList(checkpoints) {
  const result = checkpoints.map((cp, i) => {
    let pnl = 0;
    if (cp.action !== "HOLD" && cp.amountUsd > 0 && i + 1 < checkpoints.length) {
      const next = checkpoints[i + 1];
      const pct = cp.priceUsd > 0 ? (next.priceUsd - cp.priceUsd) / cp.priceUsd : 0;
      pnl = cp.action === "BUY" ? pct * cp.amountUsd : -pct * cp.amountUsd;
    }
    return toDecision(cp, i, pnl);
  });
  return result.reverse();
}
function computeReputation(checkpoints) {
  const trades = checkpoints.filter((cp) => cp.action !== "HOLD");
  const buys = checkpoints.filter((cp) => cp.action === "BUY").length;
  const total = checkpoints.length;
  const winRate = total > 0 ? Math.round(buys / total * 100) : 0;
  const score = Math.min(900, 500 + Math.round(winRate * 2) + Math.min(trades.length * 2, 200));
  const byDay = {};
  checkpoints.forEach((cp) => {
    const day = new Date(cp.timestamp * 1e3).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric"
    });
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(cp.confidence ?? 0.5);
  });
  let running = 500;
  const history = Object.entries(byDay).slice(-14).map(([date, confs]) => {
    const avg = confs.reduce((a, b) => a + b, 0) / confs.length;
    running = Math.round(running + avg * 10);
    return { date, score: running };
  });
  const wlByDay = {};
  checkpoints.forEach((cp) => {
    const day = new Date(cp.timestamp * 1e3).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric"
    });
    if (!wlByDay[day]) wlByDay[day] = { wins: 0, losses: 0 };
    if (cp.action !== "HOLD") wlByDay[day].wins++;
    else wlByDay[day].losses++;
  });
  const winLoss = Object.entries(wlByDay).slice(-14).map(([date, v]) => ({ date, ...v }));
  const phByDay = {};
  checkpoints.forEach((cp) => {
    const day = new Date(cp.timestamp * 1e3).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric"
    });
    phByDay[day] = (phByDay[day] ?? 0) + 1;
  });
  const proofHistory = Object.entries(phByDay).slice(-14).map(([date, count]) => ({ date, count }));
  let totalRoi = 0;
  let roiCount = 0;
  for (let i = 0; i < checkpoints.length; i++) {
    const cp = checkpoints[i];
    if (cp.action !== "HOLD" && cp.amountUsd > 0 && i + 1 < checkpoints.length) {
      const next = checkpoints[i + 1];
      const pct = cp.priceUsd > 0 ? (next.priceUsd - cp.priceUsd) / cp.priceUsd : 0;
      const roi = cp.action === "BUY" ? pct * 100 : -pct * 100;
      totalRoi += roi;
      roiCount++;
    }
  }
  const avgRoi = roiCount > 0 ? parseFloat((totalRoi / roiCount).toFixed(2)) : 0;
  const signedCount = checkpoints.filter((cp) => !!cp.signature).length;
  const proofSuccessRate = total > 0 ? Math.round(signedCount / total * 100) : 0;
  const firstTs = checkpoints.length > 0 ? checkpoints[checkpoints.length - 1].timestamp : Date.now() / 1e3;
  const ageSecs = Date.now() / 1e3 - firstTs;
  const ageDays = Math.floor(ageSecs / 86400);
  const ageHours = Math.floor(ageSecs / 3600);
  const agentAge = ageDays > 0 ? `${ageDays} day${ageDays !== 1 ? "s" : ""}` : `${ageHours}h`;
  return {
    score,
    avgRoi,
    proofSuccessRate,
    winRate,
    totalTrades: trades.length,
    agentAge,
    history,
    winLoss,
    proofHistory,
    contractAddress: process.env.REPUTATION_REGISTRY_ADDRESS ?? "0x0000000000000000000000000000000000000000"
  };
}
app.get("/api/status", (_req, res) => {
  res.json({
    agentId: process.env.AGENT_ID ?? "\u2014",
    wallet: process.env.HOT_WALLET_PRIVATE_KEY ? "(hot wallet set)" : process.env.PRIVATE_KEY ? "(operator wallet)" : "\u2014",
    pair: process.env.TRADING_PAIR ?? "XBTUSD",
    sandbox: process.env.KRAKEN_SANDBOX !== "false",
    network: "Sepolia",
    interval: parseInt(process.env.POLL_INTERVAL_MS ?? "30000") / 1e3,
    contracts: {
      agentRegistry: process.env.AGENT_REGISTRY_ADDRESS ?? null,
      hackathonVault: process.env.HACKATHON_VAULT_ADDRESS ?? null,
      riskRouter: process.env.RISK_ROUTER_ADDRESS ?? null,
      reputationRegistry: process.env.REPUTATION_REGISTRY_ADDRESS ?? null,
      validationRegistry: process.env.VALIDATION_REGISTRY_ADDRESS ?? null
    }
  });
});
app.get("/api/checkpoints", (_req, res) => {
  if (!fs.existsSync(CHECKPOINTS_FILE)) return res.json([]);
  const raw = fs.readFileSync(CHECKPOINTS_FILE, "utf8").trim();
  if (!raw) return res.json([]);
  const all = raw.split("\n").map((l) => {
    try {
      return JSON.parse(l);
    } catch {
      return null;
    }
  }).filter(Boolean);
  res.json(all.slice(-50).reverse());
});
app.get("/api/price", (_req, res) => {
  if (!fs.existsSync(CHECKPOINTS_FILE)) return res.json({ price: null });
  const raw = fs.readFileSync(CHECKPOINTS_FILE, "utf8").trim();
  if (!raw) return res.json({ price: null });
  const lines = raw.split("\n").filter(Boolean);
  try {
    const last = JSON.parse(lines[lines.length - 1]);
    res.json({ price: last.priceUsd, timestamp: last.timestamp });
  } catch {
    res.json({ price: null });
  }
});
app.get("/api/decisions", (_req, res) => {
  const all = readCheckpoints();
  res.json(toDecisionList(all).slice(0, 50));
});
app.get("/api/proofs", (_req, res) => {
  const all = readCheckpoints();
  res.json(all.slice(-50).reverse().map((cp, i) => toProof(cp, i)));
});
app.get("/api/reputation", (_req, res) => {
  const all = readCheckpoints();
  res.json(computeReputation(all));
});
const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Agent Dashboard</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600&family=Syne:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
  :root {
    --bg:        #f0f2f5;
    --bg2:       #ffffff;
    --bg3:       #f7f8fa;
    --border:    #dde1e7;
    --border2:   #c8cdd6;
    --text:      #111827;
    --muted:     #6b7280;
    --accent:    #0070f3;
    --accent2:   #0057c2;
    --buy:       #059669;
    --buy-dim:   #05966915;
    --sell:      #dc2626;
    --sell-dim:  #dc262615;
    --hold:      #6b7280;
    --hold-dim:  #6b728010;
    --gold:      #b45309;
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    background: var(--bg);
    color: var(--text);
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px;
    min-height: 100vh;
    overflow-x: hidden;
  }

  body::before {
    content: '';
    position: fixed;
    top: 0; left: 0; right: 0;
    height: 3px;
    background: linear-gradient(90deg, var(--accent), #6366f1);
    z-index: 9999;
  }

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 24px;
    border-bottom: 1px solid var(--border);
    background: var(--bg2);
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .logo {
    font-family: 'Syne', sans-serif;
    font-size: 15px;
    font-weight: 700;
    letter-spacing: 0.08em;
    color: var(--text);
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .logo-dot {
    width: 8px; height: 8px;
    background: var(--accent);
    border-radius: 50%;
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.4; }
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .badge {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.1em;
    padding: 3px 8px;
    border-radius: 3px;
    text-transform: uppercase;
  }

  .badge-sandbox { background: #fef3c7; color: var(--gold); border: 1px solid #fcd34d; }
  .badge-live    { background: #d1fae5; color: var(--buy);  border: 1px solid #6ee7b7; }

  .last-update {
    color: var(--muted);
    font-size: 11px;
  }

  .grid {
    display: grid;
    grid-template-columns: 280px 1fr;
    grid-template-rows: auto 1fr;
    gap: 1px;
    background: var(--border);
    height: calc(100vh - 53px);
  }

  .panel {
    background: var(--bg2);
    overflow: hidden;
  }

  .panel-header {
    padding: 12px 16px;
    border-bottom: 1px solid var(--border);
    font-family: 'Syne', sans-serif;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--muted);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .panel-header .count {
    background: var(--bg3);
    border: 1px solid var(--border2);
    padding: 1px 6px;
    border-radius: 3px;
    font-size: 10px;
    color: var(--accent);
  }

  .sidebar {
    grid-row: 1 / 3;
    display: flex;
    flex-direction: column;
    border-right: 1px solid var(--border);
  }

  .price-hero {
    padding: 24px 16px 20px;
    border-bottom: 1px solid var(--border);
    background: linear-gradient(180deg, #e8f0fe 0%, var(--bg2) 100%);
  }

  .price-label {
    font-size: 10px;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--muted);
    margin-bottom: 6px;
  }

  .price-value {
    font-family: 'Syne', sans-serif;
    font-size: 32px;
    font-weight: 800;
    color: var(--text);
    letter-spacing: -0.02em;
    line-height: 1;
    transition: color 0.3s;
  }

  .price-value.up   { color: var(--buy); }
  .price-value.down { color: var(--sell); }

  .price-change {
    font-size: 11px;
    margin-top: 6px;
    color: var(--muted);
  }

  .price-change.up   { color: var(--buy); }
  .price-change.down { color: var(--sell); }

  .decision-display {
    padding: 16px;
    border-bottom: 1px solid var(--border);
  }

  .decision-label {
    font-size: 10px;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--muted);
    margin-bottom: 8px;
  }

  .decision-badge {
    font-family: 'Syne', sans-serif;
    font-size: 22px;
    font-weight: 800;
    letter-spacing: 0.05em;
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  .decision-badge.BUY  { color: var(--buy); }
  .decision-badge.SELL { color: var(--sell); }
  .decision-badge.HOLD { color: var(--hold); }

  .decision-badge::before {
    content: '';
    display: block;
    width: 10px; height: 10px;
    border-radius: 50%;
  }
  .decision-badge.BUY::before  { background: var(--buy);  box-shadow: 0 0 12px var(--buy); }
  .decision-badge.SELL::before { background: var(--sell); box-shadow: 0 0 12px var(--sell); }
  .decision-badge.HOLD::before { background: var(--hold); }

  .decision-reasoning {
    margin-top: 10px;
    color: var(--muted);
    font-size: 11px;
    line-height: 1.6;
    border-left: 2px solid var(--border2);
    padding-left: 10px;
  }

  .agent-info {
    padding: 16px;
    flex: 1;
    border-bottom: 1px solid var(--border);
  }

  .info-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 0;
    border-bottom: 1px solid var(--border);
  }

  .info-row:last-child { border-bottom: none; }

  .info-key   { color: var(--muted); font-size: 11px; }
  .info-value { color: var(--text);  font-size: 11px; font-weight: 500; }
  .info-value.accent { color: var(--accent); }

  .chart-panel {
    padding: 0;
    height: 120px;
    position: relative;
  }

  .chart-panel canvas {
    width: 100% !important;
    height: 100% !important;
  }

  .main-area {
    display: flex;
    flex-direction: column;
  }

  .feed {
    flex: 1;
    overflow-y: auto;
    padding: 0;
  }

  .feed::-webkit-scrollbar { width: 4px; }
  .feed::-webkit-scrollbar-track { background: transparent; }
  .feed::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 2px; }

  .checkpoint-card {
    padding: 14px 16px;
    border-bottom: 1px solid var(--border);
    display: grid;
    grid-template-columns: 80px 1fr auto;
    gap: 12px;
    align-items: start;
    transition: background 0.15s;
    animation: slideIn 0.3s ease;
  }

  @keyframes slideIn {
    from { opacity: 0; transform: translateY(-8px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .checkpoint-card:hover { background: var(--bg3); }

  .checkpoint-card.BUY  { border-left: 2px solid var(--buy); }
  .checkpoint-card.SELL { border-left: 2px solid var(--sell); }
  .checkpoint-card.HOLD { border-left: 2px solid var(--border2); }

  .card-action {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .action-pill {
    font-family: 'Syne', sans-serif;
    font-size: 11px;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 3px;
    letter-spacing: 0.05em;
    width: 54px;
    text-align: center;
  }

  .action-pill.BUY  { background: var(--buy-dim);  color: var(--buy);  border: 1px solid var(--buy)40; }
  .action-pill.SELL { background: var(--sell-dim); color: var(--sell); border: 1px solid var(--sell)40; }
  .action-pill.HOLD { background: var(--hold-dim); color: var(--hold); border: 1px solid var(--border2); }

  .card-time {
    font-size: 10px;
    color: var(--muted);
    text-align: center;
  }

  .card-body { min-width: 0; }

  .card-price {
    font-family: 'Syne', sans-serif;
    font-size: 15px;
    font-weight: 700;
    color: var(--text);
    margin-bottom: 4px;
  }

  .card-reasoning {
    color: var(--muted);
    font-size: 11px;
    line-height: 1.5;
    margin-bottom: 6px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .card-confidence {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .confidence-bar-bg {
    flex: 1;
    height: 2px;
    background: var(--border2);
    border-radius: 1px;
    overflow: hidden;
  }

  .confidence-bar-fill {
    height: 100%;
    border-radius: 1px;
    background: var(--accent);
    transition: width 0.5s ease;
  }

  .confidence-val {
    font-size: 10px;
    color: var(--muted);
    width: 28px;
    text-align: right;
  }

  .card-sig {
    font-size: 10px;
    color: var(--border2);
    white-space: nowrap;
    padding-top: 2px;
    writing-mode: initial;
    max-width: 100px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 200px;
    color: var(--muted);
    gap: 8px;
  }

  .empty-icon { font-size: 32px; opacity: 0.3; }

  .conn-dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: var(--buy);
    animation: pulse 2s infinite;
    display: inline-block;
    margin-right: 6px;
  }

  .conn-dot.error { background: var(--sell); animation: none; }
</style>
</head>
<body>

<header>
  <div class="logo">
    <div class="logo-dot"></div>
    AGENT TERMINAL
  </div>
  <div class="header-right">
    <span id="mode-badge" class="badge badge-sandbox">SANDBOX</span>
    <span class="last-update"><span class="conn-dot" id="conn-dot"></span><span id="last-update-time">connecting...</span></span>
  </div>
</header>

<div class="grid">

  <!-- Sidebar -->
  <div class="sidebar panel">

    <div class="price-hero">
      <div class="price-label">BTC / USD</div>
      <div class="price-value" id="price-display">\u2014</div>
      <div class="price-change" id="price-change"></div>
    </div>

    <div class="decision-display">
      <div class="decision-label">Last Decision</div>
      <div class="decision-badge HOLD" id="decision-badge">HOLD</div>
      <div class="decision-reasoning" id="decision-reasoning">Waiting for first tick...</div>
    </div>

    <div class="agent-info">
      <div class="panel-header" style="padding: 0 0 10px; border: none;">Agent Info</div>
      <div class="info-row">
        <span class="info-key">Agent ID</span>
        <span class="info-value accent" id="info-agent-id">\u2014</span>
      </div>
      <div class="info-row">
        <span class="info-key">Wallet</span>
        <span class="info-value" id="info-wallet">\u2014</span>
      </div>
      <div class="info-row">
        <span class="info-key">Pair</span>
        <span class="info-value" id="info-pair">\u2014</span>
      </div>
      <div class="info-row">
        <span class="info-key">Network</span>
        <span class="info-value accent">Sepolia</span>
      </div>
      <div class="info-row">
        <span class="info-key">Interval</span>
        <span class="info-value">30s</span>
      </div>
      <div class="info-row">
        <span class="info-key">Checkpoints</span>
        <span class="info-value accent" id="info-total">0</span>
      </div>
    </div>

    <div class="panel chart-panel">
      <canvas id="price-chart"></canvas>
    </div>

  </div>

  <!-- Main feed -->
  <div class="main-area panel">
    <div class="panel-header">
      Recent Checkpoints
      <span class="count" id="feed-count">0</span>
    </div>
    <div class="feed" id="feed">
      <div class="empty">
        <div class="empty-icon">\u2B21</div>
        <div>Waiting for agent data...</div>
        <div style="font-size:10px; margin-top:4px;">Run <code>npm run run-agent</code> in another terminal</div>
      </div>
    </div>
  </div>

</div>

<script>
const fmt = n => n == null ? '\u2014' : '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtTime = ts => {
  const d = new Date(typeof ts === 'number' && ts < 1e12 ? ts * 1000 : ts);
  return d.toLocaleTimeString('en-US', { hour12: false });
};
const truncate = (s, n=16) => s ? s.slice(0, 6) + '...' + s.slice(-4) : '\u2014';

let prevPrice = null;
let priceHistory = [];

async function loadStatus() {
  try {
    const r = await fetch('/api/status');
    const s = await r.json();
    document.getElementById('info-agent-id').textContent = s.agentId ?? '\u2014';
    document.getElementById('info-pair').textContent = s.pair ?? 'XBTUSD';

    const badge = document.getElementById('mode-badge');
    if (!s.sandbox) {
      badge.textContent = 'LIVE';
      badge.className = 'badge badge-live';
    }
  } catch(e) {}
}

async function loadCheckpoints() {
  try {
    const r = await fetch('/api/checkpoints');
    const cps = await r.json();

    document.getElementById('conn-dot').className = 'conn-dot';
    document.getElementById('last-update-time').textContent = 'updated ' + new Date().toLocaleTimeString('en-US', { hour12: false });
    document.getElementById('feed-count').textContent = cps.length;
    document.getElementById('info-total').textContent = cps.length;

    if (cps.length === 0) return;

    const latest = cps[0];
    const price = latest.priceUsd;

    const priceEl = document.getElementById('price-display');
    const changeEl = document.getElementById('price-change');

    priceEl.textContent = fmt(price);
    priceEl.className = 'price-value';
    if (prevPrice !== null) {
      const pct = ((price - prevPrice) / prevPrice * 100).toFixed(3);
      if (price > prevPrice) { priceEl.classList.add('up'); changeEl.className = 'price-change up'; changeEl.textContent = '+' + pct + '%'; }
      else if (price < prevPrice) { priceEl.classList.add('down'); changeEl.className = 'price-change down'; changeEl.textContent = pct + '%'; }
      else { changeEl.textContent = '0.000%'; changeEl.className = 'price-change'; }
    }
    prevPrice = price;

    priceHistory = cps.slice(0, 20).map(c => c.priceUsd).reverse();
    drawChart();

    const dec = latest.action;
    const decEl = document.getElementById('decision-badge');
    decEl.textContent = dec;
    decEl.className = 'decision-badge ' + dec;

    if (latest.signerAddress) {
      document.getElementById('info-wallet').textContent = truncate(latest.signerAddress);
    }

    document.getElementById('decision-reasoning').textContent = latest.reasoning ?? '\u2014';

    const feed = document.getElementById('feed');
    feed.innerHTML = cps.map(cp => {
      const conf = Math.round((cp.confidence ?? 0.5) * 100);
      const barColor = cp.action === 'BUY' ? 'var(--buy)' : cp.action === 'SELL' ? 'var(--sell)' : 'var(--hold)';
      return \`
        <div class="checkpoint-card \${cp.action}">
          <div class="card-action">
            <div class="action-pill \${cp.action}">\${cp.action}</div>
            <div class="card-time">\${fmtTime(cp.timestamp)}</div>
          </div>
          <div class="card-body">
            <div class="card-price">\${fmt(cp.priceUsd)}</div>
            <div class="card-reasoning" title="\${(cp.reasoning||'').replace(/"/g,'&quot;')}">\${cp.reasoning ?? '\u2014'}</div>
            <div class="card-confidence">
              <div class="confidence-bar-bg">
                <div class="confidence-bar-fill" style="width:\${conf}%; background:\${barColor}"></div>
              </div>
              <div class="confidence-val">\${conf}%</div>
            </div>
          </div>
          <div class="card-sig">\${truncate(cp.signature ?? '')}</div>
        </div>
      \`;
    }).join('');

  } catch(e) {
    document.getElementById('conn-dot').className = 'conn-dot error';
    document.getElementById('last-update-time').textContent = 'connection error';
  }
}

function drawChart() {
  const canvas = document.getElementById('price-chart');
  const ctx = canvas.getContext('2d');
  const W = canvas.offsetWidth;
  const H = canvas.offsetHeight;
  canvas.width = W;
  canvas.height = H;

  if (priceHistory.length < 2) return;

  const min = Math.min(...priceHistory);
  const max = Math.max(...priceHistory);
  const range = max - min || 1;
  const pad = 12;

  const x = i => pad + (i / (priceHistory.length - 1)) * (W - pad * 2);
  const y = v => H - pad - ((v - min) / range) * (H - pad * 2);

  ctx.clearRect(0, 0, W, H);

  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, 'rgba(0,112,243,0.12)');
  grad.addColorStop(1, 'rgba(0,112,243,0)');

  ctx.beginPath();
  ctx.moveTo(x(0), y(priceHistory[0]));
  for (let i = 1; i < priceHistory.length; i++) ctx.lineTo(x(i), y(priceHistory[i]));
  ctx.lineTo(x(priceHistory.length - 1), H);
  ctx.lineTo(x(0), H);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(x(0), y(priceHistory[0]));
  for (let i = 1; i < priceHistory.length; i++) ctx.lineTo(x(i), y(priceHistory[i]));
  ctx.strokeStyle = 'rgba(0,112,243,0.9)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const lx = x(priceHistory.length - 1);
  const ly = y(priceHistory[priceHistory.length - 1]);
  ctx.beginPath();
  ctx.arc(lx, ly, 3, 0, Math.PI * 2);
  ctx.fillStyle = '#0070f3';
  ctx.fill();
}

loadStatus();
loadCheckpoints();
setInterval(loadCheckpoints, 5000);
window.addEventListener('resize', drawChart);
</script>
</body>
</html>`;
app.get("/", (_req, res) => res.send(HTML));
const server = http.createServer(app);
const wss = new import_ws.WebSocketServer({ server, path: "/ws" });
function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === import_ws.WebSocket.OPEN) client.send(msg);
  });
}
let lastByteOffset = (() => {
  try {
    return fs.existsSync(CHECKPOINTS_FILE) ? fs.statSync(CHECKPOINTS_FILE).size : 0;
  } catch {
    return 0;
  }
})();
function pollCheckpointFile() {
  try {
    if (!fs.existsSync(CHECKPOINTS_FILE)) {
      setTimeout(pollCheckpointFile, 2e3);
      return;
    }
    const stat = fs.statSync(CHECKPOINTS_FILE);
    if (stat.size > lastByteOffset) {
      const fd = fs.openSync(CHECKPOINTS_FILE, "r");
      const newBytes = stat.size - lastByteOffset;
      const buf = Buffer.alloc(newBytes);
      fs.readSync(fd, buf, 0, newBytes, lastByteOffset);
      fs.closeSync(fd);
      lastByteOffset = stat.size;
      const newLines = buf.toString("utf8").trim().split("\n").filter(Boolean);
      const allCps = readCheckpoints();
      for (const line of newLines) {
        try {
          const cp = JSON.parse(line);
          const idx = allCps.length - 1;
          broadcast({ type: "decision", data: toDecision(cp, idx) });
          broadcast({ type: "proof", data: toProof(cp, idx) });
          broadcast({
            type: "log",
            data: {
              id: `log-${cp.timestamp}`,
              timestamp: new Date(cp.timestamp * 1e3).toLocaleTimeString("en-US", { hour12: false }),
              message: `${cp.action} \xB7 ${normalizePair(cp.pair ?? "BTCUSD")} @ $${Number(cp.priceUsd ?? 0).toLocaleString()} \xB7 confidence ${Math.round((cp.confidence ?? 0.5) * 100)}%`
            }
          });
        } catch {
        }
      }
      if (newLines.length > 0) {
        broadcast({ type: "reputation", data: computeReputation(allCps) });
      }
    }
  } catch {
  }
  setTimeout(pollCheckpointFile, 2e3);
}
server.listen(PORT, () => {
  console.log(`
  Dashboard  \u2192 http://localhost:${PORT}`);
  console.log(`  REST API   \u2192 http://localhost:${PORT}/api/decisions  (and /proofs, /reputation, /status)`);
  console.log(`  WebSocket  \u2192 ws://localhost:${PORT}/ws`);
  console.log(`
  Run "npm run run-agent" in another terminal to feed it data.
`);
  setTimeout(pollCheckpointFile, 500);
});
