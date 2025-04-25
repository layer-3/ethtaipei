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
- Participants must provide signatures to authorize channel creation, except when a participant's initial allocation is 0
- The channel can designate specific signers who will have authority over channel closure
- Funds are transferred from participants' direct channel accounts to the new virtual channel
- The broker sets up message routing between participants

### 3. Virtual Channel Operations
- Participants send messages to each other through virtual channels using WebSocket connections
- The broker maintains a real-time communication layer using Centrifuge for message routing
- Virtual channels have versioning and expiration mechanisms to ensure security
- Participants can update the state of their channel off-chain without requiring blockchain transactions

### 4. Virtual Channel Closure and Settlement
- When participants wish to close a virtual channel, all designated signers must provide signatures to authorize the closure
- The broker validates the signatures against the list of authorized signers registered during channel creation
- The broker validates the final allocation of funds between participants
- The broker ensures the total allocated amount matches the total funds in the channel
- Funds are transferred from the virtual channel back to the participants' direct channels according to the final allocations
- The virtual channel is marked as closed and message routing is discontinued
- When participants wish to materialize their balances on-chain, they can request the broker to re-open or update on-chain channels
- Settlement is only performed when requested by participants, allowing most transactions to remain off-chain

## Security Features

### Authentication and Authorization
- All operations are authenticated using cryptographic signatures
- The system uses ECDSA signatures compatible with Ethereum accounts
- Virtual channels implement a multi-signature scheme:
  - Channel creation requires signatures from participating parties (unless initial allocation is 0)
  - Channel closure requires signatures from all designated signers
  - The exact payload format for signatures is yet to be determined
- Separating participants from signers allows for any authorization model required by the application:
  - Can support m-of-n signature schemes
  - Enables third-party authorization or arbitration
  - Allows implementation of custom governance models
- The broker maintains persistent connections with participants through WebSockets

### Multi-Chain Support
- The system supports multiple blockchain networks (currently Polygon and Celo)
- Each network has its own custody contract address and connection details
- Network IDs are tracked with channels to ensure proper chain association

## Benefits
- Efficient, low-cost transactions by keeping most operations off-chain
- Security guarantees of blockchain when needed
- Participants can freely transact within their allocated funds in virtual channels
- On-chain settlement only occurs when participants choose to materialize their balances# Clearnet RPC Protocol

In Clearnet, brokers are defined as network nodes that form the clearnet network and act as message brokers.
This document describes the ClearNet Broker RPC (Remote Procedure Call) protocol used in Clearnet WebSocket communication.

## API Endpoints

| Method | Description |
|--------|-------------|
| `auth_request` | Initiates authentication with the server |
| `auth_challenge` | Server response with authentication challenge |
| `auth_verify` | Completes authentication with a challenge response |
| `ping` | Simple connectivity check |
| `get_config` | Retrieves broker configuration |
| `get_app_definition` | Retrieves application definition for a ledger account |
| `get_ledger_balances` | Lists participants and their balances for a ledger account |
| `create_application` | Creates a new virtual application on a ledger |
| `close_application` | Closes a virtual application |
| `close_channel` | Closes a direct payment channel |
| `message` | Sends a message to all participants in a virtual application |

## RPC Message Format

The Broker-RPC protocol is based on NitroRPC principles.
All messages exchanged between clients and Clearnet brokers follow this standardized format:

### Request Message

```json
{
  "req": [REQUEST_ID, METHOD, [PARAMETERS], TIMESTAMP],
  "acc": "ACCOUNT_ID",  // Ledger account_id identifier, mandatory, channelId for Broker ledger channels, and AppId for Virtual Ledgers
  "int": [INTENT], // Optional allocation intent change
  "sig": ["SIGNATURE"]  // Client's signature of the entire "req" object
}
```

- The `acc` field serves as both the subject and destination pubsub topic for the message. There is a one-to-one mapping between topics and ledger accounts.
- The `int` field can be omitted if there is no allocation change in this request.
- The `sig` field contains the rpcHash signature, ensuring proof-of-history integrity. It can be omitted for requests that don't modify state.

### Response Message

```json
{
  "res": [REQUEST_ID, METHOD, [RESPONSE_DATA], TIMESTAMP],
  "acc": "ACCOUNT_ID",  // Ledger account_id identifier, mandatory, channelId for Broker ledger channels, and AppId for Virtual Ledgers
  "int": [INTENT], // Allocation intent change
  "sig": ["SIGNATURE"]  // Server's signature of the entire "res" object
}
```

The structure breakdown:

- `REQUEST_ID`: A unique identifier for the request (uint64)
- `METHOD`: The name of the method being called (string)
- `PARAMETERS`/`RESPONSE_DATA`: An array of parameters/response data (array)
- `TIMESTAMP`: Unix timestamp of the request/response (uint64)
- `ACCOUNT_ID` (`acc`): Ledger account identifier that serves as the destination pubsub topic for the message. This is mandatory and maps to channelId for Broker ledger channels and AppId for Virtual Ledgers.
- `INTENT` (`int`): Optional allocation intent change for token distributions between participants
- `SIGNATURE`: Cryptographic signature of the message for authentication and verification of the message's integrity

