import { stellarNetwork } from "../contracts/util";

// Utility to get the correct Friendbot URL based on environment
export function getFriendbotUrl(address: string) {
  switch (stellarNetwork) {
    case "LOCAL":
      // Use proxy in development for local
      return `/friendbot?addr=${address}`;
    case "FUTURENET":
      return `https://friendbot-futurenet.stellar.org/?addr=${address}`;
    case "TESTNET":
      return `https://friendbot.stellar.org/?addr=${address}`;
    default:
      throw new Error(
        `Unknown or unsupported PUBLIC_STELLAR_NETWORK for friendbot: ${stellarNetwork}`,
      );
  }
}

/**
 * Request test XLM for `address` from the network's friendbot faucet, funding
 * (and creating) the account so it can pay transaction fees. Resolves on
 * success or if the account is already funded; throws on real failures.
 */
export async function requestFriendbotFunds(address: string): Promise<void> {
  const res = await fetch(getFriendbotUrl(address));
  if (res.ok) return;
  const body = await res.text().catch(() => "");
  // Friendbot returns 400 when the account already exists / is already funded.
  if (res.status === 400 && /already|op_already_exists/i.test(body)) return;
  throw new Error(
    `Friendbot funding failed (${res.status}). ${body.slice(0, 160)}`.trim(),
  );
}
