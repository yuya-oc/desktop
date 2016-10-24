'use strict';

window.eval = global.eval = function() {
  throw new Error("Sorry, Mattermost does not support window.eval() for security reasons.");
}

const React = require('react');
const ReactDOM = require('react-dom');
const ReactBootstrap = require('react-bootstrap');

const Grid = ReactBootstrap.Grid;
const Row = ReactBootstrap.Row;
const Col = ReactBootstrap.Col;
const Nav = ReactBootstrap.Nav;
const NavItem = ReactBootstrap.NavItem;
const Badge = ReactBootstrap.Badge;
const ListGroup = ReactBootstrap.ListGroup;
const ListGroupItem = ReactBootstrap.ListGroupItem;

const LoginModal = require('./components/loginModal.jsx');

const {remote, ipcRenderer, webFrame, shell} = require('electron');

const osLocale = require('os-locale');
const fs = require('fs');
const url = require('url');
const path = require('path');

const settings = require('../common/settings');

remote.getCurrentWindow().removeAllListeners('focus');

var MainPage = React.createClass({
  getInitialState: function() {
    return {
      key: 0,
      unreadCounts: new Array(this.props.teams.length),
      mentionCounts: new Array(this.props.teams.length),
      unreadAtActive: new Array(this.props.teams.length),
      mentionAtActiveCounts: new Array(this.props.teams.length),
      loginQueue: []
    };
  },
  componentDidMount: function() {
    var thisObj = this;
    ipcRenderer.on('login-request', function(event, request, authInfo) {
      thisObj.setState({
        loginRequired: true
      });
      const loginQueue = thisObj.state.loginQueue;
      loginQueue.push({
        request: request,
        authInfo: authInfo
      });
      thisObj.setState({
        loginQueue: loginQueue
      });
    });
    // can't switch tabs sequencially for some reason...
    ipcRenderer.on('switch-tab', (event, key) => {
      this.handleSelect(key);
    });
    ipcRenderer.on('select-next-tab', (event) => {
      this.handleSelect(this.state.key + 1);
    });
    ipcRenderer.on('select-previous-tab', (event) => {
      this.handleSelect(this.state.key - 1);
    });

    // reload the activated tab
    ipcRenderer.on('reload-tab', (event) => {
      this.refs[`mattermostView${this.state.key}`].reload();
    });
    ipcRenderer.on('clear-cache-and-reload-tab', (event) => {
      this.refs[`mattermostView${this.state.key}`].clearCacheAndReload();
    });

    // activate search box in current tab
    ipcRenderer.on('activate-search-box', (event) => {
      let webview = document.getElementById('mattermostView' + thisObj.state.key);
      webview.send('activate-search-box');
    });

    // activate search box in current chunnel
    ipcRenderer.on('activate-search-box-in-channel', (event) => {
      let webview = document.getElementById('mattermostView' + thisObj.state.key);
      webview.send('activate-search-box-in-channel');
    });

    var focusListener = function() {
      thisObj.handleOnTeamFocused(thisObj.state.key);
      thisObj.refs[`mattermostView${thisObj.state.key}`].focusOnWebView();
    };

    var currentWindow = remote.getCurrentWindow();
    currentWindow.on('focus', focusListener);
    window.addEventListener('beforeunload', function() {
      currentWindow.removeListener('focus', focusListener);
    });

    //goBack and goForward
    ipcRenderer.on('go-back', () => {
      const mattermost = thisObj.refs[`mattermostView${thisObj.state.key}`];
      if (mattermost.canGoBack()) {
        mattermost.goBack();
      }
    });

    ipcRenderer.on('go-forward', () => {
      const mattermost = thisObj.refs[`mattermostView${thisObj.state.key}`];
      if (mattermost.canGoForward()) {
        mattermost.goForward();
      }
    });
  },
  componentDidUpdate: function(prevProps, prevState) {
    if (prevState.key !== this.state.key) { // i.e. When tab has been changed
      this.refs[`mattermostView${this.state.key}`].focusOnWebView();
    }
  },
  handleSelect: function(key) {
    const newKey = (this.props.teams.length + key) % this.props.teams.length;
    this.setState({
      key: newKey
    });
    this.handleOnTeamFocused(newKey);

    var webview = document.getElementById('mattermostView' + newKey);
    ipcRenderer.send('update-title', {
      title: webview.getTitle()
    });
  },
  handleUnreadCountChange: function(index, unreadCount, mentionCount, isUnread, isMentioned) {
    var unreadCounts = this.state.unreadCounts;
    var mentionCounts = this.state.mentionCounts;
    var unreadAtActive = this.state.unreadAtActive;
    var mentionAtActiveCounts = this.state.mentionAtActiveCounts;
    unreadCounts[index] = unreadCount;
    mentionCounts[index] = mentionCount;
    // Never turn on the unreadAtActive flag at current focused tab.
    if (this.state.key !== index || !remote.getCurrentWindow().isFocused()) {
      unreadAtActive[index] = unreadAtActive[index] || isUnread;
      if (isMentioned) {
        mentionAtActiveCounts[index]++;
      }
    }
    this.setState({
      unreadCounts: unreadCounts,
      mentionCounts: mentionCounts,
      unreadAtActive: unreadAtActive,
      mentionAtActiveCounts: mentionAtActiveCounts
    });
    this.handleUnreadCountTotalChange();
  },
  markReadAtActive: function(index) {
    var unreadAtActive = this.state.unreadAtActive;
    var mentionAtActiveCounts = this.state.mentionAtActiveCounts;
    unreadAtActive[index] = false;
    mentionAtActiveCounts[index] = 0;
    this.setState({
      unreadAtActive: unreadAtActive,
      mentionAtActiveCounts: mentionAtActiveCounts
    });
    this.handleUnreadCountTotalChange();
  },
  handleUnreadCountTotalChange: function() {
    if (this.props.onUnreadCountChange) {
      var allUnreadCount = this.state.unreadCounts.reduce(function(prev, curr) {
        return prev + curr;
      }, 0);
      this.state.unreadAtActive.forEach(function(state) {
        if (state) {
          allUnreadCount += 1;
        }
      });
      var allMentionCount = this.state.mentionCounts.reduce(function(prev, curr) {
        return prev + curr;
      }, 0);
      this.state.mentionAtActiveCounts.forEach(function(count) {
        allMentionCount += count;
      });
      this.props.onUnreadCountChange(allUnreadCount, allMentionCount);
    }
  },
  handleOnTeamFocused: function(index) {
    // Turn off the flag to indicate whether unread message of active channel contains at current tab.
    this.markReadAtActive(index);
  },

  visibleStyle: function(visible) {
    var visibility = visible ? 'visible' : 'hidden';
    return {
      position: 'absolute',
      top: (this.props.teams.length > 1) ? 42 : 0,
      right: 0,
      bottom: 0,
      left: 0,
      visibility: visibility
    };
  },

  handleLogin: function(request, username, password) {
    ipcRenderer.send('login-credentials', request, username, password);
    const loginQueue = this.state.loginQueue;
    loginQueue.shift();
    this.setState(loginQueue);
  },
  handleLoginCancel: function() {
    const loginQueue = this.state.loginQueue;
    loginQueue.shift();
    this.setState(loginQueue);
  },
  render: function() {
    var thisObj = this;

    var tabs_row;
    if (this.props.teams.length > 1) {
      tabs_row = (
        <Row>
          <TabBar id="tabBar" teams={ this.props.teams } unreadCounts={ this.state.unreadCounts } mentionCounts={ this.state.mentionCounts } unreadAtActive={ this.state.unreadAtActive } mentionAtActiveCounts={ this.state.mentionAtActiveCounts }
            activeKey={ this.state.key } onSelect={ this.handleSelect }></TabBar>
        </Row>
      );
    }

    var views = this.props.teams.map(function(team, index) {
      var handleUnreadCountChange = function(unreadCount, mentionCount, isUnread, isMentioned) {
        thisObj.handleUnreadCountChange(index, unreadCount, mentionCount, isUnread, isMentioned);
      };
      var handleNotificationClick = function() {
        thisObj.handleSelect(index);
      }
      var id = 'mattermostView' + index;
      var is_active = thisObj.state.key === index;
      return (<MattermostView key={ id } id={ id } style={ thisObj.visibleStyle(is_active) } src={ team.url } name={ team.name } onUnreadCountChange={ handleUnreadCountChange }
                onNotificationClick={ handleNotificationClick } ref={ id } active={ is_active } />)
    });
    var views_row = (<Row>
                       { views }
                     </Row>);

    var request = null;
    var authServerURL = null;
    var authInfo = null;
    if (this.state.loginQueue.length !== 0) {
      request = this.state.loginQueue[0].request;
      const tmp_url = url.parse(this.state.loginQueue[0].request.url);
      authServerURL = `${tmp_url.protocol}//${tmp_url.host}`;
      authInfo = this.state.loginQueue[0].authInfo;
    }
    return (
      <div>
        <LoginModal show={ this.state.loginQueue.length !== 0 } request={ request } authInfo={ authInfo } authServerURL={ authServerURL } onLogin={ this.handleLogin }
          onCancel={ this.handleLoginCancel }></LoginModal>
        <Grid fluid>
          { tabs_row }
          { views_row }
        </Grid>
      </div>
      );
  }
});

