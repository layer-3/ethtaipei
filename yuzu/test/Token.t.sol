// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {YuzuToken} from "../src/Token.sol";

contract TokenTest is Test {
    YuzuToken public token;
    address public owner = address(0x1);
    uint256 public initialSupply = 420_000_000e18;

    function setUp() public {
        token = new YuzuToken(owner, block.chainid);
    }

    function testMetadata() public {
        assertEq(token.name(), "Yuzu");
        assertEq(token.symbol(), "YUZU");
    }

    function testInitialSupply() public {
        assertEq(token.balanceOf(owner), initialSupply);
        assertEq(token.totalSupply(), initialSupply);
    }

    function testNoInitialSupplyOnDifferentChain() public {
        uint256 differentChainId = block.chainid + 1;
        YuzuToken noSupplyToken = new YuzuToken(owner, differentChainId);

        assertEq(noSupplyToken.balanceOf(owner), 0);
        assertEq(noSupplyToken.totalSupply(), 0);
    }
}
