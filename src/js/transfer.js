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
    "zh-Hant": {
        loading: "正在載入資料…",
        errorLoad: "載入資料出錯",
        line1Label: "第一條路線",
        line2Label: "第二條路線",
        filterBtn: "查詢",
        sameLineAlert: "請選擇兩條不同的路線",
        dataNotReady: "資料尚未載入完成，請稍候",
        resultTitle: (count) => `共找到了${count}個符合條件的車站：`,
        sameGroupTitle: (count) => `找到了${count}個換乘車站：`,
        crossGroupTitle: (count) => `找到了${count}個出站換乘／轉乘車站：`,
        noSameGroup: "沒有找到換乘車站。",
        noCrossGroup: "沒有找到出站換乘／轉乘車站。",
        noResult: "沒有找到符合條件的車站。",
        stationLines: "路線：",
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
        if (lang === "zh-Hans" || lang === "zh-Hant" || lang === "en")
            return lang;
    }
    const path = window.location.pathname;
    if (path.includes("/zh-Hant/")) return "zh-Hant";
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
                    const zhHans = nameEl
                        .getElementsByTagName("zh-Hans")[0]
                        ?.textContent?.trim();
                    const zhHant = nameEl
                        .getElementsByTagName("zh-Hant")[0]
                        ?.textContent?.trim();
                    const en = nameEl
                        .getElementsByTagName("en")[0]
                        ?.textContent?.trim();
                    if (zhHans && zhHant && en) {
                        lineMap[code] = {
                            "zh-Hans": zhHans,
                            "zh-Hant": zhHant,
                            en,
                        };
                        lineList.push({
                            code,
                            nameZh: zhHans,
                            nameZhHant: zhHant,
                            nameEn: en,
                        });
                    } else {
                        lineMap[code] = {
                            "zh-Hans": code,
                            "zh-Hant": code,
                            en: code,
                        };
                        lineList.push({
                            code,
                            nameZh: code,
                            nameZhHant: code,
                            nameEn: code,
                        });
                    }
                } else if (code) {
                    lineMap[code] = {
                        "zh-Hans": code,
                        "zh-Hant": code,
                        en: code,
                    };
                    lineList.push({
                        code,
                        nameZh: code,
                        nameZhHant: code,
                        nameEn: code,
                    });
                }
            }
        });

        await loadXMLData("/src/xml/stations.xml", (xmlDoc) => {
            const stationElements = xmlDoc.getElementsByTagName("station");
            for (let i = 0; i < stationElements.length; i++) {
                const idEl = stationElements[i].getElementsByTagName("id")[0];
                const nameEl =
                    stationElements[i].getElementsByTagName("name")[0];
                const lineEl =
                    stationElements[i].getElementsByTagName("line")[0];
                if (idEl && nameEl && lineEl) {
                    const id = idEl.textContent.trim();
                    const zhHans = nameEl
                        .getElementsByTagName("zh-Hans")[0]
                        ?.textContent?.trim();
                    const zhHant = nameEl
                        .getElementsByTagName("zh-Hant")[0]
                        ?.textContent?.trim();
                    const en = nameEl
                        .getElementsByTagName("en")[0]
                        ?.textContent?.trim();
                    if (!zhHans || !zhHant || !en) {
                        stations.push({
                            id,
                            name: { "zh-Hans": id, "zh-Hant": id, en: id },
                            lineGroups: [[]],
                            rawLine: "",
                        });
                        continue;
                    }
                    const name = { "zh-Hans": zhHans, "zh-Hant": zhHant, en };
                    let line = lineEl.textContent?.trim() || "";
                    let lineGroups = [];
                    if (line) {
                        lineGroups = line.split(";").map((group) =>
                            group
                                .split(",")
                                .map((l) => l.trim())
                                .filter((l) => l !== ""),
                        );
                    }
                    if (lineGroups.length === 0) lineGroups = [[]];
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
            loadingDiv.innerHTML = `<p class="text-danger">${langPack[currentLang].errorLoad}: ${error.message}</p>`;
        }
    }
}

function getStationName(station) {
    return station.name[currentLang] || station.name["zh-Hans"] || station.id;
}

function getLineName(code) {
    if (lineMap[code] && lineMap[code][currentLang])
        return lineMap[code][currentLang];
    return code;
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
        let displayName;
        if (currentLang === "zh-Hans")
            displayName = `${line.nameZh} ${line.code}`;
        else if (currentLang === "zh-Hant")
            displayName = `${line.nameZhHant} ${line.code}`;
        else displayName = `${line.nameEn} ${line.code}`;
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
                .filter((l) => l)
                .join("，");
            html += `<li class="list-group-item text-no-theme">`;
            html += `<strong>${stationName}</strong> <span class="station-id">${station.id}</span><br>`;
            html += `<span class="text-no-theme">${t.stationLines} ${lineNames || "（无线路）"}</span>`;
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
                .filter((l) => l)
                .join("，");
            html += `<li class="list-group-item text-no-theme">`;
            html += `<strong>${stationName}</strong> <span class="station-id">${station.id}</span><br>`;
            html += `<span class="text-no-theme">${t.stationLines} ${lineNames || "（无线路）"}</span>`;
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