var TabBar = React.createClass({
  render: function() {
    var thisObj = this;
    var tabs = this.props.teams.map(function(team, index) {
      var unreadCount = 0;
      var badgeStyle = {
        background: '#FF1744',
        float: 'right',
        color: 'white',
        minWidth: '19px',
        fontSize: '12px',
        textAlign: 'center',
        lineHeight: '20px',
        height: '19px',
        marginLeft: '5px',
        borderRadius: '50%',
      };

      if (thisObj.props.unreadCounts[index] > 0) {
        unreadCount = thisObj.props.unreadCounts[index];
      }
      if (thisObj.props.unreadAtActive[index]) {
        unreadCount += 1;
      }

      var mentionCount = 0;
      if (thisObj.props.mentionCounts[index] > 0) {
        mentionCount = thisObj.props.mentionCounts[index];
      }
      if (thisObj.props.mentionAtActiveCounts[index] > 0) {
        mentionCount += thisObj.props.mentionAtActiveCounts[index];
      }

      var badge;
      if (mentionCount != 0) {
        badge = (<div style={ badgeStyle }>
                   { mentionCount }
                 </div>);
      }
      if (unreadCount == 0) {
        var id = 'teamTabItem' + index;
        return (<NavItem className="teamTabItem" key={ id } id={ id } eventKey={ index }>
                  { team.name }
                  { ' ' }
                  { badge }
                </NavItem>);
      } else {
        var id = 'teamTabItem' + index;
        return (<NavItem className="teamTabItem" key={ id } id={ id } eventKey={ index }>
                  <b>{ team.name }</b>
                  { ' ' }
                  { badge }
                </NavItem>);
      }
    });
    return (
      <Nav id={ this.props.id } bsStyle="tabs" activeKey={ this.props.activeKey } onSelect={ this.props.onSelect }>
        { tabs }
      </Nav>
      );
  }
});

