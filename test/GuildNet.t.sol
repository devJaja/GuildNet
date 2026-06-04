// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Test} from "forge-std/Test.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {TaskCoordinator} from "../src/TaskCoordinator.sol";
import {GuildPermissions} from "../src/GuildPermissions.sol";

contract GuildNetTest is Test {
    AgentRegistry   registry;
    TaskCoordinator coordinator;
    GuildPermissions permissions;

    address user      = makeAddr("user");
    address research  = makeAddr("research");
    address risk      = makeAddr("risk");
    address report    = makeAddr("report");

    function setUp() public {
        registry    = new AgentRegistry();
        coordinator = new TaskCoordinator(address(registry));
        permissions = new GuildPermissions();

        // Register specialized agents
        vm.prank(research);
        registry.register("https://research.venice.ai", "research", 0.01 ether);

        vm.prank(risk);
        registry.register("https://risk.venice.ai", "risk", 0.01 ether);

        vm.prank(report);
        registry.register("https://report.venice.ai", "report", 0.01 ether);

        vm.deal(user, 10 ether);
    }

    // ── AgentRegistry ────────────────────────────────────────────

    function test_register() public {
        AgentRegistry.Agent memory a = registry.agents(research);
        assertEq(a.capability, "research");
        assertEq(a.pricePerTask, 0.01 ether);
        assertTrue(a.active);
    }

    function test_findByCapability() public {
        address[] memory r = registry.findByCapability("research");
        assertEq(r.length, 1);
        assertEq(r[0], research);
    }

    function test_deactivate() public {
        vm.prank(research);
        registry.deactivate();
        assertFalse(registry.agents(research).active);
        assertEq(registry.findByCapability("research").length, 0);
    }

    // ── TaskCoordinator ──────────────────────────────────────────

    function test_createAndHire() public {
        vm.prank(user);
        uint256 taskId = coordinator.createTask{value: 0.05 ether}("market-entry report");

        uint256 before = research.balance;
        coordinator.hireAgent(taskId, research);
        assertEq(research.balance - before, 0.01 ether);
    }

    function test_completeTaskRefund() public {
        vm.prank(user);
        uint256 taskId = coordinator.createTask{value: 0.05 ether}("report task");

        coordinator.hireAgent(taskId, research);
        coordinator.hireAgent(taskId, risk);
        coordinator.hireAgent(taskId, report);

        uint256 before = user.balance;
        vm.prank(user);
        coordinator.completeTask(taskId);
        // 0.05 - 3×0.01 = 0.02 refunded
        assertEq(user.balance - before, 0.02 ether);
    }

    function test_cannotHireSameAgentTwice() public {
        vm.prank(user);
        uint256 taskId = coordinator.createTask{value: 0.05 ether}("task");
        coordinator.hireAgent(taskId, research);
        vm.expectRevert("agent already paid");
        coordinator.hireAgent(taskId, research);
    }

    // ── GuildPermissions (ERC-7710) ───────────────────────────────

    function test_grantAndUse() public {
        address coordinator2 = makeAddr("coord");
        vm.deal(user, 1 ether);

        vm.prank(user);
        uint256 permId = permissions.grantPermission{value: 0.1 ether}(coordinator2, 0.1 ether, 1 hours);

        uint256 before = research.balance;
        vm.prank(coordinator2);
        permissions.usePermission(permId, payable(research), 0.03 ether);
        assertEq(research.balance - before, 0.03 ether);
    }

    function test_revokeRefunds() public {
        address coordinator2 = makeAddr("coord");
        vm.deal(user, 1 ether);

        vm.prank(user);
        uint256 permId = permissions.grantPermission{value: 0.1 ether}(coordinator2, 0.1 ether, 1 hours);

        vm.prank(coordinator2);
        permissions.usePermission(permId, payable(research), 0.03 ether);

        uint256 before = user.balance;
        vm.prank(user);
        permissions.revokePermission(permId);
        assertEq(user.balance - before, 0.07 ether);
    }

    function test_expiredPermissionReverts() public {
        address coordinator2 = makeAddr("coord");
        vm.deal(user, 1 ether);

        vm.prank(user);
        uint256 permId = permissions.grantPermission{value: 0.1 ether}(coordinator2, 0.1 ether, 1 hours);

        skip(2 hours);
        vm.prank(coordinator2);
        vm.expectRevert("expired");
        permissions.usePermission(permId, payable(research), 0.01 ether);
    }
}
