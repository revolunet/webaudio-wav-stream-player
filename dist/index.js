(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.WavPlayer = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var _wavify = require('./wavify');

var _wavify2 = _interopRequireDefault(_wavify);

var _concat = require('./concat');

var _concat2 = _interopRequireDefault(_concat);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var pad = function pad(buffer) {
    var currentSample = new Float32Array(1);

    buffer.copyFromChannel(currentSample, 0, 0);

    var wasPositive = currentSample[0] > 0;

    for (var i = 0; i < buffer.length; i += 1) {
        buffer.copyFromChannel(currentSample, 0, i);

        if (wasPositive && currentSample[0] < 0 || !wasPositive && currentSample[0] > 0) {
            break;
        }

        currentSample[0] = 0;
        buffer.copyToChannel(currentSample, 0, i);
    }

    buffer.copyFromChannel(currentSample, 0, buffer.length - 1);

    wasPositive = currentSample[0] > 0;

    for (var _i = buffer.length - 1; _i > 0; _i -= 1) {
        buffer.copyFromChannel(currentSample, 0, _i);

        if (wasPositive && currentSample[0] < 0 || !wasPositive && currentSample[0] > 0) {
            break;
        }

        currentSample[0] = 0;
        buffer.copyToChannel(currentSample, 0, _i);
    }

    return buffer;
};

var WavPlayer = function WavPlayer() {
    var context = void 0;

    var hasCanceled_ = false;

    var _play = function _play(url) {

        var nextTime = 0;

        var audioStack = [];

        hasCanceled_ = false;

        context = new AudioContext();

        var scheduleBuffersTimeoutId = null;

        var scheduleBuffers = function scheduleBuffers() {
            if (hasCanceled_) {
                scheduleBuffersTimeoutId = null;

                return;
            }

            while (audioStack.length > 0 && audioStack[0].buffer !== undefined && nextTime < context.currentTime + 2) {
                var currentTime = context.currentTime;

                var source = context.createBufferSource();

                var segment = audioStack.shift();

                source.buffer = pad(segment.buffer);
                source.connect(context.destination);

                if (nextTime == 0) {
                    nextTime = currentTime + 0.2; /// add 700ms latency to work well across systems - tune this if you like
                }

                var duration = source.buffer.duration;
                var offset = 0;

                if (currentTime > nextTime) {
                    offset = currentTime - nextTime;
                    nextTime = currentTime;
                    duration = duration - offset;
                }

                source.start(nextTime, offset);
                source.stop(nextTime + duration);

                nextTime += duration; // Make the next buffer wait the length of the last buffer before being played
            }

            scheduleBuffersTimeoutId = setTimeout(function () {
                return scheduleBuffers();
            }, 500);
        };

        return fetch(url).then(function (response) {

            var reader = response.body.getReader();

            // This variable holds a possibly dangling byte.
            var rest = null;

            var isFirstBuffer = true;
            var numberOfChannels = void 0,
                sampleRate = void 0;

            var read = function read() {
                return reader.read().then(function (_ref) {
                    var value = _ref.value;
                    var done = _ref.done;

                    if (hasCanceled_) {
                        reader.cancel();

                        return;
                    }
                    if (value && value.buffer) {
                        var _ret = function () {
                            var buffer = void 0,
                                segment = void 0;

                            if (rest !== null) {
                                buffer = (0, _concat2.default)(rest, value.buffer);
                            } else {
                                buffer = value.buffer;
                            }

                            // Make sure that the first buffer is lager then 44 bytes.
                            if (isFirstBuffer && buffer.byteLength <= 44) {
                                rest = buffer;

                                read();

                                return {
                                    v: void 0
                                };
                            }

                            // If the header has arrived try to derive the numberOfChannels and the
                            // sampleRate of the incoming file.
                            if (isFirstBuffer) {
                                isFirstBuffer = false;

                                var dataView = new DataView(buffer);

                                numberOfChannels = dataView.getUint16(22, true);
                                sampleRate = dataView.getUint32(24, true);

                                buffer = buffer.slice(44);
                            }

                            if (buffer.byteLength % 2 !== 0) {
                                rest = buffer.slice(-2, -1);
                                buffer = buffer.slice(0, -1);
                            } else {
                                rest = null;
                            }

                            segment = {};

                            audioStack.push(segment);

                            context.decodeAudioData((0, _wavify2.default)(buffer, numberOfChannels, sampleRate)).then(function (audioBuffer) {
                                segment.buffer = audioBuffer;

                                if (scheduleBuffersTimeoutId === null) {
                                    scheduleBuffers();
                                }
                            });
                        }();

                        if ((typeof _ret === 'undefined' ? 'undefined' : _typeof(_ret)) === "object") return _ret.v;
                    }

                    if (done) {
                        return;
                    }

                    // continue reading
                    read();
                });
            };

            // start reading
            read();
        });
    };

    return {
        play: function play(url) {
            return _play(url);
        },
        stop: function stop() {
            hasCanceled_ = true;
            if (context) {
                context.close();
            }
        }
    };
};

exports.default = WavPlayer;

},{"./concat":2,"./wavify":4}],2:[function(require,module,exports){
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

var _WavPlayer = require('./WavPlayer');

var _WavPlayer2 = _interopRequireDefault(_WavPlayer);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = _WavPlayer2.default;

module.exports = _WavPlayer2.default;

},{"./WavPlayer":1}],4:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _concat = require('./concat');

