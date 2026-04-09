/**
 * settingsManager.js - 全域偏好管理器（主题/字体）
 * 主题使用 Bootstrap 类：
 *   - body: bg-light / bg-dark
 *   - navbar: navbar-light/dark + bg-light/dark
 *   - 文本标签（p, a, h1-h6, i, b, strong, span, li, em, small, mark, sub, sup, blockquote, pre, code, label）
 *   - 带有 .text-use-theme 的元素也会被添加主题色
 *   - 带有 .text-no-theme 的元素及其后代不会被添加主题色（优先级最高）
 * 语言代码：zh-Hans, en
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
        document.cookie =
            name + "=" + encodeURIComponent(value) + expires + "; path=/";
    }

    function getCookie(name) {
        const nameEQ = name + "=";
        const ca = document.cookie.split(";");
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === " ") c = c.substring(1);
            if (c.indexOf(nameEQ) === 0)
                return decodeURIComponent(c.substring(nameEQ.length));
        }
        return null;
    }

    // ---------- 字体映射 ----------
    const FONT_MAP = {
        default:
            "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif",
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
    // 基础文本标签（不含 div）
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
    // 选择器：基础标签 + 任何显式标记 .text-use-theme 的元素
    const TEXT_SELECTOR = `${BASE_TEXT_TAGS}, .text-use-theme`;

    let currentMode = null;
    let systemThemeListener = null;

    // ---------- 跳过检查：自身或任意祖先有 text-no-theme 类 ----------
    function shouldSkipTheme(element) {
        if (!element || !element.closest) return false;
        return element.closest(".text-no-theme") !== null;
    }

    // 给单个元素应用颜色类（完全跳过受保护的元素）
    function applyTextColorToElement(el, mode) {
        if (!el || !el.classList) return;
        if (shouldSkipTheme(el)) return; // 自身或祖先被保护
        el.classList.remove("text-dark", "text-white");
        el.classList.add(mode === "dark" ? "text-white" : "text-dark");
    }

    // 全局应用文本颜色
    function applyTextColors(mode) {
        // 先清除所有可能存在的主题类（避免残留）
        const allCandidates = document.querySelectorAll(TEXT_SELECTOR);
        allCandidates.forEach((el) => {
            if (!shouldSkipTheme(el)) {
                // 如果元素应被跳过，移除可能存在的类（安全起见）
                el.classList.remove("text-dark", "text-white");
            }
        });
        // 重新为符合条件的元素添加类
        allCandidates.forEach((el) => {
            if (!shouldSkipTheme(el)) {
                el.classList.add(mode === "dark" ? "text-white" : "text-dark");
            }
        });
    }

    // 修改 navbar 类（保留其他类）
    function applyNavbarClasses(navbar, mode) {
        navbar.classList.remove(
            "navbar-light",
            "navbar-dark",
            "bg-light",
            "bg-dark",
        );
        if (mode === "dark") {
            navbar.classList.add("navbar-dark", "bg-dark");
        } else {
            navbar.classList.add("navbar-light", "bg-light");
        }
    }

    function applyNavbars(mode) {
        document
            .querySelectorAll("nav.navbar")
            .forEach((nav) => applyNavbarClasses(nav, mode));
    }

    // 直接应用主题
    function applyThemeDirect(mode) {
        // Body 背景
        document.body.classList.remove("bg-light", "bg-dark");
        document.body.classList.add(mode === "dark" ? "bg-dark" : "bg-light");
        // 文本颜色
        applyTextColors(mode);
        // 导航栏
        applyNavbars(mode);
        currentMode = mode;
    }

    // 系统主题跟随
    function applyThemeBySystem() {
        const isDark = window.matchMedia(
            "(prefers-color-scheme: dark)",
        ).matches;
        applyThemeDirect(isDark ? "dark" : "light");
    }

    function removeSystemListener() {
        if (systemThemeListener) {
            const mql = window.matchMedia("(prefers-color-scheme: dark)");
            if (mql.removeEventListener)
                mql.removeEventListener("change", systemThemeListener);
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

    // ---------- MutationObserver 动态元素支持 ----------
    let observer = null;
    function startMutationObserver() {
        if (observer) observer.disconnect();
        observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType !== 1) return;
                    // 处理新增的 navbar
                    if (node.matches && node.matches("nav.navbar")) {
                        applyNavbarClasses(node, currentMode);
                    }
                    // 处理新增的文本元素（自身匹配）
                    if (
                        node.matches &&
                        node.matches(TEXT_SELECTOR) &&
                        !shouldSkipTheme(node)
                    ) {
                        applyTextColorToElement(node, currentMode);
                    }
                    // 处理新增元素的内部子元素
                    if (node.querySelectorAll) {
                        node.querySelectorAll("nav.navbar").forEach((nav) =>
                            applyNavbarClasses(nav, currentMode),
                        );
                        node.querySelectorAll(TEXT_SELECTOR).forEach((el) => {
                            if (!shouldSkipTheme(el))
                                applyTextColorToElement(el, currentMode);
                        });
                    }
                });
            });
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    // ---------- 对外 API ----------
    const SettingsManager = {
        init: function () {
            let theme = getCookie("theme_mode");
            if (!theme || !["light", "dark", "system"].includes(theme))
                theme = "light";
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
            if (language) setCookie("language", language);
            if (goBack) window.history.back();
        },

        setLanguageOnly: function (lang) {
            if (lang) setCookie("language", lang);
        },

        goToLanguagePage: function (lang, baseUrl = "/") {
            let url = baseUrl;
            if (lang === "zh-Hans") url = baseUrl + "zh-Hans/";
            else if (lang === "en") url = baseUrl + "en/";
            else url = baseUrl + lang + "/";
            window.location.href = url;
        },

        getCurrentLanguage: function () {
            const lang = getCookie("language");
            return lang || null;
        },

        getCurrentTheme: function () {
            return getCookie("theme_mode");
        },

        getCurrentFontKey: function () {
            return getCookie("font_family");
        },

        getFontOptions: function () {
            return {
                default: "默认字体",
                mojangles: "Mojangles",
                unifont: "GNU Unifont",
            };
        },

        applyThemeToElement: function (element) {
            if (!element) return;
            if (element.matches && element.matches("nav.navbar"))
                applyNavbarClasses(element, currentMode);
            if (
                element.matches &&
                element.matches(TEXT_SELECTOR) &&
                !shouldSkipTheme(element)
            ) {
                applyTextColorToElement(element, currentMode);
            }
        },
    };

    global.SettingsManager = SettingsManager;
})(window);
