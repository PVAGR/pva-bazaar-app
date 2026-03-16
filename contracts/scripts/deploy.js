const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

function persistDeployment({ network, address, deployer }) {
  const outDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const payload = {
    network,
    contractName: "ModernArtifact",
    address,
    deployer,
    chainId: Number(hre.network.config.chainId || 0),
    deployedAt: new Date().toISOString(),
  };

  fs.writeFileSync(
    path.join(outDir, `${network}.json`),
    JSON.stringify(payload, null, 2),
    "utf8",
  );

  fs.writeFileSync(
    path.join(outDir, "latest.json"),
    JSON.stringify(payload, null, 2),
    "utf8",
  );
}

async function main() {
  console.log("Deploying ModernArtifact contract...");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Network:", hre.network.name);
  console.log("Deployer:", deployer.address);

  const ModernArtifact = await hre.ethers.getContractFactory("ModernArtifact");
  const artifactContract = await ModernArtifact.deploy();

  await artifactContract.waitForDeployment();

  const address = await artifactContract.getAddress();
  console.log("Contract deployed to:", address);

  persistDeployment({
    network: hre.network.name,
    address,
    deployer: deployer.address,
  });

  console.log(`Deployment saved to contracts/deployments/${hre.network.name}.json`);
  console.log("Use this address in Frontend and backend environment configuration.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
