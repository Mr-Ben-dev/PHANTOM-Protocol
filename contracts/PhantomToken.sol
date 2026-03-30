// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import { FHE, InEuint64, euint64 } from "@fhenixprotocol/cofhe-contracts/FHE.sol";

/**
 * @title PhantomToken
 * @notice $PHTM — The PHANTOM Protocol governance and utility token.
 *         Implemented as a minimal FHERC20-compatible confidential token.
 *
 *         Balances are stored encrypted. The indicator system maintains
 *         ERC20 interface compatibility while hiding real balances.
 *
 *         Indicator values (proxy for wallets that call balanceOf):
 *           0        = no interaction yet
 *           0.5001   = first interaction
 *           +0.0001  = each receive
 *           -0.0001  = each send
 */
contract PhantomToken {

    // ─── Metadata ────────────────────────────────────────────────
    string  public  constant name     = "Phantom Protocol";
    string  public  constant symbol   = "PHTM";
    uint8   public  constant decimals = 18;

    // ─── State ───────────────────────────────────────────────────
    address public owner;

    /// @dev Encrypted balances — only ACL-permitted addresses may decrypt.
    mapping(address => euint64) private _encBalances;

    /// @dev Indicator values (6-decimal scale, x 1e6) for ERC20 balanceOf compat.
    mapping(address => uint256) private _indicators;

    uint256 public  totalIndicator;

    // ─── Events ─────────────────────────────────────────────────
    event ConfidentialTransfer(address indexed from, address indexed to);
    event Mint(address indexed to);

    /// @dev Indicator constants (scaled 1e6)
    uint256 private constant IND_INIT   = 5001;   // 0.5001 × 1e4 → stored × 1e6 / 1e4
    uint256 private constant IND_STEP   = 1;      // 0.0001 × 1e4

    // ─── Constructor ─────────────────────────────────────────────
    constructor() {
        owner = msg.sender;
    }

    // ─── Mint ────────────────────────────────────────────────────

    /**
     * @notice Mint encrypted PHTM tokens to `_to`.
     *         Only the owner (deployer) may mint during the testnet phase.
     */
    function mint(address _to, InEuint64 calldata _encAmount) external {
        require(msg.sender == owner, "Only owner");

        euint64 amount = FHE.asEuint64(_encAmount);

        if (!FHE.isInitialized(_encBalances[_to])) {
            _encBalances[_to] = amount;
            _indicators[_to]  = IND_INIT;
        } else {
            _encBalances[_to] = FHE.add(_encBalances[_to], amount);
            _indicators[_to] += IND_STEP;
        }

        // Grant recipient and contract persistent ACL access
        FHE.allow(_encBalances[_to], _to);
        FHE.allowThis(_encBalances[_to]);

        emit Mint(_to);
    }

    // ─── Confidential Transfer ───────────────────────────────────

    /**
     * @notice Transfer an encrypted amount of PHTM from the caller to `_to`.
     * @param _to         Recipient address.
     * @param _encAmount  Encrypted transfer amount.
     */
    function confidentialTransfer(address _to, InEuint64 calldata _encAmount) external {
        require(_to != address(0), "Zero address");

        euint64 amount = FHE.asEuint64(_encAmount);

        // Subtract from sender
        if (!FHE.isInitialized(_encBalances[msg.sender])) {
            _encBalances[msg.sender] = FHE.asEuint64(0);
        }
        _encBalances[msg.sender] = FHE.sub(_encBalances[msg.sender], amount);
        FHE.allow(_encBalances[msg.sender], msg.sender);
        FHE.allowThis(_encBalances[msg.sender]);

        // Add to recipient
        if (!FHE.isInitialized(_encBalances[_to])) {
            _encBalances[_to] = amount;
            _indicators[_to]  = IND_INIT;
        } else {
            _encBalances[_to] = FHE.add(_encBalances[_to], amount);
            _indicators[_to] += IND_STEP;
        }
        FHE.allow(_encBalances[_to], _to);
        FHE.allowThis(_encBalances[_to]);

        // Update sender indicator
        if (_indicators[msg.sender] >= IND_STEP) {
            _indicators[msg.sender] -= IND_STEP;
        }

        emit ConfidentialTransfer(msg.sender, _to);
    }

    // ─── ERC20-compatible View ───────────────────────────────────

    /**
     * @notice Returns the indicator value (NOT the real balance).
     *         Satisfies ERC20 interface without leaking balance info.
     */
    function balanceOf(address _account) external view returns (uint256) {
        return _indicators[_account];
    }

    /**
     * @notice Returns the encrypted balance handle for `_account`.
     *         Only addresses with ACL access can decrypt via cofhe SDK.
     */
    function confidentialBalanceOf(address _account) external view returns (euint64) {
        return _encBalances[_account];
    }
}
