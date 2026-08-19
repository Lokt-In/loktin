import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { wallet, disconnectWallet } from "../util/wallet";
import storage from "../util/storage";

export interface WalletContextType {
  address?: string;
  network?: string;
  networkPassphrase?: string;
  isPending: boolean;
  signTransaction?: typeof wallet.signTransaction;
  signAuthEntry?: typeof wallet.signAuthEntry;
  /** Explicitly sign out: disconnect the kit, clear storage, reset state. */
  disconnect?: () => Promise<void>;
}

const initialState = {
  address: undefined,
  network: undefined,
  networkPassphrase: undefined,
};

/**
 * Rehydrate the last connected wallet from localStorage *synchronously*.
 *
 * `updateCurrentWalletState` also does this, but only from an effect — one
 * render too late. Guarded routes check `address` on their first render, so
 * starting empty bounced every dashboard page to the landing page on reload.
 * The polling loop still runs and will nullify this if the wallet is actually
 * gone.
 */
const restoreState = (): Omit<WalletContextType, "isPending"> => {
  try {
    const walletId = storage.getItem("walletId");
    const address = storage.getItem("walletAddress");
    const network = storage.getItem("walletNetwork");
    const networkPassphrase = storage.getItem("networkPassphrase");
    if (!walletId || !address) return initialState;
    return {
      address,
      network: network ?? undefined,
      networkPassphrase: networkPassphrase ?? undefined,
    };
  } catch {
    // Malformed JSON or storage unavailable (private mode) — start signed out.
    return initialState;
  }
};

const POLL_INTERVAL = 1000;

export const WalletContext = // eslint-disable-line react-refresh/only-export-components
  createContext<WalletContextType>({ isPending: true });

export const WalletProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] =
    useState<Omit<WalletContextType, "isPending">>(restoreState);
  const [isPending, startTransition] = useTransition();
  const popupLock = useRef(false);

  // Bind the signers once. Re-binding every render gave them new identities,
  // which changed the context value every render and re-ran every consumer.
  const signers = useRef({
    signTransaction: wallet.signTransaction.bind(wallet),
    signAuthEntry: wallet.signAuthEntry.bind(wallet),
  });

  // Latest committed state, readable inside the poll without making the poll
  // effect depend on `state` (which would tear it down and restart it on every
  // change).
  const stateRef = useRef(state);
  stateRef.current = state;

  const updateState = useCallback(
    (newState: Omit<WalletContextType, "isPending">) => {
      setState((prev) => {
        if (
          prev.address !== newState.address ||
          prev.network !== newState.network ||
          prev.networkPassphrase !== newState.networkPassphrase
        ) {
          return newState;
        }
        return prev;
      });
    },
    [],
  );

  const disconnect = useCallback(async () => {
    try {
      await disconnectWallet();
    } catch (e) {
      // Even if the kit call fails, we still clear our own session below.
      console.error("disconnect:", e);
    }
    storage.setItem("walletAddress", "");
    storage.setItem("walletNetwork", "");
    storage.setItem("networkPassphrase", "");
    updateState(initialState);
  }, [updateState]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let isMounted = true;

    // Reconcile our session with the wallet extension. This only *detects
    // changes* (account/network switches) — it must never sign the user out on
    // a transient error. A background `getAddress()` throws for all sorts of
    // reasons (extension asleep, locked, slow), and wiping the session on that
    // reset every address-keyed read (balance, locks, goals, activity) to zero
    // as the user navigated. Sign-out is now explicit only (see `disconnect`).
    const reconcile = async () => {
      const walletId = storage.getItem("walletId");
      if (!walletId || popupLock.current) return;
      try {
        popupLock.current = true;
        wallet.setWallet(walletId);
        // Only Freighter supports a silent background `getAddress()`. For popup /
        // redirect wallets (Albedo, etc.) `getAddress()` OPENS A WINDOW every
        // call — at a 1s poll that spawns an Albedo popup per second during the
        // connect window (before an address is stored), making it impossible to
        // connect. So never poll them: trust the stored session; the user's
        // explicit connect/sign actions are the only time we open their wallet.
        if (walletId !== "freighter") return;
        const [a, n] = await Promise.all([
          wallet.getAddress(),
          wallet.getNetwork(),
        ]);
        if (!a.address) return; // inconclusive — keep the current session
        const cur = stateRef.current;
        if (
          a.address !== cur.address ||
          n.network !== cur.network ||
          n.networkPassphrase !== cur.networkPassphrase
        ) {
          storage.setItem("walletAddress", a.address);
          storage.setItem("walletNetwork", n.network);
          storage.setItem("networkPassphrase", n.networkPassphrase);
          updateState({ ...a, ...n });
        }
      } catch (e) {
        // Keep the current session; a poll hiccup is not a disconnect.
        console.error("wallet reconcile:", e);
      } finally {
        popupLock.current = false;
      }
    };

    const poll = async () => {
      if (!isMounted) return;
      await reconcile();
      if (isMounted) timer = setTimeout(() => void poll(), POLL_INTERVAL);
    };

    startTransition(async () => {
      await reconcile();
      if (isMounted) timer = setTimeout(() => void poll(), POLL_INTERVAL);
    });

    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
    };
  }, [updateState]);

  const contextValue = useMemo(
    () => ({
      ...state,
      isPending,
      signTransaction: signers.current.signTransaction,
      signAuthEntry: signers.current.signAuthEntry,
      disconnect,
    }),
    [state, isPending, disconnect],
  );

  return <WalletContext value={contextValue}>{children}</WalletContext>;
};
