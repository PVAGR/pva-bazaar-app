const hre = require("hardhat");

async function main() {
  console.log("Deploying ModernArtifact contract...");

  const ModernArtifact = await hre.ethers.getContractFactory("ModernArtifact");
  const artifactContract = await ModernArtifact.deploy();

  await artifactContract.waitForDeployment();

  const address = await artifactContract.getAddress();
  console.log("Contract deployed to:", address);
  console.log("Save this contract address for backend configuration.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
