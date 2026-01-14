// manifesto-token.sol - ERC-20 Token for Legacy Access
// Token gates access to the creator's knowledge and AI conversations
// Enables decentralized, permanent access to their wisdom

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * MANIFESTO TOKEN
 * Gates access to creator's legacy
 * - Burn to access content
 * - Stake for governance
 * - Earn yield from community usage
 */
contract ManifestoToken is ERC20, Ownable {
    // Metadata
    string public creatorName;
    string public creatorPhilosophy;
    uint256 public createdAt;
    
    // State
    bool public creatorAlive = true;
    uint256 public deathUnlockTime = 0;
    
    // Token economics
    uint256 public constant INITIAL_SUPPLY = 10_000_000 * 10**18;
    uint256 public burnedTokens = 0;
    
    // Access control
    mapping(address => uint256) public stakedTokens;
    mapping(address => bool) public hasAccess;
    mapping(bytes32 => uint256) public contentCost; // contentHash => tokenCost
    
    // Events
    event CreatorPassed(uint256 timestamp, string message);
    event ContentUnlocked(bytes32 indexed contentHash);
    event AccessGranted(address indexed user, bytes32 indexed contentHash);
    event TokensBurned(address indexed burner, uint256 amount);
    event TokensStaked(address indexed staker, uint256 amount);
    
    constructor(
        string memory _creatorName,
        string memory _philosophy,
        address _initialOwner
    ) ERC20("ManifestoToken", "MANI") {
        creatorName = _creatorName;
        creatorPhilosophy = _philosophy;
        createdAt = block.timestamp;
        
        // Mint initial supply
        _mint(_initialOwner, INITIAL_SUPPLY);
    }
    
    /**
     * SET ACCESS COST
     * Define how many tokens needed to access content
     */
    function setContentCost(
        bytes32 contentHash,
        uint256 tokenCost
    ) external onlyOwner {
        contentCost[contentHash] = tokenCost;
        emit ContentUnlocked(contentHash);
    }
    
    /**
     * ACCESS CONTENT BY BURNING TOKENS
     * Pay with tokens to read creator's knowledge
     * Tokens are burned (removed from circulation)
     */
    function accessContent(bytes32 contentHash) external {
        uint256 cost = contentCost[contentHash];
        require(cost > 0, "Content not found or free");
        require(
            balanceOf(msg.sender) >= cost,
            "Insufficient tokens to access"
        );
        
        // Burn tokens for access
        _burn(msg.sender, cost);
        burnedTokens += cost;
        
        // Grant access
        hasAccess[msg.sender] = true;
        
        emit TokensBurned(msg.sender, cost);
        emit AccessGranted(msg.sender, contentHash);
    }
    
    /**
     * STAKE TOKENS
     * Hold tokens long-term for governance rights
     * Earn rewards from community activity
     */
    function stakeTokens(uint256 amount) external {
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        
        // Transfer to contract
        _transfer(msg.sender, address(this), amount);
        stakedTokens[msg.sender] += amount;
        
        emit TokensStaked(msg.sender, amount);
    }
    
    /**
     * UNSTAKE TOKENS
     */
    function unstakeTokens(uint256 amount) external {
        require(stakedTokens[msg.sender] >= amount, "Insufficient staked amount");
        
        stakedTokens[msg.sender] -= amount;
        _transfer(address(this), msg.sender, amount);
    }
    
    /**
     * GET VOTING POWER
     * 1 staked token = 1 vote on legacy governance
     */
    function getVotingPower(address voter) public view returns (uint256) {
        return stakedTokens[voter];
    }
    
    /**
     * ON CREATOR DEATH
     * Permanently unlock all content
     * Transfer governance to community
     * Stop burning, enable free access
     */
    function declareCreatorPassed(string memory farewell) external onlyOwner {
        require(creatorAlive, "Already declared");
        
        creatorAlive = false;
        deathUnlockTime = block.timestamp;
        
        // All content becomes free
        contentCost[keccak256("all")] = 0;
        
        // Enable universal access
        for (address user in stakedTokens) {
            hasAccess[user] = true;
        }
        
        emit CreatorPassed(block.timestamp, farewell);
    }
    
    /**
     * FREE ACCESS AFTER DEATH
     * No tokens needed, wisdom is public
     */
    function canAccessFree() public view returns (bool) {
        if (!creatorAlive) {
            return true; // Free after death
        }
        if (hasAccess[msg.sender]) {
            return true; // Already purchased access
        }
        return false;
    }
    
    /**
     * GET CREATOR INFO
     */
    function getCreatorInfo() external view returns (
        string memory name,
        string memory philosophy,
        uint256 created,
        bool alive,
        uint256 deathTime,
        uint256 burned
    ) {
        return (
            creatorName,
            creatorPhilosophy,
            createdAt,
            creatorAlive,
            deathUnlockTime,
            burnedTokens
        );
    }
    
    /**
     * TOTAL GOVERNANCE POWER
     */
    function totalGovernancePower() external view returns (uint256) {
        return balanceOf(address(this)); // Staked tokens
    }
}

