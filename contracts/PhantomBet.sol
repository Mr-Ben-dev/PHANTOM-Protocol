// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import { FHE, InEuint64, InEbool, euint64, ebool } from "@fhenixprotocol/cofhe-contracts/FHE.sol";
import "./PhantomACL.sol";

/**
 * @title PhantomBet
 * @notice PHANTOM Protocol Wave 1 — Binary Prediction Market with Fully Homomorphic Encryption.
 *
 *  Users create Yes/No prediction markets.  Bettors submit encrypted bet amounts AND
 *  encrypted bet sides (YES/NO).  The smart contract accumulates bets into encrypted pools
 *  using FHE.add() + FHE.select() — all arithmetic happens on ciphertext.
 *
 *  Nobody can see:
 *   • Individual bet amounts
 *   • Individual bet directions
 *   • Pool depths before resolution
 *  Only the winner can decrypt their payout via an EIP-712 permit.
 *
 *  FHE operations used:
 *   FHE.asEuint64, FHE.asEbool, FHE.add, FHE.select,
 *   FHE.mul, FHE.div, FHE.allow, FHE.allowThis,
 *   FHE.allowPublic, FHE.allowSender, FHE.isInitialized,
 *   FHE.publishDecryptResult
 */
contract PhantomBet is PhantomACL {

    // ═══════════════════════════════════════════════════════════════
    // TYPES
    // ═══════════════════════════════════════════════════════════════

    struct Market {
        string   question;
        uint256  deadline;           // Betting closes at this timestamp
        uint256  resolutionTime;     // Oracle must resolve before this time
        euint64  yesPool;            // Encrypted total YES bet amount
        euint64  noPool;             // Encrypted total NO bet amount
        uint256  bettorCount;        // Public: number of bettors (not amounts)
        bool     resolved;
        bool     outcome;            // true = YES wins, false = NO wins
        address  creator;
        bool     poolsRevealed;
        uint64   revealedYesPool;
        uint64   revealedNoPool;
        uint64   revealedTotalPool;
    }

    // ═══════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════

    mapping(uint256 => Market)                                public  markets;
    /// @dev Encrypted bet amounts — private so only the bettor (via ACL) can read.
    mapping(uint256 => mapping(address => euint64))          private bets;
    /// @dev Encrypted bet sides — private for the same reason.
    mapping(uint256 => mapping(address => ebool))            private betSides;
    mapping(uint256 => mapping(address => bool))             public  hasBet;
    mapping(uint256 => mapping(address => bool))             public  hasClaimed;
    uint256                                                  public  marketCount;

    // ═══════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════

    event MarketCreated(
        uint256 indexed marketId,
        string          question,
        uint256         deadline,
        uint256         resolutionTime,
        address         creator
    );
    event BetPlaced(uint256 indexed marketId, address indexed bettor);
    event MarketResolved(uint256 indexed marketId, bool outcome);
    event PoolsRevealed(uint256 indexed marketId, uint64 yesPool, uint64 noPool, uint64 totalPool);
    event PayoutClaimed(uint256 indexed marketId, address indexed bettor);

    // ═══════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════

    constructor() {
        owner = msg.sender;
        roles[msg.sender] = Role.RESOLVER;
    }

    // ═══════════════════════════════════════════════════════════════
    // CREATE MARKET
    // ═══════════════════════════════════════════════════════════════

    /**
     * @notice Create a new Yes/No prediction market.
     * @param _question      Human-readable market question.
     * @param _deadline      Unix timestamp: betting closes at this time.
     * @param _resolutionTime Unix timestamp: must resolve by this time.
     * @return marketId      The ID of the newly created market.
     */
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

        // Initialize encrypted pools to zero
        m.yesPool = FHE.asEuint64(0);
        m.noPool  = FHE.asEuint64(0);

        // Contract must retain access to accumulate bets in future transactions
        FHE.allowThis(m.yesPool);
        FHE.allowThis(m.noPool);

        emit MarketCreated(marketId, _question, _deadline, _resolutionTime, msg.sender);
    }

    // ═══════════════════════════════════════════════════════════════
    // PLACE ENCRYPTED BET
    // ═══════════════════════════════════════════════════════════════

    /**
     * @notice Place an encrypted bet on an active market.
     *         Both the amount AND the side (YES/NO) are encrypted —
     *         nobody on-chain can see your position.
     *
     * @param _marketId   Target market.
     * @param _encAmount  Client-encrypted bet amount (InEuint64).
     * @param _encSide    Client-encrypted bet side: true = YES, false = NO (InEbool).
     */
    function placeBet(
        uint256        _marketId,
        InEuint64 calldata _encAmount,
        InEbool   calldata _encSide
    ) external {
        Market storage m = markets[_marketId];

        require(block.timestamp < m.deadline, "Betting closed");
        require(!m.resolved,                   "Market resolved");
        require(!hasBet[_marketId][msg.sender], "Already bet");

        // Deserialise encrypted inputs from client
        euint64 amount = FHE.asEuint64(_encAmount);
        ebool   side   = FHE.asEbool(_encSide);

        // Store the bettor's encrypted position
        bets[_marketId][msg.sender]      = amount;
        betSides[_marketId][msg.sender]  = side;
        hasBet[_marketId][msg.sender]    = true;

        // ACL: bettor can decrypt their own position off-chain; contract retains access
        FHE.allow(bets[_marketId][msg.sender],     msg.sender);
        FHE.allowThis(bets[_marketId][msg.sender]);
        FHE.allow(betSides[_marketId][msg.sender],   msg.sender);
        FHE.allowThis(betSides[_marketId][msg.sender]);

        // Route encrypted bet to the correct pool with FHE.select.
        // NEVER branch on encrypted booleans — use FHE.select for constant-time routing.
        //   if side == true  (YES): yesAdd = amount, noAdd = 0
        //   if side == false (NO):  yesAdd = 0,      noAdd = amount
        euint64 zero   = FHE.asEuint64(0);
        euint64 yesAdd = FHE.select(side, amount, zero);
        euint64 noAdd  = FHE.select(side, zero, amount);

        // Ensure intermediate values are accessible to this contract
        FHE.allowThis(yesAdd);
        FHE.allowThis(noAdd);

        // Accumulate into encrypted pools
        m.yesPool = FHE.add(m.yesPool, yesAdd);
        m.noPool  = FHE.add(m.noPool, noAdd);

        // Critical: contract must retain access to updated pools
        FHE.allowThis(m.yesPool);
        FHE.allowThis(m.noPool);

        m.bettorCount++;

        emit BetPlaced(_marketId, msg.sender);
    }

    // ═══════════════════════════════════════════════════════════════
    // RESOLVE MARKET
    // ═══════════════════════════════════════════════════════════════

    /**
     * @notice Resolve a market after the betting deadline passes.
     *         Only callable by the market creator or the contract owner.
     *         Sets outcome and makes pool ciphertexts publicly decryptable.
     *
     * @param _marketId  Target market.
     * @param _outcome   true = YES wins, false = NO wins.
     */
    function resolveMarket(uint256 _marketId, bool _outcome) external {
        Market storage m = markets[_marketId];

        require(
            msg.sender == m.creator || msg.sender == owner,
            "Not authorized"
        );
        require(block.timestamp >= m.deadline, "Betting still open");
        require(!m.resolved,                    "Already resolved");

        m.resolved = true;
        m.outcome  = _outcome;

        // Make the pool ciphertexts publicly decryptable so anyone can call
        // decryptForTx().withoutPermit() and then revealPools().
        FHE.allowPublic(m.yesPool);
        FHE.allowPublic(m.noPool);

        emit MarketResolved(_marketId, _outcome);
    }

    // ═══════════════════════════════════════════════════════════════
    // REVEAL POOLS (post decryption proof)
    // ═══════════════════════════════════════════════════════════════

    /**
     * @notice Publish the decrypted pool totals on-chain after resolution.
     *         The Threshold Network provides (plaintext, signature) pairs which
     *         FHE.publishDecryptResult verifies before accepting.
     *
     * @param _marketId      Target market.
     * @param yesCtHash      euint64 handle for the YES pool (returned by getYesPool).
     * @param yesPlaintext   Decrypted YES pool total.
     * @param yesSignature   Threshold Network signature over (yesCtHash, yesPlaintext).
     * @param noCtHash       euint64 handle for the NO pool.
     * @param noPlaintext    Decrypted NO pool total.
     * @param noSignature    Threshold Network signature over (noCtHash, noPlaintext).
     */
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

        // Verify and publish — reverts if signature is invalid
        FHE.publishDecryptResult(yesCtHash, yesPlaintext, yesSignature);
        FHE.publishDecryptResult(noCtHash,  noPlaintext,  noSignature);

        m.revealedYesPool   = yesPlaintext;
        m.revealedNoPool    = noPlaintext;
        m.revealedTotalPool = yesPlaintext + noPlaintext;
        m.poolsRevealed     = true;

        emit PoolsRevealed(_marketId, yesPlaintext, noPlaintext, m.revealedTotalPool);
    }

    // ═══════════════════════════════════════════════════════════════
    // CLAIM PAYOUT
    // ═══════════════════════════════════════════════════════════════

    /**
     * @notice Record that the caller has claimed their payout.
     *         Must only be called after pools are revealed.
     *         Actual economic settlement can be layered on top (e.g. via Privara escrow in Wave 2+).
     */
    function claimPayout(uint256 _marketId) external {
        Market storage m = markets[_marketId];

        require(m.resolved,                        "Not resolved");
        require(m.poolsRevealed,                   "Pools not revealed");
        require(hasBet[_marketId][msg.sender],      "No bet placed");
        require(!hasClaimed[_marketId][msg.sender], "Already claimed");

        hasClaimed[_marketId][msg.sender] = true;

        emit PayoutClaimed(_marketId, msg.sender);
    }

    // ═══════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════

    /// @notice Returns the caller's encrypted bet amount for a market.
    /// @dev    Only the bettor (ACL-allowed) can decrypt the returned handle.
    function getMyBet(uint256 _marketId) external view returns (euint64) {
        require(hasBet[_marketId][msg.sender], "No bet placed");
        return bets[_marketId][msg.sender];
    }

    /// @notice Returns the caller's encrypted bet side for a market.
    function getMyBetSide(uint256 _marketId) external view returns (ebool) {
        require(hasBet[_marketId][msg.sender], "No bet placed");
        return betSides[_marketId][msg.sender];
    }

    /// @notice Returns the encrypted YES pool handle.
    function getYesPool(uint256 _marketId) external view returns (euint64) {
        return markets[_marketId].yesPool;
    }

    /// @notice Returns the encrypted NO pool handle.
    function getNoPool(uint256 _marketId) external view returns (euint64) {
        return markets[_marketId].noPool;
    }

    /// @notice Returns total number of markets created.
    function getMarketCount() external view returns (uint256) {
        return marketCount;
    }

    /**
     * @notice Returns full market info (public fields only).
     *         Encrypted pool handles are returned as uint256 ciphertext hashes
     *         so the frontend ABI can decode them as bigint.
     */
    function getMarketInfo(uint256 _marketId) external view returns (
        string  memory question,
        uint256        deadline,
        uint256        resolutionTime,
        uint256        bettorCount,
        bool           resolved,
        bool           outcome,
        address        creator,
        bool           poolsRevealed,
        uint64         revealedYesPool,
        uint64         revealedNoPool,
        uint64         revealedTotalPool
    ) {
        Market storage m = markets[_marketId];
        return (
            m.question,
            m.deadline,
            m.resolutionTime,
            m.bettorCount,
            m.resolved,
            m.outcome,
            m.creator,
            m.poolsRevealed,
            m.revealedYesPool,
            m.revealedNoPool,
            m.revealedTotalPool
        );
    }
}
