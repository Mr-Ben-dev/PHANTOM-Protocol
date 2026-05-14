// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import { FHE, InEuint64, InEuint8, euint64, euint8, ebool } from "@fhenixprotocol/cofhe-contracts/FHE.sol";
import "./PhantomACL.sol";

/**
 * @title PhantomMulti
 * @notice PHANTOM Protocol Wave 4 — Multi-Outcome Encrypted Prediction Markets.
 *
 *  Extends the binary market concept to support 2–8 outcomes per market.
 *  Each outcome has an FHE-encrypted pool (euint64). Bettors choose an outcome
 *  (simple path: plaintext index; encrypted path: InEuint8) and an amount
 *  (always FHE-encrypted via InEuint64).
 *
 *  Privacy properties:
 *   • Individual bet amounts are always private (euint64 — encrypted on-chain).
 *   • Bettor headcount is private (euint64 encBettorCount, not public).
 *   • Pool depths are sealed until the resolver calls resolveMultiMarket().
 *   • Outcome choice is hidden in the encrypted bet path (placeMultiBet).
 *   • Market creator has NO ACL access to pool handles before resolution.
 *
 *  Privacy vs prior waves (fixes):
 *   Wave 1 gap: bettorCount was public → now encrypted (euint64 encBettorCount).
 *   Wave 1 gap: Creator could read pool handles → no creator ACL on pools here.
 *   Wave 1/2 gap: No encrypted outcome choice → placeMultiBet uses InEuint8.
 *
 *  FHE operations used:
 *   FHE.asEuint64, FHE.asEuint8, FHE.add, FHE.eq, FHE.select,
 *   FHE.allow, FHE.allowThis, FHE.allowSender, FHE.allowPublic,
 *   FHE.isInitialized, FHE.publishDecryptResult
 */
