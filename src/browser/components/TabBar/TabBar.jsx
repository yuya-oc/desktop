// Copyright (c) 2015-2016 Yuya Ochiai
// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import propTypes from 'prop-types';
import {Nav, NavItem, Glyphicon} from 'react-bootstrap';

const EVENT_KEY_ADD_BUTTON = 'TabBar-AddServerButton';

class TabBar extends React.Component {
  constructor(props) {
    super(props);
    this.handleSelect = this.handleSelect.bind(this);
  }

  handleSelect(eventKey, event) {
    if (eventKey === EVENT_KEY_ADD_BUTTON) {
      if (this.props.onAddClick) {
        this.props.onAddClick(event);
      }
    } else if (this.props.onSelect) {
      this.props.onSelect(eventKey, event);
    }
  }

  render() {
    return (
      <Nav
        className='TabBar'
        bsStyle='tabs'
        activeKey={this.props.activeKey}
        onSelect={this.handleSelect}
      >
        {this.props.children}
        <NavItem
          className='Tab TabBar-AddButton'
          eventKey={EVENT_KEY_ADD_BUTTON}
        >
          <Glyphicon glyph='plus'/>
        </NavItem>
      </Nav>
    );
  }
}

TabBar.propTypes = {
  activeKey: propTypes.any,
  onSelect: propTypes.func,
  onAddClick: propTypes.func,
  children: propTypes.node,
};

export default TabBar;
