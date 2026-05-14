import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("=".repeat(60));
  console.log("PHANTOM Protocol — Wave 4: PhantomMulti Deployment");
  console.log("=".repeat(60));
  console.log("Deployer:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance: ", ethers.formatEther(balance), "ETH");
  console.log("");

  // ──────────────────────────────────────────────────────────────
  // Deploy PhantomMulti
  // ──────────────────────────────────────────────────────────────
  console.log("Deploying PhantomMulti...");
  const PhantomMulti = await ethers.getContractFactory("PhantomMulti");
  const phantomMulti = await PhantomMulti.deploy();
  await phantomMulti.waitForDeployment();
  const multiAddress = await phantomMulti.getAddress();
  console.log("✅ PhantomMulti deployed to:", multiAddress);

  // ──────────────────────────────────────────────────────────────
  // Grant keeper RESOLVER role so it can resolve markets via CLI/bot
  // ──────────────────────────────────────────────────────────────
  const KEEPER = process.env.KEEPER_ADDRESS ?? deployer.address;
  if (KEEPER.toLowerCase() !== deployer.address.toLowerCase()) {
    console.log("\nGranting RESOLVER role to keeper:", KEEPER);
    const tx = await phantomMulti.grantRole(KEEPER, 3 /* Role.RESOLVER */);
    await tx.wait();
    console.log("✅ RESOLVER role granted to keeper");
  }

  // ──────────────────────────────────────────────────────────────
  // Summary
  // ──────────────────────────────────────────────────────────────
  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYED");
  console.log("=".repeat(60));
  console.log("PhantomMulti:", multiAddress);
  console.log("Chain ID:     421614 (Arbitrum Sepolia)");
  console.log("Explorer:     https://sepolia.arbiscan.io/address/" + multiAddress);
  console.log("=".repeat(60));

  // ──────────────────────────────────────────────────────────────
  // Append VITE_PHANTOM_MULTI_ADDRESS to frontend/.env
  // ──────────────────────────────────────────────────────────────
  const frontendEnvPath = path.resolve(__dirname, "../frontend/.env");
  let existing = "";
  if (fs.existsSync(frontendEnvPath)) {
    existing = fs.readFileSync(frontendEnvPath, "utf8");
    // Remove old PHANTOM_MULTI line if it exists
    existing = existing.split("\n").filter((l) => !l.startsWith("VITE_PHANTOM_MULTI_ADDRESS=")).join("\n");
    if (!existing.endsWith("\n")) existing += "\n";
  }
  fs.writeFileSync(frontendEnvPath, existing + `VITE_PHANTOM_MULTI_ADDRESS=${multiAddress}\n`, "utf8");
  console.log("\n✅ Written VITE_PHANTOM_MULTI_ADDRESS to frontend/.env");

  // ──────────────────────────────────────────────────────────────
  // Print update for contracts.ts
  // ──────────────────────────────────────────────────────────────
  console.log("\n--- Update frontend/src/config/contracts.ts ---");
  console.log(`export const PHANTOM_MULTI_ADDRESS = "${multiAddress}" as const;`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
