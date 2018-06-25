// Copyright (c) 2015-2016 Yuya Ochiai
// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {storiesOf} from '@storybook/react';
import {action} from '@storybook/addon-actions';

import Tab from '../Tab';

import TabBar from './TabBar.jsx';
import '../../css/components/Tab.css';
import '../../css/components/TabBar.css';

storiesOf('TabBar', module).

  add('Typical', () => (
    <TabBar
      activeKey={1}
      onSelect={action('selected tab')}
      onAddClick={action('clicked add')}
    >
      <Tab
        eventKey={1}
        label='Normal'
      />
      <Tab
        eventKey={2}
        unreadCount={1}
        label='Has Unread'
      />
      <Tab
        eventKey={3}
        mentionCount={1}
        label='Has Mention'
      />
      <Tab
        eventKey={4}
        label='Long long long long long long label'
      />
    </TabBar>
  ));
