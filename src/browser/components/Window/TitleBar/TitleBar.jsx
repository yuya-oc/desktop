// Copyright (c) 2015-2016 Yuya Ochiai
// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import propTypes from 'prop-types';
import {Glyphicon} from 'react-bootstrap';
import {TitleBar as ReactDesktopTitleBar, View} from 'react-desktop';

class TitleBar extends React.Component {
  constructor() {
    super();
    this.windowFocus = this.windowFocus.bind(this);
    this.windowBlur = this.windowBlur.bind(this);
    this.state = {
      isWindowFocused: document.hasFocus(),
    };
  }

  componentDidMount() {
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', this.windowFocus);
      window.addEventListener('blur', this.windowBlur);
    }
  }

  componentWillUnmount() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('focus', this.windowFocus);
      window.removeEventListener('blur', this.windowBlur);
    }
  }

  windowFocus() {
    this.setState({isWindowFocused: true}); // eslint-disable-line react/no-set-state
  }

  windowBlur() {
    this.setState({isWindowFocused: false}); // eslint-disable-line react/no-set-state
  }

  render() {
    return (
      <div
        className={[
          'TitleBar',
          this.state.isWindowFocused ? 'TitleBar_focused' : 'TitleBar_unfocused',
        ].join(' ')}
      >
        <View
          className={[
            this.props.theme === 'dark' ? 'TitleBar-DarkMenuButton' : 'TitleBar-MenuButton',
          ]}
          background={true}
          color={this.props.color}
          theme={this.props.theme}
        >
          <View
            height={31}
            horizontalAlignment='center'
            width={32}
            verticalAlignment='center'
          >
            <Glyphicon glyph='menu-hamburger'/>
          </View>
        </View>
        <ReactDesktopTitleBar
          background={true}
          controls={this.props.controls}
          color={this.props.color}
          isMaximized={this.props.isMaximized}
          onCloseClick={this.props.onCloseClick}
          onMaximizeClick={this.props.onMaximizeClick}
          onMinimizeClick={this.props.onMinimizeClick}
          onRestoreDownClick={this.props.onRestoreDownClick}
          title={this.props.title}
          theme={this.props.theme}
        />
      </div>
    );
  }
}

TitleBar.propTypes = {
  controls: propTypes.bool,
  color: propTypes.string,
  isMaximized: propTypes.bool,
  onCloseClick: propTypes.func,
  onMaximizeClick: propTypes.func,
  onMinimizeClick: propTypes.func,
  onRestoreDownClick: propTypes.func,
  title: propTypes.string,
  theme: propTypes.oneOf(['light', 'dark']),
};

export default TitleBar;
