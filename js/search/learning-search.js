"use strict";

(function () {
  function normalize(value) {
    return String(value || "").toLocaleLowerCase().normalize("NFKC").trim();
  }

  function levenshtein(a, b) {
    const left = normalize(a);
    const right = normalize(b);
    if (!left) return right.length;
    if (!right) return left.length;
    const row = Array.from({ length: right.length + 1 }, (_, i) => i);
    for (let i = 1; i <= left.length; i += 1) {
      let previous = row[0];
      row[0] = i;
      for (let j = 1; j <= right.length; j += 1) {
        const saved = row[j];
        const cost = left[i - 1] === right[j - 1] ? 0 : 1;
        row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + cost);
        previous = saved;
      }
    }
    return row[right.length];
  }

  function searchableParts(entry) {
    const parts = [entry.teachingInput, entry.sourceContext, entry.displayContent];
    for (const item of entry.learningItems || []) {
      parts.push(item.text, item.translation, item.explanation);
    }
    return parts.filter(Boolean).map(String);
  }

  function scorePart(part, query) {
    const text = normalize(part);
    const q = normalize(query);
    if (!text || !q) return 0;
    if (text === q) return 100;
    if (text.startsWith(q)) return 90;
    if (text.includes(q)) return 80;
    const tokens = text.split(/\s+/).filter(Boolean);
    if (tokens.some((token) => token === q)) return 75;
    if (q.length >= 4 && tokens.some((token) => token.startsWith(q))) return 68;
    if (q.length >= 4) {
      const best = tokens.reduce((value, token) => Math.min(value, levenshtein(token, q)), Infinity);
      if (best <= 1) return 60;
      if (q.length >= 7 && best <= 2) return 50;
    }
    return 0;
  }

  function search(entries, query) {
    const q = normalize(query);
    if (!q) return entries.slice(0, 50).map((entry) => ({ entry, score: 1 }));
    return entries
      .map((entry) => ({
        entry,
        score: searchableParts(entry).reduce((best, part) => Math.max(best, scorePart(part, q)), 0)
      }))
      .filter((result) => result.score > 0)
      .sort((a, b) => b.score - a.score || String(b.entry.createdAt).localeCompare(String(a.entry.createdAt)))
      .slice(0, 50);
  }

  window.BCLLearningSearch = { search };
})();
