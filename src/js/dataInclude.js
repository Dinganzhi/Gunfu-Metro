// 添加缓存机制
const includeCache = {};

window.onload = dataInclude();

function dataInclude() {
    document.querySelectorAll("[data-include]").forEach(async (elem) => {
        const file = elem.getAttribute("data-include");

        // 检查缓存
        if (includeCache[file]) {
            elem.outerHTML = includeCache[file];
            return;
        }

        try {
            const response = await fetch(file);
            const html = await response.text();

            // 缓存结果
            includeCache[file] = html;
            elem.outerHTML = html;
        } catch (e) {
            console.error(`加载 ${file} 失败:`, e);
        }
    });
}
