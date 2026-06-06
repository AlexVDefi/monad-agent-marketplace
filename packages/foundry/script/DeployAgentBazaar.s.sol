// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {AgentBazaar} from "../src/AgentBazaar.sol";

contract DeployAgentBazaar is Script {
    function run() external returns (AgentBazaar bazaar) {
        vm.startBroadcast();
        bazaar = new AgentBazaar();
        vm.stopBroadcast();
        console.log("AgentBazaar deployed at:", address(bazaar));
    }
}
