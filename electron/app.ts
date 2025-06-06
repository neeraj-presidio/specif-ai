import { app, ipcMain, BrowserWindow, shell, dialog } from "electron";
import path from "path";
import dotenv from "dotenv";
import { setupFileSystemHandlers } from "./handlers/fs-handler";
import { setupStore } from "./handlers/store-handler";
import { setupCoreHandlers } from "./handlers/core-handler";
import { setupRequirementHandlers } from "./handlers/requirement-handler";
import { setupVisualizationHandlers } from "./handlers/visualization-handler";
import { setupFeatureHandlers } from "./handlers/feature-handler";
import { setupSolutionHandlers } from "./handlers/solution-handler";
import {
  setupContentGenerationHandlers,
  isAnyContentGenerationInProgress,
  getActiveContentGenerationProcessNames,
} from "./handlers/content-generation-handler";
import { setupJiraHandlers } from "./handlers/jira-handler";
import { setupAppUpdateHandler } from "./handlers/app-update-handler";
import { setupMcpHandlers } from "./handlers/mcp-handler";
import { MCPHub } from "./mcp/mcp-hub";

// ========================
// CONFIGURATION
// ========================

function initializeConfig() {
  dotenv.config({
    path: app.isPackaged
      ? path.join(process.resourcesPath, ".env")
      : path.resolve(process.cwd(), ".env"),
  });

  return {
    indexPath: app.isPackaged
      ? path.join(process.resourcesPath, "ui")
      : path.resolve(process.cwd(), "ui"),
    themeConfiguration: JSON.parse(process.env.THEME_CONFIGURATION || "{}"),
  };
}

// ========================
// WINDOW MANAGEMENT
// ========================

let mainWindow: BrowserWindow | null = null;

function getIconPath(themeConfiguration: any): string {
  const icons = themeConfiguration.appIcons;
  if (process.platform === "darwin") {
    return path.join(__dirname, icons.mac);
  } else if (process.platform === "win32") {
    return path.join(__dirname, icons.win);
  } else {
    return path.join(__dirname, icons.linux);
  }
}

function createWindow(indexPath: string, themeConfiguration: any) {
  mainWindow = new BrowserWindow({
    width: 1200,
    minWidth: 1200,
    minHeight: 850,
    height: 850,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: "hiddenInset",
    icon: path.join(__dirname, getIconPath(themeConfiguration)),
  });

  if (!app.isPackaged) {
    mainWindow.loadURL(process.env.DEV_ELECTRON_RENDERER_URL as string);
  } else {
    mainWindow
      .loadFile(`${indexPath}/index.html`)
      .then(() => {
        console.debug("Welcome Page loaded successfully", indexPath);
      })
      .catch((error) => {
        console.error("Failed to load welcome page:", error);
      });
  }

  mainWindow.on("close", async (event) => {
    if (isAnyContentGenerationInProgress()) {
      event.preventDefault();

      const shouldQuit = await confirmQuitDuringActiveProcesses();
      if (shouldQuit) {
        mainWindow = null;
        app.exit(0);
      }
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
    app.quit();
  });

  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: "deny" };
  });

  return mainWindow;
}

function onAppReload(indexPath: string) {
  mainWindow
    ?.loadFile(`${indexPath}/index.html`)
    .then(() => {
      console.debug("Welcome Page reloaded successfully", indexPath);
    })
    .catch((error) => {
      console.error("Failed to reload welcome page:", error);
    });
}

function setupWindowHandlers(window: BrowserWindow, indexPath: string) {
  window.on("enter-full-screen", () => {
    window?.webContents.send("fullscreen-change", true);
  });

  window.on("leave-full-screen", () => {
    window?.webContents.send("fullscreen-change", false);
  });

  ipcMain.handle("window:get-fullscreen", () => {
    return window?.isFullScreen();
  });

  window.webContents.setWindowOpenHandler(() => {
    return { action: "deny" };
  });

  window.webContents.on(
    "did-fail-load",
    (
      _event,
      errorCode: number,
      errorDescription: string,
      validatedURL: string
    ) => {
      if (errorCode === -6) {
        console.error(
          `Failed to load URL: ${validatedURL}, error: ${errorDescription}`
        );
        // ipcMain.emit("reloadApp");
        onAppReload(indexPath);
      }
    }
  );
}

