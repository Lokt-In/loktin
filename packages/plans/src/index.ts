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
    contractId: "CAWJPGWXAYJ6Y6TIS4C6SIOHZOHPRQCJIVXDUVZBVII6RPWMKIUTRKEE",
  }
} as const

export const Errors = {
  1: {message:"Unauthorized"},
  2: {message:"AdminNotSet"},
  10: {message:"CycleNotFound"},
  11: {message:"CycleAlreadyExists"},
  12: {message:"CycleNotActive"},
  13: {message:"CycleAlreadyEnded"},
  14: {message:"InvalidCycleDuration"},
  15: {message:"InsufficientFunds"},
  20: {message:"BillNotFound"},
  21: {message:"BillAlreadyPaid"},
  22: {message:"InvalidBillAmount"},
  23: {message:"InvalidDueDate"},
  24: {message:"BillLeadTimeTooShort"},
  25: {message:"EmergencyBillLimitExceeded"},
  26: {message:"MonthlyAdjustmentLimitReached"},
  27: {message:"InvalidRecurrence"},
  30: {message:"CycleNotEnded"},
  31: {message:"EarlyWithdrawalNotAllowed"},
  32: {message:"BillNotDueYet"},
  40: {message:"NoPendingAdminTransfer"},
  41: {message:"AdminTransferExpired"},
  50: {message:"InvalidFeePercentage"},
  51: {message:"InvalidAddress"},
  52: {message:"InvalidTimestamp"},
  60: {message:"Reentrancy"}
}


export interface Bill {
  amount: i128;
  cycle_id: u64;
  due_date: u64;
  id: u64;
  is_paid: boolean;
  is_recurring: boolean;
  last_paid_date: Option<u64>;
  name: string;
  recurrence_calendar: Array<u32>;
}

export type DataKey = {tag: "Admin", values: void} | {tag: "PendingAdmin", values: void} | {tag: "TransferExpiry", values: void} | {tag: "UsdcToken", values: void} | {tag: "FeeRecipient", values: void} | {tag: "FeePercentage", values: void} | {tag: "CycleCounter", values: void} | {tag: "BillCounter", values: void} | {tag: "Cycle", values: readonly [u64]} | {tag: "Bill", values: readonly [u64]} | {tag: "UserCycles", values: readonly [string]} | {tag: "CycleBills", values: readonly [u64]} | {tag: "AllCycles", values: void} | {tag: "ReentrancyLock", values: void};


export interface BillCycle {
  end_date: u64;
  fee_percentage: u32;
  is_active: boolean;
  last_adjustment_month: u32;
  operating_fee: i128;
  start_date: u64;
  total_deposited: i128;
  user: string;
}









