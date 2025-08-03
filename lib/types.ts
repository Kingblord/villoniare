export interface QuoteData {
  usdAmountToSpend: number
  tokenSymbol: string
  recipientAddress: string
  estimatedBnbRequired: number
  estimatedUsdCost: number
  estimatedTokensReceived: number
  treasuryFlatFeeUsd: number
  devFeeUsd: number
  treasuryTokenFeePercent: number
  canAfford: boolean
  userBnbBalance: number
  userWbnbBalance: number
  bnbPriceUsd: number
  quoteExpiry: number
  tx: {
    from: string
    to: string
    data: string
    value: string
    gas: string
    gasPrice: string
  }
  sellAmount: string
  buyAmount: string
}
