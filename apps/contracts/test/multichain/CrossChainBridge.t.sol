// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../../src/CrossChainBridge.sol";

contract CrossChainBridgeTest is Test {
    CrossChainBridge public bridge;
    address public owner;
    address public user;
    address public validator;

    uint256 constant ETHEREUM_CHAIN_ID = 1;
    uint256 constant POLYGON_CHAIN_ID = 137;
    uint256 constant BSC_CHAIN_ID = 56;

    event TokensLocked(
        address indexed user,
        uint256 amount,
        uint256 targetChainId,
        bytes32 indexed bridgeId
    );

    event TokensUnlocked(
        address indexed user,
        uint256 amount,
        uint256 sourceChainId,
        bytes32 indexed bridgeId
    );

    event ChainConfigured(uint256 indexed chainId, bool enabled);

    function setUp() public {
        owner = address(this);
        user = makeAddr("user");
        validator = makeAddr("validator");

        bridge = new CrossChainBridge();
        
        // Configure supported chains
        bridge.configureChain(ETHEREUM_CHAIN_ID, true);
        bridge.configureChain(POLYGON_CHAIN_ID, true);
        bridge.configureChain(BSC_CHAIN_ID, true);

        // Add validator
        bridge.addValidator(validator);

        // Give user some tokens
        vm.deal(user, 10 ether);
    }

    function testLockTokens() public {
        uint256 amount = 1 ether;
        uint256 targetChainId = POLYGON_CHAIN_ID;

        vm.prank(user);
        vm.expectEmit(true, false, false, true);
        emit TokensLocked(user, amount, targetChainId, bytes32(0));

        bytes32 bridgeId = bridge.lockTokens{value: amount}(targetChainId);
        
        assertNotEq(bridgeId, bytes32(0));
        assertEq(address(bridge).balance, amount);
    }

    function testLockTokensUnsupportedChain() public {
        uint256 amount = 1 ether;
        uint256 unsupportedChainId = 999;

        vm.prank(user);
        vm.expectRevert("Chain not supported");
        bridge.lockTokens{value: amount}(unsupportedChainId);
    }

    function testLockTokensZeroAmount() public {
        uint256 targetChainId = POLYGON_CHAIN_ID;

        vm.prank(user);
        vm.expectRevert("Amount must be greater than 0");
        bridge.lockTokens{value: 0}(targetChainId);
    }

    function testUnlockTokens() public {
        uint256 amount = 1 ether;
        uint256 sourceChainId = ETHEREUM_CHAIN_ID;
        bytes32 bridgeId = keccak256(abi.encodePacked(user, amount, block.timestamp));

        // First, lock some tokens to have balance in contract
        vm.prank(user);
        bridge.lockTokens{value: amount}(POLYGON_CHAIN_ID);

        uint256 userBalanceBefore = user.balance;

        vm.prank(validator);
        vm.expectEmit(true, false, false, true);
        emit TokensUnlocked(user, amount, sourceChainId, bridgeId);

        bridge.unlockTokens(user, amount, sourceChainId, bridgeId);

        assertEq(user.balance, userBalanceBefore + amount);
    }

    function testUnlockTokensOnlyValidator() public {
        uint256 amount = 1 ether;
        uint256 sourceChainId = ETHEREUM_CHAIN_ID;
        bytes32 bridgeId = keccak256(abi.encodePacked(user, amount, block.timestamp));

        vm.prank(user);
        vm.expectRevert("Only validator can unlock");
        bridge.unlockTokens(user, amount, sourceChainId, bridgeId);
    }

    function testUnlockTokensAlreadyProcessed() public {
        uint256 amount = 1 ether;
        uint256 sourceChainId = ETHEREUM_CHAIN_ID;
        bytes32 bridgeId = keccak256(abi.encodePacked(user, amount, block.timestamp));

        // Lock tokens first
        vm.prank(user);
        bridge.lockTokens{value: amount}(POLYGON_CHAIN_ID);

        // Unlock tokens first time
        vm.prank(validator);
        bridge.unlockTokens(user, amount, sourceChainId, bridgeId);

        // Try to unlock again with same bridgeId
        vm.prank(validator);
        vm.expectRevert("Bridge transaction already processed");
        bridge.unlockTokens(user, amount, sourceChainId, bridgeId);
    }

    function testConfigureChain() public {
        uint256 newChainId = 250; // Fantom

        vm.expectEmit(true, false, false, true);
        emit ChainConfigured(newChainId, true);

        bridge.configureChain(newChainId, true);
        assertTrue(bridge.supportedChains(newChainId));

        // Disable chain
        bridge.configureChain(newChainId, false);
        assertFalse(bridge.supportedChains(newChainId));
    }

    function testConfigureChainOnlyOwner() public {
        uint256 newChainId = 250;

        vm.prank(user);
        vm.expectRevert("Ownable: caller is not the owner");
        bridge.configureChain(newChainId, true);
    }

    function testAddValidator() public {
        address newValidator = makeAddr("newValidator");

        bridge.addValidator(newValidator);
        assertTrue(bridge.validators(newValidator));
    }

    function testRemoveValidator() public {
        bridge.removeValidator(validator);
        assertFalse(bridge.validators(validator));
    }

    function testValidatorManagementOnlyOwner() public {
        address newValidator = makeAddr("newValidator");

        vm.prank(user);
        vm.expectRevert("Ownable: caller is not the owner");
        bridge.addValidator(newValidator);

        vm.prank(user);
        vm.expectRevert("Ownable: caller is not the owner");
        bridge.removeValidator(validator);
    }

    function testCrossChainBridgingFlow() public {
        uint256 amount = 2 ether;
        
        // Step 1: User locks tokens on source chain (Ethereum)
        vm.prank(user);
        bytes32 bridgeId = bridge.lockTokens{value: amount}(POLYGON_CHAIN_ID);
        
        assertEq(address(bridge).balance, amount);
        
        // Step 2: Validator unlocks tokens on target chain (simulated)
        // In reality, this would happen on Polygon chain
        uint256 userBalanceBefore = user.balance;
        
        vm.prank(validator);
        bridge.unlockTokens(user, amount, ETHEREUM_CHAIN_ID, bridgeId);
        
        assertEq(user.balance, userBalanceBefore + amount);
    }

    function testFuzzLockUnlockTokens(uint256 amount) public {
        // Bound amount to reasonable range
        amount = bound(amount, 0.001 ether, 100 ether);
        
        // Give user enough balance
        vm.deal(user, amount * 2);
        
        uint256 targetChainId = POLYGON_CHAIN_ID;
        
        vm.prank(user);
        bytes32 bridgeId = bridge.lockTokens{value: amount}(targetChainId);
        
        uint256 userBalanceBefore = user.balance;
        
        vm.prank(validator);
        bridge.unlockTokens(user, amount, ETHEREUM_CHAIN_ID, bridgeId);
        
        assertEq(user.balance, userBalanceBefore + amount);
    }

    function testMultipleBridgeTransactions() public {
        uint256 amount1 = 1 ether;
        uint256 amount2 = 2 ether;
        
        // First transaction
        vm.prank(user);
        bytes32 bridgeId1 = bridge.lockTokens{value: amount1}(POLYGON_CHAIN_ID);
        
        // Second transaction  
        vm.prank(user);
        bytes32 bridgeId2 = bridge.lockTokens{value: amount2}(BSC_CHAIN_ID);
        
        assertNotEq(bridgeId1, bridgeId2);
        assertEq(address(bridge).balance, amount1 + amount2);
    }

    function testInsufficientContractBalance() public {
        uint256 amount = 1 ether;
        bytes32 bridgeId = keccak256(abi.encodePacked(user, amount, block.timestamp));
        
        // Try to unlock without sufficient contract balance
        vm.prank(validator);
        vm.expectRevert("Insufficient contract balance");
        bridge.unlockTokens(user, amount, ETHEREUM_CHAIN_ID, bridgeId);
    }

    function testEmergencyWithdraw() public {
        uint256 amount = 5 ether;
        
        // Lock some tokens
        vm.prank(user);
        bridge.lockTokens{value: amount}(POLYGON_CHAIN_ID);
        
        uint256 ownerBalanceBefore = owner.balance;
        
        // Emergency withdraw
        bridge.emergencyWithdraw();
        
        assertEq(owner.balance, ownerBalanceBefore + amount);
        assertEq(address(bridge).balance, 0);
    }

    function testEmergencyWithdrawOnlyOwner() public {
        vm.prank(user);
        vm.expectRevert("Ownable: caller is not the owner");
        bridge.emergencyWithdraw();
    }

    receive() external payable {}
}