export const getAudioContext = () => {
	const AudioContextClass =
		window.AudioContext ||
		(window as unknown as { webkitAudioContext: typeof AudioContext })
			.webkitAudioContext;
	if (!AudioContextClass) return null;
	return new AudioContextClass();
};

let audioCtx: AudioContext | null = null;

export const playDealCardSound = () => {
	try {
		if (!audioCtx) audioCtx = getAudioContext();
		if (!audioCtx) return;

		const t = audioCtx.currentTime;
		const osc = audioCtx.createOscillator();
		const gain = audioCtx.createGain();

		osc.type = "triangle";
		osc.frequency.setValueAtTime(300, t);
		osc.frequency.exponentialRampToValueAtTime(100, t + 0.1);

		gain.gain.setValueAtTime(0, t);
		gain.gain.linearRampToValueAtTime(0.1, t + 0.02);
		gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

		osc.connect(gain);
		gain.connect(audioCtx.destination);

		osc.start(t);
		osc.stop(t + 0.1);
	} catch (e) {
		console.error(e);
	}
};

export const playWinSound = () => {
	try {
		if (!audioCtx) audioCtx = getAudioContext();
		if (!audioCtx) return;

		const t = audioCtx.currentTime;
		const osc1 = audioCtx.createOscillator();
		const osc2 = audioCtx.createOscillator();
		const gain = audioCtx.createGain();

		osc1.type = "sine";
		osc2.type = "sine";

		osc1.frequency.setValueAtTime(440, t); // A4
		osc1.frequency.setValueAtTime(554.37, t + 0.1); // C#5
		osc1.frequency.setValueAtTime(659.25, t + 0.2); // E5

		osc2.frequency.setValueAtTime(554.37, t);
		osc2.frequency.setValueAtTime(659.25, t + 0.1);
		osc2.frequency.setValueAtTime(880, t + 0.2); // A5

		gain.gain.setValueAtTime(0, t);
		gain.gain.linearRampToValueAtTime(0.1, t + 0.05);
		gain.gain.setValueAtTime(0.1, t + 0.4);
		gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

		osc1.connect(gain);
		osc2.connect(gain);
		gain.connect(audioCtx.destination);

		osc1.start(t);
		osc2.start(t);
		osc1.stop(t + 0.6);
		osc2.stop(t + 0.6);
	} catch (e) {
		console.error(e);
	}
};
