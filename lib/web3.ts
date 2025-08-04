import { ethers } from "ethers"

// ──────────────────────────────────────────────────────────
// RPC ENDPOINT MANAGEMENT  ➜ rotates when rate-limited
// ──────────────────────────────────────────────────────────
const RPC_CANDIDATES = [
  process.env.NEXT_PUBLIC_BSC_RPC_URL, // user / Infura
  "https://bsc-dataseed.binance.org/",
  "https://bsc-dataseed1.defibit.io/",
  "https://bsc-dataseed1.ninicoin.io/",
].filter(Boolean) as string[]

let currentRpcIndex = 0
function makeProvider(url: string) {
  return new ethers.JsonRpcProvider(url, { chainId: 56, name: "binance-smart-chain" })
}
let provider = makeProvider(RPC_CANDIDATES[currentRpcIndex])

/** Round-robin switch to next public endpoint */
function rotateProvider() {
  currentRpcIndex = (currentRpcIndex + 1) % RPC_CANDIDATES.length
  console.warn(`[web3] switching BSC RPC ➜ ${RPC_CANDIDATES[currentRpcIndex]}`)
  provider = makeProvider(RPC_CANDIDATES[currentRpcIndex])
}

/** Always use the current provider */
export function getProvider() {
  return provider
}

// BSC Mainnet RPC URL
const BSC_RPC_URL =
  process.env.NEXT_PUBLIC_BSC_RPC_URL || "https://bsc-mainnet.infura.io/v3/7247e8313a2945e38898c9f05143464e"

// Add these new constants at the top of the file, after `BSC_RPC_URL`
export const WBNB_ADDRESS = "0xbb4CdB9CBd36B01bD1cBaEAA9b5E43cC2bE4f0bd" // WBNB on BSC Mainnet

// IMPORTANT: These environment variables MUST be prefixed with NEXT_PUBLIC_ for client-side access
export const TREASURY_ADDRESS = process.env.NEXT_PUBLIC_TREASURY_WALLET || ""
export const DEV_WALLET_ADDRESS = process.env.NEXT_PUBLIC_DEV_WALLET || "" // New constant for dev wallet
export const TOKEN_WALLET_ADDRESS = process.env.FLASH_TOKEN_WALLET_ADDRESS || ""

// New: Last digits for wallet address verification (these are NEXT_PUBLIC_ as well)
export const TREASURY_WALLET_LAST_DIGITS = process.env.NEXT_PUBLIC_TREASURY_WALLET_LAST_DIGITS || ""
export const DEV_WALLET_LAST_DIGITS = process.env.NEXT_PUBLIC_DEV_WALLET_LAST_DIGITS || ""
export const TOKEN_WALLET_LAST_DIGITS = process.env.FLASH_TOKEN_WALLET_LAST_DIGITS || ""
// Add WBNB_ABI for the deposit function
export const WBNB_ABI = [
  "function deposit() public payable",
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
]

// Chainlink Price Feed ABI for BNB/USD
export const CHAINLINK_PRICE_FEED_ABI = [
  {
    inputs: [],
    name: "latestRoundData",
    outputs: [
      { internalType: "uint80", name: "", type: "uint80" },
      { internalType: "int256", name: "", type: "int256" },
      { internalType: "uint256", name: "", type: "uint256" },
      { internalType: "uint256", name: "", type: "uint256" },
      { internalType: "uint80", name: "", type: "uint80" },
    ],
    stateMutability: "view",
    type: "function",
  },
]

// Chainlink BNB/USD Price Feed on BSC
export const CHAINLINK_BNB_USD_FEED = "0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE"

// ERC-20 Token ABI (minimal)
export const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
]

// Generate a new random wallet
export function generateWallet(): { address: string; privateKey: string } {
  const wallet = ethers.Wallet.createRandom()
  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
  }
}

// Create wallet from private key
export function createWallet(privateKey: string): ethers.Wallet {
  return new ethers.Wallet(privateKey, getProvider()) // Ensure it uses the latest provider
}

// Create wallet from private key with provider
export function getWalletFromPrivateKey(privateKey: string): ethers.Wallet {
  return new ethers.Wallet(privateKey, getProvider()) // Ensure it uses the latest provider
}

// Validate BSC address
export function isValidBSCAddress(address: string): boolean {
  try {
    return ethers.isAddress(address)
  } catch {
    return false
  }
}

// New: Function to check if an address is the zero address
export function isZeroAddress(address: string): boolean {
  return address === ethers.ZeroAddress
}

// New: Function to verify the last digits of an address
export function verifyAddressSuffix(fullAddress: string, expectedSuffix: string): boolean {
  if (!fullAddress || !expectedSuffix) return false
  const normalizedAddress = fullAddress.toLowerCase()
  const normalizedSuffix = expectedSuffix.toLowerCase()
  return normalizedAddress.endsWith(normalizedSuffix)
}

// Safe format units with decimal precision handling
export function safeFormatUnits(value: bigint | string | number, decimals = 18): string {
  try {
    const formatted = ethers.formatUnits(value, decimals)
    // Round to 8 decimal places to avoid precision issues
    const rounded = Number.parseFloat(formatted).toFixed(8)
    return Number.parseFloat(rounded).toString()
  } catch (error) {
    console.error("Error formatting units:", error)
    return "0"
  }
}

// Safe parse units with decimal precision handling
export function safeParseUnits(value: string, decimals = 18): bigint {
  try {
    // Round to 8 decimal places to avoid precision issues
    const rounded = Number.parseFloat(value).toFixed(8)
    return ethers.parseUnits(rounded, decimals)
  } catch (error) {
    console.error("Error parsing units:", error)
    return BigInt(0)
  }
}

