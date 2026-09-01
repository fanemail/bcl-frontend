"use strict";

const { createRuntimeState } = window.BCLRuntimeState;
const { dispatchRuntime } = window.BCLDispatcher;
const {
  getActiveLearningProfile,
  setActiveLearningProfile
} = window.BCLLearningProfile;
const {
  getReferenceMemory,
  updateReferenceMemory,
  buildSelectedContext
} = window.BCLReferenceMemory;
const {
  setGatewayUrl,
  setAccessToken,
  getAccessToken,
  getGatewayUrl,
  clearAccessToken,
  sendRuntimeRequest
} = window.BCLGatewayClient;

const { parseGatewayResponse } =
  window.BCLResponseParser;

const { createVoicePlan } =
  window.BCLVoiceController;

const {
  initialize: initializeSettings,
  getPlaybackSpeed,
  getTypingTranslationEnabled
} = window.BCLSettingsController;

const {
  speak: speakLocal, stop: stopLocal,
  pause: pauseLocal, resume: resumeLocal,
  replay: replayLocal, setSpeed: setLocalSpeed
} = window.BCLLocalTTS;

const {
  play: playAI, stop: stopAI,
  pause: pauseAI, resume: resumeAI,
  replay: replayAI, setSpeed: setAISpeed
} = window.BCLAITTS;

setGatewayUrl(
  "https://bcl-api-gateway.fanemailyoutoo.workers.dev"
);

