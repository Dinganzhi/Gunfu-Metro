const langPack = {
    "zh-Hans": {
        loading: "正在加载数据……",
        errorLoad: "加载数据出错",
        startStation: "起点站",
        endStation: "终点站",
        algorithm: "排序方式",
        distanceShortest: "距离最短",
        transferMin: "换乘最少",
        allowTransfer: "允许出站换乘/转乘",
        calcBtn: "查询",
        pathCount: (n) => `找到 ${n} 条路径：`,
        pathHeader: (idx, transfer, dist) =>
            `路径 ${idx + 1} · 换乘 ${transfer} 次 · 总距离 ${dist} 米`,
        rideTo: (line, to, dist) => `→ 乘坐 ${line} 至 ${to}，距离 ${dist} 米`,
        transfer: "↺ 换乘",
        outStationTransfer: "↺ 出站换乘/转乘",
        viaStations: "途经站点：",
        stationId: "ID：",
        stationLines: "线路：",
        noPath: "没有找到可行路径。",
        sameLineAlert: "请选择两条不同的线路",
        dataNotReady: "数据尚未加载完成，请稍候",
        selectStartEnd: "请选择起点和终点",
        defaultOption: "请选择",
    },
    en: {
        loading: "Loading Data...",
        errorLoad: "Error Loading Data",
        startStation: "Start Station",
        endStation: "End Station",
        algorithm: "Sorting Method",
        distanceShortest: "Shortest Distance",
        transferMin: "Least Transfer",
        allowTransfer: "Allow Exiting-station Transfer / Informal Transfer",
        calcBtn: "Find Route",
        pathCount: (n) => `Found ${n} route(s):`,
        pathHeader: (idx, transfer, dist) =>
            `Route ${idx + 1} · ${transfer} transfer(s) · Total distance ${dist}m`,
        rideTo: (line, to, dist) =>
            `→ Take ${line} to ${to}, distance ${dist}m`,
        transfer: "↺ Transfer",
        outStationTransfer: "↺ Exiting-station Transfer / Informal Transfer",
        viaStations: "Via stations:",
        stationId: "ID:",
        stationLines: "Lines:",
        noPath: "No Route Found.",
        sameLineAlert: "Please Select Two Different Lines",
        dataNotReady: "Data not Ready Yet, Please Wait",
        selectStartEnd: "Please Select Start and End Stations",
        defaultOption: "Select",
    },
};

// ---------- 全局变量 ----------
let stations = [];
let lineMap = {};
let stationIdToIndex = {};
let maxGroups = 0;
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
    const labels = document.querySelectorAll("label");
    labels.forEach((label) => {
        const text = label.innerText.trim();
        if (text === "起点站" || text === "Start Station")
            label.innerText = t.startStation;
        if (text === "终点站" || text === "End Station")
            label.innerText = t.endStation;
        if (text === "排序方式" || text === "Sorting Method")
            label.innerText = t.algorithm;
        if (
            text === "允许出站换乘/转乘" ||
            text === "Allow Exiting-station Transfer / Informal Transfer"
        )
            label.innerText = t.allowTransfer;
    });
    const calcBtn = document.getElementById("calcBtn");
    if (calcBtn) calcBtn.innerText = t.calcBtn;
    const algSelect = document.getElementById("algorithm");
    if (algSelect && algSelect.options.length >= 2) {
        algSelect.options[0].text = t.distanceShortest;
        algSelect.options[1].text = t.transferMin;
    }
    const loadingDiv = document.getElementById("loading");
    if (loadingDiv && !isDataLoaded) loadingDiv.innerText = t.loading;
    const startSelect = document.getElementById("startStation");
    const endSelect = document.getElementById("endStation");
    if (
        startSelect &&
        startSelect.options[0] &&
        startSelect.options[0].value === ""
    ) {
        startSelect.options[0].text = t.defaultOption;
    }
    if (
        endSelect &&
        endSelect.options[0] &&
        endSelect.options[0].value === ""
    ) {
        endSelect.options[0].text = t.defaultOption;
    }
}

