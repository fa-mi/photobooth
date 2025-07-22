import { app, powerSaveBlocker, protocol, systemPreferences } from 'electron';
import { BrowserWindow, ipcMain } from 'electron';
import './security-restrictions';
import { restoreOrCreateWindow } from './main-window';
import { setup as setupState } from './state';
import { initMenu } from './menu';
import { initStore, registerStoreHandlers } from './store';
import type { Store } from './store';

export { Preferences } from './store';
export type { TransitionData } from './state';

let stopStateMachine: () => void;
let store: Store;
let keepAliveTimeout: NodeJS.Timeout;

protocol.registerSchemesAsPrivileged([{ scheme: 'photo', privileges: { secure: true, standard: true } }]);

ipcMain.on('print-photo', (event, photoUrl) => {
  const printWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  printWindow.loadURL(`data:text/html,
    <html>
      <body style="margin:0;padding:0;">
        <img src="${photoUrl}" style="width:100%;height:auto;" />
        <script>window.onload = () => { window.print(); }</script>
      </body>
    </html>`);

  printWindow.webContents.on('did-finish-load', () => {
    printWindow.webContents.print({ silent: true }, () => {
      printWindow.close();
    });
  });
});


/**
 * Prevent multiple instances
 */
const isSingleInstance = app.requestSingleInstanceLock();
if (!isSingleInstance) {
  app.quit();
  process.exit(0);
}
app.on('second-instance', restoreOrCreateWindow);

/**
 * Disable Hardware Acceleration for more power-save
 */
// app.disableHardwareAcceleration();

/**
 * Shout down background process if all windows was closed
 */
app.on('window-all-closed', async () => {
  await stopStateMachine();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', async () => {
  clearTimeout(keepAliveTimeout);
  await stopStateMachine();
});

/**
 * @see https://www.electronjs.org/docs/v14-x-y/api/app#event-activate-macos Event: 'activate'
 */
app.on('activate', async () => {
  const window = await restoreOrCreateWindow();
  registerStoreHandlers(store, window.webContents);
  const { service, stop } = await setupState(window.webContents, store);
  stopStateMachine = stop;
  initMenu(service);
});

/**
 * Create app window when background process will be ready
 */
app
  .whenReady()
  .then(async () => {
    if (process.platform !== 'darwin') {
      return;
    }
    powerSaveBlocker.start('prevent-display-sleep');
    const statusCam = systemPreferences.getMediaAccessStatus('camera');
    const statusMic = systemPreferences.getMediaAccessStatus('microphone');
    if (statusCam !== 'granted' || statusMic !== 'granted') {
      await systemPreferences.askForMediaAccess('camera');
      await systemPreferences.askForMediaAccess('microphone');
    }
  })
  .then(() => {
    store = initStore();
  })
  .then(restoreOrCreateWindow)
  .then(async (window: BrowserWindow) => {
    registerStoreHandlers(store, window.webContents);

    const { stop, service } = await setupState(window.webContents, store);
    initMenu(service);
    stopStateMachine = stop;
  })
  .catch((e) => console.error('Failed create window:', e));

if (process.env.DEV) {
  app.whenReady().then(() => import('electron-devtools-installer'));
}

if (process.env.PROD) {
  app
    .whenReady()
    .then(() => import('electron-updater'))
    .then(({ autoUpdater }) => autoUpdater.checkForUpdatesAndNotify())
    .catch((e) => console.error('Failed check updates:', e));
}
