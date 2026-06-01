import { expect } from "chai";
import { ethers } from "hardhat";

async function deployPhantomToken() {
  const [owner, alice] = await ethers.getSigners();
  const PhantomToken = await ethers.getContractFactory("PhantomToken");
  const contract = await PhantomToken.deploy();
  await contract.waitForDeployment();
  return { contract, owner, alice };
}

describe("PhantomToken — Smoke Tests", function () {
  it("Owner is set on deploy", async function () {
    const { contract, owner } = await deployPhantomToken();
    expect(await contract.owner()).to.equal(owner.address);
  });

  it("balanceOf returns indicator for new address", async function () {
    const { contract, alice } = await deployPhantomToken();
    const bal = await contract.balanceOf(alice.address);
    expect(bal).to.be.a("bigint");
  });

  it("Non-owner cannot mint", async function () {
    const { contract, alice } = await deployPhantomToken();
    await expect(
      contract.connect(alice).mint(alice.address, {
        ctHash: 0n,
        securityZone: 0,
        utype: 0,
        signature: "0x",
      }),
    ).to.be.revertedWith("Only owner");
  });
});
