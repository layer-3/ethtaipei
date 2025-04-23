# BROKER COMMUTICATION RPC PROTOCOL

## 📋 General RPC Message Format

### ➤ Requests
```json
{
  "req": [<requestId>, "<method>", [<args>], <timestamp>],
  "cid": "<channelId>",              // optional — route to virtual channel if specified
  "out": [
    { "participant": "0xAlice", "token_address": "0xToken1", "amount": "1000000000000000000" },
    { "participant": "0xBob",   "token_address": "0xToken1", "amount": "1000000000000000000" }
    ],
  "sig": ["<signature1>", ...]
}
```

### ➤ Responses
```json
{
  "res": [<requestId>, "<method>", [<responseData>], <timestamp>],
  "sig": ["<serverSignature>"]
}
```

 - **If `cid` is specified, broker routes the message to the specified virtual channel.**
 - **If `cid` is omitted, the method gets called on the broker.**


---

## 🔐 Authentication (First Required Message on Connection)

### Auth Request
```json
{
  "req": [0, "auth", ["0xAlice"], 1713870000],
  "sig": ["0xAliceSignature"]
}
```

### Auth Success Response
```json
{
  "success": true,
  "type": "auth_success",
  "data": {
    "address": "0xAlice"
  }
}
```

---

## 🛠️ Broker Methods

### 1. `CreateVirtualChannel`

#### ➤ Request
```json
{
  "req": [1, "CreateVirtualChannel", [
    {
      "participants": ["0xAlice", "0xBob"],
      "allocations": [
        { "participant": "0xAlice", "token_address": "0xToken1", "amount": "1000000000000000000" },
        { "participant": "0xBob",   "token_address": "0xToken1", "amount": "1000000000000000000" }
      ],
      "signers": ["0xAlice", "0xBob"] // Participants agree on a set of signers required to close the channel.
    }
  ], 1713870000],
  "sig": ["sigAlice", "sigBob"] // Message should be signed by all participants with non-zero allocation.
}
```

#### ⇦ Response
```json
{
  "res": [1, "CreateVirtualChannel", [
    { "channel_id": "0xabc123", "status": "opened" }
  ], 1713870200],
  "sig": ["sigServer"]
}
```

---

### 2. `CloseVirtualChannel`

#### ➤ Request
```json
{
  "req": [2, "CloseVirtualChannel", [
    {
      "channel_id": "0xabc123",
      "allocations": [
        { "participant": "0xAlice", "token_address": "0xToken1", "amount": "1500000000000000000" },
        { "participant": "0xBob",   "token_address": "0xToken1", "amount": "500000000000000000" }
      ]
    }
  ], 1713870020],
  "cid": "0xabc123",
  "sig": ["sigAlice", "sigBob"] // The message must be signed by the specified signers on channel creation.
}
```

#### ⇦ Response
```json
{
  "res": [2, "CloseVirtualChannel", [
    { "channel_id": "0xabc123", "status": "closed" }
  ], 1713870220],
  "sig": ["sigServer"]
}
```

---

### 3. `GetConfig`

#### ➤ Request
```json
{
  "req": [3, "GetConfig", [], 1713870050],
  "sig": ["sigAlice"]
}
```

#### ⇦ Response
```json
{
  "res": [3, "config", [
    { "brokerAddress": "0xBroker" }
  ], 1713870250],
  "sig": ["sigServer"]
}
```

---

### 4. `CloseDirectChannel`

#### ➤ Request
```json
{
  "req": [4, "CloseDirectChannel", [
    { "channel_id": "0x123channel", "funds_destination": "0xAliceWallet" }
  ], 1713870080],
  "sig": ["sigAlice"]
}
```

#### ⇦ Response
```json
{
  "res": [4, "CloseDirectChannel", [
    {
      "channel_id": "0x123channel",
      "state_data": "0x0000000000000000000000000000000000000000000000000000000000001ec7",
      "allocations": [
        { "participant": "0xAliceWallet", "token_address": "0xToken1", "amount": "1500000000000000000" },
        { "participant": "0xBroker",      "token_address": "0xToken1", "amount": "500000000000000000" }
      ],
      "server_signature": {
        "v": "27",
        "r": "0xabc...",
        "s": "0xdef..."
      }
    }
  ], 1713870280],
  "sig": ["sigServer"]
}
```

## The following methods are available but can be deprecated:

---

### 5. `ListOpenParticipants` (Can be deprecated)

Lists all participants that have opened a channel with broker and available funds.

#### ➤ Request
```json
{
  "req": [5, "ListOpenParticipants", [
    { "token_address": "0xToken1" }
  ], 1713870120],
  "sig": ["sigAlice"]
}
```

#### ⇦ Response
```json
{
  "res": [5, "ListOpenParticipants", [
    [
      { "address": "0xAlice", "amount": 1200000000000000000 },
      { "address": "0xBob",   "amount": 1000000000000000000 }
    ]
  ], 1713870330],
  "sig": ["sigServer"]
}
```

---

### 6. `BroadcastMessage` (Can be deprecated)

#### ➤ Request
```json
{
  "req": [6, "BroadcastMessage", [
    { "message": "System maintenance at 10PM UTC" }
  ], 1713870100],
  "sig": ["sigAlice"]
}
```

#### ⇦ Response
```json
{
  "res": [6, "BroadcastMessage", [
    { "status": "sent", "message": "System maintenance at 10PM UTC" }
  ], 1713870300],
  "sig": ["sigServer"]
}
```


---

### `ping` (Can be deprecated)

#### ➤ Request
```json
{
  "req": [8, "ping", [], 1713870600],
  "sig": ["sigAlice"]
}
```

#### ⇦ Response
```json
{
  "res": [8, "pong", [], 1713870601],
  "sig": ["sigServer"]
}
```

---

## ⚠️ Errors

All methods may return errors in this format:
```json
{
  "res": [9, "CreateVirtualChannel", [
    { "error": "insufficient funds" }
  ], 1713870700],
  "sig": ["sigServer"]
}
```
