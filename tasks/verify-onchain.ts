import { ethers } from "hardhat";

async function main() {
  const bet = "0x31a578f2c63a85Ae13E1e12A859a2B5f775De228";
  const rounds = "0x76db8a0429d19e8440e3D290F79c0613834c72a1";
  const keeper = "0x18398aA1dFdA63F30529c46E90ac41c1E75F7Ecf";
  const provider = ethers.provider;

  for (const [name, addr] of [
    ["PhantomBet", bet],
    ["PhantomRounds", rounds],
  ]) {
    const code = await provider.getCode(addr);
    console.log(`${name} bytecode length: ${code.length}`);
  }

  const r = new ethers.Contract(
    rounds,
    [
      "function getRoundCount() view returns (uint256)",
      "function roundBots(address) view returns (bool)",
      "function oracleSigners(address) view returns (bool)",
    ],
    provider,
  );
  const b = new ethers.Contract(
    bet,
    ["function getMarketCount() view returns (uint256)"],
    provider,
  );

  console.log("marketCount:", (await b.getMarketCount()).toString());
  console.log("roundCount:", (await r.getRoundCount()).toString());
  console.log("keeper is roundBot:", await r.roundBots(keeper));
  console.log("keeper is oracleSigner:", await r.oracleSigners(keeper));
}

main().catch(console.error);