// ========================
// UI RELATED HANDLERS
// ========================

function setupUIHandlers(indexPath: string, themeConfiguration: any) {
  ipcMain.handle("reloadApp", () => onAppReload(indexPath));

  ipcMain.handle("get-theme-configuration", () => themeConfiguration);

  ipcMain.handle("get-style-url", () => {
    return path.join(process.resourcesPath, "tailwind.output.css");
  });

  ipcMain.handle("open-external-url", async (_event, url: string) => {
    if (isValidUrl(url)) {
      await shell.openExternal(url);
      return true;
    }
    return false;
  });

  ipcMain.handle("show-error-message", async (_event, errorMessage: string) => {
    mainWindow?.webContents.send("display-error", errorMessage);
  });

  ipcMain.on("load-url", (_event, serverConfig: string) => {
    if (serverConfig && isValidUrl(serverConfig)) {
      mainWindow
        ?.loadURL(serverConfig)
        .then(() => {
          console.debug("URL loaded successfully");
        })
        .catch((error: Error) => {
          console.error("Failed to load URL:", error.message);
        });
    } else {
      console.error("Invalid or no server URL provided.");
    }
  });
}

// ========================
// UTILITY FUNCTIONS
// ========================

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch (_) {
    return false;
  }
}

async function confirmQuitDuringActiveProcesses(): Promise<boolean> {
  const activeProcesses = getActiveContentGenerationProcessNames();
  try {
    const processCount = activeProcesses.length;
    const isPlural = processCount > 1;

    const displayProcesses = activeProcesses.map((name) =>
      name.length > 30 ? `${name.substring(0, 27)}...` : name
    );

    const processListText =
      processCount <= 3
        ? displayProcesses.join(", ")
        : `${displayProcesses.slice(0, 2).join(", ")} and ${
            processCount - 2
          } more`;

    const choice = await dialog.showMessageBox(mainWindow!, {
      type: "warning",
      buttons: ["Wait for Completion", "Quit Anyway"],
      defaultId: 0,
      cancelId: 0,
      title: `${processCount} Active ${
        isPlural ? "Processes" : "Process"
      } Running`,
      message: `You have ${
        isPlural ? "processes" : "a process"
      } currently running that ${
        isPlural ? "haven't" : "hasn't"
      } finished yet.`,
      detail: [
        `📋 Active ${isPlural ? "processes" : "process"}: ${processListText}`,
        "",
        "💡 What happens if you quit now:",
        "• Your work in progress may be lost",
        "• Generated content might be incomplete",
        "• You may need to restart these tasks",
        "",
        "🔒 Recommended: Let the processes finish, then quit safely.",
      ].join("\n"),
      noLink: true,
      normalizeAccessKeys: false,
    });

    return choice.response === 1;
  } catch (error) {
    console.error("Error showing quit dialog:", error);
    return false;
  }
}

// ========================
// MAIN APPLICATION LOGIC
// ========================

app.whenReady().then(async () => {
  // Initialize configuration
  const { indexPath, themeConfiguration } = initializeConfig();

  // Setup store
  setupStore();

  // Create main window
  mainWindow = createWindow(indexPath, themeConfiguration);

  // Register app lifecycle handlers
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow(indexPath, themeConfiguration);
    }
  });

  app.on("window-all-closed", () => app.quit());

  app.on("before-quit", async (event) => {
    console.log("App before quit...", isAnyContentGenerationInProgress());

    if (isAnyContentGenerationInProgress()) {
      event.preventDefault();

      const shouldQuit = await confirmQuitDuringActiveProcesses();
      if (shouldQuit) {
        app.exit(0);
      }
    }
  });

  if (mainWindow) {
    // Setup window event handlers
    setupWindowHandlers(mainWindow, indexPath);

    // Register all IPC handlers
    setupAppUpdateHandler();
    setupFileSystemHandlers();
    setupUIHandlers(indexPath, themeConfiguration);
    setupJiraHandlers(mainWindow);
    setupCoreHandlers();
    setupRequirementHandlers();
    setupVisualizationHandlers();
    setupFeatureHandlers();
    setupSolutionHandlers();
    setupContentGenerationHandlers();
    setupMcpHandlers();

    // start mcp servers in the background
    MCPHub.getInstance();
  }
});
