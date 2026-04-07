import { ethers } from "ethers";
import * as dotenv from "dotenv";
dotenv.config();

const ABI = [
  "function setRiskParams(uint256 agentId, uint256 maxPositionUsdScaled, uint256 maxDrawdownBps, uint256 maxTradesPerHour) external",
  "function getRiskParams(uint256 agentId) external view returns (tuple(uint256 maxPositionUsdScaled, uint256 maxDrawdownBps, uint256 maxTradesPerHour, bool active))",
];

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
  const wallet = new ethers.Wallet(process.env.AGENT_WALLET_PRIVATE_KEY!, provider);
  const router = new ethers.Contract(process.env.RISK_ROUTER_ADDRESS!, ABI, wallet);

  const agentId = BigInt(process.env.AGENT_ID!);

  console.log("Setting risk params for agentId:", agentId.toString());
  console.log("Wallet:", wallet.address);

  // Set params — this activates your agent
  const tx = await router.setRiskParams(
    agentId,
    BigInt(100000 * 100),  // $100,000 max position
    BigInt(1000),           // 10% max drawdown (1000 bps)
    BigInt(10)              // 10 trades per hour
  );

  console.log("⏳ Transaction sent:", tx.hash);
  await tx.wait();
  console.log("✅ Risk params set successfully!");

  // Verify
  const params = await router.getRiskParams(agentId);
  console.log("Confirmed params:", {
    maxPositionUsd: Number(params.maxPositionUsdScaled) / 100,
    maxDrawdownBps: Number(params.maxDrawdownBps),
    maxTradesPerHour: Number(params.maxTradesPerHour),
    active: params.active
  });
}

main().catch(console.error);