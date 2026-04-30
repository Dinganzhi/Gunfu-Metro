// ---------- 语言包 ----------
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
    "zh-Hant": {
        loading: "正在載入資料……",
        errorLoad: "載入資料出錯",
        startStation: "起點站",
        endStation: "終點站",
        algorithm: "排序方式",
        distanceShortest: "距離最短",
        transferMin: "換乘最少",
        allowTransfer: "容許出站換乘／轉乘",
        calcBtn: "查詢",
        pathCount: (n) => `找到 ${n} 條路徑：`,
        pathHeader: (idx, transfer, dist) =>
            `路徑 ${idx + 1} · 換乘 ${transfer} 次 · 總距離 ${dist} 米`,
        rideTo: (line, to, dist) => `→ 乘坐 ${line} 至 ${to}，距離 ${dist} 米`,
        transfer: "↺ 換乘",
        outStationTransfer: "↺ 出站換乘／轉乘",
        viaStations: "途經車站：",
        stationId: "ID：",
        stationLines: "路線：",
        noPath: "沒有找到可行路徑。",
        sameLineAlert: "請選擇兩條不同的路線",
        dataNotReady: "資料尚未載入完成，請稍候",
        selectStartEnd: "請選擇起點和終點",
        defaultOption: "請選擇",
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
    const labels = document.querySelectorAll("label");
    labels.forEach((label) => {
        const text = label.innerText.trim();
        if (text === "起点站" || text === "起點站" || text === "Start Station")
            label.innerText = t.startStation;
        if (text === "终点站" || text === "終點站" || text === "End Station")
            label.innerText = t.endStation;
        if (text === "排序方式" || text === "Sorting Method")
            label.innerText = t.algorithm;
        if (
            text === "允许出站换乘/转乘" ||
            text === "容許出站換乘／轉乘" ||
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
                    } else {
                        lineMap[code] = {
                            "zh-Hans": code,
                            "zh-Hant": code,
                            en: code,
                        };
                    }
                } else if (code) {
                    lineMap[code] = {
                        "zh-Hans": code,
                        "zh-Hant": code,
                        en: code,
                    };
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
                const connectionsEl =
                    stationElements[i].getElementsByTagName("connections")[0];
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
                            connections: [],
                        });
                        continue;
                    }
                    const name = { "zh-Hans": zhHans, "zh-Hant": zhHant, en };
                    let line = lineEl.textContent?.trim() || "";
                    let connections = [];
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
            `<p class="text-danger">${langPack[currentLang].errorLoad}: ${error.message}</p>`;
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
    return station.name[currentLang] || station.name["zh-Hans"] || station.id;
}

