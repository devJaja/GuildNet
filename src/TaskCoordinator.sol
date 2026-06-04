// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {AgentRegistry} from "./AgentRegistry.sol";

/// @title TaskCoordinator — coordinator hires agents and routes payments
contract TaskCoordinator {
    AgentRegistry public registry;

    struct Task {
        address requester;
        string description;
        uint256 budget;
        address[] assignedAgents;
        mapping(address => bool) paid;
        bool completed;
    }

    uint256 public taskCount;
    mapping(uint256 => Task) public tasks;

    event TaskCreated(uint256 indexed taskId, address indexed requester, uint256 budget);
    event AgentHired(uint256 indexed taskId, address indexed agent, uint256 amount);
    event TaskCompleted(uint256 indexed taskId);

    constructor(address _registry) {
        registry = AgentRegistry(_registry);
    }

    /// @notice User creates a task and deposits budget
    function createTask(string calldata description) external payable returns (uint256) {
        require(msg.value > 0, "zero budget");
        uint256 taskId = taskCount++;
        Task storage t = tasks[taskId];
        t.requester = msg.sender;
        t.description = description;
        t.budget = msg.value;
        emit TaskCreated(taskId, msg.sender, msg.value);
        return taskId;
    }

    /// @notice Coordinator hires an agent (anyone can call for now; in prod, restrict to coordinator EOA)
    function hireAgent(uint256 taskId, address agent) external {
        Task storage t = tasks[taskId];
        require(!t.completed, "task completed");
        require(!t.paid[agent], "agent already paid");
        
        AgentRegistry.Agent memory a = registry.agents(agent);
        require(a.active, "agent inactive");
        require(t.budget >= a.pricePerTask, "insufficient budget");

        t.paid[agent] = true;
        t.assignedAgents.push(agent);
        t.budget -= a.pricePerTask;

        (bool success,) = a.wallet.call{value: a.pricePerTask}("");
        require(success, "payment failed");

        emit AgentHired(taskId, agent, a.pricePerTask);
    }

    /// @notice Mark task complete (requester or coordinator)
    function completeTask(uint256 taskId) external {
        Task storage t = tasks[taskId];
        require(msg.sender == t.requester, "not requester");
        require(!t.completed, "already completed");
        t.completed = true;

        // Refund leftover budget
        if (t.budget > 0) {
            (bool success,) = payable(t.requester).call{value: t.budget}("");
            require(success, "refund failed");
            t.budget = 0;
        }
        emit TaskCompleted(taskId);
    }

    function getAssignedAgents(uint256 taskId) external view returns (address[] memory) {
        return tasks[taskId].assignedAgents;
    }
}
