// 브라우저와 Electron 환경에서 모두 작동하는 데이터 저장 유틸리티

// localStorage 키 상수
const SLOTS_KEY = "naver-cafe-macro-slots";
const CAFES_KEY = "naver-cafe-macro-cafes";
const POSTS_KEY_PREFIX = "naver-cafe-macro-posts-";
const TASKS_KEY = "naver-cafe-macro-tasks";

// Task 인터페이스 정의
export interface Task {
  id: string;
  title: string;
  prompt: string;
  accountId: string;
  cafeId: string;
  templateId: string;
  status: "pending" | "running" | "completed" | "failed";
  scheduledTime?: string; // 시작 시간
  delayBetweenTasks?: number; // 작업 간 딜레이 (분)
  articleCount?: number; // 생성할 글감 수
  menuId?: string; // 게시판 ID
  createdAt: string;
  updatedAt: string;
  generatedContent?: string;
}

// 데이터 디렉토리 생성 (localStorage용 더미 함수)
export const ensureDataDirectories = () => {
  // localStorage는 별도 디렉토리 생성이 필요 없음
  return true;
};

// 슬롯 데이터 저장
export const saveSlots = (slots: any[]) => {
  try {
    const data = {
      lastUpdated: new Date().toISOString(),
      slots: slots,
    };
    localStorage.setItem(SLOTS_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Error saving slots:", error);
  }
};

// 슬롯 데이터 불러오기
export const loadSlots = () => {
  try {
    const dataString = localStorage.getItem(SLOTS_KEY);
    if (!dataString) {
      return null;
    }

    const data = JSON.parse(dataString);
    const now = new Date();

    // 12시간(43200000ms) 이후 체크
    const validSlots = data.slots.filter((slot: any) => {
      if (!slot.isLoggedIn || !slot.timestamp) return false;

      const loginTime = new Date(slot.timestamp);
      const timeDiff = now.getTime() - loginTime.getTime();
      const twelveHours = 12 * 60 * 60 * 1000;

      return timeDiff < twelveHours;
    });

    return validSlots;
  } catch (error) {
    console.error("Error loading slots:", error);
    return null;
  }
};

// 계정별 글 저장
export const saveAccountPosts = (userId: string, posts: any[]) => {
  try {
    const data = {
      lastUpdated: new Date().toISOString(),
      posts: posts,
    };
    localStorage.setItem(`${POSTS_KEY_PREFIX}${userId}`, JSON.stringify(data));
  } catch (error) {
    console.error(`Error saving posts for ${userId}:`, error);
  }
};

// 계정별 글 불러오기
export const loadAccountPosts = (userId: string) => {
  try {
    const dataString = localStorage.getItem(`${POSTS_KEY_PREFIX}${userId}`);
    if (!dataString) {
      return [];
    }

    const data = JSON.parse(dataString);
    return data.posts || [];
  } catch (error) {
    console.error(`Error loading posts for ${userId}:`, error);
    return [];
  }
};

// 계정별 글 개별 저장 (localStorage에는 단일 항목으로 저장)
export const savePostAsFile = (
  userId: string,
  postId: string,
  content: string
) => {
  try {
    const key = `${POSTS_KEY_PREFIX}${userId}-${postId}`;
    localStorage.setItem(key, content);
  } catch (error) {
    console.error(`Error saving post file for ${userId}:`, error);
  }
};

// 모든 계정 목록 가져오기
export const getAllAccounts = () => {
  try {
    const accounts: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(POSTS_KEY_PREFIX)) {
        const userId = key.replace(POSTS_KEY_PREFIX, "").split("-")[0];
        if (userId && !accounts.includes(userId)) {
          accounts.push(userId);
        }
      }
    }
    return accounts;
  } catch (error) {
    console.error("Error getting all accounts:", error);
    return [];
  }
};

// 카페 정보 저장
export const saveCafeInfos = (cafeInfos: Record<string, any>) => {
  try {
    const data = {
      lastUpdated: new Date().toISOString(),
      cafeInfos: cafeInfos,
    };
    localStorage.setItem(CAFES_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Error saving cafe infos:", error);
  }
};

// 카페 정보 불러오기
export const loadCafeInfos = () => {
  try {
    const dataString = localStorage.getItem(CAFES_KEY);
    if (!dataString) {
      return {};
    }

    const data = JSON.parse(dataString);
    return data.cafeInfos || {};
  } catch (error) {
    console.error("Error loading cafe infos:", error);
    return {};
  }
};

// 템플릿 저장
export const saveTemplates = (userId: string, templates: any[]) => {
  try {
    const key = `naver-cafe-macro-templates-${userId}`;
    const data = {
      lastUpdated: new Date().toISOString(),
      templates: templates,
    };
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error("Error saving templates:", error);
  }
};

// 템플릿 불러오기
export const loadTemplates = (userId: string) => {
  try {
    const key = `naver-cafe-macro-templates-${userId}`;
    const dataString = localStorage.getItem(key);
    if (!dataString) {
      return [];
    }

    const data = JSON.parse(dataString);
    return data.templates || [];
  } catch (error) {
    console.error("Error loading templates:", error);
    return [];
  }
};

// 개별 템플릿 추가
export const addTemplate = (userId: string, template: any) => {
  try {
    const existingTemplates = loadTemplates(userId);
    const updatedTemplates = [...existingTemplates, template];
    saveTemplates(userId, updatedTemplates);
  } catch (error) {
    console.error("Error adding template:", error);
  }
};

// Tasks 관리 함수들
export const saveTasks = (tasks: Task[]) => {
  try {
    const data = {
      lastUpdated: new Date().toISOString(),
      tasks: tasks,
    };
    localStorage.setItem(TASKS_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Error saving tasks:", error);
  }
};

export const loadTasks = (): Task[] => {
  try {
    const dataString = localStorage.getItem(TASKS_KEY);
    if (!dataString) {
      return [];
    }

    const data = JSON.parse(dataString);
    return data.tasks || [];
  } catch (error) {
    console.error("Error loading tasks:", error);
    return [];
  }
};

export const addTask = (task: Task) => {
  try {
    const existingTasks = loadTasks();
    const updatedTasks = [...existingTasks, task];
    saveTasks(updatedTasks);
  } catch (error) {
    console.error("Error adding task:", error);
  }
};

export const updateTask = (taskId: string, updates: Partial<Task>) => {
  try {
    const tasks = loadTasks();
    const updatedTasks = tasks.map((task) =>
      task.id === taskId
        ? { ...task, ...updates, updatedAt: new Date().toISOString() }
        : task
    );
    saveTasks(updatedTasks);
  } catch (error) {
    console.error("Error updating task:", error);
  }
};

export const deleteTask = (taskId: string) => {
  try {
    const tasks = loadTasks();
    const updatedTasks = tasks.filter((task) => task.id !== taskId);
    saveTasks(updatedTasks);
  } catch (error) {
    console.error("Error deleting task:", error);
  }
};
