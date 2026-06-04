// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/// @title AgentRegistry — agents register capabilities and pricing
contract AgentRegistry {
    struct Agent {
        address payable wallet;
        string  endpoint;   // off-chain URL (Venice AI, etc.)
        string  capability; // e.g. "research", "risk", "coding"
        uint256 pricePerTask; // in wei
        bool    active;
    }

    mapping(address => Agent) internal _agents;

    function agents(address a) external view returns (Agent memory) { return _agents[a]; }
    address[] public agentList;

    event AgentRegistered(address indexed agent, string capability, uint256 price);
    event AgentUpdated(address indexed agent);
    event AgentDeactivated(address indexed agent);

    function register(string calldata endpoint, string calldata capability, uint256 pricePerTask) external {
        require(bytes(capability).length > 0, "empty capability");
        if (!_agents[msg.sender].active && _agents[msg.sender].wallet == address(0)) {
            agentList.push(msg.sender);
        }
        _agents[msg.sender] = Agent(payable(msg.sender), endpoint, capability, pricePerTask, true);
        emit AgentRegistered(msg.sender, capability, pricePerTask);
    }

    function update(string calldata endpoint, uint256 pricePerTask) external {
        require(_agents[msg.sender].active, "not registered");
        _agents[msg.sender].endpoint = endpoint;
        _agents[msg.sender].pricePerTask = pricePerTask;
        emit AgentUpdated(msg.sender);
    }

    function deactivate() external {
        _agents[msg.sender].active = false;
        emit AgentDeactivated(msg.sender);
    }

    /// @notice Returns all active agents with a given capability
    function findByCapability(string calldata capability) external view returns (address[] memory) {
        bytes32 cap = keccak256(bytes(capability));
        uint256 count;
        for (uint256 i; i < agentList.length; i++) {
            if (_agents[agentList[i]].active && keccak256(bytes(_agents[agentList[i]].capability)) == cap) count++;
        }
        address[] memory result = new address[](count);
        uint256 j;
        for (uint256 i; i < agentList.length; i++) {
            if (_agents[agentList[i]].active && keccak256(bytes(_agents[agentList[i]].capability)) == cap) {
                result[j++] = agentList[i];
            }
        }
        return result;
    }

    function totalAgents() external view returns (uint256) { return agentList.length; }
}
