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
                    nextTime = currentTime + 0.7; /// add 700ms latency to work well across systems - tune this if you like
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
            context.close();
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvV2F2UGxheWVyLmpzIiwic3JjL2NvbmNhdC5qcyIsInNyYy9pbmRleC5qcyIsInNyYy93YXZpZnkuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7OztBQ0FBOzs7O0FBQ0E7Ozs7OztBQUVBLElBQU0sTUFBTSxTQUFOLEdBQU0sQ0FBQyxNQUFELEVBQVk7QUFDcEIsUUFBTSxnQkFBZ0IsSUFBSSxZQUFKLENBQWlCLENBQWpCLENBQXRCOztBQUVBLFdBQU8sZUFBUCxDQUF1QixhQUF2QixFQUFzQyxDQUF0QyxFQUF5QyxDQUF6Qzs7QUFFQSxRQUFJLGNBQWUsY0FBYyxDQUFkLElBQW1CLENBQXRDOztBQUVBLFNBQUssSUFBSSxJQUFJLENBQWIsRUFBZ0IsSUFBSSxPQUFPLE1BQTNCLEVBQW1DLEtBQUssQ0FBeEMsRUFBMkM7QUFDdkMsZUFBTyxlQUFQLENBQXVCLGFBQXZCLEVBQXNDLENBQXRDLEVBQXlDLENBQXpDOztBQUVBLFlBQUssZUFBZSxjQUFjLENBQWQsSUFBbUIsQ0FBbkMsSUFDSyxDQUFDLFdBQUQsSUFBZ0IsY0FBYyxDQUFkLElBQW1CLENBRDVDLEVBQ2dEO0FBQzVDO0FBQ0g7O0FBRUQsc0JBQWMsQ0FBZCxJQUFtQixDQUFuQjtBQUNBLGVBQU8sYUFBUCxDQUFxQixhQUFyQixFQUFvQyxDQUFwQyxFQUF1QyxDQUF2QztBQUNIOztBQUVELFdBQU8sZUFBUCxDQUF1QixhQUF2QixFQUFzQyxDQUF0QyxFQUF5QyxPQUFPLE1BQVAsR0FBZ0IsQ0FBekQ7O0FBRUEsa0JBQWUsY0FBYyxDQUFkLElBQW1CLENBQWxDOztBQUVBLFNBQUssSUFBSSxLQUFJLE9BQU8sTUFBUCxHQUFnQixDQUE3QixFQUFnQyxLQUFJLENBQXBDLEVBQXVDLE1BQUssQ0FBNUMsRUFBK0M7QUFDM0MsZUFBTyxlQUFQLENBQXVCLGFBQXZCLEVBQXNDLENBQXRDLEVBQXlDLEVB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SUFBSSxVQUFKLENBQWUsQ0FBZixDQUFmO0FBQ0EsTUFBRSxRQUFGLENBQVcsRUFBWCxFQUFlLElBQUksVUFBSixDQUFlLENBQWYsQ0FBZjtBQUNBLE1BQUUsU0FBRixDQUFZLEVBQVosRUFBZ0IsS0FBSyxVQUFyQixFQUFpQyxJQUFqQzs7QUFFQSxXQUFPLHNCQUFPLE1BQVAsRUFBZSxJQUFmLENBQVA7QUFDSCxDQXBDRDs7a0JBc0NlLE0iLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiaW1wb3J0IHdhdmlmeSBmcm9tICcuL3dhdmlmeSc7XG5pbXBvcnQgY29uY2F0IGZyb20gJy4vY29uY2F0JztcblxuY29uc3QgcGFkID0gKGJ1ZmZlcikgPT4ge1xuICAgIGNvbnN0IGN1cnJlbnRTYW1wbGUgPSBuZXcgRmxvYXQzMkFycmF5KDEpO1xuXG4gICAgYnVmZmVyLmNvcHlGcm9tQ2hhbm5lbChjdXJyZW50U2FtcGxlLCAwLCAwKTtcblxuICAgIGxldCB3YXNQb3NpdGl2ZSA9IChjdXJyZW50U2FtcGxlWzBdID4gMCk7XG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGJ1ZmZlci5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICBidWZmZXIuY29weUZyb21DaGFubmVsKGN1cnJlbnRTYW1wbGUsIDAsIGkpO1xuXG4gICAgICAgIGlmICgod2FzUG9zaXRpdmUgJiYgY3VycmVudFNhbXBsZVswXSA8IDApIHx8XG4gICAgICAgICAgICAgICAgKCF3YXNQb3NpdGl2ZSAmJiBjdXJyZW50U2FtcGxlWzBdID4gMCkpIHtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG5cbiAgICAgICAgY3VycmVudFNhbXBsZVswXSA9IDA7XG4gICAgICAgIGJ1ZmZlci5jb3B5VG9DaGFubmVsKGN1cnJlbnRTYW1wbGUsIDAsIGkpO1xuICAgIH1cblxuICAgIGJ1ZmZlci5jb3B5RnJvbUNoYW5uZWwoY3VycmVudFNhbXBsZSwgMCwgYnVmZmVyLmxlbmd0aCAtIDEpO1xuXG4gICAgd2FzUG9zaXRpdmUgPSAoY3VycmVudFNhbXBsZVswXSA+IDApO1xuXG4gICAgZm9yIChsZXQgaSA9IGJ1ZmZlci5sZW5ndGggLSAxOyBpID4gMDsgaSAtPSAxKSB7XG4gICAgICAgIGJ1ZmZlci5jb3B5RnJvbUNoYW5uZWwoY3VycmVudFNhbXBsZSwgMCwgaSk7XG5cbiAgICAgICAgaWYgKCh3YXNQb3NpdGl2ZSAmJiBjdXJyZW50U2FtcGxlWzBdIDwgMCkgfHxcbiAgICAgICAgICAgICAgICAoIXdhc1Bvc2l0aXZlICYmIGN1cnJlbnRTYW1wbGVbMF0gPiAwKSkge1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cblxuICAgICAgICBjdXJyZW50U2FtcGxlWzBdID0gMDtcbiAgICAgICAgYnVmZmVyLmNvcHlUb0NoYW5uZWwoY3VycmVudFNhbXBsZSwgMCwgaSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGJ1ZmZlcjtcbn07XG5cbmNvbnN0IFdhdlBsYXllciA9ICgpID0+IHtcbiAgICBsZXQgY29udGV4dDtcblxuICAgIGxldCBoYXNDYW5jZWxlZF8gPSBmYWxzZTtcblxuICAgIGNvbnN0IHBsYXkgPSB1cmwgPT4ge1xuXG4gICAgICAgIGxldCBuZXh0VGltZSA9IDA7XG5cbiAgICAgICAgY29uc3QgYXVkaW9TdGFjayA9IFtdO1xuXG4gICAgICAgIGhhc0NhbmNlbGVkXyA9IGZhbHNlO1xuXG4gICAgICAgIGNvbnRleHQgPSBuZXcgQXVkaW9Db250ZXh0KCk7XG5cbiAgICAgICAgbGV0IHNjaGVkdWxlQnVmZmVyc1RpbWVvdXRJZCA9IG51bGw7XG5cbiAgICAgICAgY29uc3Qgc2NoZWR1bGVCdWZmZXJzID0gKCkgPT4ge1xuICAgICAgICAgICAgaWYgKGhhc0NhbmNlbGVkXykge1xuICAgICAgICAgICAgICAgIHNjaGVkdWxlQnVmZmVyc1RpbWVvdXRJZCA9IG51bGw7XG5cbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHdoaWxlIChhdWRpb1N0YWNrLmxlbmd0aCA+IDAgJiYgYXVkaW9TdGFja1swXS5idWZmZXIgIT09IHVuZGVmaW5lZCAmJiBuZXh0VGltZSA8IGNvbnRleHQuY3VycmVudFRpbWUgKyAyKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY3VycmVudFRpbWUgPSBjb250ZXh0LmN1cnJlbnRUaW1lO1xuXG4gICAgICAgICAgICAgICAgY29uc3Qgc291cmNlID0gY29udGV4dC5jcmVhdGVCdWZmZXJTb3VyY2UoKTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IHNlZ21lbnQgPSBhdWRpb1N0YWNrLnNoaWZ0KCk7XG5cbiAgICAgICAgICAgICAgICBzb3VyY2UuYnVmZmVyID0gcGFkKHNlZ21lbnQuYnVmZmVyKTtcbiAgICAgICAgICAgICAgICBzb3VyY2UuY29ubmVjdChjb250ZXh0LmRlc3RpbmF0aW9uKTtcblxuICAgICAgICAgICAgICAgIGlmIChuZXh0VGltZSA9PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIG5leHRUaW1lID0gY3VycmVudFRpbWUgKyAwLjc7ICAvLy8gYWRkIDcwMG1zIGxhdGVuY3kgdG8gd29yayB3ZWxsIGFjcm9zcyBzeXN0ZW1zIC0gdHVuZSB0aGlzIGlmIHlvdSBsaWtlXG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgbGV0IGR1cmF0aW9uID0gc291cmNlLmJ1ZmZlci5kdXJhdGlvbjtcbiAgICAgICAgICAgICAgICBsZXQgb2Zmc2V0ID0gMDtcblxuICAgICAgICAgICAgICAgIGlmIChjdXJyZW50VGltZSA+IG5leHRUaW1lKSB7XG4gICAgICAgICAgICAgICAgICAgIG9mZnNldCA9IGN1cnJlbnRUaW1lIC0gbmV4dFRpbWU7XG4gICAgICAgICAgICAgICAgICAgIG5leHRUaW1lID0gY3VycmVudFRpbWU7XG4gICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uID0gZHVyYXRpb24gLSBvZmZzZXQ7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgc291cmNlLnN0YXJ0KG5leHRUaW1lLCBvZmZzZXQpO1xuICAgICAgICAgICAgICAgIHNvdXJjZS5zdG9wKG5leHRUaW1lICsgZHVyYXRpb24pO1xuXG4gICAgICAgICAgICAgICAgbmV4dFRpbWUgKz0gZHVyYXRpb247IC8vIE1ha2UgdGhlIG5leHQgYnVmZmVyIHdhaXQgdGhlIGxlbmd0aCBvZiB0aGUgbGFzdCBidWZmZXIgYmVmb3JlIGJlaW5nIHBsYXllZFxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBzY2hlZHVsZUJ1ZmZlcnNUaW1lb3V0SWQgPSBzZXRUaW1lb3V0KCgpID0+IHNjaGVkdWxlQnVmZmVycygpLCA1MDApO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGZldGNoKHVybCkudGhlbigocmVzcG9uc2UpID0+IHtcblxuICAgICAgICAgICAgY29uc3QgcmVhZGVyID0gcmVzcG9uc2UuYm9keS5nZXRSZWFkZXIoKTtcblxuICAgICAgICAgICAgLy8gVGhpcyB2YXJpYWJsZSBob2xkcyBhIHBvc3NpYmx5IGRhbmdsaW5nIGJ5dGUuXG4gICAgICAgICAgICB2YXIgcmVzdCA9IG51bGw7XG5cbiAgICAgICAgICAgIGxldCBpc0ZpcnN0QnVmZmVyID0gdHJ1ZTtcbiAgICAgICAgICAgIGxldCBudW1iZXJPZkNoYW5uZWxzLCBzYW1wbGVSYXRlO1xuXG4gICAgICAgICAgICBjb25zdCByZWFkID0gKCkgPT4gcmVhZGVyLnJlYWQoKS50aGVuKCh7IHZhbHVlLCBkb25lIH0pID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoaGFzQ2FuY2VsZWRfKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlYWRlci5jYW5jZWwoKTtcblxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICh2YWx1ZSAmJiB2YWx1ZS5idWZmZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGJ1ZmZlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlZ21lbnQ7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3QgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJ1ZmZlciA9IGNvbmNhdChyZXN0LCB2YWx1ZS5idWZmZXIpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgYnVmZmVyID0gdmFsdWUuYnVmZmVyO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gTWFrZSBzdXJlIHRoYXQgdGhlIGZpcnN0IGJ1ZmZlciBpcyBsYWdlciB0aGVuIDQ0IGJ5dGVzLlxuICAgICAgICAgICAgICAgICAgICBpZiAoaXNGaXJzdEJ1ZmZlciAmJiBidWZmZXIuYnl0ZUxlbmd0aCA8PSA0NCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdCA9IGJ1ZmZlcjtcblxuICAgICAgICAgICAgICAgICAgICAgICAgcmVhZCgpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAvLyBJZiB0aGUgaGVhZGVyIGhhcyBhcnJpdmVkIHRyeSB0byBkZXJpdmUgdGhlIG51bWJlck9mQ2hhbm5lbHMgYW5kIHRoZVxuICAgICAgICAgICAgICAgICAgICAvLyBzYW1wbGVSYXRlIG9mIHRoZSBpbmNvbWluZyBmaWxlLlxuICAgICAgICAgICAgICAgICAgICBpZiAoaXNGaXJzdEJ1ZmZlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgaXNGaXJzdEJ1ZmZlciA9IGZhbHNlO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBkYXRhVmlldyA9IG5ldyBEYXRhVmlldyhidWZmZXIpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBudW1iZXJPZkNoYW5uZWxzID0gZGF0YVZpZXcuZ2V0VWludDE2KDIyLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNhbXBsZVJhdGUgPSBkYXRhVmlldy5nZXRVaW50MzIoMjQsIHRydWUpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBidWZmZXIgPSBidWZmZXIuc2xpY2UoNDQpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGJ1ZmZlci5ieXRlTGVuZ3RoICUgMiAhPT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdCA9IGJ1ZmZlci5zbGljZSgtMiwgLTEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnVmZmVyID0gYnVmZmVyLnNsaWNlKDAsIC0xKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3QgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgc2VnbWVudCA9IHt9O1xuXG4gICAgICAgICAgICAgICAgICAgIGF1ZGlvU3RhY2sucHVzaChzZWdtZW50KTtcblxuICAgICAgICAgICAgICAgICAgICBjb250ZXh0LmRlY29kZUF1ZGlvRGF0YSh3YXZpZnkoYnVmZmVyLCBudW1iZXJPZkNoYW5uZWxzLCBzYW1wbGVSYXRlKSkudGhlbigoYXVkaW9CdWZmZXIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlZ21lbnQuYnVmZmVyID0gYXVkaW9CdWZmZXI7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzY2hlZHVsZUJ1ZmZlcnNUaW1lb3V0SWQgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY2hlZHVsZUJ1ZmZlcnMoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKGRvbmUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIGNvbnRpbnVlIHJlYWRpbmdcbiAgICAgICAgICAgICAgICByZWFkKCk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gc3RhcnQgcmVhZGluZ1xuICAgICAgICAgICAgcmVhZCgpO1xuICAgICAgICB9KTtcblxuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICAgIHBsYXk6IHVybCA9PiBwbGF5KHVybCksXG4gICAgICAgIHN0b3A6ICgpID0+IHtcbiAgICAgICAgICAgIGhhc0NhbmNlbGVkXyA9IHRydWU7XG4gICAgICAgICAgICBjb250ZXh0LmNsb3NlKCk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IFdhdlBsYXllcjsiLCJcblxuLy8gQ29uY2F0IHR3byBBcnJheUJ1ZmZlcnNcbmNvbnN0IGNvbmNhdCA9IChidWZmZXIxLCBidWZmZXIyKSA9PiB7XG4gICAgY29uc3QgdG1wID0gbmV3IFVpbnQ4QXJyYXkoYnVmZmVyMS5ieXRlTGVuZ3RoICsgYnVmZmVyMi5ieXRlTGVuZ3RoKTtcblxuICAgIHRtcC5zZXQobmV3IFVpbnQ4QXJyYXkoYnVmZmVyMSksIDApO1xuICAgIHRtcC5zZXQobmV3IFVpbnQ4QXJyYXkoYnVmZmVyMiksIGJ1ZmZlcjEuYnl0ZUxlbmd0aCk7XG5cbiAgICByZXR1cm4gdG1wLmJ1ZmZlcjtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IGNvbmNhdDtcbiIsImltcG9ydCBXYXZQbGF5ZXIgZnJvbSAnLi9XYXZQbGF5ZXInO1xuXG5leHBvcnQgZGVmYXVsdCBXYXZQbGF5ZXI7XG5tb2R1bGUuZXhwb3J0cyA9IFdhdlBsYXllcjsiLCJpbXBvcnQgY29uY2F0IGZyb20gJy4vY29uY2F0JztcblxuLy8gV3JpdGUgYSBwcm9wZXIgV0FWRSBoZWFkZXIgZm9yIHRoZSBnaXZlbiBidWZmZXIuXG5jb25zdCB3YXZpZnkgPSAoZGF0YSwgbnVtYmVyT2ZDaGFubmVscywgc2FtcGxlUmF0ZSkgPT4ge1xuICAgIGNvbnN0IGhlYWRlciA9IG5ldyBBcnJheUJ1ZmZlcig0NCk7XG5cbiAgICB2YXIgZCA9IG5ldyAgRGF0YVZpZXcoaGVhZGVyKTtcblxuICAgIGQuc2V0VWludDgoMCwgJ1InLmNoYXJDb2RlQXQoMCkpO1xuICAgIGQuc2V0VWludDgoMSwgJ0knLmNoYXJDb2RlQXQoMCkpO1xuICAgIGQuc2V0VWludDgoMiwgJ0YnLmNoYXJDb2RlQXQoMCkpO1xuICAgIGQuc2V0VWludDgoMywgJ0YnLmNoYXJDb2RlQXQoMCkpO1xuXG4gICAgZC5zZXRVaW50MzIoNCwgZGF0YS5ieXRlTGVuZ3RoIC8gMiArIDQ0LCB0cnVlKTtcblxuICAgIGQuc2V0VWludDgoOCwgJ1cnLmNoYXJDb2RlQXQoMCkpO1xuICAgIGQuc2V0VWludDgoOSwgJ0EnLmNoYXJDb2RlQXQoMCkpO1xuICAgIGQuc2V0VWludDgoMTAsICdWJy5jaGFyQ29kZUF0KDApKTtcbiAgICBkLnNldFVpbnQ4KDExLCAnRScuY2hhckNvZGVBdCgwKSk7XG4gICAgZC5zZXRVaW50OCgxMiwgJ2YnLmNoYXJDb2RlQXQoMCkpO1xuICAgIGQuc2V0VWludDgoMTMsICdtJy5jaGFyQ29kZUF0KDApKTtcbiAgICBkLnNldFVpbnQ4KDE0LCAndCcuY2hhckNvZGVBdCgwKSk7XG4gICAgZC5zZXRVaW50OCgxNSwgJyAnLmNoYXJDb2RlQXQoMCkpO1xuXG4gICAgZC5zZXRVaW50MzIoMTYsIDE2LCB0cnVlKTtcbiAgICBkLnNldFVpbnQxNigyMCwgMSwgdHJ1ZSk7XG4gICAgZC5zZXRVaW50MTYoMjIsIG51bWJlck9mQ2hhbm5lbHMsIHRydWUpO1xuICAgIGQuc2V0VWludDMyKDI0LCBzYW1wbGVSYXRlLCB0cnVlKTtcbiAgICBkLnNldFVpbnQzMigyOCwgc2FtcGxlUmF0ZSAqIDEgKiAyKTtcbiAgICBkLnNldFVpbnQxNigzMiwgbnVtYmVyT2ZDaGFubmVscyAqIDIpO1xuICAgIGQuc2V0VWludDE2KDM0LCAxNiwgdHJ1ZSk7XG5cbiAgICBkLnNldFVpbnQ4KDM2LCAnZCcuY2hhckNvZGVBdCgwKSk7XG4gICAgZC5zZXRVaW50OCgzNywgJ2EnLmNoYXJDb2RlQXQoMCkpO1xuICAgIGQuc2V0VWludDgoMzgsICd0Jy5jaGFyQ29kZUF0KDApKTtcbiAgICBkLnNldFVpbnQ4KDM5LCAnYScuY2hhckNvZGVBdCgwKSk7XG4gICAgZC5zZXRVaW50MzIoNDAsIGRhdGEuYnl0ZUxlbmd0aCwgdHJ1ZSk7XG5cbiAgICByZXR1cm4gY29uY2F0KGhlYWRlciwgZGF0YSk7XG59O1xuXG5leHBvcnQgZGVmYXVsdCB3YXZpZnkiXX0=