// ---------- 数据加载 ----------
async function initData() {
    try {
        await loadXMLData("/src/xml/lines.xml", (xmlDoc) => {
            const lineElements = xmlDoc.getElementsByTagName("line");
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
                    } else {
                        lineMap[code] = { zh: code, en: code };
                    }
                }
                if (code && zhName && enName) {
                    lineMap[code] = { zh: zhName, en: enName };
                } else if (code) {
                    lineMap[code] = { zh: code, en: code };
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
                const connectionsEl =
                    stationElements[i].getElementsByTagName("connections")[0];
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
                            connections: [],
                        });
                        continue;
                    }
                    const name = { zh: zhName, en: enName };
                    const line = lineEl.textContent;
                    const connections = [];
                    if (connectionsEl) {
                        const connNodes =
                            connectionsEl.getElementsByTagName("connection");
                        for (let j = 0; j < connNodes.length; j++) {
                            const to = connNodes[j].getAttribute("to");
                            const distance =
                                connNodes[j].getAttribute("distance");
                            const by = connNodes[j].getAttribute("by");
                            if (to && distance && by) {
                                connections.push({
                                    to,
                                    distance: parseFloat(distance),
                                    by,
                                });
                            }
                        }
                    }
                    const lineGroups = line.split(";").map((group) =>
                        group
                            .split(",")
                            .map((l) => l.trim())
                            .filter((l) => l !== ""),
                    );
                    maxGroups = Math.max(maxGroups, lineGroups.length);
                    stations.push({
                        id,
                        name,
                        lineGroups,
                        rawLine: line,
                        connections,
                    });
                }
            }
        });

        stations.forEach((s, idx) => {
            stationIdToIndex[s.id] = idx;
        });
        populateStationSelects();
        isDataLoaded = true;
        document.getElementById("loading").style.display = "none";
        document.getElementById("result").innerHTML = "";
        applyUILanguage();
    } catch (error) {
        document.getElementById("loading").innerHTML =
            `<p class="text-danger">${
                langPack[currentLang].errorLoad
            }: ${error.message}</p>`;
    }
}

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

function getStationName(station) {
    return station.name[currentLang] || station.name["zh-Hans"];
}

function getLineName(code) {
    return lineMap[code] ? lineMap[code][currentLang] : code;
}

function populateStationSelects() {
    const startSelect = document.getElementById("startStation");
    const endSelect = document.getElementById("endStation");
    if (!startSelect || !endSelect) return;
    const oldStart = startSelect.value;
    const oldEnd = endSelect.value;
    startSelect.innerHTML = `<option value="">${langPack[currentLang].defaultOption}</option>`;
    endSelect.innerHTML = `<option value="">${langPack[currentLang].defaultOption}</option>`;
    stations.forEach((s) => {
        const name = getStationName(s);
        const option1 = new Option(`${name} ${s.id}`, s.id);
        const option2 = new Option(`${name} ${s.id}`, s.id);
        startSelect.appendChild(option1);
        endSelect.appendChild(option2);
    });
    if (oldStart && stations.some((s) => s.id === oldStart))
        startSelect.value = oldStart;
    if (oldEnd && stations.some((s) => s.id === oldEnd))
        endSelect.value = oldEnd;
}

// ---------- 路径搜索核心 ----------
const K = 6;

function makeComparator(algorithm) {
    if (algorithm === "distance") {
        return (a, b) => {
            if (a.dist !== b.dist) return a.dist - b.dist;
            return a.transfer - b.transfer;
        };
    } else {
        return (a, b) => {
            if (a.transfer !== b.transfer) return a.transfer - b.transfer;
            return a.dist - b.dist;
        };
    }
}

