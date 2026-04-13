const langPack = {
    "zh-Hans": {
        loading: "正在加载数据…",
        errorLoad: "加载数据出错",
        line1Label: "第一条线路",
        line2Label: "第二条线路",
        filterBtn: "查询",
        sameLineAlert: "请选择两条不同的线路",
        dataNotReady: "数据尚未加载完成，请稍候",
        resultTitle: (count) => `共找到了${count}个符合条件的站点：`,
        sameGroupTitle: (count) => `找到了${count}个换乘站点：`,
        crossGroupTitle: (count) => `找到了${count}个出站换乘/转乘站点：`,
        noSameGroup: "没有找到换乘站点。",
        noCrossGroup: "没有找到出站换乘/转乘站点。",
        noResult: "没有找到符合条件的站点。",
        stationLines: "线路：",
    },
    en: {
        loading: "Loading Data...",
        errorLoad: "Error Loading Data",
        line1Label: "First Line",
        line2Label: "Second Line",
        filterBtn: "Find Transfer",
        sameLineAlert: "Please Select Two Different Lines",
        dataNotReady: "Data not Ready Yet, Please Waitz",
        resultTitle: (count) => `Found ${count} matching station(s):`,
        sameGroupTitle: (count) => `Found ${count} transfer station(s):`,
        crossGroupTitle: (count) =>
            `Found ${count} exiting-station transfer / informal transfer station(s):`,
        noSameGroup: "No Transfer Stations Found.",
        noCrossGroup:
            "No Exiting-station Transfer / Informal Transfer Stations Found.",
        noResult: "No Matching Stations Found.",
        stationLines: "Lines:",
    },
};

// ---------- 全局变量 ----------
let stations = [];
let lineMap = {};
let lineList = [];
let isDataLoaded = false;
let currentLang = "zh-Hans";

// ---------- 语言检测（仅页面加载时执行一次）----------
function detectLanguage() {
    const cookieLang = document.cookie
        .split("; ")
        .find((row) => row.startsWith("language="));
    if (cookieLang) {
        const lang = cookieLang.split("=")[1];
        if (lang === "zh-Hans" || lang === "en") return lang;
    }
    const path = window.location.pathname;
    if (path.includes("/zh-Hans/")) return "zh-Hans";
    if (path.includes("/en/")) return "en";
    return "zh-Hans";
}

function applyUILanguage() {
    const t = langPack[currentLang];
    const line1Label = document.querySelector('label[for="line1"]');
    const line2Label = document.querySelector('label[for="line2"]');
    if (line1Label) line1Label.innerText = t.line1Label;
    if (line2Label) line2Label.innerText = t.line2Label;
    const btn = document.getElementById("filterBtn");
    if (btn) btn.innerText = t.filterBtn;
    const loadingDiv = document.getElementById("loading");
    if (loadingDiv && !isDataLoaded) loadingDiv.innerText = t.loading;
}

// ---------- 加载 XML ----------
function loadXMLData(url, callback) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("GET", url, true);
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                if (xhr.status === 200 || xhr.status === 304) {
                    let xmlDoc = xhr.responseXML;
                    if (!xmlDoc || !xmlDoc.documentElement) {
                        console.warn(
                            `responseXML is null for ${url}, trying manual parse.`,
                        );
                        const parser = new DOMParser();
                        xmlDoc = parser.parseFromString(
                            xhr.responseText,
                            "text/xml",
                        );
                        const parseError = xmlDoc.querySelector("parsererror");
                        if (parseError) {
                            reject(
                                new Error(
                                    `XML parse error in ${url}: ${parseError.textContent}`,
                                ),
                            );
                            return;
                        }
                        if (!xmlDoc.documentElement) {
                            reject(new Error(`Empty or invalid XML: ${url}`));
                            return;
                        }
                    }
                    callback(xmlDoc);
                    resolve();
                } else {
                    reject(new Error(`HTTP ${xhr.status}: ${url}`));
                }
            }
        };
        xhr.onerror = () => reject(new Error(`Network error: ${url}`));
        xhr.send();
    });
}

