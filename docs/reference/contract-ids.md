# Contract IDs

All Loktin contracts on **Stellar testnet** as of the current deploy.

| Contract            | ID                                                         | Explorer                                                                                                                    |
| ------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Plans (plans)**   | `CBCKKGNNNFSMTE2IPVGA5YUHSTIN4XX5MQ7LZN4MCPHAKATHWZODGXJN` | [stellar.expert](https://stellar.expert/explorer/testnet/contract/CBCKKGNNNFSMTE2IPVGA5YUHSTIN4XX5MQ7LZN4MCPHAKATHWZODGXJN) |
| **Target Savings**  | `CAF4L2VNNCUMBGBSHXLHGKLPPKBSF65GGXDQQIBDF4IGJWXPPBOEDBAF` | [stellar.expert](https://stellar.expert/explorer/testnet/contract/CAF4L2VNNCUMBGBSHXLHGKLPPKBSF65GGXDQQIBDF4IGJWXPPBOEDBAF) |
| **Locked Vault**    | `CCXMCHYO2JGPHYSJQ7ZJWAXR2SZKM2RZECOCI7R234FYS3JCGHSD5WSR` | [stellar.expert](https://stellar.expert/explorer/testnet/contract/CCXMCHYO2JGPHYSJQ7ZJWAXR2SZKM2RZECOCI7R234FYS3JCGHSD5WSR) |
| **Spend & Save**    | `CBM3XGPO7LDF56OL7EMRAFFLKLZWHFFZZEBAJGAGMD5KJYXQAALTBQPO` | [stellar.expert](https://stellar.expert/explorer/testnet/contract/CBM3XGPO7LDF56OL7EMRAFFLKLZWHFFZZEBAJGAGMD5KJYXQAALTBQPO) |
| **USDC test token** | `CCD6TIYLX2PJPFWW2RBNZHAUJPMJVECIPVCILF2NYZWR5GYYDXRM4WHM` | [stellar.expert](https://stellar.expert/explorer/testnet/contract/CCD6TIYLX2PJPFWW2RBNZHAUJPMJVECIPVCILF2NYZWR5GYYDXRM4WHM) |

**Network:** `Test SDF Network ; September 2015`
**RPC:** `https://soroban-testnet.stellar.org`
**Horizon:** `https://horizon-testnet.stellar.org`

<!-- ## USDC token details

- **Decimals:** 7 (matching canonical Stellar USDC convention)
- **Symbol:** `USDC`
- **Owner:** Loktin admin (mintable)

To request test USDC, reach out to the team we'll mint to your wallet. -->

## Calling contracts directly

You can interact with any of these contracts without the Loktin frontend.

### Via stellar CLI

```bash
# Read-only: get your goal
stellar contract invoke \
  --id CAF4L2VNNCUMBGBSHXLHGKLPPKBSF65GGXDQQIBDF4IGJWXPPBOEDBAF \
  --network testnet \
  --source-account YOUR_ACCOUNT \
  -- get_user_goals --user YOUR_ADDRESS

# State-changing: lock 100 USDC for 6 months
stellar contract invoke \
  --id CCXMCHYO2JGPHYSJQ7ZJWAXR2SZKM2RZECOCI7R234FYS3JCGHSD5WSR \
  --network testnet \
  --source-account YOUR_ACCOUNT \
  --send=yes \
  -- lock --user YOUR_ADDRESS --amount 1000000000 --duration_months 6
```

### Via TypeScript bindings

The repo's `packages/` folder has auto-generated TypeScript bindings for each contract:

- `packages/plans`
- `packages/target_savings`
- `packages/locked_in`
- `packages/spend_save`

```typescript
import * as Plans from "plans";

const client = new Plans.Client({
  ...Plans.networks.testnet,
  rpcUrl: "https://soroban-testnet.stellar.org",
  publicKey: address,
  signTransaction, // from your wallet
  signAuthEntry, // from your wallet
});

const tx = await client.create_cycle({
  user: address,
  duration_months: 3,
  amount: BigInt(500 * 10_000_000),
});
const result = await tx.signAndSend();
```