class Label {
    constructor(transfer, dist, state, prevLabel, edgeInfo) {
        this.transfer = transfer;
        this.dist = dist;
        this.state = state;
        this.prev = prevLabel;
        this.edge = edgeInfo;
    }
}

function findKPaths(startId, endId, algorithm, allowCrossGroup) {
    const startIdx = stationIdToIndex[startId];
    const endIdx = stationIdToIndex[endId];
    if (startIdx === undefined || endIdx === undefined) return [];

    const comparator = makeComparator(algorithm);
    const stateCount = stations.length * maxGroups;
    let best = new Array(stateCount).fill().map(() => []);
    let pq = [];

    function pqPush(label) {
        pq.push(label);
        pq.sort((a, b) => comparator(a, b));
    }
    function pqPop() {
        return pq.shift();
    }

    const startGroups = stations[startIdx].lineGroups;
    for (let g = 0; g < startGroups.length; g++) {
        const state = startIdx * maxGroups + g;
        const label = new Label(0, 0, state, null, null);
        best[state].push(label);
        pqPush(label);
    }

    while (pq.length) {
        const cur = pqPop();
        const state = cur.state;
        if (!best[state].includes(cur)) continue;

        const u = Math.floor(state / maxGroups);
        const g = state % maxGroups;
        const uStation = stations[u];
        const currentGroup = uStation.lineGroups[g];

        for (const conn of uStation.connections) {
            const byLine = conn.by;
            if (!currentGroup.includes(byLine)) continue;
            const vIdx = stationIdToIndex[conn.to];
            if (vIdx === undefined) continue;
            const vStation = stations[vIdx];
            let targetGroup = -1;
            for (let g2 = 0; g2 < vStation.lineGroups.length; g2++) {
                if (vStation.lineGroups[g2].includes(byLine)) {
                    targetGroup = g2;
                    break;
                }
            }
            if (targetGroup === -1) continue;
            const vState = vIdx * maxGroups + targetGroup;
            const newTransfer = cur.transfer;
            const newDist = cur.dist + conn.distance;
            const newLabel = new Label(newTransfer, newDist, vState, cur, {
                type: "ride",
                from: u,
                to: vIdx,
                group: targetGroup,
                distance: conn.distance,
                line: byLine,
            });
            const oldList = best[vState];
            let shouldAdd = false;
            if (oldList.length < K) shouldAdd = true;
            else if (comparator(newLabel, oldList[oldList.length - 1]) < 0)
                shouldAdd = true;
            if (shouldAdd) {
                oldList.push(newLabel);
                oldList.sort(comparator);
                if (oldList.length > K) oldList.pop();
                pqPush(newLabel);
            }
        }

        if (allowCrossGroup) {
            const uGroups = uStation.lineGroups;
            for (let g2 = 0; g2 < uGroups.length; g2++) {
                if (g2 === g) continue;
                const newState = u * maxGroups + g2;
                const newTransfer = cur.transfer + 1;
                const newDist = cur.dist;
                const newLabel = new Label(
                    newTransfer,
                    newDist,
                    newState,
                    cur,
                    {
                        type: "transfer",
                        station: u,
                        fromGroup: g,
                        toGroup: g2,
                    },
                );
                const oldList = best[newState];
                let shouldAdd = false;
                if (oldList.length < K) shouldAdd = true;
                else if (comparator(newLabel, oldList[oldList.length - 1]) < 0)
                    shouldAdd = true;
                if (shouldAdd) {
                    oldList.push(newLabel);
                    oldList.sort(comparator);
                    if (oldList.length > K) oldList.pop();
                    pqPush(newLabel);
                }
            }
        }
    }

    let allLabels = [];
    for (let g = 0; g < stations[endIdx].lineGroups.length; g++) {
        const state = endIdx * maxGroups + g;
        allLabels.push(...best[state]);
    }

    const uniquePaths = [];
    for (let label of allLabels) {
        const path = reconstructPath(label);
        // 过滤自环（起点与终点相同且没有实际移动）
        if (path.stationSequence.length === 1) continue;
        const seen = new Set();
        let duplicateStation = false;
        for (let i = 0; i < path.stationSequence.length; i++) {
            const sid = path.stationSequence[i];
            if (seen.has(sid) && i !== 0) {
                duplicateStation = true;
                break;
            }
            seen.add(sid);
        }
        if (duplicateStation) continue;
        let duplicate = false;
        for (let p of uniquePaths) {
            if (
                p.stationSequence.length === path.stationSequence.length &&
                p.stationSequence.every(
                    (val, idx) => val === path.stationSequence[idx],
                )
            ) {
                duplicate = true;
                break;
            }
        }
        if (!duplicate) {
            uniquePaths.push(path);
            if (uniquePaths.length >= K) break;
        }
    }
    uniquePaths.sort((a, b) => comparator(a, b));
    return uniquePaths.slice(0, K);
}

