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
    contractId: "CAF4L2VNNCUMBGBSHXLHGKLPPKBSF65GGXDQQIBDF4IGJWXPPBOEDBAF",
  },
} as const;

export interface TargetGoal {
  deposited: i128;
  end_date: u64;
  id: u64;
  is_complete: boolean;
  last_deposit_date: u64;
  missed_periods: u32;
  name: string;
  period_amount: i128;
  period_seconds: u64;
  start_date: u64;
  target_amount: i128;
  user: string;
}

export type DataKey =
  | { tag: "Admin"; values: void }
  | { tag: "Keeper"; values: void }
  | { tag: "UsdcToken"; values: void }
  | { tag: "FeeRecipient"; values: void }
  | { tag: "GoalCounter"; values: void }
  | { tag: "Goal"; values: readonly [u64] }
  | { tag: "UserGoals"; values: readonly [string] };

export const Errors = {
  1: { message: "Unauthorized" },
  2: { message: "AdminNotSet" },
  10: { message: "GoalNotFound" },
  11: { message: "GoalAlreadyComplete" },
  12: { message: "InvalidAmount" },
  13: { message: "InvalidDuration" },
  14: { message: "InvalidPeriod" },
  15: { message: "PeriodNotDue" },
  16: { message: "InsufficientUserBalance" },
  17: { message: "InsufficientUserAllowance" },
  18: { message: "NotGoalOwner" },
};

