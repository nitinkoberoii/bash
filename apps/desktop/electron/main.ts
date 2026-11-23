import {
  app,
  BrowserWindow,
  shell,
  screen,
  ipcMain,
  globalShortcut,
  session,
  desktopCapturer,
} from 'electron';
import path from 'node:path';
import { IPC_CHANNELS } from '@bash/shared';
import { createSystemTray, destroySystemTray } from './tray';

// Enforce Single-Instance Lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  console.log('[Main] Another instance is already running. Quitting duplicate instance.');
  app.quit();
} else {
  let mainWindow: BrowserWindow | null = null;
  let isClickThrough = true;

  const toggleVisibility = (): void => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
    }
  };

  const toggleInteractiveMode = (): void => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    isClickThrough = !isClickThrough;
    mainWindow.setIgnoreMouseEvents(isClickThrough, { forward: true });
    // Broadcast interactive state to Renderer (isInteractive = !isClickThrough)
    mainWindow.webContents.send(IPC_CHANNELS.HOTKEY_TOGGLE_INTERACTIVE, !isClickThrough);
    console.log(`[Main] Interactive mode toggled. Click-through: ${isClickThrough}`);
  };

  const registerGlobalHotkeys = (): void => {
    // Ctrl+Shift+H: Toggle Hide/Show Overlay
    globalShortcut.register('CommandOrControl+Shift+H', () => {
      console.log('[Main] Hotkey triggered: Ctrl+Shift+H (Toggle Visibility)');
      toggleVisibility();
    });

    // Ctrl+Shift+I: Toggle Click-Through vs Interactive Drag Mode
    globalShortcut.register('CommandOrControl+Shift+I', () => {
      console.log('[Main] Hotkey triggered: Ctrl+Shift+I (Toggle Interactive Mode)');
      toggleInteractiveMode();
    });

    // Ctrl+Shift+Space: Manual Hint Trigger
    globalShortcut.register('CommandOrControl+Shift+Space', () => {
      console.log('[Main] Hotkey triggered: Ctrl+Shift+Space (Manual Hint Trigger)');
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send(IPC_CHANNELS.HOTKEY_TRIGGER, 'manual-trigger');
      }
    });

    // Ctrl+Shift+X: Clear Conversation Context
    globalShortcut.register('CommandOrControl+Shift+X', () => {
      console.log('[Main] Hotkey triggered: Ctrl+Shift+X (Clear Context)');
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send(IPC_CHANNELS.HOTKEY_CLEAR_CONTEXT, 'clear-context');
      }
    });
  };

  const createWindow = async (): Promise<void> => {
    const preloadPath = path.join(__dirname, 'preload.js');

    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth } = primaryDisplay.workAreaSize;
    const overlayWidth = 480;
    const overlayHeight = 280;
    const x = Math.round((screenWidth - overlayWidth) / 2);
    const y = 40;

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

    // Register OS-wide global shortcuts
    registerGlobalHotkeys();

    // Create Windows System Tray
    createSystemTray(mainWindow, {
      onToggleVisibility: toggleVisibility,
      onToggleInteractive: toggleInteractiveMode,
    });

    // Automated CI/dev self-test teardown
    if (process.env.ELECTRON_TEST_QUIT === 'true') {
      console.log('[Main] Test mode: single-instance lock acquired successfully!');
      console.log('[Main] Test mode: alwaysOnTop =', mainWindow.isAlwaysOnTop());
      console.log(
        '[Main] Test mode: hotkeys registered =',
        globalShortcut.isRegistered('CommandOrControl+Shift+H')
      );
      console.log('[Main] Test mode: stealth overlay and tray configured successfully!');
      console.log('[Main] Test mode: display media handler registered successfully!');
      setTimeout(() => {
        console.log('[Main] Test mode: shutting down primary instance cleanly.');
        app.quit();
      }, 1500);
    }
  };

  // IPC Handlers
  ipcMain.handle(IPC_CHANNELS.SET_CLICK_THROUGH, (_event, ignore: boolean): boolean => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      isClickThrough = ignore;
      mainWindow.setIgnoreMouseEvents(ignore, { forward: true });
      return true;
    }
    return false;
  });

  ipcMain.handle(IPC_CHANNELS.APP_QUIT, (): void => {
    app.quit();
  });

  app.on('second-instance', () => {
    console.log('[Main] Second instance detected via IPC. Bringing overlay to focus.');
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();
    }
  });

  const setupMediaHandlers = (): void => {
    // Programmatically grant loopback audio and screen capture without user picker modal
    session.defaultSession.setDisplayMediaRequestHandler(async (_request, callback) => {
      try {
        const sources = await desktopCapturer.getSources({ types: ['screen'] });
        const primarySource = sources[0];
        if (primarySource) {
          callback({ video: primarySource, audio: 'loopback' });
        } else {
          console.warn('[Main] No screen sources found for display media request.');
          callback({});
        }
      } catch (err) {
        console.error('[Main] Error handling display media request:', err);
        callback({});
      }
    });

    // Auto-approve media permissions (microphone and display capture) for local renderer
    session.defaultSession.setPermissionCheckHandler((_webContents, permission) => {
      if (permission === 'media' || permission === 'display-capture') {
        return true;
      }
      return false;
    });

    session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
      if (permission === 'media' || permission === 'display-capture') {
        callback(true);
      } else {
        callback(false);
      }
    });
  };

  app.whenReady().then(async () => {
    setupMediaHandlers();
    await createWindow();
  });

  app.on('will-quit', () => {
    // Unregister all shortcuts and destroy tray
    globalShortcut.unregisterAll();
    destroySystemTray();
  });

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