function reconstructPath(label) {
    // 1. 从 label 回溯原始步骤
    const rawSteps = [];
    let cur = label;
    while (cur) {
        const u = Math.floor(cur.state / maxGroups);
        const g = cur.state % maxGroups;
        rawSteps.unshift({ stationIdx: u, groupIdx: g, edge: cur.edge });
        cur = cur.prev;
    }
    if (rawSteps.length === 1) {
        return {
            transfer: 0,
            dist: 0,
            steps: [
                {
                    type: "station",
                    stationIdx: rawSteps[0].stationIdx,
                    isStart: true,
                    isEnd: true,
                },
            ],
            stationSequence: [rawSteps[0].stationIdx],
        };
    }

    // 2. 顺序遍历边，生成步骤
    const steps = [];
    let totalDist = 0;
    let transferCount = 0;

    // 起点
    steps.push({
        type: "station",
        stationIdx: rawSteps[0].stationIdx,
        isStart: true,
    });

    let lastRideLine = null;
    let lastStationIdx = rawSteps[0].stationIdx;

    for (let i = 1; i < rawSteps.length; i++) {
        const step = rawSteps[i];
        const edge = step.edge;
        if (!edge) continue;

        if (edge.type === "ride") {
            const line = edge.line;
            const to = edge.to;
            const distance = edge.distance;

            // 如果线路发生变化（且不是第一次），则添加换乘标记
            if (lastRideLine !== null && lastRideLine !== line) {
                steps.push({ type: "transfer", transferType: "linechange" });
                transferCount++;
            }

            // 添加乘坐段
            steps.push({
                type: "ride",
                line: line,
                to: to,
                distance: distance,
            });
            totalDist += distance;

            // 更新记录
            lastRideLine = line;
            lastStationIdx = to;

            // 添加到达站（稍后会去重）
            steps.push({ type: "station", stationIdx: to });
        } else if (edge.type === "transfer") {
            // 出站换乘（跨组）
            // 确保不连续添加多个 transfer
            const lastStep = steps[steps.length - 1];
            if (lastStep.type !== "transfer") {
                steps.push({ type: "transfer", transferType: "outstation" });
                transferCount++;
            }
            // 换乘不改变站点，所以不添加新站
        }
    }

    // 标记终点
    for (let i = steps.length - 1; i >= 0; i--) {
        if (steps[i].type === "station") {
            steps[i].isEnd = true;
            break;
        }
    }

    // 去重连续相同的 station
    const finalSteps = [];
    for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        if (step.type === "station") {
            if (
                finalSteps.length > 0 &&
                finalSteps[finalSteps.length - 1].type === "station" &&
                finalSteps[finalSteps.length - 1].stationIdx === step.stationIdx
            ) {
                continue;
            }
            finalSteps.push(step);
        } else {
            finalSteps.push(step);
        }
    }
    const stationSequence = finalSteps
        .filter((s) => s.type === "station")
        .map((s) => s.stationIdx);
    return {
        transfer: transferCount,
        dist: totalDist,
        steps: finalSteps,
        stationSequence,
    };
}

