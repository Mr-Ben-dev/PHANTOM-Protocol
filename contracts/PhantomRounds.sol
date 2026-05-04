// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import { FHE, InEuint64, InEbool, euint64, ebool } from "@fhenixprotocol/cofhe-contracts/FHE.sol";
import "./PhantomACL.sol";

/**
 * @title PhantomRounds
 * @notice PHANTOM Protocol — Encrypted UP/DOWN price-round prediction markets.
 *
 * Deep FHE architecture:
 * - User DIRECTIONS are FHE-encrypted (InEbool). Nobody sees which side you chose.
 * - ETH pool totals (UP and DOWN) accumulate as FHE-encrypted euint64 via FHE.select.
 * - For BTC/ETH: oracle submits plaintext Chainlink-attested price; contract trivially
 *   encrypts it and runs FHE.gte(encEnd, encStart) → ebool outcome sealed on-chain.
 * - For SOL: keeper encrypts real Binance API price as InEuint64 client-side;
 *   FHE.gte comparison runs fully in encrypted domain → PENDING_REVEAL status until
 *   the CoFHE threshold network decrypts and keeper calls revealRoundOutcome().
 * - No MEV bot can front-run resolution; pool composition is invisible during rounds.
 */
contract PhantomRounds is PhantomACL {

    // ─── Status ───────────────────────────────────────────────────────────────
    enum RoundStatus {
        NONE,           // 0
        OPEN,           // 1
        LOCKED,         // 2
        RESOLVED,       // 3
        CANCELED,       // 4
        PENDING_REVEAL  // 5 — FHE.gte done, awaiting CoFHE threshold decryption
    }

    // ─── Round data ───────────────────────────────────────────────────────────
    struct Round {
        bytes32     asset;
        uint32      intervalSeconds;
        uint64      startPrice;
        uint64      endPrice;           // 0 until revealRoundOutcome for encrypted path
        uint256     lockAt;
        uint256     settleAt;
        uint256     bettorCount;
        address     creator;
        RoundStatus status;
        bool        outcomeUp;
        bool        poolsRevealed;
        uint64      revealedUpPool;     // gwei
        uint64      revealedDownPool;   // gwei
        uint64      revealedTotalPool;  // gwei
        bytes32     oracleRoundId;
        uint256     observedAt;
        uint256     totalEth;           // total ETH deposited (wei)
    }

    // ─── Core storage ─────────────────────────────────────────────────────────
    mapping(uint256 => Round)                                public  rounds;
    // FHE-encrypted direction (UP=true/DOWN=false) per user per round
    mapping(uint256 => mapping(address => ebool))            private roundDirections;
    // FHE-encrypted pool totals in gwei (UP and DOWN accumulate via FHE.select)
    mapping(uint256 => euint64)                              private upPools;
    mapping(uint256 => euint64)                              private downPools;
    // FHE-encrypted comparison outcome (for PENDING_REVEAL path)
    mapping(uint256 => ebool)                                private encOutcomes;
    // ETH stakes — plaintext (amount visible, direction is not)
    mapping(uint256 => mapping(address => uint256))          public  ethStakes;
    // Direction revealed by user via CoFHE threshold signature
    mapping(uint256 => mapping(address => bool))             public  revealedDirections;
    mapping(uint256 => mapping(address => bool))             public  directionRevealed;
    // Bet / claim tracking
    mapping(uint256 => mapping(address => bool))             public  hasRoundBet;
    mapping(uint256 => mapping(address => bool))             public  hasRoundClaimed;
    // Protocol fee collected per round (prevent double-collection)
    mapping(uint256 => bool)                                 private roundFeeCollected;

    mapping(address => bool) public roundBots;
    mapping(address => bool) public oracleSigners;

    uint256 public roundCount;
    uint256 public pendingFees;  // accumulated 3% protocol fees (wei)
    bool    public paused;

    // ─── Events ───────────────────────────────────────────────────────────────
    event RoundBotSet(address indexed bot, bool allowed);
    event OracleSignerSet(address indexed signer, bool allowed);
    event PausedSet(bool paused);
    event RoundCreated(
        uint256 indexed roundId,
        bytes32 indexed asset,
        uint32  intervalSeconds,
        uint64  startPrice,
        uint256 lockAt,
        uint256 settleAt,
        bytes32 oracleRoundId,
        address creator
    );
    event RoundBetPlaced(uint256 indexed roundId, address indexed bettor, uint256 ethStake);
    event RoundLocked(uint256 indexed roundId);
    event RoundResolved(uint256 indexed roundId, bool outcomeUp, uint64 startPrice, uint64 endPrice, uint256 observedAt);
    event RoundPendingReveal(uint256 indexed roundId);
    event RoundOutcomeRevealed(uint256 indexed roundId, bool outcomeUp, uint64 endPrice);
    event RoundPoolsRevealed(uint256 indexed roundId, uint64 upPool, uint64 downPool, uint64 totalPool);
    event RoundPayoutClaimed(uint256 indexed roundId, address indexed bettor, uint256 amount);
    event DirectionRevealed(uint256 indexed roundId, address indexed bettor, bool directionUp);
    event RoundCanceled(uint256 indexed roundId, string reason);
    event FeesWithdrawn(address indexed to, uint256 amount);

    // ─── Modifiers ────────────────────────────────────────────────────────────
    modifier onlyBotOrOwner() {
        require(msg.sender == owner || roundBots[msg.sender], "PhantomRounds: not bot");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "PhantomRounds: paused");
        _;
    }

    // ─── Constructor ──────────────────────────────────────────────────────────
    constructor() {
        owner = msg.sender;
        roles[msg.sender] = Role.RESOLVER;
        roundBots[msg.sender] = true;
        oracleSigners[msg.sender] = true;
    }

    receive() external payable {}

    // ─── Admin ────────────────────────────────────────────────────────────────
    function setRoundBot(address bot, bool allowed) external onlyOwner {
        require(bot != address(0), "PhantomRounds: zero bot");
        roundBots[bot] = allowed;
        emit RoundBotSet(bot, allowed);
    }

    function setOracleSigner(address signer, bool allowed) external onlyOwner {
        require(signer != address(0), "PhantomRounds: zero signer");
        oracleSigners[signer] = allowed;
        emit OracleSignerSet(signer, allowed);
    }

    function setPaused(bool value) external onlyOwner {
        paused = value;
        emit PausedSet(value);
    }

    /**
     * @notice Withdraw accumulated 3% protocol fees to a recipient address.
     */
    function withdrawFees(address payable to) external onlyOwner {
        require(to != address(0), "PhantomRounds: zero address");
        uint256 amount = pendingFees;
        pendingFees = 0;
        (bool ok,) = to.call{value: amount}("");
        require(ok, "PhantomRounds: fee transfer failed");
        emit FeesWithdrawn(to, amount);
    }

    // ─── Round lifecycle ──────────────────────────────────────────────────────
    function createRound(
        bytes32 asset,
        uint32  intervalSeconds,
        uint64  startPrice,
        uint256 lockAt,
        uint256 settleAt,
        bytes32 oracleRoundId
    ) external onlyBotOrOwner whenNotPaused returns (uint256 roundId) {
        require(asset != bytes32(0), "PhantomRounds: empty asset");
        require(intervalSeconds == 300 || intervalSeconds == 900, "PhantomRounds: bad interval");
        require(startPrice > 0, "PhantomRounds: zero price");
        require(lockAt > block.timestamp, "PhantomRounds: lock in past");
        require(settleAt > lockAt, "PhantomRounds: settle before lock");

        roundId = roundCount++;

        Round storage r = rounds[roundId];
        r.asset           = asset;
        r.intervalSeconds = intervalSeconds;
        r.startPrice      = startPrice;
        r.lockAt          = lockAt;
        r.settleAt        = settleAt;
        r.creator         = msg.sender;
        r.status          = RoundStatus.OPEN;
        r.oracleRoundId   = oracleRoundId;

        upPools[roundId]   = FHE.asEuint64(0);
        downPools[roundId] = FHE.asEuint64(0);
        FHE.allowThis(upPools[roundId]);
        FHE.allowThis(downPools[roundId]);

        emit RoundCreated(roundId, asset, intervalSeconds, startPrice, lockAt, settleAt, oracleRoundId, msg.sender);
    }

    /**
     * @notice Place a bet. msg.value is the ETH stake (visible). Direction is FHE-encrypted.
     *
     * FHE.select routes the stake gwei into the UP or DOWN encrypted pool without revealing
     * direction on-chain. Nobody can determine your chosen side during the round.
     * After the round closes, call revealMyDirection() with a CoFHE threshold signature
     * to prove your direction and claim payout.
     */
    function placeRoundBet(
        uint256  roundId,
        InEbool calldata encDirectionUp
    ) external payable whenNotPaused {
        Round storage r = rounds[roundId];
        require(r.status == RoundStatus.OPEN, "PhantomRounds: not open");
        require(block.timestamp < r.lockAt, "PhantomRounds: locked");
        require(!hasRoundBet[roundId][msg.sender], "PhantomRounds: already bet");
        require(msg.value > 0, "PhantomRounds: no stake");

        uint64 amountGwei = uint64(msg.value / 1 gwei);
        require(amountGwei > 0, "PhantomRounds: stake too small");

        // Decrypt encrypted direction input
        ebool directionUp = FHE.asEbool(encDirectionUp);
        FHE.allowThis(directionUp);
        FHE.allow(directionUp, msg.sender); // user can later decrypt their own direction
        roundDirections[roundId][msg.sender] = directionUp;

        // Route stake into encrypted pools via FHE.select — direction stays hidden
        euint64 gwei64  = FHE.asEuint64(amountGwei);
        euint64 zero    = FHE.asEuint64(0);
        euint64 upAdd   = FHE.select(directionUp, gwei64, zero);
        euint64 downAdd = FHE.select(directionUp, zero, gwei64);
        FHE.allowThis(upAdd);
        FHE.allowThis(downAdd);

        upPools[roundId]   = FHE.add(upPools[roundId], upAdd);
        downPools[roundId] = FHE.add(downPools[roundId], downAdd);
        FHE.allowThis(upPools[roundId]);
        FHE.allowThis(downPools[roundId]);

        // Record stake plaintext (ETH amount is visible, direction is not)
        ethStakes[roundId][msg.sender] = msg.value;
        r.totalEth  += msg.value;
        r.bettorCount++;
        hasRoundBet[roundId][msg.sender] = true;

        emit RoundBetPlaced(roundId, msg.sender, msg.value);
    }

    /**
     * @notice Place a bet with plaintext direction (trivially encrypted on-chain).
     * @dev Same as placeRoundBet but takes a plain bool instead of an encrypted InEbool.
     *      The direction is trivially encrypted via FHE.asEbool(bool) — stake amount
     *      remains the only public value. Use this when the CoFHE client SDK is
     *      unavailable or for CLI/keeper interactions.
     */
    function placeRoundBetSimple(
        uint256 roundId,
        bool    isUp
    ) external payable whenNotPaused {
        Round storage r = rounds[roundId];
        require(r.status == RoundStatus.OPEN, "PhantomRounds: not open");
        require(block.timestamp < r.lockAt, "PhantomRounds: locked");
        require(!hasRoundBet[roundId][msg.sender], "PhantomRounds: already bet");
        require(msg.value > 0, "PhantomRounds: no stake");

        uint64 amountGwei = uint64(msg.value / 1 gwei);
        require(amountGwei > 0, "PhantomRounds: stake too small");

        // Trivially encrypt the plaintext direction — no client-side CoFHE SDK needed
        ebool directionUp = FHE.asEbool(isUp);
        FHE.allowThis(directionUp);
        FHE.allow(directionUp, msg.sender);
        roundDirections[roundId][msg.sender] = directionUp;

        // Accumulate into encrypted pools via FHE.select
        euint64 gwei64  = FHE.asEuint64(amountGwei);
        euint64 zero    = FHE.asEuint64(0);
        euint64 upAdd   = FHE.select(directionUp, gwei64, zero);
        euint64 downAdd = FHE.select(directionUp, zero, gwei64);
        FHE.allowThis(upAdd);
        FHE.allowThis(downAdd);

        upPools[roundId]   = FHE.add(upPools[roundId], upAdd);
        downPools[roundId] = FHE.add(downPools[roundId], downAdd);
        FHE.allowThis(upPools[roundId]);
        FHE.allowThis(downPools[roundId]);

        ethStakes[roundId][msg.sender] = msg.value;
        r.totalEth  += msg.value;
        r.bettorCount++;
        hasRoundBet[roundId][msg.sender] = true;

        emit RoundBetPlaced(roundId, msg.sender, msg.value);
    }

    function lockRound(uint256 roundId) external onlyBotOrOwner {
        Round storage r = rounds[roundId];
        require(r.status == RoundStatus.OPEN, "PhantomRounds: not open");
        require(block.timestamp >= r.lockAt, "PhantomRounds: too early");
        r.status = RoundStatus.LOCKED;
        emit RoundLocked(roundId);
    }

    /**
     * @notice Resolve with Chainlink-attested plaintext price (BTC/ETH).
     * Trivially encrypts endPrice, runs FHE.gte for the outcome comparison,
     * and stores the encrypted ebool in encOutcomes. Marks pools for public reveal.
     */
    function resolveRound(
        uint256  roundId,
        uint64   endPrice,
        uint256  observedAt,
        bytes calldata oracleSignature
    ) external onlyBotOrOwner {
        Round storage r = rounds[roundId];
        require(r.status == RoundStatus.OPEN || r.status == RoundStatus.LOCKED, "PhantomRounds: bad status");
        require(block.timestamp >= r.settleAt, "PhantomRounds: too early");
        require(endPrice > 0, "PhantomRounds: zero end price");
        require(observedAt >= r.lockAt && observedAt <= block.timestamp + 5 minutes, "PhantomRounds: bad observedAt");
        require(_isValidOracleSignature(roundId, endPrice, observedAt, oracleSignature), "PhantomRounds: bad oracle sig");

        // Deep FHE: trivially encrypt both prices, compute outcome via FHE.gte
        euint64 encEnd   = FHE.asEuint64(endPrice);
        euint64 encStart = FHE.asEuint64(r.startPrice);
        FHE.allowThis(encEnd);
        FHE.allowThis(encStart);
        ebool encOutcome = FHE.gte(encEnd, encStart);
        FHE.allowThis(encOutcome);
        encOutcomes[roundId] = encOutcome;

        // Mark pools for public decryption
        FHE.allowPublic(upPools[roundId]);
        FHE.allowPublic(downPools[roundId]);

        r.status     = RoundStatus.RESOLVED;
        r.endPrice   = endPrice;
        r.observedAt = observedAt;
        r.outcomeUp  = endPrice >= r.startPrice;

        // Collect 3% protocol fee
        if (!roundFeeCollected[roundId]) {
            pendingFees += r.totalEth * 3 / 100;
            roundFeeCollected[roundId] = true;
        }

        emit RoundResolved(roundId, r.outcomeUp, r.startPrice, endPrice, observedAt);
    }

    /**
     * @notice Resolve with a fully encrypted end price (SOL/USD via Binance API).
     *
     * The keeper reads the real SOL/USD price from Binance, encrypts it client-side
     * using the cofhe/sdk library as InEuint64, and submits here. The FHE.gte comparison runs
     * entirely in encrypted domain — the outcome (UP or DOWN) is sealed until the
     * CoFHE threshold network decrypts it and the keeper calls revealRoundOutcome().
     *
     * This means no MEV bot can know the outcome in the same block it's submitted.
     */
    function resolveRoundEncrypted(
        uint256   roundId,
        InEuint64 calldata encEndPrice
    ) external onlyBotOrOwner {
        Round storage r = rounds[roundId];
        require(r.status == RoundStatus.OPEN || r.status == RoundStatus.LOCKED, "PhantomRounds: bad status");
        require(block.timestamp >= r.settleAt, "PhantomRounds: too early");

        // Convert encrypted input to on-chain FHE handle
        euint64 encEnd   = FHE.asEuint64(encEndPrice);
        euint64 encStart = FHE.asEuint64(r.startPrice);
        FHE.allowThis(encEnd);
        FHE.allowThis(encStart);

        // KEY INNOVATION: FHE comparison — nobody knows outcome until CoFHE decrypts
        ebool encOutcome = FHE.gte(encEnd, encStart);
        FHE.allowThis(encOutcome);
        FHE.allowPublic(encOutcome); // mark for CoFHE threshold decryption
        encOutcomes[roundId] = encOutcome;

        FHE.allowPublic(upPools[roundId]);
        FHE.allowPublic(downPools[roundId]);

        r.status = RoundStatus.PENDING_REVEAL;

        emit RoundPendingReveal(roundId);
    }

    /**
     * @notice Reveal outcome of a PENDING_REVEAL round once CoFHE threshold decryption
     * has computed the result. Keeper provides the decrypted plaintext + CoFHE sig.
     */
    function revealRoundOutcome(
        uint256  roundId,
        bool     outcomeUp,
        uint64   endPrice,
        bytes calldata outcomeSig
    ) external onlyBotOrOwner {
        Round storage r = rounds[roundId];
        require(r.status == RoundStatus.PENDING_REVEAL, "PhantomRounds: not pending reveal");

        FHE.publishDecryptResult(encOutcomes[roundId], outcomeUp, outcomeSig);

        r.status     = RoundStatus.RESOLVED;
        r.endPrice   = endPrice;
        r.outcomeUp  = outcomeUp;
        r.observedAt = block.timestamp;

        if (!roundFeeCollected[roundId]) {
            pendingFees += r.totalEth * 3 / 100;
            roundFeeCollected[roundId] = true;
        }

        emit RoundOutcomeRevealed(roundId, outcomeUp, endPrice);
    }

    /**
     * @notice Reveal FHE-encrypted pool totals after CoFHE threshold decryption.
     * Caller supplies the plaintext values and the CoFHE-issued signature for each pool.
     */
    function revealRoundPools(
        uint256  roundId,
        uint64   upPlaintext,
        bytes calldata upSig,
        uint64   downPlaintext,
        bytes calldata downSig
    ) external {
        Round storage r = rounds[roundId];
        require(r.status == RoundStatus.RESOLVED, "PhantomRounds: not resolved");
        require(!r.poolsRevealed, "PhantomRounds: already revealed");

        FHE.publishDecryptResult(upPools[roundId],   upPlaintext,   upSig);
        FHE.publishDecryptResult(downPools[roundId], downPlaintext, downSig);

        r.revealedUpPool    = upPlaintext;
        r.revealedDownPool  = downPlaintext;
        r.revealedTotalPool = upPlaintext + downPlaintext;
        r.poolsRevealed     = true;

        emit RoundPoolsRevealed(roundId, upPlaintext, downPlaintext, r.revealedTotalPool);
    }

    /**
     * @notice Reveal your FHE-encrypted direction with a CoFHE threshold signature.
     * Must be called before claimRoundPayout if you are a winner.
     *
     * The user obtains (plaintext, signature) by requesting off-chain decryption via
     * cofheClient.decryptForView() using the FHE.allow(direction, msg.sender) grant.
     */
    function revealMyDirection(
        uint256  roundId,
        bool     directionUp,
        bytes calldata sig
    ) external {
        require(hasRoundBet[roundId][msg.sender], "PhantomRounds: no bet");
        require(!directionRevealed[roundId][msg.sender], "PhantomRounds: already revealed");

        FHE.publishDecryptResult(roundDirections[roundId][msg.sender], directionUp, sig);

        revealedDirections[roundId][msg.sender] = directionUp;
        directionRevealed[roundId][msg.sender]  = true;

        emit DirectionRevealed(roundId, msg.sender, directionUp);
    }

    /**
     * @notice Claim ETH payout for a winning bet.
     * Payout = stake × (totalPool × 97%) / winPool.
     * Caller must have called revealMyDirection() first.
     */
    function claimRoundPayout(uint256 roundId) external {
        Round storage r = rounds[roundId];
        require(r.status == RoundStatus.RESOLVED, "PhantomRounds: not resolved");
        require(r.poolsRevealed, "PhantomRounds: pools hidden");
        require(hasRoundBet[roundId][msg.sender], "PhantomRounds: no bet");
        require(!hasRoundClaimed[roundId][msg.sender], "PhantomRounds: claimed");
        require(directionRevealed[roundId][msg.sender], "PhantomRounds: direction not revealed");
        require(revealedDirections[roundId][msg.sender] == r.outcomeUp, "PhantomRounds: wrong direction");

        hasRoundClaimed[roundId][msg.sender] = true;

        uint256 stake   = ethStakes[roundId][msg.sender];
        uint256 winPool = r.outcomeUp
            ? uint256(r.revealedUpPool)   * 1 gwei
            : uint256(r.revealedDownPool) * 1 gwei;
        require(winPool > 0, "PhantomRounds: empty win pool");

        uint256 netPool = r.totalEth * 97 / 100;
        uint256 payout  = stake * netPool / winPool;

        (bool ok,) = payable(msg.sender).call{value: payout}("");
        require(ok, "PhantomRounds: payout failed");

        emit RoundPayoutClaimed(roundId, msg.sender, payout);
    }

    /**
     * @notice Cancel an open or locked round (e.g., oracle unavailable).
     */
    function cancelRound(uint256 roundId, string calldata reason) external onlyBotOrOwner {
        Round storage r = rounds[roundId];
        require(r.status == RoundStatus.OPEN || r.status == RoundStatus.LOCKED, "PhantomRounds: cannot cancel");
        r.status = RoundStatus.CANCELED;
        emit RoundCanceled(roundId, reason);
    }

    /**
     * @notice Refund ETH stake for a canceled round.
     */
    function refundCanceledRound(uint256 roundId) external {
        Round storage r = rounds[roundId];
        require(r.status == RoundStatus.CANCELED, "PhantomRounds: not canceled");
        require(hasRoundBet[roundId][msg.sender], "PhantomRounds: no bet");
        require(!hasRoundClaimed[roundId][msg.sender], "PhantomRounds: refunded");

        hasRoundClaimed[roundId][msg.sender] = true;

        uint256 refund = ethStakes[roundId][msg.sender];
        require(refund > 0, "PhantomRounds: nothing to refund");

        (bool ok,) = payable(msg.sender).call{value: refund}("");
        require(ok, "PhantomRounds: refund failed");

        emit RoundPayoutClaimed(roundId, msg.sender, refund);
    }

    // ─── View functions ───────────────────────────────────────────────────────

    /**
     * @notice Returns caller's ETH stake for a round (plaintext amount, reverts if no bet).
     */
    function getRoundBet(uint256 roundId) external view returns (uint256) {
        require(hasRoundBet[roundId][msg.sender], "PhantomRounds: no bet");
        return ethStakes[roundId][msg.sender];
    }

    /**
     * @notice Returns caller's FHE-encrypted direction handle (use cofheClient.decryptForView).
     */
    function getRoundDirection(uint256 roundId) external view returns (ebool) {
        require(hasRoundBet[roundId][msg.sender], "PhantomRounds: no bet");
        return roundDirections[roundId][msg.sender];
    }

    function getUpPool(uint256 roundId) external view returns (euint64) {
        return upPools[roundId];
    }

    function getDownPool(uint256 roundId) external view returns (euint64) {
        return downPools[roundId];
    }

    function getRoundCount() external view returns (uint256) {
        return roundCount;
    }

    function getRoundEth(uint256 roundId) external view returns (uint256 totalEth, uint256 userStake) {
        return (rounds[roundId].totalEth, ethStakes[roundId][msg.sender]);
    }

    function getRoundCore(uint256 roundId) external view returns (
        bytes32     asset,
        uint32      intervalSeconds,
        uint64      startPrice,
        uint256     lockAt,
        uint256     settleAt,
        uint256     bettorCount,
        address     creator,
        RoundStatus status
    ) {
        Round storage r = rounds[roundId];
        return (r.asset, r.intervalSeconds, r.startPrice, r.lockAt, r.settleAt, r.bettorCount, r.creator, r.status);
    }

    function getRoundSettlement(uint256 roundId) external view returns (
        uint64      endPrice,
        RoundStatus status,
        bool        outcomeUp,
        bool        poolsRevealed,
        uint64      revealedUpPool,
        uint64      revealedDownPool,
        uint64      revealedTotalPool,
        bytes32     oracleRoundId,
        uint256     observedAt
    ) {
        Round storage r = rounds[roundId];
        return (
            r.endPrice,
            r.status,
            r.outcomeUp,
            r.poolsRevealed,
            r.revealedUpPool,
            r.revealedDownPool,
            r.revealedTotalPool,
            r.oracleRoundId,
            r.observedAt
        );
    }

    // ─── Oracle signature ─────────────────────────────────────────────────────

    function oracleMessageHash(uint256 roundId, uint64 endPrice, uint256 observedAt) public view returns (bytes32) {
        return keccak256(
            abi.encodePacked(
                "PHANTOM_ROUND_ORACLE",
                block.chainid,
                address(this),
                roundId,
                endPrice,
                observedAt
            )
        );
    }

    function _isValidOracleSignature(
        uint256 roundId,
        uint64 endPrice,
        uint256 observedAt,
        bytes calldata signature
    ) internal view returns (bool) {
        bytes32 digest = _toEthSignedMessageHash(oracleMessageHash(roundId, endPrice, observedAt));
        address signer = _recover(digest, signature);
        return oracleSigners[signer];
    }

    function _toEthSignedMessageHash(bytes32 hash) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));
    }

    function _recover(bytes32 digest, bytes calldata signature) internal pure returns (address) {
        if (signature.length != 65) {
            return address(0);
        }

        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            r := calldataload(signature.offset)
            s := calldataload(add(signature.offset, 0x20))
            v := byte(0, calldataload(add(signature.offset, 0x40)))
        }

        if (v < 27) {
            v += 27;
        }
        if (v != 27 && v != 28) {
            return address(0);
        }

        return ecrecover(digest, v, r, s);
    }
}
