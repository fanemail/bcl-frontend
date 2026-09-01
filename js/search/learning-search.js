"use strict";

(function () {
  function normalize(value) {
    return String(value == null ? "" : value)
      .normalize("NFKC")
      .toLocaleLowerCase()
      .trim();
  }

  function isCjk(value) {
    return /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(value);
  }

  function tokenize(value) {
    const text = normalize(value);
    if (!text) return [];

    const matches = text.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu);
    return matches || [];
  }

  function damerauLevenshtein(a, b, limit) {
    a = normalize(a);
    b = normalize(b);

    if (a === b) return 0;
    if (!a) return b.length;
    if (!b) return a.length;
    if (Math.abs(a.length - b.length) > limit) return limit + 1;

    const rows = a.length + 1;
    const cols = b.length + 1;
    const d = Array.from({ length: rows }, () => new Array(cols).fill(0));

    for (let i = 0; i < rows; i += 1) d[i][0] = i;
    for (let j = 0; j < cols; j += 1) d[0][j] = j;

    for (let i = 1; i < rows; i += 1) {
      let rowMin = limit + 1;

      for (let j = 1; j < cols; j += 1) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;

        d[i][j] = Math.min(
          d[i - 1][j] + 1,
          d[i][j - 1] + 1,
          d[i - 1][j - 1] + cost
        );

        if (
          i > 1 &&
          j > 1 &&
          a[i - 1] === b[j - 2] &&
          a[i - 2] === b[j - 1]
        ) {
          d[i][j] = Math.min(
            d[i][j],
            d[i - 2][j - 2] + cost
          );
        }

        rowMin = Math.min(rowMin, d[i][j]);
      }

      if (rowMin > limit) return limit + 1;
    }

    return d[a.length][b.length];
  }

  function fuzzyLimit(query) {
    const length = normalize(query).length;

    if (length <= 3) return 0;
    if (length <= 6) return 1;
    if (length <= 11) return 2;
    return 3;
  }

  function findExactRange(text, query) {
    const raw = String(text || "");
    const normalizedText = normalize(raw);
    const normalizedQuery = normalize(query);
    if (!normalizedQuery) return null;

    const index = normalizedText.indexOf(normalizedQuery);
    if (index < 0) return null;

    return {
      start: index,
      end: index + normalizedQuery.length,
      matchedText: raw.slice(index, index + normalizedQuery.length),
      kind: "exact"
    };
  }

  function findBestTokenRange(text, query) {
    const raw = String(text || "");
    const q = normalize(query);
    if (!q) return null;

    const wordRe = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu;
    let match;
    let best = null;

    while ((match = wordRe.exec(raw)) !== null) {
      const tokenRaw = match[0];
      const token = normalize(tokenRaw);
      let score = 0;
      let kind = "";

      if (token === q) {
        score = 950;
        kind = "word";
      } else if (token.startsWith(q) && (q.length >= 2 || isCjk(q))) {
        score = 900 - Math.max(0, token.length - q.length);
        kind = "prefix";
      } else if (token.includes(q) && (q.length >= 2 || isCjk(q))) {
        score = 820 - Math.max(0, token.length - q.length);
        kind = "substring";
      } else {
        const limit = fuzzyLimit(q);

        if (limit > 0) {
          const distance = damerauLevenshtein(token, q, limit);

          if (distance <= limit) {
            score = 700 - distance * 55 - Math.abs(token.length - q.length) * 3;
            kind = "fuzzy";
          }
        }
      }

      if (
        score > 0 &&
        (!best || score > best.score)
      ) {
        best = {
          score,
          start: match.index,
          end: match.index + tokenRaw.length,
          matchedText: tokenRaw,
          kind
        };
      }
    }

    return best;
  }

  function scoreSingleText(text, query) {
    const raw = String(text || "");
    const q = normalize(query);
    if (!q) return null;

    const exact = findExactRange(raw, q);
    if (exact) {
      const tokens = tokenize(q);
      let score = tokens.length > 1 ? 1000 : 970;

      if (exact.start === 0) score += 5;

      return {
        score,
        range: exact,
        kind: tokens.length > 1 ? "phrase" : "exact"
      };
    }

    const tokenMatch = findBestTokenRange(raw, q);
    if (tokenMatch) {
      return {
        score: tokenMatch.score,
        range: tokenMatch,
        kind: tokenMatch.kind
      };
    }

    return null;
  }

  function scoreMultiTerm(text, query) {
    const q = normalize(query);
    const terms = tokenize(q);

    if (terms.length <= 1) return null;

    const ranges = [];
    let total = 0;

    for (const term of terms) {
      const match = scoreSingleText(text, term);
      if (!match) return null;

      total += match.score;
      ranges.push(match.range);
    }

    ranges.sort((a, b) => a.start - b.start);

    return {
      score: 600 + Math.round(total / terms.length / 10),
      range: ranges[0],
      ranges,
      kind: "multi-term"
    };
  }

  function scoreRecord(record, query) {
    const q = normalize(query);
    if (!q) {
      return {
        score: 1,
        matchedFieldIndex: 0,
        range: null,
        kind: "empty"
      };
    }

    const fields = Array.isArray(record.fields) ? record.fields : [];
    let best = null;

    for (let i = 0; i < fields.length; i += 1) {
      const field = fields[i];
      const text = field.text || "";

      const direct = scoreSingleText(text, q);
      const multi = direct ? null : scoreMultiTerm(text, q);
      const candidate = direct || multi;

      if (!candidate) continue;

      // Slightly favor user input, but let a stronger textual match win.
      const roleBonus = field.role === "user" ? 6 : 0;
      const score = candidate.score + roleBonus;

      if (!best || score > best.score) {
        best = {
          score,
          matchedFieldIndex: i,
          range: candidate.range,
          ranges: candidate.ranges || (candidate.range ? [candidate.range] : []),
          kind: candidate.kind
        };
      }
    }

    // Multi-term matching is also allowed across different messages in one exchange.
    if (!best) {
      const terms = tokenize(q);

      if (terms.length > 1) {
        const combined = fields.map((field) => field.text || "").join("\n");
        const cross = scoreMultiTerm(combined, q);

        if (cross) {
          best = {
            score: cross.score - 25,
            matchedFieldIndex: 0,
            range: null,
            ranges: [],
            kind: "multi-term-cross-message"
          };
        }
      }
    }

    return best;
  }

  function search(records, query) {
    const list = Array.isArray(records) ? records : [];
    const q = normalize(query);

    if (!q) {
      return list.map((record, index) => ({
        record,
        score: 1,
        matchedFieldIndex: 0,
        range: null,
        ranges: [],
        kind: "empty",
        order: index
      }));
    }

    return list
      .map((record, index) => {
        const match = scoreRecord(record, q);
        if (!match) return null;

        return {
          record,
          order: index,
          ...match
        };
      })
      .filter(Boolean)
      .sort((a, b) =>
        b.score - a.score ||
        a.order - b.order
      );
  }

  window.BCLLearningSearch = {
    normalize,
    search,
    scoreRecord
  };
})();
