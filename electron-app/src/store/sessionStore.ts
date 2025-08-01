import { create } from "zustand";
import type { StateCreator } from "zustand";

interface Account {
  id: string;
  pw: string;
}

interface AccountSession {
  cookies: Record<string, string>;
  timestamp: string;
  status: "preparing" | "ready" | "logged-in" | "completed" | "failed";
}

interface SessionState {
  // 현재 페이지
  currentPage: "login" | "write" | "settings";

  // 계정 정보
  accounts: Record<string, Account>;

  // 로그인 상태
  loginStarted: boolean;
  validAccounts: Record<string, Account>;

  // 계정별 세션 정보
  accountSessions: Record<string, AccountSession>;
  completedAccounts: string[];
  currentAccount: string | null;

  // 현재 활성 세션
  currentCookies: Record<string, string>;
  currentAccountName: string | null;

  // Actions
  setCurrentPage: (page: "login" | "write" | "settings") => void;
  setAccounts: (accounts: Record<string, Account>) => void;
  updateAccount: (accountName: string, account: Account) => void;
  startLogin: (validAccounts: Record<string, Account>) => void;
  updateAccountSession: (
    accountName: string,
    session: Partial<AccountSession>
  ) => void;
  completeAccountLogin: (
    accountName: string,
    cookies: Record<string, string>
  ) => void;
  resetLoginState: () => void;
  setCurrentAccount: (accountName: string | null) => void;
}

const sessionStore: StateCreator<SessionState> = (set, get) => ({
  // 초기 상태
  currentPage: "login",
  accounts: {},
  loginStarted: false,
  validAccounts: {},
  accountSessions: {},
  completedAccounts: [],
  currentAccount: null,
  currentCookies: {},
  currentAccountName: null,

  // Actions
  setCurrentPage: (page: "login" | "write" | "settings") =>
    set({ currentPage: page }),
  setAccounts: (accounts: Record<string, Account>) => set({ accounts }),

  updateAccount: (accountName: string, account: Account) =>
    set((state: SessionState) => ({
      accounts: {
        ...state.accounts,
        [accountName]: account,
      },
    })),

  startLogin: (validAccounts: Record<string, Account>) =>
    set({
      loginStarted: true,
      validAccounts,
      accountSessions: Object.keys(validAccounts).reduce(
        (acc, accountName) => ({
          ...acc,
          [accountName]: {
            cookies: {},
            timestamp: "",
            status: "preparing" as const,
          },
        }),
        {} as Record<string, AccountSession>
      ),
      completedAccounts: [],
    }),

  updateAccountSession: (
    accountName: string,
    sessionUpdate: Partial<AccountSession>
  ) =>
    set((state: SessionState) => ({
      accountSessions: {
        ...state.accountSessions,
        [accountName]: {
          ...state.accountSessions[accountName],
          ...sessionUpdate,
        },
      },
    })),

  completeAccountLogin: (
    accountName: string,
    cookies: Record<string, string>
  ) => {
    const timestamp = new Date().toISOString();

    set((state: SessionState) => ({
      accountSessions: {
        ...state.accountSessions,
        [accountName]: {
          ...state.accountSessions[accountName],
          cookies,
          timestamp,
          status: "completed",
        },
      },
      completedAccounts: [...state.completedAccounts, accountName],
      currentCookies: cookies,
      currentAccountName: accountName,
    }));

    // 모든 계정이 완료되었는지 확인
    const { validAccounts, completedAccounts } = get();
    if (Object.keys(validAccounts).length === completedAccounts.length + 1) {
      set({ loginStarted: false });
    }
  },

  resetLoginState: () =>
    set({
      loginStarted: false,
      validAccounts: {},
      accountSessions: {},
      completedAccounts: [],
      currentAccount: null,
    }),

  setCurrentAccount: (accountName: string | null) =>
    set({ currentAccount: accountName }),
});

export const useSessionStore = create<SessionState>(sessionStore);
