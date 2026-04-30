/**
 * settingsManager.js - 全域偏好管理器（主题/字体/语言）
 * 支持语言：zh-Hans（简体）、zh-Hant（繁体）、en
 * 自动初始化：引入脚本后自动读取 Cookie 并应用主题和字体
 * 主题使用 Bootstrap 类：
 *   - body: bg-light / bg-dark
 *   - navbar: navbar-light/dark + bg-light/dark
 *   - 文本标签自动添加 text-dark / text-white
 *   - .text-use-theme 强制使用主题色
 *   - .text-no-theme 及其后代不受主题影响
 */

(function (global) {
    // ---------- Cookie 工具 ----------
    function setCookie(name, value, days = 365) {
        let expires = "";
        if (days) {
            const date = new Date();
            date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
            expires = "; expires=" + date.toUTCString();
        }
        document.cookie = name + "=" + encodeURIComponent(value) + expires + "; path=/";
    }

    function getCookie(name) {
        const nameEQ = name + "=";
        const ca = document.cookie.split(";");
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === " ") c = c.substring(1);
            if (c.indexOf(nameEQ) === 0) return decodeURIComponent(c.substring(nameEQ.length));
        }
        return null;
    }

    // ---------- 字体映射 ----------
    const FONT_MAP = {
        default: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif",
        mojangles: "'Mojangles', 'Minecraft', monospace",
        unifont: "'GNU Unifont', 'Unifont', monospace",
    };

    function applyFont(fontKey) {
        let fontFamily = FONT_MAP[fontKey];
        if (!fontFamily) fontFamily = FONT_MAP["default"];
        document.body.style.fontFamily = fontFamily;
        setCookie("font_family", fontKey);
    }

    // ---------- 主题配置 ----------
    const BASE_TEXT_TAGS = [
        "p",
        "a",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "i",
        "b",
        "strong",
        "span",
        "li",
        "em",
        "small",
        "mark",
        "sub",
        "sup",
        "blockquote",
        "pre",
        "code",
        "label",
    ].join(",");
    const TEXT_SELECTOR = `${BASE_TEXT_TAGS}, .text-use-theme`;

    let currentMode = null;
    let systemThemeListener = null;

    function shouldSkipTheme(element) {
        return element.closest && element.closest(".text-no-theme") !== null;
    }

    function applyTextColorToElement(el, mode) {
        if (!el || !el.classList) return;
        if (shouldSkipTheme(el)) return;
        el.classList.remove("text-dark", "text-white");
        el.classList.add(mode === "dark" ? "text-white" : "text-dark");
    }

    function applyTextColors(mode) {
        // 清除旧类（避免残留）
        document.querySelectorAll(TEXT_SELECTOR).forEach((el) => {
            el.classList.remove("text-dark", "text-white");
        });
        // 重新为符合条件的元素添加
        document.querySelectorAll(TEXT_SELECTOR).forEach((el) => {
            if (!shouldSkipTheme(el)) {
                el.classList.add(mode === "dark" ? "text-white" : "text-dark");
            }
        });
    }

    function applyNavbarClasses(navbar, mode) {
        navbar.classList.remove("navbar-light", "navbar-dark", "bg-light", "bg-dark");
        if (mode === "dark") {
            navbar.classList.add("navbar-dark", "bg-dark");
        } else {
            navbar.classList.add("navbar-light", "bg-light");
        }
    }

    function applyNavbars(mode) {
        document.querySelectorAll("nav.navbar").forEach((nav) => applyNavbarClasses(nav, mode));
    }

    function applyThemeDirect(mode) {
        document.body.classList.remove("bg-light", "bg-dark");
        document.body.classList.add(mode === "dark" ? "bg-dark" : "bg-light");
        applyTextColors(mode);
        applyNavbars(mode);
        currentMode = mode;
    }

    function applyThemeBySystem() {
        const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        applyThemeDirect(isDark ? "dark" : "light");
    }

    function removeSystemListener() {
        if (systemThemeListener) {
            const mql = window.matchMedia("(prefers-color-scheme: dark)");
            if (mql.removeEventListener) mql.removeEventListener("change", systemThemeListener);
            else mql.removeListener(systemThemeListener);
            systemThemeListener = null;
        }
    }

    function applyTheme(mode) {
        removeSystemListener();
        if (mode === "system") {
            applyThemeBySystem();
            const mql = window.matchMedia("(prefers-color-scheme: dark)");
            const handler = () => {
                if (getCookie("theme_mode") === "system") applyThemeBySystem();
            };
            if (mql.addEventListener) mql.addEventListener("change", handler);
            else mql.addListener(handler);
            systemThemeListener = handler;
        } else {
            applyThemeDirect(mode);
        }
        setCookie("theme_mode", mode);
    }

    // ---------- 动态元素监听 ----------
    let observer = null;
    function startMutationObserver() {
        if (observer) observer.disconnect();
        observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType !== 1) return;
                    if (node.matches && node.matches("nav.navbar"))
                        applyNavbarClasses(node, currentMode);
                    if (node.matches && node.matches(TEXT_SELECTOR) && !shouldSkipTheme(node)) {
                        applyTextColorToElement(node, currentMode);
                    }
                    if (node.querySelectorAll) {
                        node.querySelectorAll("nav.navbar").forEach((nav) =>
                            applyNavbarClasses(nav, currentMode),
                        );
                        node.querySelectorAll(TEXT_SELECTOR).forEach((el) => {
                            if (!shouldSkipTheme(el)) applyTextColorToElement(el, currentMode);
                        });
                    }
                });
            });
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    // ---------- 对外 API ----------
    const SettingsManager = {
        // 初始化（自动应用主题、字体、启动监听）
        init: function () {
            let theme = getCookie("theme_mode");
            if (!theme || !["light", "dark", "system"].includes(theme)) theme = "light";
            applyTheme(theme);

            let fontKey = getCookie("font_family");
            if (!fontKey || !FONT_MAP[fontKey]) fontKey = "default";
            applyFont(fontKey);

            startMutationObserver();
        },

        saveSettings: function (theme, fontKey, language, goBack = false) {
            if (theme && ["light", "dark", "system"].includes(theme))
                setCookie("theme_mode", theme);
            if (fontKey && FONT_MAP[fontKey]) setCookie("font_family", fontKey);
            if (language && ["zh-Hans", "zh-Hant", "en"].includes(language))
                setCookie("language", language);
            alert("设置已保存！");
            if (goBack) window.history.back();
        },

        setLanguageOnly: function (lang) {
            if (lang && ["zh-Hans", "zh-Hant", "en"].includes(lang)) setCookie("language", lang);
        },

        goToLanguagePage: function (lang, baseUrl = "/") {
            let url = baseUrl;
            if (lang === "zh-Hans") url = baseUrl + "zh-Hans/";
            else if (lang === "zh-Hant") url = baseUrl + "zh-Hant/";
            else if (lang === "en") url = baseUrl + "en/";
            else url = baseUrl + lang + "/";
            window.location.href = url;
        },

        getCurrentLanguage: function () {
            const lang = getCookie("language");
            return lang && ["zh-Hans", "zh-Hant", "en"].includes(lang) ? lang : null;
        },

        getCurrentTheme: function () {
            return getCookie("theme_mode");
        },

        getCurrentFontKey: function () {
            return getCookie("font_family");
        },

        getFontOptions: function () {
            return { default: "默认字体", mojangles: "Mojangles", unifont: "GNU Unifont" };
        },

        applyThemeToElement: function (element) {
            if (!element) return;
            if (element.matches && element.matches("nav.navbar"))
                applyNavbarClasses(element, currentMode);
            if (element.matches && element.matches(TEXT_SELECTOR) && !shouldSkipTheme(element)) {
                applyTextColorToElement(element, currentMode);
            }
        },

        checkAndShowLanguageHint: function () {
            console.warn("语言提示功能已移除");
            return false;
        },
    };

    // 自动初始化：只要脚本被加载，就会在 DOM 准备就绪后应用设置
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => SettingsManager.init());
    } else {
        SettingsManager.init();
    }

    global.SettingsManager = SettingsManager;
})(window);
