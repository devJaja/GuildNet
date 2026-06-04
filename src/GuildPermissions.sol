// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/// @title GuildPermissions — ERC-7710-inspired delegation of spend permissions
/// Allows a Smart Account (or coordinator) to delegate payment permissions to sub-agents.
contract GuildPermissions {
    struct Permission {
        address granter;
        address grantee;
        uint256 allowance;  // max spend in wei
        uint256 spent;
        uint256 expiry;
        bool revoked;
    }

    uint256 public permCount;
    mapping(uint256 => Permission) public permissions;
    mapping(address => uint256[]) public granteePerms;

    event PermissionGranted(uint256 indexed permId, address indexed granter, address indexed grantee, uint256 allowance, uint256 expiry);
    event PermissionUsed(uint256 indexed permId, uint256 amount);
    event PermissionRevoked(uint256 indexed permId);

    function grantPermission(address grantee, uint256 allowance, uint256 duration) external payable returns (uint256) {
        require(msg.value == allowance, "must fund allowance");
        uint256 permId = permCount++;
        permissions[permId] = Permission(msg.sender, grantee, allowance, 0, block.timestamp + duration, false);
        granteePerms[grantee].push(permId);
        emit PermissionGranted(permId, msg.sender, grantee, allowance, block.timestamp + duration);
        return permId;
    }

    function usePermission(uint256 permId, address payable recipient, uint256 amount) external {
        Permission storage p = permissions[permId];
        require(msg.sender == p.grantee, "not grantee");
        require(!p.revoked, "revoked");
        require(block.timestamp <= p.expiry, "expired");
        require(p.spent + amount <= p.allowance, "exceeds allowance");

        p.spent += amount;
        (bool success,) = recipient.call{value: amount}("");
        require(success, "transfer failed");
        emit PermissionUsed(permId, amount);
    }

    function revokePermission(uint256 permId) external {
        Permission storage p = permissions[permId];
        require(msg.sender == p.granter || msg.sender == p.grantee, "not authorized");
        require(!p.revoked, "already revoked");
        p.revoked = true;
        uint256 remaining = p.allowance - p.spent;
        if (remaining > 0) {
            (bool success,) = payable(p.granter).call{value: remaining}("");
            require(success, "refund failed");
        }
        emit PermissionRevoked(permId);
    }

    function getGranteePerms(address grantee) external view returns (uint256[] memory) {
        return granteePerms[grantee];
    }
}
