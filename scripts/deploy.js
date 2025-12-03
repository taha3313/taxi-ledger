const hre = require("hardhat");

async function main() {
  const TaxiLedger = await hre.ethers.getContractFactory("TaxiLedger");

  const baseFare = 700;
  const perKmFare = 500;
  const perMinFare = 80;

  const [owner] = await hre.ethers.getSigners();

  const contract = await TaxiLedger.deploy(
    baseFare,
    perKmFare,
    perMinFare,
    owner.address
  );

  await contract.waitForDeployment();

  console.log("TaxiLedger deployed at:", await contract.getAddress());
  console.log("Owner:", owner.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
