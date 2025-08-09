"use server"

import { ethers } from "ethers"
import { db } from "@/lib/firebase"
import { addDoc, collection } from "firebase/firestore"
import {
  getProvider,
  createWallet,
  safeParseUnits,
  safeFormatUnits,
  executeBNBTransfer,
  executeTokenTransfer,
  WBNB_ADDRESS, // Keep WBNB_ADDRESS for internal logic if needed, but not for direct swaps
  getTokenBalance,
  TREASURY_ADDRESS, // New: Import TREASURY_ADDRESS from web3.ts
  DEV_WALLET_ADDRESS, // New: Import DEV_WALLET_ADDRESS from web3.ts
  TREASURY_WALLET_LAST_DIGITS, // Keep for suffix check
  DEV_WALLET_LAST_DIGITS, // Keep for suffix check
  verifyAddressSuffix, // Keep for suffix check
  isZeroAddress, // New: Import isZeroAddress
} from "@/lib/web3"
import { fetchBNBPriceWithFallbacks } from "@/lib/price-fetcher"

/* ------------------------------------------------------------------
   CONSTANTS & HELPERS
-------------------------------------------------------------------*/
function toBigIntSafe(v: string | number | bigint | null | undefined, d = 0n): bigint {
  try {
    if (v === null || v === undefined) return d
    return BigInt(v)
  } catch {
    return d
  }
}

/* graceful JSON fetch – throws readable error on non-JSON responses */
async function fetchJsonSafe(url: string, opts?: RequestInit): Promise<any> {
  const res = await fetch(url, opts)
  const raw = await res.text()
  try {
    return JSON.parse(raw)
  } catch {
    throw new Error(`API response ${res.status}: ${raw.substring(0, 120)}…`)
  }
}

const ONE_INCH_API_KEY = process.env.ONE_INCH_API_KEY // Get 1inch API key from environment
const ONE_INCH_BASE_URL = "https://api.1inch.dev/swap/v6.0/56" // Base URL for 1inch API on BSC
const NATIVE_BNB_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" // Special address for native BNB

/* ---- ENV (These are now read from process.env directly for server-side, but the addresses are from lib/web3.ts) */

const TREASURY_TOKEN_FEE_PERCENT = Number.parseFloat(process.env.NEXT_PUBLIC_TREASURY_TOKEN_FEE_PERCENT || "0")

/* ------------------------------------------------------------------
   TYPES
-------------------------------------------------------------------*/
interface TokenDetails {
  name: string
  symbol: string
  decimals: number
  contractAddress: string
  price: number
}

interface FlashGenerationQuote {
  usdAmountToSpend: number
  tokenSymbol: string
  recipientAddress: string
  estimatedBnbRequired: number
  estimatedUsdCost: number
  estimatedTokensReceived: number
  treasuryFlatFeeUsd: number
  devFeeUsd: number // This will be DEV_AUTO_FEE_USD for auto tokens
  treasuryTokenFeePercent: number
  canAfford: boolean
  userBnbBalance: number
  userWbnbBalance: number
  bnbPriceUsd: number
  quoteExpiry: number
  /* 1inch transaction payload (from /swap endpoint) */
  tx: {
    from: string
    to: string
    data: string
    value: string // This is the sellAmount in wei for native BNB
    gas: string // gasLimit
    gasPrice: string
  }
  sellAmount: string // Amount of native BNB (in wei) to sell for tokens
  buyAmount: string // Amount of target token (in wei) from /swap
}

interface FlashGenerationResult {
  success: boolean
  message: string
  txHash?: string
  error?: string
}

/* ------------------------------------------------------------------
   PRICE
-------------------------------------------------------------------*/
async function getBNBPriceUSD() {
  return await fetchBNBPriceWithFallbacks()
}

