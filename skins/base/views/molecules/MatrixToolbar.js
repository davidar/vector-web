/*
Copyright 2015 OpenMarket Ltd

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

'use strict';

var React = require('react');

var ComponentBroker = require('../../../../src/ComponentBroker');

var LogoutButton = ComponentBroker.get("atoms/LogoutButton");
var EnableNotificationsButton = ComponentBroker.get("atoms/EnableNotificationsButton");

var MatrixToolbarController = require("../../../../src/controllers/molecules/MatrixToolbar");
var Notifier = ComponentBroker.get('organisms/Notifier');

module.exports = React.createClass({
    displayName: 'MatrixToolbar',
    mixins: [MatrixToolbarController],

    hideToolbar: function() {
        Notifier.setToolbarHidden(true);
    },

    render: function() {
        return (
            <div className="mx_MatrixToolbar">
                You are not receiving desktop notifications. <EnableNotificationsButton />
                <div className="mx_MatrixToolbar_close"><img src="img/close-white.png" width="16" height="16" onClick={ this.hideToolbar } /></div>
            </div>
        );
    }
});