// ---------- 数据加载 ----------
async function initData() {
    try {
        await loadXMLData("/src/xml/lines.xml", (xmlDoc) => {
            const lineElements = xmlDoc.getElementsByTagName("line");
            lineList = [];
            for (let i = 0; i < lineElements.length; i++) {
                const code = lineElements[i]
                    .getElementsByTagName("code")[0]
                    ?.textContent?.trim();
                const nameEl = lineElements[i].getElementsByTagName("name")[0];
                if (nameEl && code) {
                    const zhEl = nameEl.getElementsByTagName("zh")[0];
                    const enEl = nameEl.getElementsByTagName("en")[0];
                    const zhName = zhEl ? zhEl.textContent?.trim() : null;
                    const enName = enEl ? enEl.textContent?.trim() : null;
                    if (zhName && enName) {
                        lineMap[code] = { zh: zhName, en: enName };
                        lineList.push({ code, nameZh: zhName, nameEn: enName });
                    } else {
                        lineMap[code] = { zh: code, en: code };
                        lineList.push({ code, nameZh: code, nameEn: code });
                    }
                }
                if (code && zhName && enName) {
                    lineMap[code] = { zh: zhName, en: enName };
                    lineList.push({ code, nameZh: zhName, nameEn: enName });
                } else if (code) {
                    lineMap[code] = { zh: code, en: code };
                    lineList.push({ code, nameZh: code, nameEn: code });
                }
            }
        });

        await loadXMLData("/src/xml/stations.xml", (xmlDoc) => {
            const stationElements = xmlDoc.getElementsByTagName("station");
            for (let i = 0; i < stationElements.length; i++) {
                const idEl = stationElements[i].getElementsByTagName("id")[0];
                let zhName =
                    stationElements[i].getElementsByTagName("zh")[0]
                        ?.textContent;
                let enName =
                    stationElements[i].getElementsByTagName("en")[0]
                        ?.textContent;
                if (!zhName && !enName) {
                    const oldName =
                        stationElements[i].getElementsByTagName("name")[0]
                            ?.textContent;
                    if (oldName) {
                        zhName = oldName;
                        enName = oldName;
                    }
                }
                const lineEl =
                    stationElements[i].getElementsByTagName("line")[0];
                if (idEl && nameEl && lineEl) {
                    const id = idEl.textContent.trim();
                    const zhEl = nameEl.getElementsByTagName("zh")[0];
                    const enEl = nameEl.getElementsByTagName("en")[0];
                    const zhName = zhEl ? zhEl.textContent?.trim() : null;
                    const enName = enEl ? enEl.textContent?.trim() : null;
                    if (!zhName || !enName) {
                        stations.push({
                            id,
                            name: { zh: id, en: id },
                            lineGroups: [[]],
                            rawLine: "",
                        });
                        continue;
                    }
                    const name = { zh: zhName, en: enName };
                    const line = lineEl.textContent;
                    const lineGroups = line.split(";").map((group) =>
                        group
                            .split(",")
                            .map((l) => l.trim())
                            .filter((l) => l !== ""),
                    );
                    stations.push({ id, name, lineGroups, rawLine: line });
                }
            }
        });

        populateLineSelects();
        isDataLoaded = true;
        const loadingDiv = document.getElementById("loading");
        if (loadingDiv) loadingDiv.style.display = "none";
        const resultDiv = document.getElementById("result");
        if (resultDiv) resultDiv.innerHTML = "";
        applyUILanguage();
    } catch (error) {
        console.error(error);
        const loadingDiv = document.getElementById("loading");
        if (loadingDiv) {
            loadingDiv.innerHTML = `<p class="text-danger">${
                langPack[currentLang].errorLoad
            }: ${error.message}</p>`;
        }
    }
}

function getStationName(station) {
    return station.name[currentLang] || station.name["zh-Hans"];
}

function getLineName(code) {
    return lineMap[code] ? lineMap[code][currentLang] : code;
}

function populateLineSelects() {
    const select1 = document.getElementById("line1");
    const select2 = document.getElementById("line2");
    if (!select1 || !select2) return;
    const oldVal1 = select1.value;
    const oldVal2 = select2.value;
    select1.innerHTML = "";
    select2.innerHTML = "";
    lineList.forEach((line) => {
        const displayName =
            currentLang === "zh-Hans"
                ? `${line.nameZh} ${line.code}`
                : `${line.nameEn} ${line.code}`;
        const option1 = new Option(displayName, line.code);
        const option2 = new Option(displayName, line.code);
        select1.appendChild(option1);
        select2.appendChild(option2);
    });
    if (oldVal1 && lineList.some((l) => l.code === oldVal1))
        select1.value = oldVal1;
    else if (lineList.length) select1.value = lineList[0].code;
    if (oldVal2 && lineList.some((l) => l.code === oldVal2))
        select2.value = oldVal2;
    else if (lineList.length > 1) select2.value = lineList[1].code;
    else if (lineList.length) select2.value = lineList[0].code;
}

