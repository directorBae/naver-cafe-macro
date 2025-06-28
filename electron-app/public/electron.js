const path = require("path");
const { app, BrowserWindow, ipcMain, session } = require("electron");

require("electron-reload")(__dirname, {
  electron: path.join(__dirname, "..", "node_modules", ".bin", "electron"),
  forceHardReset: true,
  hardResetMethod: "exit",
});

let mainWindow;

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
  mainWindow.webContents.openDevTools();
}

// ✅ IPC 핸들러: React가 요청하면 새 창을 띄움
ipcMain.handle("open-naver-login", () => {
  const loginWin = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // ✅ API 요청 가로채기
  const filter = {
    urls: ["https://*.naver.com/*"],
  };

  loginWin.webContents.session.webRequest.onBeforeRequest(
    filter,
    (details, callback) => {
      if (details.method === "POST" && details.uploadData) {
        const raw = details.uploadData.map((d) => d.bytes.toString()).join("");

        console.log("📦 POST Body:", raw);
      }

      callback({ cancel: false });
    }
  );

  loginWin.loadURL("https://nid.naver.com");
});

app.whenReady().then(createWindow);
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