function getLineName(code) {
    if (lineMap[code] && lineMap[code][currentLang])
        return lineMap[code][currentLang];
    return code;
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
    // 1. 回溯得到原始步骤序列（状态+边）
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

    // 2. 构建乘车段（ride）和换乘边（transfer）的原始列表，同时记录路径上的所有站点顺序
    // 我们最终需要呈现的格式：站点1 → 乘坐(线路, 距离) → 站点2 → [换乘标记] → 站点3 → 乘坐...
    // 因此需要先提取出所有站点（包括起点和终点）以及每段乘坐对应的线路和距离。

    // 解析步骤，构建一个更易于处理的序列
    // 我们创建一个 events 数组，存储 { type, stationIdx, line, distance, viaStations }
    const events = [];
    events.push({ type: "station", stationIdx: rawSteps[0].stationIdx }); // 起点

    // 用于合并连续相同线路的乘坐段
    let lastRide = null;

    for (let i = 1; i < rawSteps.length; i++) {
        const step = rawSteps[i];
        const edge = step.edge;
        if (!edge) continue;
        if (edge.type === "ride") {
            const line = edge.line;
            const from = edge.from;
            const to = edge.to;
            const distance = edge.distance;
            const via = step.stationIdx; // 当前到达的站点（中间可能既是到达站也是出发站，但实际乘坐段已经包含了从 from 到 to 的一步）
            if (lastRide && lastRide.line === line) {
                // 合并
                lastRide.distance += distance;
                lastRide.to = to;
                if (via !== lastRide.from && via !== lastRide.to) {
                    lastRide.viaStations.push(via);
                }
            } else {
                if (lastRide) {
                    events.push({
                        type: "ride",
                        line: lastRide.line,
                        from: lastRide.from,
                        to: lastRide.to,
                        distance: lastRide.distance,
                        viaStations: lastRide.viaStations,
                    });
                }
                lastRide = {
                    line: line,
                    from: from,
                    to: to,
                    distance: distance,
                    viaStations: via !== from && via !== to ? [via] : [],
                };
            }
        } else if (edge.type === "transfer") {
            // 换乘边（仅跨组换乘）
            if (lastRide) {
                events.push({
                    type: "ride",
                    line: lastRide.line,
                    from: lastRide.from,
                    to: lastRide.to,
                    distance: lastRide.distance,
                    viaStations: lastRide.viaStations,
                });
                lastRide = null;
            }
            events.push({ type: "transfer", stationIdx: edge.station });
        }
    }
    if (lastRide) {
        events.push({
            type: "ride",
            line: lastRide.line,
            from: lastRide.from,
            to: lastRide.to,
            distance: lastRide.distance,
            viaStations: lastRide.viaStations,
        });
    }

    // 3. 遍历 events，构建最终显示步骤，并确定换乘信息
    const finalSteps = [];
    // 辅助：获取站点的 lineGroups
    const getStationGroups = (idx) => stations[idx].lineGroups;

    // 记录上一次乘坐的线路（用于判断是否需要换乘）
    let prevRideLine = null;
    // 记录上一个站点索引（用于判断换乘类型）
    let prevStationIdx = null;

    for (let i = 0; i < events.length; i++) {
        const ev = events[i];
        if (ev.type === "station") {
            // 站点
            finalSteps.push({ type: "station", stationIdx: ev.stationIdx });
            prevStationIdx = ev.stationIdx;
        } else if (ev.type === "ride") {
            // 乘坐段
            const currentLine = ev.line;
            const currentTo = ev.to;
            // 检查是否需要添加换乘标记（如果当前线路与上一次乘坐线路不同，且不是第一次乘坐）
            if (
                prevRideLine !== null &&
                prevRideLine !== currentLine &&
                prevStationIdx !== null
            ) {
                // 需要判断换乘类型：组内换乘还是跨组换乘
                // 获取上一个站点的所有线路组
                const prevStationGroups = getStationGroups(prevStationIdx);
                // 判断是否在同一组内：即是否存在一个组同时包含 prevRideLine 和 currentLine
                let isSameGroup = false;
                for (const group of prevStationGroups) {
                    if (
                        group.includes(prevRideLine) &&
                        group.includes(currentLine)
                    ) {
                        isSameGroup = true;
                        break;
                    }
                }
                const transferType = isSameGroup
                    ? "transfer"
                    : "outStationTransfer";
                finalSteps.push({
                    type: "transfer",
                    transferType: transferType,
                });
            }
            // 添加乘坐段
            finalSteps.push({
                type: "ride",
                line: currentLine,
                to: currentTo,
                distance: ev.distance,
                viaStations: ev.viaStations,
            });
            prevRideLine = currentLine;
            // 注意：乘坐段后的站点将在下一个 event 中作为 station 添加，但这里需要确保终点站存在
            // 如果下一个 event 不是 station（比如是 transfer 或 ride），则需要主动添加到达站
            const nextEv = events[i + 1];
            if (!nextEv || nextEv.type !== "station") {
                finalSteps.push({ type: "station", stationIdx: currentTo });
                prevStationIdx = currentTo;
            }
        } else if (ev.type === "transfer") {
            // 跨组换乘（算法中的 transfer 边）已经在上面的换乘判断中覆盖，但此处保留以防遗漏
            // 实际上算法中的 transfer 边会在 ride 之间被捕获，这里可能不需要额外处理
            // 但为了保险，如果单独出现 transfer 边（无前 ride），则直接添加换乘标记
            if (prevRideLine !== null) {
                finalSteps.push({
                    type: "transfer",
                    transferType: "outStationTransfer",
                });
            }
        }
    }

    // 去重连续的 station（有可能出现连续两个相同 station）
    const dedupSteps = [];
    for (let i = 0; i < finalSteps.length; i++) {
        const step = finalSteps[i];
        if (step.type === "station") {
            if (
                dedupSteps.length > 0 &&
                dedupSteps[dedupSteps.length - 1].type === "station" &&
                dedupSteps[dedupSteps.length - 1].stationIdx === step.stationIdx
            ) {
                continue;
            }
            dedupSteps.push(step);
        } else {
            dedupSteps.push(step);
        }
    }

    // 标记起点和终点
    if (dedupSteps.length > 0 && dedupSteps[0].type === "station")
        dedupSteps[0].isStart = true;
    if (
        dedupSteps.length > 0 &&
        dedupSteps[dedupSteps.length - 1].type === "station"
    )
        dedupSteps[dedupSteps.length - 1].isEnd = true;

    // 计算换乘次数（仅统计 type === "transfer" 的步数）
    let transferCount = 0;
    let totalDist = 0;
    for (const step of dedupSteps) {
        if (step.type === "transfer") transferCount++;
        else if (step.type === "ride") totalDist += step.distance;
    }

    const stationSequence = dedupSteps
        .filter((s) => s.type === "station")
        .map((s) => s.stationIdx);
    return {
        transfer: transferCount,
        dist: totalDist,
        steps: dedupSteps,
        stationSequence,
    };
}

