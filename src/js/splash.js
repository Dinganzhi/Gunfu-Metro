(function () {
    // 兼容两种 ID
    let elem = document.getElementById("growtext");
    if (!elem) elem = document.getElementById("splash");
    if (!elem) {
        console.error("splash 找不到 id='growtext' 或 id='splash' 的元素");
        return;
    }

    // ----- 基础样式（绝对定位，右侧 margin 15%）-----
    elem.style.position = "absolute";
    elem.style.right = "0"; // 贴紧父容器右边界
    elem.style.marginRight = "15%"; // 右侧留出父容器宽度的 15% 作为间距
    elem.style.top = "60px";
    elem.style.color = "yellow";
    elem.style.transformOrigin = "center";
    elem.style.transform = "rotateZ(-5deg) scale(1)";
    elem.style.fontSize = "17px";
    elem.style.textShadow =
        "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000";
    elem.style.maxWidth = "100%";
    elem.style.wordWrap = "break-word";
    elem.style.whiteSpace = "nowrap"; // 避免换行导致高度变化，若需换行请注释

    let messages = [];
    let retryTimer = null;
    let isLoaded = false;

    // ----- 语言检测（带调试日志）-----
    function detectLanguage() {
        const cookieLang = document.cookie
            .split("; ")
            .find((row) => row.startsWith("language="));
        if (cookieLang) {
            const lang = cookieLang.split("=")[1];
            if (lang === "zh-Hans" || lang === "en") {
                console.log(`splash 语言检测: 从 cookie 获取 -> ${lang}`);
                return lang;
            }
        }
        const path = window.location.pathname;
        if (path.includes("/zh-Hans/")) {
            console.log("splash 语言检测: 从路径获取 -> zh-Hans");
            return "zh-Hans";
        }
        if (path.includes("/en/")) {
            console.log("splash 语言检测: 从路径获取 -> en");
            return "en";
        }
        console.log("splash 语言检测: 默认 -> zh-Hans");
        return "zh-Hans";
    }

    // ----- 加载 XML（路径 /src/xml/splash.xml）-----
    function loadMessages() {
        if (retryTimer) clearTimeout(retryTimer);
        fetch("/src/xml/splash.xml")
            .then((response) => {
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return response.text();
            })
            .then((xmlText) => {
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(xmlText, "text/xml");
                const lang = detectLanguage();
                const langNode = xmlDoc.getElementsByTagName(lang)[0];
                if (!langNode) throw new Error(`找不到 <${lang}> 节点`);
                const msgNodes = langNode.getElementsByTagName("msg");
                if (msgNodes.length === 0) throw new Error(`没有 <msg> 子节点`);
                const newMessages = [];
                for (let i = 0; i < msgNodes.length; i++) {
                    const text = msgNodes[i].textContent;
                    if (text && text.trim() !== "")
                        newMessages.push(text.trim());
                }
                if (newMessages.length === 0)
                    throw new Error(`所有 <msg> 为空`);
                messages = newMessages;
                if (!isLoaded) {
                    isLoaded = true;
                    displayRandomText();
                } else {
                    displayRandomText();
                }
                console.log(
                    `splash 加载成功，语言: ${lang}，共 ${messages.length} 条`,
                );
            })
            .catch((err) => {
                console.error(`splash 加载 XML 失败: ${err.message}`);
                retryTimer = setTimeout(() => {
                    console.log("splash 重新尝试加载 XML...");
                    loadMessages();
                }, 10000);
            });
    }

    function displayRandomText() {
        if (messages.length === 0) return;
        const randomIndex = Math.floor(Math.random() * messages.length);
        elem.innerHTML = messages[randomIndex];
    }

    // ----- 缩放动画：基础字体 17px，缩放因子 0.94~1.06 对应 16~18px 视觉效果 -----
    let startTime = null;
    function animateScale(timestamp) {
        if (!startTime) startTime = timestamp;
        const elapsed = (timestamp - startTime) / 1000;
        const frequency = 2; // 2Hz
        // 缩放因子范围 0.94 ~ 1.06，中心 1.0，振幅 0.06
        const scale = 1.0 + 0.06 * Math.sin(2 * Math.PI * frequency * elapsed);
        elem.style.transform = `rotateZ(-5deg) scale(${scale})`;
        requestAnimationFrame(animateScale);
    }

    // 启动动画和加载
    requestAnimationFrame(animateScale);
    loadMessages();

    // 暴露全局函数，便于手动刷新
    window.splash = function () {
        if (retryTimer) clearTimeout(retryTimer);
        retryTimer = null;
        isLoaded = false;
        messages = [];
        startTime = null;
        loadMessages();
    };
})();
