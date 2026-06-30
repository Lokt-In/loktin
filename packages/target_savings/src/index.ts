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
    contractId: "CBLZMVSR5NHSUN5A3J5Z433ZVR3VW7EDLX6T2PDVAVKVYDBIXFDRUKBB",
  }
} as const

export const Errors = {
  1: {message:"Unauthorized"},
  2: {message:"AdminNotSet"},
  10: {message:"GoalNotFound"},
  11: {message:"GoalAlreadyComplete"},
  12: {message:"InvalidAmount"},
  13: {message:"InvalidDuration"},
  14: {message:"InvalidPeriod"},
  15: {message:"PeriodNotDue"},
  16: {message:"InsufficientUserBalance"},
  17: {message:"InsufficientUserAllowance"},
  18: {message:"NotGoalOwner"},
  19: {message:"PoolNotSet"}
}

export type DataKey = {tag: "Admin", values: void} | {tag: "Keeper", values: void} | {tag: "UsdcToken", values: void} | {tag: "FeeRecipient", values: void} | {tag: "GoalCounter", values: void} | {tag: "Goal", values: readonly [u64]} | {tag: "UserGoals", values: readonly [string]} | {tag: "Pool", values: void} | {tag: "YieldApyBps", values: void};


export interface TargetGoal {
  accrued_yield: i128;
  deposited: i128;
  end_date: u64;
  id: u64;
  is_complete: boolean;
  last_deposit_date: u64;
  last_yield_update: u64;
  missed_periods: u32;
  name: string;
  period_amount: i128;
  period_seconds: u64;
  start_date: u64;
  target_amount: i128;
  user: string;
}








