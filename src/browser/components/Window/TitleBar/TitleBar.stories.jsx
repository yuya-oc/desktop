// Copyright (c) 2015-2016 Yuya Ochiai
// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {storiesOf} from '@storybook/react';
import {action} from '@storybook/addon-actions';

import TitleBar from './TitleBar.jsx';
import '../../../css/components/TitleBar.css';

storiesOf('TitleBar', module).

  add('Windows', () => (
    <TitleBar
      title='TitleBar for Windows'
      controls={true}
      onCloseClick={action('clicked close')}
      color='#e00000'
    />
  )).
  add('Windows (Dark)', () => (
    <TitleBar
      title='TitleBar for Windows'
      controls={true}
      onCloseClick={action('clicked close')}
      color='#e00000'
      theme='dark'
    />
  ));
