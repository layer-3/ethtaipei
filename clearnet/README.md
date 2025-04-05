# ClearNet RPC API

ClearNet implements a WebSocket-based RPC API for managing payment channels and message routing in a state channel network.

## Message Format

All RPC messages follow this format:

```json
{
  "req": [REQUEST_ID, METHOD, PARAMS, TIMESTAMP],
  "sig": ["SIGNATURE"]
}
```

Response:

```json
{
  "res": [REQUEST_ID, METHOD, RESPONSE_PARAMS, TIMESTAMP],
  "sig": ["SIGNATURE"]
}
```

## Authentication

Before using any API methods, clients must authenticate:

```json
{
  "req": [1, "auth", ["0xYOUR_ETH_ADDRESS"], 1680000000],
  "sig": ["0xSIGNATURE"]
}
```

The signature must be created by signing the request array with your Ethereum private key.

## API Methods

### Create Virtual Channel

Creates a payment channel between two participants.

**Method:** `create_virtual_channel`

**Parameters:**
```json
{
  "participantA": "0xAddress1",
  "participantB": "0xAddress2",
  "token_address": "0xTokenAddress",
  "amountA": "1000000000000000000",
  "amountB": "1000000000000000000",
  "adjudicator": "0xAdjudicatorAddress", // optional
  "challenge": 86400, // optional, default: 24 hours in seconds
  "nonce": 123456789 // optional, default: current timestamp
}
```

**Response:**
```json
{
  "channelId": "0xChannelID",
  "status": "created",
  "participantA": "0xAddress1",
  "participantB": "0xAddress2"
}
```

### Close Channel

Closes a virtual channel and redistributes funds.

**Method:** `close_channel`

**Parameters:**
```json
{
  "channelId": "0xChannelID",
  "allocations": [
    {
      "participant": "0xAddress1",
      "amount": "600000000000000000"
    },
    {
      "participant": "0xAddress2",
      "amount": "1400000000000000000"
    }
  ]
}
```

**Response:**
```json
{
  "channelId": "0xChannelID",
  "status": "closed"
}
```

### Send Message

Sends a message through a virtual channel.

**Method:** `send_message`

**Parameters:**
```json
{
  "channelId": "0xChannelID",
  "data": {
    "your": "message",
    "content": "here"
  }
}
```

**Response:**
The recipient address is returned.

### List Open Participants

Returns a list of participants available for creating virtual channels.

**Method:** `list_open_participants`

**Parameters:**
```json
{
  "token_address": "0xTokenAddress" // optional
}
```

**Response:**
```json
[
  {
    "address": "0xParticipantAddress1",
    "amount": 1000000000000000000
  },
  {
    "address": "0xParticipantAddress2",
    "amount": 2000000000000000000
  }
]
```

### Send Public Message

Broadcasts a message to all connected participants.

**Method:** `send_public_message`

**Parameters:**
```json
{
  "message": "Hello, everyone!"
}
```

**Response:**
```json
{
  "status": "sent",
  "message": "Hello, everyone!"
}
```
