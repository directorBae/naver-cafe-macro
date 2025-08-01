const path = require("path");
const { app, BrowserWindow, ipcMain, session } = require("electron");
const fs = require("fs");
const dotenv = require("dotenv");
const OpenAI = require("openai");

// 환경변수 로드
dotenv.config();

// OpenAI 클라이언트
let openAIClient = null;

require("electron-reload")(__dirname, {
  electron: path.join(__dirname, "..", "node_modules", ".bin", "electron"),
  forceHardReset: true,
  hardResetMethod: "exit",
});

let mainWindow;
let currentSlots = [];

// 데이터 저장 경로
const DATA_DIR = path.join(__dirname, "..", "data");
const SLOTS_FILE = path.join(DATA_DIR, "slots.json");
const POSTS_DIR = path.join(DATA_DIR, "posts");

// 데이터 디렉토리 생성
const ensureDataDirectories = () => {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(POSTS_DIR)) {
    fs.mkdirSync(POSTS_DIR, { recursive: true });
  }
};

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
    },
  });

  mainWindow.loadURL("http://localhost:3000");
}

// ✅ IPC 핸들러: React가 요청하면 새 창을 띄움
ipcMain.handle("open-naver-login", () => {
  // 🔄 각 로그인 창마다 독립적인 세션 생성
  const sessionId = `login-session-${Date.now()}-${Math.random()}`;
  const loginSession = session.fromPartition(`persist:${sessionId}`);

  const loginWin = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      session: loginSession, // 🔍 독립적인 세션 할당
    },
  });

  // 🔍 로그인 요청 데이터를 저장할 변수
  let capturedUserId = null;

  console.log(`🆕 새로운 독립 세션 생성: ${sessionId}`);

  // ✅ 쿠키 및 세션 데이터 캡처
  loginWin.webContents.on("did-finish-load", async () => {
    const url = loginWin.webContents.getURL();
    console.log("🌐 페이지 로드 완료:", url);

    // 페이지 타이틀도 확인하여 더 정확한 로그인 완료 감지
    const title = loginWin.webContents.getTitle();
    console.log("📄 페이지 타이틀:", title);

    // 네이버 로그인 완료 감지: nid.naver.com/user2로 리다이렉트될 때
    const isLoginComplete = url.includes("nid.naver.com/user2");

    console.log("🔍 로그인 완료 체크 (user2 페이지):", isLoginComplete);

    if (isLoginComplete) {
      console.log("✅ 로그인 완료 감지! 세션 데이터 캡처 시작...");

      // 로그인 완료 후 잠시 대기 (세션 완전히 설정될 때까지)
      await new Promise((resolve) => setTimeout(resolve, 2000));

      try {
        // 쿠키 가져오기
        const cookies = await loginWin.webContents.session.cookies.get({});
        const cookieData = {};
        cookies.forEach((cookie) => {
          cookieData[cookie.name] = cookie.value;
        });

        // 로컬 스토리지 데이터 가져오기
        const localStorage = await loginWin.webContents.executeJavaScript(`
          JSON.stringify(localStorage);
        `);

        // 세션 스토리지 데이터 가져오기
        const sessionStorage = await loginWin.webContents.executeJavaScript(`
          JSON.stringify(sessionStorage);
        `);

        // React로 세션 데이터 전송
        mainWindow.webContents.send("session-data-captured", {
          cookies: cookieData,
          localStorage: JSON.parse(localStorage),
          sessionStorage: JSON.parse(sessionStorage),
          url: url,
          timestamp: new Date().toISOString(),
          userId: capturedUserId, // 🔍 캡처된 실제 사용자 ID 추가
        });

        // 🔄 슬롯 정보 업데이트 (임시로 슬롯 1에 저장, 실제로는 React에서 전달받아야 함)
        if (capturedUserId) {
          const existingSlotIndex = currentSlots.findIndex(
            (slot) => slot.userId === capturedUserId
          );
          const slotData = {
            id:
              existingSlotIndex >= 0
                ? currentSlots[existingSlotIndex].id
                : currentSlots.length + 1,
            userId: capturedUserId,
            isLoggedIn: true,
            timestamp: new Date().toISOString(),
            sessionData: {
              cookies: cookieData,
              localStorage: JSON.parse(localStorage),
              sessionStorage: JSON.parse(sessionStorage),
              url: url,
            },
          };

          if (existingSlotIndex >= 0) {
            currentSlots[existingSlotIndex] = slotData;
          } else {
            currentSlots.push(slotData);
          }

          saveSlots();
          console.log(`💾 슬롯 정보 저장됨: ${capturedUserId}`);
        }

        console.log("📦 Session Data Captured:", {
          cookiesCount: Object.keys(cookieData).length,
          localStorageKeys: Object.keys(JSON.parse(localStorage)),
          sessionStorageKeys: Object.keys(JSON.parse(sessionStorage)),
          url: url,
        });

        // 🔍 세션 검증을 위한 상세 로그
        console.log("🍪 중요 쿠키 확인:");
        ["NID_AUT", "NID_SES", "NID_JKL"].forEach((cookieName) => {
          const cookieValue = cookieData[cookieName];
          if (cookieValue) {
            console.log(
              `  ✅ ${cookieName}: ${cookieValue.substring(0, 20)}...`
            );
          } else {
            console.log(`  ❌ ${cookieName}: 없음`);
          }
        });

        console.log("🗂️ 모든 쿠키 목록:", Object.keys(cookieData));

        // 🚨 세션 데이터 캡처 완료 후 로그인 창 닫기
        console.log("🔄 로그인 완료! 창을 닫습니다...");
        loginWin.close();
      } catch (error) {
        console.error("Error capturing session data:", error);
        mainWindow.webContents.send("session-capture-error", error.message);
        // 오류 발생 시에도 창 닫기
        loginWin.close();
      }
    }
  });

  // ✅ API 요청 가로채기 (독립적인 세션 사용)
  const filter = {
    urls: ["https://*.naver.com/*"],
  };

  loginSession.webRequest.onBeforeRequest(filter, (details, callback) => {
    try {
      if (details.method === "POST" && details.uploadData) {
        // POST 데이터 처리 - 로그인 요청 감지
        console.log("📤 POST 요청 감지:", details.url);

        // 로그인 요청인지 확인
        if (
          details.url.includes("nid.naver.com") &&
          (details.url.includes("login") ||
            details.url.includes("authenticate"))
        ) {
          // POST 데이터에서 사용자 ID 추출
          details.uploadData.forEach((data) => {
            if (data.bytes) {
              const postData = Buffer.from(data.bytes).toString("utf8");
              console.log("📝 로그인 POST 데이터:", postData);

              // 사용자 ID 추출 (일반적인 패턴들)
              const userIdMatch = postData.match(
                /(?:id|user_id|userId|username)=([^&]+)/
              );
              if (userIdMatch) {
                capturedUserId = decodeURIComponent(userIdMatch[1]);
                console.log("👤 캡처된 사용자 ID:", capturedUserId);
              }
            }
          });
        }
      }
    } catch (error) {
      console.error("Error processing request data:", error);
    }

    callback({ cancel: false });
  });

  // 🔄 창이 닫혔을 때 React에 알림
  loginWin.on("closed", () => {
    console.log("🚪 로그인 창이 닫혔습니다.");
    mainWindow.webContents.send("login-window-closed");
  });

  loginWin.loadURL("https://nid.naver.com");

  return { success: true, message: "Login window opened" };
});

