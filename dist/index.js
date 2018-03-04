(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.WavPlayer = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var _wavify = require("./wavify");

var _wavify2 = _interopRequireDefault(_wavify);

var _concat = require("./concat");

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

                        if ((typeof _ret === "undefined" ? "undefined" : _typeof(_ret)) === "object") return _ret.v;
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
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _WavPlayer = require("./WavPlayer");

var _WavPlayer2 = _interopRequireDefault(_WavPlayer);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = _WavPlayer2.default;

module.exports = _WavPlayer2.default;

},{"./WavPlayer":1}],4:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _concat = require("./concat");

var _concat2 = _interopRequireDefault(_concat);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Write a proper WAVE header for the given buffer.
var wavify = function wavify(data, numberOfChannels, sampleRate) {
    var header = new ArrayBuffer(44);

    var d = new DataView(header);

    d.setUint8(0, "R".charCodeAt(0));
    d.setUint8(1, "I".charCodeAt(0));
    d.setUint8(2, "F".charCodeAt(0));
    d.setUint8(3, "F".charCodeAt(0));

    d.setUint32(4, data.byteLength / 2 + 44, true);

    d.setUint8(8, "W".charCodeAt(0));
    d.setUint8(9, "A".charCodeAt(0));
    d.setUint8(10, "V".charCodeAt(0));
    d.setUint8(11, "E".charCodeAt(0));
    d.setUint8(12, "f".charCodeAt(0));
    d.setUint8(13, "m".charCodeAt(0));
    d.setUint8(14, "t".charCodeAt(0));
    d.setUint8(15, " ".charCodeAt(0));

    d.setUint32(16, 16, true);
    d.setUint16(20, 1, true);
    d.setUint16(22, numberOfChannels, true);
    d.setUint32(24, sampleRate, true);
    d.setUint32(28, sampleRate * 1 * 2);
    d.setUint16(32, numberOfChannels * 2);
    d.setUint16(34, 16, true);

    d.setUint8(36, "d".charCodeAt(0));
    d.setUint8(37, "a".charCodeAt(0));
    d.setUint8(38, "t".charCodeAt(0));
    d.setUint8(39, "a".charCodeAt(0));
    d.setUint32(40, data.byteLength, true);

    return (0, _concat2.default)(header, data);
};

