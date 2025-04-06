// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {SuperchainERC20} from "interop-lib/src/SuperchainERC20.sol";

contract YuzuToken is SuperchainERC20 {
    constructor(address owner_, uint256 initialSupplyChainId_) {
        if (initialSupplyChainId_ == block.chainid) {
            _mint(owner_, 420_000_000e18);
        }
    }

    function name() public pure override returns (string memory) {
        return "Yuzu";
    }

    function symbol() public pure override returns (string memory) {
        return "YUZU";
    }
}
