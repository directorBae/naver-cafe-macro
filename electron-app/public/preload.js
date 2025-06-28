const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  openNaverLogin: () => ipcRenderer.invoke("open-naver-login"),
});
