const JsonFileManager = require('../common/JsonFileManager');

class AppStateManager extends JsonFileManager {
  set lastAppVersion(version) {
    this.setValue('lastAppVersion', version);
  }

  get lastAppVersion() {
    return this.getValue('lastAppVersion');
  }

  set skippedVersion(version) {
    this.setValue('skippedVersion', version);
  }

  get skippedVersion() {
    return this.getValue('skippedVersion');
  }

  set updateCheckedDate(date) {
    this.setValue('updateCheckedDate', date.toISOString());
  }

  get updateCheckedDate() {
    const date = this.getValue('updateCheckedDate');
    if (date) {
      return new Date(date);
    }
    return null;
  }
}

module.exports = AppStateManager;
