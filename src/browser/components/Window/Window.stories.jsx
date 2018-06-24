// Copyright (c) 2015-2016 Yuya Ochiai
// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {storiesOf} from '@storybook/react';
import {action} from '@storybook/addon-actions';

import Window from './Window.jsx';
import '../../css/components/Window.css';
import '../../css/components/TitleBar.css';

storiesOf('Window', module).

  add('Windows', () => (
    <Window
      platform='win32'
      title='Storybook'
      controls={true}
      theme='light'
      onCloseClick={action('clicked close')}
      onMinimizeClick={action('clicked minimize')}
      onMaximizeClick={action('clicked maximize')}
      onMenuClick={action('clicked menu')}
    >
      <p>{'Hello Storybook.'}</p>
    </Window>
  )).
  add('Windows (Dark)', () => (
    <Window
      platform='win32'
      title='Storybook'
      controls={true}
      theme='dark'
    >
      <p>{'Hello Storybook.'}</p>
    </Window>
  )).
  add('macOS', () => (
    <Window platform='darwin'>
      <p>{'Hello Storybook.'}</p>
    </Window>
  )).
  add('Linux', () => (
    <Window platform='linux'>
      <p>{'Hello Storybook.'}</p>
    </Window>
  ));
