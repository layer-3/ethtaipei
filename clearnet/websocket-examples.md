# ClearNet WebSocket Protocol

This document describes the WebSocket API for ClearNet, including authentication, request/response formats, and examples of various operations.

## Connection and Authentication

### Connection
Connect to the WebSocket endpoint at `ws://your-server-url/ws`

### Authentication
Every client must authenticate as the first message sent after establishing a WebSocket connection.

<!-- TODO: add signing auth challenge -->

**Request:**
```json
{
  "req": [0, "auth", ["0x1234567890abcdef1234567890abcdef12345678"], 1712345678],
  "sig": ["0xf8699f9cfbefb4b48ee8fb7f78a7bc4be55f5dae4d0e06298e3e9e1a9e3ea5753b9c7e12f50dd4d8f2a2af7c2683b632ebc77f81c6ed72e24cfced3462068f61c"]
}
```

**Response:**
```json
{
  "res": [0, "auth", [{"address": "0x1234567890abcdef1234567890abcdef12345678", "success": true}], 1712345678],
  "sig": ["0xf8699f9cfbefb4b48ee8fb7f78a7bc4be55f5dae4d0e06298e3e9e1a9e3ea5753b9c7e12f50dd4d8f2a2af7c2683b632ebc77f81c6ed72e24cfced3462068f61c"]
}
```

## Message Format

### RPC Request Format
All requests follow this format:
```json
{
  "req": [requestId, "method", [params], timestamp],
  "sig": ["0xSignatureHex"]
}
```

- `requestId`: A unique identifier for this request (uint64)
- `method`: The method to invoke
- `params`: Array of parameters for the method
- `timestamp`: Unix timestamp in seconds (uint64)
- `sig`: Array of signatures signed by the sender's private key

### RPC Response Format
All responses follow this format:
```json
{
  "res": [requestId, "method", [responseData], timestamp],
  "sig": ["0xSignatureHex"]
}
```

### Virtual Channel Messages
Messages sent through a virtual channel include a channel ID:
```json
{
  "req": [requestId, "method", [params], timestamp],
  "cid": "0xVirtualChannelId",
  "sig": ["0xSignatureHex"]
}
```

### Allocation Format
Allocations specify token distributions:
```json
{
  "destination": "0xParticipantAddress",
  "token": "0xTokenAddress",
  "amount": "10"
}
```

## Basic Operations

### Ping
**Request:**
```json
{
  "req": [1, "ping", [], 1712345678],
  "sig": ["0xf8699f9cfbefb4b48ee8fb7f78a7bc4be55f5dae4d0e06298e3e9e1a9e3ea5753b9c7e12f50dd4d8f2a2af7c2683b632ebc77f81c6ed72e24cfced3462068f61c"]
}
```

**Response:**
```json
{
  "res": [1, "pong", [], 1712345678],
  "sig": ["0xf8699f9cfbefb4b48ee8fb7f78a7bc4be55f5dae4d0e06298e3e9e1a9e3ea5753b9c7e12f50dd4d8f2a2af7c2683b632ebc77f81c6ed72e24cfced3462068f61c"]
}
```

### Get Configuration
**Request:**
```json
{
  "req": [2, "get_config", [], 1712345678],
  "sig": ["0xf8699f9cfbefb4b48ee8fb7f78a7bc4be55f5dae4d0e06298e3e9e1a9e3ea5753b9c7e12f50dd4d8f2a2af7c2683b632ebc77f81c6ed72e24cfced3462068f61c"]
}
```

**Response:**
```json
{
  "res": [2, "config", [{"brokerAddress": "0xBrokerAddress"}], 1712345678],
  "sig": ["0xf8699f9cfbefb4b48ee8fb7f78a7bc4be55f5dae4d0e06298e3e9e1a9e3ea5753b9c7e12f50dd4d8f2a2af7c2683b632ebc77f81c6ed72e24cfced3462068f61c"]
}
```

## Channel Operations

### List Available Participants
**Request:**
```json
{
  "req": [3, "list_participants", [{"token_address": "0xTokenAddress"}], 1712345678],
  "sig": ["0xf8699f9cfbefb4b48ee8fb7f78a7bc4be55f5dae4d0e06298e3e9e1a9e3ea5753b9c7e12f50dd4d8f2a2af7c2683b632ebc77f81c6ed72e24cfced3462068f61c"]
}
```

**Response:**
```json
{
  "res": [3, "list_participants", [[
    {"address": "0xParticipant1", "amount": 100},
    {"address": "0xParticipant2", "amount": 50}
  ]], 1712345678],
  "sig": ["0xf8699f9cfbefb4b48ee8fb7f78a7bc4be55f5dae4d0e06298e3e9e1a9e3ea5753b9c7e12f50dd4d8f2a2af7c2683b632ebc77f81c6ed72e24cfced3462068f61c"]
}
```

