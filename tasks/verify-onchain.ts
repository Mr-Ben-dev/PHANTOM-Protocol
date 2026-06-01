import { ethers } from "hardhat";

const ADDRESSES = {
  PhantomBet: "0x561428264991044f47705C92CE482E37C9cD71b7",
  PhantomToken: "0x78AF03022b1cD35e75642Ac2A043a6d2cE472228",
  PhantomRounds: "0x76db8a0429d19e8440e3D290F79c0613834c72a1",
  PhantomMulti: "0x4923426E703530cc4C9467F9B47AF3C85599ebaF",
  Keeper: "0x18398aA1dFdA63F30529c46E90ac41c1E75F7Ecf",
};

async function main() {
  const provider = ethers.provider;

  for (const [name, addr] of Object.entries(ADDRESSES)) {
    if (name === "Keeper") continue;
    const code = await provider.getCode(addr);
    console.log(`${name} (${addr}) bytecode: ${code.length > 2 ? "OK" : "MISSING"}`);
  }

  const bet = new ethers.Contract(
    ADDRESSES.PhantomBet,
    ["function getMarketCount() view returns (uint256)"],
    provider,
  );
  const multi = new ethers.Contract(
    ADDRESSES.PhantomMulti,
    ["function getMultiMarketCount() view returns (uint256)"],
    provider,
  );
  const rounds = new ethers.Contract(
    ADDRESSES.PhantomRounds,
    [
      "function getRoundCount() view returns (uint256)",
      "function roundBots(address) view returns (bool)",
      "function oracleSigners(address) view returns (bool)",
    ],
    provider,
  );

  console.log("PhantomBet markets:", (await bet.getMarketCount()).toString());
  console.log("PhantomMulti markets:", (await multi.getMultiMarketCount()).toString());
  console.log("PhantomRounds rounds:", (await rounds.getRoundCount()).toString());
  console.log("Keeper is roundBot:", await rounds.roundBots(ADDRESSES.Keeper));
  console.log("Keeper is oracleSigner:", await rounds.oracleSigners(ADDRESSES.Keeper));
}

main().catch(console.error);
