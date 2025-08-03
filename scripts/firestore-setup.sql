-- Firestore Collections Structure
-- This is a reference for your Firestore database structure

-- Collection: users
-- Document ID: {userId}
{
"email": "user@example.com",
"walletAddress": "0x...",
"privateKey": "0x...", // Encrypted in production
"createdAt": "timestamp",
"tokens": [ // This array is for flash tokens the user has generated/received
  {
    "id": "flash-btc",
    "name": "Flash Bitcoin",
    "symbol": "FBTC",
    "balance": 0.5,
    "price": 45000,
    "contractAddress": "0x..."
  }
],
"trackedTokens": [ // NEW: Array for user-imported tokens
  {
    "contractAddress": "0x...",
    "name": "Custom Token Name",
    "symbol": "CTN",
    "decimals": 18,
    "importedAt": "timestamp"
  }
]
}

-- Collection: tokens
-- Document ID: {tokenId}
{
"name": "Flash Bitcoin",
"symbol": "FBTC",
"price": 0.01,
"fee": 1.0,
"type": "auto", // "auto" for instant generation, "manual" for admin processing
"description": "Generate Bitcoin flash tokens instantly",
"contractAddress": "0x...", // Required for "auto" type tokens
"vendor": "vendor_name", // for manual tokens
"active": true,
"createdAt": "timestamp",
"decimals": 18 // Decimals for auto tokens
}

-- Collection: transactions
-- Document ID: {transactionId}
{
"userId": "user_id",
"type": "generate", // "generate", "send", "receive", "vendor_payment"
"tokenId": "flash-btc",
"amount": 0.1,
"fee": 1.0,
"status": "completed", // "pending", "completed", "failed"
"txHash": "0x...",
"createdAt": "timestamp",
"orderType": "auto" // "auto" for instant generation, "manual" for admin processing
}

-- Collection: orders
-- Document ID: {orderId}
{
"userId": "user_id",
"userEmail": "user@example.com",
"userWalletAddress": "0x...",
"tokenId": "token_id",
"tokenName": "Flash Bitcoin",
"tokenSymbol": "FBTC",
"tokenAmount": 0.1,
"recipientAddress": "0x...",
"usdAmount": 100.0,
"bnbAmount": 0.5,
"bnbPrice": 200.0,
"paymentHash": "0x...",
"status": "pending", // "pending", "completed"
"createdAt": "timestamp",
"completedAt": "timestamp",
"type": "manual" // "auto" for instant generation, "manual" for admin processing
}