/**
 * MANIFESTO DAO
 * Community governance of creator's legacy
 */
contract ManifestoDAO {
    ManifestoToken public token;
    
    struct Proposal {
        uint256 id;
        string description;
        uint256 yesVotes;
        uint256 noVotes;
        uint256 endTime;
        bool executed;
    }
    
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    uint256 public proposalCount = 0;
    
    event ProposalCreated(uint256 indexed id, string description);
    event Voted(uint256 indexed proposalId, address voter, bool support);
    event ProposalExecuted(uint256 indexed id);
    
    constructor(address tokenAddress) {
        token = ManifestoToken(tokenAddress);
    }
    
    /**
     * CREATE PROPOSAL
     * Community votes on legacy decisions
     */
    function createProposal(
        string memory description,
        uint256 durationDays
    ) external returns (uint256) {
        require(
            token.getVotingPower(msg.sender) > 0,
            "Must be token holder"
        );
        
        uint256 id = proposalCount++;
        proposals[id] = Proposal({
            id: id,
            description: description,
            yesVotes: 0,
            noVotes: 0,
            endTime: block.timestamp + (durationDays * 1 days),
            executed: false
        });
        
        emit ProposalCreated(id, description);
        return id;
    }
    
    /**
     * VOTE ON PROPOSAL
     */
    function vote(uint256 proposalId, bool support) external {
        require(!hasVoted[proposalId][msg.sender], "Already voted");
        require(block.timestamp <= proposals[proposalId].endTime, "Voting ended");
        
        uint256 power = token.getVotingPower(msg.sender);
        require(power > 0, "No voting power");
        
        if (support) {
            proposals[proposalId].yesVotes += power;
        } else {
            proposals[proposalId].noVotes += power;
        }
        
        hasVoted[proposalId][msg.sender] = true;
        
        emit Voted(proposalId, msg.sender, support);
    }
    
    /**
     * EXECUTE PROPOSAL
     * After voting ends, proposal can be executed
     */
    function executeProposal(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];
        require(!proposal.executed, "Already executed");
        require(block.timestamp > proposal.endTime, "Voting still active");
        require(proposal.yesVotes > proposal.noVotes, "Proposal rejected");
        
        proposal.executed = true;
        emit ProposalExecuted(proposalId);
    }
}

/**
 * LEGACY ACCESS CONTROL
 * Smart contract to gate access to content
 */
contract LegacyAccessControl {
    ManifestoToken public token;
    
    struct Content {
        bytes32 hash;
        string title;
        uint256 unlockTime; // 0 = always free after death
        uint256 tokenCost;
        bool isPublic;
    }
    
    mapping(bytes32 => Content) public content;
    mapping(address => mapping(bytes32 => bool)) public userAccess;
    
    event ContentRegistered(bytes32 indexed hash, string title, uint256 cost);
    event AccessGranted(address indexed user, bytes32 indexed content);
    
    constructor(address tokenAddress) {
        token = ManifestoToken(tokenAddress);
    }
    
    /**
     * REGISTER CONTENT
     * Add entry to access control
     */
    function registerContent(
        bytes32 hash,
        string memory title,
        uint256 tokenCost,
        uint256 unlockTime
    ) external {
        content[hash] = Content({
            hash: hash,
            title: title,
            unlockTime: unlockTime,
            tokenCost: tokenCost,
            isPublic: tokenCost == 0
        });
        
        emit ContentRegistered(hash, title, tokenCost);
    }
    
    /**
     * CHECK IF USER HAS ACCESS
     */
    function hasAccess(address user, bytes32 contentHash) 
        external 
        view 
        returns (bool) 
    {
        // Already purchased
        if (userAccess[user][contentHash]) return true;
        
        // Free content
        if (content[contentHash].tokenCost == 0) return true;
        
        // After death, everything free
        if (!token.creatorAlive()) return true;
        
        return false;
    }
    
    /**
     * GRANT ACCESS
     * Called after token burn or payment
     */
    function grantAccess(address user, bytes32 contentHash) external {
        require(msg.sender == address(token), "Only token contract");
        userAccess[user][contentHash] = true;
        emit AccessGranted(user, contentHash);
    }
}
