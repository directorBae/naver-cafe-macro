import { create } from "zustand";
import type { StateCreator } from "zustand";
import { saveCafeInfos, loadCafeInfos } from "../utils/dataStorage";

interface Account {
  id: string;
  pw: string;
}

interface AccountSession {
  cookies: Record<string, string>;
  timestamp: string;
  status: "preparing" | "ready" | "logged-in" | "completed" | "failed";
}

interface CafeInfo {
  cafeId: string;
  boardId: string;
  cafeName?: string;
  boardName?: string;
}

interface SessionState {
  // 현재 페이지
  currentPage: "login" | "cafes" | "write" | "tasks" | "settings";

  // 계정 정보
  accounts: Record<string, Account>;

  // 카페 정보 (슬롯별)
  cafeInfos: Record<string, CafeInfo>;

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
  setCurrentPage: (
    page: "login" | "cafes" | "write" | "tasks" | "settings"
  ) => void;
  setAccounts: (accounts: Record<string, Account>) => void;
  updateAccount: (accountName: string, account: Account) => void;
  setCafeInfo: (slotName: string, cafeInfo: CafeInfo) => void;
  removeCafeInfo: (slotName: string) => void;
  startLogin: (validAccounts: Record<string, Account>) => void;
  updateAccountSession: (
    accountName: string,
    session: Partial<AccountSession>
  ) => void;
  getAccountSessions: () => Array<{ accountName: string } & AccountSession>;
  completeAccountLogin: (
    accountName: string,
    cookies: Record<string, string>
  ) => void;
  resetLoginState: () => void;
  setCurrentAccount: (accountName: string | null) => void;
}

const sessionStore: StateCreator<SessionState> = (set, get) => {
  // 초기 상태에서 카페 정보 로드
  const initialCafeInfos = (() => {
    try {
      return loadCafeInfos();
    } catch (error) {
      console.error("Error loading initial cafe infos:", error);
      return {};
    }
  })();

  return {
    // 초기 상태
    currentPage: "login",
    accounts: {},
    cafeInfos: initialCafeInfos,
    loginStarted: false,
    validAccounts: {},
    accountSessions: {},
    completedAccounts: [],
    currentAccount: null,
    currentCookies: {},
    currentAccountName: null,

    // Actions
    setCurrentPage: (
      page: "login" | "cafes" | "write" | "tasks" | "settings"
    ) => set({ currentPage: page }),
    setAccounts: (accounts: Record<string, Account>) => set({ accounts }),

    updateAccount: (accountName: string, account: Account) =>
      set((state: SessionState) => ({
        accounts: {
          ...state.accounts,
          [accountName]: account,
        },
      })),

    setCafeInfo: (slotName: string, cafeInfo: CafeInfo) =>
      set((state: SessionState) => {
        const newCafeInfos = {
          ...state.cafeInfos,
          [slotName]: cafeInfo,
        };
        // 파일에 저장
        saveCafeInfos(newCafeInfos);
        return { cafeInfos: newCafeInfos };
      }),

    removeCafeInfo: (slotName: string) =>
      set((state: SessionState) => {
        const newCafeInfos = { ...state.cafeInfos };
        delete newCafeInfos[slotName];
        // 파일에 저장
        saveCafeInfos(newCafeInfos);
        return { cafeInfos: newCafeInfos };
      }),

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

    getAccountSessions: () => {
      const { accountSessions } = get();
      return Object.entries(accountSessions).map(([accountName, session]) => ({
        accountName,
        ...session,
      }));
    },

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
  };
};

export const useSessionStore = create<SessionState>(sessionStore);