var MattermostView = React.createClass({
  getInitialState: function() {
    return {
      errorInfo: null
    };
  },
  handleUnreadCountChange: function(unreadCount, mentionCount, isUnread, isMentioned) {
    if (this.props.onUnreadCountChange) {
      this.props.onUnreadCountChange(unreadCount, mentionCount, isUnread, isMentioned);
    }
  },

  componentDidMount: function() {
    var thisObj = this;
    var webview = ReactDOM.findDOMNode(this.refs.webview);

    // This option disables the same-origin policy and allows js/css/plugins not only content like images.
    if (config.disablewebsecurity === true) {
      // webview.setAttribute('disablewebsecurity', false) disables websecurity. (electron's bug?)
      webview.setAttribute('disablewebsecurity', true);
    }

    webview.addEventListener('did-fail-load', function(e) {
      console.log(thisObj.props.name, 'webview did-fail-load', e);
      if (e.errorCode === -3) { // An operation was aborted (due to user action).
        return;
      }

      thisObj.setState({
        errorInfo: e
      });
      const reload = () => {
        window.removeEventListener('online', reload);
        thisObj.reload();
      };
      if (navigator.onLine) {
        setTimeout(reload, 30000);
      } else {
        window.addEventListener('online', reload);
      }
    });

    // Open link in browserWindow. for exmaple, attached files.
    webview.addEventListener('new-window', function(e) {
      var currentURL = url.parse(webview.getURL());
      var destURL = url.parse(e.url);
      if (destURL.protocol !== 'http:' && destURL.protocol !== 'https:') {
        ipcRenderer.send('confirm-protocol', destURL.protocol, e.url);
        return;
      }
      if (currentURL.host === destURL.host) {
        // New window should disable nodeIntergration.
        window.open(e.url, 'Mattermost', 'nodeIntegration=no');
      } else {
        // if the link is external, use default browser.
        shell.openExternal(e.url);
      }
    });

    webview.addEventListener("dom-ready", function() {
      // webview.openDevTools();

      // In order to apply the zoom level to webview.
      webFrame.setZoomLevel(parseInt(localStorage.getItem('zoomLevel')));

      // Use 'Meiryo UI' and 'MS Gothic' to prevent CJK fonts on Windows(JP).
      if (process.platform === 'win32') {
        var applyCssFile = function(cssFile) {
          fs.readFile(cssFile, 'utf8', function(err, data) {
            if (err) {
              console.log(err);
              return;
            }
            webview.insertCSS(data);
          });
        };

        osLocale(function(err, locale) {
          if (err) {
            console.log(err);
            return;
          }
          if (locale === 'ja_JP') {
            applyCssFile(__dirname + '/css/jp_fonts.css');
          }
        });
      }

      require('electron-context-menu')({
        window: webview
      });
    });

    webview.addEventListener('ipc-message', function(event) {
      switch (event.channel) {
        case 'onUnreadCountChange':
          var unreadCount = event.args[0];
          var mentionCount = event.args[1];
          // isUnread and isMentioned is pulse flag.
          var isUnread = event.args[2];
          var isMentioned = event.args[3];
          thisObj.handleUnreadCountChange(unreadCount, mentionCount, isUnread, isMentioned);
          break;
        case 'onNotificationClick':
          thisObj.props.onNotificationClick();
          break;
      }
    });

    webview.addEventListener('page-title-updated', function(event) {
      if (thisObj.props.active) {
        ipcRenderer.send('update-title', {
          title: event.title
        });
      }
    });

    webview.addEventListener('console-message', (e) => {
      const message = `[${this.props.name}] ${e.message}`;
      switch (e.level) {
        case 0:
          console.log(message);
          break;
        case 1:
          console.warn(message);
          break;
        case 2:
          console.error(message);
          break;
        default:
          console.log(message);
          break;
      }
    });
  },
  reload: function() {
    this.setState({
      errorInfo: null
    });
    var webview = ReactDOM.findDOMNode(this.refs.webview);
    webview.reload();
  },
  clearCacheAndReload() {
    this.setState({
      errorInfo: null
    });
    var webContents = ReactDOM.findDOMNode(this.refs.webview).getWebContents();
    webContents.session.clearCache(() => {
      webContents.reload();
    });
  },

  focusOnWebView: function() {
    const webview = ReactDOM.findDOMNode(this.refs.webview);
    if (!webview.getWebContents().isFocused()) {
      webview.focus();
      webview.getWebContents().focus();
    }
  },

  canGoBack() {
    const webview = ReactDOM.findDOMNode(this.refs.webview);
    return webview.getWebContents().canGoBack();
  },

  canGoForward() {
    const webview = ReactDOM.findDOMNode(this.refs.webview);
    return webview.getWebContents().canGoForward();
  },

  goBack() {
    const webview = ReactDOM.findDOMNode(this.refs.webview);
    webview.getWebContents().goBack();
  },

  goForward() {
    const webview = ReactDOM.findDOMNode(this.refs.webview);
    webview.getWebContents().goForward();
  },

  render: function() {
    const errorView = this.state.errorInfo ? (<ErrorView id={ this.props.id + '-fail' } style={ this.props.style } className="errorView" errorInfo={ this.state.errorInfo }></ErrorView>) : null;
    // 'disablewebsecurity' is necessary to display external images.
    // However, it allows also CSS/JavaScript.
    // So webview should use 'allowDisplayingInsecureContent' as same as BrowserWindow.

    // Need to keep webview mounted when failed to load.
    return (<div>
              { errorView }
              <webview id={ this.props.id } className="mattermostView" style={ this.props.style } preload="webview/mattermost.js" src={ this.props.src } ref="webview" nodeintegration="false"></webview>
            </div>);
  }
});

