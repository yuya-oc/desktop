// Copyright (c) 2015-2016 Yuya Ochiai
// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint "react/no-set-state": 2 */

import url from 'url';

import React from 'react';
import PropTypes from 'prop-types';
import {CSSTransition, TransitionGroup} from 'react-transition-group';
import {Grid, Row} from 'react-bootstrap';

import {ipcRenderer, remote} from 'electron';

import Utils from '../../utils/util.js';

import LoginModal from './LoginModal.jsx';
import MattermostView from './MattermostView.jsx';
import TabBar from './TabBar.jsx';
import HoveringURL from './HoveringURL.jsx';
import PermissionRequestDialog from './PermissionRequestDialog.jsx';
import Finder from './Finder.jsx';
import NewTeamModal from './NewTeamModal.jsx';

export default class MainPage extends React.Component {
  constructor(props) {
    super(props);

    this.focusOnWebView = this.focusOnWebView.bind(this);
    this.handleOnTeamFocused = this.handleOnTeamFocused.bind(this);
    this.handleSelect = this.handleSelect.bind(this);
    this.handleTargetURLChange = this.handleTargetURLChange.bind(this);
    this.handleUnreadCountChange = this.handleUnreadCountChange.bind(this);
    this.handleUnreadCountTotalChange = this.handleUnreadCountTotalChange.bind(this);
    this.markReadAtActive = this.markReadAtActive.bind(this);
  }

  componentDidMount() {
    const self = this;

    // can't switch tabs sequencially for some reason...
    ipcRenderer.on('switch-tab', (event, key) => {
      this.handleSelect(key);
    });
    ipcRenderer.on('select-next-tab', () => {
      this.handleSelect(this.props.tabIndex + 1);
    });
    ipcRenderer.on('select-previous-tab', () => {
      this.handleSelect(this.props.tabIndex - 1);
    });

    // reload the activated tab
    ipcRenderer.on('reload-tab', () => {
      this.refs[`mattermostView${this.props.tabIndex}`].reload();
    });
    ipcRenderer.on('clear-cache-and-reload-tab', () => {
      this.refs[`mattermostView${this.props.tabIndex}`].clearCacheAndReload();
    });

    function focusListener() {
      self.handleOnTeamFocused(self.props.tabIndex);
      self.refs[`mattermostView${self.props.tabIndex}`].focusOnWebView();
    }

    const currentWindow = remote.getCurrentWindow();
    currentWindow.on('focus', focusListener);
    window.addEventListener('beforeunload', () => {
      currentWindow.removeListener('focus', focusListener);
    });

    // https://github.com/mattermost/desktop/pull/371#issuecomment-263072803
    currentWindow.webContents.on('devtools-closed', () => {
      focusListener();
    });

    //goBack and goForward
    ipcRenderer.on('go-back', () => {
      const mattermost = self.refs[`mattermostView${self.props.tabIndex}`];
      if (mattermost.canGoBack()) {
        mattermost.goBack();
      }
    });

    ipcRenderer.on('go-forward', () => {
      const mattermost = self.refs[`mattermostView${self.props.tabIndex}`];
      if (mattermost.canGoForward()) {
        mattermost.goForward();
      }
    });

    ipcRenderer.on('focus-on-webview', () => {
      this.focusOnWebView();
    });

    ipcRenderer.on('protocol-deeplink', (event, deepLinkUrl) => {
      const lastUrlDomain = Utils.getDomain(deepLinkUrl);
      for (let i = 0; i < this.props.teams.length; i++) {
        if (lastUrlDomain === Utils.getDomain(self.refs[`mattermostView${i}`].getSrc())) {
          if (this.props.tabIndex !== i) {
            this.handleSelect(i);
          }
          self.refs[`mattermostView${i}`].handleDeepLink(deepLinkUrl.replace(lastUrlDomain, ''));
          break;
        }
      }
    });
  }

  componentDidUpdate(prevProps) {
    if (prevProps.tabIndex !== this.props.tabIndex) { // i.e. When tab has been changed
      this.refs[`mattermostView${this.props.tabIndex}`].focusOnWebView();
    }
  }

  handleSelect(tabIndex) {
    const newTabIndex = (this.props.teams.length + tabIndex) % this.props.teams.length;
    const webview = document.getElementById('mattermostView' + newTabIndex);
    if (webview) {
      ipcRenderer.send('update-title', {
        title: webview.getTitle(),
      });
    }
    this.handleOnTeamFocused(newTabIndex);
    this.props.onChangeTabIndex(newTabIndex);
  }

