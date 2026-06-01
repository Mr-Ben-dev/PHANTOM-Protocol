import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

function readEnvValue(filePath: string, key: string): string | undefined {
  if (!fs.existsSync(filePath)) return undefined;
  const line = fs.readFileSync(filePath, "utf8").split("\n").find((l) => l.startsWith(`${key}=`));
  return line?.split("=").slice(1).join("=");
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const frontendEnvPath = path.resolve(__dirname, "../frontend/.env");
  const botEnvPath = path.resolve(__dirname, "../bot/.env");

  const tokenAddress = readEnvValue(frontendEnvPath, "VITE_PHANTOM_TOKEN_ADDRESS")
    ?? "0x78AF03022b1cD35e75642Ac2A043a6d2cE472228";
  const roundsAddress = readEnvValue(frontendEnvPath, "VITE_PHANTOM_ROUNDS_ADDRESS")
    ?? "0x76db8a0429d19e8440e3D290F79c0613834c72a1";

  console.log("=".repeat(60));
  console.log("PHANTOM Protocol — Bet v2 + Multi v2 Deployment");
  console.log("=".repeat(60));
  console.log("Deployer:", deployer.address);
  console.log("Keeping PhantomToken:", tokenAddress);
  console.log("Keeping PhantomRounds:", roundsAddress);

  const PhantomBet = await ethers.getContractFactory("PhantomBet");
  const phantomBet = await PhantomBet.deploy();
  await phantomBet.waitForDeployment();
  const betAddress = await phantomBet.getAddress();
  console.log("✅ PhantomBet v2:", betAddress);

  const PhantomMulti = await ethers.getContractFactory("PhantomMulti");
  const phantomMulti = await PhantomMulti.deploy();
  await phantomMulti.waitForDeployment();
  const multiAddress = await phantomMulti.getAddress();
  console.log("✅ PhantomMulti v2:", multiAddress);

  const envContent = [
    `VITE_PHANTOM_BET_ADDRESS=${betAddress}`,
    `VITE_PHANTOM_TOKEN_ADDRESS=${tokenAddress}`,
    `VITE_PHANTOM_ROUNDS_ADDRESS=${roundsAddress}`,
    `VITE_PHANTOM_MULTI_ADDRESS=${multiAddress}`,
    `VITE_CHAIN_ID=421614`,
  ].join("\n") + "\n";
  fs.writeFileSync(frontendEnvPath, envContent, "utf8");

  const pk = (process.env.PRIVATE_KEY ?? readEnvValue(botEnvPath, "PRIVATE_KEY") ?? "").replace(/^0x/, "");
  const botEnvLines = [
    `PRIVATE_KEY=0x${pk}`,
    `RPC_URL=${process.env.ARBITRUM_SEPOLIA_RPC_URL ?? readEnvValue(botEnvPath, "RPC_URL") ?? "https://sepolia-rollup.arbitrum.io/rpc"}`,
    `PHANTOM_BET_ADDRESS=${betAddress}`,
    `PHANTOM_ROUNDS_ADDRESS=${roundsAddress}`,
    `PHANTOM_MULTI_ADDRESS=${multiAddress}`,
    `POLL_INTERVAL_SECONDS=30`,
    `PORT=10000`,
  ].join("\n") + "\n";
  fs.writeFileSync(botEnvPath, botEnvLines, "utf8");

  console.log("\n✅ Updated frontend/.env and bot/.env");
  console.log("Next: cd bot && npx tsx seed-markets.ts && npx tsx seed-multi-markets.ts");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
