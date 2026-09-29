use soroban_sdk::{contractclient, Address, Env};

/// Minimal interface for the liquidity pool that backs Loktin savings contracts.
///
/// This trait's surface mirrors `mock_pool`'s `supply` / `withdraw` /
/// `get_position` functions exactly. Swapping in real Blend later means
/// changing the **deployed pool address**, not this interface or any contract
/// that depends on it.
///
/// ## Usage
///
/// Each savings contract declares its own `#[contractclient]` binding by
/// referencing this trait (or by copy-pasting these three signatures — they
/// must match). The shared declaration here is the single source of truth for
/// what the pool surface looks like.
///
/// ```rust,ignore
/// use loktin_yield::Pool;
///
/// // In your contract:
/// let client = PoolClient::new(&env, &pool_address);
/// client.supply(&self_addr, &amount);
/// let position = client.get_position(&self_addr);
/// let withdrawn = client.withdraw(&self_addr, &amount);
/// ```
#[contractclient(name = "PoolClient")]
pub trait Pool {
    /// Deposit `amount` of USDC from `from` into the pool.
    ///
    /// Pulls funds via `token.transfer(from → pool)`. The caller must ensure
    /// `from` has both the balance and the allowance, or pre-authorize the
    /// sub-invocation via `env.authorize_as_current_contract`.
    fn supply(env: Env, from: Address, amount: i128);

    /// Withdraw `amount` of USDC from the pool to `from`.
    ///
    /// Returns the amount actually transferred (≤ `amount`). The pool debits
    /// the caller's position; if `amount` exceeds the position the call reverts.
    fn withdraw(env: Env, from: Address, amount: i128) -> i128;

    /// Current position value for `supplier` = principal + yield accrued to now.
    ///
    /// This is the figure to use as `total_assets` before minting new shares,
    /// and as the redemption basis when burning shares. Querying it just before
    /// a deposit ensures newly accrued yield is included in the share price.
    fn get_position(env: Env, supplier: Address) -> i128;
}
