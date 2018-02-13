const OriginalNotification = Notification;
const {ipcRenderer} = require('electron');
const {throttle} = require('underscore');
const dingDataURL = require('../../assets/ding.mp3'); // https://github.com/mattermost/platform/blob/v3.7.3/webapp/images/ding.mp3

const playDing = throttle(() => {
  const ding = new Audio(dingDataURL);
  ding.play();
}, 3000, {trailing: false});

/**
 * BalloonNotification should be used for Windows 7/8.1
 */
class BalloonNotification {
  constructor(title, options = {}) {
    const actualOptions = Object.assign({
      dir: 'auto',
      body: '',
      renotify: false,
      requireInteraction: false,
      silent: false,
      noscreen: false,
      sticky: false
    }, options);
    ipcRenderer.send('notified', {
      title,
      options: actualOptions
    });

    if (!actualOptions.silent) {
      playDing();
    }
  }

  close() { // eslint-disable-line no-empty-blocks, class-methods-use-this
  }
}

BalloonNotification.requestPermission = OriginalNotification.requestPermission;
Object.defineProperty(BalloonNotification, 'permission', {get: () => OriginalNotification.permission});

module.exports = BalloonNotification;
