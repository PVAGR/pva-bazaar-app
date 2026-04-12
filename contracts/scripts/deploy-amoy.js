const fs = require('fs');
const { ethers } = require('hardhat');

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log('Deploying contracts with account:', deployer.address);
  console.log('Account balance:', (await deployer.provider.getBalance(deployer.address)).toString());

  const Governance = await ethers.getContractFactory('PvaGovernance');
  const governance = await Governance.deploy();
  await governance.waitForDeployment();
  const governanceAddress = await governance.getAddress();
  console.log('PvaGovernance deployed to:', governanceAddress);

  const Treasury = await ethers.getContractFactory('PvaTreasury');
  const treasury = await Treasury.deploy(governanceAddress);
  await treasury.waitForDeployment();
  const treasuryAddress = await treasury.getAddress();
  console.log('PvaTreasury deployed to:', treasuryAddress);

  const envPath = 'Frontend/.env.production';
  const envContent = [
    `VITE_GOVERNANCE_CONTRACT_ADDRESS=${governanceAddress}`,
    `VITE_TREASURY_CONTRACT_ADDRESS=${treasuryAddress}`,
    'VITE_CHAIN_ID=80002',
    '',
  ].join('\n');

  fs.writeFileSync(envPath, envContent, 'utf8');
  console.log('Contract addresses saved to Frontend/.env.production');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
