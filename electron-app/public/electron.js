const path = require("path");
const { app, BrowserWindow, ipcMain, session } = require("electron");
const fs = require("fs");
const dotenv = require("dotenv");
const OpenAI = require("openai");

// 환경변수 로드
dotenv.config();

// OpenAI 클라이언트
let openAIClient = null;
let currentApiKey = null; // 현재 설정된 API 키 추적

// 설정 캐시
let settingsCache = null;
let settingsCacheTime = 0;
const SETTINGS_CACHE_DURATION = 5000; // 5초간 캐시

// 개발 환경에서만 electron-reload 사용
const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;

if (isDev) {
  require("electron-reload")(__dirname, {
    electron: path.join(__dirname, "..", "node_modules", ".bin", "electron"),
    forceHardReset: true,
    hardResetMethod: "exit",
  });
}

let mainWindow;
let currentSlots = [];
let openedEditorWindows = []; // 열린 에디터 윈도우들을 추적
let activeEditorUser = null; // 현재 활성 에디터 사용자 ID 추적

// 데이터 저장 경로 (프로덕션 환경 고려)
const DATA_DIR = isDev
  ? path.join(__dirname, "..", "data")
  : path.join(process.resourcesPath, "data");

// ... 나머지 코드는 동일
const SLOTS_FILE = path.join(DATA_DIR, "slots.json");
const POSTS_DIR = path.join(DATA_DIR, "posts");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");

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

  // 프로덕션에서는 빌드된 파일 로드
  if (isDev) {
    mainWindow.loadURL("http://localhost:3000");
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "build", "index.html"));
  }
}

