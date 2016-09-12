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

                source.buffer = segment.buffer;
                source.connect(context.destination);

                if (nextTime == 0) {
                    nextTime = currentTime + 0.3; /// add 300ms latency to work well across systems - tune this if you like
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
                            if (isFirstBuffer && buffer.byteLength < 44) {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvV2F2UGxheWVyLmpzIiwic3JjL2NvbmNhdC5qcyIsInNyYy9pbmRleC5qcyIsInNyYy93YXZpZnkuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7OztBQ0FBOzs7O0FBQ0E7Ozs7OztBQUVBLElBQU0sWUFBWSxTQUFaLFNBQVksR0FBTTtBQUNwQixRQUFJLGdCQUFKOztBQUVBLFFBQUksZUFBZSxLQUFuQjs7QUFFQSxRQUFNLFFBQU8sU0FBUCxLQUFPLE1BQU87O0FBRWhCLFlBQUksV0FBVyxDQUFmOztBQUVBLFlBQU0sYUFBYSxFQUFuQjs7QUFFQSx1QkFBZSxLQUFmOztBQUVBLGtCQUFVLElBQUksWUFBSixFQUFWOztBQUVBLFlBQUksMkJBQTJCLElBQS9COztBQUVBLFlBQU0sa0JBQWtCLFNBQWxCLGVBQWtCLEdBQU07QUFDMUIsZ0JBQUksWUFBSixFQUFrQjtBQUNkLDJDQUEyQixJQUEzQjs7QUFFQTtBQUNIOztBQUVELG1CQUFPLFdBQVcsTUFBWCxHQUFvQixDQUFwQixJQUF5QixXQUFXLENBQVgsRUFBYyxNQUFkLEtBQXlCLFNBQWxELElBQStELFdBQVcsUUFBUSxXQUFSLEdBQXNCLENBQXZHLEVBQTBHO0FBQ3RHLG9CQUFNLGNBQWMsUUFBUSxXQUE1Qjs7QUFFQSxvQkFBTSxTQUFTLFFBQVEsa0JBQVIsRUFBZjs7QUFFQSxvQkFBTSxVQUFVLFdBQVcsS0FBWCxFQUFoQjs7QUFFQSx1QkFBTyxNQUFQLEdBQWdCLFFBQVEsTUFBeEI7QUFDQSx1QkFBTyxPQUFQLENBQWUsUUFBUSxXQUF2Qjs7QUFFQSxvQkFBSSxZQUFZLENBQWhCLEVBQW1CO0FBQ2YsK0JBQVcsY0FBYyxHQUF6QixDQURlLENBQ2dCO0FBQ2xDOztBQUVELG9CQUFJLFdBQVcsT0FBTyxNQUFQLENBQWMsUUFBN0I7QUFDQSxvQkFBSSxTQUFTLENBQWI7O0FBRUEsb0JBQUksY0FBYyxR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QUFXLEVBQVgsRUFBZSxJQUFJLFVBQUosQ0FBZSxDQUFmLENBQWY7QUFDQSxNQUFFLFNBQUYsQ0FBWSxFQUFaLEVBQWdCLEtBQUssVUFBckIsRUFBaUMsSUFBakM7O0FBRUEsV0FBTyxzQkFBTyxNQUFQLEVBQWUsSUFBZixDQUFQO0FBQ0gsQ0FwQ0Q7O2tCQXNDZSxNIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsImltcG9ydCB3YXZpZnkgZnJvbSAnLi93YXZpZnknO1xuaW1wb3J0IGNvbmNhdCBmcm9tICcuL2NvbmNhdCc7XG5cbmNvbnN0IFdhdlBsYXllciA9ICgpID0+IHtcbiAgICBsZXQgY29udGV4dDtcblxuICAgIGxldCBoYXNDYW5jZWxlZF8gPSBmYWxzZTtcblxuICAgIGNvbnN0IHBsYXkgPSB1cmwgPT4ge1xuXG4gICAgICAgIGxldCBuZXh0VGltZSA9IDA7XG5cbiAgICAgICAgY29uc3QgYXVkaW9TdGFjayA9IFtdO1xuXG4gICAgICAgIGhhc0NhbmNlbGVkXyA9IGZhbHNlO1xuXG4gICAgICAgIGNvbnRleHQgPSBuZXcgQXVkaW9Db250ZXh0KCk7XG5cbiAgICAgICAgbGV0IHNjaGVkdWxlQnVmZmVyc1RpbWVvdXRJZCA9IG51bGw7XG5cbiAgICAgICAgY29uc3Qgc2NoZWR1bGVCdWZmZXJzID0gKCkgPT4ge1xuICAgICAgICAgICAgaWYgKGhhc0NhbmNlbGVkXykge1xuICAgICAgICAgICAgICAgIHNjaGVkdWxlQnVmZmVyc1RpbWVvdXRJZCA9IG51bGw7XG5cbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHdoaWxlIChhdWRpb1N0YWNrLmxlbmd0aCA+IDAgJiYgYXVkaW9TdGFja1swXS5idWZmZXIgIT09IHVuZGVmaW5lZCAmJiBuZXh0VGltZSA8IGNvbnRleHQuY3VycmVudFRpbWUgKyAyKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY3VycmVudFRpbWUgPSBjb250ZXh0LmN1cnJlbnRUaW1lO1xuXG4gICAgICAgICAgICAgICAgY29uc3Qgc291cmNlID0gY29udGV4dC5jcmVhdGVCdWZmZXJTb3VyY2UoKTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IHNlZ21lbnQgPSBhdWRpb1N0YWNrLnNoaWZ0KCk7XG5cbiAgICAgICAgICAgICAgICBzb3VyY2UuYnVmZmVyID0gc2VnbWVudC5idWZmZXI7XG4gICAgICAgICAgICAgICAgc291cmNlLmNvbm5lY3QoY29udGV4dC5kZXN0aW5hdGlvbik7XG5cbiAgICAgICAgICAgICAgICBpZiAobmV4dFRpbWUgPT0gMCkge1xuICAgICAgICAgICAgICAgICAgICBuZXh0VGltZSA9IGN1cnJlbnRUaW1lICsgMC4zOyAgLy8vIGFkZCAzMDBtcyBsYXRlbmN5IHRvIHdvcmsgd2VsbCBhY3Jvc3Mgc3lzdGVtcyAtIHR1bmUgdGhpcyBpZiB5b3UgbGlrZVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGxldCBkdXJhdGlvbiA9IHNvdXJjZS5idWZmZXIuZHVyYXRpb247XG4gICAgICAgICAgICAgICAgbGV0IG9mZnNldCA9IDA7XG5cbiAgICAgICAgICAgICAgICBpZiAoY3VycmVudFRpbWUgPiBuZXh0VGltZSkge1xuICAgICAgICAgICAgICAgICAgICBvZmZzZXQgPSBjdXJyZW50VGltZSAtIG5leHRUaW1lO1xuICAgICAgICAgICAgICAgICAgICBuZXh0VGltZSA9IGN1cnJlbnRUaW1lO1xuICAgICAgICAgICAgICAgICAgICBkdXJhdGlvbiA9IGR1cmF0aW9uIC0gb2Zmc2V0O1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHNvdXJjZS5zdGFydChuZXh0VGltZSwgb2Zmc2V0KTtcbiAgICAgICAgICAgICAgICBzb3VyY2Uuc3RvcChuZXh0VGltZSArIGR1cmF0aW9uKTtcblxuICAgICAgICAgICAgICAgIG5leHRUaW1lICs9IGR1cmF0aW9uOyAvLyBNYWtlIHRoZSBuZXh0IGJ1ZmZlciB3YWl0IHRoZSBsZW5ndGggb2YgdGhlIGxhc3QgYnVmZmVyIGJlZm9yZSBiZWluZyBwbGF5ZWRcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgc2NoZWR1bGVCdWZmZXJzVGltZW91dElkID0gc2V0VGltZW91dCgoKSA9PiBzY2hlZHVsZUJ1ZmZlcnMoKSwgNTAwKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBmZXRjaCh1cmwpLnRoZW4oKHJlc3BvbnNlKSA9PiB7XG5cbiAgICAgICAgICAgIGNvbnN0IHJlYWRlciA9IHJlc3BvbnNlLmJvZHkuZ2V0UmVhZGVyKCk7XG5cbiAgICAgICAgICAgIC8vIFRoaXMgdmFyaWFibGUgaG9sZHMgYSBwb3NzaWJseSBkYW5nbGluZyBieXRlLlxuICAgICAgICAgICAgdmFyIHJlc3QgPSBudWxsO1xuXG4gICAgICAgICAgICBsZXQgaXNGaXJzdEJ1ZmZlciA9IHRydWU7XG4gICAgICAgICAgICBsZXQgbnVtYmVyT2ZDaGFubmVscywgc2FtcGxlUmF0ZTtcblxuICAgICAgICAgICAgY29uc3QgcmVhZCA9ICgpID0+IHJlYWRlci5yZWFkKCkudGhlbigoeyB2YWx1ZSwgZG9uZSB9KSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGhhc0NhbmNlbGVkXykge1xuICAgICAgICAgICAgICAgICAgICByZWFkZXIuY2FuY2VsKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAodmFsdWUgJiYgdmFsdWUuYnVmZmVyKSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBidWZmZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBzZWdtZW50O1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXN0ICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBidWZmZXIgPSBjb25jYXQocmVzdCwgdmFsdWUuYnVmZmVyKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJ1ZmZlciA9IHZhbHVlLmJ1ZmZlcjtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIE1ha2Ugc3VyZSB0aGF0IHRoZSBmaXJzdCBidWZmZXIgaXMgbGFnZXIgdGhlbiA0NCBieXRlcy5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzRmlyc3RCdWZmZXIgJiYgYnVmZmVyLmJ5dGVMZW5ndGggPCA0NCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdCA9IGJ1ZmZlcjtcblxuICAgICAgICAgICAgICAgICAgICAgICAgcmVhZCgpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAvLyBJZiB0aGUgaGVhZGVyIGhhcyBhcnJpdmVkIHRyeSB0byBkZXJpdmUgdGhlIG51bWJlck9mQ2hhbm5lbHMgYW5kIHRoZVxuICAgICAgICAgICAgICAgICAgICAvLyBzYW1wbGVSYXRlIG9mIHRoZSBpbmNvbWluZyBmaWxlLlxuICAgICAgICAgICAgICAgICAgICBpZiAoaXNGaXJzdEJ1ZmZlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgaXNGaXJzdEJ1ZmZlciA9IGZhbHNlO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBkYXRhVmlldyA9IG5ldyBEYXRhVmlldyhidWZmZXIpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBudW1iZXJPZkNoYW5uZWxzID0gZGF0YVZpZXcuZ2V0VWludDE2KDIyLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNhbXBsZVJhdGUgPSBkYXRhVmlldy5nZXRVaW50MzIoMjQsIHRydWUpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBidWZmZXIgPSBidWZmZXIuc2xpY2UoNDQpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGJ1ZmZlci5ieXRlTGVuZ3RoICUgMiAhPT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdCA9IGJ1ZmZlci5zbGljZSgtMiwgLTEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnVmZmVyID0gYnVmZmVyLnNsaWNlKDAsIC0xKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3QgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgc2VnbWVudCA9IHt9O1xuXG4gICAgICAgICAgICAgICAgICAgIGF1ZGlvU3RhY2sucHVzaChzZWdtZW50KTtcblxuICAgICAgICAgICAgICAgICAgICBjb250ZXh0LmRlY29kZUF1ZGlvRGF0YSh3YXZpZnkoYnVmZmVyLCBudW1iZXJPZkNoYW5uZWxzLCBzYW1wbGVSYXRlKSkudGhlbigoYXVkaW9CdWZmZXIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlZ21lbnQuYnVmZmVyID0gYXVkaW9CdWZmZXI7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzY2hlZHVsZUJ1ZmZlcnNUaW1lb3V0SWQgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY2hlZHVsZUJ1ZmZlcnMoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKGRvbmUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIGNvbnRpbnVlIHJlYWRpbmdcbiAgICAgICAgICAgICAgICByZWFkKCk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gc3RhcnQgcmVhZGluZ1xuICAgICAgICAgICAgcmVhZCgpO1xuICAgICAgICB9KTtcblxuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICAgIHBsYXk6IHVybCA9PiBwbGF5KHVybCksXG4gICAgICAgIHN0b3A6ICgpID0+IHtcbiAgICAgICAgICAgIGhhc0NhbmNlbGVkXyA9IHRydWU7XG4gICAgICAgICAgICBjb250ZXh0LmNsb3NlKCk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IFdhdlBsYXllcjsiLCJcblxuLy8gQ29uY2F0IHR3byBBcnJheUJ1ZmZlcnNcbmNvbnN0IGNvbmNhdCA9IChidWZmZXIxLCBidWZmZXIyKSA9PiB7XG4gICAgY29uc3QgdG1wID0gbmV3IFVpbnQ4QXJyYXkoYnVmZmVyMS5ieXRlTGVuZ3RoICsgYnVmZmVyMi5ieXRlTGVuZ3RoKTtcblxuICAgIHRtcC5zZXQobmV3IFVpbnQ4QXJyYXkoYnVmZmVyMSksIDApO1xuICAgIHRtcC5zZXQobmV3IFVpbnQ4QXJyYXkoYnVmZmVyMiksIGJ1ZmZlcjEuYnl0ZUxlbmd0aCk7XG5cbiAgICByZXR1cm4gdG1wLmJ1ZmZlcjtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IGNvbmNhdDtcbiIsImltcG9ydCBXYXZQbGF5ZXIgZnJvbSAnLi9XYXZQbGF5ZXInO1xuXG5leHBvcnQgZGVmYXVsdCBXYXZQbGF5ZXI7XG5tb2R1bGUuZXhwb3J0cyA9IFdhdlBsYXllcjsiLCJpbXBvcnQgY29uY2F0IGZyb20gJy4vY29uY2F0JztcblxuLy8gV3JpdGUgYSBwcm9wZXIgV0FWRSBoZWFkZXIgZm9yIHRoZSBnaXZlbiBidWZmZXIuXG5jb25zdCB3YXZpZnkgPSAoZGF0YSwgbnVtYmVyT2ZDaGFubmVscywgc2FtcGxlUmF0ZSkgPT4ge1xuICAgIGNvbnN0IGhlYWRlciA9IG5ldyBBcnJheUJ1ZmZlcig0NCk7XG5cbiAgICB2YXIgZCA9IG5ldyAgRGF0YVZpZXcoaGVhZGVyKTtcblxuICAgIGQuc2V0VWludDgoMCwgJ1InLmNoYXJDb2RlQXQoMCkpO1xuICAgIGQuc2V0VWludDgoMSwgJ0knLmNoYXJDb2RlQXQoMCkpO1xuICAgIGQuc2V0VWludDgoMiwgJ0YnLmNoYXJDb2RlQXQoMCkpO1xuICAgIGQuc2V0VWludDgoMywgJ0YnLmNoYXJDb2RlQXQoMCkpO1xuXG4gICAgZC5zZXRVaW50MzIoNCwgZGF0YS5ieXRlTGVuZ3RoIC8gMiArIDQ0LCB0cnVlKTtcblxuICAgIGQuc2V0VWludDgoOCwgJ1cnLmNoYXJDb2RlQXQoMCkpO1xuICAgIGQuc2V0VWludDgoOSwgJ0EnLmNoYXJDb2RlQXQoMCkpO1xuICAgIGQuc2V0VWludDgoMTAsICdWJy5jaGFyQ29kZUF0KDApKTtcbiAgICBkLnNldFVpbnQ4KDExLCAnRScuY2hhckNvZGVBdCgwKSk7XG4gICAgZC5zZXRVaW50OCgxMiwgJ2YnLmNoYXJDb2RlQXQoMCkpO1xuICAgIGQuc2V0VWludDgoMTMsICdtJy5jaGFyQ29kZUF0KDApKTtcbiAgICBkLnNldFVpbnQ4KDE0LCAndCcuY2hhckNvZGVBdCgwKSk7XG4gICAgZC5zZXRVaW50OCgxNSwgJyAnLmNoYXJDb2RlQXQoMCkpO1xuXG4gICAgZC5zZXRVaW50MzIoMTYsIDE2LCB0cnVlKTtcbiAgICBkLnNldFVpbnQxNigyMCwgMSwgdHJ1ZSk7XG4gICAgZC5zZXRVaW50MTYoMjIsIG51bWJlck9mQ2hhbm5lbHMsIHRydWUpO1xuICAgIGQuc2V0VWludDMyKDI0LCBzYW1wbGVSYXRlLCB0cnVlKTtcbiAgICBkLnNldFVpbnQzMigyOCwgc2FtcGxlUmF0ZSAqIDEgKiAyKTtcbiAgICBkLnNldFVpbnQxNigzMiwgbnVtYmVyT2ZDaGFubmVscyAqIDIpO1xuICAgIGQuc2V0VWludDE2KDM0LCAxNiwgdHJ1ZSk7XG5cbiAgICBkLnNldFVpbnQ4KDM2LCAnZCcuY2hhckNvZGVBdCgwKSk7XG4gICAgZC5zZXRVaW50OCgzNywgJ2EnLmNoYXJDb2RlQXQoMCkpO1xuICAgIGQuc2V0VWludDgoMzgsICd0Jy5jaGFyQ29kZUF0KDApKTtcbiAgICBkLnNldFVpbnQ4KDM5LCAnYScuY2hhckNvZGVBdCgwKSk7XG4gICAgZC5zZXRVaW50MzIoNDAsIGRhdGEuYnl0ZUxlbmd0aCwgdHJ1ZSk7XG5cbiAgICByZXR1cm4gY29uY2F0KGhlYWRlciwgZGF0YSk7XG59O1xuXG5leHBvcnQgZGVmYXVsdCB3YXZpZnkiXX0=
