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
    const settingsProfileToggle = document.getElementById("settingsProfileToggle");
    const settingsProfileInline = document.getElementById("settingsProfileInline");
    const settingsProfileTargetLanguage = document.getElementById("settingsProfileTargetLanguage");
    const settingsProfileLearningLevel = document.getElementById("settingsProfileLearningLevel");
    const settingsProfileSave = document.getElementById("settingsProfileSave");
    const settingsProfileStatus = document.getElementById("settingsProfileStatus");
    const settingsHelpToggle = document.getElementById("settingsHelpToggle");
    const settingsHelpInline = document.getElementById("settingsHelpInline");
    const settingsTextSize = document.getElementById("settingsTextSize");
    const settingsAppearance = document.getElementById("settingsAppearance");
    const settingsPlaybackSpeed = document.getElementById("settingsPlaybackSpeed");
    const settingsTypingTranslation = document.getElementById("settingsTypingTranslation");
    const helpContent = document.getElementById("helpContent");

    const required = [
      settingsButton,
      settingsPanel,
      settingsCloseButton,
      settingsProfileToggle,
      settingsProfileInline,
      settingsProfileTargetLanguage,
      settingsProfileLearningLevel,
      settingsProfileSave,
      settingsProfileStatus,
      settingsHelpToggle,
      settingsHelpInline,
      settingsTextSize,
      settingsAppearance,
      settingsPlaybackSpeed,
      settingsTypingTranslation,
      helpContent
    ];

    if (required.some((element) => !element)) {
      throw new Error("BCL Settings UI could not initialize.");
    }

    const {
      getActiveLearningProfile,
      setActiveLearningProfile
    } = window.BCLLearningProfile;

    function syncPreferenceControls() {
      settingsTextSize.value = preferences.textSize;
      settingsAppearance.value = preferences.appearance;
      settingsPlaybackSpeed.value = String(preferences.playbackSpeed);
      settingsTypingTranslation.value =
        preferences.typingTranslation ? "on" : "off";
    }

    function getLevels(targetLanguage) {
      return targetLanguage === "ja"
        ? ["N5", "N4", "N3", "N2", "N1"]
        : ["A1", "A2", "B1", "B2", "C1", "C2"];
    }

    function fillProfileLevels(targetLanguage, selectedLevel) {
      settingsProfileLearningLevel.innerHTML = "";
      for (const level of getLevels(targetLanguage)) {
        const option = document.createElement("option");
        option.value = level;
        option.textContent = level;
        settingsProfileLearningLevel.appendChild(option);
      }
      settingsProfileLearningLevel.value =
        selectedLevel && getLevels(targetLanguage).includes(selectedLevel)
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

    function setExpanded(button, panel, expanded) {
      button.setAttribute("aria-expanded", String(expanded));
      panel.hidden = !expanded;
      const chevron = button.querySelector(".settings-chevron");
      if (chevron) chevron.textContent = expanded ? "⌃" : "⌄";
    }

    function openSettings() {
      syncPreferenceControls();
      syncProfileControls();
      setExpanded(settingsProfileToggle, settingsProfileInline, false);
      setExpanded(settingsHelpToggle, settingsHelpInline, false);
      settingsPanel.hidden = false;
      settingsCloseButton.focus();
    }

    function closeSettings() {
      settingsPanel.hidden = true;
      settingsButton.focus();
    }

    function updatePreference(key, value) {
      preferences = normalizePreferences({ ...preferences, [key]: value });
      savePreferences();
      applyPreferences();
      syncPreferenceControls();
    }

    settingsButton.addEventListener("click", openSettings);
    settingsCloseButton.addEventListener("click", closeSettings);

    settingsProfileToggle.addEventListener("click", () => {
      const next = settingsProfileToggle.getAttribute("aria-expanded") !== "true";
      if (next) syncProfileControls();
      setExpanded(settingsProfileToggle, settingsProfileInline, next);
    });

    settingsProfileTargetLanguage.addEventListener("change", () => {
      fillProfileLevels(settingsProfileTargetLanguage.value, null);
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

    settingsHelpToggle.addEventListener("click", () => {
      const next = settingsHelpToggle.getAttribute("aria-expanded") !== "true";
      if (next) {
        const profile = getActiveLearningProfile();
        const language = profile.sourceLanguage || "zh";
        window.BCLHelpContent.renderHelpContent(helpContent, language);
      }
      setExpanded(settingsHelpToggle, settingsHelpInline, next);
    });

    settingsTextSize.addEventListener("change", () => {
      updatePreference("textSize", settingsTextSize.value);
    });

    settingsAppearance.addEventListener("change", () => {
      updatePreference("appearance", settingsAppearance.value);
    });

    settingsPlaybackSpeed.addEventListener("change", () => {
      updatePreference("playbackSpeed", Number(settingsPlaybackSpeed.value));
    });

    settingsTypingTranslation.addEventListener("change", () => {
      updatePreference(
        "typingTranslation",
        settingsTypingTranslation.value === "on"
      );
      document.dispatchEvent(
        new CustomEvent("bcl:typing-translation-preference-changed", {
          detail: {
            enabled: preferences.typingTranslation
          }
        })
      );
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