  handleUnreadCountChange(index, unreadCount, mentionCount, isUnread, isMentioned) {
    const unreadCounts = this.props.unreadCounts.concat();
    const mentionCounts = this.props.mentionCounts.concat();
    const unreadAtActive = this.props.unreadAtActive.concat();
    const mentionAtActiveCounts = this.props.mentionAtActiveCounts.concat();
    unreadCounts[index] = unreadCount;
    mentionCounts[index] = mentionCount;

    // Never turn on the unreadAtActive flag at current focused tab.
    if (this.props.tabIndex !== index || !remote.getCurrentWindow().isFocused()) {
      unreadAtActive[index] = unreadAtActive[index] || isUnread;
      if (isMentioned) {
        mentionAtActiveCounts[index]++;
      }
    }
    this.props.onUnreadCountChange(unreadCounts, mentionCounts, unreadAtActive, mentionAtActiveCounts);
    this.handleUnreadCountTotalChange();
  }

  markReadAtActive(index) {
    const unreadAtActive = this.props.unreadAtActive.concat();
    const mentionAtActiveCounts = this.props.mentionAtActiveCounts.concat();

    unreadAtActive[index] = false;
    mentionAtActiveCounts[index] = 0;
    this.props.onUnreadCountChange(this.props.unreadCounts, this.props.mentionCounts, unreadAtActive, mentionAtActiveCounts);
    this.handleUnreadCountTotalChange();
  }

  handleUnreadCountTotalChange() {
    if (this.props.onUnreadCountChange) {
      let allUnreadCount = this.props.unreadCounts.reduce((prev, curr) => {
        return prev + curr;
      }, 0);
      this.props.unreadAtActive.forEach((state) => {
        if (state) {
          allUnreadCount += 1;
        }
      });
      let allMentionCount = this.props.mentionCounts.reduce((prev, curr) => {
        return prev + curr;
      }, 0);
      this.props.mentionAtActiveCounts.forEach((count) => {
        allMentionCount += count;
      });
      this.props.onUnreadCountTotalChange(allUnreadCount, allMentionCount);
    }
  }

  handleOnTeamFocused(index) {
    // Turn off the flag to indicate whether unread message of active channel contains at current tab.
    this.markReadAtActive(index);
  }

  handleTargetURLChange(targetURL) {
    clearTimeout(this.targetURLDisappearTimeout);
    if (targetURL === '') {
      // set delay to avoid momentary disappearance when hovering over multiple links
      this.targetURLDisappearTimeout = setTimeout(() => {
        this.props.onTargetURLChange(targetURL);
      }, 500);
    } else {
      this.props.onTargetURLChange(targetURL);
    }
  }

  focusOnWebView(e) {
    if (e.target.className !== 'finder-input') {
      this.refs[`mattermostView${this.props.tabIndex}`].focusOnWebView();
    }
  }

