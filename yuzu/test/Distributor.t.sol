// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/Distributor.sol";
import "./mock/TestERC20.sol";

contract DistributorTest is Test {
    // Tokens
    TestERC20 baseToken;
    TestERC20 quoteToken;
    LinearDistributor distributor;

    // Constants
    uint256 constant INITIAL_SUPPLY = 100 * 10**18; // 100 tokens with 18 decimals
    uint256 constant TARGET_PRICE_NUMERATOR = 2;    // Final price: 2 quote per 1 base
    uint256 constant TARGET_PRICE_DENOMINATOR = 1;
    uint256 constant MAX_PURCHASE = 50 * 10**18;    // 50 quote tokens per purchase
    uint256 constant COOLDOWN_PERIOD = 24 hours;
    
    // Test accounts
    address deployer = address(1);
    address buyer1 = address(2);
    address buyer2 = address(3);
    address buyer3 = address(4);
    address buyer4 = address(5);
    address buyer5 = address(6);

    // Events
    event SaleScheduled(uint256 startTime, uint256 initialBaseSupply);
    event TokensPurchased(address indexed buyer, uint256 quoteAmount, uint256 baseAmount);

    function setUp() public {
        // Setup with deployer account
        vm.startPrank(deployer);
        
        // Create test tokens
        baseToken = new TestERC20("Base Token", "BASE", 18);
        quoteToken = new TestERC20("Quote Token", "QUOTE", 18);
        
        // Create distributor
        distributor = new LinearDistributor(
            address(baseToken),
            address(quoteToken),
            TARGET_PRICE_NUMERATOR,
            TARGET_PRICE_DENOMINATOR,
            MAX_PURCHASE
        );
        
        // Mint tokens
        baseToken.mint(deployer, INITIAL_SUPPLY);
        quoteToken.mint(buyer1, 100 * 10**18);
        quoteToken.mint(buyer2, 100 * 10**18);
        quoteToken.mint(buyer3, 100 * 10**18);
        quoteToken.mint(buyer4, 100 * 10**18);
        quoteToken.mint(buyer5, 100 * 10**18);
        
        // Send base tokens to distributor
        baseToken.transfer(address(distributor), INITIAL_SUPPLY);
        
        vm.stopPrank();
    }

    function testInitialization() public view {
        assertEq(address(distributor.baseToken()), address(baseToken));
        assertEq(address(distributor.quoteToken()), address(quoteToken));
        assertEq(distributor.baseDecimals(), 18);
        assertEq(distributor.quoteDecimals(), 18);
        assertEq(distributor.maxPurchaseQuoteWei(), MAX_PURCHASE);
        assertEq(distributor.saleConfigured(), false);
        assertEq(baseToken.balanceOf(address(distributor)), INITIAL_SUPPLY);
    }

    function testStartSale() public {
        uint256 startTime = block.timestamp + 1 hours;
        
        vm.prank(deployer);
        vm.expectEmit(true, true, true, true);
        emit SaleScheduled(startTime, INITIAL_SUPPLY);
        distributor.start(startTime);
        
        assertEq(distributor.saleConfigured(), true);
        assertEq(distributor.saleStartTime(), startTime);
        assertEq(distributor.initialBaseSupply(), INITIAL_SUPPLY);
    }
    
    function testCannotStartSaleInPast() public {
        vm.warp(100); // Set block.timestamp to a known value
        uint256 startTime = 50; // Time in the past
        
        vm.prank(deployer);
        vm.expectRevert("Distributor: Start time must be in the future");
        distributor.start(startTime);
    }
    
    function testCannotStartSaleTwice() public {
        uint256 startTime = block.timestamp + 1 hours;
        
        vm.startPrank(deployer);
        distributor.start(startTime);
        
        vm.expectRevert("Distributor: Sale already configured");
        distributor.start(startTime + 1 hours);
        vm.stopPrank();
    }
    
    function testCannotOrderBeforeSaleConfigured() public {
        vm.prank(buyer1);
        vm.expectRevert("Distributor: Sale not configured yet");
        distributor.order(10 * 10**18);
    }
    
    function testCannotOrderBeforeSaleStarts() public {
        uint256 startTime = block.timestamp + 1 hours;
        
        vm.prank(deployer);
        distributor.start(startTime);
        
        vm.prank(buyer1);
        vm.expectRevert("Distributor: Sale not started yet");
        distributor.order(10 * 10**18);
    }
    
    function testQuoteBeforeSaleStarts() public {
        // Quote should return 0 if sale not configured
        assertEq(distributor.quote(10 * 10**18), 0);
        
        // Configure sale
        uint256 startTime = block.timestamp + 1 hours;
        vm.prank(deployer);
        distributor.start(startTime);
        
        // Quote should work even before sale starts
        uint256 baseAmount = distributor.quote(10 * 10**18);
        assertTrue(baseAmount > 0, "Quote should return non-zero amount");
    }
    
    function testFullDistribution() public {
        uint256 startTime = block.timestamp + 1 hours;
        vm.prank(deployer);
        distributor.start(startTime);
        
        // Advance time to start of sale
        vm.warp(startTime);
        
        // Approve distributor to spend quote tokens for all buyers
        vm.startPrank(buyer1);
        quoteToken.approve(address(distributor), type(uint256).max);
        vm.stopPrank();
        
        vm.startPrank(buyer2);
        quoteToken.approve(address(distributor), type(uint256).max);
        vm.stopPrank();
        
        vm.startPrank(buyer3);
        quoteToken.approve(address(distributor), type(uint256).max);
        vm.stopPrank();
        
        vm.startPrank(buyer4);
        quoteToken.approve(address(distributor), type(uint256).max);
        vm.stopPrank();
        
        vm.startPrank(buyer5);
        quoteToken.approve(address(distributor), type(uint256).max);
        vm.stopPrank();
        
        // Track purchased amounts
        uint256 totalQuoteSpent = 0;
        
        // Purchase 1: First buyer
        uint256 quoteAmount1 = 20 * 10**18;
        uint256 baseAmount1Pre = distributor.quote(quoteAmount1);
        
        vm.prank(buyer1);
        distributor.order(quoteAmount1);
        
        uint256 baseAmount1 = baseToken.balanceOf(buyer1);
        totalQuoteSpent += quoteAmount1;
        
        console.log("Purchase 1: %s base tokens for %s quote tokens", baseAmount1 / 10**18, quoteAmount1 / 10**18);
        assertApproxEqRel(baseAmount1, baseAmount1Pre, 0.01e18, "Quote accuracy check");
        
        // Purchase 2: Second buyer
        uint256 quoteAmount2 = 20 * 10**18;
        uint256 baseAmount2Pre = distributor.quote(quoteAmount2);
        
        vm.prank(buyer2);
        distributor.order(quoteAmount2);
        
        uint256 baseAmount2 = baseToken.balanceOf(buyer2);
        totalQuoteSpent += quoteAmount2;
        
        console.log("Purchase 2: %s base tokens for %s quote tokens", baseAmount2 / 10**18, quoteAmount2 / 10**18);
        assertApproxEqRel(baseAmount2, baseAmount2Pre, 0.01e18, "Quote accuracy check");
        assertTrue(baseAmount2 < baseAmount1, "Price should increase (less base tokens for same quote amount)");
        
        // Purchase 3: Third buyer
        uint256 quoteAmount3 = 20 * 10**18;
        uint256 baseAmount3Pre = distributor.quote(quoteAmount3);
        
        vm.prank(buyer3);
        distributor.order(quoteAmount3);
        
        uint256 baseAmount3 = baseToken.balanceOf(buyer3);
        totalQuoteSpent += quoteAmount3;
        
        console.log("Purchase 3: %s base tokens for %s quote tokens", baseAmount3 / 10**18, quoteAmount3 / 10**18);
        assertApproxEqRel(baseAmount3, baseAmount3Pre, 0.01e18, "Quote accuracy check");
        assertTrue(baseAmount3 < baseAmount2, "Price should increase (less base tokens for same quote amount)");
        
        // Purchase 4: Fourth buyer
        uint256 quoteAmount4 = 20 * 10**18;
        uint256 baseAmount4Pre = distributor.quote(quoteAmount4);
        
        vm.prank(buyer4);
        distributor.order(quoteAmount4);
        
        uint256 baseAmount4 = baseToken.balanceOf(buyer4);
        totalQuoteSpent += quoteAmount4;
        
        console.log("Purchase 4: %s base tokens for %s quote tokens", baseAmount4 / 10**18, quoteAmount4 / 10**18);
        assertApproxEqRel(baseAmount4, baseAmount4Pre, 0.01e18, "Quote accuracy check");
        assertTrue(baseAmount4 < baseAmount3, "Price should increase (less base tokens for same quote amount)");
        
        // Purchase 5: Fifth buyer
        uint256 quoteAmount5 = 20 * 10**18;
        uint256 baseAmount5Pre = distributor.quote(quoteAmount5);
        
        vm.prank(buyer5);
        distributor.order(quoteAmount5);
        
        uint256 baseAmount5 = baseToken.balanceOf(buyer5);
        totalQuoteSpent += quoteAmount5;
        
        console.log("Purchase 5: %s base tokens for %s quote tokens", baseAmount5 / 10**18, quoteAmount5 / 10**18);
        assertApproxEqRel(baseAmount5, baseAmount5Pre, 0.01e18, "Quote accuracy check");
        assertTrue(baseAmount5 < baseAmount4, "Price should increase (less base tokens for same quote amount)");
        
        // Calculate total base tokens purchased
        uint256 totalBasePurchased = baseAmount1 + baseAmount2 + baseAmount3 + baseAmount4 + baseAmount5;
        
        // Final summary
        console.log("-------------------");
        console.log("Total base purchased: %s (%.1f%%)", totalBasePurchased / 10**18, (totalBasePurchased * 100) / INITIAL_SUPPLY);
        console.log("Total quote spent: %s", totalQuoteSpent / 10**18);
        console.log("Remaining base in distributor: %s", baseToken.balanceOf(address(distributor)) / 10**18);
        
        // Verify that most base tokens have been distributed
        assertTrue(
            baseToken.balanceOf(address(distributor)) < INITIAL_SUPPLY * 5 / 100, 
            "Less than 5% of base tokens should remain"
        );
    }
    
    function testQuoteAccuracy() public {
        // Start sale
        uint256 startTime = block.timestamp + 1 hours;
        vm.prank(deployer);
        distributor.start(startTime);
        
        // Advance time to start of sale
        vm.warp(startTime);
        
        // Get quote
        uint256 quoteAmount = 10 * 10**18;
        uint256 expectedBaseAmount = distributor.quote(quoteAmount);
        
        // Approve and order
        vm.startPrank(buyer1);
        quoteToken.approve(address(distributor), quoteAmount);
        distributor.order(quoteAmount);
        vm.stopPrank();
        
        // Verify quote is approximately accurate (may not be exact due to state changes)
        assertApproxEqRel(
            baseToken.balanceOf(buyer1),
            expectedBaseAmount,
            0.01e18, // 1% tolerance
            "Quote should approximately match actual base tokens received"
        );
    }
    
    function testCooldownPeriod() public {
        // Start sale
        uint256 startTime = block.timestamp + 1 hours;
        vm.prank(deployer);
        distributor.start(startTime);
        
        // Advance time to start of sale
        vm.warp(startTime);
        
        // First purchase
        vm.startPrank(buyer1);
        quoteToken.approve(address(distributor), MAX_PURCHASE * 2);
        distributor.order(10 * 10**18);
        
        // Try to purchase again immediately (should fail)
        vm.expectRevert("Distributor: Cooldown active");
        distributor.order(10 * 10**18);
        
        // Advance time by half the cooldown (should still fail)
        vm.warp(startTime + COOLDOWN_PERIOD / 2);
        vm.expectRevert("Distributor: Cooldown active");
        distributor.order(10 * 10**18);
        
        // Advance time past cooldown period (should succeed)
        vm.warp(startTime + COOLDOWN_PERIOD + 1);
        distributor.order(10 * 10**18);
        vm.stopPrank();
    }
}