## App definition

```json
{
  "protocol": "NitroRPC/0.2",
  "participants": [
    "0xAaBbCcDdEeFf0011223344556677889900aAbBcC",
    "0x00112233445566778899AaBbCcDdEeFf00112233"
  ],
  "weights": [50, 50],
  "quorum": 100,
  "challenge": 86400,
  "nonce": 1
}
```

### Intent Format

Intent specifies token distributions for a ledger allocation change.
Values are arranged in the same order as the participants array.

#### Example

```json
[-10, +10]
```

When creating a new app, the first Intent represents the initial allocation.
The token type is defined by the funding account source (which is a ledger channel).
Each channel supports only one currency type.

## Authentication Flow

The authentication process uses a challenge-response mechanism based on Ethereum signatures to verify that a client owns a particular Ethereum address.

### 1. Authentication Initialization

The client initiates authentication by sending an `auth_request` request with their address:

**Authentication Initialization Request from Client:**

```json
{
  "req": [1, "auth_request", ["0x1234567890abcdef..."], 1619123456789],
  "sig": ["0x5432abcdef..."] // Client's signature of the entire 'req' object
}
```

### 2. Challenge Response from Server

The server responds with a random string challenge token:

**Challenge Message from Server:**

```json
{
  "res": [1, "auth_challenge", [{
    "challenge_message": "550e8400-e29b-41d4-a716-446655440000"
  }], 1619123456789],
  "sig": ["0x9876fedcba..."] // Server's signature of the entire 'res' object
}
```

### 3. Authentication Verification

The client sends a verification request with the challenge token:

**Authentication Verification Request from Client:**

```json
{
  "req": [2, "auth_verify", [{
    "address": "0x1234567890abcdef...",
    "challenge": "550e8400-e29b-41d4-a716-446655440000"
  }], 1619123456789],
  "sig": ["0x2345bcdef..."] // Client's signature of the entire 'req' object
}
```

The server verifies that:

1. The challenge string is valid and not expired
2. The challenge was issued for the claimed address
3. The RPC message is signed by the address's private key

This challenge-based approach ensures that the client owns the private key for the address they claim to have and prevents replay attacks since each challenge is unique to a specific address.

### 4. Authentication Success Response

If authentication is successful, the server responds:

**Authentication Success Response:**

```json
{
  "res": [2, "auth_verify", [{
    "address": "0x1234567890abcdef...",
    "success": true
  }], 1619123456789],
  "sig": ["0xabcd1234..."] // Server's signature of the entire 'res' object
}
```

## Ledger Management

### Get App Definition

**Request:**

```json
{
  "req": [2, "get_app_definition", [{
    "acc": "0x1234567890abcdef..."
  }], 1619123456789],
  "sig": ["0x9876fedcba..."] // Optional
}
```

**Response:**

```json
{
  "res": [2, "get_app_definition", [
    {
      "protocol": "NitroRPC/0.2",
      "participants": [
        "0xAaBbCcDdEeFf0011223344556677889900aAbBcC",
        "0x00112233445566778899AaBbCcDdEeFf00112233"
      ],
      "weights": [50, 50],
      "quorum": 100,
      "challenge": 86400,
      "nonce": 1
    }
  ], 1619123456789],
  "sig": ["0xabcd1234..."] // Optional
}
```

### Get participants balances

Retrieves the balances of all participants in a specific ledger account.

**Request:**

```json
{
  "req": [2, "get_ledger_balances", [{
    "acc": "0x1234567890abcdef..."
  }], 1619123456789],
  "sig": ["0x9876fedcba..."]
}
```

**Response:**

```json
{
  "res": [2, "get_ledger_balances", [[
    {
      "address": "0x1234567890abcdef...",
      "amount": 100000
    },
    {
      "address": "0x2345678901abcdef...",
      "amount": 200000
    }
  ]], 1619123456789],
  "sig": ["0xabcd1234..."]
}
```

## Virtual Application Management

### Create Virtual Application

Creates a virtual payment application between participants.

**Request:**

```json
{
  "req": [3, "create_application", [{
    definition: {
      "protocol": "NitroRPC/0.2",
      "participants": [
        "0xAaBbCcDdEeFf0011223344556677889900aAbBcC",
        "0x00112233445566778899AaBbCcDdEeFf00112233"
      ],
      "weights": [50, 50],
      "quorum": 100,
      "challenge": 86400,
      "nonce": 1
    }
    token: "0xChannelTokenAddress"
    "allocations": [100, 100], // Target funding
    "channels": ["0xAlice-Bob", "0xCharlie-Bob",
    ],
    "signers": [
      "0x1234567890abcdef...",
      "0x2345678901abcdef..."
    ]
  }], 1619123456789],
  "acc": "0xHashOfvAppId",
  "int": [100, 100], // Initial funding intent from 0, 0
  "sig": ["0x9876fedcba..."]
}
```

