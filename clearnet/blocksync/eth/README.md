# eth

The eth package centralizes Ethereum-related cryptographic helpers, currently focusing on two main areas:

1. EIP-712 Typed Data (Message) Signing and Verification
2. Secure Random Nonce Generation

---

## 1. EIP-712 Support

The package provides reliable EIP-712 signing tools:
- Typed data hashing (domain separation and message struct hashing).  
- Signature generation and verification following EIP-712 and EIP-191 standards.  
- Utility functions for domain separator computation, message hashing, and final typed data hashes.

### Key Exposed Types & Functions

- EIP712Domain  
- NonceMessage  
- ComputeDomainSeparator(domain EIP712Domain) → [32]byte  
- ComputeMessageHash(msg NonceMessage) → [32]byte  
- ComputeEIP712Hash(domainSep, messageHash [32]byte) → [32]byte  
- SignEIP712Hash(privKey, domain, msg) → ([]byte, error)  
- VerifySignature(domain, msg, sig, signerPubKey) → (bool, error)  

These utility methods allow signing arbitrary typed messages and verifying them against an expected signer.

## 2. Secure Random Nonce Generation

The package also supports generating secure random nonces:
- Nonce function to create a random, alphanumeric nonce of specified length (between 8 and 128).

For example:
```
nonce, err := eth.Nonce(32)
if err != nil {
  ...
}
```

## Usage Summary

1. Import “github.com/ethereum/go-ethereum/crypto” (and other appropriate dependencies if not already included in your project).  
2. Construct an EIP712Domain with your DApp name, version, chain ID, and verifying contract.  
3. Generate a random nonce or create your own NonceMessage.  
4. Use SignEIP712Hash to sign the message with your private key.  
5. On the receiving end, call VerifySignature for verification.  

For more examples, refer to the included tests (eip712_test.go) to see EIP-712 usage end-to-end.
