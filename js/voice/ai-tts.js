"use strict";
(function () {
  const cache = new Map();
  let audio = null;
  let objectUrl = "";
  let version = 0;
  let speed = 1;
  let lastBlob = null;
  let lastCallbacks = null;

  function cleanupAudio() {
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audio = null;
    }
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = "";
    }
  }

  function stop() {
    version += 1;
    cleanupAudio();
  }

  function setSpeed(value) {
    const next = Number(value);
    speed = Number.isFinite(next) && next > 0 ? next : 1;
    if (audio) audio.playbackRate = speed;
    return speed;
  }

  function pause() {
    if (audio && !audio.paused) {
      audio.pause();
      return true;
    }
    return false;
  }

  async function resume() {
    if (!audio || !audio.paused || audio.ended) return false;
    audio.playbackRate = speed;
    await audio.play();
    return true;
  }

  function startBlob(blob, callbacks, mine) {
    cleanupAudio();
    objectUrl = URL.createObjectURL(blob);
    audio = new Audio(objectUrl);
    audio.playbackRate = speed;
    audio.addEventListener("playing", () => {
      if (mine === version && callbacks.onPlaying) callbacks.onPlaying();
    });
    audio.addEventListener("ended", () => {
      if (mine !== version) return;
      cleanupAudio();
      if (callbacks.onEnd) callbacks.onEnd();
    });
    audio.addEventListener("error", () => {
      if (mine === version && callbacks.onError) {
        callbacks.onError(new Error("Browser audio playback failed."));
      }
    });
    return audio.play();
  }

  async function replay() {
    if (!lastBlob) return false;
    stop();
    const mine = version;
    const callbacks = lastCallbacks || {};
    if (callbacks.onLoading) callbacks.onLoading();
    try {
      await startBlob(lastBlob, callbacks, mine);
      return true;
    } catch (error) {
      if (mine === version && callbacks.onError) callbacks.onError(error);
      return false;
    }
  }

  async function play(o) {
    stop();
    const mine = version;
    const text = typeof o.text === "string" ? o.text.trim() : "";
    if (!o.gatewayUrl || !text) throw new Error("AI TTS request is incomplete.");
    const callbacks = {
      onLoading: o.onLoading,
      onPlaying: o.onPlaying,
      onEnd: o.onEnd,
      onError: o.onError
    };
    lastCallbacks = callbacks;
    if (o.onLoading) o.onLoading();
    try {
      let blob = cache.get(o.cacheKey);
      if (!blob) {
        const headers = {"Content-Type":"application/json"};
        if (o.accessToken) headers["X-BCL-Access-Token"] = o.accessToken;
        const r = await fetch(o.gatewayUrl.replace(/\/+$/, "") + "/tts", {
          method:"POST",
          headers,
          body:JSON.stringify({text, targetLanguage:o.targetLanguage})
        });
        if (!r.ok) {
          let m = "AI TTS request failed.";
          try {
            const d = await r.json();
            if (d && typeof d.error === "string") m = d.error;
          } catch (e) {}
          throw new Error(m);
        }
        blob = await r.blob();
        if (!blob || !blob.size) throw new Error("AI TTS returned no audio.");
        cache.set(o.cacheKey, blob);
      }
      if (mine !== version) return;
      lastBlob = blob;
      await startBlob(blob, callbacks, mine);
    } catch (e) {
      if (mine !== version) return;
      cleanupAudio();
      if (o.onError) {
        o.onError(e);
        return;
      }
      throw e;
    }
  }

  window.BCLAITTS = {play, stop, pause, resume, replay, setSpeed};
})();