**Response:**

```json
{
  "res": [3, "create_application", [{
    "app_id": "0x3456789012abcdef...",
    "status": "open"
  }], 1619123456789],
  "sig": ["0xabcd1234..."]
}
```

### Close Virtual Application

Closes a virtual payment application and redistributes funds.

**Request:**

```json
{
  "req": [4, "close_application", [{
    "app_id": "0x3456789012abcdef...",
    "allocations": [0, 200]
  }], 1619123456789],
  "acc": "0xHashOfvAppId",
  "int": [0, 200], // Last Intent the winnings
  "sig": ["0x9876fedcba...", "0x8765fedcba..."] // Signatures from all required signers
}
```

**Response:**

```json
{
  "res": [4, "close_application", [{
    "app_id": "0x3456789012abcdef...",
    "status": "closed"
  }], 1619123456789],
  "sig": ["0xabcd1234..."]
}
```

### Close Direct Channel

Closes a direct channel between a participant and the broker.

**Request:**

```json
{
  "req": [5, "close_channel", [{
    "channel_id": "0x4567890123abcdef..."
  }], 1619123456789],
  "sig": ["0x9876fedcba..."]
}
```

**Response:**

```json
{
  "res": [5, "close_channel", [{
    "channel_id": "0x4567890123abcdef...",
    "state_data": "0x0000000000000000000000000000000000000000000000000000000000001ec7",
    "allocations": [
      {
        "destination": "0x1234567890abcdef...",
        "token": "0xeeee567890abcdef...",
        "amount": "50000"
      },
      {
        "destination": "0xbbbb567890abcdef...", // Broker address
        "token": "0xeeee567890abcdef...",
        "amount": "50000"
      }
    ],
    "state_hash": "0xLedgerStateHash",
    "hash_sig": [0xBrokerSignature]
  }], 1619123456789],
  "sig": ["0xabcd1234..."]
}
```

## Peer-to-Peer Messaging

### Send Message in Virtual Application

Sends a message to all participants in a virtual application.

**Request:**

```json
{
  "req": [6, "message", [{
    "message": "Hello, application participants!"
  }], 1619123456789],
  "acc": "0x3456789012abcdef...", // Virtual application ID
  "sig": ["0x9876fedcba..."]
}
```

This message is not acknowledged by the broker but is instead forwarded to all other participants in the specified virtual application.

## Utility Methods

### Ping

Simple ping to check connectivity.

**Request:**

```json
{
  "req": [7, "ping", [], 1619123456789],
  "sig": ["0x9876fedcba..."]
}
```

**Response:**

```json
{
  "res": [7, "pong", [], 1619123456789],
  "sig": ["0xabcd1234..."]
}
```

### Get Configuration

Retrieves broker configuration information.

**Request:**

```json
{
  "req": [8, "get_config", [], 1619123456789],
  "sig": ["0x9876fedcba..."]
}
```

**Response:**

```json
{
  "res": [8, "get_config", [{
    "brokerAddress": "0xbbbb567890abcdef..."
  }], 1619123456789],
  "sig": ["0xabcd1234..."]
}
```

## Error Handling

When an error occurs, the server responds with an error message:

```json
{
  "res": [REQUEST_ID, "error", [{
    "error": "Error message describing what went wrong"
  }], 1619123456789],
  "sig": ["0xabcd1234..."]
}
```

## Security Considerations

1. **Challenge Expiration**: Authentication challenges expire after 5 minutes
2. **One-time Use**: Each challenge can only be used once
3. **Rate Limiting**: The server limits the number of active challenges (max 1000)
4. **Signature Verification**: All RPC messages must be properly signed by the sender
5. **Session Management**: Sessions expire after a configurable period (default 24 hours)
6. **Address Binding**: Each challenge is stored with the address that requested it, creating a cryptographic binding between the address and the challenge
7. **Random Challenge Strings**: Secure, random strings are used as challenge tokens to prevent guessing
8. **Protocol Design**: The authentication flow requires proving knowledge of the private key through message signing

## Client Implementation Guidelines

1. **Authentication Flow**:
   - Begin by sending an `auth_request` request with your Ethereum address
   - Store the challenge string received from the server
   - Send an `auth_verify` request with your address and the challenge string
   - Store the session token and maintain it with regular activity

2. **Message Signing**:
   - Sign all RPC request messages with your private key
   - The signature proves ownership of the address
   - Verify signatures on all server responses for security

3. **Error Handling**:
   - Be prepared to handle session expiration
   - Implement reconnection and re-authentication logic
   - Handle rate limiting errors by implementing backoff strategies
   - Implement timeouts for all requests

4. **Security Best Practices**:
   - Never reuse signatures across different sessions or services
   - Verify all message signatures from the server before processing
   - Ensure your private key is securely stored and never exposed
   - Generate a fresh unique identifier client-side for each request ID

