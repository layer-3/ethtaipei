// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
 
import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {YuzuToken} from "../src/Token.sol";
 
contract Deploy is Script {
    function run() external {
        string memory saltStr = "Yuzukosho"; 
        bytes32 salt = bytes32(abi.encodePacked(saltStr));
        
        // Get chainId from environment variable with validation
        string memory chainIdStr = vm.envString("INITIAL_SUPPLY_CHAIN_ID");
        require(bytes(chainIdStr).length > 0, "INITIAL_SUPPLY_CHAIN_ID environment variable must be set");
        uint256 initialSupplyChainId = vm.parseUint(chainIdStr);
 
        vm.startBroadcast();
        // msg.sender here is the private key used to run the script
        YuzuToken myToken = new YuzuToken{salt: salt}(msg.sender, initialSupplyChainId);
        console.log("Token deployed at:", address(myToken));
        console.log("Initial supply chain ID:", initialSupplyChainId);
 
        vm.stopBroadcast();
    }
}