var _concat2 = _interopRequireDefault(_concat);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Write a proper WAVE header for the given buffer.
var wavify = function wavify(data, numberOfChannels, sampleRate) {
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
    d.setUint16(22, numberOfChannels, true);
    d.setUint32(24, sampleRate, true);
    d.setUint32(28, sampleRate * 1 * 2);
    d.setUint16(32, numberOfChannels * 2);
    d.setUint16(34, 16, true);

    d.setUint8(36, 'd'.charCodeAt(0));
    d.setUint8(37, 'a'.charCodeAt(0));
    d.setUint8(38, 't'.charCodeAt(0));
    d.setUint8(39, 'a'.charCodeAt(0));
    d.setUint32(40, data.byteLength, true);

    return (0, _concat2.default)(header, data);
};

exports.default = wavify;

},{"./concat":2}]},{},[3])(3)
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvV2F2UGxheWVyLmpzIiwic3JjL2NvbmNhdC5qcyIsInNyYy9pbmRleC5qcyIsInNyYy93YXZpZnkuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7OztBQ0FBOzs7O0FBQ0E7Ozs7OztBQUVBLElBQU0sTUFBTSxTQUFOLEdBQU0sQ0FBQyxNQUFELEVBQVk7QUFDcEIsUUFBTSxnQkFBZ0IsSUFBSSxZQUFKLENBQWlCLENBQWpCLENBQXRCOztBQUVBLFdBQU8sZUFBUCxDQUF1QixhQUF2QixFQUFzQyxDQUF0QyxFQUF5QyxDQUF6Qzs7QUFFQSxRQUFJLGNBQWUsY0FBYyxDQUFkLElBQW1CLENBQXRDOztBQUVBLFNBQUssSUFBSSxJQUFJLENBQWIsRUFBZ0IsSUFBSSxPQUFPLE1BQTNCLEVBQW1DLEtBQUssQ0FBeEMsRUFBMkM7QUFDdkMsZUFBTyxlQUFQLENBQXVCLGFBQXZCLEVBQXNDLENBQXRDLEVBQXlDLENBQXpDOztBQUVBLFlBQUssZUFBZSxjQUFjLENBQWQsSUFBbUIsQ0FBbkMsSUFDSyxDQUFDLFdBQUQsSUFBZ0IsY0FBYyxDQUFkLElBQW1CLENBRDVDLEVBQ2dEO0FBQzVDO0FBQ0g7O0FBRUQsc0JBQWMsQ0FBZCxJQUFtQixDQUFuQjtBQUNBLGVBQU8sYUFBUCxDQUFxQixhQUFyQixFQUFvQyxDQUFwQyxFQUF1QyxDQUF2QztBQUNIOztBQUVELFdBQU8sZUFBUCxDQUF1QixhQUF2QixFQUFzQyxDQUF0QyxFQUF5QyxPQUFPLE1BQVAsR0FBZ0IsQ0FBekQ7O0FBRUEsa0JBQWUsY0FBYyxDQUFkLElBQW1CLENBQWxDOztBQUVBLFNBQUssSUFBSSxLQUFJLE9BQU8sTUFBUCxHQUFnQixDQUE3QixFQUFnQyxLQUFJLENBQXBDLEVBQXVDLE1BQUssQ0FBNUMsRUFBK0M7QUFDM0MsZUFBTyxlQUFQLENBQXVCLGFBQXZCLEVBQXNDLENBQXRDLEVBQXlDLEVB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LE1BQUUsUUFBRixDQUFXLEVBQVgsRUFBZSxJQUFJLFVBQUosQ0FBZSxDQUFmLENBQWY7QUFDQSxNQUFFLFFBQUYsQ0FBVyxFQUFYLEVBQWUsSUFBSSxVQUFKLENBQWUsQ0FBZixDQUFmO0FBQ0EsTUFBRSxTQUFGLENBQVksRUFBWixFQUFnQixLQUFLLFVBQXJCLEVBQWlDLElBQWpDOztBQUVBLFdBQU8sc0JBQU8sTUFBUCxFQUFlLElBQWYsQ0FBUDtBQUNILENBcENEOztrQkFzQ2UsTSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJpbXBvcnQgd2F2aWZ5IGZyb20gJy4vd2F2aWZ5JztcbmltcG9ydCBjb25jYXQgZnJvbSAnLi9jb25jYXQnO1xuXG5jb25zdCBwYWQgPSAoYnVmZmVyKSA9PiB7XG4gICAgY29uc3QgY3VycmVudFNhbXBsZSA9IG5ldyBGbG9hdDMyQXJyYXkoMSk7XG5cbiAgICBidWZmZXIuY29weUZyb21DaGFubmVsKGN1cnJlbnRTYW1wbGUsIDAsIDApO1xuXG4gICAgbGV0IHdhc1Bvc2l0aXZlID0gKGN1cnJlbnRTYW1wbGVbMF0gPiAwKTtcblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYnVmZmVyLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgIGJ1ZmZlci5jb3B5RnJvbUNoYW5uZWwoY3VycmVudFNhbXBsZSwgMCwgaSk7XG5cbiAgICAgICAgaWYgKCh3YXNQb3NpdGl2ZSAmJiBjdXJyZW50U2FtcGxlWzBdIDwgMCkgfHxcbiAgICAgICAgICAgICAgICAoIXdhc1Bvc2l0aXZlICYmIGN1cnJlbnRTYW1wbGVbMF0gPiAwKSkge1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cblxuICAgICAgICBjdXJyZW50U2FtcGxlWzBdID0gMDtcbiAgICAgICAgYnVmZmVyLmNvcHlUb0NoYW5uZWwoY3VycmVudFNhbXBsZSwgMCwgaSk7XG4gICAgfVxuXG4gICAgYnVmZmVyLmNvcHlGcm9tQ2hhbm5lbChjdXJyZW50U2FtcGxlLCAwLCBidWZmZXIubGVuZ3RoIC0gMSk7XG5cbiAgICB3YXNQb3NpdGl2ZSA9IChjdXJyZW50U2FtcGxlWzBdID4gMCk7XG5cbiAgICBmb3IgKGxldCBpID0gYnVmZmVyLmxlbmd0aCAtIDE7IGkgPiAwOyBpIC09IDEpIHtcbiAgICAgICAgYnVmZmVyLmNvcHlGcm9tQ2hhbm5lbChjdXJyZW50U2FtcGxlLCAwLCBpKTtcblxuICAgICAgICBpZiAoKHdhc1Bvc2l0aXZlICYmIGN1cnJlbnRTYW1wbGVbMF0gPCAwKSB8fFxuICAgICAgICAgICAgICAgICghd2FzUG9zaXRpdmUgJiYgY3VycmVudFNhbXBsZVswXSA+IDApKSB7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuXG4gICAgICAgIGN1cnJlbnRTYW1wbGVbMF0gPSAwO1xuICAgICAgICBidWZmZXIuY29weVRvQ2hhbm5lbChjdXJyZW50U2FtcGxlLCAwLCBpKTtcbiAgICB9XG5cbiAgICByZXR1cm4gYnVmZmVyO1xufTtcblxuY29uc3QgV2F2UGxheWVyID0gKCkgPT4ge1xuICAgIGxldCBjb250ZXh0O1xuXG4gICAgbGV0IGhhc0NhbmNlbGVkXyA9IGZhbHNlO1xuXG4gICAgY29uc3QgcGxheSA9IHVybCA9PiB7XG5cbiAgICAgICAgbGV0IG5leHRUaW1lID0gMDtcblxuICAgICAgICBjb25zdCBhdWRpb1N0YWNrID0gW107XG5cbiAgICAgICAgaGFzQ2FuY2VsZWRfID0gZmFsc2U7XG5cbiAgICAgICAgY29udGV4dCA9IG5ldyBBdWRpb0NvbnRleHQoKTtcblxuICAgICAgICBsZXQgc2NoZWR1bGVCdWZmZXJzVGltZW91dElkID0gbnVsbDtcblxuICAgICAgICBjb25zdCBzY2hlZHVsZUJ1ZmZlcnMgPSAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoaGFzQ2FuY2VsZWRfKSB7XG4gICAgICAgICAgICAgICAgc2NoZWR1bGVCdWZmZXJzVGltZW91dElkID0gbnVsbDtcblxuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgd2hpbGUgKGF1ZGlvU3RhY2subGVuZ3RoID4gMCAmJiBhdWRpb1N0YWNrWzBdLmJ1ZmZlciAhPT0gdW5kZWZpbmVkICYmIG5leHRUaW1lIDwgY29udGV4dC5jdXJyZW50VGltZSArIDIpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjdXJyZW50VGltZSA9IGNvbnRleHQuY3VycmVudFRpbWU7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBzb3VyY2UgPSBjb250ZXh0LmNyZWF0ZUJ1ZmZlclNvdXJjZSgpO1xuXG4gICAgICAgICAgICAgICAgY29uc3Qgc2VnbWVudCA9IGF1ZGlvU3RhY2suc2hpZnQoKTtcblxuICAgICAgICAgICAgICAgIHNvdXJjZS5idWZmZXIgPSBwYWQoc2VnbWVudC5idWZmZXIpO1xuICAgICAgICAgICAgICAgIHNvdXJjZS5jb25uZWN0KGNvbnRleHQuZGVzdGluYXRpb24pO1xuXG4gICAgICAgICAgICAgICAgaWYgKG5leHRUaW1lID09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgbmV4dFRpbWUgPSBjdXJyZW50VGltZSArIDAuMjsgIC8vLyBhZGQgNzAwbXMgbGF0ZW5jeSB0byB3b3JrIHdlbGwgYWNyb3NzIHN5c3RlbXMgLSB0dW5lIHRoaXMgaWYgeW91IGxpa2VcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBsZXQgZHVyYXRpb24gPSBzb3VyY2UuYnVmZmVyLmR1cmF0aW9uO1xuICAgICAgICAgICAgICAgIGxldCBvZmZzZXQgPSAwO1xuXG4gICAgICAgICAgICAgICAgaWYgKGN1cnJlbnRUaW1lID4gbmV4dFRpbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgb2Zmc2V0ID0gY3VycmVudFRpbWUgLSBuZXh0VGltZTtcbiAgICAgICAgICAgICAgICAgICAgbmV4dFRpbWUgPSBjdXJyZW50VGltZTtcbiAgICAgICAgICAgICAgICAgICAgZHVyYXRpb24gPSBkdXJhdGlvbiAtIG9mZnNldDtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBzb3VyY2Uuc3RhcnQobmV4dFRpbWUsIG9mZnNldCk7XG4gICAgICAgICAgICAgICAgc291cmNlLnN0b3AobmV4dFRpbWUgKyBkdXJhdGlvbik7XG5cbiAgICAgICAgICAgICAgICBuZXh0VGltZSArPSBkdXJhdGlvbjsgLy8gTWFrZSB0aGUgbmV4dCBidWZmZXIgd2FpdCB0aGUgbGVuZ3RoIG9mIHRoZSBsYXN0IGJ1ZmZlciBiZWZvcmUgYmVpbmcgcGxheWVkXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHNjaGVkdWxlQnVmZmVyc1RpbWVvdXRJZCA9IHNldFRpbWVvdXQoKCkgPT4gc2NoZWR1bGVCdWZmZXJzKCksIDUwMCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZmV0Y2godXJsKS50aGVuKChyZXNwb25zZSkgPT4ge1xuXG4gICAgICAgICAgICBjb25zdCByZWFkZXIgPSByZXNwb25zZS5ib2R5LmdldFJlYWRlcigpO1xuXG4gICAgICAgICAgICAvLyBUaGlzIHZhcmlhYmxlIGhvbGRzIGEgcG9zc2libHkgZGFuZ2xpbmcgYnl0ZS5cbiAgICAgICAgICAgIHZhciByZXN0ID0gbnVsbDtcblxuICAgICAgICAgICAgbGV0IGlzRmlyc3RCdWZmZXIgPSB0cnVlO1xuICAgICAgICAgICAgbGV0IG51bWJlck9mQ2hhbm5lbHMsIHNhbXBsZVJhdGU7XG5cbiAgICAgICAgICAgIGNvbnN0IHJlYWQgPSAoKSA9PiByZWFkZXIucmVhZCgpLnRoZW4oKHsgdmFsdWUsIGRvbmUgfSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChoYXNDYW5jZWxlZF8pIHtcbiAgICAgICAgICAgICAgICAgICAgcmVhZGVyLmNhbmNlbCgpO1xuXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlICYmIHZhbHVlLmJ1ZmZlcikge1xuICAgICAgICAgICAgICAgICAgICBsZXQgYnVmZmVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgc2VnbWVudDtcblxuICAgICAgICAgICAgICAgICAgICBpZiAocmVzdCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYnVmZmVyID0gY29uY2F0KHJlc3QsIHZhbHVlLmJ1ZmZlcik7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBidWZmZXIgPSB2YWx1ZS5idWZmZXI7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAvLyBNYWtlIHN1cmUgdGhhdCB0aGUgZmlyc3QgYnVmZmVyIGlzIGxhZ2VyIHRoZW4gNDQgYnl0ZXMuXG4gICAgICAgICAgICAgICAgICAgIGlmIChpc0ZpcnN0QnVmZmVyICYmIGJ1ZmZlci5ieXRlTGVuZ3RoIDw9IDQ0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN0ID0gYnVmZmVyO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICByZWFkKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIElmIHRoZSBoZWFkZXIgaGFzIGFycml2ZWQgdHJ5IHRvIGRlcml2ZSB0aGUgbnVtYmVyT2ZDaGFubmVscyBhbmQgdGhlXG4gICAgICAgICAgICAgICAgICAgIC8vIHNhbXBsZVJhdGUgb2YgdGhlIGluY29taW5nIGZpbGUuXG4gICAgICAgICAgICAgICAgICAgIGlmIChpc0ZpcnN0QnVmZmVyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpc0ZpcnN0QnVmZmVyID0gZmFsc2U7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGRhdGFWaWV3ID0gbmV3IERhdGFWaWV3KGJ1ZmZlcik7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIG51bWJlck9mQ2hhbm5lbHMgPSBkYXRhVmlldy5nZXRVaW50MTYoMjIsIHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgc2FtcGxlUmF0ZSA9IGRhdGFWaWV3LmdldFVpbnQzMigyNCwgdHJ1ZSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGJ1ZmZlciA9IGJ1ZmZlci5zbGljZSg0NCk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAoYnVmZmVyLmJ5dGVMZW5ndGggJSAyICE9PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN0ID0gYnVmZmVyLnNsaWNlKC0yLCAtMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBidWZmZXIgPSBidWZmZXIuc2xpY2UoMCwgLTEpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdCA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBzZWdtZW50ID0ge307XG5cbiAgICAgICAgICAgICAgICAgICAgYXVkaW9TdGFjay5wdXNoKHNlZ21lbnQpO1xuXG4gICAgICAgICAgICAgICAgICAgIGNvbnRleHQuZGVjb2RlQXVkaW9EYXRhKHdhdmlmeShidWZmZXIsIG51bWJlck9mQ2hhbm5lbHMsIHNhbXBsZVJhdGUpKS50aGVuKChhdWRpb0J1ZmZlcikgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VnbWVudC5idWZmZXIgPSBhdWRpb0J1ZmZlcjtcblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNjaGVkdWxlQnVmZmVyc1RpbWVvdXRJZCA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjaGVkdWxlQnVmZmVycygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoZG9uZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gY29udGludWUgcmVhZGluZ1xuICAgICAgICAgICAgICAgIHJlYWQoKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAvLyBzdGFydCByZWFkaW5nXG4gICAgICAgICAgICByZWFkKCk7XG4gICAgICAgIH0pO1xuXG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgcGxheTogdXJsID0+IHBsYXkodXJsKSxcbiAgICAgICAgc3RvcDogKCkgPT4ge1xuICAgICAgICAgICAgaGFzQ2FuY2VsZWRfID0gdHJ1ZTtcbiAgICAgICAgICAgIGlmIChjb250ZXh0KSB7XG4gICAgICAgICAgICAgICAgY29udGV4dC5jbG9zZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBXYXZQbGF5ZXI7IiwiXG5cbi8vIENvbmNhdCB0d28gQXJyYXlCdWZmZXJzXG5jb25zdCBjb25jYXQgPSAoYnVmZmVyMSwgYnVmZmVyMikgPT4ge1xuICAgIGNvbnN0IHRtcCA9IG5ldyBVaW50OEFycmF5KGJ1ZmZlcjEuYnl0ZUxlbmd0aCArIGJ1ZmZlcjIuYnl0ZUxlbmd0aCk7XG5cbiAgICB0bXAuc2V0KG5ldyBVaW50OEFycmF5KGJ1ZmZlcjEpLCAwKTtcbiAgICB0bXAuc2V0KG5ldyBVaW50OEFycmF5KGJ1ZmZlcjIpLCBidWZmZXIxLmJ5dGVMZW5ndGgpO1xuXG4gICAgcmV0dXJuIHRtcC5idWZmZXI7XG59O1xuXG5leHBvcnQgZGVmYXVsdCBjb25jYXQ7XG4iLCJpbXBvcnQgV2F2UGxheWVyIGZyb20gJy4vV2F2UGxheWVyJztcblxuZXhwb3J0IGRlZmF1bHQgV2F2UGxheWVyO1xubW9kdWxlLmV4cG9ydHMgPSBXYXZQbGF5ZXI7IiwiaW1wb3J0IGNvbmNhdCBmcm9tICcuL2NvbmNhdCc7XG5cbi8vIFdyaXRlIGEgcHJvcGVyIFdBVkUgaGVhZGVyIGZvciB0aGUgZ2l2ZW4gYnVmZmVyLlxuY29uc3Qgd2F2aWZ5ID0gKGRhdGEsIG51bWJlck9mQ2hhbm5lbHMsIHNhbXBsZVJhdGUpID0+IHtcbiAgICBjb25zdCBoZWFkZXIgPSBuZXcgQXJyYXlCdWZmZXIoNDQpO1xuXG4gICAgdmFyIGQgPSBuZXcgIERhdGFWaWV3KGhlYWRlcik7XG5cbiAgICBkLnNldFVpbnQ4KDAsICdSJy5jaGFyQ29kZUF0KDApKTtcbiAgICBkLnNldFVpbnQ4KDEsICdJJy5jaGFyQ29kZUF0KDApKTtcbiAgICBkLnNldFVpbnQ4KDIsICdGJy5jaGFyQ29kZUF0KDApKTtcbiAgICBkLnNldFVpbnQ4KDMsICdGJy5jaGFyQ29kZUF0KDApKTtcblxuICAgIGQuc2V0VWludDMyKDQsIGRhdGEuYnl0ZUxlbmd0aCAvIDIgKyA0NCwgdHJ1ZSk7XG5cbiAgICBkLnNldFVpbnQ4KDgsICdXJy5jaGFyQ29kZUF0KDApKTtcbiAgICBkLnNldFVpbnQ4KDksICdBJy5jaGFyQ29kZUF0KDApKTtcbiAgICBkLnNldFVpbnQ4KDEwLCAnVicuY2hhckNvZGVBdCgwKSk7XG4gICAgZC5zZXRVaW50OCgxMSwgJ0UnLmNoYXJDb2RlQXQoMCkpO1xuICAgIGQuc2V0VWludDgoMTIsICdmJy5jaGFyQ29kZUF0KDApKTtcbiAgICBkLnNldFVpbnQ4KDEzLCAnbScuY2hhckNvZGVBdCgwKSk7XG4gICAgZC5zZXRVaW50OCgxNCwgJ3QnLmNoYXJDb2RlQXQoMCkpO1xuICAgIGQuc2V0VWludDgoMTUsICcgJy5jaGFyQ29kZUF0KDApKTtcblxuICAgIGQuc2V0VWludDMyKDE2LCAxNiwgdHJ1ZSk7XG4gICAgZC5zZXRVaW50MTYoMjAsIDEsIHRydWUpO1xuICAgIGQuc2V0VWludDE2KDIyLCBudW1iZXJPZkNoYW5uZWxzLCB0cnVlKTtcbiAgICBkLnNldFVpbnQzMigyNCwgc2FtcGxlUmF0ZSwgdHJ1ZSk7XG4gICAgZC5zZXRVaW50MzIoMjgsIHNhbXBsZVJhdGUgKiAxICogMik7XG4gICAgZC5zZXRVaW50MTYoMzIsIG51bWJlck9mQ2hhbm5lbHMgKiAyKTtcbiAgICBkLnNldFVpbnQxNigzNCwgMTYsIHRydWUpO1xuXG4gICAgZC5zZXRVaW50OCgzNiwgJ2QnLmNoYXJDb2RlQXQoMCkpO1xuICAgIGQuc2V0VWludDgoMzcsICdhJy5jaGFyQ29kZUF0KDApKTtcbiAgICBkLnNldFVpbnQ4KDM4LCAndCcuY2hhckNvZGVBdCgwKSk7XG4gICAgZC5zZXRVaW50OCgzOSwgJ2EnLmNoYXJDb2RlQXQoMCkpO1xuICAgIGQuc2V0VWludDMyKDQwLCBkYXRhLmJ5dGVMZW5ndGgsIHRydWUpO1xuXG4gICAgcmV0dXJuIGNvbmNhdChoZWFkZXIsIGRhdGEpO1xufTtcblxuZXhwb3J0IGRlZmF1bHQgd2F2aWZ5Il19