exports.default = wavify;

},{"./concat":2}]},{},[3])(3)
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvV2F2UGxheWVyLmpzIiwic3JjL2NvbmNhdC5qcyIsInNyYy9pbmRleC5qcyIsInNyYy93YXZpZnkuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7OztBQ0FBOzs7O0FBQ0E7Ozs7OztBQUVBLElBQU0sTUFBTSxTQUFOLEdBQU0sU0FBVTtBQUNsQixRQUFNLGdCQUFnQixJQUFJLFlBQUosQ0FBaUIsQ0FBakIsQ0FBdEI7O0FBRUEsV0FBTyxlQUFQLENBQXVCLGFBQXZCLEVBQXNDLENBQXRDLEVBQXlDLENBQXpDOztBQUVBLFFBQUksY0FBYyxjQUFjLENBQWQsSUFBbUIsQ0FBckM7O0FBRUEsU0FBSyxJQUFJLElBQUksQ0FBYixFQUFnQixJQUFJLE9BQU8sTUFBM0IsRUFBbUMsS0FBSyxDQUF4QyxFQUEyQztBQUN2QyxlQUFPLGVBQVAsQ0FBdUIsYUFBdkIsRUFBc0MsQ0FBdEMsRUFBeUMsQ0FBekM7O0FBRUEsWUFBSyxlQUFlLGNBQWMsQ0FBZCxJQUFtQixDQUFuQyxJQUEwQyxDQUFDLFdBQUQsSUFBZ0IsY0FBYyxDQUFkLElBQW1CLENBQWpGLEVBQXFGO0FBQ2pGO0FBQ0g7O0FBRUQsc0JBQWMsQ0FBZCxJQUFtQixDQUFuQjtBQUNBLGVBQU8sYUFBUCxDQUFxQixhQUFyQixFQUFvQyxDQUFwQyxFQUF1QyxDQUF2QztBQUNIOztBQUVELFdBQU8sZUFBUCxDQUF1QixhQUF2QixFQUFzQyxDQUF0QyxFQUF5QyxPQUFPLE1BQVAsR0FBZ0IsQ0FBekQ7O0FBRUEsa0JBQWMsY0FBYyxDQUFkLElBQW1CLENBQWpDOztBQUVBLFNBQUssSUFBSSxLQUFJLE9BQU8sTUFBUCxHQUFnQixDQUE3QixFQUFnQyxLQUFJLENBQXBDLEVBQXVDLE1BQUssQ0FBNUMsRUFBK0M7QUFDM0MsZUFBTyxlQUFQLENBQXVCLGFBQXZCLEVBQXNDLENBQXRDLEVBQXlDLEVBQXpDOztBQUVB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Q0FBZixDQUFmO0FBQ0EsTUFBRSxRQUFGLENBQVcsRUFBWCxFQUFlLElBQUksVUFBSixDQUFlLENBQWYsQ0FBZjtBQUNBLE1BQUUsU0FBRixDQUFZLEVBQVosRUFBZ0IsS0FBSyxVQUFyQixFQUFpQyxJQUFqQzs7QUFFQSxXQUFPLHNCQUFPLE1BQVAsRUFBZSxJQUFmLENBQVA7QUFDSCxDQXBDRDs7a0JBc0NlLE0iLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiaW1wb3J0IHdhdmlmeSBmcm9tIFwiLi93YXZpZnlcIjtcbmltcG9ydCBjb25jYXQgZnJvbSBcIi4vY29uY2F0XCI7XG5cbmNvbnN0IHBhZCA9IGJ1ZmZlciA9PiB7XG4gICAgY29uc3QgY3VycmVudFNhbXBsZSA9IG5ldyBGbG9hdDMyQXJyYXkoMSk7XG5cbiAgICBidWZmZXIuY29weUZyb21DaGFubmVsKGN1cnJlbnRTYW1wbGUsIDAsIDApO1xuXG4gICAgbGV0IHdhc1Bvc2l0aXZlID0gY3VycmVudFNhbXBsZVswXSA+IDA7XG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGJ1ZmZlci5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICBidWZmZXIuY29weUZyb21DaGFubmVsKGN1cnJlbnRTYW1wbGUsIDAsIGkpO1xuXG4gICAgICAgIGlmICgod2FzUG9zaXRpdmUgJiYgY3VycmVudFNhbXBsZVswXSA8IDApIHx8ICghd2FzUG9zaXRpdmUgJiYgY3VycmVudFNhbXBsZVswXSA+IDApKSB7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuXG4gICAgICAgIGN1cnJlbnRTYW1wbGVbMF0gPSAwO1xuICAgICAgICBidWZmZXIuY29weVRvQ2hhbm5lbChjdXJyZW50U2FtcGxlLCAwLCBpKTtcbiAgICB9XG5cbiAgICBidWZmZXIuY29weUZyb21DaGFubmVsKGN1cnJlbnRTYW1wbGUsIDAsIGJ1ZmZlci5sZW5ndGggLSAxKTtcblxuICAgIHdhc1Bvc2l0aXZlID0gY3VycmVudFNhbXBsZVswXSA+IDA7XG5cbiAgICBmb3IgKGxldCBpID0gYnVmZmVyLmxlbmd0aCAtIDE7IGkgPiAwOyBpIC09IDEpIHtcbiAgICAgICAgYnVmZmVyLmNvcHlGcm9tQ2hhbm5lbChjdXJyZW50U2FtcGxlLCAwLCBpKTtcblxuICAgICAgICBpZiAoKHdhc1Bvc2l0aXZlICYmIGN1cnJlbnRTYW1wbGVbMF0gPCAwKSB8fCAoIXdhc1Bvc2l0aXZlICYmIGN1cnJlbnRTYW1wbGVbMF0gPiAwKSkge1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cblxuICAgICAgICBjdXJyZW50U2FtcGxlWzBdID0gMDtcbiAgICAgICAgYnVmZmVyLmNvcHlUb0NoYW5uZWwoY3VycmVudFNhbXBsZSwgMCwgaSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGJ1ZmZlcjtcbn07XG5cbmNvbnN0IFdhdlBsYXllciA9ICgpID0+IHtcbiAgICBsZXQgY29udGV4dDtcblxuICAgIGxldCBoYXNDYW5jZWxlZF8gPSBmYWxzZTtcblxuICAgIGNvbnN0IHBsYXkgPSB1cmwgPT4ge1xuICAgICAgICBsZXQgbmV4dFRpbWUgPSAwO1xuXG4gICAgICAgIGNvbnN0IGF1ZGlvU3RhY2sgPSBbXTtcblxuICAgICAgICBoYXNDYW5jZWxlZF8gPSBmYWxzZTtcblxuICAgICAgICBjb250ZXh0ID0gbmV3IEF1ZGlvQ29udGV4dCgpO1xuXG4gICAgICAgIGxldCBzY2hlZHVsZUJ1ZmZlcnNUaW1lb3V0SWQgPSBudWxsO1xuXG4gICAgICAgIGNvbnN0IHNjaGVkdWxlQnVmZmVycyA9ICgpID0+IHtcbiAgICAgICAgICAgIGlmIChoYXNDYW5jZWxlZF8pIHtcbiAgICAgICAgICAgICAgICBzY2hlZHVsZUJ1ZmZlcnNUaW1lb3V0SWQgPSBudWxsO1xuXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB3aGlsZSAoXG4gICAgICAgICAgICAgICAgYXVkaW9TdGFjay5sZW5ndGggPiAwICYmXG4gICAgICAgICAgICAgICAgYXVkaW9TdGFja1swXS5idWZmZXIgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgICAgICAgICAgIG5leHRUaW1lIDwgY29udGV4dC5jdXJyZW50VGltZSArIDJcbiAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRUaW1lID0gY29udGV4dC5jdXJyZW50VGltZTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IHNvdXJjZSA9IGNvbnRleHQuY3JlYXRlQnVmZmVyU291cmNlKCk7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBzZWdtZW50ID0gYXVkaW9TdGFjay5zaGlmdCgpO1xuXG4gICAgICAgICAgICAgICAgc291cmNlLmJ1ZmZlciA9IHBhZChzZWdtZW50LmJ1ZmZlcik7XG4gICAgICAgICAgICAgICAgc291cmNlLmNvbm5lY3QoY29udGV4dC5kZXN0aW5hdGlvbik7XG5cbiAgICAgICAgICAgICAgICBpZiAobmV4dFRpbWUgPT0gMCkge1xuICAgICAgICAgICAgICAgICAgICBuZXh0VGltZSA9IGN1cnJlbnRUaW1lICsgMC4yOyAvLy8gYWRkIDcwMG1zIGxhdGVuY3kgdG8gd29yayB3ZWxsIGFjcm9zcyBzeXN0ZW1zIC0gdHVuZSB0aGlzIGlmIHlvdSBsaWtlXG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgbGV0IGR1cmF0aW9uID0gc291cmNlLmJ1ZmZlci5kdXJhdGlvbjtcbiAgICAgICAgICAgICAgICBsZXQgb2Zmc2V0ID0gMDtcblxuICAgICAgICAgICAgICAgIGlmIChjdXJyZW50VGltZSA+IG5leHRUaW1lKSB7XG4gICAgICAgICAgICAgICAgICAgIG9mZnNldCA9IGN1cnJlbnRUaW1lIC0gbmV4dFRpbWU7XG4gICAgICAgICAgICAgICAgICAgIG5leHRUaW1lID0gY3VycmVudFRpbWU7XG4gICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uID0gZHVyYXRpb24gLSBvZmZzZXQ7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgc291cmNlLnN0YXJ0KG5leHRUaW1lLCBvZmZzZXQpO1xuICAgICAgICAgICAgICAgIHNvdXJjZS5zdG9wKG5leHRUaW1lICsgZHVyYXRpb24pO1xuXG4gICAgICAgICAgICAgICAgbmV4dFRpbWUgKz0gZHVyYXRpb247IC8vIE1ha2UgdGhlIG5leHQgYnVmZmVyIHdhaXQgdGhlIGxlbmd0aCBvZiB0aGUgbGFzdCBidWZmZXIgYmVmb3JlIGJlaW5nIHBsYXllZFxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBzY2hlZHVsZUJ1ZmZlcnNUaW1lb3V0SWQgPSBzZXRUaW1lb3V0KCgpID0+IHNjaGVkdWxlQnVmZmVycygpLCA1MDApO1xuICAgICAgICB9O1xuXG4gICAgICAgIHJldHVybiBmZXRjaCh1cmwpLnRoZW4ocmVzcG9uc2UgPT4ge1xuICAgICAgICAgICAgY29uc3QgcmVhZGVyID0gcmVzcG9uc2UuYm9keS5nZXRSZWFkZXIoKTtcblxuICAgICAgICAgICAgLy8gVGhpcyB2YXJpYWJsZSBob2xkcyBhIHBvc3NpYmx5IGRhbmdsaW5nIGJ5dGUuXG4gICAgICAgICAgICB2YXIgcmVzdCA9IG51bGw7XG5cbiAgICAgICAgICAgIGxldCBpc0ZpcnN0QnVmZmVyID0gdHJ1ZTtcbiAgICAgICAgICAgIGxldCBudW1iZXJPZkNoYW5uZWxzLCBzYW1wbGVSYXRlO1xuXG4gICAgICAgICAgICBjb25zdCByZWFkID0gKCkgPT5cbiAgICAgICAgICAgICAgICByZWFkZXIucmVhZCgpLnRoZW4oKHsgdmFsdWUsIGRvbmUgfSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaGFzQ2FuY2VsZWRfKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWFkZXIuY2FuY2VsKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAodmFsdWUgJiYgdmFsdWUuYnVmZmVyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgYnVmZmVyLCBzZWdtZW50O1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVzdCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJ1ZmZlciA9IGNvbmNhdChyZXN0LCB2YWx1ZS5idWZmZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBidWZmZXIgPSB2YWx1ZS5idWZmZXI7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIE1ha2Ugc3VyZSB0aGF0IHRoZSBmaXJzdCBidWZmZXIgaXMgbGFnZXIgdGhlbiA0NCBieXRlcy5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpc0ZpcnN0QnVmZmVyICYmIGJ1ZmZlci5ieXRlTGVuZ3RoIDw9IDQ0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzdCA9IGJ1ZmZlcjtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlYWQoKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gSWYgdGhlIGhlYWRlciBoYXMgYXJyaXZlZCB0cnkgdG8gZGVyaXZlIHRoZSBudW1iZXJPZkNoYW5uZWxzIGFuZCB0aGVcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHNhbXBsZVJhdGUgb2YgdGhlIGluY29taW5nIGZpbGUuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNGaXJzdEJ1ZmZlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzRmlyc3RCdWZmZXIgPSBmYWxzZTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGRhdGFWaWV3ID0gbmV3IERhdGFWaWV3KGJ1ZmZlcik7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBudW1iZXJPZkNoYW5uZWxzID0gZGF0YVZpZXcuZ2V0VWludDE2KDIyLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzYW1wbGVSYXRlID0gZGF0YVZpZXcuZ2V0VWludDMyKDI0LCB0cnVlKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJ1ZmZlciA9IGJ1ZmZlci5zbGljZSg0NCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChidWZmZXIuYnl0ZUxlbmd0aCAlIDIgIT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXN0ID0gYnVmZmVyLnNsaWNlKC0yLCAtMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnVmZmVyID0gYnVmZmVyLnNsaWNlKDAsIC0xKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzdCA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHNlZ21lbnQgPSB7fTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgYXVkaW9TdGFjay5wdXNoKHNlZ21lbnQpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBjb250ZXh0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLmRlY29kZUF1ZGlvRGF0YSh3YXZpZnkoYnVmZmVyLCBudW1iZXJPZkNoYW5uZWxzLCBzYW1wbGVSYXRlKSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAudGhlbihhdWRpb0J1ZmZlciA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlZ21lbnQuYnVmZmVyID0gYXVkaW9CdWZmZXI7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNjaGVkdWxlQnVmZmVyc1RpbWVvdXRJZCA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2NoZWR1bGVCdWZmZXJzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmIChkb25lKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAvLyBjb250aW51ZSByZWFkaW5nXG4gICAgICAgICAgICAgICAgICAgIHJlYWQoKTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gc3RhcnQgcmVhZGluZ1xuICAgICAgICAgICAgcmVhZCgpO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgcGxheTogdXJsID0+IHBsYXkodXJsKSxcbiAgICAgICAgc3RvcDogKCkgPT4ge1xuICAgICAgICAgICAgaGFzQ2FuY2VsZWRfID0gdHJ1ZTtcbiAgICAgICAgICAgIGlmIChjb250ZXh0KSB7XG4gICAgICAgICAgICAgICAgY29udGV4dC5jbG9zZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IFdhdlBsYXllcjtcbiIsIi8vIENvbmNhdCB0d28gQXJyYXlCdWZmZXJzXG5jb25zdCBjb25jYXQgPSAoYnVmZmVyMSwgYnVmZmVyMikgPT4ge1xuICBjb25zdCB0bXAgPSBuZXcgVWludDhBcnJheShidWZmZXIxLmJ5dGVMZW5ndGggKyBidWZmZXIyLmJ5dGVMZW5ndGgpO1xuXG4gIHRtcC5zZXQobmV3IFVpbnQ4QXJyYXkoYnVmZmVyMSksIDApO1xuICB0bXAuc2V0KG5ldyBVaW50OEFycmF5KGJ1ZmZlcjIpLCBidWZmZXIxLmJ5dGVMZW5ndGgpO1xuXG4gIHJldHVybiB0bXAuYnVmZmVyO1xufTtcblxuZXhwb3J0IGRlZmF1bHQgY29uY2F0O1xuIiwiaW1wb3J0IFdhdlBsYXllciBmcm9tIFwiLi9XYXZQbGF5ZXJcIjtcblxuZXhwb3J0IGRlZmF1bHQgV2F2UGxheWVyO1xubW9kdWxlLmV4cG9ydHMgPSBXYXZQbGF5ZXI7XG4iLCJpbXBvcnQgY29uY2F0IGZyb20gXCIuL2NvbmNhdFwiO1xuXG4vLyBXcml0ZSBhIHByb3BlciBXQVZFIGhlYWRlciBmb3IgdGhlIGdpdmVuIGJ1ZmZlci5cbmNvbnN0IHdhdmlmeSA9IChkYXRhLCBudW1iZXJPZkNoYW5uZWxzLCBzYW1wbGVSYXRlKSA9PiB7XG4gICAgY29uc3QgaGVhZGVyID0gbmV3IEFycmF5QnVmZmVyKDQ0KTtcblxuICAgIHZhciBkID0gbmV3IERhdGFWaWV3KGhlYWRlcik7XG5cbiAgICBkLnNldFVpbnQ4KDAsIFwiUlwiLmNoYXJDb2RlQXQoMCkpO1xuICAgIGQuc2V0VWludDgoMSwgXCJJXCIuY2hhckNvZGVBdCgwKSk7XG4gICAgZC5zZXRVaW50OCgyLCBcIkZcIi5jaGFyQ29kZUF0KDApKTtcbiAgICBkLnNldFVpbnQ4KDMsIFwiRlwiLmNoYXJDb2RlQXQoMCkpO1xuXG4gICAgZC5zZXRVaW50MzIoNCwgZGF0YS5ieXRlTGVuZ3RoIC8gMiArIDQ0LCB0cnVlKTtcblxuICAgIGQuc2V0VWludDgoOCwgXCJXXCIuY2hhckNvZGVBdCgwKSk7XG4gICAgZC5zZXRVaW50OCg5LCBcIkFcIi5jaGFyQ29kZUF0KDApKTtcbiAgICBkLnNldFVpbnQ4KDEwLCBcIlZcIi5jaGFyQ29kZUF0KDApKTtcbiAgICBkLnNldFVpbnQ4KDExLCBcIkVcIi5jaGFyQ29kZUF0KDApKTtcbiAgICBkLnNldFVpbnQ4KDEyLCBcImZcIi5jaGFyQ29kZUF0KDApKTtcbiAgICBkLnNldFVpbnQ4KDEzLCBcIm1cIi5jaGFyQ29kZUF0KDApKTtcbiAgICBkLnNldFVpbnQ4KDE0LCBcInRcIi5jaGFyQ29kZUF0KDApKTtcbiAgICBkLnNldFVpbnQ4KDE1LCBcIiBcIi5jaGFyQ29kZUF0KDApKTtcblxuICAgIGQuc2V0VWludDMyKDE2LCAxNiwgdHJ1ZSk7XG4gICAgZC5zZXRVaW50MTYoMjAsIDEsIHRydWUpO1xuICAgIGQuc2V0VWludDE2KDIyLCBudW1iZXJPZkNoYW5uZWxzLCB0cnVlKTtcbiAgICBkLnNldFVpbnQzMigyNCwgc2FtcGxlUmF0ZSwgdHJ1ZSk7XG4gICAgZC5zZXRVaW50MzIoMjgsIHNhbXBsZVJhdGUgKiAxICogMik7XG4gICAgZC5zZXRVaW50MTYoMzIsIG51bWJlck9mQ2hhbm5lbHMgKiAyKTtcbiAgICBkLnNldFVpbnQxNigzNCwgMTYsIHRydWUpO1xuXG4gICAgZC5zZXRVaW50OCgzNiwgXCJkXCIuY2hhckNvZGVBdCgwKSk7XG4gICAgZC5zZXRVaW50OCgzNywgXCJhXCIuY2hhckNvZGVBdCgwKSk7XG4gICAgZC5zZXRVaW50OCgzOCwgXCJ0XCIuY2hhckNvZGVBdCgwKSk7XG4gICAgZC5zZXRVaW50OCgzOSwgXCJhXCIuY2hhckNvZGVBdCgwKSk7XG4gICAgZC5zZXRVaW50MzIoNDAsIGRhdGEuYnl0ZUxlbmd0aCwgdHJ1ZSk7XG5cbiAgICByZXR1cm4gY29uY2F0KGhlYWRlciwgZGF0YSk7XG59O1xuXG5leHBvcnQgZGVmYXVsdCB3YXZpZnk7XG4iXX0=
