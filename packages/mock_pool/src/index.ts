import { Buffer } from "buffer";
import { Address } from "@stellar/stellar-sdk";
import {
  AssembledTransaction,
  Client as ContractClient,
  ClientOptions as ContractClientOptions,
  MethodOptions,
  Result,
  Spec as ContractSpec,
} from "@stellar/stellar-sdk/contract";
import type {
  u32,
  i32,
  u64,
  i64,
  u128,
  i128,
  u256,
  i256,
  Option,
  Timepoint,
  Duration,
} from "@stellar/stellar-sdk/contract";
export * from "@stellar/stellar-sdk";
export * as contract from "@stellar/stellar-sdk/contract";
export * as rpc from "@stellar/stellar-sdk/rpc";

if (typeof window !== "undefined") {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}


export const networks = {
  testnet: {
    networkPassphrase: "Test SDF Network ; September 2015",
    contractId: "CBYJA4C3T64FICRPDL2UBXWGJDAIAZVO27NN3K5RRTQCK3ASAPME4ZYG",
  }
} as const

export const Errors = {
  1: {message:"AdminNotSet"},
  2: {message:"InvalidAmount"},
  3: {message:"InsufficientPosition"}
}

export type DataKey = {tag: "Admin", values: void} | {tag: "UsdcToken", values: void} | {tag: "ApyBps", values: void} | {tag: "Position", values: readonly [string]};


/**
 * A supplier's position in the pool. `accrued` is the yield settled up to
 * `last_update`; live reads roll it forward from `last_update` to now.
 */
export interface Position {
  accrued: i128;
  last_update: u64;
  principal: i128;
}