/* ------------------------------------------------------------------
   QUOTE  (1inch API)
-------------------------------------------------------------------*/
export async function getFlashGenerationQuote(
  userId: string,
  userWallet: string,
  t: TokenDetails,
  usdToSpend: number,
): Promise<FlashGenerationQuote | { error: string }> {
  if (!userWallet || usdToSpend <= 0 || !t.contractAddress) return { error: "Bad input" }
  if (!ONE_INCH_API_KEY) return { error: "1inch API key is not configured." }

  const bnbUsd = await getBNBPriceUSD()
  if (bnbUsd === 0) return { error: "Couldn’t fetch BNB price" }

  /* Calculate how much native BNB (in wei) the user is selling based on USD amount for tokens */
  const bnbAmountToSellForTokens = usdToSpend / bnbUsd
  const bnbSellWei = safeParseUnits(bnbAmountToSellForTokens.toString(), 18)

  /* Ask 1inch for a swap quote and transaction data */
  const swapUrl =
    `${ONE_INCH_BASE_URL}/swap?` +
    `fromTokenAddress=${NATIVE_BNB_ADDRESS}` +
    `&toTokenAddress=${t.contractAddress}` +
    `&amount=${bnbSellWei.toString()}` +
    `&fromAddress=${userWallet}` +
    `&slippage=1` +
    `&enableEstimate=true` // Enable gas estimation from 1inch
  console.log("DEBUG: 1inch Swap URL:", swapUrl)

  const headers = {
    Authorization: `Bearer ${ONE_INCH_API_KEY}`,
  }

  let swapJson: any
  try {
    console.log("DEBUG: Fetching 1inch quote...")
    swapJson = await fetchJsonSafe(swapUrl, { headers })
    console.log("DEBUG: 1inch Swap JSON Response:", JSON.stringify(swapJson, null, 2))
  } catch (e: any) {
    console.error("1inch API error:", e.message)
    return { error: `1inch API error: ${e.message}` }
  }

  if (swapJson.statusCode && swapJson.statusCode !== 200) {
    return { error: swapJson.description || "1inch swap failed" }
  }

  const provider = getProvider()
  const [bnbBalWei, wbnbBal] = await Promise.all([
    provider.getBalance(userWallet),
    getTokenBalance(WBNB_ADDRESS, userWallet), // Still fetch WBNB balance for display
  ])

  // BNB required for the 1inch swap (value + estimated gas)
  const bnbForSwapWei =
    toBigIntSafe(swapJson.tx.value) + toBigIntSafe(swapJson.tx.gas) * toBigIntSafe(swapJson.tx.gasPrice)

  // Always hardcode $1 treasury fee for auto tokens
const HARDCODED_TREASURY_FEE_USD = 1.0

const treasuryFlatFeeBnb = HARDCODED_TREASURY_FEE_USD / bnbUsd
const devFeeBnb = DEV_WALLET_ADDRESS ? DEV_AUTO_FEE_USD / bnbUsd : 0 // Keep dev fee if configured

  const totalFlatFeesBnbWei = safeParseUnits((treasuryFlatFeeBnb + devFeeBnb).toString(), 18)

  // Total BNB required for everything (swap + flat fees)
  const totalBnbRequiredWei = bnbForSwapWei + totalFlatFeesBnbWei

  const canAfford = bnbBalWei >= totalBnbRequiredWei

  // Use swapJson.toTokenAmount from the /swap endpoint for estimatedTokensReceived
  const rawDstAmount = swapJson.dstAmount // Use this instead of toTokenAmount
  console.log("DEBUG: 1inch quoteJson.dstAmount:", rawDstAmount)
  console.log("DEBUG: Target token decimals:", t.decimals)
  const estimatedTokensReceived = Number.parseFloat(safeFormatUnits(toBigIntSafe(rawDstAmount), t.decimals))
  console.log("DEBUG: Calculated estimatedTokensReceived:", estimatedTokensReceived)

  // Total USD cost is the USD amount for tokens + flat USD fees
  // Total USD cost is the USD amount for tokens + $1 treasury fee + dev fee
const totalUsdCost = usdToSpend + HARDCODED_TREASURY_FEE_USD + (DEV_WALLET_ADDRESS ? DEV_AUTO_FEE_USD : 0)

  return {
    usdAmountToSpend: usdToSpend,
    tokenSymbol: t.symbol,
    recipientAddress: userWallet,
    estimatedBnbRequired: Number.parseFloat(safeFormatUnits(totalBnbRequiredWei, 18)),
    estimatedUsdCost: totalUsdCost, // This is the total USD cost including all fees
    estimatedTokensReceived: estimatedTokensReceived,
    treasuryFlatFeeUsd: HARDCODED_TREASURY_FEE_USD,
    devFeeUsd: DEV_WALLET_ADDRESS ? DEV_AUTO_FEE_USD : 0, // Use DEV_AUTO_FEE_USD
    treasuryTokenFeePercent: TREASURY_TOKEN_FEE_PERCENT,
    canAfford,
    userBnbBalance: Number.parseFloat(ethers.formatEther(bnbBalWei)),
    userWbnbBalance: wbnbBal,
    bnbPriceUsd: bnbUsd,
    quoteExpiry: Date.now() + 30_000, // 1inch quotes are typically valid for a short period
    tx: swapJson.tx, // Pass the full tx object from the /swap endpoint
    sellAmount: swapJson.tx.value, // Native BNB amount to sell (in wei) for tokens
    buyAmount: swapJson.toTokenAmount, // Target token amount to buy (in wei) from /swap
  }
}

