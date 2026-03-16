// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MarketplaceReceipt is ERC721, Ownable {
    uint256 private _tokenIdCounter;

    // Mapping from token id to per-item immutable sale hash
    mapping(uint256 => string) public itemHashes;
    mapping(uint256 => bool) public isSold;

    event ReceiptMinted(
        uint256 indexed tokenId,
        address indexed buyer,
        string itemHash
    );

    constructor() ERC721("MarketplaceReceipt", "MPR") Ownable(msg.sender) {}

    function mintReceipt(address buyer, string memory itemHash) public onlyOwner returns (uint256) {
        require(buyer != address(0), "Invalid buyer");
        require(bytes(itemHash).length > 0, "Missing item hash");

        uint256 tokenId = _tokenIdCounter;
        _safeMint(buyer, tokenId);
        itemHashes[tokenId] = itemHash;
        isSold[tokenId] = true;

        _tokenIdCounter += 1;
        emit ReceiptMinted(tokenId, buyer, itemHash);
        return tokenId;
    }

    function verifyReceipt(uint256 tokenId, string memory expectedHash) public view returns (bool) {
        return (
            isSold[tokenId] &&
            keccak256(bytes(itemHashes[tokenId])) == keccak256(bytes(expectedHash))
        );
    }
}
