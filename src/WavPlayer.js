import wavify from './wavify';
import concat from './concat';

const pad = (buffer) => {
    const currentSample = new Float32Array(1);

    buffer.copyFromChannel(currentSample, 0, 0);

    let wasPositive = (currentSample[0] > 0);

    for (let i = 0; i < buffer.length; i += 1) {
        buffer.copyFromChannel(currentSample, 0, i);

        if ((wasPositive && currentSample[0] < 0) ||
                (!wasPositive && currentSample[0] > 0)) {
            break;
        }

        currentSample[0] = 0;
        buffer.copyToChannel(currentSample, 0, i);
    }

    buffer.copyFromChannel(currentSample, 0, buffer.length - 1);

    wasPositive = (currentSample[0] > 0);

    for (let i = buffer.length - 1; i > 0; i -= 1) {
        buffer.copyFromChannel(currentSample, 0, i);

        if ((wasPositive && currentSample[0] < 0) ||
                (!wasPositive && currentSample[0] > 0)) {
            break;
        }

        currentSample[0] = 0;
        buffer.copyToChannel(currentSample, 0, i);
    }

    return buffer;
};

const WavPlayer = () => {
    let context;

    let hasCanceled_ = false;

    const play = url => {

        let nextTime = 0;

        const audioStack = [];

        hasCanceled_ = false;

        context = new AudioContext();

        let scheduleBuffersTimeoutId = null;

        const scheduleBuffers = () => {
            if (hasCanceled_) {
                scheduleBuffersTimeoutId = null;

                return;
            }

            while (audioStack.length > 0 && audioStack[0].buffer !== undefined && nextTime < context.currentTime + 2) {
                const currentTime = context.currentTime;

                const source = context.createBufferSource();

                const segment = audioStack.shift();

                source.buffer = pad(segment.buffer);
                source.connect(context.destination);

                if (nextTime == 0) {
                    nextTime = currentTime + 0.3;  /// add 300ms latency to work well across systems - tune this if you like
                }

                let duration = source.buffer.duration;
                let offset = 0;

                if (currentTime > nextTime) {
                    offset = currentTime - nextTime;
                    nextTime = currentTime;
                    duration = duration - offset;
                }

                source.start(nextTime, offset);
                source.stop(nextTime + duration);

                nextTime += duration; // Make the next buffer wait the length of the last buffer before being played
            }

            scheduleBuffersTimeoutId = setTimeout(() => scheduleBuffers(), 500);
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
                    if (isFirstBuffer && buffer.byteLength <= 44) {
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

                        if (scheduleBuffersTimeoutId === null) {
                            scheduleBuffers();
                        }
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
        stop: () => {
            hasCanceled_ = true;
            context.close();
        }
    }
}

export default WavPlayer;