import { Tray, Menu, nativeImage, BrowserWindow, app, NativeImage } from 'electron';

let tray: Tray | null = null;

export interface TrayCallbacks {
  onToggleVisibility: () => void;
  onToggleInteractive: () => void;
}

/**
 * Creates a crisp 16x16 RGBA terminal glyph icon directly in memory
 * avoiding external filesystem path resolution bugs in dev/ASAR builds.
 */
function createDefaultTrayIcon(): NativeImage {
  const size = 16;
  const buffer = Buffer.alloc(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      // Draw a 12x12 rounded terminal badge with a subtle inner prompt dot
      if (x >= 2 && x <= 13 && y >= 2 && y <= 13) {
        const isBorder = x === 2 || x === 13 || y === 2 || y === 13;
        const isGlyph = (x === 5 && y === 6) || (x === 6 && y === 7) || (x === 5 && y === 8);
        if (isBorder || isGlyph) {
          buffer[idx] = 56; // R: Sky blue (#38bdf8)
          buffer[idx + 1] = 189; // G
          buffer[idx + 2] = 248; // B
          buffer[idx + 3] = 255; // Alpha
        } else {
          buffer[idx] = 15; // Dark slate interior (#0f172a)
          buffer[idx + 1] = 23;
          buffer[idx + 2] = 42;
          buffer[idx + 3] = 220;
        }
      } else {
        buffer[idx + 3] = 0; // Transparent exterior
      }
    }
  }

  return nativeImage.createFromBitmap(buffer, { width: size, height: size });
}

export function createSystemTray(
  _mainWindow: BrowserWindow,
  callbacks: TrayCallbacks
): Tray | null {
  if (tray) {
    return tray;
  }

  try {
    const icon = createDefaultTrayIcon();
    tray = new Tray(icon);
    tray.setToolTip('Project Bash — Stealth AI Interview Copilot');

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Toggle Visibility (Ctrl+Shift+H)',
        click: callbacks.onToggleVisibility,
      },
      {
        label: 'Toggle Interactive / Click-Through (Ctrl+Shift+I)',
        click: callbacks.onToggleInteractive,
      },
      { type: 'separator' },
      {
        label: 'Quit Project Bash',
        click: () => {
          app.quit();
        },
      },
    ]);

    tray.setContextMenu(contextMenu);

    tray.on('click', () => {
      callbacks.onToggleVisibility();
    });

    return tray;
  } catch (error) {
    console.warn(
      '[Tray] System tray initialization skipped or unsupported in current environment:',
      error
    );
    return null;
  }
}

export function destroySystemTray(): void {
  if (tray && !tray.isDestroyed()) {
    try {
      tray.destroy();
    } catch (err) {
      console.warn('[Tray] Error destroying tray:', err);
    }
    tray = null;
  }
}
