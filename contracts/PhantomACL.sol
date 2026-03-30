// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import { FHE, euint64, ebool } from "@fhenixprotocol/cofhe-contracts/FHE.sol";

/**
 * @title PhantomACL
 * @notice Shared ACL helper for all PHANTOM Protocol contracts.
 *         Provides role management and convenience wrappers around
 *         FHE access control operations.
 */
abstract contract PhantomACL {
    enum Role {
        NONE,
        CREATOR,
        BETTOR,
        RESOLVER,
        AUDITOR
    }

    mapping(address => Role) public roles;
    address public owner;

    event RoleGranted(address indexed user, Role role);
    event RoleRevoked(address indexed user);

    modifier onlyOwner() {
        require(msg.sender == owner, "PhantomACL: only owner");
        _;
    }

    modifier onlyRole(Role _role) {
        require(
            roles[msg.sender] == _role || msg.sender == owner,
            "PhantomACL: unauthorized"
        );
        _;
    }

    modifier onlyOwnerOrRole(Role _role) {
        require(
            msg.sender == owner || roles[msg.sender] == _role,
            "PhantomACL: unauthorized"
        );
        _;
    }

    function grantRole(address _user, Role _role) external onlyOwner {
        roles[_user] = _role;
        emit RoleGranted(_user, _role);
    }

    function revokeRole(address _user) external onlyOwner {
        roles[_user] = Role.NONE;
        emit RoleRevoked(_user);
    }

    /// @dev Grant a specific address decrypt access to a euint64 handle.
    function _grantDecrypt(euint64 _handle, address _who) internal {
        FHE.allow(_handle, _who);
    }

    /// @dev Grant a specific address decrypt access to an ebool handle.
    function _grantDecryptBool(ebool _handle, address _who) internal {
        FHE.allow(_handle, _who);
    }

    /// @dev Grant this contract persistent access to a euint64 handle.
    function _retainAccess(euint64 _handle) internal {
        FHE.allowThis(_handle);
    }

    /// @dev Grant this contract persistent access to an ebool handle.
    function _retainAccessBool(ebool _handle) internal {
        FHE.allowThis(_handle);
    }

    /// @dev Make a euint64 handle publicly decryptable (after resolution).
    function _makePublic(euint64 _handle) internal {
        FHE.allowPublic(_handle);
    }
}
