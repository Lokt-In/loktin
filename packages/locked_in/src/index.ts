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
  Duration,
} from "@stellar/stellar-sdk/contract";
type Timepoint = bigint;
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
    contractId: "CCXMCHYO2JGPHYSJQ7ZJWAXR2SZKM2RZECOCI7R234FYS3JCGHSD5WSR",
  },
} as const;

export interface Lock {
  amount: i128;
  apy_basis_points: u32;
  duration_seconds: u64;
  end_date: u64;
  id: u64;
  is_unlocked: boolean;
  projected_yield: i128;
  start_date: u64;
  user: string;
}

export type DataKey =
  | { tag: "Admin"; values: void }
  | { tag: "UsdcToken"; values: void }
  | { tag: "LockCounter"; values: void }
  | { tag: "Lock"; values: readonly [u64] }
  | { tag: "UserLocks"; values: readonly [string] }
  | { tag: "ApyTiers"; values: void };

export const Errors = {
  1: { message: "Unauthorized" },
  2: { message: "AdminNotSet" },
  10: { message: "LockNotFound" },
  11: { message: "LockAlreadyUnlocked" },
  12: { message: "LockNotMatured" },
  13: { message: "InvalidAmount" },
  14: { message: "InvalidDuration" },
  15: { message: "NotLockOwner" },
  16: { message: "DurationTierMissing" },
};

