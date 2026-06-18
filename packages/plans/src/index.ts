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
    contractId: "CBCKKGNNNFSMTE2IPVGA5YUHSTIN4XX5MQ7LZN4MCPHAKATHWZODGXJN",
  },
} as const;

export const Errors = {
  1: { message: "Unauthorized" },
  2: { message: "AdminNotSet" },
  10: { message: "CycleNotFound" },
  11: { message: "CycleAlreadyExists" },
  12: { message: "CycleNotActive" },
  13: { message: "CycleAlreadyEnded" },
  14: { message: "InvalidCycleDuration" },
  15: { message: "InsufficientFunds" },
  20: { message: "BillNotFound" },
  21: { message: "BillAlreadyPaid" },
  22: { message: "InvalidBillAmount" },
  23: { message: "InvalidDueDate" },
  24: { message: "BillLeadTimeTooShort" },
  25: { message: "EmergencyBillLimitExceeded" },
  26: { message: "MonthlyAdjustmentLimitReached" },
  27: { message: "InvalidRecurrence" },
  30: { message: "CycleNotEnded" },
  31: { message: "EarlyWithdrawalNotAllowed" },
  32: { message: "BillNotDueYet" },
  40: { message: "NoPendingAdminTransfer" },
  41: { message: "AdminTransferExpired" },
  42: { message: "PendingAdminTransferExists" },
  50: { message: "InvalidFeePercentage" },
  51: { message: "InvalidAddress" },
  52: { message: "InvalidTimestamp" },
  53: { message: "FeeRecipientNotSet" },
  54: { message: "UsdcTokenNotSet" },
  55: { message: "FeePercentageNotSet" },
  60: { message: "Reentrancy" },
  70: { message: "TokenTransferFailed" },
};

export type BillCategory =
  | { tag: "Housing"; values: void }
  | { tag: "Utilities"; values: void }
  | { tag: "Transportation"; values: void }
  | { tag: "Food"; values: void }
  | { tag: "Healthcare"; values: void }
  | { tag: "Insurance"; values: void }
  | { tag: "Entertainment"; values: void }
  | { tag: "Education"; values: void }
  | { tag: "Debt"; values: void }
  | { tag: "Other"; values: void };

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

export interface Bill {
  amount: i128;
  category: BillCategory;
  cycle_id: u64;
  due_date: u64;
  id: u64;
  is_paid: boolean;
  is_recurring: boolean;
  last_paid_date: Option<u64>;
  name: string;
  recurrence_calendar: Array<u32>;
}

export type DataKey =
  | { tag: "Admin"; values: void }
  | { tag: "PendingAdmin"; values: void }
  | { tag: "TransferExpiry"; values: void }
  | { tag: "UsdcToken"; values: void }
  | { tag: "FeeRecipient"; values: void }
  | { tag: "FeePercentage"; values: void }
  | { tag: "CycleCounter"; values: void }
  | { tag: "BillCounter"; values: void }
  | { tag: "Cycle"; values: readonly [u64] }
  | { tag: "Bill"; values: readonly [u64] }
  | { tag: "UserCycles"; values: readonly [string] }
  | { tag: "CycleBills"; values: readonly [u64] }
  | { tag: "AllCycles"; values: void }
  | { tag: "ReentrancyLock"; values: void };

