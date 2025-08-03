// Centralized price fetching with multiple fallback APIs
export interface BNBPriceResponse {
  price: number
  source: string
}

export async function fetchBNBPriceWithFallbacks(): Promise<number> {
  const apis = [
    {
      name: "CoinGecko",
      fetch: async (): Promise<number> => {
        const response = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=usd")
        if (!response.ok) throw new Error(`CoinGecko API error: ${response.status}`)
        const data = await response.json()
        return data.binancecoin?.usd || 0
      },
    },
    {
      name: "Binance",
      fetch: async (): Promise<number> => {
        const response = await fetch("https://api.binance.com/api/v3/ticker/price?symbol=BNBUSDT")
        if (!response.ok) throw new Error(`Binance API error: ${response.status}`)
        const data = await response.json()
        return Number.parseFloat(data.price) || 0
      },
    },
    {
      name: "DexScreener",
      fetch: async (): Promise<number> => {
        const response = await fetch(
          "https://api.dexscreener.com/latest/dex/pairs/bsc/0x58f876857a02d6762e0101bb5c46a8c1ed44dc16",
        )
        if (!response.ok) throw new Error(`DexScreener API error: ${response.status}`)
        const data = await response.json()
        // DexScreener returns pair data, we need the price from the pair
        if (data.pair && data.pair.priceUsd) {
          return Number.parseFloat(data.pair.priceUsd) || 0
        }
        throw new Error("Invalid DexScreener response format")
      },
    },
    {
      name: "CoinPaprika",
      fetch: async (): Promise<number> => {
        const response = await fetch("https://api.coinpaprika.com/v1/tickers/bnb-binance-coin")
        if (!response.ok) throw new Error(`CoinPaprika API error: ${response.status}`)
        const data = await response.json()
        return data.quotes?.USD?.price || 0
      },
    },
  ]

  let lastError: Error | null = null

  for (const api of apis) {
    try {
      console.log(`Attempting to fetch BNB price from ${api.name}...`)
      const price = await api.fetch()

      if (price > 0) {
        console.log(`Successfully fetched BNB price from ${api.name}: $${price}`)
        return price
      } else {
        throw new Error(`${api.name} returned invalid price: ${price}`)
      }
    } catch (error) {
      console.warn(`${api.name} price fetch failed:`, error)
      lastError = error as Error
      continue
    }
  }

  // If all APIs fail, log the error and return 0
  console.error("All BNB price APIs failed. Last error:", lastError)
  return 0
}

// Cached price fetching to avoid hitting APIs too frequently
let cachedPrice = 0
let cacheTimestamp = 0
const CACHE_DURATION = 60 * 1000 // 1 minute cache

export async function getCachedBNBPrice(): Promise<number> {
  const now = Date.now()

  // Return cached price if it's still fresh
  if (cachedPrice > 0 && now - cacheTimestamp < CACHE_DURATION) {
    return cachedPrice
  }

  // Fetch new price
  const price = await fetchBNBPriceWithFallbacks()

  // Update cache
  if (price > 0) {
    cachedPrice = price
    cacheTimestamp = now
  }

  return price
}
