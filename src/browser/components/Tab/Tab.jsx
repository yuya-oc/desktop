// Copyright (c) 2015-2016 Yuya Ochiai
// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import propTypes from 'prop-types';
import {NavItem} from 'react-bootstrap';

const Tab = (props) => {
  let badge = null;
  if (props.mentionCount !== 0) {
    badge = (
      <span
        className='Tab-Badge'
      >
        {props.mentionCount}
      </span>
    );
  }
  return (
    <NavItem
      className='Tab'
      eventKey={props.eventKey}
      title={props.label}
      {...props}
    >
      <span
        className={'Tab-Label' + (props.unreadCount === 0 ? '' : ' Tab-UnreadLabel')}
      >
        {props.label}
      </span>
      {badge}
    </NavItem>
  );
};

Tab.propTypes = {
  eventKey: propTypes.any,
  label: propTypes.string,
  unreadCount: propTypes.bool,
  mentionCount: propTypes.number,
};

Tab.defaultProps = {
  unreadCount: 0,
  mentionCount: 0,
};

export default Tab;
