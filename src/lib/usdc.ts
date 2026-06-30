/**
 * Circle-issued test USDC on Stellar testnet.
 *
 * Classic balances and trustlines reference the asset by **code + issuer**.
 * The Soroban token (SAC) that wraps the same asset is `USDC_CONTRACT_ID`
 * in `src/hooks/useUsdcBalance.ts` — that's what the savings contracts call.
 */
export const USDC_ASSET_CODE = "USDC";
export const USDC_ISSUER =
  "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

/** Circle's testnet faucet — select Stellar + paste the wallet address. */
export const USDC_FAUCET_URL = "https://faucet.circle.com/";
