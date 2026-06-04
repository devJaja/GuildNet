// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Script, console} from "forge-std/Script.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {TaskCoordinator} from "../src/TaskCoordinator.sol";
import {GuildPermissions} from "../src/GuildPermissions.sol";

contract DeployGuildNet is Script {
    function run() external {
        vm.startBroadcast();

        AgentRegistry   registry    = new AgentRegistry();
        TaskCoordinator coordinator = new TaskCoordinator(address(registry));
        GuildPermissions perms      = new GuildPermissions();

        console.log("AgentRegistry:    ", address(registry));
        console.log("TaskCoordinator:  ", address(coordinator));
        console.log("GuildPermissions: ", address(perms));

        vm.stopBroadcast();
    }
}
