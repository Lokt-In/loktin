/**
 * MOCK STATE — demo only.
 * All contract interactions are replaced with localStorage-backed state.
 * Real contract code is commented out in the hooks. Restore by reverting the hooks.
 */

export const MOCK_INITIAL_USDC = 10_000; // display USDC
const DECIMALS = 10_000_000; // 7 decimals

// ─── persistence helpers ─────────────────────────────────────────────────────

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

/** Simulate async latency so loading states look real. */
export function mockDelay(ms = 600): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── USDC balance (per-address) ───────────────────────────────────────────────

function balanceKey(address: string) {
  return `mock_usdc_balance:${address}`;
}

export function getMockBalance(address: string): bigint {
  const key = balanceKey(address);
  const raw = localStorage.getItem(key);
  if (raw === null) {
    const initial = BigInt(MOCK_INITIAL_USDC) * BigInt(DECIMALS);
    localStorage.setItem(key, initial.toString());
    return initial;
  }
  return BigInt(raw);
}

function deductMockBalance(address: string, amount: bigint) {
  const key = balanceKey(address);
  const current = getMockBalance(address);
  const next = current - amount < 0n ? 0n : current - amount;
  localStorage.setItem(key, next.toString());
}

function addMockBalance(address: string, amount: bigint) {
  const key = balanceKey(address);
  const current = getMockBalance(address);
  localStorage.setItem(key, (current + amount).toString());
}

// ─── ID counter ───────────────────────────────────────────────────────────────

function nextId(counterKey: string): bigint {
  const current = load<number>(counterKey, 0);
  const next = current + 1;
  save(counterKey, next);
  return BigInt(next);
}

// ─── Cycles (Plans) ───────────────────────────────────────────────────────────

export type MockCycle = {
  id: string;
  user: string;
  start_date: string;
  end_date: string;
  total_deposited: string;
  operating_fee: string;
  fee_percentage: string;
  is_active: boolean;
};

const CYCLES_KEY = "mock_cycles";
const CYCLE_CTR_KEY = "mock_cycle_ctr";
const FEE_BPS = 200; // 2%

export function getMockCycles(user: string): MockCycle[] {
  return load<MockCycle[]>(CYCLES_KEY, []).filter((c) => c.user === user);
}

export function createMockCycle(
  user: string,
  durationMonths: number,
  amount: bigint,
): MockCycle {
  const id = nextId(CYCLE_CTR_KEY);
  const now = BigInt(Math.floor(Date.now() / 1000));
  const duration = BigInt(durationMonths) * 30n * 24n * 3600n;
  const fee = (amount * BigInt(FEE_BPS)) / 10000n;
  const cycle: MockCycle = {
    id: id.toString(),
    user,
    start_date: now.toString(),
    end_date: (now + duration).toString(),
    total_deposited: amount.toString(),
    operating_fee: fee.toString(),
    fee_percentage: FEE_BPS.toString(),
    is_active: true,
  };
  const all = load<MockCycle[]>(CYCLES_KEY, []);
  all.push(cycle);
  save(CYCLES_KEY, all);
  deductMockBalance(user, amount);
  return cycle;
}

export function getMockCycleById(id: bigint): MockCycle | undefined {
  return load<MockCycle[]>(CYCLES_KEY, []).find((c) => c.id === id.toString());
}

// ─── Bills ────────────────────────────────────────────────────────────────────

export type MockBill = {
  id: string;
  cycle_id: string;
  name: string;
  amount: string;
  due_date: string;
  is_recurring: boolean;
  is_paid: boolean;
  recurrence_calendar: number[];
  category: string;
};

const BILLS_KEY = "mock_bills";
const BILL_CTR_KEY = "mock_bill_ctr";

export function getMockBills(cycleId: bigint): MockBill[] {
  return load<MockBill[]>(BILLS_KEY, []).filter(
    (b) => b.cycle_id === cycleId.toString(),
  );
}

export function addMockBills(
  cycleId: bigint,
  bills: {
    name: string;
    amount: bigint;
    dueDate: bigint;
    isRecurring: boolean;
    recurrenceCalendar: number[];
    category: string;
  }[],
): MockBill[] {
  const all = load<MockBill[]>(BILLS_KEY, []);
  const created: MockBill[] = [];
  for (const b of bills) {
    const id = nextId(BILL_CTR_KEY);
    const bill: MockBill = {
      id: id.toString(),
      cycle_id: cycleId.toString(),
      name: b.name,
      amount: b.amount.toString(),
      due_date: b.dueDate.toString(),
      is_recurring: b.isRecurring,
      is_paid: false,
      recurrence_calendar: b.recurrenceCalendar,
      category: b.category,
    };
    all.push(bill);
    created.push(bill);
  }
  save(BILLS_KEY, all);
  return created;
}

