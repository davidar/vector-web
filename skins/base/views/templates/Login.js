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

var ComponentBroker = require("../../../../src/ComponentBroker");
var MatrixClientPeg = require("../../../../src/MatrixClientPeg");

var ProgressBar = ComponentBroker.get("molecules/ProgressBar");
var Loader = require("react-loader");

var LoginController = require("../../../../src/controllers/templates/Login");

var ServerConfig = ComponentBroker.get("molecules/ServerConfig");

module.exports = React.createClass({
    DEFAULT_HS_URL: 'https://matrix.org',
    DEFAULT_IS_URL: 'https://vector.im',

    displayName: 'Login',
    mixins: [LoginController],

    getInitialState: function() {
        return {
            serverConfigVisible: false
        };
    },

    componentWillMount: function() {
        this.onHSChosen();
        this.customHsUrl = this.DEFAULT_HS_URL;
        this.customIsUrl = this.DEFAULT_IS_URL;
    },

    getHsUrl: function() {
        if (this.state.serverConfigVisible) {
            return this.customHsUrl;
        } else {
            return this.DEFAULT_HS_URL;
        }
    },

    getIsUrl: function() {
        if (this.state.serverConfigVisible) {
            return this.customIsUrl;
        } else {
            return this.DEFAULT_IS_URL;
        }
    },

    onServerConfigVisibleChange: function(ev) {
        this.setState({
            serverConfigVisible: ev.target.checked
        }, this.onHsUrlChanged);
    },

    /**
     * Gets the form field values for the current login stage
     */
    getFormVals: function() {
        return {
            'username': this.refs.user.getDOMNode().value.trim(),
            'password': this.refs.pass.getDOMNode().value.trim()
        };
    },

    onHsUrlChanged: function() {
        var newHsUrl = this.refs.serverConfig.getHsUrl().trim();
        var newIsUrl = this.refs.serverConfig.getIsUrl().trim();

        if (newHsUrl == this.customHsUrl &&
            newIsUrl == this.customIsUrl)
        {
            return;
        }
        else {
            this.customHsUrl = newHsUrl;
            this.customIsUrl = newIsUrl;
        }

        MatrixClientPeg.replaceUsingUrls(
            this.getHsUrl(),
            this.getIsUrl()
        );
        this.setState({
            hs_url: this.getHsUrl(),
            is_url: this.getIsUrl()
        });
        // XXX: HSes do not have to offer password auth, so we
        // need to update and maybe show a different component
        // when a new HS is entered.
        if (this.updateHsTimeout) {
            clearTimeout(this.updateHsTimeout);
        }
        var self = this;
        this.updateHsTimeout = setTimeout(function() {
            self.onHSChosen();
        }, 1000);
    },

    componentForStep: function(step) {
        switch (step) {
            case 'choose_hs':
            case 'fetch_stages':
                var serverConfigStyle = {};
                serverConfigStyle.display = this.state.serverConfigVisible ? 'block' : 'none';
                return (
                    <div>
                        <input className="mx_Login_checkbox" id="advanced" type="checkbox" checked={this.state.serverConfigVisible} onChange={this.onServerConfigVisibleChange} />
                        <label className="mx_Login_label" htmlFor="advanced">Use custom server options (advanced)</label>
                        <div style={serverConfigStyle}>
                            <ServerConfig ref="serverConfig"
                                defaultHsUrl={this.customHsUrl} defaultIsUrl={this.customIsUrl}
                                onHsUrlChanged={this.onHsUrlChanged}
                            />
                        </div>
                    </div>
                );
            // XXX: clearly these should be separate organisms
            case 'stage_m.login.password':
                return (
                    <div>
                        <form onSubmit={this.onUserPassEntered}>
                        <input className="mx_Login_field" ref="user" type="text" value={this.state.username} onChange={this.onUsernameChanged} placeholder="Email or user name" /><br />
                        <input className="mx_Login_field" ref="pass" type="password" value={this.state.password} onChange={this.onPasswordChanged} placeholder="Password" /><br />
                        { this.componentForStep('choose_hs') }
                        <input className="mx_Login_submit" type="submit" value="Log in" />
                        </form>
                    </div>
                );
        }
    },

    onUsernameChanged: function(ev) {
        this.setState({username: ev.target.value});
    },

    onPasswordChanged: function(ev) {
        this.setState({password: ev.target.value});
    },

    loginContent: function() {
        var loader = this.state.busy ? <div className="mx_Login_loader"><Loader /></div> : null;
        return (
            <div>
                <h2>Sign in</h2>
                {this.componentForStep(this.state.step)}
                <div className="mx_Login_error">
                        { loader }
                        {this.state.errorText}
                </div>
                {/*<a className="mx_Login_create" onClick={this.showRegister} href="#">Create a new account</a>*/}
            </div>
        );
    },

    render: function() {
        return (
            <div className="mx_Login">
                <div className="mx_Login_box">
                    <div className="mx_Login_logo">
                        <img src="img/logo.png" width="250" height="100" alt="IPFS"/>
                        <img src="img/matrix-logo.png" width="217" height="100" alt="Matrix"/>
                    </div>
<p>This is a web-based <a href="https://matrix.org">Matrix.org</a> client, which can be used to connect to the IRC network.</p>
<p>If you don't yet have a Matrix account, you'll need to <a href="https://matrix.org/beta/#/register">register</a>. It should only take a second, and you only need to do it once.</p>
<p>If this is your first time using Matrix, join <code>#freenode_#ipfs:matrix.org</code> after you've signed in.</p>
<p>Of course, you can also join <code>irc://irc.freenode.org/#ipfs</code> with your own favourite IRC client.</p>
                    {this.loginContent()}
                </div>
            </div>
        );
    }
});
