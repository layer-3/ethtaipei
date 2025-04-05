# Broker Protocol Specification

## Overview
The ClearNet broker protocol is a system for managing payment channels and virtual payment channels between participants. It provides a secure, efficient way to conduct transactions off-chain while retaining the ability to settle on-chain when required.

## Protocol Flow

### 1. Blockchain Channels and Credit
- The protocol accepts blockchain channels to credit participants' balances in a SQLite database ledger
- Participants create on-chain channels through custody contracts (supported on multiple chains including Polygon and Celo)
- Channel creation events from the blockchain are received through webhooks and processed by the `EventHandler`
- These events credit participants' balances in the internal ledger system
- Each participant has an `Account` in the ledger tied to their address, channel ID, and token address

### 2. Virtual Channel Creation
- After being credited from on-chain channels, participants can create "Virtual Channels" with other participants
- Virtual channels allow participants to allocate a portion of their balance for peer-to-peer transactions without requiring on-chain operations
- The broker validates that:
  - Both participants have direct channels with the broker
  - Both participants have sufficient funds in their respective accounts
  - The requested allocation amounts are available
- Funds are transferred from participants' direct channel accounts to the new virtual channel
- The broker sets up message routing between participants

### 3. Virtual Channel Operations
- Participants send messages to each other through virtual channels using WebSocket connections
- The broker maintains a real-time communication layer using Centrifuge for message routing
- Virtual channels have versioning and expiration mechanisms to ensure security
- Participants can update the state of their channel off-chain without requiring blockchain transactions

### 4. On-Demand Settlement
- When participants wish to materialize their balances on-chain, they can request the broker to re-open or update on-chain channels
- The broker validates the final allocation of funds between participants
- The broker ensures the total allocated amount matches the total funds in the channel
- Funds are transferred from the virtual channel back to the participants' direct channels
- The virtual channel is marked as closed and message routing is discontinued
- Settlement is only performed when requested by participants, allowing most transactions to remain off-chain

## Security Features

### Authentication
- All operations are authenticated using cryptographic signatures
- The system uses ECDSA signatures compatible with Ethereum accounts
- The broker maintains persistent connections with participants through WebSockets

### Multi-Chain Support
- The system supports multiple blockchain networks (currently Polygon and Celo)
- Each network has its own custody contract address and connection details
- Network IDs are tracked with channels to ensure proper chain association

## Benefits
- Efficient, low-cost transactions by keeping most operations off-chain
- Security guarantees of blockchain when needed
- Participants can freely transact within their allocated funds in virtual channels
- On-chain settlement only occurs when participants choose to materialize their balances