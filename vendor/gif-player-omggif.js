// Minimal GIF player built on top of omggif's GifReader
// Exposes GifPlayer.create(url, canvas) -> returns controller {start, stop, destroy}
(function(global){
  function createPlayer(url, canvas) {
    let stopped = false;
    let destroyed = false;
    let raf = null;
    const ctx = canvas.getContext('2d');
    let reader = null;
    let width = 0, height = 0;
    let frameCount = 0;
    let frameIndex = 0;
    let frameBuffer = null; // Uint8Array for full canvas RGBA
    let lastTime = 0;
    let delays = [];

    function fetchAndParse() {
      return fetch(url).then(r => r.arrayBuffer()).then(buf => {
        const u8 = new Uint8Array(buf);
        reader = new GifReader(u8);
        width = reader.width;
        height = reader.height;
        frameCount = reader.numFrames();
        frameBuffer = new Uint8Array(width * height * 4);
        // Try to prefetch delays
        delays = [];
        for (let i = 0; i < frameCount; i++) {
          const info = reader.frameInfo(i);
          delays.push(info.delay || 10);
        }
        // Resize canvas if needed
        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
        }
        return true;
      });
    }

    function step(ts) {
      if (stopped || destroyed) return;
      if (!lastTime) lastTime = ts;
      const delay = (delays[frameIndex] || 10) * 10; // convert GIF 0.01s units -> ms
      if (ts - lastTime >= delay) {
        // decode frame into frameBuffer and putImageData
        try {
          reader.decodeAndBlitFrameRGBA(frameIndex, frameBuffer);
          // create ImageData and put into canvas
          const imageData = new ImageData(new Uint8ClampedArray(frameBuffer), width, height);
          ctx.putImageData(imageData, 0, 0);
        } catch (e) {
          // decoding error
        }
        frameIndex = (frameIndex + 1) % frameCount;
        lastTime = ts;
      }
      raf = requestAnimationFrame(step);
    }

    function start() {
      if (stopped) { stopped = false; }
      if (!reader) {
        return fetchAndParse().then(() => { raf = requestAnimationFrame(step); return controller; });
      }
      if (!raf) raf = requestAnimationFrame(step);
      return Promise.resolve(controller);
    }
    function stop() { stopped = true; if (raf) { cancelAnimationFrame(raf); raf = null; } }
    function destroy() { destroyed = true; stop(); reader = null; frameBuffer = null; }

    const controller = { start, stop, destroy, _internal: { url } };
    return controller;
  }

  global.GifPlayer = { create: createPlayer };
})(window);
