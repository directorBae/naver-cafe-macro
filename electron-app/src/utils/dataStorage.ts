import fs from "fs";
import path from "path";

// 데이터 저장 경로
const DATA_DIR = path.join(process.cwd(), "data");
const SLOTS_FILE = path.join(DATA_DIR, "slots.json");
const POSTS_DIR = path.join(DATA_DIR, "posts");

// 데이터 디렉토리 생성
export const ensureDataDirectories = () => {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(POSTS_DIR)) {
    fs.mkdirSync(POSTS_DIR, { recursive: true });
  }
};

// 슬롯 데이터 저장
export const saveSlots = (slots: any[]) => {
  ensureDataDirectories();
  const data = {
    lastUpdated: new Date().toISOString(),
    slots: slots,
  };
  fs.writeFileSync(SLOTS_FILE, JSON.stringify(data, null, 2), "utf8");
};

// 슬롯 데이터 불러오기
export const loadSlots = () => {
  ensureDataDirectories();

  if (!fs.existsSync(SLOTS_FILE)) {
    return null;
  }

  try {
    const data = JSON.parse(fs.readFileSync(SLOTS_FILE, "utf8"));
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
  ensureDataDirectories();
  const accountDir = path.join(POSTS_DIR, userId);

  if (!fs.existsSync(accountDir)) {
    fs.mkdirSync(accountDir, { recursive: true });
  }

  const postsFile = path.join(accountDir, "posts.json");
  const data = {
    lastUpdated: new Date().toISOString(),
    posts: posts,
  };

  fs.writeFileSync(postsFile, JSON.stringify(data, null, 2), "utf8");
};

// 계정별 글 불러오기
export const loadAccountPosts = (userId: string) => {
  ensureDataDirectories();
  const postsFile = path.join(POSTS_DIR, userId, "posts.json");

  if (!fs.existsSync(postsFile)) {
    return [];
  }

  try {
    const data = JSON.parse(fs.readFileSync(postsFile, "utf8"));
    return data.posts || [];
  } catch (error) {
    console.error(`Error loading posts for ${userId}:`, error);
    return [];
  }
};

// 계정별 글 개별 저장 (txt 파일)
export const savePostAsFile = (
  userId: string,
  postId: string,
  content: string
) => {
  ensureDataDirectories();
  const accountDir = path.join(POSTS_DIR, userId);

  if (!fs.existsSync(accountDir)) {
    fs.mkdirSync(accountDir, { recursive: true });
  }

  const postFile = path.join(accountDir, `${postId}.txt`);
  fs.writeFileSync(postFile, content, "utf8");
};

// 모든 계정 목록 가져오기
export const getAllAccounts = () => {
  ensureDataDirectories();

  if (!fs.existsSync(POSTS_DIR)) {
    return [];
  }

  return fs
    .readdirSync(POSTS_DIR, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);
};