### Create Virtual Channel
**Request:**
```json
{
  "req": [4, "create_virtual_channel", [{
    "participants": ["0xParticipant1", "0xParticipant2"],
    "allocations": [
      {"destination": "0xParticipant1", "token": "0xTokenAddress", "amount": "10"},
      {"destination": "0xParticipant2", "token": "0xTokenAddress", "amount": "5"}
    ],
    "signers": ["0xParticipant1", "0xParticipant2"]
  }], 1712345678],
  "sig": ["0xf8699f9cfbefb4b48ee8fb7f78a7bc4be55f5dae4d0e06298e3e9e1a9e3ea5753b9c7e12f50dd4d8f2a2af7c2683b632ebc77f81c6ed72e24cfced3462068f61c"]
}
```

**Response:**
```json
{
  "res": [4, "create_virtual_channel", [{
    "channel_id": "0xVirtualChannelId",
    "status": "open"
  }], 1712345678],
  "sig": ["0xf8699f9cfbefb4b48ee8fb7f78a7bc4be55f5dae4d0e06298e3e9e1a9e3ea5753b9c7e12f50dd4d8f2a2af7c2683b632ebc77f81c6ed72e24cfced3462068f61c"]
}
```

### Close Virtual Channel
**Request:**
```json
{
  "req": [5, "close_virtual_channel", [{
    "channel_id": "0xVirtualChannelId",
    "allocations": [
      {"destination": "0xParticipant1", "token": "0xTokenAddress", "amount": "12"},
      {"destination": "0xParticipant2", "token": "0xTokenAddress", "amount": "3"}
    ]
  }], 1712345678],
  "sig": ["0xSignatureParticipant1", "0xSignatureParticipant2"]
}
```

**Response:**
```json
{
  "res": [5, "close_virtual_channel", [{
    "channel_id": "0xVirtualChannelId",
    "status": "closed"
  }], 1712345678],
  "sig": ["0xf8699f9cfbefb4b48ee8fb7f78a7bc4be55f5dae4d0e06298e3e9e1a9e3ea5753b9c7e12f50dd4d8f2a2af7c2683b632ebc77f81c6ed72e24cfced3462068f61c"]
}
```

### Close Direct Channel
**Request:**
```json
{
  "req": [6, "close_channel", [{
    "channel_id": "0xDirectChannelId",
    "funds_destination": "0xUserWalletAddress"
  }], 1712345678],
  "sig": ["0xf8699f9cfbefb4b48ee8fb7f78a7bc4be55f5dae4d0e06298e3e9e1a9e3ea5753b9c7e12f50dd4d8f2a2af7c2683b632ebc77f81c6ed72e24cfced3462068f61c"]
}
```

**Response:**
```json
{
  "res": [6, "close_channel", [{
    "channel_id": "0xDirectChannelId",
    "state_data": "0x0000000000000000000000000000000000000000000000000000000000001ec7",
    "allocations": [
      {"destination": "0xUserWalletAddress", "token": "0xTokenAddress", "amount": "15"},
      {"destination": "0xBrokerAddress", "token": "0xTokenAddress", "amount": "5"}
    ],
    "server_signature": {
      "v": "27",
      "r": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      "s": "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"
    }
  }], 1712345678],
  "sig": ["0xf8699f9cfbefb4b48ee8fb7f78a7bc4be55f5dae4d0e06298e3e9e1a9e3ea5753b9c7e12f50dd4d8f2a2af7c2683b632ebc77f81c6ed72e24cfced3462068f61c"]
}
```

## Messaging

### Send Message Through Virtual Channel
**Request:**
```json
{
  "req": [8, "message", [{"text": "Hi there!", "data": {"key": "value"}}], 1712345678],
  "cid": "0xVirtualChannelId",
  "sig": ["0xf8699f9cfbefb4b48ee8fb7f78a7bc4be55f5dae4d0e06298e3e9e1a9e3ea5753b9c7e12f50dd4d8f2a2af7c2683b632ebc77f81c6ed72e24cfced3462068f61c"]
}
```

When a message is sent through a virtual channel, the broker forwards it directly to the other participants in the channel. The recipient(s) will receive the exact message that was sent.

## Error Response

When an error occurs, the response will contain an error message:

```json
{
  "res": [9, "error", [{
    "error": "Failed to create virtual channel: invalid number of participants"
  }], 1712345678],
  "sig": ["0xf8699f9cfbefb4b48ee8fb7f78a7bc4be55f5dae4d0e06298e3e9e1a9e3ea5753b9c7e12f50dd4d8f2a2af7c2683b632ebc77f81c6ed72e24cfced3462068f61c"]
}
```