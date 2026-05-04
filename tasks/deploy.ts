import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("=".repeat(60));
  console.log("PHANTOM Protocol — Wave 1 + Wave 3 Deployment");
  console.log("=".repeat(60));
  console.log("Deployer:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance: ", ethers.formatEther(balance), "ETH");
  console.log("");

  // ──────────────────────────────────────────────────────────────
  // Deploy PhantomBet
  // ──────────────────────────────────────────────────────────────
  console.log("Deploying PhantomBet...");
  const PhantomBet = await ethers.getContractFactory("PhantomBet");
  const phantomBet = await PhantomBet.deploy();
  await phantomBet.waitForDeployment();
  const betAddress = await phantomBet.getAddress();
  console.log("✅ PhantomBet deployed to:", betAddress);

  // ──────────────────────────────────────────────────────────────
  // Deploy PhantomToken
  // ──────────────────────────────────────────────────────────────
  console.log("\nDeploying PhantomToken...");
  const PhantomToken = await ethers.getContractFactory("PhantomToken");
  const phantomToken = await PhantomToken.deploy();
  await phantomToken.waitForDeployment();
  const tokenAddress = await phantomToken.getAddress();
  console.log("✅ PhantomToken deployed to:", tokenAddress);

  // ──────────────────────────────────────────────────────────────
  // Deploy PhantomRounds
  // ──────────────────────────────────────────────────────────────
  console.log("\nDeploying PhantomRounds...");
  const PhantomRounds = await ethers.getContractFactory("PhantomRounds");
  const phantomRounds = await PhantomRounds.deploy();
  await phantomRounds.waitForDeployment();
  const roundsAddress = await phantomRounds.getAddress();
  console.log("✅ PhantomRounds deployed to:", roundsAddress);

  // ──────────────────────────────────────────────────────────────
  // Summary
  // ──────────────────────────────────────────────────────────────
  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYED ADDRESSES");
  console.log("=".repeat(60));
  console.log("PhantomBet:   ", betAddress);
  console.log("PhantomToken: ", tokenAddress);
  console.log("PhantomRounds:", roundsAddress);
  console.log("Chain ID:      421614 (Arbitrum Sepolia)");
  console.log("Explorer:      https://sepolia.arbiscan.io/address/" + betAddress);
  console.log("=".repeat(60));

  // Write addresses to frontend .env
  const envContent = [
    `VITE_PHANTOM_BET_ADDRESS=${betAddress}`,
    `VITE_PHANTOM_TOKEN_ADDRESS=${tokenAddress}`,
    `VITE_PHANTOM_ROUNDS_ADDRESS=${roundsAddress}`,
    `VITE_CHAIN_ID=421614`,
  ].join("\n") + "\n";

  const frontendEnvPath = path.resolve(__dirname, "../frontend/.env");
  fs.writeFileSync(frontendEnvPath, envContent, "utf8");
  console.log("\n✅ Written to frontend/.env:", frontendEnvPath);

  // Also output for manual copy-paste
  console.log("\n--- Copy to frontend/src/config/contracts.ts ---");
  console.log(`export const PHANTOM_BET_ADDRESS = "${betAddress}" as const;`);
  console.log(`export const PHANTOM_TOKEN_ADDRESS = "${tokenAddress}" as const;`);
  console.log(`export const PHANTOM_ROUNDS_ADDRESS = "${roundsAddress}" as const;`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
