import { app, BrowserWindow, shell, screen, ipcMain } from 'electron';
import path from 'node:path';
import { IPC_CHANNELS } from '@bash/shared';

// Enforce Single-Instance Lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  console.log('[Main] Another instance is already running. Quitting duplicate instance.');
  app.quit();
} else {
  let mainWindow: BrowserWindow | null = null;

  const createWindow = async (): Promise<void> => {
    const preloadPath = path.join(__dirname, 'preload.js');

    // Calculate initial position: top-center near the webcam
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth } = primaryDisplay.workAreaSize;
    const overlayWidth = 480;
    const overlayHeight = 280;
    const x = Math.round((screenWidth - overlayWidth) / 2);
    const y = 40; // 40px from top of monitor

    mainWindow = new BrowserWindow({
      width: overlayWidth,
      height: overlayHeight,
      x,
      y,
      frame: false,
      transparent: true,
      hasShadow: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      focusable: false,
      resizable: false,
      show: false,
      backgroundColor: '#00000000',
      autoHideMenuBar: true,
      webPreferences: {
        preload: preloadPath,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });

    // Native OS Window display affinity & stealth layers
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
    mainWindow.setContentProtection(true);
    mainWindow.setIgnoreMouseEvents(true, { forward: true });

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

    // Automated self-test hook
    if (process.env.ELECTRON_TEST_QUIT === 'true') {
      console.log('[Main] Test mode: single-instance lock acquired successfully!');
      console.log('[Main] Test mode: alwaysOnTop =', mainWindow.isAlwaysOnTop());
      console.log('[Main] Test mode: stealth overlay configured successfully!');
      setTimeout(() => {
        console.log('[Main] Test mode: shutting down primary instance cleanly.');
        app.quit();
      }, 1500);
    }
  };

  // IPC: Toggle Click-Through mode
  ipcMain.handle(IPC_CHANNELS.SET_CLICK_THROUGH, (_event, ignore: boolean): boolean => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setIgnoreMouseEvents(ignore, { forward: true });
      return true;
    }
    return false;
  });

  app.on('second-instance', () => {
    console.log('[Main] Second instance detected via IPC. Bringing overlay to focus.');
    if (mainWindow && !mainWindow.isDestroyed()) {
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
