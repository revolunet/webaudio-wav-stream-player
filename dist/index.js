(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.WavPlayer = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _wavify = require('./wavify');

var _wavify2 = _interopRequireDefault(_wavify);

var _concat = require('./concat');

var _concat2 = _interopRequireDefault(_concat);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var WavPlayer = function WavPlayer() {
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

},{}]},{},[3])(3)
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvV2F2UGxheWVyLmpzIiwic3JjL2NvbmNhdC5qcyIsInNyYy9pbmRleC5qcyIsInNyYy93YXZpZnkuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7QUNBQTs7OztBQUNBOzs7Ozs7QUFFQSxJQUFNLFlBQVksU0FBWixTQUFZLEdBQU07QUFDcEIsUUFBSSxlQUFlLEtBQW5COztBQUVBLFFBQU0sUUFBTyxTQUFQLEtBQU8sTUFBTzs7QUFFaEIsWUFBSSxXQUFXLENBQWY7O0FBRUEsWUFBTSxhQUFhLEVBQW5COztBQUVBLHVCQUFlLEtBQWY7O0FBRUEsWUFBTSxVQUFVLElBQUksWUFBSixFQUFoQjs7QUFFQSxlQUFPLE1BQU0sR0FBTixFQUNGLElBREUsQ0FDRyxVQUFDLFFBQUQsRUFBYztBQUNoQixnQkFBTSxTQUFTLFNBQVMsSUFBVCxDQUFjLFNBQWQsRUFBZjs7QUFFQTtBQUNBLGdCQUFJLE9BQU8sSUFBWDs7QUFFQSxnQkFBTSxPQUFPLFNBQVAsSUFBTztBQUFBLHVCQUFNLE9BQU8sSUFBUCxHQUNkLElBRGMsQ0FDVCxnQkFBcUI7QUFBQSx3QkFBbEIsS0FBa0IsUUFBbEIsS0FBa0I7QUFBQSx3QkFBWCxJQUFXLFFBQVgsSUFBVzs7QUFDdkIsd0JBQUksWUFBSixFQUFrQjtBQUNoQiwrQkFBTyxNQUFQO0FBQ0EsZ0NBQVEsS0FBUjtBQUNBO0FBQ0Q7QUFDRCx3QkFBSSxTQUFTLE1BQU0sTUFBbkIsRUFBMkI7QUFDdkIsNEJBQUksZUFBSjs7QUFFQSw0QkFBSSxTQUFTLElBQWIsRUFBbUI7QUFDZixxQ0FBUyxzQkFBTyxJQUFQLEVBQWEsTUFBTSxNQUFuQixDQUFUO0FBQ0gseUJBRkQsTUFFTztBQUNILHFDQUFTLE1BQU0sTUFBZjtBQUNIOztBQUVELDRCQUFJLE9BQU8sVUFBUCxHQUFvQixDQUFwQixLQUEwQixDQUE5QixFQUFpQztBQUM3QixtQ0FBTyxP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QXJCLEVBQWlDLElBQWpDOztBQUVBLFdBQU8sT0FBTyxNQUFQLEVBQWUsSUFBZixDQUFQO0FBQ0gsQ0FwQ0Q7O2tCQXNDZSxNIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsImltcG9ydCB3YXZpZnkgZnJvbSAnLi93YXZpZnknO1xuaW1wb3J0IGNvbmNhdCBmcm9tICcuL2NvbmNhdCc7XG5cbmNvbnN0IFdhdlBsYXllciA9ICgpID0+IHtcbiAgICBsZXQgaGFzQ2FuY2VsZWRfID0gZmFsc2U7XG5cbiAgICBjb25zdCBwbGF5ID0gdXJsID0+IHtcblxuICAgICAgICBsZXQgbmV4dFRpbWUgPSAwO1xuXG4gICAgICAgIGNvbnN0IGF1ZGlvU3RhY2sgPSBbXTtcblxuICAgICAgICBoYXNDYW5jZWxlZF8gPSBmYWxzZTtcblxuICAgICAgICBjb25zdCBjb250ZXh0ID0gbmV3IEF1ZGlvQ29udGV4dCgpO1xuXG4gICAgICAgIHJldHVybiBmZXRjaCh1cmwpXG4gICAgICAgICAgICAudGhlbigocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCByZWFkZXIgPSByZXNwb25zZS5ib2R5LmdldFJlYWRlcigpO1xuXG4gICAgICAgICAgICAgICAgLy8gVGhpcyB2YXJpYWJsZSBob2xkcyBhIHBvc3NpYmx5IGRhbmdsaW5nIGJ5dGUuXG4gICAgICAgICAgICAgICAgdmFyIHJlc3QgPSBudWxsO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgcmVhZCA9ICgpID0+IHJlYWRlci5yZWFkKClcbiAgICAgICAgICAgICAgICAgICAgLnRoZW4oKHsgdmFsdWUsIGRvbmUgfSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGhhc0NhbmNlbGVkXykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICByZWFkZXIuY2FuY2VsKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRleHQuY2xvc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHZhbHVlICYmIHZhbHVlLmJ1ZmZlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBidWZmZXI7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVzdCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBidWZmZXIgPSBjb25jYXQocmVzdCwgdmFsdWUuYnVmZmVyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBidWZmZXIgPSB2YWx1ZS5idWZmZXI7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGJ1ZmZlci5ieXRlTGVuZ3RoICUgMiAhPT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXN0ID0gYnVmZmVyLnNsaWNlKC0yLCAtMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJ1ZmZlciA9IGJ1ZmZlci5zbGljZSgwLCAtMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzdCA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGV4dC5kZWNvZGVBdWRpb0RhdGEod2F2aWZ5KGJ1ZmZlcikpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC50aGVuKChhdWRpb0J1ZmZlcikgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXVkaW9TdGFjay5wdXNoKGF1ZGlvQnVmZmVyKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGF1ZGlvU3RhY2subGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2NoZWR1bGVCdWZmZXJzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZG9uZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgcmVhZCgpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIHJlYWQoKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIGNvbnN0IHNjaGVkdWxlQnVmZmVycyA9ICgpID0+IHtcbiAgICAgICAgICAgIHdoaWxlIChhdWRpb1N0YWNrLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHNvdXJjZSA9IGNvbnRleHQuY3JlYXRlQnVmZmVyU291cmNlKCk7XG5cbiAgICAgICAgICAgICAgICBzb3VyY2UuYnVmZmVyID0gYXVkaW9TdGFjay5zaGlmdCgpO1xuXG4gICAgICAgICAgICAgICAgc291cmNlLmNvbm5lY3QoY29udGV4dC5kZXN0aW5hdGlvbik7XG5cbiAgICAgICAgICAgICAgICBpZiAobmV4dFRpbWUgPT0gMCkge1xuICAgICAgICAgICAgICAgICAgICBuZXh0VGltZSA9IGNvbnRleHQuY3VycmVudFRpbWUgKyAwLjM7ICAvLy8gYWRkIDUwbXMgbGF0ZW5jeSB0byB3b3JrIHdlbGwgYWNyb3NzIHN5c3RlbXMgLSB0dW5lIHRoaXMgaWYgeW91IGxpa2VcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBzb3VyY2Uuc3RhcnQobmV4dFRpbWUpO1xuICAgICAgICAgICAgICAgIHNvdXJjZS5zdG9wKG5leHRUaW1lICsgc291cmNlLmJ1ZmZlci5kdXJhdGlvbik7XG5cbiAgICAgICAgICAgICAgICBuZXh0VGltZSArPSBzb3VyY2UuYnVmZmVyLmR1cmF0aW9uOyAvLyBNYWtlIHRoZSBuZXh0IGJ1ZmZlciB3YWl0IHRoZSBsZW5ndGggb2YgdGhlIGxhc3QgYnVmZmVyIGJlZm9yZSBiZWluZyBwbGF5ZWRcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgcGxheTogdXJsID0+IHBsYXkodXJsKSxcbiAgICAgIHN0b3A6ICgpID0+IGhhc0NhbmNlbGVkXyA9IHRydWVcbiAgICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IFdhdlBsYXllcjsiLCJcblxuLy8gQ29uY2F0IHR3byBBcnJheUJ1ZmZlcnNcbmNvbnN0IGNvbmNhdCA9IChidWZmZXIxLCBidWZmZXIyKSA9PiB7XG4gICAgY29uc3QgdG1wID0gbmV3IFVpbnQ4QXJyYXkoYnVmZmVyMS5ieXRlTGVuZ3RoICsgYnVmZmVyMi5ieXRlTGVuZ3RoKTtcblxuICAgIHRtcC5zZXQobmV3IFVpbnQ4QXJyYXkoYnVmZmVyMSksIDApO1xuICAgIHRtcC5zZXQobmV3IFVpbnQ4QXJyYXkoYnVmZmVyMiksIGJ1ZmZlcjEuYnl0ZUxlbmd0aCk7XG5cbiAgICByZXR1cm4gdG1wLmJ1ZmZlcjtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IGNvbmNhdDtcbiIsImltcG9ydCBXYXZQbGF5ZXIgZnJvbSAnLi9XYXZQbGF5ZXInO1xuXG5leHBvcnQgZGVmYXVsdCBXYXZQbGF5ZXI7XG5tb2R1bGUuZXhwb3J0cyA9IFdhdlBsYXllcjsiLCJcbi8vIFdyaXRlIGEgcHJvcGVyIFdBVkUgaGVhZGVyIGZvciB0aGUgZ2l2ZW4gYnVmZmVyLlxuY29uc3Qgd2F2aWZ5ID0gKGRhdGEpID0+IHtcbiAgICBjb25zdCBoZWFkZXIgPSBuZXcgQXJyYXlCdWZmZXIoNDQpO1xuXG4gICAgdmFyIGQgPSBuZXcgIERhdGFWaWV3KGhlYWRlcik7XG5cbiAgICBkLnNldFVpbnQ4KDAsICdSJy5jaGFyQ29kZUF0KDApKTtcbiAgICBkLnNldFVpbnQ4KDEsICdJJy5jaGFyQ29kZUF0KDApKTtcbiAgICBkLnNldFVpbnQ4KDIsICdGJy5jaGFyQ29kZUF0KDApKTtcbiAgICBkLnNldFVpbnQ4KDMsICdGJy5jaGFyQ29kZUF0KDApKTtcblxuICAgIGQuc2V0VWludDMyKDQsIGRhdGEuYnl0ZUxlbmd0aCAvIDIgKyA0NCwgdHJ1ZSk7XG5cbiAgICBkLnNldFVpbnQ4KDgsICdXJy5jaGFyQ29kZUF0KDApKTtcbiAgICBkLnNldFVpbnQ4KDksICdBJy5jaGFyQ29kZUF0KDApKTtcbiAgICBkLnNldFVpbnQ4KDEwLCAnVicuY2hhckNvZGVBdCgwKSk7XG4gICAgZC5zZXRVaW50OCgxMSwgJ0UnLmNoYXJDb2RlQXQoMCkpO1xuICAgIGQuc2V0VWludDgoMTIsICdmJy5jaGFyQ29kZUF0KDApKTtcbiAgICBkLnNldFVpbnQ4KDEzLCAnbScuY2hhckNvZGVBdCgwKSk7XG4gICAgZC5zZXRVaW50OCgxNCwgJ3QnLmNoYXJDb2RlQXQoMCkpO1xuICAgIGQuc2V0VWludDgoMTUsICcgJy5jaGFyQ29kZUF0KDApKTtcblxuICAgIGQuc2V0VWludDMyKDE2LCAxNiwgdHJ1ZSk7XG4gICAgZC5zZXRVaW50MTYoMjAsIDEsIHRydWUpO1xuICAgIGQuc2V0VWludDE2KDIyLCAxLCB0cnVlKTtcbiAgICBkLnNldFVpbnQzMigyNCwgMTEwMjUsIHRydWUpO1xuICAgIGQuc2V0VWludDMyKDI4LCAxMTAyNSAqIDEgKiAyKTtcbiAgICBkLnNldFVpbnQxNigzMiwgMSAqIDIpO1xuICAgIGQuc2V0VWludDE2KDM0LCAxNiwgdHJ1ZSk7XG5cbiAgICBkLnNldFVpbnQ4KDM2LCAnZCcuY2hhckNvZGVBdCgwKSk7XG4gICAgZC5zZXRVaW50OCgzNywgJ2EnLmNoYXJDb2RlQXQoMCkpO1xuICAgIGQuc2V0VWludDgoMzgsICd0Jy5jaGFyQ29kZUF0KDApKTtcbiAgICBkLnNldFVpbnQ4KDM5LCAnYScuY2hhckNvZGVBdCgwKSk7XG4gICAgZC5zZXRVaW50MzIoNDAsIGRhdGEuYnl0ZUxlbmd0aCwgdHJ1ZSk7XG5cbiAgICByZXR1cm4gY29uY2F0KGhlYWRlciwgZGF0YSk7XG59O1xuXG5leHBvcnQgZGVmYXVsdCB3YXZpZnkiXX0=
