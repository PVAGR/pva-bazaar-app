require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const {
  ALCHEMY_SEPOLIA_URL = "",
  ALCHEMY_POLYGON_AMOY_URL = "",
  ALCHEMY_POLYGON_URL = "",
  PRIVATE_KEY = "",
  ETHERSCAN_API_KEY = "",
  POLYGONSCAN_API_KEY = "",
} = process.env;

function getAccounts() {
  if (!PRIVATE_KEY) return [];
  return [PRIVATE_KEY.startsWith("0x") ? PRIVATE_KEY : `0x${PRIVATE_KEY}`];
}

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      evmVersion: "cancun",
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    sepolia: {
      url: ALCHEMY_SEPOLIA_URL || "https://eth-sepolia.g.alchemy.com/v2/",
      accounts: getAccounts(),
    },
    polygonAmoy: {
      url: ALCHEMY_POLYGON_AMOY_URL || "https://polygon-amoy.g.alchemy.com/v2/",
      accounts: getAccounts(),
    },
    polygon: {
      url: ALCHEMY_POLYGON_URL || "https://polygon-mainnet.g.alchemy.com/v2/",
      accounts: getAccounts(),
    },
  },
  etherscan: {
    apiKey: {
      sepolia: ETHERSCAN_API_KEY,
      polygonAmoy: POLYGONSCAN_API_KEY,
      polygon: POLYGONSCAN_API_KEY,
    },
    customChains: [
      {
        network: "polygonAmoy",
        chainId: 80002,
        urls: {
          apiURL: "https://api-amoy.polygonscan.com/api",
          browserURL: "https://amoy.polygonscan.com",
        },
      },
    ],
  },
  paths: {
    sources: "contracts",
    tests: "test",
    cache: "cache",
    artifacts: "artifacts",
  },
};