function displayPaths(paths) {
    if (!paths || paths.length === 0)
        return `<p class="text-warning">${langPack[currentLang].noPath}</p>`;
    const t = langPack[currentLang];
    let html = `<h4>${t.pathCount(paths.length)}</h4>`;
    paths.forEach((path, idx) => {
        html += `<div class="card path-card"><div class="card-header">${t.pathHeader(
            idx,
            path.transfer,
            path.dist,
        )}</div><div class="card-body"><ol class="list-group list-group-flush">`;
        for (let i = 0; i < path.steps.length; i++) {
            const step = path.steps[i];
            if (step.type === "station") {
                const station = stations[step.stationIdx];
                const stationName = getStationName(station);
                const allLines = station.lineGroups
                    .flat()
                    .map((code) => getLineName(code))
                    .join("，");
                html += `<li class="list-group-item station-item text-no-theme">`;
                html += `<div class="d-flex justify-content-between align-items-center">`;
                html += `<span class="station-name text-no-theme"><strong>${stationName}</strong></span>`;
                html += `<button class="btn btn-sm btn-outline-secondary expand-btn" data-expanded="false">▼</button>`;
                html += `</div><div class="station-detail mt-2" style="display: none;">`;
                html += `<div class="text-no-theme"><strong>${t.stationId}</strong> ${station.id}</div>`;
                html += `<div class="text-no-theme"><strong>${t.stationLines}</strong> ${allLines}</div></div></li>`;
            } else if (step.type === "ride") {
                const lineName = getLineName(step.line);
                const toStation = stations[step.to];
                const toName = getStationName(toStation);
                const rideText = t.rideTo(lineName, toName, step.distance);
                html += `<li class="list-group-item ride-item text-no-theme">${rideText}</li>`;
            } else if (step.type === "transfer") {
                // 普通换乘显示 ↺ 换乘
                html += `<li class="list-group-item step-transfer text-no-theme">${t.transfer}</li>`;
            }
        }
        html += `</ol></div></div>`;
    });
    setTimeout(() => {
        const resultDiv = document.getElementById("result");
        if (!resultDiv) return;
        resultDiv.querySelectorAll(".expand-btn").forEach((btn) => {
            btn.removeEventListener("click", handleStationExpand);
            btn.addEventListener("click", handleStationExpand);
        });
    }, 0);
    return html;
}

function handleStationExpand(event) {
    const btn = event.currentTarget;
    const stationItem = btn.closest(".station-item");
    if (!stationItem) return;
    const detailDiv = stationItem.querySelector(".station-detail");
    const isExpanded = btn.getAttribute("data-expanded") === "true";
    if (isExpanded) {
        detailDiv.style.display = "none";
        btn.innerHTML = "▼";
        btn.setAttribute("data-expanded", "false");
    } else {
        detailDiv.style.display = "block";
        btn.innerHTML = "▲";
        btn.setAttribute("data-expanded", "true");
    }
}

// ---------- 初始化 ----------
document.addEventListener("DOMContentLoaded", function () {
    currentLang = detectLanguage();
    applyUILanguage();
    initData();
    document.getElementById("calcBtn").addEventListener("click", function () {
        if (!isDataLoaded) {
            alert(langPack[currentLang].dataNotReady);
            return;
        }
        const startId = document.getElementById("startStation").value;
        const endId = document.getElementById("endStation").value;
        if (!startId || !endId) {
            alert(langPack[currentLang].selectStartEnd);
            return;
        }
        if (startId === endId) {
            alert(langPack[currentLang].sameLineAlert);
            return;
        }
        const algorithm = document.getElementById("algorithm").value;
        const allowCrossGroup =
            document.getElementById("allowCrossGroup").checked;
        const paths = findKPaths(startId, endId, algorithm, allowCrossGroup);
        document.getElementById("result").innerHTML = displayPaths(paths);
    });
});
