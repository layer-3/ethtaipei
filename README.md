# ClearNet: Cross-Chain State Channel Network for Layer-3 Virtual Applications

## Vision & Motivation

ClearNet is a breakthrough Layer-3 solution developed for ETH Taipei 2025 that creates a virtual ledger network on top of multiple EVM chains. By combining state channel technology with cross-chain communication, NitroLite enables truly blockchain-agnostic applications while delivering near-instant finality and transaction throughput comparable to traditional centralized systems.

Our motivation stems from the inherent limitations of current Layer-1 and Layer-2 solutions:

- High transaction costs for micropayment use cases
- Limited cross-chain interoperability
- Reduced privacy for transaction participants
- Throughput constraints for high-frequency applications
- Settlement delays that limit real-time financial applications

## System Architecture

ClearNet consists of the following interconnected components:

1. **State Channel Network**: Our custom implementation of state channels `nitrolite` creates secure off-chain communication paths between participants, allowing for instant value transfer without blockchain confirmation.

2. **RPC Message Broker**: A novel development from our hackathon work, this component simplifies virtual application (vApp) development by providing a standardized messaging interface.

3. **Virtual Ledger System**: By abstracting away blockchain-specific details, our system creates a unified accounting layer across multiple EVM chains (currently deployed on Polygon and Celo).

4. **Cross-Chain Settlement**: When necessary, the system performs optimized on-chain settlements across connected blockchains.

5. **Frontend Demo**: A reference implementation showcasing micropayments and cross-chain transfers.

## Business Use Cases

NitroLite enables a wide range of previously impractical blockchain applications:

- **Trustless Micropayment Streaming**: Pay-per-second/kilobyte/API call with near-zero fees and instant finality.

- **Instant Cross-Chain Transfers**: Move value between different blockchains without traditional bridging delays or security concerns.

- **High-Frequency Trading**: Execute thousands of trades per second with eventual on-chain settlement.

- **Geolocalized Payment Networks**: Create location-specific payment channels with horizontal scalability.

- **Complex Escrow Logic**: Implement sophisticated multi-party financial agreements with conditional releases.

- **Cloud Computing Integration**: Connect blockchain-based payments to traditional cloud services for hybrid applications.

## Current Status

Our ETH Taipei 2025 implementation demonstrates:

- Fully functional state channel network operating across Polygon and Celo
- RPC message broker for simplified application development
- Reference frontend vApp YuzuX implementation for micropayments
- Deployments of the channels contracts and adjudicators
- Deployment of a SuperchainERC20 on 5 OP-Stack EVM Chains such as Uniswap
- Complete documentation of the protocol architecture

The system currently operates as a proof-of-concept with plans for further security audits and scaling optimizations before production deployment.

## Getting Started

See the `docs/` directory for detailed protocol specifications and the `clearnet/` directory for server implementation. The `frontend/` directory contains our demonstration application.

Simply start the frontend and backend and they should be already configure with Celo and Polygon Mainnet

## What went wrong?

We worked on nitrolite idea 10 days before the hackathon because we realized that nitro was too complicated for off-chain protocol.
Our intention was to build on top of it the NitroRPC / Ledger layer and 2 Demo vApps.

We were confident the smart-contract and SDK protocol was finalized, but few hours after the hackathon started while implementing NitroRPC
We understood that the smart-contract interface had a major design flaw we had to address which we were busy correcting in the first night.

Other were minors issues, for example privy integration was not signing correctly states and we decided to fallback to EOA/Metamask.

The Broker implementation can be quite complex and the protocol has many cases to cover and test.

## Todolist

- [x] Client can connect to broker websocket
- [x] Broker return config
- [x] Client UI can Deposit on Custody
- [ ] Client can Withdraw from Custody (Implemented but not tested)
- [x] Client can open channel with Broker
- [x] Broker record channel deposits
- [x] Client can create Virtual Ledger Channel (VLC)
- [ ] Integrate FE
- [x] Counterparty can accept VLC
- [x] Broker Transfer in db LC to VLC
- [ ] VLC party can change Allocation
- [x] VLC party can communicate with NitroRPC
- [ ] Broker store rpc_state history
- [ ] Clients should keep rpc_state too
- [X] Client can close VLC
- [x] Broker update ledger db and LC Allocations
- [ ] Client can close LC
- [ ] Broker can reset LC allocation increased
- [x] Frontend deployment (explorer and YuzuPay)
- [x] Backend deployment
- [x] Deploy smart contracts with ERC20
- [ ] Make video demo

