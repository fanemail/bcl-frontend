"use strict";

(function () {
  function createError(message, code) {
    const error = new Error(message);
    error.code = code;
    return error;
  }

  function createAudioCapture() {
    let mediaRecorder = null;
    let mediaStream = null;
    let chunks = [];
    let startedAt = 0;
    let stopPromise = null;
    let stopResolve = null;
    let stopReject = null;

    function isSupported() {
      return Boolean(
        navigator.mediaDevices &&
        typeof navigator.mediaDevices.getUserMedia === "function" &&
        typeof window.MediaRecorder === "function"
      );
    }

    function stopTracks() {
      if (!mediaStream) {
        return;
      }

      for (const track of mediaStream.getTracks()) {
        track.stop();
      }

      mediaStream = null;
    }

    function reset() {
      mediaRecorder = null;
      chunks = [];
      startedAt = 0;
      stopPromise = null;
      stopResolve = null;
      stopReject = null;
    }

    async function start() {
      if (!isSupported()) {
        throw createError(
          "Voice recording is not supported in this browser.",
          "AUDIO_CAPTURE_UNSUPPORTED"
        );
      }

      if (mediaRecorder && mediaRecorder.state !== "inactive") {
        throw createError(
          "A voice recording is already active.",
          "AUDIO_CAPTURE_ACTIVE"
        );
      }

      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: true
        });
      } catch (error) {
        const wrapped = createError(
          error && error.name === "NotAllowedError"
            ? "Microphone permission was denied. You can keep typing normally."
            : "BCL could not start the microphone. You can keep typing normally.",
          error && error.name === "NotAllowedError"
            ? "MICROPHONE_PERMISSION_DENIED"
            : "MICROPHONE_START_FAILED"
        );
        wrapped.cause = error;
        throw wrapped;
      }

      chunks = [];
      mediaRecorder = new MediaRecorder(mediaStream);
      startedAt = Date.now();

      stopPromise = new Promise((resolve, reject) => {
        stopResolve = resolve;
        stopReject = reject;
      });

      mediaRecorder.addEventListener("dataavailable", (event) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
        }
      });

      mediaRecorder.addEventListener("error", (event) => {
        const error = createError(
          "The browser reported a recording error.",
          "AUDIO_CAPTURE_FAILED"
        );

        if (stopReject) {
          stopReject(error);
        }

        stopTracks();
        reset();
      });

      mediaRecorder.addEventListener("stop", () => {
        const mimeType =
          mediaRecorder && mediaRecorder.mimeType
            ? mediaRecorder.mimeType
            : "audio/webm";

        const result = {
          blob: new Blob(chunks, { type: mimeType }),
          mimeType,
          durationMs: Math.max(0, Date.now() - startedAt)
        };

        if (stopResolve) {
          stopResolve(result);
        }

        stopTracks();
        reset();
      });

      mediaRecorder.start();

      return {
        startedAt
      };
    }

    async function stop() {
      if (!mediaRecorder || mediaRecorder.state === "inactive") {
        throw createError(
          "No active voice recording is available to stop.",
          "AUDIO_CAPTURE_NOT_ACTIVE"
        );
      }

      const resultPromise = stopPromise;
      mediaRecorder.stop();
      return resultPromise;
    }

    function cancel() {
      if (!mediaRecorder) {
        stopTracks();
        reset();
        return;
      }

      const recorder = mediaRecorder;

      stopResolve = () => {};
      stopReject = () => {};

      if (recorder.state !== "inactive") {
        recorder.stop();
      } else {
        stopTracks();
        reset();
      }
    }

    function getState() {
      if (!mediaRecorder) {
        return "idle";
      }

      return mediaRecorder.state;
    }

    return {
      isSupported,
      start,
      stop,
      cancel,
      getState
    };
  }

  window.BCLAudioCapture = {
    createAudioCapture
  };
})();
