// Audio stays in memory in this tab. No recording, storage, or network requests.
export function mountRoomLevel(host: HTMLElement) {
  host.innerHTML = `
    <h2 class="eyebrow">ROOM LEVEL</h2>
    <strong class="room-reading">OFF</strong>
    <div class="room-meter" role="meter" aria-label="Relative room level" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-valuetext="Microphone off">
      <div class="room-fill"></div>
    </div>
    <div class="room-zones" aria-hidden="true"><span>QUIET</span><span>GOOD</span><span>LOUD</span></div>
    <button type="button" class="room-toggle" aria-pressed="false">Enable microphone</button>
    <label>Sensitivity <input class="room-sensitivity" type="range" min="0" max="100" value="50" aria-describedby="room-help"></label>
    <p id="room-help">Higher sensitivity raises the reading. Relative level, not calibrated decibels. Audio stays on this device.</p>
    <p class="room-message" role="status">Microphone off.</p>`;

  const reading = host.querySelector<HTMLElement>('.room-reading')!;
  const meter = host.querySelector<HTMLElement>('.room-meter')!;
  const fill = host.querySelector<HTMLElement>('.room-fill')!;
  const button = host.querySelector<HTMLButtonElement>('.room-toggle')!;
  const sensitivity = host.querySelector<HTMLInputElement>('.room-sensitivity')!;
  const message = host.querySelector<HTMLElement>('.room-message')!;
  let context: AudioContext | null = null;
  let stream: MediaStream | null = null;
  let source: MediaStreamAudioSourceNode | null = null;
  let timer: ReturnType<typeof setInterval> | undefined;
  let requested = false;
  let generation = 0;

  function stop(note = 'Microphone off.') {
    generation++;
    requested = false;
    clearInterval(timer);
    source?.disconnect();
    source = null;
    stream?.getTracks().forEach(track => track.stop());
    stream = null;
    if (context) void context.close().catch(() => {});
    context = null;
    reading.textContent = 'OFF';
    host.dataset.level = 'off';
    fill.style.width = '0%';
    meter.setAttribute('aria-valuenow', '0');
    meter.setAttribute('aria-valuetext', 'Microphone off');
    button.textContent = 'Enable microphone';
    button.setAttribute('aria-pressed', 'false');
    message.textContent = note;
  }

  async function start() {
    if (!navigator.mediaDevices?.getUserMedia || !window.AudioContext) {
      message.textContent = 'Microphone unavailable. Open this app on localhost or HTTPS in a current browser.';
      return;
    }
    requested = true;
    const attempt = ++generation;
    button.textContent = 'Cancel microphone';
    message.textContent = 'Allow microphone access in your browser to begin.';
    try {
      // Resume during the click gesture; this context is separate from the timer chime.
      const audio = new AudioContext();
      context = audio;
      const ready = audio.resume();
      // Attach a rejection handler immediately while the permission prompt is open.
      void ready.catch(() => {});
      const capture = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        video: false
      });
      // A cancelled permission request can still resolve with a live stream.
      if (attempt !== generation) {
        capture.getTracks().forEach(track => track.stop());
        return;
      }
      stream = capture;
      await ready;
      if (attempt !== generation) return;
      const analyser = audio.createAnalyser();
      analyser.fftSize = 2048;
      source = audio.createMediaStreamSource(capture);
      source.connect(analyser); // Never connect microphone audio to speakers.
      const samples = new Float32Array(analyser.fftSize);
      let smoothed = 0;
      let previous = performance.now();
      let band = 'QUIET';
      button.textContent = 'Disable microphone';
      button.setAttribute('aria-pressed', 'true');
      capture.getAudioTracks().forEach(track => {
        track.addEventListener('ended', () => {
          if (attempt === generation) stop('Microphone disconnected. Enable it to try again.');
        });
      });

      function sample() {
        const now = performance.now();
        const elapsed = Math.min((now - previous) / 1000, 1);
        previous = now;
        if (audio.state !== 'running' || capture.getAudioTracks().some(track => track.muted)) {
          reading.textContent = 'PAUSED';
          host.dataset.level = 'off';
          fill.style.width = '0%';
          meter.setAttribute('aria-valuenow', '0');
          meter.setAttribute('aria-valuetext', 'Microphone paused');
          message.textContent = 'Microphone paused by the browser. Disable and enable it to retry.';
          smoothed = 0;
          return;
        }
        analyser.getFloatTimeDomainData(samples);
        let sum = 0;
        for (const value of samples) sum += value * value;
        const rms = Math.sqrt(sum / samples.length);
        // Logarithmic amplitude relative to digital full scale, NOT sound pressure.
        // Map -60..-10 to 0..100; sensitivity shifts the range by +/-20.
        const relative = 20 * Math.log10(Math.max(rms, 1e-8));
        const offset = (Number(sensitivity.value) - 50) * 0.4;
        const target = Math.max(0, Math.min(100, (relative + offset + 60) * 2));
        const tau = target > smoothed ? 0.35 : 0.8;
        smoothed += (target - smoothed) * (1 - Math.exp(-elapsed / tau));
        // Small hysteresis prevents labels flickering at the two boundaries.
        if (band === 'QUIET') band = smoothed >= 69 ? 'LOUD' : smoothed >= 36 ? 'GOOD' : 'QUIET';
        else if (band === 'LOUD') band = smoothed < 30 ? 'QUIET' : smoothed < 63 ? 'GOOD' : 'LOUD';
        else band = smoothed < 30 ? 'QUIET' : smoothed >= 69 ? 'LOUD' : 'GOOD';
        reading.textContent = band;
        host.dataset.level = band.toLowerCase();
        fill.style.width = `${smoothed}%`;
        meter.setAttribute('aria-valuenow', String(Math.round(smoothed)));
        meter.setAttribute('aria-valuetext', `${band.toLowerCase()}, ${Math.round(smoothed)} out of 100 relative level`);
        message.textContent = 'Microphone on · listening locally.';
      }
      sample();
      timer = setInterval(sample, 100);
    } catch (error) {
      if (attempt !== generation) return;
      const name = error instanceof DOMException ? error.name : '';
      stop(name === 'NotAllowedError'
        ? 'Microphone access denied. Allow access in browser and macOS settings, then try again.'
        : name === 'NotFoundError'
          ? 'No microphone found. Connect one and try again.'
          : 'Microphone could not start. Check access and other apps, then try again.');
    }
  }

  button.onclick = () => { if (requested) stop(); else void start(); };
  window.addEventListener('pagehide', () => stop());
}
