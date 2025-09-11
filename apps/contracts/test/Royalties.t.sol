// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/Royalties.sol";

contract RoyaltiesTest is Test {
    Royalties public royalties;
    address public owner;
    address public artist;
    address public buyer;
    address public marketplace;

    event RoyaltySet(uint256 indexed tokenId, address recipient, uint256 amount);
    event RoyaltyPaid(uint256 indexed tokenId, address recipient, uint256 amount);

    function setUp() public {
        owner = address(this);
        artist = makeAddr("artist");
        buyer = makeAddr("buyer");
        marketplace = makeAddr("marketplace");
        
        royalties = new Royalties();
        
        // Give test addresses some ETH
        vm.deal(buyer, 10 ether);
        vm.deal(marketplace, 10 ether);
    }

    function testSetRoyalty() public {
        uint256 tokenId = 1;
        uint256 royaltyAmount = 500; // 5%

        vm.expectEmit(true, false, false, true);
        emit RoyaltySet(tokenId, artist, royaltyAmount);

        royalties.setRoyalty(tokenId, artist, royaltyAmount);

        (address recipient, uint256 amount) = royalties.royaltyInfo(tokenId, 1000);
        assertEq(recipient, artist);
        assertEq(amount, 50); // 5% of 1000
    }

    function testSetRoyaltyOnlyOwner() public {
        uint256 tokenId = 1;
        uint256 royaltyAmount = 500;

        vm.prank(artist);
        vm.expectRevert("Ownable: caller is not the owner");
        royalties.setRoyalty(tokenId, artist, royaltyAmount);
    }

    function testSetRoyaltyExceedsMaximum() public {
        uint256 tokenId = 1;
        uint256 royaltyAmount = 1100; // 11% - should exceed maximum

        vm.expectRevert("Royalty exceeds maximum");
        royalties.setRoyalty(tokenId, artist, royaltyAmount);
    }

    function testRoyaltyInfo() public {
        uint256 tokenId = 1;
        uint256 royaltyAmount = 750; // 7.5%
        uint256 salePrice = 2000;

        royalties.setRoyalty(tokenId, artist, royaltyAmount);

        (address recipient, uint256 amount) = royalties.royaltyInfo(tokenId, salePrice);
        assertEq(recipient, artist);
        assertEq(amount, 150); // 7.5% of 2000
    }

    function testRoyaltyInfoNoRoyaltySet() public {
        uint256 tokenId = 1;
        uint256 salePrice = 1000;

        (address recipient, uint256 amount) = royalties.royaltyInfo(tokenId, salePrice);
        assertEq(recipient, address(0));
        assertEq(amount, 0);
    }

    function testPayRoyalty() public {
        uint256 tokenId = 1;
        uint256 royaltyAmount = 500; // 5%
        uint256 salePrice = 1 ether;

        royalties.setRoyalty(tokenId, artist, royaltyAmount);

        uint256 artistBalanceBefore = artist.balance;
        uint256 expectedRoyalty = (salePrice * royaltyAmount) / 10000;

        vm.prank(marketplace);
        vm.expectEmit(true, false, false, true);
        emit RoyaltyPaid(tokenId, artist, expectedRoyalty);

        royalties.payRoyalty{value: expectedRoyalty}(tokenId);

        assertEq(artist.balance, artistBalanceBefore + expectedRoyalty);
    }

    function testPayRoyaltyInsufficientPayment() public {
        uint256 tokenId = 1;
        uint256 royaltyAmount = 500; // 5%
        royalties.setRoyalty(tokenId, artist, royaltyAmount);

        vm.prank(marketplace);
        vm.expectRevert("Insufficient payment");
        royalties.payRoyalty{value: 0.01 ether}(tokenId); // Less than 5% of expected
    }

    function testPayRoyaltyNoRoyaltySet() public {
        uint256 tokenId = 1;

        vm.prank(marketplace);
        vm.expectRevert("No royalty set for this token");
        royalties.payRoyalty{value: 0.1 ether}(tokenId);
    }

    function testSupportsInterface() public {
        // Test ERC2981 interface support
        assertTrue(royalties.supportsInterface(0x2a55205a));
        
        // Test ERC165 interface support
        assertTrue(royalties.supportsInterface(0x01ffc9a7));
        
        // Test unsupported interface
        assertFalse(royalties.supportsInterface(0x12345678));
    }

    function testUpdateRoyalty() public {
        uint256 tokenId = 1;
        uint256 initialRoyalty = 500; // 5%
        uint256 updatedRoyalty = 750; // 7.5%

        // Set initial royalty
        royalties.setRoyalty(tokenId, artist, initialRoyalty);

        // Update royalty
        royalties.setRoyalty(tokenId, artist, updatedRoyalty);

        (address recipient, uint256 amount) = royalties.royaltyInfo(tokenId, 1000);
        assertEq(recipient, artist);
        assertEq(amount, 75); // 7.5% of 1000
    }

    function testFuzzRoyaltyCalculation(uint256 salePrice, uint256 royaltyBps) public {
        // Bound inputs to reasonable ranges
        salePrice = bound(salePrice, 1, type(uint256).max / 10000);
        royaltyBps = bound(royaltyBps, 0, 1000); // 0-10%

        uint256 tokenId = 1;
        royalties.setRoyalty(tokenId, artist, royaltyBps);

        (address recipient, uint256 amount) = royalties.royaltyInfo(tokenId, salePrice);
        
        assertEq(recipient, artist);
        assertEq(amount, (salePrice * royaltyBps) / 10000);
        assertLe(amount, salePrice); // Royalty should never exceed sale price
    }

    function testMultipleTokenRoyalties() public {
        address artist1 = makeAddr("artist1");
        address artist2 = makeAddr("artist2");
        
        royalties.setRoyalty(1, artist1, 500); // 5%
        royalties.setRoyalty(2, artist2, 750); // 7.5%

        (address recipient1, uint256 amount1) = royalties.royaltyInfo(1, 1000);
        (address recipient2, uint256 amount2) = royalties.royaltyInfo(2, 1000);

        assertEq(recipient1, artist1);
        assertEq(amount1, 50);
        assertEq(recipient2, artist2);
        assertEq(amount2, 75);
    }

    function testGasOptimization() public {
        uint256 tokenId = 1;
        royalties.setRoyalty(tokenId, artist, 500);

        uint256 gasBefore = gasleft();
        royalties.royaltyInfo(tokenId, 1000);
        uint256 gasUsed = gasBefore - gasleft();

        // Ensure gas usage is reasonable (adjust threshold as needed)
        assertLt(gasUsed, 5000);
    }

    receive() external payable {}
}