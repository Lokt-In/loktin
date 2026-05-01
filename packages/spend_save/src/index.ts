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
    contractId: "CBM3XGPO7LDF56OL7EMRAFFLKLZWHFFZZEBAJGAGMD5KJYXQAALTBQPO",
  },
} as const;

export interface SpendSavePosition {
  created_date: u64;
  save_percentage: u32;
  saved_balance: i128;
  total_saved_lifetime: i128;
  total_spent_lifetime: i128;
  user: string;
}

export type DataKey =
  | { tag: "Admin"; values: void }
  | { tag: "UsdcToken"; values: void }
  | { tag: "Position"; values: readonly [string] };

export const Errors = {
  1: { message: "Unauthorized" },
  2: { message: "AdminNotSet" },
  10: { message: "NotEnrolled" },
  11: { message: "InvalidPercentage" },
  12: { message: "InvalidAmount" },
  13: { message: "NotWithdrawalDay" },
  14: { message: "InsufficientSavedBalance" },
};

export interface Client {
  /**
   * Construct and simulate a admin transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  admin: (
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<string>>>;

  /**
   * Construct and simulate a usdc_token transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  usdc_token: (
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<string>>;

  /**
   * Construct and simulate a enroll transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Enroll or update save percentage (basis points: 100=1%, 5000=50%).
   */
  enroll: (
    { user, save_percentage_bps }: { user: string; save_percentage_bps: u32 },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<void>>>;

  /**
   * Construct and simulate a spend transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Spend USDC through Loktin: routes (1-pct) to recipient, (pct) to vault.
   * Pulls `total_amount` from user's wallet. Returns (sent_to_recipient, saved).
   */
  spend: (
    {
      user,
      recipient,
      total_amount,
    }: { user: string; recipient: string; total_amount: i128 },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<readonly [i128, i128]>>>;

  /**
   * Construct and simulate a withdraw transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Withdraw from saved_balance. Reverts unless current UTC date is the 28th.
   */
  withdraw: (
    { user, amount }: { user: string; amount: i128 },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<void>>>;

  /**
   * Construct and simulate a get_position transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_position: (
    { user }: { user: string },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<SpendSavePosition>>>;

  /**
   * Construct and simulate a is_withdrawal_day_now transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Returns true iff current UTC date is the 28th.
   */
  is_withdrawal_day_now: (
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<boolean>>;

  /**
   * Construct and simulate a current_day_utc transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Returns the day of month (1-31) for current UTC time.
   */
  current_day_utc: (
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<u32>>;

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
        "AAAAAQAAAAAAAAAAAAAAEVNwZW5kU2F2ZVBvc2l0aW9uAAAAAAAABgAAAAAAAAAMY3JlYXRlZF9kYXRlAAAABgAAAAAAAAAPc2F2ZV9wZXJjZW50YWdlAAAAAAQAAAAAAAAADXNhdmVkX2JhbGFuY2UAAAAAAAALAAAAAAAAABR0b3RhbF9zYXZlZF9saWZldGltZQAAAAsAAAAAAAAAFHRvdGFsX3NwZW50X2xpZmV0aW1lAAAACwAAAAAAAAAEdXNlcgAAABM=",
        "AAAAAgAAAAAAAAAAAAAAB0RhdGFLZXkAAAAAAwAAAAAAAAAAAAAABUFkbWluAAAAAAAAAAAAAAAAAAAJVXNkY1Rva2VuAAAAAAAAAQAAAAAAAAAIUG9zaXRpb24AAAABAAAAEw==",
        "AAAABAAAAAAAAAAAAAAABUVycm9yAAAAAAAABwAAAAAAAAAMVW5hdXRob3JpemVkAAAAAQAAAAAAAAALQWRtaW5Ob3RTZXQAAAAAAgAAAAAAAAALTm90RW5yb2xsZWQAAAAACgAAAAAAAAARSW52YWxpZFBlcmNlbnRhZ2UAAAAAAAALAAAAAAAAAA1JbnZhbGlkQW1vdW50AAAAAAAADAAAAAAAAAAQTm90V2l0aGRyYXdhbERheQAAAA0AAAAAAAAAGEluc3VmZmljaWVudFNhdmVkQmFsYW5jZQAAAA4=",
        "AAAAAAAAAAAAAAANX19jb25zdHJ1Y3RvcgAAAAAAAAIAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAKdXNkY190b2tlbgAAAAAAEwAAAAA=",
        "AAAAAAAAAAAAAAAFYWRtaW4AAAAAAAAAAAAAAQAAA+kAAAATAAAAAw==",
        "AAAAAAAAAAAAAAAKdXNkY190b2tlbgAAAAAAAAAAAAEAAAAT",
        "AAAAAAAAAEJFbnJvbGwgb3IgdXBkYXRlIHNhdmUgcGVyY2VudGFnZSAoYmFzaXMgcG9pbnRzOiAxMDA9MSUsIDUwMDA9NTAlKS4AAAAAAAZlbnJvbGwAAAAAAAIAAAAAAAAABHVzZXIAAAATAAAAAAAAABNzYXZlX3BlcmNlbnRhZ2VfYnBzAAAAAAQAAAABAAAD6QAAA+0AAAAAAAAAAw==",
        "AAAAAAAAAJRTcGVuZCBVU0RDIHRocm91Z2ggTG9rdGluOiByb3V0ZXMgKDEtcGN0KSB0byByZWNpcGllbnQsIChwY3QpIHRvIHZhdWx0LgpQdWxscyBgdG90YWxfYW1vdW50YCBmcm9tIHVzZXIncyB3YWxsZXQuIFJldHVybnMgKHNlbnRfdG9fcmVjaXBpZW50LCBzYXZlZCkuAAAABXNwZW5kAAAAAAAAAwAAAAAAAAAEdXNlcgAAABMAAAAAAAAACXJlY2lwaWVudAAAAAAAABMAAAAAAAAADHRvdGFsX2Ftb3VudAAAAAsAAAABAAAD6QAAA+0AAAACAAAACwAAAAsAAAAD",
        "AAAAAAAAAElXaXRoZHJhdyBmcm9tIHNhdmVkX2JhbGFuY2UuIFJldmVydHMgdW5sZXNzIGN1cnJlbnQgVVRDIGRhdGUgaXMgdGhlIDI4dGguAAAAAAAACHdpdGhkcmF3AAAAAgAAAAAAAAAEdXNlcgAAABMAAAAAAAAABmFtb3VudAAAAAAACwAAAAEAAAPpAAAD7QAAAAAAAAAD",
        "AAAAAAAAAAAAAAAMZ2V0X3Bvc2l0aW9uAAAAAQAAAAAAAAAEdXNlcgAAABMAAAABAAAD6QAAB9AAAAARU3BlbmRTYXZlUG9zaXRpb24AAAAAAAAD",
        "AAAAAAAAAC5SZXR1cm5zIHRydWUgaWZmIGN1cnJlbnQgVVRDIGRhdGUgaXMgdGhlIDI4dGguAAAAAAAVaXNfd2l0aGRyYXdhbF9kYXlfbm93AAAAAAAAAAAAAAEAAAAB",
        "AAAAAAAAADVSZXR1cm5zIHRoZSBkYXkgb2YgbW9udGggKDEtMzEpIGZvciBjdXJyZW50IFVUQyB0aW1lLgAAAAAAAA9jdXJyZW50X2RheV91dGMAAAAAAAAAAAEAAAAE",
        "AAAAAAAAAAAAAAAQZGVwb3NpdF90b19ibGVuZAAAAAEAAAAAAAAABmFtb3VudAAAAAAACwAAAAEAAAPpAAAD7QAAAAAAAAAD",
        "AAAAAAAAAAAAAAATd2l0aGRyYXdfZnJvbV9ibGVuZAAAAAABAAAAAAAAAAZhbW91bnQAAAAAAAsAAAABAAAD6QAAA+0AAAAAAAAAAw==",
        "AAAAAAAAAAAAAAAOYmxlbmRfcG9zaXRpb24AAAAAAAAAAAABAAAACw==",
      ]),
      options,
    );
  }
  public readonly fromJSON = {
    admin: this.txFromJSON<Result<string>>,
    usdc_token: this.txFromJSON<string>,
    enroll: this.txFromJSON<Result<void>>,
    spend: this.txFromJSON<Result<readonly [i128, i128]>>,
    withdraw: this.txFromJSON<Result<void>>,
    get_position: this.txFromJSON<Result<SpendSavePosition>>,
    is_withdrawal_day_now: this.txFromJSON<boolean>,
    current_day_utc: this.txFromJSON<u32>,
    deposit_to_blend: this.txFromJSON<Result<void>>,
    withdraw_from_blend: this.txFromJSON<Result<void>>,
    blend_position: this.txFromJSON<i128>,
  };
}
