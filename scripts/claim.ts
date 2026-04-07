import { ethers } from "ethers";
import * as dotenv from "dotenv";
dotenv.config();

async function claim() {
  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  const vault = new ethers.Contract(
    process.env.HACKATHON_VAULT_ADDRESS!,
    ["function claimAllocation(uint256 agentId) external"],
    signer
  );
  console.log("Claiming 0.05 ETH allocation...");
  const tx = await vault.claimAllocation(process.env.AGENT_ID!);
  await tx.wait();
  console.log("Claimed successfully!");
}

claim();