export function skipMockBill(billId: bigint) {
  const all = load<MockBill[]>(BILLS_KEY, []);
  const idx = all.findIndex((b) => b.id === billId.toString());
  if (idx !== -1) {
    all[idx] = { ...all[idx], is_paid: true };
    save(BILLS_KEY, all);
  }
}

export function deleteMockBill(billId: bigint) {
  const filtered = load<MockBill[]>(BILLS_KEY, []).filter(
    (b) => b.id !== billId.toString(),
  );
  save(BILLS_KEY, filtered);
}

// ─── Target Savings ───────────────────────────────────────────────────────────

export type MockTarget = {
  id: string;
  user: string;
  name: string;
  target_amount: string;
  period_seconds: string;
  period_amount: string;
  start_date: string;
  end_date: string;
  deposited: string;
  last_deposit_date: string;
  missed_periods: number;
  is_complete: boolean;
};

const TARGETS_KEY = "mock_targets";
const TARGET_CTR_KEY = "mock_target_ctr";

export function getMockTargets(user: string): MockTarget[] {
  return load<MockTarget[]>(TARGETS_KEY, []).filter((t) => t.user === user);
}

export function createMockTarget(
  user: string,
  name: string,
  targetAmount: bigint,
  periodSeconds: bigint,
  periodAmount: bigint,
  endDate: bigint,
): MockTarget {
  const id = nextId(TARGET_CTR_KEY);
  const now = BigInt(Math.floor(Date.now() / 1000));
  const t: MockTarget = {
    id: id.toString(),
    user,
    name,
    target_amount: targetAmount.toString(),
    period_seconds: periodSeconds.toString(),
    period_amount: periodAmount.toString(),
    start_date: now.toString(),
    end_date: endDate.toString(),
    deposited: "0",
    last_deposit_date: now.toString(),
    missed_periods: 0,
    is_complete: false,
  };
  const all = load<MockTarget[]>(TARGETS_KEY, []);
  all.push(t);
  save(TARGETS_KEY, all);
  return t;
}

export function depositMockTarget(
  user: string,
  targetId: bigint,
  amount: bigint,
) {
  const all = load<MockTarget[]>(TARGETS_KEY, []);
  const idx = all.findIndex((t) => t.id === targetId.toString());
  if (idx !== -1) {
    const deposited = BigInt(all[idx].deposited) + amount;
    all[idx] = {
      ...all[idx],
      deposited: deposited.toString(),
      last_deposit_date: Math.floor(Date.now() / 1000).toString(),
    };
    save(TARGETS_KEY, all);
    deductMockBalance(user, amount);
  }
}

export function withdrawMockTarget(user: string, targetId: bigint): bigint {
  const all = load<MockTarget[]>(TARGETS_KEY, []);
  const idx = all.findIndex((t) => t.id === targetId.toString());
  if (idx === -1) return 0n;
  const deposited = BigInt(all[idx].deposited);
  const endDate = BigInt(all[idx].end_date);
  const now = BigInt(Math.floor(Date.now() / 1000));
  const isEarly = now < endDate;
  const returned = isEarly ? (deposited * 9900n) / 10000n : deposited;
  all[idx] = { ...all[idx], is_complete: true, deposited: "0" };
  save(TARGETS_KEY, all);
  addMockBalance(user, returned);
  return returned;
}

// ─── Locked Vault ─────────────────────────────────────────────────────────────

export type MockLock = {
  id: string;
  user: string;
  amount: string;
  apy_basis_points: number;
  duration_seconds: string;
  start_date: string;
  end_date: string;
  projected_yield: string;
  is_unlocked: boolean;
};

const LOCKS_KEY = "mock_locks";
const LOCK_CTR_KEY = "mock_lock_ctr";

const APY_TIERS: Record<number, number> = {
  1: 400,
  3: 600,
  6: 800,
  12: 1000,
};

export function getMockApyTiers(): Map<number, number> {
  return new Map(Object.entries(APY_TIERS).map(([k, v]) => [Number(k), v]));
}

export function getMockLocks(user: string): MockLock[] {
  return load<MockLock[]>(LOCKS_KEY, []).filter((l) => l.user === user);
}

