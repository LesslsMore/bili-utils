// ==UserScript==
// @name         bilibili、腾讯视频弹幕下载
// @namespace    https://github.com/LesslsMore/bili-utils
// @version      0.2.1
// @author       lesslsmore
// @description  bilibili、腾讯视频弹幕下载，支持各类视频弹幕下载，包括需要会员的视频以及需要大会员的番剧。B站使用分段Protobuf接口，下载全量弹幕。
// @license      MIT
// @icon         https://i0.hdslb.com/bfs/static/jinkela/long/images/favicon.ico
// @match        *://*.bilibili.com/bangumi/*
// @match        *://*.bilibili.com/video/*
// @match        https://v.qq.com/x/cover/*
// @require      https://cdn.jsdelivr.net/npm/file-saver@2.0.5/dist/FileSaver.min.js
// @grant        unsafeWindow
// ==/UserScript==

(function (saveAs) {
  'use strict';

  const DM_VIEW_API = "https://api.bilibili.com/x/v2/dm/web/view";
  const DM_SEG_API = "https://api.bilibili.com/x/v2/dm/web/seg.so";
  const setStatus = (onStatus, text, disabled = false) => {
    if (typeof onStatus === "function") {
      onStatus(text, disabled);
    }
  };
  function readVarint(buf, pos) {
    let result = 0n;
    let shift = 0n;
    while (pos < buf.length) {
      const byte = BigInt(buf[pos++]);
      result |= (byte & 0x7fn) << shift;
      if ((byte & 0x80n) === 0n) {
        break;
      }
      shift += 7n;
    }
    return { value: result, pos };
  }
  function readBytes(buf, pos) {
    const lenResult = readVarint(buf, pos);
    const len = Number(lenResult.value);
    const start = lenResult.pos;
    return {
      value: buf.slice(start, start + len),
      pos: start + len
    };
  }
  function readString(buf, pos) {
    const result = readBytes(buf, pos);
    return {
      value: new TextDecoder().decode(result.value),
      pos: result.pos
    };
  }
  function skipField(buf, pos, wireType) {
    if (wireType === 0) {
      return readVarint(buf, pos).pos;
    }
    if (wireType === 1) {
      return pos + 8;
    }
    if (wireType === 2) {
      return readBytes(buf, pos).pos;
    }
    if (wireType === 5) {
      return pos + 4;
    }
    return buf.length;
  }
  function parseDmSegConfig(buf) {
    let pos = 0;
    let total = 0;
    while (pos < buf.length) {
      const tagResult = readVarint(buf, pos);
      pos = tagResult.pos;
      const tag = Number(tagResult.value);
      const fieldNum = tag >> 3;
      const wireType = tag & 7;
      if (fieldNum === 2 && wireType === 0) {
        const valueResult = readVarint(buf, pos);
        total = Number(valueResult.value);
        pos = valueResult.pos;
      } else {
        pos = skipField(buf, pos, wireType);
      }
    }
    return total;
  }
  function parseDmWebViewReply(arrayBuffer) {
    const buf = new Uint8Array(arrayBuffer);
    let pos = 0;
    let total = 0;
    while (pos < buf.length) {
      const tagResult = readVarint(buf, pos);
      pos = tagResult.pos;
      const tag = Number(tagResult.value);
      const fieldNum = tag >> 3;
      const wireType = tag & 7;
      if (fieldNum === 4 && wireType === 2) {
        const bytesResult = readBytes(buf, pos);
        total = parseDmSegConfig(bytesResult.value);
        pos = bytesResult.pos;
      } else {
        pos = skipField(buf, pos, wireType);
      }
    }
    return total;
  }
  function parseDanmakuElem(buf) {
    const elem = {
      id: 0n,
      progress: 0,
      mode: 1,
      fontsize: 25,
      color: 16777215,
      midHash: "",
      content: "",
      ctime: 0n,
      pool: 0,
      idStr: ""
    };
    let pos = 0;
    while (pos < buf.length) {
      const tagResult = readVarint(buf, pos);
      pos = tagResult.pos;
      const tag = Number(tagResult.value);
      const fieldNum = tag >> 3;
      const wireType = tag & 7;
      if (wireType === 0) {
        const valueResult = readVarint(buf, pos);
        pos = valueResult.pos;
        if (fieldNum === 1) elem.id = valueResult.value;
        else if (fieldNum === 2) elem.progress = Number(valueResult.value);
        else if (fieldNum === 3) elem.mode = Number(valueResult.value);
        else if (fieldNum === 4) elem.fontsize = Number(valueResult.value);
        else if (fieldNum === 5) elem.color = Number(valueResult.value);
        else if (fieldNum === 8) elem.ctime = valueResult.value;
        else if (fieldNum === 11) elem.pool = Number(valueResult.value);
      } else if (wireType === 2) {
        if (fieldNum === 6) {
          const valueResult = readString(buf, pos);
          elem.midHash = valueResult.value;
          pos = valueResult.pos;
        } else if (fieldNum === 7) {
          const valueResult = readString(buf, pos);
          elem.content = valueResult.value;
          pos = valueResult.pos;
        } else if (fieldNum === 12) {
          const valueResult = readString(buf, pos);
          elem.idStr = valueResult.value;
          pos = valueResult.pos;
        } else {
          pos = skipField(buf, pos, wireType);
        }
      } else {
        pos = skipField(buf, pos, wireType);
      }
    }
    return elem;
  }
  function parseDmSegMobileReply(arrayBuffer) {
    const buf = new Uint8Array(arrayBuffer);
    const elems = [];
    let pos = 0;
    while (pos < buf.length) {
      const tagResult = readVarint(buf, pos);
      pos = tagResult.pos;
      const tag = Number(tagResult.value);
      const fieldNum = tag >> 3;
      const wireType = tag & 7;
      if (fieldNum === 1 && wireType === 2) {
        const bytesResult = readBytes(buf, pos);
        elems.push(parseDanmakuElem(bytesResult.value));
        pos = bytesResult.pos;
      } else {
        pos = skipField(buf, pos, wireType);
      }
    }
    return elems;
  }
  async function fetchDmSegTotal(cid, aid) {
    const params = new URLSearchParams({
      type: "1",
      oid: String(cid)
    });
    if (aid) {
      params.set("pid", String(aid));
    }
    const response = await fetch(`${DM_VIEW_API}?${params}`, {
      credentials: "include"
    });
    if (!response.ok) {
      throw new Error(`dm/view HTTP ${response.status}`);
    }
    return parseDmWebViewReply(await response.arrayBuffer());
  }
  async function fetchAllSegments(cid, aid, totalSegments, onStatus) {
    const allElems = [];
    for (let i = 1; i <= totalSegments; i++) {
      setStatus(onStatus, `下载中 ${i}/${totalSegments}`, true);
      const params = new URLSearchParams({
        type: "1",
        oid: String(cid),
        segment_index: String(i)
      });
      if (aid) {
        params.set("pid", String(aid));
      }
      try {
        const response = await fetch(`${DM_SEG_API}?${params}`, {
          credentials: "include"
        });
        if (!response.ok) {
          console.warn(`[弹幕下载] 第 ${i} 段 HTTP ${response.status}，已跳过`);
          continue;
        }
        const elems = parseDmSegMobileReply(await response.arrayBuffer());
        allElems.push(...elems);
        console.log(`[弹幕下载] 第 ${i}/${totalSegments} 段获取到 ${elems.length} 条`);
      } catch (error) {
        console.error(`[弹幕下载] 第 ${i} 段失败:`, error);
      }
    }
    return allElems;
  }
  function escapeXml(value) {
    return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
  }
  function elemsToXml(elems) {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<i>\n';
    xml += "<chatserver>chat.bilibili.com</chatserver>\n";
    xml += "<chatid>0</chatid>\n";
    for (const elem of elems) {
      const timeSec = (elem.progress / 1e3).toFixed(5);
      const id = elem.idStr || elem.id;
      const p = `${timeSec},${elem.mode},${elem.fontsize},${elem.color},${elem.ctime},${elem.pool},${elem.midHash},${id}`;
      xml += `<d p="${p}">${escapeXml(elem.content)}</d>
`;
    }
    xml += "</i>";
    return xml;
  }
  async function getText(url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.text();
  }
  async function fetchVideoData(bv) {
    const html = await getText(`https://www.bilibili.com/video/${bv}/`);
    const match = html.match(/window\.__INITIAL_STATE__=(.*);\(function\(\){/);
    if (!match) {
      throw new Error("无法解析普通视频页面数据");
    }
    const state = JSON.parse(match[1]);
    return {
      cid: state.videoData.cid,
      aid: state.videoData.aid,
      title: state.videoData.title
    };
  }
  async function fetchInfo(ep) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j;
    const html = await getText(`https://www.bilibili.com/bangumi/play/${ep}/`);
    try {
      const match = html.match(/const playurlSSRData = (\{.*?\}\n)/s);
      if (match) {
        const json = JSON.parse(match[1]);
        const epInfo = json.data.result.play_view_business_info.episode_info;
        const ogvInfo = (_a = json.data.result.supplement) == null ? void 0 : _a.ogv_episode_info;
        return {
          cid: epInfo.cid,
          aid: epInfo.aid,
          title: (ogvInfo == null ? void 0 : ogvInfo.index_title) || epInfo.index_title || ep,
          longTitle: (ogvInfo == null ? void 0 : ogvInfo.long_title) || epInfo.long_title || ""
        };
      }
    } catch (error) {
      console.warn("[弹幕下载] playurlSSRData 解析失败，尝试 __NEXT_DATA__", error);
    }
    try {
      const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);
      if (match) {
        const json = JSON.parse(match[1]);
        const queries = ((_d = (_c = (_b = json.props) == null ? void 0 : _b.pageProps) == null ? void 0 : _c.dehydratedState) == null ? void 0 : _d.queries) || [];
        const seasonData = (_f = (_e = queries.find((query) => {
          var _a2, _b2;
          return (_b2 = (_a2 = query.state) == null ? void 0 : _a2.data) == null ? void 0 : _b2.seasonInfo;
        })) == null ? void 0 : _e.state) == null ? void 0 : _f.data;
        const playData = (_h = (_g = queries.find((query) => {
          var _a2, _b2;
          return (_b2 = (_a2 = query.state) == null ? void 0 : _a2.data) == null ? void 0 : _b2.playInfo;
        })) == null ? void 0 : _g.state) == null ? void 0 : _h.data;
        const episodes = ((_j = (_i = seasonData == null ? void 0 : seasonData.seasonInfo) == null ? void 0 : _i.mediaInfo) == null ? void 0 : _j.episodes) || [];
        const epId = ep.startsWith("ep") ? ep.replace("ep", "") : "";
        const epData = episodes.find((item) => String(item.id) === epId) || episodes[0] || {};
        const playInfo = (playData == null ? void 0 : playData.playInfo) || (seasonData == null ? void 0 : seasonData.playInfo) || {};
        return {
          cid: playInfo.cid || epData.cid,
          aid: playInfo.aid || epData.aid,
          title: epData.share_copy || epData.index_title || ep,
          longTitle: epData.long_title || ""
        };
      }
    } catch (error) {
      console.warn("[弹幕下载] __NEXT_DATA__ 解析失败", error);
    }
    throw new Error("无法解析番剧页面数据");
  }
  function estimateTotalSegmentsFromPage() {
    var _a, _b;
    const state = window.__INITIAL_STATE__;
    const duration = ((_a = state == null ? undefined : state.videoData) == null ? undefined : _a.duration) || ((_b = state == null ? undefined : state.mediaInfo) == null ? undefined : _b.duration);
    return duration ? Math.max(1, Math.ceil(duration / 360)) : 1;
  }
  function safeFileName(name) {
    return (name || "danmaku").replace(/[\\/:*?"<>|]/g, "_");
  }
  async function down_bili_danmu(onStatus) {
    const url = window.location.href;
    const epMatch = url.match(/(ep\d+)/) || url.match(/(ss\d+)/);
    const bvMatch = url.match(/video\/(BV\w+)/);
    let info;
    try {
      setStatus(onStatus, "获取视频信息...", true);
      if (epMatch) {
        info = await fetchInfo(epMatch[1]);
      } else if (bvMatch) {
        info = await fetchVideoData(bvMatch[1]);
      } else {
        alert("无法识别当前页面，请在 B 站视频或番剧页面使用");
        return;
      }
    } catch (error) {
      alert(`获取视频信息失败: ${error.message}`);
      return;
    }
    const title = info.longTitle ? `${info.title} - ${info.longTitle}` : info.title;
    console.log(`[弹幕下载] cid=${info.cid} aid=${info.aid} title=${title}`);
    let totalSegments = 1;
    try {
      setStatus(onStatus, "获取分段数...", true);
      const total = await fetchDmSegTotal(info.cid, info.aid);
      if (total > 0) {
        totalSegments = total;
      }
      console.log(`[弹幕下载] 分段总数: ${totalSegments}`);
    } catch (error) {
      totalSegments = estimateTotalSegmentsFromPage();
      console.warn(`[弹幕下载] 获取分段数失败，使用估算分段数 ${totalSegments}`, error);
    }
    const elems = await fetchAllSegments(info.cid, info.aid, totalSegments, onStatus);
    console.log(`[弹幕下载] 共获取到 ${elems.length} 条弹幕`);
    if (elems.length === 0) {
      alert("未获取到任何弹幕，可能视频暂无弹幕或接口受限");
      return;
    }
    const blob = new Blob([elemsToXml(elems)], {
      type: "application/xml;charset=utf-8"
    });
    saveAs(blob, `${safeFileName(title)}.xml`);
    setStatus(onStatus, "下载弹幕", false);
  }
  var _unsafeWindow = /* @__PURE__ */ (() => typeof unsafeWindow != "undefined" ? unsafeWindow : undefined)();
  function get_api_info(url, payload, response) {
    if (url.includes("https://pbaccess.video.qq.com/trpc.barrage.custom_barrage.CustomBarrage/GetDMStartUpConfig")) {
      console.log("vqq", url, response);
      const cloned = response.clone();
      cloned.json().then(async (data) => {
        console.log("Fetch响应内容:", data);
        if (data && data.data && data.data.segment_index) {
          console.log("Fetch请求内容:", payload);
          localStorage.setItem("payload", payload);
          console.log(data.data.segment_index);
          localStorage.setItem("segment_index", JSON.stringify(data.data.segment_index));
        }
      });
    }
  }
  async function down_vqq_danmu() {
    const payload = localStorage.getItem("payload");
    const segment_index = localStorage.getItem("segment_index");
    const vid = JSON.parse(payload).vid;
    await fetchAndMergeBarrages(JSON.parse(segment_index), vid);
  }
  async function fetchAndMergeBarrages(segmentsData, vid) {
    const baseUrl = `https://dm.video.qq.com/barrage/segment/${vid}/`;
    const allBarrages = [];
    const segmentNames = Object.values(segmentsData).map((s) => s.segment_name);
    for (let i = 0; i < segmentNames.length; i++) {
      const segmentName = segmentNames[i];
      console.log(`正在请求片段 ${i + 1}/${segmentNames.length}: ${segmentName}`);
      try {
        const response = await fetch(baseUrl + segmentName);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (data.barrage_list && Array.isArray(data.barrage_list)) {
          allBarrages.push(...data.barrage_list);
          console.log(`  成功获取 ${data.barrage_list.length} 条弹幕`);
        } else {
          console.log("  该片段没有弹幕数据");
        }
      } catch (error) {
        console.error(`请求片段 ${segmentName} 失败:`, error);
      }
    }
    const result = { barrage_list: allBarrages };
    console.log(`总共获取到 ${allBarrages.length} 条弹幕`);
    const xmlContent = convertToBilibiliXML(allBarrages);
    const blob = new Blob([xmlContent], {
      type: "application/xml;charset=utf-8"
    });
    saveAs(blob, `${vid}.xml`);
    return result;
  }
  function convertToBilibiliXML(barrageList) {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<i>\n';
    barrageList.forEach((barrage) => {
      const timeOffset = parseInt(barrage.time_offset || "0") / 1e3;
      const time = timeOffset;
      const type = 1;
      const fontSize = 25;
      const color = 16777215;
      const timestamp = barrage.create_time || "0";
      const pool = 0;
      const userID = barrage.vuid || "";
      const rowID = barrage.id || "";
      const text = barrage.content || "";
      const escapedText = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
      const pValue = `${time},${type},${fontSize},${color},${timestamp},${pool},${userID},${rowID}`;
      xml += `<d p="${pValue}">${escapedText}</d>
`;
    });
    xml += "</i>";
    return xml;
  }
  function interceptor() {
    const originalFetch = _unsafeWindow.fetch;
    _unsafeWindow.fetch = async function(input, init) {
      const response = await originalFetch(input, init);
      const payload = init == null ? undefined : init.body;
      const url = typeof input === "string" ? input : input.url;
      get_api_info(url, payload, response);
      return response;
    };
  }
  interceptor();
  createButton();
  function updateButton(button, text, disabled) {
    button.textContent = text;
    button.disabled = disabled;
    button.style.opacity = disabled ? "0.6" : "1";
    button.style.cursor = disabled ? "not-allowed" : "pointer";
  }
  function createButton() {
    const button = document.createElement("button");
    updateButton(button, "下载弹幕", false);
    Object.assign(button.style, {
      position: "fixed",
      left: "10px",
      top: "50%",
      transform: "translateY(-50%)",
      zIndex: "9999",
      padding: "10px 20px",
      backgroundColor: "#fb7299",
      color: "#fff",
      border: "none",
      borderRadius: "5px",
      boxShadow: "0 2px 5px rgba(0, 0, 0, 0.2)",
      fontSize: "14px",
      lineHeight: "1.4"
    });
    button.addEventListener("click", async () => {
      const url = window.location.href;
      const setStatus2 = (text, disabled) => updateButton(button, text, disabled);
      try {
        if (url.includes("bilibili")) {
          await down_bili_danmu(setStatus2);
        } else if (url.includes("v.qq.com")) {
          setStatus2("下载中...", true);
          await down_vqq_danmu();
        }
      } finally {
        setStatus2("下载弹幕", false);
      }
    });
    document.body.appendChild(button);
  }

})(saveAs);