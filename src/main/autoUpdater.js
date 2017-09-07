const {app, BrowserWindow, dialog, ipcMain, shell} = require('electron');
const path = require('path');
const {autoUpdater} = require('electron-updater');
const semver = require('semver');

const INTERVAL_48_HOURS_IN_MS = 172800000; // 48 * 60 * 60 * 1000 [ms]

let updaterModal = null;

function createEventListener(win, eventName) {
  return (event) => {
    if (event.sender === win.webContents) {
      win.emit(eventName);
    }
  };
}

function createUpdaterModal(parentWindow, options) {
  const windowWidth = 480;
  const windowHeight = 240;
  const windowOptions = {
    title: `${app.getName()} Updater`,
    parent: parentWindow,
    modal: true,
    maximizable: false,
    show: false,
    width: windowWidth,
    height: windowHeight,
    resizable: false,
    autoHideMenuBar: true
  };
  if (process.platform === 'linux') {
    windowOptions.icon = options.linuxAppIcon;
  }

  const modal = new BrowserWindow(windowOptions);
  modal.once('ready-to-show', () => {
    modal.show();
  });
  const updaterURL = (global.isDev ? 'http://localhost:8080' : `file://${app.getAppPath()}`) + '/browser/updater.html';
  modal.loadURL(updaterURL);

  for (const eventName of ['click-release-notes', 'click-skip', 'click-remind', 'click-install']) {
    const listener = createEventListener(modal, eventName);
    ipcMain.on(eventName, listener);
    modal.on('closed', () => {
      ipcMain.removeListener(eventName, listener);
    });
  }

  return modal;
}

function isUpdateApplicable(now, skippedVersion, updateInfo) {
  const releaseTime = new Date(updateInfo.releaseDate).getTime();

  // 48 hours after a new version is added to releases.mattermost.com, user receives a “New update is available” dialog
  if (now.getTime() - releaseTime < INTERVAL_48_HOURS_IN_MS) {
    return false;
  }

  // If a version was skipped, compare version.
  if (skippedVersion) {
    return semver.gt(updateInfo.version, skippedVersion);
  }

  return true;
}

function downloadAndInstall() {
  autoUpdater.downloadUpdate().then(() => {
    autoUpdater.quitAndInstall();
  });
}

function initialize(appState, mainWindow) {
  const assetsDir = path.resolve(app.getAppPath(), 'assets');
  autoUpdater.on('error', (err) => {
    console.error('Error in autoUpdater:', err.message);
  }).on('update-available', (info) => {
    if (isUpdateApplicable(new Date(), appState.skippedVersion, info)) {
      updaterModal = createUpdaterModal(mainWindow, {linuxAppIcon: path.join(assetsDir, 'appicon.png'), nextVersion: '0.0.0'});
      updaterModal.on('closed', () => {
        updaterModal = null;
      });
      updaterModal.on('click-skip', () => {
        appState.skippedVersion = info.version;
        updaterModal.close();
      }).on('click-remind', () => {
        appState.updateCheckedDate = new Date();
        setTimeout(autoUpdater.checkForUpdates, INTERVAL_48_HOURS_IN_MS);
        updaterModal.close();
      }).on('click-install', () => {
        downloadAndInstall();
        updaterModal.close();
      }).on('click-release-notes', () => {
        shell.openExternal(`https://github.com/mattermost/desktop/releases/v${info.version}`);
      });
      updaterModal.focus();
    } else if (autoUpdater.isManual) {
      autoUpdater.emit('update-not-available');
    }
  }).on('update-not-available', () => {
    if (autoUpdater.isManual) {
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        buttons: ['Close'],
        title: 'Your Desktop App is up to date',
        message: 'You have the latest version of the Mattermost Desktop App.'
      }, () => {}); // eslint-disable-line no-empty-function
    }
    setTimeout(autoUpdater.checkForUpdates, INTERVAL_48_HOURS_IN_MS);
  });
}

function shouldCheckForUpdatesOnStart(updateCheckedDate) {
  if (updateCheckedDate) {
    if (Date.now() - updateCheckedDate < INTERVAL_48_HOURS_IN_MS) {
      return false;
    }
  }
  return true;
}

function checkForUpdates(isManual = false) {
  autoUpdater.isManual = isManual;
  autoUpdater.autoDownload = false;
  if (!updaterModal) {
    autoUpdater.checkForUpdates();
  }
}

module.exports = {
  INTERVAL_48_HOURS_IN_MS,
  checkForUpdates,
  shouldCheckForUpdatesOnStart,
  initialize
};