document.addEventListener("DOMContentLoaded", () => {
  const messageList = document.getElementById("messageList");
  const scrollLatestButton = document.getElementById("scrollLatestButton");

  const accessSetup =
    document.getElementById("accessSetup");

  const accessTokenInput =
    document.getElementById("accessTokenInput");

  const accessStartButton =
    document.getElementById("accessStartButton");

  const accessSetupError =
    document.getElementById("accessSetupError");

  const profileSetup =
    document.getElementById("profileSetup");

  const profileCloseButton =
    document.getElementById("profileCloseButton");

  const profileTargetLanguage =
    document.getElementById("profileTargetLanguage");

  const profileLearningLevel =
    document.getElementById("profileLearningLevel");

  const profileStartButton =
    document.getElementById("profileStartButton");

  const profileSetupError =
    document.getElementById("profileSetupError");

  const loadingState = document.getElementById("loadingState");
  const errorState = document.getElementById("errorState");
  const recordingState = document.getElementById("recordingState");


  const microphoneButton = document.getElementById("microphoneButton");
  const sendButton = document.getElementById("sendButton");
  const messageInput = document.getElementById("messageInput");
  const typingTranslationHint =
    document.getElementById("typingTranslationHint");

  let pendingResponses = 0;

  function isNearBottom() {
    const threshold = 80;

    return (
      messageList.scrollHeight -
        messageList.scrollTop -
        messageList.clientHeight <
      threshold
    );
  }

  function scrollToLatest() {
    messageList.scrollTop = messageList.scrollHeight;
  }

  function escapeHtml(value) {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function renderInlineMarkdown(value) {
    let html = escapeHtml(value);

    html = html.replace(/`([^`\n]+)`/g, "<code>$1</code>");
    html = html.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/\*([^*\n]+)\*/g, "<em>$1</em>");

    return html;
  }

  function renderMarkdown(markdown) {
    const lines = markdown.replace(/\r\n/g, "\n").split("\n");
    const output = [];

    function unescapeMarkdownLine(line) {
      return line.replace(/\\([#>*_=+|:-])/g, "$1");
    }

    let paragraph = [];
    let codeLines = [];
    let listItems = [];
    let quoteLines = [];
    let inCodeBlock = false;
    let codeLanguage = "";

    function flushParagraph() {
      if (paragraph.length === 0) {
        return;
      }

      output.push(
        "<p>" +
          paragraph.map(renderInlineMarkdown).join("<br>") +
          "</p>"
      );

      paragraph = [];
    }

    function flushCodeBlock() {
      output.push(
        '<pre class="code-block"><code data-language="' +
          escapeHtml(codeLanguage) +
          '">' +
          escapeHtml(codeLines.join("\n")) +
          "</code></pre>"
      );

      codeLines = [];
      codeLanguage = "";
    }

    function flushList() {
      if (listItems.length === 0) {
        return;
      }

      output.push(
        "<ul>" +
          listItems
            .map(
              (item) =>
                "<li>" +
                renderInlineMarkdown(item) +
                "</li>"
            )
            .join("") +
          "</ul>"
      );

      listItems = [];
    }

    function flushQuote() {
      if (quoteLines.length === 0) {
        return;
      }

      output.push(
        "<blockquote>" +
          quoteLines
            .map(renderInlineMarkdown)
            .join("<br>") +
          "</blockquote>"
      );

      quoteLines = [];
    }

    function parseTableRow(line) {
      return line
        .trim()
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((cell) => cell.trim());
    }

    function isTableSeparator(line) {
      const cells = parseTableRow(line);

      return (
        cells.length > 0 &&
        cells.every(
          (cell) =>
            /^:?-{3,}:?$/.test(cell)
        )
      );
    }

    function renderTable(header, rows) {
      let html = "<table><thead><tr>";

      html += header
        .map(
          (cell) =>
            "<th>" +
            renderInlineMarkdown(cell) +
            "</th>"
        )
        .join("");

      html += "</tr></thead><tbody>";

      html += rows
        .map(
          (row) =>
            "<tr>" +
            row
              .map(
                (cell) =>
                  "<td>" +
                  renderInlineMarkdown(cell) +
                  "</td>"
              )
              .join("") +
            "</tr>"
        )
        .join("");

      html += "</tbody></table>";

      return html;
    }

    function flushTextBlocks() {
      flushParagraph();
      flushList();
      flushQuote();
    }

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
      const line = lines[lineIndex];
      if (line.startsWith("```")) {
        if (!inCodeBlock) {
          flushTextBlocks();
          inCodeBlock = true;
          codeLanguage = line.slice(3).trim();
        } else {
          flushCodeBlock();
          inCodeBlock = false;
        }

        continue;
      }

      if (inCodeBlock) {
        codeLines.push(line);
        continue;
      }

      const normalizedLine =
        unescapeMarkdownLine(line);

      if (normalizedLine.trim() === "") {
        flushTextBlocks();
        continue;
      }

      const nextLine =
        lineIndex + 1 < lines.length
          ? unescapeMarkdownLine(
              lines[lineIndex + 1]
            )
          : "";

      if (
        normalizedLine.includes("|") &&
        isTableSeparator(nextLine)
      ) {
        flushTextBlocks();

        const header =
          parseTableRow(normalizedLine);


        const rows = [];

        let tableIndex =
          lineIndex + 2;

        while (
          tableIndex < lines.length
        ) {
          const tableLine =
            unescapeMarkdownLine(
              lines[tableIndex]
            );

          if (
            !tableLine.includes("|") ||
            tableLine.trim() === ""
          ) {
            break;
          }

          rows.push(
            parseTableRow(tableLine)
          );

          tableIndex += 1;
        }

        output.push(
          renderTable(header, rows)
        );

        lineIndex = tableIndex - 1;
        continue;
      }

      if (isTableSeparator(normalizedLine)) {
        continue;
      }

      const headingMatch =
        normalizedLine.match(/^(#{1,4})\s+(.+)$/);

      if (headingMatch) {
        flushTextBlocks();

        const level = headingMatch[1].length;

        output.push(
          "<h" +
            level +
            ">" +
            renderInlineMarkdown(headingMatch[2]) +
            "</h" +
            level +
            ">"
        );

        continue;
      }

      const quoteMatch =
        normalizedLine.match(/^>\s?(.*)$/);

      if (quoteMatch) {
        flushParagraph();
        flushList();
        quoteLines.push(quoteMatch[1]);
        continue;
      }

      const listMatch =
        normalizedLine.match(/^[-*]\s+(.+)$/);

      if (listMatch) {
        flushParagraph();
        flushQuote();
        listItems.push(listMatch[1]);
        continue;
      }

      flushList();
      flushQuote();
      paragraph.push(normalizedLine);
    }

    if (inCodeBlock) {
      flushCodeBlock();
    }

    flushTextBlocks();

    return output.join("");
  }
  function resetOtherVoiceButtons(currentButton) {
    const buttons = document.querySelectorAll(".voice-primary");
    for (const otherButton of buttons) {
      if (otherButton === currentButton) continue;
      otherButton.dataset.state = "idle";
      otherButton.textContent =
        otherButton.classList.contains("voice-button-conversation")
          ? "Voice"
          : "Play";
    }
  }

  function createPlaybackControls({ item, conversation = false }) {
    const controls = document.createElement("div");
    controls.className = "playback-controls";

    const primary = document.createElement("button");
    primary.className =
      "voice-button voice-primary" +
      (conversation ? " voice-button-conversation" : "");
    primary.type = "button";
    primary.dataset.state = "idle";
    primary.textContent = conversation ? "Voice" : "Play";

    const stopButton = document.createElement("button");
    stopButton.className = "voice-button voice-secondary";
    stopButton.type = "button";
    stopButton.textContent = "Stop";

    const replayButton = document.createElement("button");
    replayButton.className = "voice-button voice-secondary";
    replayButton.type = "button";
    replayButton.textContent = "Replay";

    const speed = document.createElement("select");
    speed.className = "voice-speed";
    speed.setAttribute("aria-label", "Playback speed");
    for (const value of [0.75, 1, 1.25, 1.5]) {
      const option = document.createElement("option");
      option.value = String(value);
      option.textContent = value + "x";
      if (value === getPlaybackSpeed()) option.selected = true;
      speed.appendChild(option);
    }

    const idleLabel = conversation ? "Voice" : "Play";
    const renderer = item.renderer;

    const onLoading = () => {
      primary.dataset.state = "loading";
      primary.textContent = "Loading...";
    };
    const onPlaying = () => {
      primary.dataset.state = "playing";
      primary.textContent = "Pause";
    };
    const onEnd = () => {
      primary.dataset.state = "idle";
      primary.textContent = idleLabel;
    };
    const onError = (error) => {
      primary.dataset.state = "idle";
      primary.textContent = idleLabel;
      console.error("TTS failed:", error);
    };

    const playLocalFallback = () => {
      if (item.fallbackRenderer !== "local") {
        return false;
      }

      stopAI();
      setLocalSpeed(Number(speed.value));

      try {
        speakLocal({
          text: item.text,
          targetLanguage: item.targetLanguage,
          speed: Number(speed.value),
          onStart: onPlaying,
          onEnd,
          onError
        });
        return true;
      } catch (error) {
        onError(error);
        return false;
      }
    };

    const playFresh = async () => {
      resetOtherVoiceButtons(primary);
      if (renderer === "local") {
        stopAI();
        setLocalSpeed(Number(speed.value));
        try {
          speakLocal({
            text: item.text,
            targetLanguage: item.targetLanguage,
            speed: Number(speed.value),
            onStart: onPlaying,
            onEnd,
            onError
          });
        } catch (error) {
          onError(error);
        }
        return;
      }

      stopLocal();
      setAISpeed(Number(speed.value));
      let aiFailed = false;

      await playAI({
        gatewayUrl: getGatewayUrl(),
        accessToken: getAccessToken(),
        text: item.text,
        targetLanguage: item.targetLanguage,
        cacheKey: item.targetLanguage + ":" + item.type + ":" + item.text,
        onLoading,
        onPlaying,
        onEnd,
        onError: (error) => {
          aiFailed = true;
          console.error("AI TTS failed; trying local fallback:", error);
        }
      });

      if (aiFailed) {
        playLocalFallback();
      }
    };

    primary.addEventListener("click", async () => {
      const state = primary.dataset.state;
      if (state === "loading") return;
      if (state === "playing") {
        if (renderer === "local") pauseLocal(); else pauseAI();
        primary.dataset.state = "paused";
        primary.textContent = "Resume";
        return;
      }
      if (state === "paused") {
        const resumed = renderer === "local"
          ? resumeLocal()
          : await resumeAI();
        if (resumed !== false) {
          primary.dataset.state = "playing";
          primary.textContent = "Pause";
        }
        return;
      }
      await playFresh();
    });

    stopButton.addEventListener("click", () => {
      if (renderer === "local") stopLocal(); else stopAI();
      primary.dataset.state = "idle";
      primary.textContent = idleLabel;
    });

    replayButton.addEventListener("click", async () => {
      await playFresh();
    });

    speed.addEventListener("change", () => {
      const value = Number(speed.value);
      if (renderer === "local") setLocalSpeed(value);
      else setAISpeed(value);
    });

    controls.appendChild(primary);
    controls.appendChild(stopButton);
    controls.appendChild(replayButton);
    controls.appendChild(speed);
    return controls;
  }

  function createMessageElement({
    speaker,
    type,
    content,
    markdown = false,
    mode = null,
    runtimeMode = null,
    speechSegments = [],
    targetLanguage = ""
  }) {
    const article = document.createElement("article");
    article.className =
      "message " + (type === "user" ? "message-user" : "message-ai");

    const meta = document.createElement("div");
    meta.className = "message-meta";
    const speakerLabel = document.createElement("span");
    speakerLabel.className = "speaker-label";
    speakerLabel.textContent = speaker;
    meta.appendChild(speakerLabel);

    if (mode) {
      const modeLabel = document.createElement("span");
      modeLabel.className = "mode-label";
      modeLabel.textContent = mode;
      meta.appendChild(modeLabel);
    }

    const body = document.createElement("div");
    body.className = markdown
      ? "message-body message-markdown"
      : "message-body message-plain";
    if (markdown) body.innerHTML = renderMarkdown(content);
    else body.textContent = content;

    article.appendChild(meta);
    article.appendChild(body);

    if (type === "ai" && runtimeMode) {
      const voicePlan = createVoicePlan({
        mode: runtimeMode,
        targetLanguage,
        speechSegments
      });

      if (voicePlan.length > 0) {
        const voiceRegion = document.createElement("div");
        voiceRegion.className = "voice-region";

        if (runtimeMode === "conversation") {
          voiceRegion.appendChild(
            createPlaybackControls({
              item: voicePlan[0],
              conversation: true
            })
          );
        } else {
          const list = document.createElement("div");
          list.className = "speech-items";
          for (const item of voicePlan) {
            const row = document.createElement("div");
            row.className = "speech-item";
            row.appendChild(createPlaybackControls({item}));

            const text = document.createElement("span");
            text.className = "speech-item-text";
            text.textContent = item.text;
            if (item.targetLanguage) text.lang = item.targetLanguage;
            row.appendChild(text);
            list.appendChild(row);
          }
          voiceRegion.appendChild(list);
        }

        body.appendChild(voiceRegion);
      }
    }
    return article;
  }
  function appendMessage(message) {
    const shouldScroll = isNearBottom();
    const element = createMessageElement(message);

    messageList.insertBefore(element, loadingState);

    if (shouldScroll) {
      scrollToLatest();
    }
  }

  function updateLoadingState() {
    const shouldScroll = isNearBottom();

    loadingState.hidden = pendingResponses === 0;

    if (!loadingState.hidden && shouldScroll) {
      scrollToLatest();
    }
  }


  let profileSetupDismissible = false;

  function updateProfileLevelOptions(preferredLevel = "") {
    const targetLanguage =
      profileTargetLanguage.value;

    const levels =
      targetLanguage === "ja"
        ? ["N5", "N4", "N3", "N2", "N1"]
        : ["A1", "A2", "B1", "B2", "C1", "C2"];

    profileLearningLevel.innerHTML = "";

    for (const level of levels) {
      const option =
        document.createElement("option");

      option.value = level;
      option.textContent = level;

      profileLearningLevel.appendChild(option);
    }

    profileLearningLevel.value =
      levels.includes(preferredLevel)
        ? preferredLevel
        : targetLanguage === "ja"
          ? "N3"
          : "B2";
  }

  function showAccessSetup() {
    accessSetup.hidden = false;
    accessSetupError.hidden = true;
    accessSetupError.textContent = "";
    accessTokenInput.focus();
  }

  function hideAccessSetup() {
    accessSetup.hidden = true;
    accessSetupError.hidden = true;
    accessSetupError.textContent = "";
  }

  function initializeAccessSetup() {
    if (getAccessToken()) {
      initializeProfileSetup();
      return;
    }

    showAccessSetup();
  }

  function saveAccessSetup() {
    try {
      setAccessToken(accessTokenInput.value);

      accessTokenInput.value = "";

      hideAccessSetup();
      initializeProfileSetup();
    } catch (error) {
      accessSetupError.textContent =
        error.message;

      accessSetupError.hidden = false;
    }
  }

  function showProfileSetup({ dismissible = false } = {}) {
    profileSetupDismissible = dismissible;
    profileCloseButton.hidden = !dismissible;
    profileStartButton.textContent = dismissible
      ? "Save"
      : "Start BCL";

    if (dismissible) {
      try {
        const profile = getActiveLearningProfile();
        profileTargetLanguage.value = profile.targetLanguage;
        updateProfileLevelOptions(profile.learningLevel);
      } catch (error) {
        profileTargetLanguage.value = "en";
        updateProfileLevelOptions();
      }
    } else {
      profileTargetLanguage.value = "en";
      updateProfileLevelOptions();
    }

    profileSetup.hidden = false;
    profileTargetLanguage.focus();
  }

  function hideProfileSetup() {
    profileSetup.hidden = true;
    profileSetupError.hidden = true;
    profileSetupError.textContent = "";
  }

  function initializeProfileSetup() {
    try {
      getActiveLearningProfile();
      hideProfileSetup();
    } catch (error) {
      showProfileSetup({ dismissible: false });
    }
  }

  function saveProfileSetup() {
    try {
      const targetLanguage =
        profileTargetLanguage.value;

      const profile =
        targetLanguage === "ja"
          ? {
              sourceLanguage: "zh",
              targetLanguage: "ja",
              learningLevelSystem: "JLPT",
              learningLevel:
                profileLearningLevel.value
            }
          : {
              sourceLanguage: "zh",
              targetLanguage: "en",
              learningLevelSystem: "CEFR",
              learningLevel:
                profileLearningLevel.value
            };

      setActiveLearningProfile(profile);
      hideProfileSetup();
      messageInput.focus();
    } catch (error) {
      profileSetupError.textContent =
        error.message;

      profileSetupError.hidden = false;
    }
  }
  function rememberSuccessfulTurn(
    userContent,
    assistantContent
  ) {
    const memory = getReferenceMemory();

    const recentTurns = [
      ...memory.recentTurns,
      "User: " + userContent.trim(),
      "BCL: " + assistantContent.trim()
    ];

    updateReferenceMemory({
      recentTurns: recentTurns.slice(-6)
    });
  }

  async function submitMessage() {
    const rawValue = messageInput.value;

    if (rawValue.trim() === "") {
      return;
    }

    appendMessage({
      speaker: "You",
      type: "user",
      content: rawValue.trim()
    });

    const state = createRuntimeState(rawValue);
    const runtimeContext = dispatchRuntime(state);

    messageInput.value = "";
    messageInput.focus();

    if (
      runtimeContext.runtime === "teaching" &&
      runtimeContext.normalizedInput.trim() === ""
    ) {
      appendMessage({
        speaker: "BCL",
        type: "ai",
        mode: "Teaching Runtime",
        content:
          "Teaching mode is ready. Enter a word, sentence, passage, or learning question.",
        markdown: false,
        runtimeMode: "teaching",
        speechSegments: [],
        targetLanguage: null
      });
      return;
    }

    pendingResponses += 1;
    updateLoadingState();

    try {
      const activeProfile =
        getActiveLearningProfile();

      const runtimeRequest = {
        runtime: runtimeContext.runtime,

        learning: {
          sourceLanguage: activeProfile.sourceLanguage,
          targetLanguage: activeProfile.targetLanguage,
          levelSystem:
            activeProfile.learningLevelSystem,
          level:
            activeProfile.learningLevel
        },

        selectedContext:
          buildSelectedContext(),

        rawUserInput: runtimeContext.normalizedInput,
        rawUserInstruction: runtimeContext.normalizedInput
      };

      const gatewayResponse =
        await sendRuntimeRequest(runtimeRequest);

      const parsedResponse =
        parseGatewayResponse(
          gatewayResponse,
          runtimeContext.runtime
        );

      appendMessage({
        speaker: "BCL",
        type: "ai",
        mode:
          runtimeContext.runtime === "teaching"
            ? "Teaching Runtime"
            : "Conversation Runtime",
        content: parsedResponse.displayContent,
        markdown: true,
        runtimeMode: runtimeContext.runtime,
        speechSegments: parsedResponse.speechSegments,
        targetLanguage: activeProfile.targetLanguage
      });

      rememberSuccessfulTurn(
        rawValue,
        parsedResponse.displayContent
      );
    } catch (error) {
      if (error.message === "Unauthorized.") {
        clearAccessToken();
        showAccessSetup();
        return;
      }

      const errorCode =
        error && typeof error.code === "string"
          ? error.code
          : "";

      appendMessage({
        speaker: "BCL",
        type: "ai",
        mode: "Gateway Error",
        content:
          "**Gateway Error**\n\n" +
          error.message +
          (errorCode
            ? "\n\n`" + errorCode + "`"
            : ""),
        markdown: true
      });
    } finally {
      pendingResponses = Math.max(
        0,
        pendingResponses - 1
      );

      updateLoadingState();
    }
  }

  accessStartButton.addEventListener(
    "click",
    saveAccessSetup
  );

  accessTokenInput.addEventListener(
    "keydown",
    (event) => {
      if (event.key !== "Enter") {
        return;
      }

      event.preventDefault();
      saveAccessSetup();
    }
  );

  profileTargetLanguage.addEventListener(
    "change",
    () => updateProfileLevelOptions()
  );

  profileStartButton.addEventListener(
    "click",
    saveProfileSetup
  );

  profileCloseButton.addEventListener(
    "click",
    () => {
      if (profileSetupDismissible) {
        hideProfileSetup();
      }
    }
  );

  profileSetup.addEventListener(
    "click",
    (event) => {
      if (
        profileSetupDismissible &&
        event.target === profileSetup
      ) {
        hideProfileSetup();
      }
    }
  );

  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      profileSetupDismissible &&
      !profileSetup.hidden
    ) {
      hideProfileSetup();
    }
  });

  initializeSettings();

  window.BCLTypingTranslationController.initialize({
    input: messageInput,
    hint: typingTranslationHint,
    getProfile: getActiveLearningProfile,
    isEnabled: getTypingTranslationEnabled
  });

  initializeAccessSetup();
  sendButton.addEventListener("click", submitMessage);

  messageInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") {
      return;
    }

    if (event.shiftKey) {
      return;
    }

    event.preventDefault();
    submitMessage();
  });

  scrollLatestButton.addEventListener("click", scrollToLatest);


  scrollToLatest();
});