// 🔑 환경변수 가져오기
ipcMain.handle("get-env-variable", (event, key) => {
  return process.env[key] || null;
});

// 🤖 OpenAI API 키 설정
ipcMain.handle("set-openai-key", (event, apiKey) => {
  try {
    openAIClient = new OpenAI({
      apiKey: apiKey,
    });
    console.log("✅ OpenAI 클라이언트 설정 완료");
    return { success: true };
  } catch (error) {
    console.error("❌ OpenAI 클라이언트 설정 실패:", error);
    return { success: false, error: error.message };
  }
});

// 🤖 글 생성
ipcMain.handle("generate-posts", async (event, prompt, count = 1) => {
  if (!openAIClient) {
    throw new Error("OpenAI API 키가 설정되지 않았습니다.");
  }

  try {
    console.log("🤖 OpenAI API 호출 시작:", { prompt, count });

    const systemPrompt = `
    당신은 네이버 카페 글 작성 전문가입니다. 
    사용자의 요청에 따라 카페에 올릴 수 있는 자연스럽고 유용한 글 내용을 생성해주세요.

    규칙:
    1. 각 글은 50자 이내로 작성
    2. 자연스럽고 읽기 쉬운 내용
    3. 카페 분위기에 맞는 톤앤매너
    4. 스팸성이나 광고성 내용 금지
    5. 유용하고 가치 있는 정보 포함
    6. 각 글은 서로 다른 내용이어야 함

    응답 형식: 각 글을 새 줄로 구분하여 제공
`;

    const userPrompt = `다음 주제로 ${count}개의 카페 글 내용을 생성해주세요: ${prompt}`;

    const completion = await openAIClient.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error("OpenAI에서 응답을 받지 못했습니다.");
    }

    // 응답을 줄 단위로 분리하고 빈 줄 제거
    const posts = response
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.match(/^\d+\./)) // 번호 제거
      .slice(0, count); // 요청한 개수만큼

    console.log("✅ 글 생성 완료:", posts);
    return posts;
  } catch (error) {
    console.error("❌ OpenAI API 오류:", error);
    throw new Error(`글 생성 중 오류가 발생했습니다: ${error.message}`);
  }
});

