// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Script, console} from "forge-std/Script.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";

contract RegisterAgents is Script {
    // Base Sepolia deployed address
    AgentRegistry constant REGISTRY = AgentRegistry(0xac36F9147F3B49c767FFf3B4082D3D08a1396bE4);

    function run() external {
        vm.startBroadcast();

        REGISTRY.register("https://api.venice.ai/api/v1", "research", 0.01 ether);
        console.log("Research Agent registered");

        REGISTRY.register("https://api.venice.ai/api/v1", "risk",     0.01 ether);
        console.log("Risk Agent registered");

        REGISTRY.register("https://api.venice.ai/api/v1", "report",   0.01 ether);
        console.log("Report Agent registered");

        REGISTRY.register("https://api.venice.ai/api/v1", "coding",   0.02 ether);
        console.log("Coding Agent registered");

        REGISTRY.register("https://api.venice.ai/api/v1", "design",   0.01 ether);
        console.log("Design Agent registered");

        console.log("Total agents:", REGISTRY.totalAgents());

        vm.stopBroadcast();
    }
}