// ErrorCode: https://code.google.com/p/chromium/codesearch#chromium/src/net/base/net_error_list.h
const errorPage = {
  tableStyle: {
    display: 'table',
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: '0',
    left: '0'
  },

  cellStyle: {
    display: 'table-cell',
    verticalAlign: 'middle'
  },

  bullets: {
    paddingLeft: '15px',
    lineHeight: '1.7'
  },

  techInfo: {
    fontSize: '12px',
    color: '#aaa'
  },
};

var ErrorView = React.createClass({
  render: function() {
    return (
      <Grid id={ this.props.id } style={ this.props.style }>
        <div style={ errorPage.tableStyle }>
          <div style={ errorPage.cellStyle }>
            <Row>
              <Col xs={ 0 } sm={ 1 } md={ 1 } lg={ 2 } />
              <Col xs={ 12 } sm={ 10 } md={ 10 } lg={ 8 }>
              <h2>Cannot connect to Mattermost</h2>
              <hr />
              <p>We're having trouble connecting to Mattermost. If refreshing this page (Ctrl+R or Command+R) does not work please verify that:</p>
              <br />
              <ul style={ errorPage.bullets }>
                <li>Your computer is connected to the internet.</li>
                <li>The Mattermost URL
                  { ' ' }
                  <a href={ this.props.errorInfo.validatedURL }>
                    { this.props.errorInfo.validatedURL }
                  </a> is correct.</li>
                <li>You can reach
                  { ' ' }
                  <a href={ this.props.errorInfo.validatedURL }>
                    { this.props.errorInfo.validatedURL }
                  </a> from a browser window.</li>
              </ul>
              <br />
              <div style={ errorPage.techInfo }>
                { this.props.errorInfo.errorDescription } (
                { this.props.errorInfo.errorCode })</div>
              </Col>
              <Col xs={ 0 } sm={ 1 } md={ 1 } lg={ 2 } />
            </Row>
          </div>
        </div>
      </Grid>
      );
  }
});