  render() {
    const self = this;
    let tabsRow;
    if (this.props.teams.length > 1) {
      tabsRow = (
        <Row>
          <TabBar
            id='tabBar'
            teams={this.props.teams}
            unreadCounts={this.props.unreadCounts}
            mentionCounts={this.props.mentionCounts}
            unreadAtActive={this.props.unreadAtActive}
            mentionAtActiveCounts={this.props.mentionAtActiveCounts}
            activeKey={this.props.tabIndex}
            onSelect={this.handleSelect}
            onAddServer={this.props.onClickAddServer}
            showAddServerButton={this.props.showAddServerButton}
            requestingPermission={this.props.requestingPermission}
            onClickPermissionDialog={this.props.onClickPermissionDialog}
          />
        </Row>
      );
    }

    const views = this.props.teams.map((team, index) => {
      function handleUnreadCountChange(unreadCount, mentionCount, isUnread, isMentioned) {
        self.handleUnreadCountChange(index, unreadCount, mentionCount, isUnread, isMentioned);
      }
      function handleNotificationClick() {
        self.handleSelect(index);
      }
      const id = 'mattermostView' + index;
      const isActive = self.props.tabIndex === index;

      let teamUrl = team.url;
      const deeplinkingUrl = this.props.deeplinkingUrl;
      if (deeplinkingUrl !== null && deeplinkingUrl.includes(teamUrl)) {
        teamUrl = deeplinkingUrl;
      }

      return (
        <MattermostView
          key={id}
          id={id}
          withTab={this.props.teams.length > 1}
          useSpellChecker={this.props.useSpellChecker}
          onSelectSpellCheckerLocale={this.props.onSelectSpellCheckerLocale}
          src={teamUrl}
          name={team.name}
          onTargetURLChange={self.handleTargetURLChange}
          onUnreadCountChange={handleUnreadCountChange}
          onNotificationClick={handleNotificationClick}
          ref={id}
          active={isActive}
        />);
    });
    const viewsRow = (
      <Row>
        {views}
      </Row>);

    let request = null;
    let authServerURL = null;
    let authInfo = null;
    if (this.props.loginQueue.length !== 0) {
      request = this.props.loginQueue[0].request;
      const tmpURL = url.parse(this.props.loginQueue[0].request.url);
      authServerURL = `${tmpURL.protocol}//${tmpURL.host}`;
      authInfo = this.props.loginQueue[0].authInfo;
    }
    const modal = (
      <NewTeamModal
        show={this.props.showNewTeamModal}
        onClose={this.props.onCloseNewTeamModal}
        onSave={(newTeam) => {
          this.props.onCloseNewTeamModal();
          const newTeams = this.props.teams.concat(newTeam);
          this.props.onTeamConfigChange(newTeams);
          this.handleSelect(newTeams.length - 1);
        }}
      />
    );
    return (
      <div
        className='MainPage'
        onClick={this.focusOnWebView}
      >
        <LoginModal
          show={this.props.loginQueue.length !== 0}
          request={request}
          authInfo={authInfo}
          authServerURL={authServerURL}
          onLogin={this.props.onLogin}
          onCancel={this.props.onLoginCancel}
        />
        {this.props.teams.length === 1 && this.props.requestingPermission[0] ? // eslint-disable-line multiline-ternary
          <PermissionRequestDialog
            id='MainPage-permissionDialog'
            placement='bottom'
            {...this.props.requestingPermission[0]}
            onClickAllow={this.props.onClickPermissionDialog.bind(null, 0, 'allow')}
            onClickBlock={this.props.onClickPermissionDialog.bind(null, 0, 'block')}
            onClickClose={this.props.onClickPermissionDialog.bind(null, 0, 'close')}
          /> : null
        }
        <Grid fluid={true}>
          { tabsRow }
          { viewsRow }
          { this.props.finderVisible ? (
            <Finder
              webviewKey={this.props.tabIndex}
              close={this.props.onCloseFinder}
              focusState={this.props.focusFinder}
              inputBlur={this.props.onBlurFinder}
            />
          ) : null}
        </Grid>
        <TransitionGroup>
          { (this.props.targetURL === '') ?
            null :
            <CSSTransition
              classNames='hovering'
              timeout={{enter: 300, exit: 500}}
            >
              <HoveringURL
                key='hoveringURL'
                targetURL={this.props.targetURL}
              />
            </CSSTransition>
          }
        </TransitionGroup>
        <div>
          { modal }
        </div>
      </div>
    );
  }
}

MainPage.propTypes = {
  onUnreadCountTotalChange: PropTypes.func.isRequired,
  teams: PropTypes.array.isRequired,
  onTeamConfigChange: PropTypes.func.isRequired,
  tabIndex: PropTypes.number.isRequired,
  onChangeTabIndex: PropTypes.func,
  useSpellChecker: PropTypes.bool.isRequired,
  onSelectSpellCheckerLocale: PropTypes.func.isRequired,
  deeplinkingUrl: PropTypes.string,
  showAddServerButton: PropTypes.bool.isRequired,
  requestingPermission: TabBar.propTypes.requestingPermission,
  onClickPermissionDialog: PropTypes.func,
  targetURL: PropTypes.string,
  onTargetURLChange: PropTypes.func,
  unreadCounts: PropTypes.array,
  mentionCounts: PropTypes.array,
  unreadAtActive: PropTypes.array,
  mentionAtActiveCounts: PropTypes.array,
  onUnreadCountChange: PropTypes.func,
  loginQueue: PropTypes.array,
  onLogin: PropTypes.func,
  onLoginCancel: PropTypes.func,
  finderVisible: PropTypes.bool,
  focusFinder: PropTypes.bool,
  onCloseFinder: PropTypes.func,
  onBlurFinder: PropTypes.func,
  showNewTeamModal: PropTypes.bool,
  onCloseNewTeamModal: PropTypes.func,
  onClickAddServer: PropTypes.func,
};

export function determineInitialIndex(teamURLs, deeplinkingUrl) {
  if (deeplinkingUrl === null) {
    return 0;
  }
  const index = teamURLs.findIndex((teamURL) => deeplinkingUrl.includes(teamURL));
  if (index === -1) {
    return 0;
  }
  return index;
}