function displayPaths(paths) {
    if (!paths || paths.length === 0)
        return `<p class="text-warning">${langPack[currentLang].noPath}</p>`;
    const t = langPack[currentLang];
    let html = `<h4>${t.pathCount(paths.length)}</h4>`;
    paths.forEach((path, idx) => {
        html += `<div class="card path-card"><div class="card-header">${t.pathHeader(idx, path.transfer, path.dist)}</div><div class="card-body"><ol class="list-group list-group-flush">`;
        for (let i = 0; i < path.steps.length; i++) {
            const step = path.steps[i];
            if (step.type === "station") {
                const station = stations[step.stationIdx];
                const stationName = getStationName(station);
                const allLines = station.lineGroups
                    .flat()
                    .map((code) => getLineName(code))
                    .filter((l) => l)
                    .join("，");
                html += `<li class="list-group-item station-item text-no-theme">`;
                html += `<div class="d-flex justify-content-between align-items-center">`;
                html += `<span class="station-name text-no-theme"><strong>${stationName}</strong></span>`;
                html += `<button class="btn btn-sm btn-outline-secondary expand-btn" data-expanded="false">▼</button>`;
                html += `</div><div class="station-detail mt-2" style="display: none;">`;
                html += `<div class="text-no-theme"><strong>${t.stationId}</strong> ${station.id}</div>`;
                html += `<div class="text-no-theme"><strong>${t.stationLines}</strong> ${allLines || "（无线路）"}</div></div></li>`;
            } else if (step.type === "ride") {
                const lineName = getLineName(step.line);
                const toStation = stations[step.to];
                const toName = getStationName(toStation);
                const rideText = t.rideTo(lineName, toName, step.distance);
                const hasVia = step.viaStations && step.viaStations.length > 0;
                const rideId = `ride-${idx}-${i}`;
                html += `<li class="list-group-item ride-item text-no-theme"><div class="d-flex justify-content-between align-items-center">`;
                html += `<span class="text-no-theme">${rideText}</span>`;
                if (hasVia)
                    html += `<button class="btn btn-sm btn-outline-secondary ride-expand-btn" data-ride-id="${rideId}" data-expanded="false">▼</button>`;
                else html += `<span style="width: 32px;"></span>`;
                html += `</div>`;
                if (hasVia) {
                    html += `<div id="${rideId}" class="ride-detail mt-2" style="display: none;"><div class="ms-3 text-no-theme">${t.viaStations}</div><ul class="list-group list-group-flush ms-4 mt-1">`;
                    for (let vi = 0; vi < step.viaStations.length; vi++) {
                        const viaStation = stations[step.viaStations[vi]];
                        const viaName = getStationName(viaStation);
                        const viaLines = viaStation.lineGroups
                            .flat()
                            .map((code) => getLineName(code))
                            .filter((l) => l)
                            .join("，");
                        html += `<li class="list-group-item via-station-item text-no-theme"><div class="d-flex justify-content-between align-items-center">`;
                        html += `<span class="text-no-theme"><strong>${viaName}</strong></span>`;
                        html += `<button class="btn btn-sm btn-outline-secondary via-expand-btn" data-via-id="via-${idx}-${i}-${vi}" data-expanded="false">▼</button>`;
                        html += `</div><div id="via-${idx}-${i}-${vi}" class="via-detail mt-2" style="display: none;">`;
                        html += `<div class="text-no-theme"><strong>${t.stationId}</strong> ${viaStation.id}</div>`;
                        html += `<div class="text-no-theme"><strong>${t.stationLines}</strong> ${viaLines || "（无线路）"}</div></div></li>`;
                    }
                    html += `</ul></div>`;
                }
                html += `</li>`;
            } else if (step.type === "transfer") {
                const transferText =
                    step.transferType === "outStationTransfer"
                        ? t.outStationTransfer
                        : t.transfer;
                html += `<li class="list-group-item step-transfer text-no-theme">${transferText}</li>`;
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
        resultDiv.querySelectorAll(".ride-expand-btn").forEach((btn) => {
            btn.removeEventListener("click", handleRideExpand);
            btn.addEventListener("click", handleRideExpand);
        });
        resultDiv.querySelectorAll(".via-expand-btn").forEach((btn) => {
            btn.removeEventListener("click", handleViaExpand);
            btn.addEventListener("click", handleViaExpand);
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

function handleRideExpand(event) {
    const btn = event.currentTarget;
    const rideId = btn.getAttribute("data-ride-id");
    const rideDetail = document.getElementById(rideId);
    if (!rideDetail) return;
    const isExpanded = btn.getAttribute("data-expanded") === "true";
    if (isExpanded) {
        rideDetail.style.display = "none";
        btn.innerHTML = "▼";
        btn.setAttribute("data-expanded", "false");
    } else {
        rideDetail.style.display = "block";
        btn.innerHTML = "▲";
        btn.setAttribute("data-expanded", "true");
    }
}

function handleViaExpand(event) {
    const btn = event.currentTarget;
    const viaId = btn.getAttribute("data-via-id");
    const viaDetail = document.getElementById(viaId);
    if (!viaDetail) return;
    const isExpanded = btn.getAttribute("data-expanded") === "true";
    if (isExpanded) {
        viaDetail.style.display = "none";
        btn.innerHTML = "▼";
        btn.setAttribute("data-expanded", "false");
    } else {
        viaDetail.style.display = "block";
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
