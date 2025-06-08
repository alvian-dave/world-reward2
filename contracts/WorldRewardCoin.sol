// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract WorldRewardCoin is ERC20, Ownable, ReentrancyGuard {
    uint256 public constant DECIMALS = 18;
    uint256 public constant INITIAL_SUPPLY = 1000000000 * 10**DECIMALS; // 1 billion WRC
    
    // Staking variables
    uint256 public constant STAKING_APY = 70; // 70% APY
    uint256 public constant SECONDS_PER_YEAR = 365 * 24 * 60 * 60;
    
    // Reward rates per second
    uint256 public constant VERIFIED_REWARD_RATE = 24000000000000; // 0.000024 WRC per second (24 * 10^12 wei)
    uint256 public constant UNVERIFIED_REWARD_RATE = 12000000000000; // 0.000012 WRC per second (12 * 10^12 wei)
    
    struct UserInfo {
        uint256 stakedAmount;
        uint256 lastStakeTime;
        uint256 lastClaimTime;
        uint256 totalClaimed;
        bool isVerified;
        string nullifierHash;
    }
    
    mapping(string => UserInfo) public users;
    mapping(string => bool) public registeredUsers;
    
    uint256 public totalStaked;
    
    event UserRegistered(string nullifierHash, bool isVerified);
    event Staked(string nullifierHash, uint256 amount);
    event Unstaked(string nullifierHash, uint256 amount);
    event RewardClaimed(string nullifierHash, uint256 amount);
    event RewardCompounded(string nullifierHash, uint256 amount);
    
    constructor() ERC20("World Reward Coin", "WRC") {
        _mint(msg.sender, INITIAL_SUPPLY);
    }
    
    function registerUser(string memory nullifierHash, bool isVerified) external onlyOwner {
        require(!registeredUsers[nullifierHash], "User already registered");
        
        users[nullifierHash] = UserInfo({
            stakedAmount: 0,
            lastStakeTime: block.timestamp,
            lastClaimTime: block.timestamp,
            totalClaimed: 0,
            isVerified: isVerified,
            nullifierHash: nullifierHash
        });
        
        registeredUsers[nullifierHash] = true;
        emit UserRegistered(nullifierHash, isVerified);
    }
    
    function updateUserVerification(string memory nullifierHash, bool isVerified) external onlyOwner {
        require(registeredUsers[nullifierHash], "User not registered");
        users[nullifierHash].isVerified = isVerified;
    }
    
    function stake(string memory nullifierHash, uint256 amount) external nonReentrant {
        require(registeredUsers[nullifierHash], "User not registered");
        require(amount > 0, "Amount must be greater than 0");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        
        UserInfo storage user = users[nullifierHash];
        
        // Compound existing rewards before staking
        if (user.stakedAmount > 0) {
            uint256 pendingReward = calculateStakingReward(nullifierHash);
            if (pendingReward > 0) {
                user.stakedAmount += pendingReward;
                emit RewardCompounded(nullifierHash, pendingReward);
            }
        }
        
        _transfer(msg.sender, address(this), amount);
        user.stakedAmount += amount;
        user.lastStakeTime = block.timestamp;
        totalStaked += amount;
        
        emit Staked(nullifierHash, amount);
    }
    
    function unstake(string memory nullifierHash) external nonReentrant {
        require(registeredUsers[nullifierHash], "User not registered");
        
        UserInfo storage user = users[nullifierHash];
        require(user.stakedAmount > 0, "No staked amount");
        
        // Calculate and add staking rewards
        uint256 stakingReward = calculateStakingReward(nullifierHash);
        uint256 totalAmount = user.stakedAmount + stakingReward;
        
        totalStaked -= user.stakedAmount;
        user.stakedAmount = 0;
        user.lastStakeTime = block.timestamp;
        
        _transfer(address(this), msg.sender, totalAmount);
        
        emit Unstaked(nullifierHash, totalAmount);
        if (stakingReward > 0) {
            emit RewardClaimed(nullifierHash, stakingReward);
        }
    }
    
    function claimStakingReward(string memory nullifierHash) external nonReentrant {
        require(registeredUsers[nullifierHash], "User not registered");
        
        uint256 reward = calculateStakingReward(nullifierHash);
        require(reward > 0, "No reward available");
        
        UserInfo storage user = users[nullifierHash];
        user.lastStakeTime = block.timestamp;
        user.totalClaimed += reward;
        
        _transfer(address(this), msg.sender, reward);
        emit RewardClaimed(nullifierHash, reward);
    }
    
    function compoundStakingReward(string memory nullifierHash) external nonReentrant {
        require(registeredUsers[nullifierHash], "User not registered");
        
        uint256 reward = calculateStakingReward(nullifierHash);
        require(reward > 0, "No reward available");
        
        UserInfo storage user = users[nullifierHash];
        user.stakedAmount += reward;
        user.lastStakeTime = block.timestamp;
        totalStaked += reward;
        
        emit RewardCompounded(nullifierHash, reward);
    }
    
    function claimTimeReward(string memory nullifierHash, uint256 amount) external onlyOwner {
        require(registeredUsers[nullifierHash], "User not registered");
        require(amount > 0, "Amount must be greater than 0");
        
        UserInfo storage user = users[nullifierHash];
        user.lastClaimTime = block.timestamp;
        user.totalClaimed += amount;
        
        _mint(msg.sender, amount);
        emit RewardClaimed(nullifierHash, amount);
    }
    
    function calculateStakingReward(string memory nullifierHash) public view returns (uint256) {
        if (!registeredUsers[nullifierHash]) return 0;
        
        UserInfo memory user = users[nullifierHash];
        if (user.stakedAmount == 0) return 0;
        
        uint256 timeElapsed = block.timestamp - user.lastStakeTime;
        uint256 annualReward = (user.stakedAmount * STAKING_APY) / 100;
        uint256 reward = (annualReward * timeElapsed) / SECONDS_PER_YEAR;
        
        return reward;
    }
    
    function calculateTimeReward(string memory nullifierHash) public view returns (uint256) {
        if (!registeredUsers[nullifierHash]) return 0;
        
        UserInfo memory user = users[nullifierHash];
        uint256 timeElapsed = block.timestamp - user.lastClaimTime;
        uint256 rewardRate = user.isVerified ? VERIFIED_REWARD_RATE : UNVERIFIED_REWARD_RATE;
        
        return timeElapsed * rewardRate;
    }
    
    function getUserInfo(string memory nullifierHash) external view returns (
        uint256 stakedAmount,
        uint256 stakingReward,
        uint256 timeReward,
        uint256 totalClaimed,
        bool isVerified,
        uint256 lastStakeTime,
        uint256 lastClaimTime
    ) {
        UserInfo memory user = users[nullifierHash];
        return (
            user.stakedAmount,
            calculateStakingReward(nullifierHash),
            calculateTimeReward(nullifierHash),
            user.totalClaimed,
            user.isVerified,
            user.lastStakeTime,
            user.lastClaimTime
        );
    }
    
    // Emergency functions
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = balanceOf(address(this));
        _transfer(address(this), owner(), balance);
    }
    
    function mintTokens(uint256 amount) external onlyOwner {
        _mint(owner(), amount);
    }
}