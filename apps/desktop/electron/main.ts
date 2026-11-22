import { app, BrowserWindow, shell } from 'electron';
import path from 'node:path';

// Enforce Single-Instance Lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  console.log('[Main] Another instance is already running. Quitting duplicate instance.');
  app.quit();
} else {
  let mainWindow: BrowserWindow | null = null;

  const createWindow = async (): Promise<void> => {
    const preloadPath = path.join(__dirname, 'preload.js');

    mainWindow = new BrowserWindow({
      width: 500,
      height: 360,
      title: 'Project Bash Overlay',
      show: false,
      autoHideMenuBar: true,
      webPreferences: {
        preload: preloadPath,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });

    mainWindow.on('ready-to-show', () => {
      mainWindow?.show();
    });

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      if (url.startsWith('https:') || url.startsWith('http:')) {
        shell.openExternal(url);
      }
      return { action: 'deny' };
    });

    if (process.env.VITE_DEV_SERVER_URL) {
      await mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    } else {
      await mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    // Automated CI/dev self-test teardown
    if (process.env.ELECTRON_TEST_QUIT === 'true') {
      console.log('[Main] Test mode: single-instance lock acquired successfully!');
      setTimeout(() => {
        console.log('[Main] Test mode: shutting down primary instance cleanly.');
        app.quit();
      }, 1500);
    }
  };

  app.on('second-instance', () => {
    console.log('[Main] Second instance detected via IPC. Bringing overlay to focus.');
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(createWindow);

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
}