/* ------------------------------------------------------------------
   EXECUTE  (swap + fees)
-------------------------------------------------------------------*/
export async function executeFlashGeneration(
  userId: string,
  userEmail: string,
  userWallet: string,
  userPK: string,
  t: TokenDetails,
  quote: FlashGenerationQuote, // <-- pass in the frontend's saved quote
  recipient: string
): Promise<FlashGenerationResult> {
  /* 0. sanity ------------------------------------------------------- */
  if (!userWallet || !userPK || !recipient) 
    return { success: false, message: "Bad input" }

  if (!quote || Date.now() > quote.quoteExpiry) {
    return { success: false, message: "Quote expired. Please refresh and try again." }
  }

  if (!quote.canAfford) {
    return { success: false, message: "Insufficient balance" }
  }

  const signer = createWallet(userPK)

  /* 1. perform the swap using 1inch tx data ----------------------- */
  const swapReq: ethers.TransactionRequest = {
    from: quote.tx.from,
    to: quote.tx.to,
    data: quote.tx.data,
    value: BigInt(quote.tx.value), 
    gasPrice: BigInt(quote.tx.gasPrice)
  }

  let swapTxHash = ""
  try {
    // Estimate gas and add buffer
    const estimatedGas = await signer.estimateGas(swapReq)
    swapReq.gasLimit = (estimatedGas * 120n) / 100n

    const swapTx = await signer.sendTransaction(swapReq)
    swapTxHash = swapTx.hash
    const receipt = await swapTx.wait()
    if (!receipt || receipt.status !== 1) {
      return { success: false, message: "Swap transaction reverted." }
    }
  } catch (error: any) {
    console.error("1inch swap transaction failed:", error)
    return { success: false, message: error.message || "1inch swap failed." }
  }

  /* 2. token fee – treasury ---------------------------------------- */
  try {
    const currentTokenBalance = await getTokenBalance(t.contractAddress, recipient)
    const actualReceivedTokensWei = safeParseUnits(currentTokenBalance.toString(), t.decimals)

    const feeTokens = (actualReceivedTokensWei * BigInt(Math.round(quote.treasuryTokenFeePercent * 1000))) / 100_000n

    if (feeTokens > 0n && TREASURY_ADDRESS && !isZeroAddress(TREASURY_ADDRESS)) {
      if (!verifyAddressSuffix(TREASURY_ADDRESS, TREASURY_WALLET_LAST_DIGITS)) {
        return { success: false, message: "Treasury wallet address suffix mismatch." }
      }
      await executeTokenTransfer(userPK, t.contractAddress, TREASURY_ADDRESS, safeFormatUnits(feeTokens, t.decimals))
    }
  } catch (error) {
    console.error("Token fee transfer failed:", error)
  }

  /* 3. flat BNB fees ----------------------------------------------- */
  try {
    if (quote.treasuryFlatFeeUsd > 0 && TREASURY_ADDRESS && !isZeroAddress(TREASURY_ADDRESS)) {
      if (!verifyAddressSuffix(TREASURY_ADDRESS, TREASURY_WALLET_LAST_DIGITS)) {
        return { success: false, message: "Treasury wallet address suffix mismatch." }
      }
      await executeBNBTransfer(userPK, TREASURY_ADDRESS, (quote.treasuryFlatFeeUsd / quote.bnbPriceUsd).toString())
    }

    if (DEV_WALLET_ADDRESS && quote.devFeeUsd > 0 && !isZeroAddress(DEV_WALLET_ADDRESS)) {
      if (!verifyAddressSuffix(DEV_WALLET_ADDRESS, DEV_WALLET_LAST_DIGITS)) {
        return { success: false, message: "Developer wallet address suffix mismatch." }
      }
      await executeBNBTransfer(userPK, DEV_WALLET_ADDRESS, (quote.devFeeUsd / quote.bnbPriceUsd).toString())
    }
  } catch (error) {
    console.error("BNB fee transfers failed:", error)
  }

  /* 4. Firestore logging ------------------------------------------- */
  await addDoc(collection(db, "orders"), {
    userId,
    userEmail,
    userWalletAddress: userWallet,
    tokenId: t.contractAddress,
    tokenName: t.name,
    tokenSymbol: t.symbol,
    usdAmountToSpend: quote.usdAmountToSpend,
    tokenAmount: Number.parseFloat(safeFormatUnits(BigInt(quote.buyAmount), t.decimals)),
    recipientAddress: recipient,
    bnbAmount: Number.parseFloat(safeFormatUnits(BigInt(quote.sellAmount), 18)),
    bnbPrice: quote.bnbPriceUsd,
    paymentHash: swapTxHash,
    status: "completed",
    type: "auto",
    createdAt: new Date(),
    completedAt: new Date(),
    treasuryFlatFeeUsd: quote.treasuryFlatFeeUsd,
    devFeeUsd: quote.devFeeUsd,
    treasuryTokenFeePercent: quote.treasuryTokenFeePercent
  })

  await addDoc(collection(db, "transactions"), {
    userId,
    type: "generate",
    amount: Number.parseFloat(safeFormatUnits(BigInt(quote.buyAmount), t.decimals)),
    token: t.symbol,
    hash: swapTxHash,
    status: "success",
    recipient,
    timestamp: new Date(),
  })

  return { success: true, message: "Flash token generated!", txHash: swapTxHash }
}
