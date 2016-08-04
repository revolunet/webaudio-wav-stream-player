(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _wavify = require('./wavify');

var _wavify2 = _interopRequireDefault(_wavify);

var _concat = require('./concat');

var _concat2 = _interopRequireDefault(_concat);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Player = function Player() {
    var hasCanceled_ = false;

    var _play = function _play(url) {

        var nextTime = 0;

        var audioStack = [];

        hasCanceled_ = false;

        var context = new AudioContext();

        return fetch(url).then(function (response) {
            var reader = response.body.getReader();

            // This variable holds a possibly dangling byte.
            var rest = null;

            var read = function read() {
                return reader.read().then(function (_ref) {
                    var value = _ref.value;
                    var done = _ref.done;

                    if (hasCanceled_) {
                        reader.cancel();
                        context.close();
                        return;
                    }
                    if (value && value.buffer) {
                        var buffer = void 0;

                        if (rest !== null) {
                            buffer = (0, _concat2.default)(rest, value.buffer);
                        } else {
                            buffer = value.buffer;
                        }

                        if (buffer.byteLength % 2 !== 0) {
                            rest = buffer.slice(-2, -1);
                            buffer = buffer.slice(0, -1);
                        } else {
                            rest = null;
                        }

                        context.decodeAudioData((0, _wavify2.default)(buffer)).then(function (audioBuffer) {
                            audioStack.push(audioBuffer);

                            if (audioStack.length) {
                                scheduleBuffers();
                            }
                        });
                    }

                    if (done) {
                        return;
                    }

                    read();
                });
            };

            read();
        });

        var scheduleBuffers = function scheduleBuffers() {
            while (audioStack.length) {
                var source = context.createBufferSource();

                source.buffer = audioStack.shift();

                source.connect(context.destination);

                if (nextTime == 0) {
                    nextTime = context.currentTime + 0.3; /// add 50ms latency to work well across systems - tune this if you like
                }

                source.start(nextTime);
                source.stop(nextTime + source.buffer.duration);

                nextTime += source.buffer.duration; // Make the next buffer wait the length of the last buffer before being played
            }
        };
    };

    return {
        play: function play(url) {
            return _play(url);
        },
        stop: function stop() {
            return hasCanceled_ = true;
        }
    };
};

exports.default = Player;

},{"./concat":2,"./wavify":3}],2:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});


// Concat two ArrayBuffers
var concat = function concat(buffer1, buffer2) {
    var tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);

    tmp.set(new Uint8Array(buffer1), 0);
    tmp.set(new Uint8Array(buffer2), buffer1.byteLength);

    return tmp.buffer;
};

exports.default = concat;

},{}],3:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

// Write a proper WAVE header for the given buffer.
var wavify = function wavify(data) {
    var header = new ArrayBuffer(44);

    var d = new DataView(header);

    d.setUint8(0, 'R'.charCodeAt(0));
    d.setUint8(1, 'I'.charCodeAt(0));
    d.setUint8(2, 'F'.charCodeAt(0));
    d.setUint8(3, 'F'.charCodeAt(0));

    d.setUint32(4, data.byteLength / 2 + 44, true);

    d.setUint8(8, 'W'.charCodeAt(0));
    d.setUint8(9, 'A'.charCodeAt(0));
    d.setUint8(10, 'V'.charCodeAt(0));
    d.setUint8(11, 'E'.charCodeAt(0));
    d.setUint8(12, 'f'.charCodeAt(0));
    d.setUint8(13, 'm'.charCodeAt(0));
    d.setUint8(14, 't'.charCodeAt(0));
    d.setUint8(15, ' '.charCodeAt(0));

    d.setUint32(16, 16, true);
    d.setUint16(20, 1, true);
    d.setUint16(22, 1, true);
    d.setUint32(24, 11025, true);
    d.setUint32(28, 11025 * 1 * 2);
    d.setUint16(32, 1 * 2);
    d.setUint16(34, 16, true);

    d.setUint8(36, 'd'.charCodeAt(0));
    d.setUint8(37, 'a'.charCodeAt(0));
    d.setUint8(38, 't'.charCodeAt(0));
    d.setUint8(39, 'a'.charCodeAt(0));
    d.setUint32(40, data.byteLength, true);

    return concat(header, data);
};

exports.default = wavify;

},{}],4:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _Player = require('./Player');

var _Player2 = _interopRequireDefault(_Player);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = _Player2.default;

},{"./Player":1}]},{},[4]);
