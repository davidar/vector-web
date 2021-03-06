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

/*
 * Manages a list of all the currently active calls.
 *
 * This handler dispatches when voip calls are added/updated/removed from this list:
 * {
 *   action: 'call_state'
 *   room_id: <room ID of the call>
 * }
 *
 * To know the state of the call, this handler exposes a getter to
 * obtain the call for a room:
 *   var call = CallHandler.getCall(roomId)
 *   var state = call.call_state; // ringing|ringback|connected|ended|busy|stop_ringback|stop_ringing
 *
 * This handler listens for and handles the following actions:
 * {
 *   action: 'place_call',
 *   type: 'voice|video',
 *   room_id: <room that the place call button was pressed in>
 * }
 *
 * {
 *   action: 'incoming_call'
 *   call: MatrixCall
 * }
 *
 * {
 *   action: 'hangup'
 *   room_id: <room that the hangup button was pressed in>
 * }
 *
 * {
 *   action: 'answer'
 *   room_id: <room that the answer button was pressed in>
 * }
 */

var MatrixClientPeg = require("./MatrixClientPeg");
var Modal = require("./Modal");
var ComponentBroker = require('./ComponentBroker');
var ErrorDialog = ComponentBroker.get("organisms/ErrorDialog");
var Matrix = require("matrix-js-sdk");
var dis = require("./dispatcher");

var calls = {
    //room_id: MatrixCall
};

function play(audioId) {
    // TODO: Attach an invisible element for this instead
    // which listens?
    var audio = document.getElementById(audioId);
    if (audio) {
        audio.load();
        audio.play();
    }
}

function pause(audioId) {
    // TODO: Attach an invisible element for this instead
    // which listens?
    var audio = document.getElementById(audioId);
    if (audio) {
        audio.pause();
    }
}

function _setCallListeners(call) {
    call.on("error", function(err) {
        console.error("Call error: %s", err);
        console.error(err.stack);
        call.hangup();
        _setCallState(undefined, call.roomId, "ended");
    });
    call.on("hangup", function() {
        _setCallState(undefined, call.roomId, "ended");
    });
    // map web rtc states to dummy UI state
    // ringing|ringback|connected|ended|busy|stop_ringback|stop_ringing
    call.on("state", function(newState, oldState) {
        if (newState === "ringing") {
            _setCallState(call, call.roomId, "ringing");
            pause("ringbackAudio");
        }
        else if (newState === "invite_sent") {
            _setCallState(call, call.roomId, "ringback");
            play("ringbackAudio");
        }
        else if (newState === "ended" && oldState === "connected") {
            _setCallState(call, call.roomId, "ended");
            pause("ringbackAudio");
            play("callendAudio");
        }
        else if (newState === "ended" && oldState === "invite_sent" &&
                (call.hangupParty === "remote" ||
                (call.hangupParty === "local" && call.hangupReason === "invite_timeout")
                )) {
            _setCallState(call, call.roomId, "busy");
            pause("ringbackAudio");
            play("busyAudio");
            Modal.createDialog(ErrorDialog, {
                title: "Call Timeout",
                description: "The remote side failed to pick up."
            });
        }
        else if (oldState === "invite_sent") {
            _setCallState(call, call.roomId, "stop_ringback");
            pause("ringbackAudio");
        }
        else if (oldState === "ringing") {
            _setCallState(call, call.roomId, "stop_ringing");
            pause("ringbackAudio");
        }
        else if (newState === "connected") {
            _setCallState(call, call.roomId, "connected");
            pause("ringbackAudio");
        }
    });
}

function _setCallState(call, roomId, status) {
    console.log(
        "Call state in %s changed to %s (%s)", roomId, status, (call ? call.state : "-")
    );
    calls[roomId] = call;
    if (call) {
        call.call_state = status;
    }
    dis.dispatch({
        action: 'call_state',
        room_id: roomId
    });
}

dis.register(function(payload) {
    switch (payload.action) {
        case 'place_call':
            if (calls[payload.room_id]) {
                return; // don't allow >1 call to be placed.
            }
            var room = MatrixClientPeg.get().getRoom(payload.room_id);
            if (!room) {
                console.error("Room %s does not exist.", payload.room_id);
                return;
            }
            var members = room.getJoinedMembers();
            if (members.length !== 2) {
                var text = members.length === 1 ? "yourself." : "more than 2 people.";
                Modal.createDialog(ErrorDialog, {
                    description: "You cannot place a call with " + text
                });
                console.error(
                    "Fail: There are %s joined members in this room, not 2.",
                    room.getJoinedMembers().length
                );
                return;
            }
            console.log("Place %s call in %s", payload.type, payload.room_id);
            var call = Matrix.createNewMatrixCall(
                MatrixClientPeg.get(), payload.room_id
            );
            _setCallListeners(call);
            _setCallState(call, call.roomId, "ringback");
            if (payload.type === 'voice') {
                call.placeVoiceCall();
            }
            else if (payload.type === 'video') {
                call.placeVideoCall(
                    payload.remote_element,
                    payload.local_element
                );
            }
            else {
                console.error("Unknown call type: %s", payload.type);
            }
            
            break;
        case 'incoming_call':
            if (calls[payload.call.roomId]) {
                payload.call.hangup("busy");
                return; // don't allow >1 call to be received, hangup newer one.
            }
            var call = payload.call;
            _setCallListeners(call);
            _setCallState(call, call.roomId, "ringing");
            break;
        case 'hangup':
            if (!calls[payload.room_id]) {
                return; // no call to hangup
            }
            calls[payload.room_id].hangup();
            _setCallState(null, payload.room_id, "ended");
            break;
        case 'answer':
            if (!calls[payload.room_id]) {
                return; // no call to answer
            }
            calls[payload.room_id].answer();
            _setCallState(calls[payload.room_id], payload.room_id, "connected");
            dis.dispatch({
                action: "view_room",
                room_id: payload.room_id
            });
            break;
    }
});

module.exports = {
    getCall: function(roomId) {
        return calls[roomId] || null;
    }
};