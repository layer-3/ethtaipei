// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract TestEventEmitter {
    event EventA(address indexed sender);
    event EventB(address indexed sender);
    event EventC(address indexed sender);
    event EventD(address indexed sender);

    function triggerEventA() external {
        emit EventA(msg.sender);
    }

    function triggerEventB() external {
        emit EventB(msg.sender);
    }

    function triggerEventC() external {
        emit EventC(msg.sender);
    }

    function triggerEventD() external {
        emit EventD(msg.sender);
    }
}