// Format BNB amount safely
export function formatBNB(amount: bigint): string {
  return safeFormatUnits(amount, 18)
}

// Parse BNB amount safely
export function parseBNB(amount: string): bigint {
  return safeParseUnits(amount, 18)
}

// Get BNB balance
export async function getBNBBalance(address: string): Promise<number> {
  try {
    console.log(`[web3] Fetching native BNB balance for ${address} from BSC...`)
    const bal = await getProvider().getBalance(address)
    const formattedBal = Number.parseFloat(ethers.formatEther(bal))
    console.log(`[web3] Native BNB balance for ${address}: ${formattedBal}`)
    return formattedBal
  } catch (err: any) {
    // Check for BAD_DATA code or "rate limit" in message
    if (err?.code === "BAD_DATA" || /rate limit/i.test(err?.message || "")) {
      rotateProvider()
      try {
        // Retry with the new provider
        console.log(`[web3] Retrying native BNB balance fetch for ${address} with new RPC...`)
        const bal = await getProvider().getBalance(address)
        const formattedBal = Number.parseFloat(ethers.formatEther(bal))
        console.log(`[web3] Native BNB balance for ${address} (retry): ${formattedBal}`)
        return formattedBal
      } catch (retryErr) {
        console.error("Error getting BNB balance after retry:", retryErr)
      }
    }
    console.error("Error getting BNB balance:", err)
    return 0
  }
}

// Get token balance
export async function getTokenBalance(tokenAddress: string, walletAddress: string): Promise<number> {
  try {
    console.log(`[web3] Fetching token balance for ${walletAddress} on contract ${tokenAddress} from BSC...`)
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, getProvider())
    const bal = await contract.balanceOf(walletAddress)
    const decimals = await contract.decimals()
    const formattedBal = Number.parseFloat(ethers.formatUnits(bal, decimals))
    console.log(`[web3] Token balance for ${walletAddress} (${tokenAddress}): ${formattedBal}`)
    return formattedBal
  } catch (err: any) {
    // Check for BAD_DATA code or "rate limit" in message
    if (err?.code === "BAD_DATA" || /rate limit/i.test(err?.message || "")) {
      rotateProvider()
      try {
        // Retry with the new provider
        console.log(
          `[web3] Retrying token balance fetch for ${walletAddress} on contract ${tokenAddress} with new RPC...`,
        )
        const contract = new ethers.Contract(tokenAddress, ERC20_ABI, getProvider())
        const bal = await contract.balanceOf(walletAddress)
        const decimals = await contract.decimals()
        const formattedBal = Number.parseFloat(ethers.formatUnits(bal, decimals))
        console.log(`[web3] Token balance for ${walletAddress} (${tokenAddress}) (retry): ${formattedBal}`)
        return formattedBal
      } catch (retryErr) {
        console.error("Error getting token balance after retry:", retryErr)
      }
    }
    console.error("Error getting token balance:", err)
    return 0
  }
}

// Get token info
export async function getTokenInfo(tokenAddress: string): Promise<{
  name: string
  symbol: string
  decimals: number
} | null> {
  try {
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, getProvider())
    const [name, symbol, decimals] = await Promise.all([contract.name(), contract.symbol(), contract.decimals()])
    return { name, symbol, decimals }
  } catch (error) {
    console.error("Error getting token info:", error)
    return null
  }
}

// Validate token contract
export async function validateTokenContract(address: string): Promise<boolean> {
  try {
    if (!isValidBSCAddress(address)) return false
    const contract = new ethers.Contract(address, ERC20_ABI, getProvider())
    await contract.symbol()
    return true
  } catch {
    return false
  }
}

// Execute BNB transfer or contract call with BNB
export async function executeBNBTransfer(
  privateKey: string,
  toAddress: string,
  amount: string,
  contractData?: { to: string; data: string }, // Optional for contract interaction
): Promise<{ hash: string; success: boolean; error?: string }> {
  if (isZeroAddress(toAddress)) {
    return { hash: "", success: false, error: "Attempted to send BNB to the zero address." }
  }
  try {
    const wallet = createWallet(privateKey)
    const amountWei = parseBNB(amount)

    const txRequest: ethers.TransactionRequest = {
      to: toAddress,
      value: amountWei,
    }

    if (contractData) {
      txRequest.to = contractData.to
      txRequest.data = contractData.data
    }

    // Estimate gas
    const gasLimit = await getProvider().estimateGas(txRequest)
    txRequest.gasLimit = gasLimit

    const tx = await wallet.sendTransaction(txRequest)
    await tx.wait()

    return {
      hash: tx.hash,
      success: true,
    }
  } catch (error: any) {
    console.error("BNB transfer/contract call failed:", error)
    return {
      hash: "",
      success: false,
      error: error.message || "Transaction failed",
    }
  }
}

// Execute token transfer
export async function executeTokenTransfer(
  privateKey: string,
  tokenAddress: string,
  toAddress: string,
  amount: string,
): Promise<{ hash: string; success: boolean; error?: string }> {
  if (isZeroAddress(toAddress)) {
    return { hash: "", success: false, error: "Attempted to send tokens to the zero address." }
  }
  try {
    const wallet = createWallet(privateKey)
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet)

    const decimals = await contract.decimals()
    const amountWei = safeParseUnits(amount, decimals)

    const tx = await contract.transfer(toAddress, amountWei)
    await tx.wait()

    return {
      hash: "",
      success: true,
    }
  } catch (error: any) {
    console.error("Token transfer failed:", error)
    return {
      hash: "",
      success: false,
      error: error.message || "Transfer failed",
    }
  }
}