// 📊 로그인된 슬롯 정보 가져오기
ipcMain.handle("get-logged-in-slots", () => {
  return currentSlots.filter((slot) => slot.isLoggedIn);
});

// 🔄 슬롯 업데이트 (React에서 호출)
ipcMain.handle("update-slot", (event, slotData) => {
  try {
    const existingSlotIndex = currentSlots.findIndex(
      (slot) => slot.id === slotData.id
    );

    if (existingSlotIndex >= 0) {
      // 기존 슬롯 업데이트
      currentSlots[existingSlotIndex] = {
        ...currentSlots[existingSlotIndex],
        ...slotData,
        timestamp: new Date().toISOString(),
      };
    } else {
      // 새 슬롯 추가
      currentSlots.push({
        ...slotData,
        timestamp: new Date().toISOString(),
      });
    }

    saveSlots();
    console.log(`💾 슬롯 ${slotData.id} 업데이트됨:`, slotData.userId);
    return { success: true };
  } catch (error) {
    console.error("Error updating slot:", error);
    return { success: false, error: error.message };
  }
});

// 💾 계정별 글 저장
ipcMain.handle("save-account-posts", (event, userId, posts) => {
  try {
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
    return { success: true };
  } catch (error) {
    console.error("Error saving posts:", error);
    return { success: false, error: error.message };
  }
});

// 📖 계정별 글 불러오기
ipcMain.handle("load-account-posts", (event, userId) => {
  try {
    ensureDataDirectories();
    const postsFile = path.join(POSTS_DIR, userId, "posts.json");

    if (!fs.existsSync(postsFile)) {
      return [];
    }

    const data = JSON.parse(fs.readFileSync(postsFile, "utf8"));
    return data.posts || [];
  } catch (error) {
    console.error("Error loading posts:", error);
    return [];
  }
});

// 💾 슬롯 데이터 저장
const saveSlots = () => {
  try {
    ensureDataDirectories();
    const data = {
      lastUpdated: new Date().toISOString(),
      slots: currentSlots,
    };
    fs.writeFileSync(SLOTS_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (error) {
    console.error("Error saving slots:", error);
  }
};

// 📖 슬롯 데이터 불러오기
const loadSlots = () => {
  try {
    ensureDataDirectories();

    if (!fs.existsSync(SLOTS_FILE)) {
      currentSlots = [];
      return;
    }

    const data = JSON.parse(fs.readFileSync(SLOTS_FILE, "utf8"));
    const now = new Date();

    // 12시간(43200000ms) 이후 체크
    const validSlots = data.slots.filter((slot) => {
      if (!slot.isLoggedIn || !slot.timestamp) return false;

      const loginTime = new Date(slot.timestamp);
      const timeDiff = now.getTime() - loginTime.getTime();
      const twelveHours = 12 * 60 * 60 * 1000;

      return timeDiff < twelveHours;
    });

    currentSlots = validSlots;
    console.log(`📋 유효한 슬롯 ${validSlots.length}개 로드됨`);
  } catch (error) {
    console.error("Error loading slots:", error);
    currentSlots = [];
  }
};

app.whenReady().then(() => {
  createWindow();
  loadSlots(); // 앱 시작 시 슬롯 데이터 불러오기
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    saveSlots(); // 앱 종료 시 슬롯 데이터 저장
    app.quit();
  }
});
