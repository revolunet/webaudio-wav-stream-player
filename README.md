# webaudio-wav-stream-player

instantly play a remote wav stream using [fetch streaming API]() and [WebAudio]()

## Usage

```js
import Player from 'webaudio-wav-stream-player';

let player = new Player();
player.play('http//domain/path/to/stream.wav');
player.stop();
```

## FAQ

 - you need CORS on the server streaming .wav
 - or you can proxy the stream with a mitm express server :

```js
// proxy /proxy/http://path/to/stream.wav

app.get('/proxy/*', function (req, res, next) {
  req.pipe(request.get(req.params[0])).pipe(res);
});
```