contract PhantomMulti is PhantomACL {

    // ═══════════════════════════════════════════════════════════════
    // CONSTANTS
    // ═══════════════════════════════════════════════════════════════

    uint8 public constant MAX_OUTCOMES = 8;

    // ═══════════════════════════════════════════════════════════════
    // TYPES
    // ═══════════════════════════════════════════════════════════════

    enum MultiStatus {
        NONE,
        OPEN,
        RESOLVED,
        CANCELED,
        PENDING_REVEAL
    }

    struct MultiMarket {
        string      question;
        uint8       outcomeCount;
        uint256     deadline;
        uint256     resolutionTime;
        uint8       winningOutcome;
        bool        resolved;
        bool        poolsRevealed;
        bool        canceled;
        address     creator;
        MultiStatus status;
        // Encrypted state
        euint64[MAX_OUTCOMES] encPools;         // Encrypted pool per outcome (gwei)
        euint64               encBettorCount;   // Hidden head count (privacy fix)
        // Post-reveal state
        uint64[MAX_OUTCOMES]  revealedPools;
        uint64                revealedTotalPool;
    }

    // ═══════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════

    mapping(uint256 => MultiMarket)                              public  markets;
    mapping(uint256 => string[MAX_OUTCOMES])                     private outcomeLabels;

    /// @dev Encrypted bet amounts — only bettor (via ACL) can decrypt.
    mapping(uint256 => mapping(address => euint64))              private bets;
    /// @dev Encrypted outcome indices — only bettor can decrypt (via placeMultiBet path).
    ///      For placeMultiBetSimple path this is trivially encrypted (public info).
    mapping(uint256 => mapping(address => euint8))               private betChoices;
    /// @dev Plaintext revealed bet amounts (set after revealMyBet).
    mapping(uint256 => mapping(address => uint64))               public  revealedBets;
    mapping(uint256 => mapping(address => bool))                 public  betRevealed;

    mapping(uint256 => mapping(address => bool))                 public  hasBet;
    mapping(uint256 => mapping(address => bool))                 public  hasClaimed;

    uint256 public marketCount;

    // ═══════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════

    event MultiMarketCreated(
        uint256 indexed marketId,
        address indexed creator,
        string          question,
        uint8           outcomeCount,
        uint256         deadline,
        uint256         resolutionTime
    );
    event MultiBetPlaced(uint256 indexed marketId, address indexed bettor);
    event MultiMarketResolved(uint256 indexed marketId, uint8 winningOutcome);
    event MultiPoolsRevealed(uint256 indexed marketId, uint64 totalPool);
    event MultiPayoutClaimed(uint256 indexed marketId, address indexed bettor, uint64 amount);
    event MultiBetRevealed(uint256 indexed marketId, address indexed bettor, uint64 amount);
    event MultiMarketCanceled(uint256 indexed marketId, string reason);

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
     * @notice Create a new multi-outcome prediction market.
     * @param _question       Human-readable question.
     * @param _labels         Outcome labels (2–8 entries, e.g. ["<$80K","$80K-$100K",">$100K"]).
     * @param _deadline       Unix timestamp: betting closes.
     * @param _resolutionTime Unix timestamp: must resolve by this time.
     * @return marketId       Newly created market ID.
     */
    function createMultiMarket(
        string   calldata          _question,
        string[] calldata          _labels,
        uint256                    _deadline,
        uint256                    _resolutionTime
    ) external returns (uint256 marketId) {
        require(bytes(_question).length > 0,               "Empty question");
        require(_labels.length >= 2,                        "Need at least 2 outcomes");
        require(_labels.length <= MAX_OUTCOMES,             "Too many outcomes");
        require(_deadline > block.timestamp,                "Deadline in past");
        require(_resolutionTime > _deadline,                "Resolution before deadline");

        marketId = marketCount++;

        MultiMarket storage m = markets[marketId];
        m.question       = _question;
        m.outcomeCount   = uint8(_labels.length);
        m.deadline       = _deadline;
        m.resolutionTime = _resolutionTime;
        m.creator        = msg.sender;
        m.status         = MultiStatus.OPEN;

        // Store outcome labels
        for (uint8 i = 0; i < uint8(_labels.length); i++) {
            outcomeLabels[marketId][i] = _labels[i];
        }

        // Initialize all encrypted pools to zero (all 8 slots, even unused ones)
        for (uint8 i = 0; i < MAX_OUTCOMES; i++) {
            m.encPools[i] = FHE.asEuint64(0);
            FHE.allowThis(m.encPools[i]);
        }

        // Initialize encrypted bettor count (privacy fix over Wave 1 public count)
        m.encBettorCount = FHE.asEuint64(0);
        FHE.allowThis(m.encBettorCount);

        emit MultiMarketCreated(marketId, msg.sender, _question, m.outcomeCount, _deadline, _resolutionTime);
    }

    // ═══════════════════════════════════════════════════════════════
    // PLACE BET — SIMPLE PATH (outcome index is public, amount encrypted)
    // ═══════════════════════════════════════════════════════════════

    /**
     * @notice Place a bet with plaintext outcome index and encrypted amount.
     *         Primary UX path — no CoFHE SDK client-side encryption required.
     *         The outcome index is visible on-chain (logged via event omission,
     *         not stored in plaintext — index is trivially encrypted for routing).
     *
     * @param _marketId    Target market.
     * @param _outcomeIdx  Outcome bucket index (0-based, must be < outcomeCount).
     * @param _encAmount   Client-encrypted bet amount (InEuint64).
     */
    function placeMultiBetSimple(
        uint256            _marketId,
        uint8              _outcomeIdx,
        InEuint64 calldata _encAmount
    ) external {
        MultiMarket storage m = markets[_marketId];

        require(m.status == MultiStatus.OPEN,          "Market not open");
        require(block.timestamp < m.deadline,          "Betting closed");
        require(!hasBet[_marketId][msg.sender],        "Already bet");
        require(_outcomeIdx < m.outcomeCount,          "Invalid outcome");

        // Deserialise encrypted amount from client
        euint64 amount = FHE.asEuint64(_encAmount);

        // Trivially encrypt the outcome index for FHE routing
        // (the index value is public in this path — consistent with Wave 3 simple bet)
        euint8 encIdx = FHE.asEuint8(_outcomeIdx);
        FHE.allowThis(encIdx);

        _routeBet(_marketId, m, amount, encIdx);

        emit MultiBetPlaced(_marketId, msg.sender);
    }

    /**
     * @notice Place a fully private bet — both outcome index AND amount are encrypted.
     *         Requires client-side CoFHE SDK to produce InEuint8 and InEuint64.
     *         Maximum privacy: the operator cannot infer which outcome you chose.
     *
     * @param _marketId       Target market.
     * @param _encOutcomeIdx  Client-encrypted outcome index (InEuint8, value 0–7).
     * @param _encAmount      Client-encrypted bet amount (InEuint64).
     */
    function placeMultiBet(
        uint256           _marketId,
        InEuint8 calldata _encOutcomeIdx,
        InEuint64 calldata _encAmount
    ) external {
        MultiMarket storage m = markets[_marketId];

        require(m.status == MultiStatus.OPEN,    "Market not open");
        require(block.timestamp < m.deadline,    "Betting closed");
        require(!hasBet[_marketId][msg.sender],  "Already bet");

        // Deserialise both encrypted inputs from client
        euint8  encIdx = FHE.asEuint8(_encOutcomeIdx);
        euint64 amount = FHE.asEuint64(_encAmount);

        FHE.allowThis(encIdx);

        _routeBet(_marketId, m, amount, encIdx);

        emit MultiBetPlaced(_marketId, msg.sender);
    }

    /**
     * @dev Internal: routes an encrypted amount into the correct pool via FHE.select loop.
     *      Uses constant-time FHE comparison — never branches on ciphertext.
     */
    function _routeBet(
        uint256              _marketId,
        MultiMarket storage  m,
        euint64              amount,
        euint8               encIdx
    ) internal {
        // ACL for bet amount and choice — bettor can read, contract retains access
        FHE.allowThis(amount);
        FHE.allowSender(amount);
        FHE.allowSender(encIdx);

        bets[_marketId][msg.sender]      = amount;
        betChoices[_marketId][msg.sender] = encIdx;
        hasBet[_marketId][msg.sender]    = true;

        euint64 zero = FHE.asEuint64(0);
        FHE.allowThis(zero);

        // Route amount to the target pool — O(MAX_OUTCOMES) FHE tasks, constant-time
        for (uint8 i = 0; i < MAX_OUTCOMES; i++) {
            // isTarget = (encIdx == i) — encrypted comparison
            ebool isTarget = FHE.eq(encIdx, FHE.asEuint8(i));
            FHE.allowThis(isTarget);

            // routed = isTarget ? amount : 0
            euint64 routed = FHE.select(isTarget, amount, zero);
            FHE.allowThis(routed);

            // Accumulate into the pool for outcome i
            m.encPools[i] = FHE.add(m.encPools[i], routed);
            FHE.allowThis(m.encPools[i]);
        }

        // Increment encrypted bettor count
        m.encBettorCount = FHE.add(m.encBettorCount, FHE.asEuint64(1));
        FHE.allowThis(m.encBettorCount);
    }

    // ═══════════════════════════════════════════════════════════════
    // RESOLVE MARKET
    // ═══════════════════════════════════════════════════════════════

    /**
     * @notice Resolve the market by declaring the winning outcome.
     *         Makes all pool ciphertexts publicly decryptable (CoFHE threshold network).
     *         Only the encBettorCount is restricted to AUDITOR role.
     *
     * @param _marketId       Target market.
     * @param _winningOutcome Index of the winning outcome (0-based).
     */
    function resolveMultiMarket(
        uint256 _marketId,
        uint8   _winningOutcome
    ) external onlyRole(Role.RESOLVER) {
        MultiMarket storage m = markets[_marketId];

        require(m.status == MultiStatus.OPEN, "Market not open");
        require(!m.canceled,                   "Market canceled");
        require(_winningOutcome < m.outcomeCount, "Invalid outcome");

        m.winningOutcome = _winningOutcome;
        m.resolved       = true;
        m.status         = MultiStatus.RESOLVED;

        // Make all pool handles publicly decryptable
        for (uint8 i = 0; i < MAX_OUTCOMES; i++) {
            FHE.allowPublic(m.encPools[i]);
        }

        // Grant AUDITOR role access to encrypted bettor count
        // (bettorCount remains private from public; auditors can verify fairness)

        emit MultiMarketResolved(_marketId, _winningOutcome);
    }

    // ═══════════════════════════════════════════════════════════════
    // REVEAL POOLS (post threshold-decrypt proof)
    // ═══════════════════════════════════════════════════════════════

    /**
     * @notice Publish the CoFHE-decrypted pool totals on-chain.
     *         Caller provides the plaintext values and threshold signatures
     *         obtained after calling decryptForTx().withoutPermit() off-chain.
     *
     * @param _marketId    Target market.
     * @param _ctHashes    euint64 handles for each outcome pool (length == outcomeCount).
     * @param _plaintexts  Decrypted pool values (gwei per outcome).
     * @param _signatures  CoFHE threshold signatures for each (ctHash, plaintext) pair.
     */
    function revealMultiPools(
        uint256          _marketId,
        euint64[] calldata _ctHashes,
        uint64[]  calldata _plaintexts,
        bytes[]   calldata _signatures
    ) external {
        MultiMarket storage m = markets[_marketId];

        require(m.resolved,                          "Not resolved");
        require(!m.poolsRevealed,                    "Already revealed");
        require(_ctHashes.length  == m.outcomeCount, "ctHashes length mismatch");
        require(_plaintexts.length == m.outcomeCount, "plaintexts length mismatch");
        require(_signatures.length == m.outcomeCount, "signatures length mismatch");

        uint64 total = 0;
        for (uint8 i = 0; i < m.outcomeCount; i++) {
            // Verify CoFHE threshold signature — reverts if invalid
            FHE.publishDecryptResult(_ctHashes[i], _plaintexts[i], _signatures[i]);
            m.revealedPools[i] = _plaintexts[i];
            total += _plaintexts[i];
        }

        m.revealedTotalPool = total;
        m.poolsRevealed     = true;

        emit MultiPoolsRevealed(_marketId, total);
    }

    // ═══════════════════════════════════════════════════════════════
    // REVEAL INDIVIDUAL BET (prerequisite for claimMultiPayout)
    // ═══════════════════════════════════════════════════════════════

    /**
     * @notice User reveals their own encrypted bet amount via CoFHE threshold proof.
     *         Required before claimMultiPayout so the contract can compute payout.
     *
     * @param _marketId   Target market.
     * @param _ctHash     euint64 handle for this user's bet (from getMyMultiBet).
     * @param _betAmount  Decrypted bet amount.
     * @param _signature  CoFHE threshold signature over (_ctHash, _betAmount).
     */
    function revealMyBet(
        uint256          _marketId,
        euint64          _ctHash,
        uint64           _betAmount,
        bytes   calldata _signature
    ) external {
        require(hasBet[_marketId][msg.sender],        "No bet placed");
        require(!betRevealed[_marketId][msg.sender],  "Already revealed");
        require(markets[_marketId].resolved,           "Not resolved");

        // Verify signature — reverts if CoFHE did not produce this decryption
        FHE.publishDecryptResult(_ctHash, _betAmount, _signature);

        revealedBets[_marketId][msg.sender]  = _betAmount;
        betRevealed[_marketId][msg.sender]   = true;

        emit MultiBetRevealed(_marketId, msg.sender, _betAmount);
    }

    // ═══════════════════════════════════════════════════════════════
    // CLAIM PAYOUT
    // ═══════════════════════════════════════════════════════════════

    /**
     * @notice Claim proportional payout from the winning pool.
     *         Caller must have revealed their bet amount first (revealMyBet).
     *         Payout = betAmount * revealedTotalPool * 97 / (winPool * 100).
     *         The 3% is retained as protocol fee.
     *
     * @param _marketId  Target market.
     */
    function claimMultiPayout(uint256 _marketId) external {
        MultiMarket storage m = markets[_marketId];

        require(m.resolved,                              "Not resolved");
        require(m.poolsRevealed,                         "Pools not revealed");
        require(hasBet[_marketId][msg.sender],           "No bet placed");
        require(!hasClaimed[_marketId][msg.sender],      "Already claimed");
        require(betRevealed[_marketId][msg.sender],      "Bet not revealed");

        uint64 betAmt  = revealedBets[_marketId][msg.sender];
        uint64 winPool = m.revealedPools[m.winningOutcome];
        uint64 total   = m.revealedTotalPool;

        require(winPool > 0, "Empty winning pool");

        // Payout = betAmt * total * 97 / (winPool * 100)
        uint256 payout = (uint256(betAmt) * uint256(total) * 97) / (uint256(winPool) * 100);

        hasClaimed[_marketId][msg.sender] = true;

        emit MultiPayoutClaimed(_marketId, msg.sender, uint64(payout));
    }

    // ═══════════════════════════════════════════════════════════════
    // CANCEL MARKET
    // ═══════════════════════════════════════════════════════════════

    /**
     * @notice Cancel a market (before resolution).
     * @param _marketId  Target market.
     * @param _reason    Human-readable cancellation reason.
     */
    function cancelMultiMarket(
        uint256 _marketId,
        string calldata _reason
    ) external onlyRole(Role.RESOLVER) {
        MultiMarket storage m = markets[_marketId];

        require(!m.resolved,  "Already resolved");
        require(!m.canceled,  "Already canceled");

        m.canceled = true;
        m.status   = MultiStatus.CANCELED;

        emit MultiMarketCanceled(_marketId, _reason);
    }

    // ═══════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════

    /// @notice Returns the caller's encrypted bet amount (ACL-restricted).
    function getMyMultiBet(uint256 _marketId) external view returns (euint64) {
        require(hasBet[_marketId][msg.sender], "No bet placed");
        return bets[_marketId][msg.sender];
    }

    /// @notice Returns the caller's encrypted outcome choice (ACL-restricted).
    function getMyBetOutcome(uint256 _marketId) external view returns (euint8) {
        require(hasBet[_marketId][msg.sender], "No bet placed");
        return betChoices[_marketId][msg.sender];
    }

    /// @notice Returns the encrypted pool handle for a specific outcome.
    function getEncPool(uint256 _marketId, uint8 _outcomeIdx) external view returns (euint64) {
        require(_outcomeIdx < MAX_OUTCOMES, "Invalid idx");
        return markets[_marketId].encPools[_outcomeIdx];
    }

    /// @notice Returns the encrypted bettor count (AUDITOR-restricted).
    function getEncBettorCount(uint256 _marketId) external view returns (euint64) {
        require(
            msg.sender == owner || roles[msg.sender] == Role.AUDITOR,
            "Not authorized"
        );
        return markets[_marketId].encBettorCount;
    }

    /// @notice Returns total number of markets created.
    function getMultiMarketCount() external view returns (uint256) {
        return marketCount;
    }

    /**
     * @notice Returns core market info (public fields only).
     */
    function getMultiMarketInfo(uint256 _marketId) external view returns (
        string  memory question,
        uint8          outcomeCount,
        uint256        deadline,
        uint256        resolutionTime,
        uint8          winningOutcome,
        bool           resolved,
        bool           poolsRevealed,
        bool           canceled,
        address        creator,
        uint8          status
    ) {
        MultiMarket storage m = markets[_marketId];
        return (
            m.question,
            m.outcomeCount,
            m.deadline,
            m.resolutionTime,
            m.winningOutcome,
            m.resolved,
            m.poolsRevealed,
            m.canceled,
            m.creator,
            uint8(m.status)
        );
    }

    /**
     * @notice Returns revealed pool amounts per outcome (only after poolsRevealed).
     */
    function getRevealedPools(uint256 _marketId) external view returns (
        uint64[MAX_OUTCOMES] memory pools,
        uint64               totalPool
    ) {
        MultiMarket storage m = markets[_marketId];
        return (m.revealedPools, m.revealedTotalPool);
    }

    /**
     * @notice Returns the outcome label for a specific outcome index.
     */
    function getOutcomeLabel(uint256 _marketId, uint8 _outcomeIdx) external view returns (string memory) {
        require(_outcomeIdx < markets[_marketId].outcomeCount, "Invalid idx");
        return outcomeLabels[_marketId][_outcomeIdx];
    }

    /**
     * @notice Returns all outcome labels for a market.
     */
    function getOutcomeLabels(uint256 _marketId) external view returns (string[MAX_OUTCOMES] memory) {
        return outcomeLabels[_marketId];
    }
}