function filterStations(line1, line2) {
    const sameGroupStations = [];
    const crossGroupStations = [];
    stations.forEach((station) => {
        let foundInSameGroup = false;
        let foundLine1Group = -1;
        let foundLine2Group = -1;
        station.lineGroups.forEach((group, groupIndex) => {
            const hasLine1 = group.includes(line1);
            const hasLine2 = group.includes(line2);
            if (hasLine1 && hasLine2) foundInSameGroup = true;
            else if (hasLine1) foundLine1Group = groupIndex;
            else if (hasLine2) foundLine2Group = groupIndex;
        });
        if (foundInSameGroup) sameGroupStations.push(station);
        else if (foundLine1Group !== -1 && foundLine2Group !== -1)
            crossGroupStations.push(station);
    });
    return { sameGroup: sameGroupStations, crossGroup: crossGroupStations };
}

function displayFilteredResults(filteredData) {
    const resultDiv = document.getElementById("result");
    if (!resultDiv) return;
    if (!filteredData) {
        resultDiv.innerHTML = `<p class="text-danger">${langPack[currentLang].noResult}</p>`;
        return;
    }
    const sameGroup = filteredData.sameGroup || [];
    const crossGroup = filteredData.crossGroup || [];
    const totalCount = sameGroup.length + crossGroup.length;
    const t = langPack[currentLang];
    if (totalCount === 0) {
        resultDiv.innerHTML = `<p>${t.noResult}</p>`;
        return;
    }
    let html = `<h4>${t.resultTitle(totalCount)}</h4>`;
    if (sameGroup.length > 0) {
        html += `<hr /><h5>${t.sameGroupTitle(sameGroup.length)}</h5><ul class="list-group">`;
        sameGroup.forEach((station) => {
            const stationName = getStationName(station);
            const lineNames = station.lineGroups
                .flat()
                .map((code) => getLineName(code))
                .join("，");
            html += `<li class="list-group-item text-no-theme">`;
            html += `<strong>${stationName}</strong> <span class="station-id">${station.id}</span><br>`;
            html += `<span class="text-no-theme">${t.stationLines} ${lineNames}</span>`;
            html += `</li>`;
        });
        html += `</ul>`;
    } else {
        html += `<hr /><h5>${t.noSameGroup}</h5>`;
    }
    if (crossGroup.length > 0) {
        html += `<hr /><h5>${t.crossGroupTitle(crossGroup.length)}</h5><ul class="list-group">`;
        crossGroup.forEach((station) => {
            const stationName = getStationName(station);
            const lineNames = station.lineGroups
                .flat()
                .map((code) => getLineName(code))
                .join("，");
            html += `<li class="list-group-item text-no-theme">`;
            html += `<strong>${stationName}</strong> <span class="station-id">${station.id}</span><br>`;
            html += `<span class="text-no-theme">${t.stationLines} ${lineNames}</span>`;
            html += `</li>`;
        });
        html += `</ul>`;
    } else {
        html += `<hr /><h5>${t.noCrossGroup}</h5>`;
    }
    resultDiv.innerHTML = html;
}

// ---------- 初始化 ----------
document.addEventListener("DOMContentLoaded", function () {
    currentLang = detectLanguage();
    applyUILanguage();
    initData();
    const filterBtn = document.getElementById("filterBtn");
    if (filterBtn) {
        filterBtn.addEventListener("click", function () {
            if (!isDataLoaded) {
                alert(langPack[currentLang].dataNotReady);
                return;
            }
            const line1 = document.getElementById("line1").value;
            const line2 = document.getElementById("line2").value;
            if (line1 === line2) {
                alert(langPack[currentLang].sameLineAlert);
                return;
            }
            const filteredData = filterStations(line1, line2);
            displayFilteredResults(filteredData);
        });
    }
});