export function createMockLock(
  user: string,
  amount: bigint,
  durationMonths: number,
): MockLock {
  const id = nextId(LOCK_CTR_KEY);
  const now = BigInt(Math.floor(Date.now() / 1000));
  const durationSecs = BigInt(durationMonths) * 30n * 24n * 3600n;
  const apyBps = APY_TIERS[durationMonths] ?? 400;
  const projectedYield =
    (amount * BigInt(apyBps) * BigInt(durationMonths)) / (12n * 10000n);
  const lock: MockLock = {
    id: id.toString(),
    user,
    amount: amount.toString(),
    apy_basis_points: apyBps,
    duration_seconds: durationSecs.toString(),
    start_date: now.toString(),
    end_date: (now + durationSecs).toString(),
    projected_yield: projectedYield.toString(),
    is_unlocked: false,
  };
  const all = load<MockLock[]>(LOCKS_KEY, []);
  all.push(lock);
  save(LOCKS_KEY, all);
  deductMockBalance(user, amount);
  return lock;
}

export function unlockMockLock(lockId: bigint): bigint {
  const all = load<MockLock[]>(LOCKS_KEY, []);
  const idx = all.findIndex((l) => l.id === lockId.toString());
  if (idx === -1) return 0n;
  const lock = all[idx];
  const now = BigInt(Math.floor(Date.now() / 1000));
  if (now < BigInt(lock.end_date)) {
    throw new Error("Lock has not matured yet");
  }
  const principal = BigInt(lock.amount);
  all[idx] = { ...lock, is_unlocked: true };
  save(LOCKS_KEY, all);
  // user is stored on the lock record itself
  addMockBalance(lock.user, principal + BigInt(lock.projected_yield));
  return principal;
}

// ─── Spend & Save ─────────────────────────────────────────────────────────────

export type MockSpendSave = {
  user: string;
  save_percentage: number;
  saved_balance: string;
  total_spent_lifetime: string;
  total_saved_lifetime: string;
  created_date: string;
};

const SS_KEY = "mock_spend_save";

export function getMockSpendSave(user: string): MockSpendSave | null {
  const all = load<MockSpendSave[]>(SS_KEY, []);
  return all.find((p) => p.user === user) ?? null;
}

export function enrollMockSpendSave(
  user: string,
  savePercentageBps: number,
): MockSpendSave {
  const all = load<MockSpendSave[]>(SS_KEY, []);
  const existing = all.findIndex((p) => p.user === user);
  const now = Math.floor(Date.now() / 1000).toString();
  if (existing !== -1) {
    all[existing] = { ...all[existing], save_percentage: savePercentageBps };
    save(SS_KEY, all);
    return all[existing];
  }
  const pos: MockSpendSave = {
    user,
    save_percentage: savePercentageBps,
    saved_balance: "0",
    total_spent_lifetime: "0",
    total_saved_lifetime: "0",
    created_date: now,
  };
  all.push(pos);
  save(SS_KEY, all);
  return pos;
}

export function mockSpend(
  user: string,
  totalAmount: bigint,
): { sent: bigint; saved: bigint } {
  const all = load<MockSpendSave[]>(SS_KEY, []);
  const idx = all.findIndex((p) => p.user === user);
  if (idx === -1) throw new Error("Not enrolled in Spend & Save");
  const pct = BigInt(all[idx].save_percentage);
  const saved = (totalAmount * pct) / 10000n;
  const sent = totalAmount - saved;
  const prevSaved = BigInt(all[idx].saved_balance);
  const prevSpent = BigInt(all[idx].total_spent_lifetime);
  const prevSavedTotal = BigInt(all[idx].total_saved_lifetime);
  all[idx] = {
    ...all[idx],
    saved_balance: (prevSaved + saved).toString(),
    total_spent_lifetime: (prevSpent + totalAmount).toString(),
    total_saved_lifetime: (prevSavedTotal + saved).toString(),
  };
  save(SS_KEY, all);
  deductMockBalance(user, totalAmount);
  return { sent, saved };
}

export function withdrawMockSpendSave(user: string, amount: bigint) {
  const all = load<MockSpendSave[]>(SS_KEY, []);
  const idx = all.findIndex((p) => p.user === user);
  if (idx === -1) throw new Error("Not enrolled");
  const saved = BigInt(all[idx].saved_balance);
  if (amount > saved) throw new Error("Insufficient saved balance");
  all[idx] = { ...all[idx], saved_balance: (saved - amount).toString() };
  save(SS_KEY, all);
  addMockBalance(user, amount);
}
