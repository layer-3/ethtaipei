# Clearnet RPC Protocol

This document describes the RPC (Remote Procedure Call) protocol used in the Clearnet WebSocket communication.

## API Endpoints

| Method | Description |
|--------|-------------|
| `auth` | Initiates authentication with the server |
| `verify` | Completes authentication with a challenge response |
| `ping` | Simple connectivity check |
| `get_config` | Retrieves broker configuration |
| `list_participants` | Lists available participants for virtual channels |
| `create_virtual_channel` | Creates a new virtual payment channel |
| `close_virtual_channel` | Closes a virtual payment channel |
| `close_channel` | Closes a direct payment channel |

## RPC Message Format

All messages exchanged between clients and the Clearnet broker follow a standardized format:

### Request Message

```json
{
  "req": [REQUEST_ID, METHOD, [PARAMETERS], TIMESTAMP],
  "cid": "CHANNEL_ID",  // Optional: only for channel-specific messages
  "out": [ALLOCATIONS], // Optional
  "sig": ["SIGNATURE"]  // Client's signature of the entire "req" object
}
```

### Response Message

```json
{
  "res": [REQUEST_ID, METHOD, [RESPONSE_DATA], TIMESTAMP],
  "cid": "CHANNEL_ID",  // Optional: only for channel-specific messages
  "out": [ALLOCATIONS], // Optional
  "sig": ["SIGNATURE"]  // Server's signature of the entire "res" object
}
```

The structure breakdown:
- `REQUEST_ID`: A unique identifier for the request (uint64)
- `METHOD`: The name of the method being called (string)
- `PARAMETERS`/`RESPONSE_DATA`: An array of parameters/response data (array)
- `TIMESTAMP`: Unix timestamp of the request/response (uint64)
- `CHANNEL_ID` (`cid`): Optional channel ID for virtual channel messages. If specified, the message is routed directly to participants in that virtual channel rather than being processed by the broker.
- `ALLOCATIONS` (`out`): Optional token allocations for channel operations
- `SIGNATURE`: Cryptographic signature of the message for authentication/verification

### Allocation Format

Allocations specify token distributions for channel operations:

```json
{
  "destination": "0xParticipantAddress",
  "token": "0xTokenAddress",
  "amount": "10"
}
```

Each allocation contains:
- `destination`: Ethereum address of the participant (recipient)
- `token`: Contract address of the token being allocated
- `amount`: Amount of tokens to allocate (as a string to handle large numbers)

## Authentication Flow

The authentication process uses a challenge-response mechanism based on Ethereum signatures to verify that a client owns a particular Ethereum address.

### 1. Authentication Initialization

The client initiates authentication by sending an `auth` request with their address:

**Authentication Initialization Request from Client:**
```json
{
  "req": [1, "auth", ["0x1234567890abcdef..."], 1619123456789],
  "sig": ["0x5432abcdef..."] // Client's signature of the entire 'req' object
}
```

### 2. Challenge Response from Server

The server responds with a UUID challenge token:

**Challenge Message from Server:**
```json
{
  "res": [1, "challenge", [{
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
  "req": [2, "verify", [{
    "address": "0x1234567890abcdef...",
    "challenge": "550e8400-e29b-41d4-a716-446655440000"
  }], 1619123456789],
  "sig": ["0x2345bcdef..."] // Client's signature of the entire 'req' object
}
```

The server verifies that:
1. The challenge UUID is valid and not expired
2. The challenge was issued for the claimed address
3. The RPC message is signed by the address's private key

This challenge-based approach ensures that the client owns the private key for the address they claim to have and prevents replay attacks since each challenge is unique to a specific address.

### 4. Authentication Success Response

If authentication is successful, the server responds:

**Authentication Success Response:**
```json
{
  "res": [2, "verify", [{
    "address": "0x1234567890abcdef...",
    "success": true
  }], 1619123456789],
  "sig": ["0xabcd1234..."] // Server's signature of the entire 'res' object
}
```

## Virtual Channel Management

### List Available Participants

Lists all participants with whom virtual channels can be created.

**Request:**
```json
{
  "req": [2, "list_participants", [{
    "token_address": "0x1234567890abcdef..."
  }], 1619123456789],
  "sig": ["0x9876fedcba..."]
}
```

**Response:**
```json
{
  "res": [2, "list_participants", [[
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

### Create Virtual Channel

Creates a virtual payment channel between participants.

**Request:**
```json
{
  "req": [3, "create_virtual_channel", [{
    "participants": [
      "0x1234567890abcdef...",
      "0x2345678901abcdef..."
    ],
    "allocations": [
      {
        "destination": "0x1234567890abcdef...",
        "token": "0xeeee567890abcdef...",
        "amount": "100000"
      },
      {
        "destination": "0x2345678901abcdef...",
        "token": "0xeeee567890abcdef...",
        "amount": "0"
      }
    ],
    "signers": [
      "0x1234567890abcdef...",
      "0x2345678901abcdef..."
    ]
  }], 1619123456789],
  "sig": ["0x9876fedcba..."]
}
```

**Response:**
```json
{
  "res": [3, "create_virtual_channel", [{
    "channel_id": "0x3456789012abcdef...",
    "status": "open"
  }], 1619123456789],
  "sig": ["0xabcd1234..."]
}
```

### Close Virtual Channel

Closes a virtual payment channel and redistributes funds.

**Request:**
```json
{
  "req": [4, "close_virtual_channel", [{
    "channel_id": "0x3456789012abcdef...",
    "allocations": [
      {
        "destination": "0x1234567890abcdef...",
        "token": "0xeeee567890abcdef...",
        "amount": "50000"
      },
      {
        "destination": "0x2345678901abcdef...",
        "token": "0xeeee567890abcdef...",
        "amount": "50000"
      }
    ]
  }], 1619123456789],
  "sig": ["0x9876fedcba...", "0x8765fedcba..."] // Signatures from all required signers
}
```

**Response:**
```json
{
  "res": [4, "close_virtual_channel", [{
    "channel_id": "0x3456789012abcdef...",
    "status": "closed"
  }], 1619123456789],
  "sig": ["0xabcd1234..."]
}
```

### Close Direct Channel

Closes a direct payment channel between a participant and the broker.

**Request:**
```json
{
  "req": [5, "close_channel", [{
    "channel_id": "0x4567890123abcdef...",
    "funds_destination": "0x1234567890abcdef..."
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
    "server_signature": {
      "v": "27",
      "r": "0xabcd1234...",
      "s": "0x4321dcba..."
    }
  }], 1619123456789],
  "sig": ["0xabcd1234..."]
}
```

## Peer-to-Peer Messaging

### Send Message in Virtual Channel

Sends a message to all participants in a virtual channel.

**Request:**
```json
{
  "req": [6, "message", [{
    "message": "Hello, channel participants!"
  }], 1619123456789],
  "cid": "0x3456789012abcdef...", // Virtual channel ID
  "sig": ["0x9876fedcba..."]
}
```

This message is not acknowledged by the broker but is instead forwarded to all other participants in the specified virtual channel.

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
  "res": [8, "config", [{
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
7. **UUID Challenge Tokens**: Secure, random UUIDs are used as challenge tokens to prevent guessing
8. **Protocol Design**: The authentication flow requires proving knowledge of the private key through message signing

## Client Implementation Guidelines

1. **Authentication Flow**:
   - Begin by sending an `auth` request with your Ethereum address
   - Store the challenge UUID received from the server
   - Send a `verify` request with your address and the challenge UUID
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
   - Generate a fresh UUID client-side for each request ID