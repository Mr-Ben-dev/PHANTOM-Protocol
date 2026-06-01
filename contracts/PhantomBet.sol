// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import { FHE, InEuint64, InEbool, euint64, ebool } from "@fhenixprotocol/cofhe-contracts/FHE.sol";
import "./PhantomACL.sol";

/**
 * @title PhantomBet
 * @notice PHANTOM Protocol — Binary Prediction Market with FHE + ETH collateral.
 *
 *  ETH stakes fund real payouts. Pool routing uses FHE.select on encrypted gwei amounts.
 *  Winners reveal side via CoFHE then claim proportional ETH (97% pool, 3% protocol fee).
 */
contract PhantomBet is PhantomACL {

    struct Market {
        string   question;
        uint256  deadline;
        uint256  resolutionTime;
        euint64  yesPool;
        euint64  noPool;
        uint256  bettorCount;
        uint256  totalEth;
        bool     resolved;
        bool     canceled;
        bool     outcome;
        address  creator;
        bool     poolsRevealed;
        uint64   revealedYesPool;
        uint64   revealedNoPool;
        uint64   revealedTotalPool;
    }

    mapping(uint256 => Market)                                public  markets;
    mapping(uint256 => mapping(address => euint64))          private bets;
    mapping(uint256 => mapping(address => ebool))            private betSides;
    mapping(uint256 => mapping(address => uint256))          public  ethStakes;
    mapping(uint256 => mapping(address => bool))             public  hasBet;
    mapping(uint256 => mapping(address => bool))             public  hasClaimed;
    mapping(uint256 => mapping(address => bool))             public  sideRevealed;
    mapping(uint256 => mapping(address => bool))             public  revealedSides;
    mapping(uint256 => bool)                                 private marketFeeCollected;

    uint256 public marketCount;
    uint256 public pendingFees;

    event MarketCreated(uint256 indexed marketId, string question, uint256 deadline, uint256 resolutionTime, address creator);
    event BetPlaced(uint256 indexed marketId, address indexed bettor, uint256 ethStake);
    event MarketResolved(uint256 indexed marketId, bool outcome);
    event PoolsRevealed(uint256 indexed marketId, uint64 yesPool, uint64 noPool, uint64 totalPool);
    event SideRevealed(uint256 indexed marketId, address indexed bettor, bool isYes);
    event PayoutClaimed(uint256 indexed marketId, address indexed bettor, uint256 amount);
    event MarketCanceled(uint256 indexed marketId, string reason);
    event FeesWithdrawn(address indexed to, uint256 amount);

    constructor() {
        owner = msg.sender;
        roles[msg.sender] = Role.RESOLVER;
    }

    receive() external payable {}

    function withdrawFees(address payable to) external onlyOwner {
        require(to != address(0), "PhantomBet: zero address");
        uint256 amount = pendingFees;
        pendingFees = 0;
        (bool ok,) = to.call{value: amount}("");
        require(ok, "PhantomBet: fee transfer failed");
        emit FeesWithdrawn(to, amount);
    }

    function createMarket(
        string  calldata _question,
        uint256          _deadline,
        uint256          _resolutionTime
    ) external returns (uint256 marketId) {
        require(bytes(_question).length > 0,         "Empty question");
        require(_deadline > block.timestamp,          "Deadline in past");
        require(_resolutionTime > _deadline,          "Resolution before deadline");

        marketId = marketCount++;
        Market storage m = markets[marketId];
        m.question       = _question;
        m.deadline       = _deadline;
        m.resolutionTime = _resolutionTime;
        m.creator        = msg.sender;
        m.yesPool = FHE.asEuint64(0);
        m.noPool  = FHE.asEuint64(0);
        FHE.allowThis(m.yesPool);
        FHE.allowThis(m.noPool);

        emit MarketCreated(marketId, _question, _deadline, _resolutionTime, msg.sender);
    }

    /**
     * @notice ETH stake + trivially encrypted YES/NO side (primary UX path).
     */
    function placeBetSimple(
        uint256 _marketId,
        bool    isYes
    ) external payable {
        Market storage m = markets[_marketId];
        require(block.timestamp < m.deadline, "Betting closed");
        require(!m.resolved,                   "Market resolved");
        require(!m.canceled,                   "Market canceled");
        require(!hasBet[_marketId][msg.sender], "Already bet");
        require(msg.value > 0,                 "No stake");

        uint64 amountGwei = uint64(msg.value / 1 gwei);
        require(amountGwei > 0, "Stake too small");

        ebool side = FHE.asEbool(isYes);
        FHE.allowThis(side);
        FHE.allow(side, msg.sender);
        betSides[_marketId][msg.sender] = side;

        euint64 gwei64 = FHE.asEuint64(amountGwei);
        _accumulateBet(_marketId, m, gwei64, side, msg.value);

        emit BetPlaced(_marketId, msg.sender, msg.value);
    }

    /**
     * @notice Full FHE bet — encrypted amount + side with matching ETH collateral.
     */
    function placeBet(
        uint256        _marketId,
        InEuint64 calldata _encAmount,
        InEbool   calldata _encSide
    ) external payable {
        Market storage m = markets[_marketId];
        require(block.timestamp < m.deadline, "Betting closed");
        require(!m.resolved,                   "Market resolved");
        require(!m.canceled,                   "Market canceled");
        require(!hasBet[_marketId][msg.sender], "Already bet");
        require(msg.value > 0,                 "No stake");

        euint64 amount = FHE.asEuint64(_encAmount);
        ebool   side   = FHE.asEbool(_encSide);

        betSides[_marketId][msg.sender] = side;
        FHE.allow(betSides[_marketId][msg.sender], msg.sender);
        FHE.allowThis(betSides[_marketId][msg.sender]);

        _accumulateBet(_marketId, m, amount, side, msg.value);

        emit BetPlaced(_marketId, msg.sender, msg.value);
    }

    function _accumulateBet(
        uint256        _marketId,
        Market storage m,
        euint64        amount,
        ebool          side,
        uint256        stake
    ) internal {
        bets[_marketId][msg.sender]   = amount;
        hasBet[_marketId][msg.sender] = true;
        ethStakes[_marketId][msg.sender] = stake;
        m.totalEth += stake;

        FHE.allow(bets[_marketId][msg.sender], msg.sender);
        FHE.allowThis(bets[_marketId][msg.sender]);

        euint64 zero   = FHE.asEuint64(0);
        euint64 yesAdd = FHE.select(side, amount, zero);
        euint64 noAdd  = FHE.select(side, zero, amount);
        FHE.allowThis(yesAdd);
        FHE.allowThis(noAdd);

        m.yesPool = FHE.add(m.yesPool, yesAdd);
        m.noPool  = FHE.add(m.noPool, noAdd);
        FHE.allowThis(m.yesPool);
        FHE.allowThis(m.noPool);

        m.bettorCount++;
    }

    function resolveMarket(uint256 _marketId, bool _outcome) external {
        Market storage m = markets[_marketId];
        require(msg.sender == m.creator || msg.sender == owner, "Not authorized");
        require(block.timestamp >= m.deadline, "Betting still open");
        require(!m.resolved,                    "Already resolved");
        require(!m.canceled,                      "Market canceled");

        m.resolved = true;
        m.outcome  = _outcome;

        FHE.allowPublic(m.yesPool);
        FHE.allowPublic(m.noPool);

        if (!marketFeeCollected[_marketId]) {
            pendingFees += m.totalEth * 3 / 100;
            marketFeeCollected[_marketId] = true;
        }

        emit MarketResolved(_marketId, _outcome);
    }

    function revealPools(
        uint256          _marketId,
        euint64          yesCtHash,
        uint64           yesPlaintext,
        bytes   calldata yesSignature,
        euint64          noCtHash,
        uint64           noPlaintext,
        bytes   calldata noSignature
    ) external {
        Market storage m = markets[_marketId];
        require(m.resolved,       "Not resolved");
        require(!m.poolsRevealed, "Already revealed");

        FHE.publishDecryptResult(yesCtHash, yesPlaintext, yesSignature);
        FHE.publishDecryptResult(noCtHash,  noPlaintext,  noSignature);

        m.revealedYesPool   = yesPlaintext;
        m.revealedNoPool    = noPlaintext;
        m.revealedTotalPool = yesPlaintext + noPlaintext;
        m.poolsRevealed     = true;

        emit PoolsRevealed(_marketId, yesPlaintext, noPlaintext, m.revealedTotalPool);
    }

    function revealMySide(
        uint256  _marketId,
        bool     isYes,
        bytes calldata sig
    ) external {
        require(hasBet[_marketId][msg.sender], "No bet placed");
        require(!sideRevealed[_marketId][msg.sender], "Already revealed");
        require(markets[_marketId].resolved, "Not resolved");

        FHE.publishDecryptResult(betSides[_marketId][msg.sender], isYes, sig);

        revealedSides[_marketId][msg.sender] = isYes;
        sideRevealed[_marketId][msg.sender]  = true;

        emit SideRevealed(_marketId, msg.sender, isYes);
    }

    function claimPayout(uint256 _marketId) external {
        Market storage m = markets[_marketId];
        require(m.resolved,                        "Not resolved");
        require(m.poolsRevealed,                   "Pools not revealed");
        require(hasBet[_marketId][msg.sender],      "No bet placed");
        require(!hasClaimed[_marketId][msg.sender], "Already claimed");
        require(sideRevealed[_marketId][msg.sender], "Side not revealed");
        require(revealedSides[_marketId][msg.sender] == m.outcome, "Wrong side");

        hasClaimed[_marketId][msg.sender] = true;

        uint256 stake   = ethStakes[_marketId][msg.sender];
        uint256 winPool = m.outcome
            ? uint256(m.revealedYesPool) * 1 gwei
            : uint256(m.revealedNoPool)  * 1 gwei;
        require(winPool > 0, "Empty winning pool");

        uint256 netPool = m.totalEth * 97 / 100;
        uint256 payout  = stake * netPool / winPool;

        (bool ok,) = payable(msg.sender).call{value: payout}("");
        require(ok, "PhantomBet: payout failed");

        emit PayoutClaimed(_marketId, msg.sender, payout);
    }

    function cancelMarket(uint256 _marketId, string calldata reason) external {
        Market storage m = markets[_marketId];
        require(msg.sender == m.creator || msg.sender == owner, "Not authorized");
        require(!m.resolved, "Already resolved");
        require(!m.canceled, "Already canceled");
        m.canceled = true;
        emit MarketCanceled(_marketId, reason);
    }

    function refundCanceledMarket(uint256 _marketId) external {
        Market storage m = markets[_marketId];
        require(m.canceled, "Not canceled");
        require(hasBet[_marketId][msg.sender], "No bet placed");
        require(!hasClaimed[_marketId][msg.sender], "Already refunded");

        hasClaimed[_marketId][msg.sender] = true;
        uint256 refund = ethStakes[_marketId][msg.sender];
        require(refund > 0, "Nothing to refund");

        (bool ok,) = payable(msg.sender).call{value: refund}("");
        require(ok, "PhantomBet: refund failed");

        emit PayoutClaimed(_marketId, msg.sender, refund);
    }

    function getMyBet(uint256 _marketId) external view returns (euint64) {
        require(hasBet[_marketId][msg.sender], "No bet placed");
        return bets[_marketId][msg.sender];
    }

    function getMyBetSide(uint256 _marketId) external view returns (ebool) {
        require(hasBet[_marketId][msg.sender], "No bet placed");
        return betSides[_marketId][msg.sender];
    }

    function getYesPool(uint256 _marketId) external view returns (euint64) {
        return markets[_marketId].yesPool;
    }

    function getNoPool(uint256 _marketId) external view returns (euint64) {
        return markets[_marketId].noPool;
    }

    function getMarketCount() external view returns (uint256) {
        return marketCount;
    }

    function getMarketEth(uint256 _marketId) external view returns (uint256 totalEth, uint256 userStake) {
        return (markets[_marketId].totalEth, ethStakes[_marketId][msg.sender]);
    }

    function getMarketInfo(uint256 _marketId) external view returns (
        string  memory question,
        uint256        deadline,
        uint256        resolutionTime,
        uint256        bettorCount,
        uint256        totalEth,
        bool           resolved,
        bool           canceled,
        bool           outcome,
        address        creator,
        bool           poolsRevealed,
        uint64         revealedYesPool,
        uint64         revealedNoPool,
        uint64         revealedTotalPool
    ) {
        Market storage m = markets[_marketId];
        return (
            m.question, m.deadline, m.resolutionTime, m.bettorCount, m.totalEth,
            m.resolved, m.canceled, m.outcome, m.creator, m.poolsRevealed,
            m.revealedYesPool, m.revealedNoPool, m.revealedTotalPool
        );
    }
}
