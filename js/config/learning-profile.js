"use strict";

(function () {
  const STORAGE_KEY = "bcl.learningProfile.active";

  const SUPPORTED_PROFILES = Object.freeze({
    "zh-en": Object.freeze({
      sourceLanguage: "zh",
      targetLanguage: "en",
      learningLevelSystem: "CEFR",
      validLevels: Object.freeze([
        "A1",
        "A2",
        "B1",
        "B2",
        "C1",
        "C2"
      ])
    }),

    "zh-ja": Object.freeze({
      sourceLanguage: "zh",
      targetLanguage: "ja",
      learningLevelSystem: "JLPT",
      validLevels: Object.freeze([
        "N5",
        "N4",
        "N3",
        "N2",
        "N1"
      ])
    })
  });

  let activeLearningProfile = null;

  function getDirectionKey(
    sourceLanguage,
    targetLanguage
  ) {
    return sourceLanguage + "-" + targetLanguage;
  }

  function validateLearningProfile(profile) {
    if (!profile || typeof profile !== "object") {
      throw new Error(
        "Learning Profile is not configured."
      );
    }

    const requiredFields = [
      "sourceLanguage",
      "targetLanguage",
      "learningLevelSystem",
      "learningLevel"
    ];

    for (const field of requiredFields) {
      if (
        typeof profile[field] !== "string" ||
        profile[field].trim() === ""
      ) {
        throw new Error(
          "Missing Learning Profile field: " + field
        );
      }
    }

    const directionKey = getDirectionKey(
      profile.sourceLanguage,
      profile.targetLanguage
    );

    const direction =
      SUPPORTED_PROFILES[directionKey];

    if (!direction) {
      throw new Error(
        "Unsupported Learning Direction: " +
        directionKey
      );
    }

    if (
      profile.learningLevelSystem !==
      direction.learningLevelSystem
    ) {
      throw new Error(
        "Invalid level system for " +
        directionKey +
        ": " +
        profile.learningLevelSystem
      );
    }

    if (
      !direction.validLevels.includes(
        profile.learningLevel
      )
    ) {
      throw new Error(
        "Invalid learning level for " +
        directionKey +
        ": " +
        profile.learningLevel
      );
    }

    return true;
  }

  function createLearningProfile({
    sourceLanguage,
    targetLanguage,
    learningLevelSystem,
    learningLevel
  }) {
    const profile = Object.freeze({
      sourceLanguage,
      targetLanguage,
      learningLevelSystem,
      learningLevel
    });

    validateLearningProfile(profile);

    return profile;
  }

  function saveActiveLearningProfile(profile) {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(profile)
    );
  }

  function restoreActiveLearningProfile() {
    const stored = localStorage.getItem(
      STORAGE_KEY
    );

    if (!stored) {
      return null;
    }

    try {
      const parsed = JSON.parse(stored);

      validateLearningProfile(parsed);

      activeLearningProfile =
        createLearningProfile(parsed);

      return activeLearningProfile;
    } catch (error) {
      localStorage.removeItem(STORAGE_KEY);
      activeLearningProfile = null;

      return null;
    }
  }

  function setActiveLearningProfile(profile) {
    validateLearningProfile(profile);

    activeLearningProfile =
      createLearningProfile(profile);

    saveActiveLearningProfile(
      activeLearningProfile
    );

    return activeLearningProfile;
  }

  function getActiveLearningProfile() {
    if (!activeLearningProfile) {
      throw new Error(
        "Active Learning Profile is not configured."
      );
    }

    return activeLearningProfile;
  }

  function clearActiveLearningProfile() {
    activeLearningProfile = null;
    localStorage.removeItem(STORAGE_KEY);
  }

  restoreActiveLearningProfile();

  window.BCLLearningProfile = {
    STORAGE_KEY,
    SUPPORTED_PROFILES,
    validateLearningProfile,
    createLearningProfile,
    setActiveLearningProfile,
    getActiveLearningProfile,
    clearActiveLearningProfile,
    restoreActiveLearningProfile
  };
})();
