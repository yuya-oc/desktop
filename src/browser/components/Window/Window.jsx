// Copyright (c) 2015-2016 Yuya Ochiai
// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import propTypes from 'prop-types';
import {Window as ReactDesktopWindow} from 'react-desktop/windows';

import TitleBar from './TitleBar';

const Window = (props) => {
  if (props.platform === 'win32') {
    return (
      <ReactDesktopWindow
        className='Window'
        chrome={true}
        color={props.color}
        theme={props.theme}
      >
        <TitleBar
          controls={props.controls}
          color={props.color}
          isMaximized={props.isMaximized}
          theme={props.theme}
          title={props.title}
          onCloseClick={props.onCloseClick}
          onMaximizeClick={props.onMaximizeClick}
          onMinimizeClick={props.onMinimizeClick}
          onRestoreDownClick={props.onRestoreDownClick}
          onMenuClick={props.onMenuClick}
        />
        {props.children}
      </ReactDesktopWindow>
    );
  }
  return (
    <div style={{width: '100vw', height: '100vh'}}>
      {props.children}
    </div>
  );
};

Window.propTypes = {
  children: propTypes.node,
  platform: propTypes.oneOf(['win32', 'darwin', 'linux']).isRequired,
  color: propTypes.string,
  controls: propTypes.bool,
  isMaximized: propTypes.bool,
  theme: propTypes.oneOf(['light', 'dark']),
  title: propTypes.string,
  onCloseClick: propTypes.func,
  onMaximizeClick: propTypes.func,
  onMinimizeClick: propTypes.func,
  onRestoreDownClick: propTypes.func,
  onMenuClick: propTypes.func,
};

export default Window;
