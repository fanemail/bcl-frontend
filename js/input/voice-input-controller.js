"use strict";

(function () {
  const {
    createAudioCapture
  } = window.BCLAudioCapture;

  const {
    transcribe
  } = window.BCLSpeechToText;

  const {
    cleanTranscript
  } = window.BCLSpeechCleanup;

  function formatElapsed(totalSeconds) {
    const safeSeconds = Math.max(0, totalSeconds);
    const minutes = Math.floor(safeSeconds / 60);
    const seconds = safeSeconds % 60;

    return (
      String(minutes).padStart(2, "0") +
      ":" +
      String(seconds).padStart(2, "0")
    );
  }

  function createVoiceInputController({
    microphoneButton,
    recordingState,
    recordingLabel,
    recordingTimer,
    cancelButton,
    stopButton,
    notice,
    messageInput
  }) {
    const capture = createAudioCapture();

    let state = "idle";
    let timerId = null;
    let startedAt = 0;

    function showNotice(message, kind = "info") {
      notice.textContent = message;
      notice.dataset.kind = kind;
      notice.hidden = false;
    }

    function hideNotice() {
      notice.textContent = "";
      notice.dataset.kind = "info";
      notice.hidden = true;
    }

    function stopTimer() {
      if (timerId !== null) {
        window.clearInterval(timerId);
        timerId = null;
      }
    }

    function updateTimer() {
      const seconds =
        Math.floor((Date.now() - startedAt) / 1000);

      recordingTimer.textContent =
        formatElapsed(seconds);
    }

    function setState(nextState) {
      state = nextState;
      recordingState.dataset.state = nextState;

      if (nextState === "idle") {
        stopTimer();
        recordingState.hidden = true;
        recordingLabel.textContent = "Recording";
        recordingTimer.textContent = "00:00";
        microphoneButton.disabled = false;
        microphoneButton.setAttribute(
          "aria-pressed",
          "false"
        );
        cancelButton.disabled = false;
        stopButton.disabled = false;
        return;
      }

      recordingState.hidden = false;
      microphoneButton.setAttribute(
        "aria-pressed",
        "true"
      );

      if (nextState === "recording") {
        microphoneButton.disabled = true;
        recordingLabel.textContent = "Recording";
        cancelButton.disabled = false;
        stopButton.disabled = false;
        return;
      }

      if (nextState === "processing") {
        stopTimer();
        microphoneButton.disabled = true;
        recordingLabel.textContent = "Processing";
        cancelButton.disabled = true;
        stopButton.disabled = true;
      }
    }

    function insertTranscriptAtCursor(transcript) {
      const start =
        typeof messageInput.selectionStart === "number"
          ? messageInput.selectionStart
          : messageInput.value.length;

      const end =
        typeof messageInput.selectionEnd === "number"
          ? messageInput.selectionEnd
          : start;

      const before = messageInput.value.slice(0, start);
      const after = messageInput.value.slice(end);

      const needsLeadingSpace =
        before.length > 0 &&
        !/\s$/.test(before);

      const needsTrailingSpace =
        after.length > 0 &&
        !/^\s/.test(after);

      const insertion =
        (needsLeadingSpace ? " " : "") +
        transcript +
        (needsTrailingSpace ? " " : "");

      messageInput.value =
        before + insertion + after;

      const caret =
        before.length + insertion.length;

      messageInput.focus();
      messageInput.setSelectionRange(caret, caret);
      messageInput.dispatchEvent(
        new Event("input", { bubbles: true })
      );
    }

    async function start() {
      if (state !== "idle") {
        return;
      }

      hideNotice();

      try {
        await capture.start();

        startedAt = Date.now();
        recordingTimer.textContent = "00:00";
        setState("recording");

        timerId = window.setInterval(
          updateTimer,
          250
        );
      } catch (error) {
        setState("idle");
        showNotice(
          error.message ||
            "Voice recording could not start. You can keep typing normally.",
          "error"
        );
      }
    }

    function cancel() {
      if (state !== "recording") {
        return;
      }

      capture.cancel();
      setState("idle");
      showNotice(
        "Voice recording cancelled. Your text draft was not changed."
      );
      messageInput.focus();
    }

    async function stop() {
      if (state !== "recording") {
        return;
      }

      setState("processing");

      let audio;

      try {
        audio = await capture.stop();

        const rawTranscript =
          await transcribe(audio, {
            inputModality: "voice"
          });

        const transcript =
          cleanTranscript(rawTranscript);

        if (!transcript) {
          throw new Error(
            "Speech-to-text returned an empty transcript."
          );
        }

        insertTranscriptAtCursor(transcript);
        setState("idle");

        showNotice(
          "Transcript ready. Review or edit it, then press Send."
        );
      } catch (error) {
        setState("idle");

        if (
          error &&
          error.code === "STT_PROVIDER_UNAVAILABLE"
        ) {
          showNotice(
            "Recording works, but the speech-to-text provider is intentionally not configured in this foundation build. You can keep typing normally.",
            "error"
          );
        } else {
          showNotice(
            (error && error.message) ||
              "Voice input failed. You can keep typing normally.",
            "error"
          );
        }

        messageInput.focus();
      } finally {
        audio = null;
      }
    }

    microphoneButton.addEventListener(
      "click",
      start
    );

    cancelButton.addEventListener(
      "click",
      cancel
    );

    stopButton.addEventListener(
      "click",
      stop
    );

    setState("idle");

    return {
      start,
      stop,
      cancel,
      getState: () => state
    };
  }

  document.addEventListener(
    "DOMContentLoaded",
    () => {
      const microphoneButton =
        document.getElementById("microphoneButton");

      const recordingState =
        document.getElementById("recordingState");

      const recordingLabel =
        document.getElementById("recordingLabel");

      const recordingTimer =
        document.getElementById("recordingTimer");

      const cancelButton =
        document.getElementById(
          "cancelRecordingButton"
        );

      const stopButton =
        document.getElementById(
          "stopRecordingButton"
        );

      const notice =
        document.getElementById("voiceInputNotice");

      const messageInput =
        document.getElementById("messageInput");

      const required = [
        microphoneButton,
        recordingState,
        recordingLabel,
        recordingTimer,
        cancelButton,
        stopButton,
        notice,
        messageInput
      ];

      if (required.some((element) => !element)) {
        console.error(
          "BCL Voice Input could not initialize because required UI elements are missing."
        );
        return;
      }

      window.BCLVoiceInputController =
        createVoiceInputController({
          microphoneButton,
          recordingState,
          recordingLabel,
          recordingTimer,
          cancelButton,
          stopButton,
          notice,
          messageInput
        });
    }
  );
})();