var config;
try {
  var configFile = remote.getGlobal('config-file');
  config = settings.readFileSync(configFile);
} catch (e) {
  window.location = 'settings.html';
}
if (config.teams.length === 0) {
  window.location = 'settings.html';
}

var showUnreadBadgeWindows = function(unreadCount, mentionCount) {
  const badge = require('./js/badge');
  const sendBadge = function(dataURL, description) {
    // window.setOverlayIcon() does't work with NativeImage across remote boundaries.
    // https://github.com/atom/electron/issues/4011
    ipcRenderer.send('update-unread', {
      overlayDataURL: dataURL,
      description: description,
      unreadCount: unreadCount,
      mentionCount: mentionCount
    });
  };

  if (mentionCount > 0) {
    const dataURL = badge.createDataURL(mentionCount.toString());
    sendBadge(dataURL, 'You have unread mentions (' + mentionCount + ')');
  } else if (unreadCount > 0 && config.showUnreadBadge) {
    const dataURL = badge.createDataURL('•');
    sendBadge(dataURL, 'You have unread channels (' + unreadCount + ')');
  } else {
    sendBadge(null, 'You have no unread messages');
  }
}

var showUnreadBadgeOSX = function(unreadCount, mentionCount) {
  if (mentionCount > 0) {
    remote.app.dock.setBadge(mentionCount.toString());
  } else if (unreadCount > 0 && config.showUnreadBadge) {
    remote.app.dock.setBadge('•');
  } else {
    remote.app.dock.setBadge('');
  }

  ipcRenderer.send('update-unread', {
    unreadCount: unreadCount,
    mentionCount: mentionCount
  });
}

var showUnreadBadgeLinux = function(unreadCount, mentionCount) {
  if (remote.app.isUnityRunning()) {
    remote.app.setBadgeCount(mentionCount);
  }

  ipcRenderer.send('update-unread', {
    unreadCount: unreadCount,
    mentionCount: mentionCount
  });
}

var showUnreadBadge = function(unreadCount, mentionCount) {
  switch (process.platform) {
    case 'win32':
      showUnreadBadgeWindows(unreadCount, mentionCount);
      break;
    case 'darwin':
      showUnreadBadgeOSX(unreadCount, mentionCount);
      break;
    case 'linux':
      showUnreadBadgeLinux(unreadCount, mentionCount);
      break;
    default:
  }
}

if (!localStorage.getItem('zoomLevel')) {
  localStorage.setItem('zoomLevel', 0);
}
webFrame.setZoomLevel(parseInt(localStorage.getItem('zoomLevel')));

ipcRenderer.on('zoom-in', (event, increment) => {
  const zoomLevel = webFrame.getZoomLevel() + increment
  webFrame.setZoomLevel(zoomLevel);
  localStorage.setItem('zoomLevel', zoomLevel);
});

ipcRenderer.on('zoom-reset', (event) => {
  webFrame.setZoomLevel(0);
  localStorage.setItem('zoomLevel', 0);
});

ReactDOM.render(
  <MainPage teams={ config.teams } onUnreadCountChange={ showUnreadBadge } />,
  document.getElementById('content')
);
