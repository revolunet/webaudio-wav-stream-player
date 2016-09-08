import wavify from './wavify';
import concat from './concat';

const WavPlayer = () => {
    let hasCanceled_ = false;

    const play = url => {

        let nextTime = 0;

        const audioStack = [];

        hasCanceled_ = false;

        const context = new AudioContext();

        const scheduleBuffers = () => {
            while (audioStack.length > 0 && audioStack[0].buffer !== undefined) {
                const source = context.createBufferSource();

                const segment = audioStack.shift();

                source.buffer = segment.buffer;
                source.connect(context.destination);

                if (nextTime == 0) {
                    nextTime = context.currentTime + 0.3;  /// add 50ms latency to work well across systems - tune this if you like
                }

                source.start(nextTime);
                source.stop(nextTime + source.buffer.duration);

                nextTime += source.buffer.duration; // Make the next buffer wait the length of the last buffer before being played
            }
        }

        return fetch(url).then((response) => {

            const reader = response.body.getReader();

            // This variable holds a possibly dangling byte.
            var rest = null;

            let isFirstBuffer = true;
            let numberOfChannels, sampleRate;

            const read = () => reader.read().then(({ value, done }) => {
                if (hasCanceled_) {
                    reader.cancel();
                    context.close();
                    return;
                }
                if (value && value.buffer) {
                    let buffer,
                        segment;

                    if (rest !== null) {
                        buffer = concat(rest, value.buffer);
                    } else {
                        buffer = value.buffer;
                    }

                    // Make sure that the first buffer is lager then 44 bytes.
                    if (isFirstBuffer && buffer.byteLength < 44) {
                        rest = buffer;

                        read();

                        return;
                    }

                    // If the header has arrived try to derive the numberOfChannels and the
                    // sampleRate of the incoming file.
                    if (isFirstBuffer) {
                        isFirstBuffer = false;

                        const dataView = new DataView(buffer);

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

                    context.decodeAudioData(wavify(buffer, numberOfChannels, sampleRate)).then((audioBuffer) => {
                        segment.buffer = audioBuffer;

                        scheduleBuffers();
                    });
                }

                if (done) {
                    return;
                }

                // continue reading
                read();
            });

            // start reading
            read();
        });

    }

    return {
      play: url => play(url),
      stop: () => hasCanceled_ = true
  }
}

export default WavPlayer;