// ✅ IPC 핸들러: React가 요청하면 새 창을 띄움
ipcMain.handle("open-naver-login", (event, targetSlotId) => {
  console.log("🎯 로그인 창 열기 - 목표 슬롯:", targetSlotId);

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
  let capturedFromPostRequest = false; // POST 요청에서 캡처했는지 추적

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

        // 🔍 받은 데이터 상세 로깅
        console.log("=".repeat(80));
        console.log("📥 세션 캡처 완료 - 상세 데이터 분석");
        console.log("=".repeat(80));

        // 쿠키 데이터 JSON 형태로 출력
        console.log("🍪 전체 쿠키 데이터 (JSON):");
        console.log(JSON.stringify(cookieData, null, 2));

        // localStorage 데이터 JSON 형태로 출력
        console.log("💾 localStorage 데이터 (JSON):");
        console.log(JSON.stringify(JSON.parse(localStorage), null, 2));

        // sessionStorage 데이터 JSON 형태로 출력
        console.log("📂 sessionStorage 데이터 (JSON):");
        console.log(JSON.stringify(JSON.parse(sessionStorage), null, 2));

        // URL 정보
        console.log("🌐 현재 URL:", url);

        console.log("=".repeat(80));

        // 🔍 사용자 ID 추출 시작 (POST 요청에서 이미 캡처된 경우 우선 사용)
        // let capturedUserId = null; - 이미 선언되어 있음

        console.log("🔍 현재 캡처된 사용자 ID 상태:");
        console.log("  - capturedUserId:", capturedUserId);
        console.log("  - capturedFromPostRequest:", capturedFromPostRequest);

        // 🔍 POST 요청에서만 사용자 ID 검색하고, 찾지 못하면 바로 직접 입력 요청
        if (!capturedUserId || !capturedFromPostRequest) {
          console.log(
            "� POST 요청에서 사용자 ID를 캡처하지 못함. 페이지나 쿠키 추출 없이 바로 직접 입력 요청..."
          );
          capturedUserId = "아이디를 입력하세요";
        }

        // 최종적으로 사용자 ID를 찾지 못한 경우 직접 입력 요청
        if (!capturedUserId) {
          capturedUserId = "아이디를 입력하세요";
          console.log(
            "⚠️ 사용자 ID를 찾을 수 없어서 직접 입력 요청:",
            capturedUserId
          );
        }

        // 최종 사용자 ID 확인
        console.log("🎯 최종 사용자 ID 결정:");
        console.log("  - 사용자 ID:", capturedUserId);
        console.log("  - POST 요청에서 캡처됨:", capturedFromPostRequest);
        console.log(
          "  - 사용자 ID 소스:",
          capturedFromPostRequest ? "POST 요청" : "기타 방법"
        );

        // React로 세션 데이터 전송 (슬롯 ID 포함)
        mainWindow.webContents.send("session-data-captured", {
          cookies: cookieData,
          localStorage: JSON.parse(localStorage),
          sessionStorage: JSON.parse(sessionStorage),
          url: url,
          timestamp: new Date().toISOString(),
          userId: capturedUserId, // 🔍 캡처된 실제 사용자 ID 추가
          targetSlotId: targetSlotId, // 🎯 목표 슬롯 ID 추가
        });

        // 🔄 지정된 슬롯에 정보 저장
        if (capturedUserId && targetSlotId) {
          console.log(
            `🎯 슬롯 ${targetSlotId}에 사용자 ${capturedUserId} 정보 저장 중...`
          );

          // currentSlots 배열을 1-5 슬롯으로 초기화 (없으면 생성)
          while (currentSlots.length < 5) {
            currentSlots.push({
              id: currentSlots.length + 1,
              userId: "",
              isLoggedIn: false,
              timestamp: "",
              sessionData: null,
            });
          }

          const slotIndex = targetSlotId - 1; // 배열 인덱스 (0-4)

          if (slotIndex >= 0 && slotIndex < 5) {
            // 지정된 슬롯에 정보 저장
            currentSlots[slotIndex] = {
              id: targetSlotId,
              userId: capturedUserId,
              isLoggedIn: true,
              timestamp: new Date().toISOString(),
              sessionData: {
                cookies: cookieData,
                localStorage: JSON.parse(localStorage),
                sessionStorage: JSON.parse(sessionStorage),
                url: url,
                timestamp: new Date().toISOString(),
              },
            };

            console.log(
              `✅ 슬롯 ${targetSlotId}에 ${capturedUserId} 정보 저장 완료`
            );
          } else {
            console.error(`❌ 유효하지 않은 슬롯 번호: ${targetSlotId}`);
          }

          saveSlots();
          console.log("💾 슬롯 정보 저장됨:", capturedUserId);
        } else {
          console.log("⚠️ 사용자 ID 또는 슬롯 ID가 없어서 슬롯 저장 건너뜀");
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
              "  ✅ " + cookieName + ": " + cookieValue.substring(0, 20) + "..."
            );
          } else {
            console.log("  ❌ " + cookieName + ": 없음");
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

  // ✅ API 요청 가로채기 (독립적인 세션 사용) - 모든 네이버 요청 감지
  const filter = {
    urls: ["https://*.naver.com/*", "https://nid.naver.com/*"],
  };

  loginSession.webRequest.onBeforeRequest(filter, (details, callback) => {
    try {
      if (details.method === "POST" && details.uploadData) {
        // POST 데이터 처리 - 로그인 요청 감지
        console.log("📤 POST 요청 감지:", details.url);

        // 로그인 요청인지 확인 (더 포괄적으로)
        if (
          details.url.includes("nid.naver.com") &&
          (details.url.includes("login") ||
            details.url.includes("authenticate") ||
            details.url.includes("loginForm") ||
            details.url.includes("route") ||
            details.method === "POST")
        ) {
          console.log(
            "🎯 네이버 로그인 관련 POST 요청 발견! 데이터 분석 중..."
          );
          // POST 데이터에서 사용자 ID 추출 (JSON 파싱 방식)
          details.uploadData.forEach((data) => {
            if (data.bytes) {
              const postData = Buffer.from(data.bytes).toString("utf8");
              console.log("📝 로그인 POST 데이터 전체:");
              console.log(postData);

              // 🔍 데이터 타입별로 파싱 시도
              let parsedData = null;
              let dataType = "unknown";

              // 1. JSON 형태인지 확인
              try {
                parsedData = JSON.parse(postData);
                dataType = "json";
                console.log("✅ JSON 데이터로 파싱 성공:");
                console.log(JSON.stringify(parsedData, null, 2));
              } catch (e) {
                console.log("❌ JSON 파싱 실패, URL-encoded 데이터로 시도...");

                // 2. URL-encoded 형태 파싱
                try {
                  const urlParams = new URLSearchParams(postData);
                  parsedData = {};
                  for (const [key, value] of urlParams) {
                    parsedData[key] = value;
                  }
                  dataType = "urlencoded";
                  console.log("✅ URL-encoded 데이터로 파싱 성공:");
                  console.log(JSON.stringify(parsedData, null, 2));
                } catch (e2) {
                  console.log("❌ URL-encoded 파싱도 실패, 원본 문자열 사용");
                  dataType = "raw";
                }
              }

              // 🔍 파싱된 데이터에서 사용자 ID 필드 찾기
              if (parsedData && typeof parsedData === "object") {
                console.log("🔍 파싱된 데이터에서 사용자 ID 필드 검색...");

                // 1차: 명확한 사용자 ID 필드명들
                const primaryUserIdFields = [
                  "id",
                  "user_id",
                  "userId",
                  "username",
                  "loginId",
                  "account",
                  "accountId",
                  "memberId",
                  "naverId",
                  "userAccount",
                  "loginName",
                ];

                for (const field of primaryUserIdFields) {
                  if (parsedData[field] && parsedData[field].trim()) {
                    let fieldValue = parsedData[field].trim();

                    // 이메일인 경우 @ 앞부분만 추출
                    if (field.includes("email") && fieldValue.includes("@")) {
                      fieldValue = fieldValue.split("@")[0];
                    }

                    // 유효한 사용자 ID인지 확인 (빈 값이 아니고 길이 체크)
                    if (fieldValue.length >= 3 && fieldValue.length <= 30) {
                      capturedUserId = fieldValue;
                      capturedFromPostRequest = true;
                      console.log(
                        `👤 1차 검색 - 필드 '${field}'에서 사용자 ID 추출:`,
                        capturedUserId
                      );
                      console.log(`📊 데이터 타입: ${dataType}`);
                      console.log("🎯 POST 요청에서 사용자 ID 캡처 완료!");
                      break;
                    }
                  }
                }

                // 2차: 암호화된 필드에서 디코딩 시도
                if (!capturedUserId) {
                  console.log(
                    "🔍 2차 검색 - 암호화된 필드에서 사용자 ID 추출 시도..."
                  );
                  const encryptedFields = [
                    "encnm",
                    "encrypted_id",
                    "enc_id",
                    "encoded_id",
                  ];

                  for (const field of encryptedFields) {
                    if (parsedData[field] && parsedData[field].trim()) {
                      const encValue = parsedData[field].trim();
                      console.log(`🔐 암호화된 필드 '${field}' 값:`, encValue);

                      // Base64 디코딩 시도
                      try {
                        const decoded = Buffer.from(
                          encValue,
                          "base64"
                        ).toString("utf8");
                        console.log(`🔓 Base64 디코딩 결과:`, decoded);

                        // 디코딩된 값에서 사용자 ID 패턴 찾기
                        if (
                          decoded.length >= 3 &&
                          decoded.length <= 30 &&
                          decoded.match(/^[a-zA-Z][a-zA-Z0-9_-]*$/)
                        ) {
                          capturedUserId = decoded;
                          capturedFromPostRequest = true;
                          console.log(
                            `👤 암호화 필드 '${field}'에서 사용자 ID 추출:`,
                            capturedUserId
                          );
                          break;
                        }
                      } catch (e) {
                        console.log(`❌ ${field} Base64 디코딩 실패`);
                      }

                      // URL 디코딩 시도
                      if (!capturedUserId) {
                        try {
                          const urlDecoded = decodeURIComponent(encValue);
                          console.log(`🔓 URL 디코딩 결과:`, urlDecoded);

                          if (
                            urlDecoded.length >= 3 &&
                            urlDecoded.length <= 30 &&
                            urlDecoded.match(/^[a-zA-Z][a-zA-Z0-9_-]*$/)
                          ) {
                            capturedUserId = urlDecoded;
                            capturedFromPostRequest = true;
                            console.log(
                              `👤 암호화 필드 '${field}' URL디코딩에서 사용자 ID 추출:`,
                              capturedUserId
                            );
                            break;
                          }
                        } catch (e) {
                          console.log(`❌ ${field} URL 디코딩 실패`);
                        }
                      }
                    }
                  }
                }

                // 3차: 모든 필드 값을 확인 (이전과 동일)
                if (!capturedUserId) {
                  console.log(
                    "🔍 3차 검색 - 모든 필드에서 사용자 ID 패턴 검색..."
                  );
                  for (const [key, value] of Object.entries(parsedData)) {
                    if (
                      typeof value === "string" &&
                      value.trim().length >= 3 &&
                      value.trim().length <= 30
                    ) {
                      const trimmedValue = value.trim();
                      // 사용자 ID 같은 값인지 휴리스틱 검사
                      if (
                        trimmedValue.match(/^[a-zA-Z][a-zA-Z0-9_-]*$/) &&
                        !trimmedValue.includes("http") &&
                        !trimmedValue.includes("www") &&
                        !["true", "false", "null", "ko_KR", "en_US"].includes(
                          trimmedValue.toLowerCase()
                        ) &&
                        !trimmedValue.includes("naver.com") &&
                        !key.toLowerCase().includes("locale") &&
                        !key.toLowerCase().includes("lang")
                      ) {
                        capturedUserId = trimmedValue;
                        capturedFromPostRequest = true;
                        console.log(
                          `👤 3차 검색 - 필드 '${key}'에서 사용자 ID 패턴 발견:`,
                          capturedUserId
                        );
                        console.log("🎯 POST 요청에서 사용자 ID 캡처 완료!");
                        break;
                      }
                    }
                  }
                }
              }

              // 결과 출력
              if (capturedUserId) {
                console.log("🎉 사용자 ID 캡처 성공:", capturedUserId);
              } else {
                console.log("⚠️ POST 데이터에서 사용자 ID를 찾을 수 없음");
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
    // 이미 같은 API 키로 설정되어 있으면 스킵
    if (openAIClient && currentApiKey === apiKey) {
      // 로그 제거: 중복 설정 시 조용히 성공 반환
      return { success: true, message: "이미 설정됨" };
    }

    openAIClient = new OpenAI({
      apiKey: apiKey,
    });
    currentApiKey = apiKey; // 현재 API 키 저장
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

    // 설정에서 글로벌 프롬프트 불러오기 (캐시 사용)
    const settings = getCachedSettings();
    const globalPrompt = settings.globalPrompt || "";

    // 글로벌 프롬프트가 없으면 기본값 사용
    const systemPrompt =
      globalPrompt ||
      `
    당신은 네이버 카페 글 작성 전문가입니다. 
    사용자의 요청에 따라 카페에 올릴 수 있는 자연스럽고 유용한 글 내용을 생성해주세요.

    규칙:
    1. 각 글은 200-500자 내외로 작성
    2. 자연스럽고 읽기 쉬운 내용
    3. 카페 분위기에 맞는 톤앤매너
    4. 광고성 내용이어도 OK
    5. 각 글은 최대한 중복을 피해야 함
    6. 제목만 적을 것이며, "제목: ", "내용: " 과 같은 형식 템플릿은 사용하지 않음
    7. 오로지 제목 텍스트만 제공할 것    

    응답 형식: 각 글을 새 줄로 구분하여 제공
`;

    console.log("📝 사용된 시스템 프롬프트 길이:", systemPrompt.length);

    const userPrompt = `다음 주제로 ${count}개의 카페 글 내용을 생성해주세요: ${prompt}`;

    const completion = await openAIClient.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 1000,
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

// ⚙️ 설정 저장
ipcMain.handle("save-settings", async (event, settings) => {
  try {
    ensureDataDirectories();
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf8");
    console.log("✅ 설정 저장 완료:", Object.keys(settings));

    // 설정 저장 시 캐시 무효화
    settingsCache = null;
    settingsCacheTime = 0;

    return { success: true };
  } catch (error) {
    console.error("❌ 설정 저장 실패:", error);
    return { success: false, error: error.message };
  }
});

// ⚙️ 설정 캐시된 불러오기 함수
const getCachedSettings = () => {
  const now = Date.now();

  // 캐시가 유효한 경우 캐시된 설정 반환
  if (settingsCache && now - settingsCacheTime < SETTINGS_CACHE_DURATION) {
    return settingsCache;
  }

  try {
    ensureDataDirectories();

    if (!fs.existsSync(SETTINGS_FILE)) {
      settingsCache = {};
    } else {
      settingsCache = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8"));
    }

    settingsCacheTime = now;
    return settingsCache;
  } catch (error) {
    console.warn("⚠️ 설정 불러오기 실패, 기본값 사용:", error);
    settingsCache = {};
    settingsCacheTime = now;
    return settingsCache;
  }
};

// ⚙️ 설정 불러오기
ipcMain.handle("load-settings", async () => {
  try {
    ensureDataDirectories();

    if (!fs.existsSync(SETTINGS_FILE)) {
      // 로그 제거: 설정 파일이 없으면 조용히 빈 객체 반환
      return {};
    }

    const settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8"));
    // 로그 제거: 설정 불러오기 완료 로그 제거
    return settings;
  } catch (error) {
    console.error("❌ 설정 불러오기 실패:", error);
    return {};
  }
});

// 🍪 브라우저 세션에 쿠키 주입
ipcMain.handle("inject-cookies", async (event, cookies) => {
  try {
    console.log("🍪 쿠키 주입 시작...", Object.keys(cookies));

    // 기본 세션에 쿠키 설정
    for (const [name, value] of Object.entries(cookies)) {
      await session.defaultSession.cookies.set({
        url: "https://cafe.naver.com",
        name,
        value,
        domain: ".naver.com",
        path: "/",
        secure: true,
        httpOnly: false,
        expirationDate: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, // 30일 유효
      });
      console.log(`✅ 쿠키 설정: ${name} = ${value.substring(0, 20)}...`);
    }

    console.log("🍪 모든 쿠키 주입 완료");

    // 쿠키 주입 후 임시등록 API 요청 가로채기 설정
    setupTemplateCaptureListener();

    return { success: true };
  } catch (error) {
    console.error("❌ 쿠키 주입 실패:", error);
    return { success: false, error: error.message };
  }
});

// 🪟 에디터 윈도우 등록 (React에서 window.open 후 호출)
ipcMain.handle("register-editor-window", (event, windowInfo) => {
  try {
    console.log("🪟 에디터 윈도우 등록:", windowInfo);

    // 윈도우 정보를 저장 (실제 윈도우 객체는 저장할 수 없으므로 정보만 저장)
    const windowData = {
      ...windowInfo,
      registeredAt: new Date().toISOString(),
      closed: false,
    };

    openedEditorWindows.push(windowData);

    // 현재 활성 에디터 사용자 설정 (가장 최근에 열린 에디터의 사용자)
    activeEditorUser = windowInfo.userId;
    console.log(`🎯 활성 에디터 사용자 설정: ${activeEditorUser}`);

    console.log(
      `✅ 에디터 윈도우 등록 완료. 총 ${openedEditorWindows.length}개 윈도우 추적 중`
    );

    return { success: true };
  } catch (error) {
    console.error("❌ 에디터 윈도우 등록 실패:", error);
    return { success: false, error: error.message };
  }
});

// 🔄 모든 에디터 윈도우 닫기 (템플릿 캡처 성공 시 호출)
ipcMain.handle("close-editor-windows", (event, userId) => {
  try {
    console.log("🔄 에디터 윈도우 닫기 요청:", userId);

    // 해당 사용자의 윈도우들을 닫힌 것으로 표시
    const closedCount = openedEditorWindows.filter(
      (win) => !win.closed && (!userId || win.userId === userId)
    ).length;

    openedEditorWindows.forEach((win) => {
      if (!win.closed && (!userId || win.userId === userId)) {
        win.closed = true;
        win.closedAt = new Date().toISOString();
      }
    });

    // React에 윈도우 닫기 신호 전송
    if (mainWindow) {
      mainWindow.webContents.send("close-editor-windows", {
        userId: userId,
        closedCount: closedCount,
        timestamp: new Date().toISOString(),
      });
      console.log(`📢 React로 윈도우 닫기 신호 전송: ${closedCount}개 윈도우`);
    }

    console.log(`✅ ${closedCount}개 에디터 윈도우를 닫기 처리했습니다.`);

    return { success: true, closedCount: closedCount };
  } catch (error) {
    console.error("❌ 에디터 윈도우 닫기 실패:", error);
    return { success: false, error: error.message };
  }
});

// 🔄 템플릿 캡처 강제 활성화 (새 창 열기 전에 호출)
ipcMain.handle("activate-template-capture", async (event) => {
  try {
    console.log("🎯 템플릿 캡처 강제 활성화...");

    // 모든 세션에 강제로 리스너 설정
    await setupTemplateCaptureListener();

    // 기존에 열린 모든 윈도우에도 적용
    const allWindows = BrowserWindow.getAllWindows();
    console.log(`🪟 현재 열린 윈도우 개수: ${allWindows.length}`);

    allWindows.forEach((win, index) => {
      if (win.webContents.session) {
        console.log(`🔗 윈도우 ${index + 1}의 세션에 리스너 설정 중...`);
        setupListenerForSession(win.webContents.session, `윈도우-${index + 1}`);
      }
    });

    return { success: true, message: "템플릿 캡처가 활성화되었습니다." };
  } catch (error) {
    console.error("❌ 템플릿 캡처 활성화 실패:", error);
    return { success: false, error: error.message };
  }
});

// 🎯 개별 세션에 리스너 설정하는 헬퍼 함수
function setupListenerForSession(sessionInstance, sessionName) {
  const filter = {
    urls: [
      "*://*/temporary-articles*",
      "*://*/temporary_articles*",
      "*://apis.naver.com/*temporary-articles*",
      "*://cafe.naver.com/*temporary-articles*",
      "*://m.cafe.naver.com/*temporary-articles*",
      "https://*/*temporary-articles*",
      "http://*/*temporary-articles*",
    ],
  };

  console.log(`📡 ${sessionName} 세션에 리스너 설정 중...`);
  console.log(`📋 감지할 URL 패턴:`, filter.urls);

  try {
    sessionInstance.webRequest.onBeforeRequest(filter, (details, callback) => {
      try {
        // temporary-articles가 URL에 포함되어 있는지 추가 확인
        const hasTemporaryArticles =
          details.url.includes("temporary-articles") ||
          details.url.includes("temporary_articles");

        if (hasTemporaryArticles && details.method === "POST") {
          console.log(`🚨 [${sessionName}] 임시등록 API 요청 감지됨!`);
          console.log("  - 메서드:", details.method);
          console.log("  - URL:", details.url);
          console.log("  - 업로드 데이터 존재:", !!details.uploadData);

          if (details.uploadData) {
            console.log("✅ POST 요청이며 업로드 데이터가 있습니다!");
            console.log("🎯 임시등록 API 요청 감지:", details.url);

            // POST 데이터 추출
            const postData = details.uploadData[0];
            if (postData && postData.bytes) {
              const requestBody = postData.bytes.toString("utf8");
              console.log("📝 임시등록 요청 데이터 길이:", requestBody.length);
              console.log(
                "📝 요청 데이터 미리보기:",
                requestBody.substring(0, 200) + "..."
              );

              // 사용자 ID 추출 (현재 로그인된 사용자)
              const currentUserId = getCurrentUserId();
              console.log("👤 현재 사용자 ID:", currentUserId);

              if (currentUserId) {
                console.log("💾 템플릿 데이터 저장 시작...");
                const result = saveTemplateData(
                  currentUserId,
                  requestBody,
                  details.url
                );

                if (result.success) {
                  console.log("🎉 템플릿 캡처 및 저장 성공!");
                } else {
                  console.log("❌ 템플릿 저장 실패:", result.error);
                }
              } else {
                console.log("⚠️ 현재 로그인된 사용자 ID를 찾을 수 없습니다.");
                console.log(
                  "📊 현재 슬롯 상태:",
                  currentSlots.map((slot) => ({
                    id: slot.id,
                    userId: slot.userId,
                    isLoggedIn: slot.isLoggedIn,
                  }))
                );
              }
            } else {
              console.log("⚠️ POST 데이터를 추출할 수 없습니다.");
            }
          } else {
            console.log("ℹ️ 업로드 데이터가 없습니다.");
          }
        } else if (hasTemporaryArticles) {
          console.log(
            `ℹ️ [${sessionName}] temporary-articles URL 감지되었지만 POST가 아님:`,
            details.method,
            details.url
          );
        }
      } catch (error) {
        console.error(`❌ [${sessionName}] 임시등록 데이터 캡처 오류:`, error);
      }

      callback({});
    });

    console.log(`✅ ${sessionName} 세션 리스너 설정 완료`);
  } catch (error) {
    console.error(`❌ ${sessionName} 세션 리스너 설정 실패:`, error);
  }
}

// 📝 임시등록 API 요청 가로채기 설정
function setupTemplateCaptureListener() {
  console.log("🎯 템플릿 캡처 리스너 설정 시작...");

  // 기본 세션에 리스너 설정
  setupListenerForSession(session.defaultSession, "기본");

  // 🔍 새로 생성되는 모든 세션에도 리스너 설정
  const originalFromPartition = session.fromPartition;
  session.fromPartition = function (partition, options) {
    const newSession = originalFromPartition.call(this, partition, options);
    console.log(`🆕 새 세션 생성됨: ${partition}`);

    // 새 세션에도 템플릿 캡처 리스너 설정
    setTimeout(() => {
      setupListenerForSession(newSession, `새창-${partition}`);
    }, 100);

    return newSession;
  };

  console.log("✅ 임시등록 API 캡처 리스너 설정 완료");
  console.log(
    "🔍 이제 모든 창에서 임시등록 버튼을 누르면 자동으로 템플릿이 캡처됩니다!"
  );
}

// 💾 템플릿 데이터 저장
function saveTemplateData(userId, requestBody, url) {
  try {
    console.log("🎯 템플릿 데이터 저장 시작...");
    console.log("  - 사용자 ID:", userId);
    console.log("  - 요청 URL:", url);
    console.log("  - 요청 데이터 크기:", requestBody.length, "bytes");

    // "아이디를 입력하세요"인 경우 저장하지 않음
    if (userId === "아이디를 입력하세요" || !userId || userId.trim() === "") {
      console.log(
        "⚠️ 유효하지 않은 사용자 ID로 인해 템플릿 저장을 건너뜁니다:",
        userId
      );
      return { success: false, error: "유효하지 않은 사용자 ID" };
    }

    const userDir = path.join(POSTS_DIR, userId);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
      console.log("📁 사용자 디렉토리 생성:", userDir);
    }

    const templatesFile = path.join(userDir, "templates.json");

    // 기존 템플릿 파일 로드
    let templates = [];
    if (fs.existsSync(templatesFile)) {
      const data = fs.readFileSync(templatesFile, "utf8");
      templates = JSON.parse(data);
      console.log("📂 기존 템플릿", templates.length, "개 로드됨");
    } else {
      console.log("📄 새 템플릿 파일 생성 예정");
    }

    // 새 템플릿 데이터 추가
    const newTemplate = {
      id: `template_${Date.now()}`,
      timestamp: new Date().toISOString(),
      url: url,
      requestBody: requestBody,
      userId: userId,
    };

    // URL에서 카페ID 추출 (더 유연한 패턴)
    const cafeIdMatch =
      url.match(/cafes?[/=](\d+)[/?&]?.*temporary[-_]articles/) ||
      url.match(/cafe[/=](\d+)[/?&]?/) ||
      url.match(/cafeId[=:](\d+)/) ||
      url.match(/\/(\d+)\/.*temporary[-_]articles/);
    if (cafeIdMatch) {
      newTemplate.cafeId = cafeIdMatch[1];
      console.log("🏠 카페 ID 추출:", newTemplate.cafeId);
    } else {
      console.log("⚠️ URL에서 카페 ID를 추출할 수 없음:", url);
    }

    // POST 데이터에서 추가 정보 추출 시도
    try {
      // URL 디코딩된 데이터에서 제목과 내용 추출 시도
      const decodedBody = decodeURIComponent(requestBody);

      // 제목 추출
      const titleMatch = decodedBody.match(/subject=([^&]*)/);
      if (titleMatch) {
        newTemplate.title = titleMatch[1];
        console.log(
          "📝 제목 추출:",
          newTemplate.title.substring(0, 50) + "..."
        );
      }

      // 내용 추출
      const contentMatch = decodedBody.match(/content=([^&]*)/);
      if (contentMatch) {
        newTemplate.content = contentMatch[1];
        console.log(
          "📄 내용 추출:",
          newTemplate.content.substring(0, 100) + "..."
        );
      }

      console.log("✅ 추가 정보 추출 완료");
    } catch (extractError) {
      console.log("⚠️ 추가 정보 추출 실패:", extractError.message);
    }

    templates.push(newTemplate);

    // 파일에 저장
    fs.writeFileSync(templatesFile, JSON.stringify(templates, null, 2));
    console.log(`💾 템플릿 저장 완료: ${templatesFile}`);
    console.log(`📊 총 템플릿 개수: ${templates.length}개`);

    // React로 상세 알림 전송
    if (mainWindow) {
      mainWindow.webContents.send("template-captured", {
        success: true,
        userId: userId,
        templateId: newTemplate.id,
        cafeId: newTemplate.cafeId,
        timestamp: newTemplate.timestamp,
        title: newTemplate.title || "제목 없음",
        totalTemplates: templates.length,
        message: `임시등록 템플릿이 성공적으로 저장되었습니다! (${templates.length}번째)`,
      });
      console.log("📢 React로 성공 알림 전송 완료");

      // 템플릿 캡처 성공 시 해당 사용자의 에디터 윈도우들을 닫기
      setTimeout(async () => {
        try {
          console.log("🔄 템플릿 캡처 완료로 에디터 윈도우 닫기 시작...");

          // 에디터 윈도우 닫기 신호 전송
          mainWindow.webContents.send("close-editor-windows", {
            userId: userId,
            reason: "template-captured",
            timestamp: new Date().toISOString(),
            templateId: newTemplate.id,
          });

          // 활성 에디터 사용자가 현재 저장한 사용자와 같으면 초기화
          if (activeEditorUser === userId) {
            console.log(
              `🔄 활성 에디터 사용자 초기화: ${activeEditorUser} -> null`
            );
            activeEditorUser = null;
          }

          console.log(
            `✅ 사용자 ${userId}의 에디터 윈도우 닫기 신호 전송 완료`
          );
        } catch (error) {
          console.error("❌ 에디터 윈도우 닫기 실패:", error);
        }
      }, 1000); // 1초 후 윈도우 닫기 (알림 표시 후)
    }

    return { success: true, templateId: newTemplate.id };
  } catch (error) {
    console.error("❌ 템플릿 저장 오류:", error);

    // React로 오류 알림 전송
    if (mainWindow) {
      mainWindow.webContents.send("template-captured", {
        success: false,
        error: error.message,
        message: "템플릿 저장 중 오류가 발생했습니다.",
      });
    }

    return { success: false, error: error.message };
  }
}

// 🔍 현재 로그인된 사용자 ID 가져오기
function getCurrentUserId() {
  console.log("🔍 현재 로그인된 사용자 ID 검색 중...");
  console.log("📊 전체 슬롯 개수:", currentSlots.length);
  console.log("🎯 활성 에디터 사용자:", activeEditorUser);

  // 1. 활성 에디터 사용자가 있고 유효한 경우 우선 반환
  if (
    activeEditorUser &&
    activeEditorUser !== "아이디를 입력하세요" &&
    activeEditorUser.trim() !== ""
  ) {
    // 해당 사용자가 실제로 로그인되어 있는지 확인
    const activeUserSlot = currentSlots.find(
      (slot) => slot.isLoggedIn && slot.userId === activeEditorUser
    );

    if (activeUserSlot) {
      console.log(
        `✅ 활성 에디터 사용자 ${activeEditorUser}를 반환 (로그인 확인됨)`
      );
      return activeEditorUser;
    } else {
      console.log(
        `⚠️ 활성 에디터 사용자 ${activeEditorUser}가 로그인되어 있지 않음`
      );
      // 활성 사용자가 로그인되어 있지 않으면 초기화
      activeEditorUser = null;
    }
  }

  // 2. 활성 에디터 사용자가 없거나 유효하지 않은 경우 기존 로직 사용
  const loggedInSlots = currentSlots.filter((slot) => slot.isLoggedIn);
  console.log("✅ 로그인된 슬롯 개수:", loggedInSlots.length);

  if (loggedInSlots.length > 0) {
    console.log("📋 로그인된 슬롯 목록:");
    loggedInSlots.forEach((slot, index) => {
      console.log(
        `  ${index + 1}. 슬롯 ${slot.id}: ${slot.userId} (${slot.timestamp})`
      );
    });

    // 가장 최근 타임스탬프를 가진 슬롯의 사용자 ID 반환
    const latestSlot = loggedInSlots.reduce((latest, current) => {
      return new Date(current.timestamp) > new Date(latest.timestamp)
        ? current
        : latest;
    });

    console.log("🎯 가장 최근 로그인 사용자:", latestSlot.userId);
    console.log("⏰ 로그인 시간:", latestSlot.timestamp);

    // "아이디를 입력하세요"인 경우 null 반환
    if (
      latestSlot.userId === "아이디를 입력하세요" ||
      !latestSlot.userId ||
      latestSlot.userId.trim() === ""
    ) {
      console.log("⚠️ 유효하지 않은 사용자 ID:", latestSlot.userId);
      return null;
    }

    return latestSlot.userId;
  }

  console.log("⚠️ 로그인된 사용자가 없습니다.");
  console.log("📋 모든 슬롯 상태:");
  currentSlots.forEach((slot, index) => {
    console.log(
      `  ${index + 1}. 슬롯 ${slot.id}: ${slot.userId || "미정"} - 로그인: ${
        slot.isLoggedIn ? "O" : "X"
      }`
    );
  });

  return null;
}

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

// 📖 계정별 템플릿 불러오기
ipcMain.handle("load-account-templates", (event, userId) => {
  try {
    ensureDataDirectories();
    const templatesFile = path.join(POSTS_DIR, userId, "templates.json");

    if (!fs.existsSync(templatesFile)) {
      return [];
    }

    const templatesData = fs.readFileSync(templatesFile, "utf8");
    const templates = JSON.parse(templatesData);

    // 배열로 반환 (templates가 배열이 아닌 경우 처리)
    return Array.isArray(templates) ? templates : [];
  } catch (error) {
    console.error(`템플릿 로드 실패 (userId: ${userId}):`, error);
    return [];
  }
});

// 🌐 네이버 카페 API 호출 (CORS 우회)
ipcMain.handle("post-to-naver-cafe", async (event, requestData) => {
  const { url, body, cookies } = requestData;

  console.log("🚀 Electron에서 네이버 카페 API 호출:", {
    url,
    bodyLength: JSON.stringify(body).length,
    cookieCount: Object.keys(cookies).length,
    hasNID_AUT: !!cookies["NID_AUT"],
    hasNID_SES: !!cookies["NID_SES"],
  });

  try {
    const https = require("https");
    const { URL } = require("url");

    // 쿠키 문자열 생성
    const cookieString = Object.entries(cookies)
      .map(([name, value]) => `${name}=${value}`)
      .join("; ");

    const urlObj = new URL(url);
    const postData = JSON.stringify(body);

    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
        Accept: "application/json, text/plain, */*",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
        Origin: "https://cafe.naver.com",
        Referer: url.replace(
          "apis.naver.com/cafe-web/cafe-editor-api/v2.0",
          "cafe.naver.com/ca-fe"
        ),
        Cookie: cookieString,
        "x-cafe-product": "pc",
      },
    };

    console.log("📤 Electron API 요청 옵션:", {
      hostname: options.hostname,
      path: options.path,
      cookieLength: cookieString.length,
      cookiePreview: cookieString.substring(0, 200) + "...",
      headers: Object.keys(options.headers),
    });

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        console.log("📥 Electron API 응답:", {
          statusCode: res.statusCode,
          statusMessage: res.statusMessage,
          headers: res.headers,
        });

        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          try {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              const result = JSON.parse(data);
              console.log("✅ Electron API 성공:", result);
              resolve({ success: true, data: result });
            } else {
              console.error("❌ Electron API 오류:", data);
              resolve({
                success: false,
                error: `HTTP ${res.statusCode}: ${res.statusMessage}\n${data}`,
              });
            }
          } catch (parseError) {
            console.error("❌ JSON 파싱 오류:", parseError);
            resolve({
              success: false,
              error: `응답 파싱 실패: ${parseError.message}\n응답 데이터: ${data}`,
            });
          }
        });
      });

      req.on("error", (error) => {
        console.error("❌ Electron 요청 오류:", error);
        resolve({
          success: false,
          error: `요청 실패: ${error.message}`,
          stack: error.stack,
        });
      });

      req.write(postData);
      req.end();
    });
  } catch (error) {
    console.error("❌ Electron API 호출 실패:", error);
    return {
      success: false,
      error: error.message,
      stack: error.stack,
    };
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
