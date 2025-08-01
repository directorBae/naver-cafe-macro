const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  openNaverLogin: () => ipcRenderer.invoke("open-naver-login"),

  // 세션 데이터 수신 리스너
  onSessionDataCaptured: (callback) => {
    ipcRenderer.on("session-data-captured", (event, data) => callback(data));
  },

  // 세션 캡처 오류 수신 리스너
  onSessionCaptureError: (callback) => {
    ipcRenderer.on("session-capture-error", (event, error) => callback(error));
  },

  // 로그인 창 닫힘 이벤트 리스너
  onLoginWindowClosed: (callback) => {
    ipcRenderer.on("login-window-closed", (event) => callback());
  },

  // 환경변수 가져오기
  getEnvVariable: (key) => ipcRenderer.invoke("get-env-variable", key),

  // 로그인된 슬롯 정보 가져오기
  getLoggedInSlots: () => ipcRenderer.invoke("get-logged-in-slots"),

  // 슬롯 업데이트 (React에서 슬롯 정보 업데이트)
  updateSlot: (slotData) => ipcRenderer.invoke("update-slot", slotData),

  // 계정별 글 저장
  saveAccountPosts: (userId, posts) =>
    ipcRenderer.invoke("save-account-posts", userId, posts),

  // 계정별 글 불러오기
  loadAccountPosts: (userId) =>
    ipcRenderer.invoke("load-account-posts", userId),

  // OpenAI API 키 설정
  setOpenAIKey: (apiKey) => ipcRenderer.invoke("set-openai-key", apiKey),

  // 글 생성
  generatePosts: (prompt, count) =>
    ipcRenderer.invoke("generate-posts", prompt, count),

  // 리스너 제거 (메모리 누수 방지)
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },
});
