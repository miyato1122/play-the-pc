import { app, BrowserWindow, Menu } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// キー連打で意図せず最小化・終了・リロードなどが起きないよう、
// アクセラレータは「終了」と「フルスクリーン切替」のみに絞る。
const template = [
  {
    label: "PCであそぼう",
    submenu: [
      { role: "togglefullscreen", label: "フルスクリーン切替" },
      { type: "separator" },
      { role: "quit", label: "終了" },
    ],
  },
];

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    backgroundColor: "#101018",
    title: "PCであそぼう",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.loadFile(path.join(__dirname, "..", "renderer", "index.html"));
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
