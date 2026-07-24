/* MECA Teacher Dashboard — no-build internationalization core.
 * Dictionaries are JSON files loaded through the central API Manager.
 */
(function createTeacherI18n(global) {
  "use strict";

  const React = global.React;
  if (!React) throw new Error("TeacherI18n ต้องโหลดหลัง React");

  const VERSION = "20260724-30";
  const DEFAULT_LOCALE = "th";
  const STORAGE_KEY = "teacher_dashboard_locale";
  const SUPPORTED_LOCALES = Object.freeze({
    th: Object.freeze({
      code: "th",
      intl: "th-TH",
      label: "ไทย",
      flag: "🇹🇭"
    }),
    en: Object.freeze({
      code: "en",
      intl: "en-US",
      label: "English",
      flag: "🇬🇧"
    })
  });
  const runtime = global.TEACHER_DASHBOARD_CONFIG || {};
  const currentScriptUrl = global.document?.currentScript?.src
    || new URL("./src/i18n.js", global.location.href).toString();
  const projectRootUrl = new URL("../", currentScriptUrl);
  const localeBaseUrl = new URL(runtime.localeBaseUrl || "./locales/", projectRootUrl);
  const dictionaryCache = new Map();
  const dictionaryPromises = new Map();

  const normalizeLocale = (value) => {
    const code = String(value || "").trim().toLowerCase().split(/[-_]/)[0];
    return SUPPORTED_LOCALES[code] ? code : DEFAULT_LOCALE;
  };
  const getStoredLocale = () => {
    try {
      return normalizeLocale(global.localStorage.getItem(STORAGE_KEY) || DEFAULT_LOCALE);
    } catch (_) {
      return DEFAULT_LOCALE;
    }
  };
  const storeLocale = (locale) => {
    try { global.localStorage.setItem(STORAGE_KEY, normalizeLocale(locale)); }
    catch (_) {}
  };
  const dictionaryUrl = (locale) => {
    const code = normalizeLocale(locale);
    const url = new URL(`${code}.json`, localeBaseUrl);
    url.searchParams.set("v", VERSION);
    return url.toString();
  };
  const fetchDictionary = async (locale) => {
    const code = normalizeLocale(locale);
    if (!global.TeacherAPI?.manager) {
      throw new Error("API Manager ยังไม่พร้อมสำหรับโหลด Dictionary");
    }
    const dictionary = await global.TeacherAPI.manager.request(dictionaryUrl(code), {
      auth: false,
      label: `Dictionary (${code})`,
      cacheKey: `i18n:${VERSION}:${code}`,
      cacheTtlMs: 24 * 60 * 60 * 1000
    });
    if (!dictionary || typeof dictionary !== "object" || Array.isArray(dictionary)) {
      throw new Error(`Dictionary (${code}) มีรูปแบบไม่ถูกต้อง`);
    }
    if (!dictionary._meta?.locale || normalizeLocale(dictionary._meta.locale) !== code) {
      throw new Error(`Dictionary (${code}) ระบุ locale ไม่ตรงกับชื่อไฟล์`);
    }
    return dictionary;
  };
  const loadDictionary = (locale) => {
    const code = normalizeLocale(locale);
    if (dictionaryCache.has(code)) return Promise.resolve(dictionaryCache.get(code));
    if (dictionaryPromises.has(code)) return dictionaryPromises.get(code);
    const pending = fetchDictionary(code)
      .then((dictionary) => {
        dictionaryCache.set(code, dictionary);
        dictionaryPromises.delete(code);
        return dictionary;
      })
      .catch((error) => {
        dictionaryPromises.delete(code);
        throw error;
      });
    dictionaryPromises.set(code, pending);
    return pending;
  };
  const getByPath = (dictionary, path) => String(path || "").split(".").reduce(
    (value, key) => value && typeof value === "object" ? value[key] : undefined,
    dictionary
  );
  const interpolationValues = (variables) => variables && typeof variables === "object" ? variables : {};
  const interpolate = (message, variables = {}) => String(message).replace(
    /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g,
    (match, key) => Object.prototype.hasOwnProperty.call(variables, key) ? String(variables[key]) : match
  );
  const pluralCategory = (locale, count) => {
    try {
      return new Intl.PluralRules(SUPPORTED_LOCALES[normalizeLocale(locale)].intl).select(Number(count));
    } catch (_) {
      return "other";
    }
  };
  const resolveMessage = (locale, dictionaries, key, variables = {}) => {
    const code = normalizeLocale(locale);
    const values = interpolationValues(variables);
    const localeOrder = [...new Set([code, DEFAULT_LOCALE])];
    for (const sourceLocale of localeOrder) {
      const dictionary = dictionaries[sourceLocale];
      if (!dictionary) continue;
      const category = values.count == null ? "" : pluralCategory(sourceLocale, values.count);
      const candidateKeys = category ? [`${key}_${category}`, key] : [key];
      for (const candidateKey of candidateKeys) {
        const message = getByPath(dictionary, candidateKey);
        if (typeof message === "string") {
          return {
            key: candidateKey,
            message,
            sourceLocale,
            usedFallback: sourceLocale !== code
          };
        }
      }
    }
    return null;
  };
  const translate = (locale, dictionaries, key, variables = {}, fallback) => {
    const resolved = resolveMessage(locale, dictionaries, key, variables);
    return interpolate(resolved?.message ?? fallback ?? key, interpolationValues(variables));
  };
  const intlLocale = (locale) => SUPPORTED_LOCALES[normalizeLocale(locale)].intl;
  const applyDocumentLocale = (locale, dictionaries) => {
    const code = normalizeLocale(locale);
    if (global.document?.documentElement) global.document.documentElement.lang = code;
    const title = resolveMessage(code, dictionaries, "app.title")?.message;
    if (title && global.document) global.document.title = title;
  };
  const formatNumberFor = (locale, value, options = {}) => {
    const numeric = Number(value);
    return Number.isFinite(numeric)
      ? new Intl.NumberFormat(intlLocale(locale), options).format(numeric)
      : "—";
  };
  const formatDateFor = (locale, value, options = {}) => {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat(intlLocale(locale), options).format(date);
  };
  const formatRelativeTimeFor = (locale, value, options = {}) => {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    const difference = date.getTime() - Date.now();
    const absolute = Math.abs(difference);
    const units = absolute < 60 * 1000
      ? ["second", 1000]
      : absolute < 60 * 60 * 1000
        ? ["minute", 60 * 1000]
        : absolute < 24 * 60 * 60 * 1000
          ? ["hour", 60 * 60 * 1000]
          : absolute < 30 * 24 * 60 * 60 * 1000
            ? ["day", 24 * 60 * 60 * 1000]
            : absolute < 365 * 24 * 60 * 60 * 1000
              ? ["month", 30 * 24 * 60 * 60 * 1000]
              : ["year", 365 * 24 * 60 * 60 * 1000];
    const amount = Math.round(difference / units[1]);
    return new Intl.RelativeTimeFormat(intlLocale(locale), {
      numeric: "auto",
      ...options
    }).format(amount, units[0]);
  };

  const I18nContext = React.createContext(null);

  function I18nProvider({ children }) {
    const initialLocale = React.useMemo(getStoredLocale, []);
    const [locale, setLocale] = React.useState(initialLocale);
    const [dictionaries, setDictionaries] = React.useState({});
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState("");
    const missingKeysRef = React.useRef(new Set());
    const [missingVersion, setMissingVersion] = React.useState(0);
    const requestRef = React.useRef(0);

    const installDictionaries = React.useCallback((items) => {
      setDictionaries((current) => ({
        ...current,
        ...Object.fromEntries(items)
      }));
    }, []);

    React.useEffect(() => {
      let active = true;
      const requestId = requestRef.current + 1;
      requestRef.current = requestId;
      setLoading(true);
      setError("");
      const locales = [...new Set([DEFAULT_LOCALE, initialLocale])];
      Promise.all(locales.map(async (code) => [code, await loadDictionary(code)]))
        .then((items) => {
          if (!active || requestRef.current !== requestId) return;
          installDictionaries(items);
          const loaded = Object.fromEntries(items);
          applyDocumentLocale(initialLocale, loaded);
        })
        .catch((cause) => {
          if (active && requestRef.current === requestId) setError(cause.message || String(cause));
        })
        .finally(() => {
          if (active && requestRef.current === requestId) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, []);

    const changeLocale = React.useCallback(async (nextLocale) => {
      const code = normalizeLocale(nextLocale);
      const requestId = requestRef.current + 1;
      requestRef.current = requestId;
      setLoading(true);
      setError("");
      try {
        const locales = [...new Set([DEFAULT_LOCALE, code])];
        const items = await Promise.all(locales.map(async (item) => [item, await loadDictionary(item)]));
        if (requestRef.current !== requestId) return false;
        const loaded = {
          ...dictionaries,
          ...Object.fromEntries(items)
        };
        installDictionaries(items);
        setLocale(code);
        storeLocale(code);
        applyDocumentLocale(code, loaded);
        return true;
      } catch (cause) {
        if (requestRef.current === requestId) setError(cause.message || String(cause));
        return false;
      } finally {
        if (requestRef.current === requestId) setLoading(false);
      }
    }, [dictionaries, installDictionaries]);

    const t = React.useCallback((key, variables = {}, fallback) => {
      const resolved = resolveMessage(locale, dictionaries, key, variables);
      if (!resolved && dictionaries[DEFAULT_LOCALE]) {
        const signature = `${locale}:${key}`;
        if (!missingKeysRef.current.has(signature)) {
          missingKeysRef.current.add(signature);
          Promise.resolve().then(() => setMissingVersion((current) => current + 1));
        }
      }
      return interpolate(resolved?.message ?? fallback ?? key, interpolationValues(variables));
    }, [dictionaries, locale]);
    const formatNumber = React.useCallback(
      (value, options) => formatNumberFor(locale, value, options),
      [locale]
    );
    const formatDate = React.useCallback(
      (value, options) => formatDateFor(locale, value, options),
      [locale]
    );
    const formatRelativeTime = React.useCallback(
      (value, options) => formatRelativeTimeFor(locale, value, options),
      [locale]
    );
    const compare = React.useCallback(
      (left, right, options = {}) => String(left ?? "").localeCompare(
        String(right ?? ""),
        intlLocale(locale),
        options
      ),
      [locale]
    );

    const contextValue = React.useMemo(() => ({
      locale,
      localeInfo: SUPPORTED_LOCALES[locale],
      supportedLocales: SUPPORTED_LOCALES,
      dictionaries,
      loadedLocales: Object.keys(dictionaries),
      loading,
      ready: Boolean(dictionaries[DEFAULT_LOCALE] && dictionaries[locale]),
      error,
      missingKeys: [...missingKeysRef.current],
      changeLocale,
      t,
      formatNumber,
      formatDate,
      formatRelativeTime,
      compare
    }), [
      locale,
      dictionaries,
      loading,
      error,
      missingVersion,
      changeLocale,
      t,
      formatNumber,
      formatDate,
      formatRelativeTime,
      compare
    ]);

    return React.createElement(I18nContext.Provider, {
      value: contextValue
    }, children);
  }

  const useI18n = () => {
    const context = React.useContext(I18nContext);
    if (!context) throw new Error("useI18n ต้องเรียกภายใน I18nProvider");
    return context;
  };

  global.TeacherI18n = Object.freeze({
    version: VERSION,
    defaultLocale: DEFAULT_LOCALE,
    storageKey: STORAGE_KEY,
    supportedLocales: SUPPORTED_LOCALES,
    Context: I18nContext,
    Provider: I18nProvider,
    useI18n,
    normalizeLocale,
    getStoredLocale,
    storeLocale,
    dictionaryUrl,
    loadDictionary,
    resolveMessage,
    translate,
    formatNumber: formatNumberFor,
    formatDate: formatDateFor,
    formatRelativeTime: formatRelativeTimeFor
  });
})(window);
