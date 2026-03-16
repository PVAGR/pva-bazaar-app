// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ModernArtifact
 * @dev Treats physical items as unique blockchain artifacts with perpetual royalties.
 */
contract ModernArtifact is ERC721, ERC2981, Ownable {
    uint256 private _tokenIdCounter;

    struct ArtifactData {
        string uniqueHash;
        string ipfsURI;
        uint256 createdAt;
        bool isAuthentic;
    }

    mapping(uint256 => ArtifactData) public artifacts;
    mapping(string => bool) public registeredHashes;

    event ArtifactMinted(uint256 indexed tokenId, address indexed owner, string uniqueHash);
    event ArtifactSold(uint256 indexed tokenId, address indexed from, address indexed to, uint256 price);

    constructor() ERC721("ModernArtifact", "MART") Ownable(msg.sender) {
        _setDefaultRoyalty(msg.sender, 1000);
    }

    function mintArtifact(
        address recipient,
        string memory uniqueHash,
        string memory metadataURI
    ) public onlyOwner returns (uint256) {
        require(!registeredHashes[uniqueHash], "Artifact already exists");

        uint256 tokenId = _tokenIdCounter;
        _safeMint(recipient, tokenId);

        artifacts[tokenId] = ArtifactData({
            uniqueHash: uniqueHash,
            ipfsURI: metadataURI,
            createdAt: block.timestamp,
            isAuthentic: true
        });

        registeredHashes[uniqueHash] = true;
        _tokenIdCounter += 1;

        emit ArtifactMinted(tokenId, recipient, uniqueHash);
        return tokenId;
    }

    function recordSale(uint256 tokenId, address from, address to, uint256 price) public onlyOwner {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        emit ArtifactSold(tokenId, from, to, price);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
