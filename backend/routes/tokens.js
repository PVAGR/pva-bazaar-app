const express = require('express');
const router = express.Router();
const { ethers } = require('ethers');
const Token = require('../models/Token');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');

const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
];

// Minimal ERC20 bytecode (PVASimpleERC20 compiled)
// Built from contracts/PVASimpleERC20.sol - run: cd backend && npx solcjs --bin contracts/PVASimpleERC20.sol
const ERC20_BYTECODE = process.env.ERC20_DEPLOY_BYTECODE || '';

/**
 * GET /api/tokens
 * List tokens for authenticated user
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const tokens = await Token.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json({ ok: true, items: tokens });
  } catch (err) {
    console.error('Tokens list error:', err);
    res.status(500).json({ ok: false, error: 'Failed to list tokens' });
  }
});

/**
 * POST /api/tokens/register
 * Register an existing deployed token (user deployed via Remix/MetaMask)
 */
router.post('/register', authMiddleware, async (req, res) => {
  try {
    const { contractAddress, name, symbol, decimals, totalSupply, ownerAddress, chainId } = req.body;
    if (!contractAddress || !name || !symbol) {
      return res.status(400).json({ ok: false, error: 'contractAddress, name, symbol required' });
    }
    if (!ethers.isAddress(contractAddress)) {
      return res.status(400).json({ ok: false, error: 'Invalid contract address' });
    }
    const owner = ownerAddress || req.body.owner;
    const token = new Token({
      userId: req.user.id,
      contractAddress: ethers.getAddress(contractAddress),
      name: String(name),
      symbol: String(symbol).toUpperCase(),
      decimals: parseInt(decimals, 10) || 18,
      totalSupply: totalSupply ? String(totalSupply) : '0',
      ownerAddress: owner && ethers.isAddress(owner) ? ethers.getAddress(owner) : ethers.ZeroAddress,
      chainId: parseInt(chainId, 10) || 8453,
    });
    await token.save();
    res.status(201).json({ ok: true, item: token });
  } catch (err) {
    console.error('Token register error:', err);
    res.status(500).json({ ok: false, error: err.message || 'Failed to register token' });
  }
});

/**
 * POST /api/tokens/deploy
 * Deploy new ERC20 (requires DEPLOYER_PRIVATE_KEY and ERC20_DEPLOY_BYTECODE)
 */
router.post('/deploy', authMiddleware, async (req, res) => {
  try {
    const deployerKey = process.env.TOKEN_DEPLOYER_PRIVATE_KEY;
    const bytecode = process.env.ERC20_DEPLOY_BYTECODE;
    if (!deployerKey || !bytecode) {
      return res.status(503).json({
        ok: false,
        error: 'Token deployment not configured. Set TOKEN_DEPLOYER_PRIVATE_KEY and ERC20_DEPLOY_BYTECODE, or deploy via Remix and use Register.',
      });
    }
    const { name, symbol, totalSupply, decimals, ownerAddress } = req.body;
    if (!name || !symbol) {
      return res.status(400).json({ ok: false, error: 'name and symbol required' });
    }
    let owner = ownerAddress && ethers.isAddress(ownerAddress) ? ethers.getAddress(ownerAddress) : null;
    if (!owner) {
      const user = await User.findById(req.user.id).select('preferences');
      const def = user?.preferences?.defaultWalletAddress;
      if (def && ethers.isAddress(def)) owner = ethers.getAddress(def);
    }
    if (!owner) {
      return res.status(400).json({
        ok: false,
        error: 'ownerAddress required. Add your wallet to Account settings or pass ownerAddress.',
      });
    }
    const supply = BigInt(totalSupply || '1000000');
    const provider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL || 'https://mainnet.base.org');
    const wallet = new ethers.Wallet(deployerKey, provider);
    const factory = new ethers.ContractFactory(
      ['constructor(string,string,uint256,uint8,address)'],
      bytecode,
      wallet
    );
    const contract = await factory.deploy(name, symbol, supply.toString(), decimals || 18, owner);
    await contract.waitForDeployment();
    const address = await contract.getAddress();
    const decimalsVal = parseInt(decimals, 10) || 18;
    const totalSupplyWei = supply * BigInt(10 ** decimalsVal);
    const token = new Token({
      userId: req.user.id,
      contractAddress: address,
      name,
      symbol: String(symbol).toUpperCase(),
      decimals: decimalsVal,
      totalSupply: totalSupplyWei.toString(),
      ownerAddress: owner,
      chainId: (await provider.getNetwork()).chainId,
      txHash: contract.deploymentTransaction()?.hash,
    });
    await token.save();
    res.status(201).json({ ok: true, item: token });
  } catch (err) {
    console.error('Token deploy error:', err);
    res.status(500).json({ ok: false, error: err.message || 'Deployment failed' });
  }
});

/**
 * GET /api/tokens/verify/:address
 * Verify token on-chain (read name, symbol, supply)
 */
router.get('/verify/:address', authMiddleware, async (req, res) => {
  try {
    if (!ethers.isAddress(req.params.address)) {
      return res.status(400).json({ ok: false, error: 'Invalid address' });
    }
    const rpc = process.env.ETHEREUM_RPC_URL || 'https://mainnet.base.org';
    const provider = new ethers.JsonRpcProvider(rpc);
    const contract = new ethers.Contract(req.params.address, ERC20_ABI, provider);
    const [name, symbol, decimals, totalSupply, chainId] = await Promise.all([
      contract.name().catch(() => ''),
      contract.symbol().catch(() => ''),
      contract.decimals().catch(() => 18),
      contract.totalSupply().catch(() => 0n),
      provider.getNetwork().then((n) => Number(n.chainId)),
    ]);
    res.json({
      ok: true,
      verified: true,
      data: { name, symbol, decimals: Number(decimals), totalSupply: totalSupply.toString(), chainId },
    });
  } catch (err) {
    console.error('Token verify error:', err);
    res.status(500).json({ ok: false, error: err.message || 'Verification failed' });
  }
});

module.exports = router;
