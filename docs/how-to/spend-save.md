# Enroll in Spend & Save

A walkthrough for setting up auto-savings on every USDC spend.

## 1. Open Spend & Save

Dashboard → sidebar → **Spend & Save**.

## 2. Pick your save percentage

Drag the slider between 1% and 50%. Default suggestion: **10%**.

Click **Enroll at N% →** and sign in Freighter. The contract creates your `SpendSavePosition` with the chosen rate.

## 3. Spend through Loktin

Once enrolled, you'll see a **Spend with auto-save** card.

Click it, then enter:

- Recipient Stellar Address
- Total Amount (USDC)

A breakdown appears:

- Sent to recipient: `total × (1 - save_rate)`
- Saved to vault: `total × save_rate`
- Total debited: `total`

Click "Continue →". You'll be prompted to approve the Spend & Save contract for the total amount (one-time per spend, since allowance gets consumed). Sign approve, then sign the spend.

The contract atomically:

1. Pulls `total` from your wallet
2. Forwards `(1 - rate) × total` to the recipient
3. Keeps `rate × total` in your vault

If any step fails, the whole thing reverts.

## 4. Watch your vault grow

The dashboard shows:

- **Saved Balance**: current vault amount
- **Save Rate**: your active percentage
- **Lifetime Saved**: total ever saved
- **Lifetime Spent**: total amount routed through Loktin

## 5. Withdraw on the 28th

The contract restricts withdrawals to **the 28th of each month (UTC)**. The dashboard shows:

- A countdown to the next 28th, OR
- "Open today ✓" when it's the 28th

When the day is open:

1. Click **Withdraw**
2. Enter an amount (≤ saved balance)
3. Sign — funds return to your wallet

On any other day, the **Withdraw** button is disabled. The contract will revert any withdrawal attempt off-day with `NotWithdrawalDay`.

## Adjusting your save rate

Click the "Save rate: N%" card on the dashboard to re-enroll at a different percentage. Existing saved balance is unaffected. The new rate only applies to future spends.
