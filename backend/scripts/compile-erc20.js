#!/usr/bin/env node
/**
 * Compile PVASimpleERC20.sol and output bytecode for ERC20_DEPLOY_BYTECODE
 * Run: node scripts/compile-erc20.js
 * Then set ERC20_DEPLOY_BYTECODE in .env
 */
const fs = require('fs');
const path = require('path');

async function compile() {
  let solc;
  try {
    solc = require('solc');
  } catch {
    console.error('Install solc: npm install solc');
    process.exit(1);
  }

  const contractPath = path.join(__dirname, '..', 'contracts', 'PVASimpleERC20.sol');
  const source = fs.readFileSync(contractPath, 'utf8');

  const input = {
    language: 'Solidity',
    sources: { 'PVASimpleERC20.sol': { content: source } },
    settings: {
      outputSelection: { '*': { '*': ['abi', 'evm.bytecode'] } },
      optimizer: { enabled: true, runs: 200 },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  const err = output.errors?.find((e) => e.severity === 'error');
  if (err) {
    console.error('Compile error:', err.formattedMessage);
    process.exit(1);
  }

  const contract = output.contracts['PVASimpleERC20.sol']?.PVASimpleERC20;
  if (!contract?.evm?.bytecode?.object) {
    console.error('No bytecode in output');
    process.exit(1);
  }

  const bytecode = '0x' + contract.evm.bytecode.object;
  console.log('ERC20_DEPLOY_BYTECODE=' + bytecode);
  console.log('\nAdd to .env:');
  console.log('ERC20_DEPLOY_BYTECODE=' + bytecode);
}

compile().catch((e) => {
  console.error(e);
  process.exit(1);
});