export interface Client {
  /**
   * Construct and simulate a admin transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  admin: (
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<string>>>;

  /**
   * Construct and simulate a set_keeper transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_keeper: (
    { keeper }: { keeper: string },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<void>>>;

  /**
   * Construct and simulate a keeper transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  keeper: (options?: MethodOptions) => Promise<AssembledTransaction<string>>;

  /**
   * Construct and simulate a set_fee_recipient transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_fee_recipient: (
    { recipient }: { recipient: string },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<void>>>;

  /**
   * Construct and simulate a fee_recipient transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  fee_recipient: (
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<string>>;

  /**
   * Construct and simulate a usdc_token transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  usdc_token: (
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<string>>;

  /**
   * Construct and simulate a create_target transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Create a new target savings goal. The user must have approved the contract
   * to spend USDC up to `target_amount` on the USDC token contract.
   */
  create_target: (
    {
      user,
      name,
      target_amount,
      period_seconds,
      period_amount,
      end_date,
    }: {
      user: string;
      name: string;
      target_amount: i128;
      period_seconds: u64;
      period_amount: i128;
      end_date: u64;
    },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<u64>>>;

  /**
   * Construct and simulate a manual_deposit transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Manually deposit additional funds into a goal (top-up).
   */
  manual_deposit: (
    { user, target_id, amount }: { user: string; target_id: u64; amount: i128 },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<void>>>;

  /**
   * Construct and simulate a withdraw transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Withdraw entire goal balance. Charges 1% forfeit if before `end_date`.
   */
  withdraw: (
    { user, target_id }: { user: string; target_id: u64 },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<i128>>>;

  /**
   * Construct and simulate a process_period transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Process a single period for a goal: pulls `period_amount` from the user's wallet
   * via `transfer_from`. If the user lacks balance/allowance, logs a missed period.
   * Callable only by the keeper (admin can be set as keeper).
   */
  process_period: (
    { target_id }: { target_id: u64 },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<void>>>;

  /**
   * Construct and simulate a get_target transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_target: (
    { target_id }: { target_id: u64 },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<TargetGoal>>>;

  /**
   * Construct and simulate a get_user_goals transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_user_goals: (
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
        "AAAAAQAAAAAAAAAAAAAAClRhcmdldEdvYWwAAAAAAAwAAAAAAAAACWRlcG9zaXRlZAAAAAAAAAsAAAAAAAAACGVuZF9kYXRlAAAABgAAAAAAAAACaWQAAAAAAAYAAAAAAAAAC2lzX2NvbXBsZXRlAAAAAAEAAAAAAAAAEWxhc3RfZGVwb3NpdF9kYXRlAAAAAAAABgAAAAAAAAAObWlzc2VkX3BlcmlvZHMAAAAAAAQAAAAAAAAABG5hbWUAAAAQAAAAAAAAAA1wZXJpb2RfYW1vdW50AAAAAAAACwAAAAAAAAAOcGVyaW9kX3NlY29uZHMAAAAAAAYAAAAAAAAACnN0YXJ0X2RhdGUAAAAAAAYAAAAAAAAADXRhcmdldF9hbW91bnQAAAAAAAALAAAAAAAAAAR1c2VyAAAAEw==",
        "AAAAAgAAAAAAAAAAAAAAB0RhdGFLZXkAAAAABwAAAAAAAAAAAAAABUFkbWluAAAAAAAAAAAAAAAAAAAGS2VlcGVyAAAAAAAAAAAAAAAAAAlVc2RjVG9rZW4AAAAAAAAAAAAAAAAAAAxGZWVSZWNpcGllbnQAAAAAAAAAAAAAAAtHb2FsQ291bnRlcgAAAAABAAAAAAAAAARHb2FsAAAAAQAAAAYAAAABAAAAAAAAAAlVc2VyR29hbHMAAAAAAAABAAAAEw==",
        "AAAABAAAAAAAAAAAAAAABUVycm9yAAAAAAAACwAAAAAAAAAMVW5hdXRob3JpemVkAAAAAQAAAAAAAAALQWRtaW5Ob3RTZXQAAAAAAgAAAAAAAAAMR29hbE5vdEZvdW5kAAAACgAAAAAAAAATR29hbEFscmVhZHlDb21wbGV0ZQAAAAALAAAAAAAAAA1JbnZhbGlkQW1vdW50AAAAAAAADAAAAAAAAAAPSW52YWxpZER1cmF0aW9uAAAAAA0AAAAAAAAADUludmFsaWRQZXJpb2QAAAAAAAAOAAAAAAAAAAxQZXJpb2ROb3REdWUAAAAPAAAAAAAAABdJbnN1ZmZpY2llbnRVc2VyQmFsYW5jZQAAAAAQAAAAAAAAABlJbnN1ZmZpY2llbnRVc2VyQWxsb3dhbmNlAAAAAAAAEQAAAAAAAAAMTm90R29hbE93bmVyAAAAEg==",
        "AAAAAAAAAAAAAAANX19jb25zdHJ1Y3RvcgAAAAAAAAIAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAKdXNkY190b2tlbgAAAAAAEwAAAAA=",
        "AAAAAAAAAAAAAAAFYWRtaW4AAAAAAAAAAAAAAQAAA+kAAAATAAAAAw==",
        "AAAAAAAAAAAAAAAKc2V0X2tlZXBlcgAAAAAAAQAAAAAAAAAGa2VlcGVyAAAAAAATAAAAAQAAA+kAAAPtAAAAAAAAAAM=",
        "AAAAAAAAAAAAAAAGa2VlcGVyAAAAAAAAAAAAAQAAABM=",
        "AAAAAAAAAAAAAAARc2V0X2ZlZV9yZWNpcGllbnQAAAAAAAABAAAAAAAAAAlyZWNpcGllbnQAAAAAAAATAAAAAQAAA+kAAAPtAAAAAAAAAAM=",
        "AAAAAAAAAAAAAAANZmVlX3JlY2lwaWVudAAAAAAAAAAAAAABAAAAEw==",
        "AAAAAAAAAAAAAAAKdXNkY190b2tlbgAAAAAAAAAAAAEAAAAT",
        "AAAAAAAAAIpDcmVhdGUgYSBuZXcgdGFyZ2V0IHNhdmluZ3MgZ29hbC4gVGhlIHVzZXIgbXVzdCBoYXZlIGFwcHJvdmVkIHRoZSBjb250cmFjdAp0byBzcGVuZCBVU0RDIHVwIHRvIGB0YXJnZXRfYW1vdW50YCBvbiB0aGUgVVNEQyB0b2tlbiBjb250cmFjdC4AAAAAAA1jcmVhdGVfdGFyZ2V0AAAAAAAABgAAAAAAAAAEdXNlcgAAABMAAAAAAAAABG5hbWUAAAAQAAAAAAAAAA10YXJnZXRfYW1vdW50AAAAAAAACwAAAAAAAAAOcGVyaW9kX3NlY29uZHMAAAAAAAYAAAAAAAAADXBlcmlvZF9hbW91bnQAAAAAAAALAAAAAAAAAAhlbmRfZGF0ZQAAAAYAAAABAAAD6QAAAAYAAAAD",
        "AAAAAAAAADdNYW51YWxseSBkZXBvc2l0IGFkZGl0aW9uYWwgZnVuZHMgaW50byBhIGdvYWwgKHRvcC11cCkuAAAAAA5tYW51YWxfZGVwb3NpdAAAAAAAAwAAAAAAAAAEdXNlcgAAABMAAAAAAAAACXRhcmdldF9pZAAAAAAAAAYAAAAAAAAABmFtb3VudAAAAAAACwAAAAEAAAPpAAAD7QAAAAAAAAAD",
        "AAAAAAAAAEZXaXRoZHJhdyBlbnRpcmUgZ29hbCBiYWxhbmNlLiBDaGFyZ2VzIDElIGZvcmZlaXQgaWYgYmVmb3JlIGBlbmRfZGF0ZWAuAAAAAAAId2l0aGRyYXcAAAACAAAAAAAAAAR1c2VyAAAAEwAAAAAAAAAJdGFyZ2V0X2lkAAAAAAAABgAAAAEAAAPpAAAACwAAAAM=",
        "AAAAAAAAANpQcm9jZXNzIGEgc2luZ2xlIHBlcmlvZCBmb3IgYSBnb2FsOiBwdWxscyBgcGVyaW9kX2Ftb3VudGAgZnJvbSB0aGUgdXNlcidzIHdhbGxldAp2aWEgYHRyYW5zZmVyX2Zyb21gLiBJZiB0aGUgdXNlciBsYWNrcyBiYWxhbmNlL2FsbG93YW5jZSwgbG9ncyBhIG1pc3NlZCBwZXJpb2QuCkNhbGxhYmxlIG9ubHkgYnkgdGhlIGtlZXBlciAoYWRtaW4gY2FuIGJlIHNldCBhcyBrZWVwZXIpLgAAAAAADnByb2Nlc3NfcGVyaW9kAAAAAAABAAAAAAAAAAl0YXJnZXRfaWQAAAAAAAAGAAAAAQAAA+kAAAPtAAAAAAAAAAM=",
        "AAAAAAAAAAAAAAAKZ2V0X3RhcmdldAAAAAAAAQAAAAAAAAAJdGFyZ2V0X2lkAAAAAAAABgAAAAEAAAPpAAAH0AAAAApUYXJnZXRHb2FsAAAAAAAD",
        "AAAAAAAAAAAAAAAOZ2V0X3VzZXJfZ29hbHMAAAAAAAEAAAAAAAAABHVzZXIAAAATAAAAAQAAA+oAAAAG",
        "AAAAAAAAAAAAAAAQZGVwb3NpdF90b19ibGVuZAAAAAEAAAAAAAAABmFtb3VudAAAAAAACwAAAAEAAAPpAAAD7QAAAAAAAAAD",
        "AAAAAAAAAAAAAAATd2l0aGRyYXdfZnJvbV9ibGVuZAAAAAABAAAAAAAAAAZhbW91bnQAAAAAAAsAAAABAAAD6QAAA+0AAAAAAAAAAw==",
        "AAAAAAAAAAAAAAAOYmxlbmRfcG9zaXRpb24AAAAAAAAAAAABAAAACw==",
      ]),
      options,
    );
  }
  public readonly fromJSON = {
    admin: this.txFromJSON<Result<string>>,
    set_keeper: this.txFromJSON<Result<void>>,
    keeper: this.txFromJSON<string>,
    set_fee_recipient: this.txFromJSON<Result<void>>,
    fee_recipient: this.txFromJSON<string>,
    usdc_token: this.txFromJSON<string>,
    create_target: this.txFromJSON<Result<u64>>,
    manual_deposit: this.txFromJSON<Result<void>>,
    withdraw: this.txFromJSON<Result<i128>>,
    process_period: this.txFromJSON<Result<void>>,
    get_target: this.txFromJSON<Result<TargetGoal>>,
    get_user_goals: this.txFromJSON<Array<u64>>,
    deposit_to_blend: this.txFromJSON<Result<void>>,
    withdraw_from_blend: this.txFromJSON<Result<void>>,
    blend_position: this.txFromJSON<i128>,
  };
}