export interface Client {
  /**
   * Construct and simulate a admin transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  admin: (
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<string>>>;

  /**
   * Construct and simulate a transfer_admin transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  transfer_admin: (
    {
      new_admin,
      live_until_ledger,
    }: { new_admin: string; live_until_ledger: u32 },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<void>>>;

  /**
   * Construct and simulate a accept_admin transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  accept_admin: (
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<void>>>;

  /**
   * Construct and simulate a cancel_admin_transfer transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  cancel_admin_transfer: (
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<void>>>;

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
  ) => Promise<AssembledTransaction<Result<string>>>;

  /**
   * Construct and simulate a set_usdc_token transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_usdc_token: (
    { usdc_token }: { usdc_token: string },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<void>>>;

  /**
   * Construct and simulate a usdc_token transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  usdc_token: (
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<string>>>;

  /**
   * Construct and simulate a set_fee_percentage transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_fee_percentage: (
    { fee_percentage }: { fee_percentage: u32 },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<void>>>;

  /**
   * Construct and simulate a fee_percentage transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  fee_percentage: (
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<u32>>>;

  /**
   * Construct and simulate a create_cycle transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  create_cycle: (
    {
      user,
      duration_months,
      amount,
    }: { user: string; duration_months: u32; amount: i128 },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<u64>>>;

  /**
   * Construct and simulate a get_cycle transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_cycle: (
    { cycle_id }: { cycle_id: u64 },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<BillCycle>>>;

  /**
   * Construct and simulate a get_user_cycles transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_user_cycles: (
    { user }: { user: string },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Array<u64>>>;

  /**
   * Construct and simulate a get_all_cycles transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_all_cycles: (
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<Array<u64>>>>;

  /**
   * Construct and simulate a end_cycle transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Anyone can end a cycle after the end_date has passed
   */
  end_cycle: (
    { cycle_id }: { cycle_id: u64 },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<void>>>;

  /**
   * Construct and simulate a admin_end_cycle transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Admin can end a cycle at any time
   */
  admin_end_cycle: (
    { cycle_id }: { cycle_id: u64 },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<void>>>;

  /**
   * Construct and simulate a add_bills transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  add_bills: (
    {
      cycle_id,
      bills,
    }: {
      cycle_id: u64;
      bills: Array<
        readonly [string, i128, u64, boolean, Array<u32>, BillCategory]
      >;
    },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<Array<u64>>>>;

  /**
   * Construct and simulate a get_bill transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_bill: (
    { bill_id }: { bill_id: u64 },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<Bill>>>;

  /**
   * Construct and simulate a get_cycle_bills transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_cycle_bills: (
    { cycle_id }: { cycle_id: u64 },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Array<u64>>>;

  /**
   * Construct and simulate a pay_bill transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  pay_bill: (
    { bill_id }: { bill_id: u64 },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<void>>>;

  /**
   * Construct and simulate a admin_pay_bill transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  admin_pay_bill: (
    { bill_id }: { bill_id: u64 },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<void>>>;

  /**
   * Construct and simulate a skip_bill transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Skip the current month's payment for a recurring bill
   */
  skip_bill: (
    { bill_id }: { bill_id: u64 },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<void>>>;

  /**
   * Construct and simulate a delete_bill transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Delete a bill completely (all future occurrences)
   */
  delete_bill: (
    { bill_id }: { bill_id: u64 },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<void>>>;

  /**
   * Construct and simulate a skip_bills transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Skip the current month's payment for multiple bills
   */
  skip_bills: (
    { bill_ids }: { bill_ids: Array<u64> },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<void>>>;

  /**
   * Construct and simulate a delete_bills transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Delete multiple bills completely (all future occurrences)
   */
  delete_bills: (
    { bill_ids }: { bill_ids: Array<u64> },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<void>>>;
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
        "AAAABAAAAAAAAAAAAAAABUVycm9yAAAAAAAAHgAAAAAAAAAMVW5hdXRob3JpemVkAAAAAQAAAAAAAAALQWRtaW5Ob3RTZXQAAAAAAgAAAAAAAAANQ3ljbGVOb3RGb3VuZAAAAAAAAAoAAAAAAAAAEkN5Y2xlQWxyZWFkeUV4aXN0cwAAAAAACwAAAAAAAAAOQ3ljbGVOb3RBY3RpdmUAAAAAAAwAAAAAAAAAEUN5Y2xlQWxyZWFkeUVuZGVkAAAAAAAADQAAAAAAAAAUSW52YWxpZEN5Y2xlRHVyYXRpb24AAAAOAAAAAAAAABFJbnN1ZmZpY2llbnRGdW5kcwAAAAAAAA8AAAAAAAAADEJpbGxOb3RGb3VuZAAAABQAAAAAAAAAD0JpbGxBbHJlYWR5UGFpZAAAAAAVAAAAAAAAABFJbnZhbGlkQmlsbEFtb3VudAAAAAAAABYAAAAAAAAADkludmFsaWREdWVEYXRlAAAAAAAXAAAAAAAAABRCaWxsTGVhZFRpbWVUb29TaG9ydAAAABgAAAAAAAAAGkVtZXJnZW5jeUJpbGxMaW1pdEV4Y2VlZGVkAAAAAAAZAAAAAAAAAB1Nb250aGx5QWRqdXN0bWVudExpbWl0UmVhY2hlZAAAAAAAABoAAAAAAAAAEUludmFsaWRSZWN1cnJlbmNlAAAAAAAAGwAAAAAAAAANQ3ljbGVOb3RFbmRlZAAAAAAAAB4AAAAAAAAAGUVhcmx5V2l0aGRyYXdhbE5vdEFsbG93ZWQAAAAAAAAfAAAAAAAAAA1CaWxsTm90RHVlWWV0AAAAAAAAIAAAAAAAAAAWTm9QZW5kaW5nQWRtaW5UcmFuc2ZlcgAAAAAAKAAAAAAAAAAUQWRtaW5UcmFuc2ZlckV4cGlyZWQAAAApAAAAAAAAABpQZW5kaW5nQWRtaW5UcmFuc2ZlckV4aXN0cwAAAAAAKgAAAAAAAAAUSW52YWxpZEZlZVBlcmNlbnRhZ2UAAAAyAAAAAAAAAA5JbnZhbGlkQWRkcmVzcwAAAAAAMwAAAAAAAAAQSW52YWxpZFRpbWVzdGFtcAAAADQAAAAAAAAAEkZlZVJlY2lwaWVudE5vdFNldAAAAAAANQAAAAAAAAAPVXNkY1Rva2VuTm90U2V0AAAAADYAAAAAAAAAE0ZlZVBlcmNlbnRhZ2VOb3RTZXQAAAAANwAAAAAAAAAKUmVlbnRyYW5jeQAAAAAAPAAAAAAAAAATVG9rZW5UcmFuc2ZlckZhaWxlZAAAAABG",
        "AAAABQAAAAAAAAAAAAAAFkFkbWluVHJhbnNmZXJJbml0aWF0ZWQAAAAAAAEAAAAYYWRtaW5fdHJhbnNmZXJfaW5pdGlhdGVkAAAAAQAAAAAAAAAJbmV3X2FkbWluAAAAAAAAEwAAAAAAAAAC",
        "AAAABQAAAAAAAAAAAAAAEEFkbWluVHJhbnNmZXJyZWQAAAABAAAAEWFkbWluX3RyYW5zZmVycmVkAAAAAAAAAQAAAAAAAAAJbmV3X2FkbWluAAAAAAAAEwAAAAAAAAAC",
        "AAAABQAAAAAAAAAAAAAAE0ZlZVJlY2lwaWVudFVwZGF0ZWQAAAAAAQAAABVmZWVfcmVjaXBpZW50X3VwZGF0ZWQAAAAAAAABAAAAAAAAAAlyZWNpcGllbnQAAAAAAAATAAAAAAAAAAI=",
        "AAAABQAAAAAAAAAAAAAADEN5Y2xlQ3JlYXRlZAAAAAEAAAANY3ljbGVfY3JlYXRlZAAAAAAAAAIAAAAAAAAACGN5Y2xlX2lkAAAABgAAAAAAAAAAAAAABHVzZXIAAAATAAAAAAAAAAI=",
        "AAAABQAAAAAAAAAAAAAACkN5Y2xlRW5kZWQAAAAAAAEAAAALY3ljbGVfZW5kZWQAAAAAAgAAAAAAAAAIY3ljbGVfaWQAAAAGAAAAAAAAAAAAAAAHc3VycGx1cwAAAAALAAAAAAAAAAI=",
        "AAAABQAAAAAAAAAAAAAACUJpbGxBZGRlZAAAAAAAAAEAAAAKYmlsbF9hZGRlZAAAAAAAAgAAAAAAAAAHYmlsbF9pZAAAAAAGAAAAAAAAAAAAAAAIY3ljbGVfaWQAAAAGAAAAAAAAAAI=",
        "AAAABQAAAAAAAAAAAAAACEJpbGxQYWlkAAAAAQAAAAliaWxsX3BhaWQAAAAAAAACAAAAAAAAAAdiaWxsX2lkAAAAAAYAAAAAAAAAAAAAAAZhbW91bnQAAAAAAAsAAAAAAAAAAg==",
        "AAAABQAAAAAAAAAAAAAADUJpbGxDYW5jZWxsZWQAAAAAAAABAAAADmJpbGxfY2FuY2VsbGVkAAAAAAABAAAAAAAAAAdiaWxsX2lkAAAAAAYAAAAAAAAAAg==",
        "AAAAAgAAAAAAAAAAAAAADEJpbGxDYXRlZ29yeQAAAAoAAAAAAAAAAAAAAAdIb3VzaW5nAAAAAAAAAAAAAAAACVV0aWxpdGllcwAAAAAAAAAAAAAAAAAADlRyYW5zcG9ydGF0aW9uAAAAAAAAAAAAAAAAAARGb29kAAAAAAAAAAAAAAAKSGVhbHRoY2FyZQAAAAAAAAAAAAAAAAAJSW5zdXJhbmNlAAAAAAAAAAAAAAAAAAANRW50ZXJ0YWlubWVudAAAAAAAAAAAAAAAAAAACUVkdWNhdGlvbgAAAAAAAAAAAAAAAAAABERlYnQAAAAAAAAAAAAAAAVPdGhlcgAAAA==",
        "AAAAAQAAAAAAAAAAAAAACUJpbGxDeWNsZQAAAAAAAAgAAAAAAAAACGVuZF9kYXRlAAAABgAAAAAAAAAOZmVlX3BlcmNlbnRhZ2UAAAAAAAQAAAAAAAAACWlzX2FjdGl2ZQAAAAAAAAEAAAAAAAAAFWxhc3RfYWRqdXN0bWVudF9tb250aAAAAAAAAAQAAAAAAAAADW9wZXJhdGluZ19mZWUAAAAAAAALAAAAAAAAAApzdGFydF9kYXRlAAAAAAAGAAAAAAAAAA90b3RhbF9kZXBvc2l0ZWQAAAAACwAAAAAAAAAEdXNlcgAAABM=",
        "AAAAAQAAAAAAAAAAAAAABEJpbGwAAAAKAAAAAAAAAAZhbW91bnQAAAAAAAsAAAAAAAAACGNhdGVnb3J5AAAH0AAAAAxCaWxsQ2F0ZWdvcnkAAAAAAAAACGN5Y2xlX2lkAAAABgAAAAAAAAAIZHVlX2RhdGUAAAAGAAAAAAAAAAJpZAAAAAAABgAAAAAAAAAHaXNfcGFpZAAAAAABAAAAAAAAAAxpc19yZWN1cnJpbmcAAAABAAAAAAAAAA5sYXN0X3BhaWRfZGF0ZQAAAAAD6AAAAAYAAAAAAAAABG5hbWUAAAAQAAAAAAAAABNyZWN1cnJlbmNlX2NhbGVuZGFyAAAAA+oAAAAE",
        "AAAAAgAAAAAAAAAAAAAAB0RhdGFLZXkAAAAADgAAAAAAAAAAAAAABUFkbWluAAAAAAAAAAAAAAAAAAAMUGVuZGluZ0FkbWluAAAAAAAAAAAAAAAOVHJhbnNmZXJFeHBpcnkAAAAAAAAAAAAAAAAACVVzZGNUb2tlbgAAAAAAAAAAAAAAAAAADEZlZVJlY2lwaWVudAAAAAAAAAAAAAAADUZlZVBlcmNlbnRhZ2UAAAAAAAAAAAAAAAAAAAxDeWNsZUNvdW50ZXIAAAAAAAAAAAAAAAtCaWxsQ291bnRlcgAAAAABAAAAAAAAAAVDeWNsZQAAAAAAAAEAAAAGAAAAAQAAAAAAAAAEQmlsbAAAAAEAAAAGAAAAAQAAAAAAAAAKVXNlckN5Y2xlcwAAAAAAAQAAABMAAAABAAAAAAAAAApDeWNsZUJpbGxzAAAAAAABAAAABgAAAAAAAAAAAAAACUFsbEN5Y2xlcwAAAAAAAAAAAAAAAAAADlJlZW50cmFuY3lMb2NrAAA=",
        "AAAAAAAAAAAAAAANX19jb25zdHJ1Y3RvcgAAAAAAAAIAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAKdXNkY190b2tlbgAAAAAAEwAAAAA=",
        "AAAAAAAAAAAAAAAFYWRtaW4AAAAAAAAAAAAAAQAAA+kAAAATAAAAAw==",
        "AAAAAAAAAAAAAAAOdHJhbnNmZXJfYWRtaW4AAAAAAAIAAAAAAAAACW5ld19hZG1pbgAAAAAAABMAAAAAAAAAEWxpdmVfdW50aWxfbGVkZ2VyAAAAAAAABAAAAAEAAAPpAAAD7QAAAAAAAAAD",
        "AAAAAAAAAAAAAAAMYWNjZXB0X2FkbWluAAAAAAAAAAEAAAPpAAAD7QAAAAAAAAAD",
        "AAAAAAAAAAAAAAAVY2FuY2VsX2FkbWluX3RyYW5zZmVyAAAAAAAAAAAAAAEAAAPpAAAD7QAAAAAAAAAD",
        "AAAAAAAAAAAAAAARc2V0X2ZlZV9yZWNpcGllbnQAAAAAAAABAAAAAAAAAAlyZWNpcGllbnQAAAAAAAATAAAAAQAAA+kAAAPtAAAAAAAAAAM=",
        "AAAAAAAAAAAAAAANZmVlX3JlY2lwaWVudAAAAAAAAAAAAAABAAAD6QAAABMAAAAD",
        "AAAAAAAAAAAAAAAOc2V0X3VzZGNfdG9rZW4AAAAAAAEAAAAAAAAACnVzZGNfdG9rZW4AAAAAABMAAAABAAAD6QAAA+0AAAAAAAAAAw==",
        "AAAAAAAAAAAAAAAKdXNkY190b2tlbgAAAAAAAAAAAAEAAAPpAAAAEwAAAAM=",
        "AAAAAAAAAAAAAAASc2V0X2ZlZV9wZXJjZW50YWdlAAAAAAABAAAAAAAAAA5mZWVfcGVyY2VudGFnZQAAAAAABAAAAAEAAAPpAAAD7QAAAAAAAAAD",
        "AAAAAAAAAAAAAAAOZmVlX3BlcmNlbnRhZ2UAAAAAAAAAAAABAAAD6QAAAAQAAAAD",
        "AAAAAAAAAAAAAAAMY3JlYXRlX2N5Y2xlAAAAAwAAAAAAAAAEdXNlcgAAABMAAAAAAAAAD2R1cmF0aW9uX21vbnRocwAAAAAEAAAAAAAAAAZhbW91bnQAAAAAAAsAAAABAAAD6QAAAAYAAAAD",
        "AAAAAAAAAAAAAAAJZ2V0X2N5Y2xlAAAAAAAAAQAAAAAAAAAIY3ljbGVfaWQAAAAGAAAAAQAAA+kAAAfQAAAACUJpbGxDeWNsZQAAAAAAAAM=",
        "AAAAAAAAAAAAAAAPZ2V0X3VzZXJfY3ljbGVzAAAAAAEAAAAAAAAABHVzZXIAAAATAAAAAQAAA+oAAAAG",
        "AAAAAAAAAAAAAAAOZ2V0X2FsbF9jeWNsZXMAAAAAAAAAAAABAAAD6QAAA+oAAAAGAAAAAw==",
        "AAAAAAAAADRBbnlvbmUgY2FuIGVuZCBhIGN5Y2xlIGFmdGVyIHRoZSBlbmRfZGF0ZSBoYXMgcGFzc2VkAAAACWVuZF9jeWNsZQAAAAAAAAEAAAAAAAAACGN5Y2xlX2lkAAAABgAAAAEAAAPpAAAD7QAAAAAAAAAD",
        "AAAAAAAAACFBZG1pbiBjYW4gZW5kIGEgY3ljbGUgYXQgYW55IHRpbWUAAAAAAAAPYWRtaW5fZW5kX2N5Y2xlAAAAAAEAAAAAAAAACGN5Y2xlX2lkAAAABgAAAAEAAAPpAAAD7QAAAAAAAAAD",
        "AAAAAAAAAAAAAAAJYWRkX2JpbGxzAAAAAAAAAgAAAAAAAAAIY3ljbGVfaWQAAAAGAAAAAAAAAAViaWxscwAAAAAAA+oAAAPtAAAABgAAABAAAAALAAAABgAAAAEAAAPqAAAABAAAB9AAAAAMQmlsbENhdGVnb3J5AAAAAQAAA+kAAAPqAAAABgAAAAM=",
        "AAAAAAAAAAAAAAAIZ2V0X2JpbGwAAAABAAAAAAAAAAdiaWxsX2lkAAAAAAYAAAABAAAD6QAAB9AAAAAEQmlsbAAAAAM=",
        "AAAAAAAAAAAAAAAPZ2V0X2N5Y2xlX2JpbGxzAAAAAAEAAAAAAAAACGN5Y2xlX2lkAAAABgAAAAEAAAPqAAAABg==",
        "AAAAAAAAAAAAAAAIcGF5X2JpbGwAAAABAAAAAAAAAAdiaWxsX2lkAAAAAAYAAAABAAAD6QAAA+0AAAAAAAAAAw==",
        "AAAAAAAAAAAAAAAOYWRtaW5fcGF5X2JpbGwAAAAAAAEAAAAAAAAAB2JpbGxfaWQAAAAABgAAAAEAAAPpAAAD7QAAAAAAAAAD",
        "AAAAAAAAADVTa2lwIHRoZSBjdXJyZW50IG1vbnRoJ3MgcGF5bWVudCBmb3IgYSByZWN1cnJpbmcgYmlsbAAAAAAAAAlza2lwX2JpbGwAAAAAAAABAAAAAAAAAAdiaWxsX2lkAAAAAAYAAAABAAAD6QAAA+0AAAAAAAAAAw==",
        "AAAAAAAAADFEZWxldGUgYSBiaWxsIGNvbXBsZXRlbHkgKGFsbCBmdXR1cmUgb2NjdXJyZW5jZXMpAAAAAAAAC2RlbGV0ZV9iaWxsAAAAAAEAAAAAAAAAB2JpbGxfaWQAAAAABgAAAAEAAAPpAAAD7QAAAAAAAAAD",
        "AAAAAAAAADNTa2lwIHRoZSBjdXJyZW50IG1vbnRoJ3MgcGF5bWVudCBmb3IgbXVsdGlwbGUgYmlsbHMAAAAACnNraXBfYmlsbHMAAAAAAAEAAAAAAAAACGJpbGxfaWRzAAAD6gAAAAYAAAABAAAD6QAAA+0AAAAAAAAAAw==",
        "AAAAAAAAADlEZWxldGUgbXVsdGlwbGUgYmlsbHMgY29tcGxldGVseSAoYWxsIGZ1dHVyZSBvY2N1cnJlbmNlcykAAAAAAAAMZGVsZXRlX2JpbGxzAAAAAQAAAAAAAAAIYmlsbF9pZHMAAAPqAAAABgAAAAEAAAPpAAAD7QAAAAAAAAAD",
      ]),
      options,
    );
  }
  public readonly fromJSON = {
    admin: this.txFromJSON<Result<string>>,
    transfer_admin: this.txFromJSON<Result<void>>,
    accept_admin: this.txFromJSON<Result<void>>,
    cancel_admin_transfer: this.txFromJSON<Result<void>>,
    set_fee_recipient: this.txFromJSON<Result<void>>,
    fee_recipient: this.txFromJSON<Result<string>>,
    set_usdc_token: this.txFromJSON<Result<void>>,
    usdc_token: this.txFromJSON<Result<string>>,
    set_fee_percentage: this.txFromJSON<Result<void>>,
    fee_percentage: this.txFromJSON<Result<u32>>,
    create_cycle: this.txFromJSON<Result<u64>>,
    get_cycle: this.txFromJSON<Result<BillCycle>>,
    get_user_cycles: this.txFromJSON<Array<u64>>,
    get_all_cycles: this.txFromJSON<Result<Array<u64>>>,
    end_cycle: this.txFromJSON<Result<void>>,
    admin_end_cycle: this.txFromJSON<Result<void>>,
    add_bills: this.txFromJSON<Result<Array<u64>>>,
    get_bill: this.txFromJSON<Result<Bill>>,
    get_cycle_bills: this.txFromJSON<Array<u64>>,
    pay_bill: this.txFromJSON<Result<void>>,
    admin_pay_bill: this.txFromJSON<Result<void>>,
    skip_bill: this.txFromJSON<Result<void>>,
    delete_bill: this.txFromJSON<Result<void>>,
    skip_bills: this.txFromJSON<Result<void>>,
    delete_bills: this.txFromJSON<Result<void>>,
  };
}
