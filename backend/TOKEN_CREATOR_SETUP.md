# Token Creator Setup

Create verifiable ERC-20 tokens from the admin area. You are the owner.

## Option 1: Register (no backend deploy)

1. Deploy your token via [Remix](https://remix.ethereum.org)
2. Use the contract at `backend/contracts/PVASimpleERC20.sol`
3. Constructor: `(name, symbol, initialSupply, decimals, ownerAddress)`
4. In PVA Bazaar → Tokens → Register existing token: paste the contract address

## Option 2: Backend deploy

1. Install solc: `npm install solc` (in backend)
2. Compile: `node backend/scripts/compile-erc20.js`
3. Copy the `ERC20_DEPLOY_BYTECODE` output to `.env`
4. Set `TOKEN_DEPLOYER_PRIVATE_KEY` to a wallet with ETH for gas (Base network)
5. Deploy from the Tokens page – backend deploys and you become owner

## Environment variables

| Variable | Description |
|----------|-------------|
| `TOKEN_DEPLOYER_PRIVATE_KEY` | Wallet private key (funded with ETH) |
| `ERC20_DEPLOY_BYTECODE` | Compiled bytecode from compile script |
| `ETHEREUM_RPC_URL` | RPC URL (default: Base mainnet) |

## Security

- Never commit `TOKEN_DEPLOYER_PRIVATE_KEY`
- Use a dedicated deployer wallet with minimal funds
- Add your wallet address in Account → Default Wallet for owner prefill
