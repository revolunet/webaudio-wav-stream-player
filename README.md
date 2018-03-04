# webaudio-wav-stream-player

No latency wav stream player using browser [fetch streaming API](https://streams.spec.whatwg.org/#rs) and [WebAudio](https://developer.mozilla.org/fr/docs/Web/API/Web_Audio_API)

![npm](https://img.shields.io/npm/v/webaudio-wav-stream-player.svg) ![license](https://img.shields.io/npm/l/webaudio-wav-stream-player.svg) ![github-issues](https://img.shields.io/github/issues/revolunet/webaudio-wav-stream-player.svg)

Tested on Chrome and [Firefox 57+ with some flags on]().

Example : http://revolunet.github.io/webaudio-wav-stream-player

Based on [@chrisguttandin](http://github.com/chrisguttandin) and [@revolunet](http://github.com/revolunet) work

## Usage

```js
import WavPlayer from 'webaudio-wav-stream-player';

let player = new WavPlayer();
player.play('http//domain/path/to/stream.wav');
player.stop();
```

## FAQ

 - you need CORS on the server streaming .wav

### Example express proxy to add CORS header to some remote uri

```js
// proxy /proxy/http://path/to/stream.wav

app.get('/proxy/*', function (req, res, next) {
  let remoteReq = request.get(req.params[0]);
  req.on("close", function() {
      remoteReq.abort();
      res.end();
  });
  req.pipe(remoteReq).pipe(res);
});

```

Inspiration : http://stackoverflow.com/questions/38589614/webaudio-streaming-with-fetch-domexception-unable-to-decode-audio-data/39988015#39988015
