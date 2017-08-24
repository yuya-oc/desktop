// ref: https://github.com/electron/electron/blob/master/lib/browser/api/menu-item-roles.js

const zoomInterval = 0.5;

function zoomIn(webContents) {
  webContents.getZoomLevel((zoomLevel) => {
    webContents.setZoomLevel(zoomLevel + zoomInterval);
  });
}

function zoomOut(webContents) {
  webContents.getZoomLevel((zoomLevel) => {
    webContents.setZoomLevel(zoomLevel - zoomInterval);
  });
}

function resetZoom(webContents) {
  webContents.setZoomLevel(0);
}

module.exports = {
  zoomIn,
  zoomOut,
  resetZoom
};