export interface Client {
  /**
   * Construct and simulate a admin transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  admin: (
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<string>>>;

  /**
   * Construct and simulate a set_apy_tier transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_apy_tier: (
    {
      duration_months,
      apy_basis_points,
    }: { duration_months: u32; apy_basis_points: u32 },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<void>>>;

  /**
   * Construct and simulate a get_apy_tiers transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_apy_tiers: (
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Map<u32, u32>>>;

  /**
   * Construct and simulate a get_apy_for_duration transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_apy_for_duration: (
    { duration_months }: { duration_months: u32 },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<u32>>>;

  /**
   * Construct and simulate a usdc_token transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  usdc_token: (
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<string>>;

  /**
   * Construct and simulate a lock transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Lock USDC for a fixed duration. Returns the lock id.
   * Computes and stores projected_yield (display only — paid via Blend later).
   */
  lock: (
    {
      user,
      amount,
      duration_months,
    }: { user: string; amount: i128; duration_months: u32 },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<u64>>>;

  /**
   * Construct and simulate a unlock transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Unlock and return principal. Reverts if before end_date.
   * (Yield from Blend is added when Blend integration is live.)
   */
  unlock: (
    { user, lock_id }: { user: string; lock_id: u64 },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<i128>>>;

  /**
   * Construct and simulate a get_lock transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_lock: (
    { lock_id }: { lock_id: u64 },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<Lock>>>;

  /**
   * Construct and simulate a get_user_locks transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_user_locks: (
    { user }: { user: string },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Array<u64>>>;

  /**
   * Construct and simulate a deposit_to_blend transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  deposit_to_blend: (
    { amount }: { amount: i128 },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<void>>>;

  /**
   * Construct and simulate a withdraw_from_blend transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  withdraw_from_blend: (
    { amount }: { amount: i128 },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<void>>>;

  /**
   * Construct and simulate a blend_position transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  blend_position: (
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<i128>>;
}
export class Client extends ContractClient {
  static async deploy<T = Client>(
    /** Constructor/Initialization Args for the contract's `__constructor` method */
    { admin, usdc_token }: { admin: string; usdc_token: string },
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions &
      Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
      },
  ): Promise<AssembledTransaction<T>> {
    return ContractClient.deploy({ admin, usdc_token }, options);
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([
        "AAAAAQAAAAAAAAAAAAAABExvY2sAAAAJAAAAAAAAAAZhbW91bnQAAAAAAAsAAAAAAAAAEGFweV9iYXNpc19wb2ludHMAAAAEAAAAAAAAABBkdXJhdGlvbl9zZWNvbmRzAAAABgAAAAAAAAAIZW5kX2RhdGUAAAAGAAAAAAAAAAJpZAAAAAAABgAAAAAAAAALaXNfdW5sb2NrZWQAAAAAAQAAAAAAAAAPcHJvamVjdGVkX3lpZWxkAAAAAAsAAAAAAAAACnN0YXJ0X2RhdGUAAAAAAAYAAAAAAAAABHVzZXIAAAAT",
        "AAAAAgAAAAAAAAAAAAAAB0RhdGFLZXkAAAAABgAAAAAAAAAAAAAABUFkbWluAAAAAAAAAAAAAAAAAAAJVXNkY1Rva2VuAAAAAAAAAAAAAAAAAAALTG9ja0NvdW50ZXIAAAAAAQAAAAAAAAAETG9jawAAAAEAAAAGAAAAAQAAAAAAAAAJVXNlckxvY2tzAAAAAAAAAQAAABMAAAAAAAAAAAAAAAhBcHlUaWVycw==",
        "AAAABAAAAAAAAAAAAAAABUVycm9yAAAAAAAACQAAAAAAAAAMVW5hdXRob3JpemVkAAAAAQAAAAAAAAALQWRtaW5Ob3RTZXQAAAAAAgAAAAAAAAAMTG9ja05vdEZvdW5kAAAACgAAAAAAAAATTG9ja0FscmVhZHlVbmxvY2tlZAAAAAALAAAAAAAAAA5Mb2NrTm90TWF0dXJlZAAAAAAADAAAAAAAAAANSW52YWxpZEFtb3VudAAAAAAAAA0AAAAAAAAAD0ludmFsaWREdXJhdGlvbgAAAAAOAAAAAAAAAAxOb3RMb2NrT3duZXIAAAAPAAAAAAAAABNEdXJhdGlvblRpZXJNaXNzaW5nAAAAABA=",
        "AAAAAAAAAAAAAAANX19jb25zdHJ1Y3RvcgAAAAAAAAIAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAKdXNkY190b2tlbgAAAAAAEwAAAAA=",
        "AAAAAAAAAAAAAAAFYWRtaW4AAAAAAAAAAAAAAQAAA+kAAAATAAAAAw==",
        "AAAAAAAAAAAAAAAMc2V0X2FweV90aWVyAAAAAgAAAAAAAAAPZHVyYXRpb25fbW9udGhzAAAAAAQAAAAAAAAAEGFweV9iYXNpc19wb2ludHMAAAAEAAAAAQAAA+kAAAPtAAAAAAAAAAM=",
        "AAAAAAAAAAAAAAANZ2V0X2FweV90aWVycwAAAAAAAAAAAAABAAAD7AAAAAQAAAAE",
        "AAAAAAAAAAAAAAAUZ2V0X2FweV9mb3JfZHVyYXRpb24AAAABAAAAAAAAAA9kdXJhdGlvbl9tb250aHMAAAAABAAAAAEAAAPpAAAABAAAAAM=",
        "AAAAAAAAAAAAAAAKdXNkY190b2tlbgAAAAAAAAAAAAEAAAAT",
        "AAAAAAAAAIFMb2NrIFVTREMgZm9yIGEgZml4ZWQgZHVyYXRpb24uIFJldHVybnMgdGhlIGxvY2sgaWQuCkNvbXB1dGVzIGFuZCBzdG9yZXMgcHJvamVjdGVkX3lpZWxkIChkaXNwbGF5IG9ubHkg4oCUIHBhaWQgdmlhIEJsZW5kIGxhdGVyKS4AAAAAAAAEbG9jawAAAAMAAAAAAAAABHVzZXIAAAATAAAAAAAAAAZhbW91bnQAAAAAAAsAAAAAAAAAD2R1cmF0aW9uX21vbnRocwAAAAAEAAAAAQAAA+kAAAAGAAAAAw==",
        "AAAAAAAAAHRVbmxvY2sgYW5kIHJldHVybiBwcmluY2lwYWwuIFJldmVydHMgaWYgYmVmb3JlIGVuZF9kYXRlLgooWWllbGQgZnJvbSBCbGVuZCBpcyBhZGRlZCB3aGVuIEJsZW5kIGludGVncmF0aW9uIGlzIGxpdmUuKQAAAAZ1bmxvY2sAAAAAAAIAAAAAAAAABHVzZXIAAAATAAAAAAAAAAdsb2NrX2lkAAAAAAYAAAABAAAD6QAAAAsAAAAD",
        "AAAAAAAAAAAAAAAIZ2V0X2xvY2sAAAABAAAAAAAAAAdsb2NrX2lkAAAAAAYAAAABAAAD6QAAB9AAAAAETG9jawAAAAM=",
        "AAAAAAAAAAAAAAAOZ2V0X3VzZXJfbG9ja3MAAAAAAAEAAAAAAAAABHVzZXIAAAATAAAAAQAAA+oAAAAG",
        "AAAAAAAAAAAAAAAQZGVwb3NpdF90b19ibGVuZAAAAAEAAAAAAAAABmFtb3VudAAAAAAACwAAAAEAAAPpAAAD7QAAAAAAAAAD",
        "AAAAAAAAAAAAAAATd2l0aGRyYXdfZnJvbV9ibGVuZAAAAAABAAAAAAAAAAZhbW91bnQAAAAAAAsAAAABAAAD6QAAA+0AAAAAAAAAAw==",
        "AAAAAAAAAAAAAAAOYmxlbmRfcG9zaXRpb24AAAAAAAAAAAABAAAACw==",
      ]),
      options,
    );
  }
  public readonly fromJSON = {
    admin: this.txFromJSON<Result<string>>,
    set_apy_tier: this.txFromJSON<Result<void>>,
    get_apy_tiers: this.txFromJSON<Map<u32, u32>>,
    get_apy_for_duration: this.txFromJSON<Result<u32>>,
    usdc_token: this.txFromJSON<string>,
    lock: this.txFromJSON<Result<u64>>,
    unlock: this.txFromJSON<Result<i128>>,
    get_lock: this.txFromJSON<Result<Lock>>,
    get_user_locks: this.txFromJSON<Array<u64>>,
    deposit_to_blend: this.txFromJSON<Result<void>>,
    withdraw_from_blend: this.txFromJSON<Result<void>>,
    blend_position: this.txFromJSON<i128>,
  };
}