export interface Client {
  /**
   * Construct and simulate a admin transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  admin: (options?: MethodOptions) => Promise<AssembledTransaction<Result<string>>>

  /**
   * Construct and simulate a supply transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Supply USDC into the pool. Pulls `amount` from `from`.
   * `from` is whoever supplies — a user, or (later) a Loktin savings contract.
   */
  supply: ({from, amount}: {from: string, amount: i128}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a apy_bps transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  apy_bps: (options?: MethodOptions) => Promise<AssembledTransaction<u32>>

  /**
   * Construct and simulate a set_apy transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_apy: ({apy_bps}: {apy_bps: u32}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a withdraw transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Withdraw `amount` (drawn from accrued yield first, then principal) to `from`.
   */
  withdraw: ({from, amount}: {from: string, amount: i128}, options?: MethodOptions) => Promise<AssembledTransaction<Result<i128>>>

  /**
   * Construct and simulate a usdc_token transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  usdc_token: (options?: MethodOptions) => Promise<AssembledTransaction<string>>

  /**
   * Construct and simulate a fund_reserve transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Admin tops up the pool's USDC so it can pay accrued yield on withdrawal.
   */
  fund_reserve: ({amount}: {amount: i128}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a get_position transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Current position value = principal + yield accrued up to *now*.
   * This is what a savings contract surfaces as `blend_position()`.
   */
  get_position: ({supplier}: {supplier: string}, options?: MethodOptions) => Promise<AssembledTransaction<i128>>

  /**
   * Construct and simulate a get_principal transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Principal only (excludes accrued yield).
   */
  get_principal: ({supplier}: {supplier: string}, options?: MethodOptions) => Promise<AssembledTransaction<i128>>

  /**
   * Construct and simulate a reserve_balance transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Total USDC the pool currently holds (supplied principal + yield reserve).
   */
  reserve_balance: (options?: MethodOptions) => Promise<AssembledTransaction<i128>>

}
export class Client extends ContractClient {
  static async deploy<T = Client>(
        /** Constructor/Initialization Args for the contract's `__constructor` method */
        {admin, usdc_token, apy_bps}: {admin: string, usdc_token: string, apy_bps: u32},
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions &
      Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
      }
  ): Promise<AssembledTransaction<T>> {
    return ContractClient.deploy({admin, usdc_token, apy_bps}, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAAAAAAAAAAAAAFYWRtaW4AAAAAAAAAAAAAAQAAA+kAAAATAAAAAw==",
        "AAAAAAAAAINTdXBwbHkgVVNEQyBpbnRvIHRoZSBwb29sLiBQdWxscyBgYW1vdW50YCBmcm9tIGBmcm9tYC4KYGZyb21gIGlzIHdob2V2ZXIgc3VwcGxpZXMg4oCUIGEgdXNlciwgb3IgKGxhdGVyKSBhIExva3RpbiBzYXZpbmdzIGNvbnRyYWN0LgAAAAAGc3VwcGx5AAAAAAACAAAAAAAAAARmcm9tAAAAEwAAAAAAAAAGYW1vdW50AAAAAAALAAAAAQAAA+kAAAPtAAAAAAAAAAM=",
        "AAAAAAAAAAAAAAAHYXB5X2JwcwAAAAAAAAAAAQAAAAQ=",
        "AAAAAAAAAAAAAAAHc2V0X2FweQAAAAABAAAAAAAAAAdhcHlfYnBzAAAAAAQAAAABAAAD6QAAA+0AAAAAAAAAAw==",
        "AAAAAAAAAE1XaXRoZHJhdyBgYW1vdW50YCAoZHJhd24gZnJvbSBhY2NydWVkIHlpZWxkIGZpcnN0LCB0aGVuIHByaW5jaXBhbCkgdG8gYGZyb21gLgAAAAAAAAh3aXRoZHJhdwAAAAIAAAAAAAAABGZyb20AAAATAAAAAAAAAAZhbW91bnQAAAAAAAsAAAABAAAD6QAAAAsAAAAD",
        "AAAAAAAAAAAAAAAKdXNkY190b2tlbgAAAAAAAAAAAAEAAAAT",
        "AAAAAAAAAEhBZG1pbiB0b3BzIHVwIHRoZSBwb29sJ3MgVVNEQyBzbyBpdCBjYW4gcGF5IGFjY3J1ZWQgeWllbGQgb24gd2l0aGRyYXdhbC4AAAAMZnVuZF9yZXNlcnZlAAAAAQAAAAAAAAAGYW1vdW50AAAAAAALAAAAAQAAA+kAAAPtAAAAAAAAAAM=",
        "AAAAAAAAAH9DdXJyZW50IHBvc2l0aW9uIHZhbHVlID0gcHJpbmNpcGFsICsgeWllbGQgYWNjcnVlZCB1cCB0byAqbm93Ki4KVGhpcyBpcyB3aGF0IGEgc2F2aW5ncyBjb250cmFjdCBzdXJmYWNlcyBhcyBgYmxlbmRfcG9zaXRpb24oKWAuAAAAAAxnZXRfcG9zaXRpb24AAAABAAAAAAAAAAhzdXBwbGllcgAAABMAAAABAAAACw==",
        "AAAAAAAAAAAAAAANX19jb25zdHJ1Y3RvcgAAAAAAAAMAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAKdXNkY190b2tlbgAAAAAAEwAAAAAAAAAHYXB5X2JwcwAAAAAEAAAAAA==",
        "AAAAAAAAAChQcmluY2lwYWwgb25seSAoZXhjbHVkZXMgYWNjcnVlZCB5aWVsZCkuAAAADWdldF9wcmluY2lwYWwAAAAAAAABAAAAAAAAAAhzdXBwbGllcgAAABMAAAABAAAACw==",
        "AAAAAAAAAElUb3RhbCBVU0RDIHRoZSBwb29sIGN1cnJlbnRseSBob2xkcyAoc3VwcGxpZWQgcHJpbmNpcGFsICsgeWllbGQgcmVzZXJ2ZSkuAAAAAAAAD3Jlc2VydmVfYmFsYW5jZQAAAAAAAAAAAQAAAAs=",
        "AAAABAAAAAAAAAAAAAAABUVycm9yAAAAAAAAAwAAAAAAAAALQWRtaW5Ob3RTZXQAAAAAAQAAAAAAAAANSW52YWxpZEFtb3VudAAAAAAAAAIAAAAAAAAAFEluc3VmZmljaWVudFBvc2l0aW9uAAAAAw==",
        "AAAAAgAAAAAAAAAAAAAAB0RhdGFLZXkAAAAABAAAAAAAAAAAAAAABUFkbWluAAAAAAAAAAAAAAAAAAAJVXNkY1Rva2VuAAAAAAAAAAAAAAAAAAAGQXB5QnBzAAAAAAABAAAAAAAAAAhQb3NpdGlvbgAAAAEAAAAT",
        "AAAAAQAAAIxBIHN1cHBsaWVyJ3MgcG9zaXRpb24gaW4gdGhlIHBvb2wuIGBhY2NydWVkYCBpcyB0aGUgeWllbGQgc2V0dGxlZCB1cCB0bwpgbGFzdF91cGRhdGVgOyBsaXZlIHJlYWRzIHJvbGwgaXQgZm9yd2FyZCBmcm9tIGBsYXN0X3VwZGF0ZWAgdG8gbm93LgAAAAAAAAAIUG9zaXRpb24AAAADAAAAAAAAAAdhY2NydWVkAAAAAAsAAAAAAAAAC2xhc3RfdXBkYXRlAAAAAAYAAAAAAAAACXByaW5jaXBhbAAAAAAAAAs=",
        "AAAABQAAAAAAAAAAAAAABkFweVNldAAAAAAAAQAAAAdhcHlfc2V0AAAAAAEAAAAAAAAAB2FweV9icHMAAAAABAAAAAAAAAAC",
        "AAAABQAAAAAAAAAAAAAACFN1cHBsaWVkAAAAAQAAAAhzdXBwbGllZAAAAAIAAAAAAAAACHN1cHBsaWVyAAAAEwAAAAAAAAAAAAAABmFtb3VudAAAAAAACwAAAAAAAAAC",
        "AAAABQAAAAAAAAAAAAAACVdpdGhkcmF3bgAAAAAAAAEAAAAJd2l0aGRyYXduAAAAAAAAAgAAAAAAAAAIc3VwcGxpZXIAAAATAAAAAAAAAAAAAAAGYW1vdW50AAAAAAALAAAAAAAAAAI=",
        "AAAABQAAAAAAAAAAAAAADVJlc2VydmVGdW5kZWQAAAAAAAABAAAADnJlc2VydmVfZnVuZGVkAAAAAAABAAAAAAAAAAZhbW91bnQAAAAAAAsAAAAAAAAAAg==" ]),
      options
    )
  }
  public readonly fromJSON = {
    admin: this.txFromJSON<Result<string>>,
        supply: this.txFromJSON<Result<void>>,
        apy_bps: this.txFromJSON<u32>,
        set_apy: this.txFromJSON<Result<void>>,
        withdraw: this.txFromJSON<Result<i128>>,
        usdc_token: this.txFromJSON<string>,
        fund_reserve: this.txFromJSON<Result<void>>,
        get_position: this.txFromJSON<i128>,
        get_principal: this.txFromJSON<i128>,
        reserve_balance: this.txFromJSON<i128>
  }
}