export const CHAIN_CONFIG = {
  chainId: '0x13882',
  chainName: 'Polygon Amoy',
  rpcUrls: ['https://rpc-amoy.polygon.technology'],
  blockExplorerUrls: ['https://amoy.polygonscan.com'],
};

export const GOVERNANCE_ABI = [
  'function vote(uint256 proposalId, bool support, bytes32 signature) external',
  'function executeProposal(uint256 proposalId) external',
  'function getProposal(uint256 proposalId) external view returns (tuple(uint256 id, string title, uint256 forVotes, uint256 againstVotes, bool executed))',
  'event Voted(uint256 indexed proposalId, address indexed voter, bool support, uint256 weight)',
  'event ProposalExecuted(uint256 indexed proposalId)',
];

export const TREASURY_ABI = [
  'function requestFunding(uint256 proposalId, uint256 amount, address recipient) external',
  'function approveFunding(uint256 requestId) external',
  'function getFundingRequest(uint256 requestId) external view returns (tuple(uint256 id, uint256 proposalId, uint256 amount, address recipient, bool approved))',
];

export async function ensureCorrectChain(provider) {
  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: CHAIN_CONFIG.chainId }],
    });
  } catch (switchError) {
    if (switchError?.code === 4902) {
      await provider.request({
        method: 'wallet_addEthereumChain',
        params: [CHAIN_CONFIG],
      });
    } else {
      throw switchError;
    }
  }
}

export function getContract(address, abi, signerOrProvider) {
  const browserWindow = globalThis?.window;
  if (browserWindow?.ethers && address) {
    return new browserWindow.ethers.Contract(address, abi, signerOrProvider);
  }

  return {
    vote: async () => ({ wait: async () => {}, hash: '' }),
    executeProposal: async () => ({ wait: async () => {}, hash: '' }),
    getProposal: async () => ({}),
    requestFunding: async () => ({ wait: async () => {}, hash: '' }),
    approveFunding: async () => ({ wait: async () => {}, hash: '' }),
    getFundingRequest: async () => ({}),
  };
}