export interface Client {
  /**
   * Construct and simulate a pool transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  pool: (options?: MethodOptions) => Promise<AssembledTransaction<Result<string>>>

  /**
   * Construct and simulate a admin transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  admin: (options?: MethodOptions) => Promise<AssembledTransaction<Result<string>>>

  /**
   * Construct and simulate a keeper transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  keeper: (options?: MethodOptions) => Promise<AssembledTransaction<string>>

  /**
   * Construct and simulate a set_pool transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_pool: ({pool}: {pool: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a withdraw transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Withdraw entire goal balance. Charges 1% forfeit if before `end_date`.
   */
  withdraw: ({user, target_id}: {user: string, target_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Result<i128>>>

  /**
   * Construct and simulate a get_target transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_target: ({target_id}: {target_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Result<TargetGoal>>>

  /**
   * Construct and simulate a set_keeper transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_keeper: ({keeper}: {keeper: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a usdc_token transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  usdc_token: (options?: MethodOptions) => Promise<AssembledTransaction<string>>

  /**
   * Construct and simulate a create_target transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  create_target: ({user, name, target_amount, period_seconds, period_amount, end_date}: {user: string, name: string, target_amount: i128, period_seconds: u64, period_amount: i128, end_date: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Result<u64>>>

  /**
   * Construct and simulate a fee_recipient transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  fee_recipient: (options?: MethodOptions) => Promise<AssembledTransaction<string>>

  /**
   * Construct and simulate a set_yield_apy transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_yield_apy: ({apy_bps}: {apy_bps: u32}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a yield_apy_bps transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  yield_apy_bps: (options?: MethodOptions) => Promise<AssembledTransaction<u32>>

  /**
   * Construct and simulate a blend_position transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  blend_position: (options?: MethodOptions) => Promise<AssembledTransaction<i128>>

  /**
   * Construct and simulate a get_goal_yield transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_goal_yield: ({target_id}: {target_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Result<i128>>>

  /**
   * Construct and simulate a get_user_goals transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_user_goals: ({user}: {user: string}, options?: MethodOptions) => Promise<AssembledTransaction<Array<u64>>>

  /**
   * Construct and simulate a manual_deposit transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  manual_deposit: ({user, target_id, amount}: {user: string, target_id: u64, amount: i128}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a process_period transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Process a single period for a goal: pulls `period_amount` from the user's wallet
   * via `transfer_from`. If the user lacks balance/allowance, logs a missed period.
   * Callable only by the keeper (admin can be set as keeper).
   */
  process_period: ({target_id}: {target_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a deposit_to_blend transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  deposit_to_blend: ({amount}: {amount: i128}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a set_fee_recipient transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_fee_recipient: ({recipient}: {recipient: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a withdraw_from_blend transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  withdraw_from_blend: ({amount}: {amount: i128}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

}
export class Client extends ContractClient {
  static async deploy<T = Client>(
        /** Constructor/Initialization Args for the contract's `__constructor` method */
        {admin, usdc_token}: {admin: string, usdc_token: string},
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
    return ContractClient.deploy({admin, usdc_token}, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAAAAAAAAAAAAAEcG9vbAAAAAAAAAABAAAD6QAAABMAAAAD",
        "AAAAAAAAAAAAAAAFYWRtaW4AAAAAAAAAAAAAAQAAA+kAAAATAAAAAw==",
        "AAAAAAAAAAAAAAAGa2VlcGVyAAAAAAAAAAAAAQAAABM=",
        "AAAAAAAAAAAAAAAIc2V0X3Bvb2wAAAABAAAAAAAAAARwb29sAAAAEwAAAAEAAAPpAAAD7QAAAAAAAAAD",
        "AAAAAAAAAEZXaXRoZHJhdyBlbnRpcmUgZ29hbCBiYWxhbmNlLiBDaGFyZ2VzIDElIGZvcmZlaXQgaWYgYmVmb3JlIGBlbmRfZGF0ZWAuAAAAAAAId2l0aGRyYXcAAAACAAAAAAAAAAR1c2VyAAAAEwAAAAAAAAAJdGFyZ2V0X2lkAAAAAAAABgAAAAEAAAPpAAAACwAAAAM=",
        "AAAAAAAAAAAAAAAKZ2V0X3RhcmdldAAAAAAAAQAAAAAAAAAJdGFyZ2V0X2lkAAAAAAAABgAAAAEAAAPpAAAH0AAAAApUYXJnZXRHb2FsAAAAAAAD",
        "AAAAAAAAAAAAAAAKc2V0X2tlZXBlcgAAAAAAAQAAAAAAAAAGa2VlcGVyAAAAAAATAAAAAQAAA+kAAAPtAAAAAAAAAAM=",
        "AAAAAAAAAAAAAAAKdXNkY190b2tlbgAAAAAAAAAAAAEAAAAT",
        "AAAAAAAAAAAAAAANX19jb25zdHJ1Y3RvcgAAAAAAAAIAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAKdXNkY190b2tlbgAAAAAAEwAAAAA=",
        "AAAAAAAAAAAAAAANY3JlYXRlX3RhcmdldAAAAAAAAAYAAAAAAAAABHVzZXIAAAATAAAAAAAAAARuYW1lAAAAEAAAAAAAAAANdGFyZ2V0X2Ftb3VudAAAAAAAAAsAAAAAAAAADnBlcmlvZF9zZWNvbmRzAAAAAAAGAAAAAAAAAA1wZXJpb2RfYW1vdW50AAAAAAAACwAAAAAAAAAIZW5kX2RhdGUAAAAGAAAAAQAAA+kAAAAGAAAAAw==",
        "AAAAAAAAAAAAAAANZmVlX3JlY2lwaWVudAAAAAAAAAAAAAABAAAAEw==",
        "AAAAAAAAAAAAAAANc2V0X3lpZWxkX2FweQAAAAAAAAEAAAAAAAAAB2FweV9icHMAAAAABAAAAAEAAAPpAAAD7QAAAAAAAAAD",
        "AAAAAAAAAAAAAAANeWllbGRfYXB5X2JwcwAAAAAAAAAAAAABAAAABA==",
        "AAAAAAAAAAAAAAAOYmxlbmRfcG9zaXRpb24AAAAAAAAAAAABAAAACw==",
        "AAAAAAAAAAAAAAAOZ2V0X2dvYWxfeWllbGQAAAAAAAEAAAAAAAAACXRhcmdldF9pZAAAAAAAAAYAAAABAAAD6QAAAAsAAAAD",
        "AAAAAAAAAAAAAAAOZ2V0X3VzZXJfZ29hbHMAAAAAAAEAAAAAAAAABHVzZXIAAAATAAAAAQAAA+oAAAAG",
        "AAAAAAAAAAAAAAAObWFudWFsX2RlcG9zaXQAAAAAAAMAAAAAAAAABHVzZXIAAAATAAAAAAAAAAl0YXJnZXRfaWQAAAAAAAAGAAAAAAAAAAZhbW91bnQAAAAAAAsAAAABAAAD6QAAA+0AAAAAAAAAAw==",
        "AAAAAAAAANpQcm9jZXNzIGEgc2luZ2xlIHBlcmlvZCBmb3IgYSBnb2FsOiBwdWxscyBgcGVyaW9kX2Ftb3VudGAgZnJvbSB0aGUgdXNlcidzIHdhbGxldAp2aWEgYHRyYW5zZmVyX2Zyb21gLiBJZiB0aGUgdXNlciBsYWNrcyBiYWxhbmNlL2FsbG93YW5jZSwgbG9ncyBhIG1pc3NlZCBwZXJpb2QuCkNhbGxhYmxlIG9ubHkgYnkgdGhlIGtlZXBlciAoYWRtaW4gY2FuIGJlIHNldCBhcyBrZWVwZXIpLgAAAAAADnByb2Nlc3NfcGVyaW9kAAAAAAABAAAAAAAAAAl0YXJnZXRfaWQAAAAAAAAGAAAAAQAAA+kAAAPtAAAAAAAAAAM=",
        "AAAAAAAAAAAAAAAQZGVwb3NpdF90b19ibGVuZAAAAAEAAAAAAAAABmFtb3VudAAAAAAACwAAAAEAAAPpAAAD7QAAAAAAAAAD",
        "AAAAAAAAAAAAAAARc2V0X2ZlZV9yZWNpcGllbnQAAAAAAAABAAAAAAAAAAlyZWNpcGllbnQAAAAAAAATAAAAAQAAA+kAAAPtAAAAAAAAAAM=",
        "AAAAAAAAAAAAAAATd2l0aGRyYXdfZnJvbV9ibGVuZAAAAAABAAAAAAAAAAZhbW91bnQAAAAAAAsAAAABAAAD6QAAA+0AAAAAAAAAAw==",
        "AAAABAAAAAAAAAAAAAAABUVycm9yAAAAAAAADAAAAAAAAAAMVW5hdXRob3JpemVkAAAAAQAAAAAAAAALQWRtaW5Ob3RTZXQAAAAAAgAAAAAAAAAMR29hbE5vdEZvdW5kAAAACgAAAAAAAAATR29hbEFscmVhZHlDb21wbGV0ZQAAAAALAAAAAAAAAA1JbnZhbGlkQW1vdW50AAAAAAAADAAAAAAAAAAPSW52YWxpZER1cmF0aW9uAAAAAA0AAAAAAAAADUludmFsaWRQZXJpb2QAAAAAAAAOAAAAAAAAAAxQZXJpb2ROb3REdWUAAAAPAAAAAAAAABdJbnN1ZmZpY2llbnRVc2VyQmFsYW5jZQAAAAAQAAAAAAAAABlJbnN1ZmZpY2llbnRVc2VyQWxsb3dhbmNlAAAAAAAAEQAAAAAAAAAMTm90R29hbE93bmVyAAAAEgAAAAAAAAAKUG9vbE5vdFNldAAAAAAAEw==",
        "AAAAAgAAAAAAAAAAAAAAB0RhdGFLZXkAAAAACQAAAAAAAAAAAAAABUFkbWluAAAAAAAAAAAAAAAAAAAGS2VlcGVyAAAAAAAAAAAAAAAAAAlVc2RjVG9rZW4AAAAAAAAAAAAAAAAAAAxGZWVSZWNpcGllbnQAAAAAAAAAAAAAAAtHb2FsQ291bnRlcgAAAAABAAAAAAAAAARHb2FsAAAAAQAAAAYAAAABAAAAAAAAAAlVc2VyR29hbHMAAAAAAAABAAAAEwAAAAAAAAAAAAAABFBvb2wAAAAAAAAAAAAAAAtZaWVsZEFweUJwcwA=",
        "AAAAAQAAAAAAAAAAAAAAClRhcmdldEdvYWwAAAAAAA4AAAAAAAAADWFjY3J1ZWRfeWllbGQAAAAAAAALAAAAAAAAAAlkZXBvc2l0ZWQAAAAAAAALAAAAAAAAAAhlbmRfZGF0ZQAAAAYAAAAAAAAAAmlkAAAAAAAGAAAAAAAAAAtpc19jb21wbGV0ZQAAAAABAAAAAAAAABFsYXN0X2RlcG9zaXRfZGF0ZQAAAAAAAAYAAAAAAAAAEWxhc3RfeWllbGRfdXBkYXRlAAAAAAAABgAAAAAAAAAObWlzc2VkX3BlcmlvZHMAAAAAAAQAAAAAAAAABG5hbWUAAAAQAAAAAAAAAA1wZXJpb2RfYW1vdW50AAAAAAAACwAAAAAAAAAOcGVyaW9kX3NlY29uZHMAAAAAAAYAAAAAAAAACnN0YXJ0X2RhdGUAAAAAAAYAAAAAAAAADXRhcmdldF9hbW91bnQAAAAAAAALAAAAAAAAAAR1c2VyAAAAEw==",
        "AAAABQAAAAAAAAAAAAAABk1pc3NlZAAAAAAAAQAAAAZtaXNzZWQAAAAAAAIAAAAAAAAACXRhcmdldF9pZAAAAAAAAAYAAAAAAAAAAAAAAAR1c2VyAAAAEwAAAAAAAAAC",
        "AAAABQAAAAAAAAAAAAAACVdpdGhkcmF3bgAAAAAAAAEAAAAJd2l0aGRyYXduAAAAAAAABAAAAAAAAAAJdGFyZ2V0X2lkAAAAAAAABgAAAAAAAAAAAAAABHVzZXIAAAATAAAAAAAAAAAAAAAHdG9fdXNlcgAAAAALAAAAAAAAAAAAAAAHZm9yZmVpdAAAAAALAAAAAAAAAAI=",
        "AAAABQAAAAAAAAAAAAAADEJsZW5kRGVwb3NpdAAAAAEAAAANYmxlbmRfZGVwb3NpdAAAAAAAAAEAAAAAAAAABmFtb3VudAAAAAAACwAAAAAAAAAC",
        "AAAABQAAAAAAAAAAAAAADUJsZW5kV2l0aGRyYXcAAAAAAAABAAAADmJsZW5kX3dpdGhkcmF3AAAAAAABAAAAAAAAAAZhbW91bnQAAAAAAAsAAAAAAAAAAg==",
        "AAAABQAAAAAAAAAAAAAADU1hbnVhbERlcG9zaXQAAAAAAAABAAAADm1hbnVhbF9kZXBvc2l0AAAAAAADAAAAAAAAAAl0YXJnZXRfaWQAAAAAAAAGAAAAAAAAAAAAAAAEdXNlcgAAABMAAAAAAAAAAAAAAAZhbW91bnQAAAAAAAsAAAAAAAAAAg==",
        "AAAABQAAAAAAAAAAAAAADVBlcmlvZERlcG9zaXQAAAAAAAABAAAADnBlcmlvZF9kZXBvc2l0AAAAAAADAAAAAAAAAAl0YXJnZXRfaWQAAAAAAAAGAAAAAAAAAAAAAAAEdXNlcgAAABMAAAAAAAAAAAAAAAZhbW91bnQAAAAAAAsAAAAAAAAAAg==",
        "AAAABQAAAAAAAAAAAAAADVRhcmdldENyZWF0ZWQAAAAAAAABAAAADnRhcmdldF9jcmVhdGVkAAAAAAACAAAAAAAAAAl0YXJnZXRfaWQAAAAAAAAGAAAAAAAAAAAAAAAEdXNlcgAAABMAAAAAAAAAAg==" ]),
      options
    )
  }
  public readonly fromJSON = {
    pool: this.txFromJSON<Result<string>>,
        admin: this.txFromJSON<Result<string>>,
        keeper: this.txFromJSON<string>,
        set_pool: this.txFromJSON<Result<void>>,
        withdraw: this.txFromJSON<Result<i128>>,
        get_target: this.txFromJSON<Result<TargetGoal>>,
        set_keeper: this.txFromJSON<Result<void>>,
        usdc_token: this.txFromJSON<string>,
        create_target: this.txFromJSON<Result<u64>>,
        fee_recipient: this.txFromJSON<string>,
        set_yield_apy: this.txFromJSON<Result<void>>,
        yield_apy_bps: this.txFromJSON<u32>,
        blend_position: this.txFromJSON<i128>,
        get_goal_yield: this.txFromJSON<Result<i128>>,
        get_user_goals: this.txFromJSON<Array<u64>>,
        manual_deposit: this.txFromJSON<Result<void>>,
        process_period: this.txFromJSON<Result<void>>,
        deposit_to_blend: this.txFromJSON<Result<void>>,
        set_fee_recipient: this.txFromJSON<Result<void>>,
        withdraw_from_blend: this.txFromJSON<Result<void>>
  }
}