export interface Client {
  /**
   * Construct and simulate a admin transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  admin: (options?: MethodOptions) => Promise<AssembledTransaction<Result<string>>>

  /**
   * Construct and simulate a add_bill transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  add_bill: ({cycle_id, name, amount, due_date, is_recurring, recurrence_calendar}: {cycle_id: u64, name: string, amount: i128, due_date: u64, is_recurring: boolean, recurrence_calendar: Array<u32>}, options?: MethodOptions) => Promise<AssembledTransaction<Result<u64>>>

  /**
   * Construct and simulate a get_bill transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_bill: ({bill_id}: {bill_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Result<Bill>>>

  /**
   * Construct and simulate a pay_bill transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  pay_bill: ({bill_id}: {bill_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a add_bills transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  add_bills: ({cycle_id, bills}: {cycle_id: u64, bills: Array<readonly [string, i128, u64, boolean, Array<u32>]>}, options?: MethodOptions) => Promise<AssembledTransaction<Result<Array<u64>>>>

  /**
   * Construct and simulate a end_cycle transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  end_cycle: ({cycle_id}: {cycle_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a get_cycle transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_cycle: ({cycle_id}: {cycle_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Result<BillCycle>>>

  /**
   * Construct and simulate a accept_admin transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  accept_admin: (options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a create_cycle transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  create_cycle: ({user, duration_months, amount}: {user: string, duration_months: u32, amount: i128}, options?: MethodOptions) => Promise<AssembledTransaction<Result<u64>>>

  /**
   * Construct and simulate a fee_recipient transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  fee_recipient: (options?: MethodOptions) => Promise<AssembledTransaction<string>>

  /**
   * Construct and simulate a admin_pay_bill transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  admin_pay_bill: ({bill_id}: {bill_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a get_all_cycles transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_all_cycles: (options?: MethodOptions) => Promise<AssembledTransaction<Result<Array<u64>>>>

  /**
   * Construct and simulate a get_usdc_token transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_usdc_token: (options?: MethodOptions) => Promise<AssembledTransaction<string>>

  /**
   * Construct and simulate a set_usdc_token transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_usdc_token: ({usdc_token}: {usdc_token: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a transfer_admin transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  transfer_admin: ({new_admin, live_until_ledger}: {new_admin: string, live_until_ledger: u32}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a admin_end_cycle transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  admin_end_cycle: ({cycle_id}: {cycle_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a get_cycle_bills transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_cycle_bills: ({cycle_id}: {cycle_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Array<u64>>>

  /**
   * Construct and simulate a get_user_cycles transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_user_cycles: ({user}: {user: string}, options?: MethodOptions) => Promise<AssembledTransaction<Array<u64>>>

  /**
   * Construct and simulate a keeper_end_cycle transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  keeper_end_cycle: ({cycle_id}: {cycle_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a set_fee_recipient transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_fee_recipient: ({recipient}: {recipient: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a get_fee_percentage transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_fee_percentage: (options?: MethodOptions) => Promise<AssembledTransaction<u32>>

  /**
   * Construct and simulate a set_fee_percentage transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_fee_percentage: ({fee_percentage}: {fee_percentage: u32}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a cancel_admin_transfer transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  cancel_admin_transfer: (options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a cancel_bill_occurrence transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  cancel_bill_occurrence: ({bill_id}: {bill_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a cancel_bills_occurrences transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  cancel_bills_occurrences: ({bill_ids}: {bill_ids: Array<u64>}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a cancel_bill_all_occurrences transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  cancel_bill_all_occurrences: ({bill_id}: {bill_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a cancel_bills_all_occurrences transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  cancel_bills_all_occurrences: ({bill_ids}: {bill_ids: Array<u64>}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

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
      new ContractSpec([ "AAAAAAAAAAAAAAAFYWRtaW4AAAAAAAAAAAAAAQAAA+kAAAATAAAAAw==",
        "AAAAAAAAAAAAAAAIYWRkX2JpbGwAAAAGAAAAAAAAAAhjeWNsZV9pZAAAAAYAAAAAAAAABG5hbWUAAAAQAAAAAAAAAAZhbW91bnQAAAAAAAsAAAAAAAAACGR1ZV9kYXRlAAAABgAAAAAAAAAMaXNfcmVjdXJyaW5nAAAAAQAAAAAAAAATcmVjdXJyZW5jZV9jYWxlbmRhcgAAAAPqAAAABAAAAAEAAAPpAAAABgAAAAM=",
        "AAAAAAAAAAAAAAAIZ2V0X2JpbGwAAAABAAAAAAAAAAdiaWxsX2lkAAAAAAYAAAABAAAD6QAAB9AAAAAEQmlsbAAAAAM=",
        "AAAAAAAAAAAAAAAIcGF5X2JpbGwAAAABAAAAAAAAAAdiaWxsX2lkAAAAAAYAAAABAAAD6QAAA+0AAAAAAAAAAw==",
        "AAAAAAAAAAAAAAAJYWRkX2JpbGxzAAAAAAAAAgAAAAAAAAAIY3ljbGVfaWQAAAAGAAAAAAAAAAViaWxscwAAAAAAA+oAAAPtAAAABQAAABAAAAALAAAABgAAAAEAAAPqAAAABAAAAAEAAAPpAAAD6gAAAAYAAAAD",
        "AAAAAAAAAAAAAAAJZW5kX2N5Y2xlAAAAAAAAAQAAAAAAAAAIY3ljbGVfaWQAAAAGAAAAAQAAA+kAAAPtAAAAAAAAAAM=",
        "AAAAAAAAAAAAAAAJZ2V0X2N5Y2xlAAAAAAAAAQAAAAAAAAAIY3ljbGVfaWQAAAAGAAAAAQAAA+kAAAfQAAAACUJpbGxDeWNsZQAAAAAAAAM=",
        "AAAAAAAAAAAAAAAMYWNjZXB0X2FkbWluAAAAAAAAAAEAAAPpAAAD7QAAAAAAAAAD",
        "AAAAAAAAAAAAAAAMY3JlYXRlX2N5Y2xlAAAAAwAAAAAAAAAEdXNlcgAAABMAAAAAAAAAD2R1cmF0aW9uX21vbnRocwAAAAAEAAAAAAAAAAZhbW91bnQAAAAAAAsAAAABAAAD6QAAAAYAAAAD",
        "AAAAAAAAAAAAAAANX19jb25zdHJ1Y3RvcgAAAAAAAAIAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAKdXNkY190b2tlbgAAAAAAEwAAAAA=",
        "AAAAAAAAAAAAAAANZmVlX3JlY2lwaWVudAAAAAAAAAAAAAABAAAAEw==",
        "AAAAAAAAAAAAAAAOYWRtaW5fcGF5X2JpbGwAAAAAAAEAAAAAAAAAB2JpbGxfaWQAAAAABgAAAAEAAAPpAAAD7QAAAAAAAAAD",
        "AAAAAAAAAAAAAAAOZ2V0X2FsbF9jeWNsZXMAAAAAAAAAAAABAAAD6QAAA+oAAAAGAAAAAw==",
        "AAAAAAAAAAAAAAAOZ2V0X3VzZGNfdG9rZW4AAAAAAAAAAAABAAAAEw==",
        "AAAAAAAAAAAAAAAOc2V0X3VzZGNfdG9rZW4AAAAAAAEAAAAAAAAACnVzZGNfdG9rZW4AAAAAABMAAAABAAAD6QAAA+0AAAAAAAAAAw==",
        "AAAAAAAAAAAAAAAOdHJhbnNmZXJfYWRtaW4AAAAAAAIAAAAAAAAACW5ld19hZG1pbgAAAAAAABMAAAAAAAAAEWxpdmVfdW50aWxfbGVkZ2VyAAAAAAAABAAAAAEAAAPpAAAD7QAAAAAAAAAD",
        "AAAAAAAAAAAAAAAPYWRtaW5fZW5kX2N5Y2xlAAAAAAEAAAAAAAAACGN5Y2xlX2lkAAAABgAAAAEAAAPpAAAD7QAAAAAAAAAD",
        "AAAAAAAAAAAAAAAPZ2V0X2N5Y2xlX2JpbGxzAAAAAAEAAAAAAAAACGN5Y2xlX2lkAAAABgAAAAEAAAPqAAAABg==",
        "AAAAAAAAAAAAAAAPZ2V0X3VzZXJfY3ljbGVzAAAAAAEAAAAAAAAABHVzZXIAAAATAAAAAQAAA+oAAAAG",
        "AAAAAAAAAAAAAAAQa2VlcGVyX2VuZF9jeWNsZQAAAAEAAAAAAAAACGN5Y2xlX2lkAAAABgAAAAEAAAPpAAAD7QAAAAAAAAAD",
        "AAAAAAAAAAAAAAARc2V0X2ZlZV9yZWNpcGllbnQAAAAAAAABAAAAAAAAAAlyZWNpcGllbnQAAAAAAAATAAAAAQAAA+kAAAPtAAAAAAAAAAM=",
        "AAAAAAAAAAAAAAASZ2V0X2ZlZV9wZXJjZW50YWdlAAAAAAAAAAAAAQAAAAQ=",
        "AAAAAAAAAAAAAAASc2V0X2ZlZV9wZXJjZW50YWdlAAAAAAABAAAAAAAAAA5mZWVfcGVyY2VudGFnZQAAAAAABAAAAAEAAAPpAAAD7QAAAAAAAAAD",
        "AAAAAAAAAAAAAAAVY2FuY2VsX2FkbWluX3RyYW5zZmVyAAAAAAAAAAAAAAEAAAPpAAAD7QAAAAAAAAAD",
        "AAAAAAAAAAAAAAAWY2FuY2VsX2JpbGxfb2NjdXJyZW5jZQAAAAAAAQAAAAAAAAAHYmlsbF9pZAAAAAAGAAAAAQAAA+kAAAPtAAAAAAAAAAM=",
        "AAAAAAAAAAAAAAAYY2FuY2VsX2JpbGxzX29jY3VycmVuY2VzAAAAAQAAAAAAAAAIYmlsbF9pZHMAAAPqAAAABgAAAAEAAAPpAAAD7QAAAAAAAAAD",
        "AAAAAAAAAAAAAAAbY2FuY2VsX2JpbGxfYWxsX29jY3VycmVuY2VzAAAAAAEAAAAAAAAAB2JpbGxfaWQAAAAABgAAAAEAAAPpAAAD7QAAAAAAAAAD",
        "AAAAAAAAAAAAAAAcY2FuY2VsX2JpbGxzX2FsbF9vY2N1cnJlbmNlcwAAAAEAAAAAAAAACGJpbGxfaWRzAAAD6gAAAAYAAAABAAAD6QAAA+0AAAAAAAAAAw==",
        "AAAABAAAAAAAAAAAAAAABUVycm9yAAAAAAAAGQAAAAAAAAAMVW5hdXRob3JpemVkAAAAAQAAAAAAAAALQWRtaW5Ob3RTZXQAAAAAAgAAAAAAAAANQ3ljbGVOb3RGb3VuZAAAAAAAAAoAAAAAAAAAEkN5Y2xlQWxyZWFkeUV4aXN0cwAAAAAACwAAAAAAAAAOQ3ljbGVOb3RBY3RpdmUAAAAAAAwAAAAAAAAAEUN5Y2xlQWxyZWFkeUVuZGVkAAAAAAAADQAAAAAAAAAUSW52YWxpZEN5Y2xlRHVyYXRpb24AAAAOAAAAAAAAABFJbnN1ZmZpY2llbnRGdW5kcwAAAAAAAA8AAAAAAAAADEJpbGxOb3RGb3VuZAAAABQAAAAAAAAAD0JpbGxBbHJlYWR5UGFpZAAAAAAVAAAAAAAAABFJbnZhbGlkQmlsbEFtb3VudAAAAAAAABYAAAAAAAAADkludmFsaWREdWVEYXRlAAAAAAAXAAAAAAAAABRCaWxsTGVhZFRpbWVUb29TaG9ydAAAABgAAAAAAAAAGkVtZXJnZW5jeUJpbGxMaW1pdEV4Y2VlZGVkAAAAAAAZAAAAAAAAAB1Nb250aGx5QWRqdXN0bWVudExpbWl0UmVhY2hlZAAAAAAAABoAAAAAAAAAEUludmFsaWRSZWN1cnJlbmNlAAAAAAAAGwAAAAAAAAANQ3ljbGVOb3RFbmRlZAAAAAAAAB4AAAAAAAAAGUVhcmx5V2l0aGRyYXdhbE5vdEFsbG93ZWQAAAAAAAAfAAAAAAAAAA1CaWxsTm90RHVlWWV0AAAAAAAAIAAAAAAAAAAWTm9QZW5kaW5nQWRtaW5UcmFuc2ZlcgAAAAAAKAAAAAAAAAAUQWRtaW5UcmFuc2ZlckV4cGlyZWQAAAApAAAAAAAAABRJbnZhbGlkRmVlUGVyY2VudGFnZQAAADIAAAAAAAAADkludmFsaWRBZGRyZXNzAAAAAAAzAAAAAAAAABBJbnZhbGlkVGltZXN0YW1wAAAANAAAAAAAAAAKUmVlbnRyYW5jeQAAAAAAPA==",
        "AAAAAQAAAAAAAAAAAAAABEJpbGwAAAAJAAAAAAAAAAZhbW91bnQAAAAAAAsAAAAAAAAACGN5Y2xlX2lkAAAABgAAAAAAAAAIZHVlX2RhdGUAAAAGAAAAAAAAAAJpZAAAAAAABgAAAAAAAAAHaXNfcGFpZAAAAAABAAAAAAAAAAxpc19yZWN1cnJpbmcAAAABAAAAAAAAAA5sYXN0X3BhaWRfZGF0ZQAAAAAD6AAAAAYAAAAAAAAABG5hbWUAAAAQAAAAAAAAABNyZWN1cnJlbmNlX2NhbGVuZGFyAAAAA+oAAAAE",
        "AAAAAgAAAAAAAAAAAAAAB0RhdGFLZXkAAAAADgAAAAAAAAAAAAAABUFkbWluAAAAAAAAAAAAAAAAAAAMUGVuZGluZ0FkbWluAAAAAAAAAAAAAAAOVHJhbnNmZXJFeHBpcnkAAAAAAAAAAAAAAAAACVVzZGNUb2tlbgAAAAAAAAAAAAAAAAAADEZlZVJlY2lwaWVudAAAAAAAAAAAAAAADUZlZVBlcmNlbnRhZ2UAAAAAAAAAAAAAAAAAAAxDeWNsZUNvdW50ZXIAAAAAAAAAAAAAAAtCaWxsQ291bnRlcgAAAAABAAAAAAAAAAVDeWNsZQAAAAAAAAEAAAAGAAAAAQAAAAAAAAAEQmlsbAAAAAEAAAAGAAAAAQAAAAAAAAAKVXNlckN5Y2xlcwAAAAAAAQAAABMAAAABAAAAAAAAAApDeWNsZUJpbGxzAAAAAAABAAAABgAAAAAAAAAAAAAACUFsbEN5Y2xlcwAAAAAAAAAAAAAAAAAADlJlZW50cmFuY3lMb2NrAAA=",
        "AAAAAQAAAAAAAAAAAAAACUJpbGxDeWNsZQAAAAAAAAgAAAAAAAAACGVuZF9kYXRlAAAABgAAAAAAAAAOZmVlX3BlcmNlbnRhZ2UAAAAAAAQAAAAAAAAACWlzX2FjdGl2ZQAAAAAAAAEAAAAAAAAAFWxhc3RfYWRqdXN0bWVudF9tb250aAAAAAAAAAQAAAAAAAAADW9wZXJhdGluZ19mZWUAAAAAAAALAAAAAAAAAApzdGFydF9kYXRlAAAAAAAGAAAAAAAAAA90b3RhbF9kZXBvc2l0ZWQAAAAACwAAAAAAAAAEdXNlcgAAABM=",
        "AAAABQAAAAAAAAAAAAAACEJpbGxQYWlkAAAAAQAAAAliaWxsX3BhaWQAAAAAAAACAAAAAAAAAAdiaWxsX2lkAAAAAAYAAAAAAAAAAAAAAAZhbW91bnQAAAAAAAsAAAAAAAAAAg==",
        "AAAABQAAAAAAAAAAAAAACUJpbGxBZGRlZAAAAAAAAAEAAAAKYmlsbF9hZGRlZAAAAAAAAgAAAAAAAAAHYmlsbF9pZAAAAAAGAAAAAAAAAAAAAAAIY3ljbGVfaWQAAAAGAAAAAAAAAAI=",
        "AAAABQAAAAAAAAAAAAAACkN5Y2xlRW5kZWQAAAAAAAEAAAALY3ljbGVfZW5kZWQAAAAAAgAAAAAAAAAIY3ljbGVfaWQAAAAGAAAAAAAAAAAAAAAHc3VycGx1cwAAAAALAAAAAAAAAAI=",
        "AAAABQAAAAAAAAAAAAAADEN5Y2xlQ3JlYXRlZAAAAAEAAAANY3ljbGVfY3JlYXRlZAAAAAAAAAIAAAAAAAAACGN5Y2xlX2lkAAAABgAAAAAAAAAAAAAABHVzZXIAAAATAAAAAAAAAAI=",
        "AAAABQAAAAAAAAAAAAAADUJpbGxDYW5jZWxsZWQAAAAAAAABAAAADmJpbGxfY2FuY2VsbGVkAAAAAAABAAAAAAAAAAdiaWxsX2lkAAAAAAYAAAAAAAAAAg==",
        "AAAABQAAAAAAAAAAAAAAEEFkbWluVHJhbnNmZXJyZWQAAAABAAAAEWFkbWluX3RyYW5zZmVycmVkAAAAAAAAAQAAAAAAAAAJbmV3X2FkbWluAAAAAAAAEwAAAAAAAAAC",
        "AAAABQAAAAAAAAAAAAAAE0ZlZVJlY2lwaWVudFVwZGF0ZWQAAAAAAQAAABVmZWVfcmVjaXBpZW50X3VwZGF0ZWQAAAAAAAABAAAAAAAAAAlyZWNpcGllbnQAAAAAAAATAAAAAAAAAAI=",
        "AAAABQAAAAAAAAAAAAAAFkFkbWluVHJhbnNmZXJJbml0aWF0ZWQAAAAAAAEAAAAYYWRtaW5fdHJhbnNmZXJfaW5pdGlhdGVkAAAAAQAAAAAAAAAJbmV3X2FkbWluAAAAAAAAEwAAAAAAAAAC" ]),
      options
    )
  }
  public readonly fromJSON = {
    admin: this.txFromJSON<Result<string>>,
        add_bill: this.txFromJSON<Result<u64>>,
        get_bill: this.txFromJSON<Result<Bill>>,
        pay_bill: this.txFromJSON<Result<void>>,
        add_bills: this.txFromJSON<Result<Array<u64>>>,
        end_cycle: this.txFromJSON<Result<void>>,
        get_cycle: this.txFromJSON<Result<BillCycle>>,
        accept_admin: this.txFromJSON<Result<void>>,
        create_cycle: this.txFromJSON<Result<u64>>,
        fee_recipient: this.txFromJSON<string>,
        admin_pay_bill: this.txFromJSON<Result<void>>,
        get_all_cycles: this.txFromJSON<Result<Array<u64>>>,
        get_usdc_token: this.txFromJSON<string>,
        set_usdc_token: this.txFromJSON<Result<void>>,
        transfer_admin: this.txFromJSON<Result<void>>,
        admin_end_cycle: this.txFromJSON<Result<void>>,
        get_cycle_bills: this.txFromJSON<Array<u64>>,
        get_user_cycles: this.txFromJSON<Array<u64>>,
        keeper_end_cycle: this.txFromJSON<Result<void>>,
        set_fee_recipient: this.txFromJSON<Result<void>>,
        get_fee_percentage: this.txFromJSON<u32>,
        set_fee_percentage: this.txFromJSON<Result<void>>,
        cancel_admin_transfer: this.txFromJSON<Result<void>>,
        cancel_bill_occurrence: this.txFromJSON<Result<void>>,
        cancel_bills_occurrences: this.txFromJSON<Result<void>>,
        cancel_bill_all_occurrences: this.txFromJSON<Result<void>>,
        cancel_bills_all_occurrences: this.txFromJSON<Result<void>>
  }
}