"use strict";

(function () {
  const STORAGE_KEY = "bcl.uiPreferences";

  const DEFAULTS = Object.freeze({
    textSize: "normal",
    appearance: "system",
    playbackSpeed: 1,
    typingTranslation: true
  });

  const VALID_TEXT_SIZES = new Set(["normal", "large"]);
  const VALID_APPEARANCES = new Set(["system", "light", "dark"]);
  const VALID_SPEEDS = new Set([0.75, 1, 1.25, 1.5]);

  let preferences = loadPreferences();
  let initialized = false;

  function normalizePreferences(value) {
    const source = value && typeof value === "object" ? value : {};
    const speed = Number(source.playbackSpeed);

    return {
      textSize: VALID_TEXT_SIZES.has(source.textSize)
        ? source.textSize
        : DEFAULTS.textSize,
      appearance: VALID_APPEARANCES.has(source.appearance)
        ? source.appearance
        : DEFAULTS.appearance,
      playbackSpeed: VALID_SPEEDS.has(speed)
        ? speed
        : DEFAULTS.playbackSpeed,
      typingTranslation:
        typeof source.typingTranslation === "boolean"
          ? source.typingTranslation
          : DEFAULTS.typingTranslation
    };
  }

  function loadPreferences() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored
        ? normalizePreferences(JSON.parse(stored))
        : { ...DEFAULTS };
    } catch (error) {
      return { ...DEFAULTS };
    }
  }

  function savePreferences() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  }

  function applyPreferences() {
    document.documentElement.dataset.textSize = preferences.textSize;
    document.documentElement.dataset.appearance = preferences.appearance;
  }

  function getPreferences() {
    return { ...preferences };
  }

  function getPlaybackSpeed() {
    return preferences.playbackSpeed;
  }

  function getTypingTranslationEnabled() {
    return preferences.typingTranslation;
  }

  function initialize() {
    if (initialized) return;

    const settingsButton = document.getElementById("settingsButton");
    const settingsPanel = document.getElementById("settingsPanel");
    const settingsCloseButton = document.getElementById("settingsCloseButton");

    const settingsProfileTargetLanguage =
      document.getElementById("settingsProfileTargetLanguage");
    const settingsProfileLearningLevel =
      document.getElementById("settingsProfileLearningLevel");
    const settingsProfileSave =
      document.getElementById("settingsProfileSave");
    const settingsProfileStatus =
      document.getElementById("settingsProfileStatus");

    const settingsTypingTranslation =
      document.getElementById("settingsTypingTranslation");
    const settingsPlaybackSpeed =
      document.getElementById("settingsPlaybackSpeed");
    const settingsTextSize =
      document.getElementById("settingsTextSize");
    const settingsAppearance =
      document.getElementById("settingsAppearance");

    const settingsTokenStatus =
      document.getElementById("settingsTokenStatus");
    const settingsTokenToggle =
      document.getElementById("settingsTokenToggle");
    const settingsTokenEditor =
      document.getElementById("settingsTokenEditor");
    const settingsTokenInput =
      document.getElementById("settingsTokenInput");
    const settingsTokenCancel =
      document.getElementById("settingsTokenCancel");
    const settingsTokenSave =
      document.getElementById("settingsTokenSave");
    const settingsTokenMessage =
      document.getElementById("settingsTokenMessage");

    const settingsHelpToggle =
      document.getElementById("settingsHelpToggle");
    const settingsHelpInline =
      document.getElementById("settingsHelpInline");
    const helpContent = document.getElementById("helpContent");

    const required = [
      settingsButton,
      settingsPanel,
      settingsCloseButton,
      settingsProfileTargetLanguage,
      settingsProfileLearningLevel,
      settingsProfileSave,
      settingsProfileStatus,
      settingsTypingTranslation,
      settingsPlaybackSpeed,
      settingsTextSize,
      settingsAppearance,
      settingsTokenStatus,
      settingsTokenToggle,
      settingsTokenEditor,
      settingsTokenInput,
      settingsTokenCancel,
      settingsTokenSave,
      settingsTokenMessage,
      settingsHelpToggle,
      settingsHelpInline,
      helpContent
    ];

    if (required.some((element) => !element)) {
      throw new Error("BCL Settings UI could not initialize.");
    }

    const {
      getActiveLearningProfile,
      setActiveLearningProfile
    } = window.BCLLearningProfile;

    const {
      getAccessToken,
      setAccessToken
    } = window.BCLGatewayClient;

    function getLevels(targetLanguage) {
      return targetLanguage === "ja"
        ? ["N5", "N4", "N3", "N2", "N1"]
        : ["A1", "A2", "B1", "B2", "C1", "C2"];
    }

    function fillProfileLevels(targetLanguage, selectedLevel) {
      const levels = getLevels(targetLanguage);
      settingsProfileLearningLevel.innerHTML = "";

      for (const level of levels) {
        const option = document.createElement("option");
        option.value = level;
        option.textContent = level;
        settingsProfileLearningLevel.appendChild(option);
      }

      settingsProfileLearningLevel.value =
        selectedLevel && levels.includes(selectedLevel)
          ? selectedLevel
          : targetLanguage === "ja" ? "N3" : "B2";
    }

    function syncProfileControls() {
      const profile = getActiveLearningProfile();
      settingsProfileTargetLanguage.value = profile.targetLanguage;
      fillProfileLevels(profile.targetLanguage, profile.learningLevel);
      settingsProfileStatus.textContent =
        "Current: " +
        (profile.targetLanguage === "ja" ? "Japanese" : "English") +
        " · " +
        profile.learningLevel;
    }

    function setSegmentedValue(container, value) {
      for (const button of container.querySelectorAll("button[data-value]")) {
        button.setAttribute(
          "aria-pressed",
          String(button.dataset.value === String(value))
        );
      }
    }

    function syncPreferenceControls() {
      setSegmentedValue(settingsTextSize, preferences.textSize);
      setSegmentedValue(settingsAppearance, preferences.appearance);
      setSegmentedValue(
        settingsPlaybackSpeed,
        String(preferences.playbackSpeed)
      );

      settingsTypingTranslation.setAttribute(
        "aria-checked",
        String(preferences.typingTranslation)
      );
      const text = settingsTypingTranslation.querySelector(
        ".compact-toggle-text"
      );
      if (text) {
        text.textContent = preferences.typingTranslation ? "On" : "Off";
      }
    }

    function syncTokenSummary() {
      const hasToken = Boolean(getAccessToken());
      settingsTokenStatus.textContent = hasToken ? "••••••••••••" : "Not set";
      settingsTokenToggle.textContent = hasToken ? "Change" : "Add";
    }

    function setTokenEditorOpen(open) {
      settingsTokenEditor.hidden = !open;
      settingsTokenToggle.setAttribute("aria-expanded", String(open));
      settingsTokenMessage.textContent = "";

      if (!open) {
        settingsTokenInput.value = "";
      } else {
        settingsTokenInput.value = "";
        settingsTokenInput.focus();
      }
    }

    function setHelpExpanded(expanded) {
      settingsHelpToggle.setAttribute("aria-expanded", String(expanded));
      settingsHelpInline.hidden = !expanded;
      const chevron = settingsHelpToggle.querySelector(".settings-chevron");
      if (chevron) chevron.textContent = expanded ? "⌄" : "›";
    }

    function updatePreference(key, value) {
      preferences = normalizePreferences({ ...preferences, [key]: value });
      savePreferences();
      applyPreferences();
      syncPreferenceControls();
    }

    function openSettings() {
      syncPreferenceControls();
      syncProfileControls();
      syncTokenSummary();
      setTokenEditorOpen(false);
      setHelpExpanded(false);
      settingsPanel.hidden = false;
      settingsCloseButton.focus();
    }

    function closeSettings() {
      settingsPanel.hidden = true;
      setTokenEditorOpen(false);
      setHelpExpanded(false);
      settingsButton.focus();
    }

    function bindSegmented(container, preferenceKey, parser) {
      container.addEventListener("click", (event) => {
        const button = event.target.closest("button[data-value]");
        if (!button || !container.contains(button)) return;

        const raw = button.dataset.value;
        const value = parser ? parser(raw) : raw;
        updatePreference(preferenceKey, value);
      });
    }

    settingsButton.addEventListener("click", openSettings);
    settingsCloseButton.addEventListener("click", closeSettings);

    settingsProfileTargetLanguage.addEventListener("change", () => {
      fillProfileLevels(settingsProfileTargetLanguage.value, null);
      settingsProfileStatus.textContent = "Unsaved changes";
    });

    settingsProfileLearningLevel.addEventListener("change", () => {
      settingsProfileStatus.textContent = "Unsaved changes";
    });

    settingsProfileSave.addEventListener("click", () => {
      const targetLanguage = settingsProfileTargetLanguage.value;
      const profile = targetLanguage === "ja"
        ? {
            sourceLanguage: "zh",
            targetLanguage: "ja",
            learningLevelSystem: "JLPT",
            learningLevel: settingsProfileLearningLevel.value
          }
        : {
            sourceLanguage: "zh",
            targetLanguage: "en",
            learningLevelSystem: "CEFR",
            learningLevel: settingsProfileLearningLevel.value
          };

      setActiveLearningProfile(profile);

      settingsProfileStatus.textContent =
        "Current: " +
        (profile.targetLanguage === "ja" ? "Japanese" : "English") +
        " · " +
        profile.learningLevel;

      document.dispatchEvent(
        new CustomEvent("bcl:learning-profile-changed", {
          detail: { ...profile }
        })
      );
    });

    settingsTypingTranslation.addEventListener("click", () => {
      updatePreference(
        "typingTranslation",
        !preferences.typingTranslation
      );

      document.dispatchEvent(
        new CustomEvent("bcl:typing-translation-preference-changed", {
          detail: { enabled: preferences.typingTranslation }
        })
      );
    });

    bindSegmented(settingsTextSize, "textSize");
    bindSegmented(settingsAppearance, "appearance");
    bindSegmented(
      settingsPlaybackSpeed,
      "playbackSpeed",
      (value) => Number(value)
    );

    settingsTokenToggle.addEventListener("click", () => {
      const open = settingsTokenToggle.getAttribute("aria-expanded") === "true";
      setTokenEditorOpen(!open);
    });

    settingsTokenCancel.addEventListener("click", () => {
      setTokenEditorOpen(false);
    });

    settingsTokenSave.addEventListener("click", () => {
      const token = settingsTokenInput.value.trim();

      if (!token) {
        settingsTokenMessage.textContent = "Enter a token first.";
        settingsTokenInput.focus();
        return;
      }

      try {
        setAccessToken(token);
        syncTokenSummary();
        settingsTokenMessage.textContent = "Updated.";
        settingsTokenInput.value = "";

        window.setTimeout(() => {
          if (!settingsTokenEditor.hidden) {
            setTokenEditorOpen(false);
          }
        }, 500);
      } catch (error) {
        settingsTokenMessage.textContent =
          error && error.message
            ? error.message
            : "Could not update token.";
      }
    });

    settingsTokenInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        settingsTokenSave.click();
      }
    });

    settingsHelpToggle.addEventListener("click", () => {
      const next =
        settingsHelpToggle.getAttribute("aria-expanded") !== "true";

      if (next) {
        const profile = getActiveLearningProfile();
        const language = profile.sourceLanguage || "zh";
        window.BCLHelpContent.renderHelpContent(helpContent, language);
      }

      setHelpExpanded(next);
    });

    settingsPanel.addEventListener("click", (event) => {
      if (event.target === settingsPanel) closeSettings();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !settingsPanel.hidden) {
        closeSettings();
      }
    });

    applyPreferences();
    initialized = true;
  }

  applyPreferences();

  window.BCLSettingsController = {
    STORAGE_KEY,
    initialize,
    getPreferences,
    getPlaybackSpeed,
    getTypingTranslationEnabled
  };
})();
