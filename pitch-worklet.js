class PitchProcessor extends AudioWorkletProcessor {
    constructor(options) {
        super();

        this.sampleRateValue = options?.processorOptions?.sampleRate || sampleRate;
        this.bufferSize = 16384;
        this.buffer = new Float32Array(this.bufferSize);
        this.writeIndex = 0;
        this.analysisHop = 2048;
        this.samplesSinceLastAnalysis = 0;
        this.minFrequency = 20;
        this.maxFrequency = 5000;
        this.prevRms = 0;
    }

    calculateRMS(buffer) {
        let sum = 0;

        for (let i = 0; i < buffer.length; i++) {
            sum += buffer[i] * buffer[i];
        }

        return Math.sqrt(sum / buffer.length);
    }

    removeDCAndNormalize(input) {
        const out = new Float32Array(input.length);
        let mean = 0;

        for (let i = 0; i < input.length; i++) {
            mean += input[i];
        }

        mean /= input.length;

        let peak = 0;

        for (let i = 0; i < input.length; i++) {
            const value = input[i] - mean;
            out[i] = value;
            const abs = Math.abs(value);

            if (abs > peak) {
                peak = abs;
            }
        }

        if (peak > 0) {
            for (let i = 0; i < out.length; i++) {
                out[i] /= peak;
            }
        }

        return out;
    }

    lowPass(input, cutoffHz) {
        const out = new Float32Array(input.length);
        const rc = 1 / (2 * Math.PI * cutoffHz);
        const dt = 1 / this.sampleRateValue;
        const alpha = dt / (rc + dt);

        out[0] = input[0];

        for (let i = 1; i < input.length; i++) {
            out[i] = out[i - 1] + alpha * (input[i] - out[i - 1]);
        }

        return out;
    }

    yin(buffer, sampleRateValue, minFrequency = this.minFrequency, maxFrequency = this.maxFrequency, absoluteThreshold = 0.18) {
        const halfBufferLength = Math.floor(buffer.length / 2);
        const yinBuffer = new Float32Array(halfBufferLength);

        for (let tau = 1; tau < halfBufferLength; tau++) {
            let sum = 0;

            for (let i = 0; i < halfBufferLength; i++) {
                const delta = buffer[i] - buffer[i + tau];
                sum += delta * delta;
            }

            yinBuffer[tau] = sum;
        }

        yinBuffer[0] = 1;
        let runningSum = 0;

        for (let tau = 1; tau < halfBufferLength; tau++) {
            runningSum += yinBuffer[tau];
            yinBuffer[tau] = (yinBuffer[tau] * tau) / (runningSum || 1);
        }

        const minTau = Math.floor(sampleRateValue / maxFrequency);
        const maxTau = Math.min(halfBufferLength - 1, Math.floor(sampleRateValue / minFrequency));

        let tauEstimate = -1;

        for (let tau = Math.max(2, minTau); tau < maxTau; tau++) {
            if (yinBuffer[tau] < absoluteThreshold) {
                while (tau + 1 < maxTau && yinBuffer[tau + 1] < yinBuffer[tau]) {
                    tau++;
                }

                tauEstimate = tau;
                break;
            }
        }

        if (tauEstimate === -1) {
            let bestTau = -1;
            let bestValue = Infinity;

            for (let tau = Math.max(2, minTau); tau < maxTau; tau++) {
                if (yinBuffer[tau] < bestValue) {
                    bestValue = yinBuffer[tau];
                    bestTau = tau;
                }
            }

            tauEstimate = bestTau;
        }

        if (tauEstimate <= 0) {
            return { pitch: null, clarity: 0 };
        }

        let betterTau = tauEstimate;

        if (tauEstimate > 1 && tauEstimate < halfBufferLength - 1) {
            const s0 = yinBuffer[tauEstimate - 1];
            const s1 = yinBuffer[tauEstimate];
            const s2 = yinBuffer[tauEstimate + 1];
            const denom = 2 * (2 * s1 - s2 - s0);

            if (denom !== 0) {
                betterTau = tauEstimate + (s2 - s0) / denom;
            }
        }

        const pitch = sampleRateValue / betterTau;
        const clarity = 1 - yinBuffer[tauEstimate];

        if (!Number.isFinite(pitch) || pitch < minFrequency || pitch > maxFrequency) {
            return { pitch: null, clarity: 0 };
        }

        return { pitch, clarity };
    }

    choosePitch(fullResult, lowResult) {
        if (!fullResult.pitch && !lowResult.pitch) {
            return { pitch: null, clarity: 0 };
        }

        if (!fullResult.pitch) {
            if (lowResult.pitch && lowResult.clarity >= 0.52) {
                return lowResult;
            }

            return { pitch: null, clarity: lowResult.clarity || 0 };
        }

        if (!lowResult.pitch) {
            return fullResult;
        }

        const nearOctave = Math.abs(fullResult.pitch - lowResult.pitch * 2) / (lowResult.pitch * 2) < 0.05;

        if (
            nearOctave &&
            lowResult.pitch >= 20 &&
            lowResult.pitch <= 120 &&
            lowResult.clarity >= 0.5 &&
            lowResult.clarity >= fullResult.clarity * 0.8
        ) {
            return lowResult;
        }

        return fullResult;
    }

    process(inputs) {
        const input = inputs[0];

        if (!input || !input[0] || input[0].length === 0) {
            return true;
        }

        const channel = input[0];

        for (let i = 0; i < channel.length; i++) {
            this.buffer[this.writeIndex] = channel[i];
            this.writeIndex = (this.writeIndex + 1) % this.bufferSize;
            this.samplesSinceLastAnalysis++;
        }

        if (this.samplesSinceLastAnalysis >= this.analysisHop) {
            this.samplesSinceLastAnalysis = 0;

            const analysisBuffer = new Float32Array(this.bufferSize);
            const tail = this.buffer.subarray(this.writeIndex);
            const head = this.buffer.subarray(0, this.writeIndex);
            analysisBuffer.set(tail, 0);
            analysisBuffer.set(head, tail.length);

            const rawRms = this.calculateRMS(analysisBuffer);
            const prepared = this.removeDCAndNormalize(analysisBuffer);
            const fullResult = this.yin(prepared, this.sampleRateValue, 25, this.maxFrequency, 0.18);
            const lowPrepared = this.lowPass(prepared, 140);
            const lowResult = this.yin(lowPrepared, this.sampleRateValue, 20, 120, 0.2);
            const result = this.choosePitch(fullResult, lowResult);
            const rmsRise = rawRms - this.prevRms;
            const isAttack = rmsRise > 0.004;

            this.prevRms = rawRms;

            this.port.postMessage({
                pitch: result.pitch,
                clarity: result.clarity,
                rms: rawRms,
                isAttack
            });
        }

        return true;
    }
}

registerProcessor('pitch-processor', PitchProcessor);
