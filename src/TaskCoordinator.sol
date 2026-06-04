// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {AgentRegistry} from "./AgentRegistry.sol";
import {GuildPermissions} from "./GuildPermissions.sol";

/// @title TaskCoordinator — coordinator hires agents and routes payments
/// @notice Only the designated coordinator EOA may hire agents.
///         createTask optionally grants the coordinator an ERC-7710 spend permission
///         so the coordinator can also use GuildPermissions.usePermission to pay agents.
contract TaskCoordinator {
    AgentRegistry    public registry;
    GuildPermissions public permissions;
    address          public coordinator;

    struct Task {
        address requester;
        string  description;
        uint256 budget;
        uint256 permId;               // ERC-7710 permission ID (0 = no permission created)
        address[] assignedAgents;
        mapping(address => bool) paid;
        bool completed;
    }

    uint256 public taskCount;
    mapping(uint256 => Task) public tasks;

    event TaskCreated(uint256 indexed taskId, address indexed requester, uint256 budget, uint256 permId);
    event AgentHired(uint256 indexed taskId, address indexed agent, uint256 amount);
    event TaskCompleted(uint256 indexed taskId);

    modifier onlyCoordinator() {
        require(msg.sender == coordinator, "not coordinator");
        _;
    }

    constructor(address _registry, address _permissions, address _coordinator) {
        registry    = AgentRegistry(_registry);
        permissions = GuildPermissions(_permissions);
        coordinator = _coordinator;
    }

    /// @notice User creates a task with ETH budget.
    ///         Funds are held in this contract; an ERC-7710 permission is also granted
    ///         to the coordinator so spend delegation is tracked on-chain.
    function createTask(string calldata description, uint256 duration) external payable returns (uint256) {
        require(msg.value > 0, "zero budget");

        // Grant this contract an ERC-7710 spend permission equal to the budget.
        // address(this) is the grantee so it can call usePermission when hiring agents.
        uint256 permId = permissions.grantPermission{value: msg.value}(address(this), msg.value, duration);

        uint256 taskId = taskCount++;
        Task storage t = tasks[taskId];
        t.requester   = msg.sender;
        t.description = description;
        t.budget      = msg.value;
        t.permId      = permId;

        emit TaskCreated(taskId, msg.sender, msg.value, permId);
        return taskId;
    }

    /// @notice Coordinator hires an agent: pays directly from GuildPermissions (x402).
    function hireAgent(uint256 taskId, address agent) external onlyCoordinator {
        Task storage t = tasks[taskId];
        require(!t.completed, "task completed");
        require(!t.paid[agent], "agent already paid");

        AgentRegistry.Agent memory a = registry.agents(agent);
        require(a.active, "agent inactive");
        require(t.budget >= a.pricePerTask, "insufficient budget");

        t.paid[agent] = true;
        t.assignedAgents.push(agent);
        t.budget -= a.pricePerTask;

        // x402: pay agent from the ERC-7710 permission
        permissions.usePermission(t.permId, a.wallet, a.pricePerTask);

        emit AgentHired(taskId, agent, a.pricePerTask);
    }

    /// @notice Requester or coordinator completes task; revokes permission to refund unspent budget to requester.
    function completeTask(uint256 taskId) external {
        Task storage t = tasks[taskId];
        require(msg.sender == t.requester || msg.sender == coordinator, "not authorized");
        require(!t.completed, "already completed");
        t.completed = true;

        if (t.budget > 0) {
            // Revoke unspent permission — GuildPermissions refunds to granter (this contract).
            // Forward that refund to the original requester.
            uint256 before = address(this).balance;
            permissions.revokePermission(t.permId);
            uint256 refund = address(this).balance - before;
            t.budget = 0;
            if (refund > 0) {
                (bool ok,) = payable(t.requester).call{value: refund}("");
                require(ok, "refund failed");
            }
        }

        emit TaskCompleted(taskId);
    }

    function getAssignedAgents(uint256 taskId) external view returns (address[] memory) {
        return tasks[taskId].assignedAgents;
    }

    receive() external payable {}
}
