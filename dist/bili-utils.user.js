// ==UserScript==
// @name         bilibili 字幕、bilibili/腾讯视频弹幕下载
// @namespace    https://github.com/LesslsMore/bili-utils
// @version      0.3.0
// @author       lesslsmore
// @description  下载 bilibili 普通/AI 字幕，以及 bilibili、腾讯视频全量弹幕。
// @license      MIT
// @icon         https://i0.hdslb.com/bfs/static/jinkela/long/images/favicon.ico
// @match        *://*.bilibili.com/bangumi/*
// @match        *://*.bilibili.com/video/*
// @match        https://v.qq.com/x/cover/*
// @require      https://cdn.jsdelivr.net/npm/file-saver@2.0.5/dist/FileSaver.min.js
// @connect      *.hdslb.com
// @connect      subtitle.bilibili.com
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// ==/UserScript==

(function (saveAs) {
  'use strict';

  const DM_VIEW_API = "https://api.bilibili.com/x/v2/dm/web/view";
  const DM_SEG_API = "https://api.bilibili.com/x/v2/dm/wbi/web/seg.so";
  const DM_SEG_FALLBACK_API = "https://api.bilibili.com/x/v2/dm/web/seg.so";
  const NAV_API = "https://api.bilibili.com/x/web-interface/nav";
  const VIDEO_VIEW_API = "https://api.bilibili.com/x/web-interface/view";
  const SEGMENT_SECONDS = 360;
  const MIXIN_KEY_ENC_TAB = [
    46,
    47,
    18,
    2,
    53,
    8,
    23,
    32,
    15,
    50,
    10,
    31,
    58,
    3,
    45,
    35,
    27,
    43,
    5,
    49,
    33,
    9,
    42,
    19,
    29,
    28,
    14,
    39,
    12,
    38,
    41,
    13,
    37,
    48,
    7,
    16,
    24,
    55,
    40,
    61,
    26,
    17,
    0,
    1,
    60,
    51,
    30,
    4,
    22,
    25,
    54,
    21,
    56,
    59,
    6,
    63,
    57,
    62,
    11,
    36,
    20,
    34,
    44,
    52
  ];
  let mixinKeyCache = "";
  const setStatus$1 = (onStatus, text, disabled = false) => {
    if (typeof onStatus === "function") {
      onStatus(text, disabled);
    }
  };
  function addUnsigned(x, y) {
    return x + y >>> 0;
  }
  function rotateLeft(value, shift) {
    return value << shift | value >>> 32 - shift;
  }
  function md5Round(func, a, b, c, d, x, shift, ac) {
    return addUnsigned(rotateLeft(addUnsigned(addUnsigned(a, func(b, c, d)), addUnsigned(x, ac)), shift), b);
  }
  function md5(input) {
    const bytes = new TextEncoder().encode(input);
    const wordCount = ((bytes.length + 8 >>> 6) + 1) * 16;
    const words = new Array(wordCount).fill(0);
    for (let i = 0; i < bytes.length; i++) {
      words[i >> 2] |= bytes[i] << i % 4 * 8;
    }
    words[bytes.length >> 2] |= 128 << bytes.length % 4 * 8;
    words[wordCount - 2] = bytes.length * 8 >>> 0;
    words[wordCount - 1] = Math.floor(bytes.length * 8 / 4294967296);
    let a = 1732584193;
    let b = 4023233417;
    let c = 2562383102;
    let d = 271733878;
    const f = (x, y, z) => x & y | ~x & z;
    const g = (x, y, z) => x & z | y & ~z;
    const h = (x, y, z) => x ^ y ^ z;
    const ii = (x, y, z) => y ^ (x | ~z);
    const ff = (...args) => md5Round(f, ...args);
    const gg = (...args) => md5Round(g, ...args);
    const hh = (...args) => md5Round(h, ...args);
    const iRound = (...args) => md5Round(ii, ...args);
    for (let k = 0; k < words.length; k += 16) {
      const aa = a;
      const bb = b;
      const cc = c;
      const dd = d;
      a = ff(a, b, c, d, words[k], 7, 3614090360);
      d = ff(d, a, b, c, words[k + 1], 12, 3905402710);
      c = ff(c, d, a, b, words[k + 2], 17, 606105819);
      b = ff(b, c, d, a, words[k + 3], 22, 3250441966);
      a = ff(a, b, c, d, words[k + 4], 7, 4118548399);
      d = ff(d, a, b, c, words[k + 5], 12, 1200080426);
      c = ff(c, d, a, b, words[k + 6], 17, 2821735955);
      b = ff(b, c, d, a, words[k + 7], 22, 4249261313);
      a = ff(a, b, c, d, words[k + 8], 7, 1770035416);
      d = ff(d, a, b, c, words[k + 9], 12, 2336552879);
      c = ff(c, d, a, b, words[k + 10], 17, 4294925233);
      b = ff(b, c, d, a, words[k + 11], 22, 2304563134);
      a = ff(a, b, c, d, words[k + 12], 7, 1804603682);
      d = ff(d, a, b, c, words[k + 13], 12, 4254626195);
      c = ff(c, d, a, b, words[k + 14], 17, 2792965006);
      b = ff(b, c, d, a, words[k + 15], 22, 1236535329);
      a = gg(a, b, c, d, words[k + 1], 5, 4129170786);
      d = gg(d, a, b, c, words[k + 6], 9, 3225465664);
      c = gg(c, d, a, b, words[k + 11], 14, 643717713);
      b = gg(b, c, d, a, words[k], 20, 3921069994);
      a = gg(a, b, c, d, words[k + 5], 5, 3593408605);
      d = gg(d, a, b, c, words[k + 10], 9, 38016083);
      c = gg(c, d, a, b, words[k + 15], 14, 3634488961);
      b = gg(b, c, d, a, words[k + 4], 20, 3889429448);
      a = gg(a, b, c, d, words[k + 9], 5, 568446438);
      d = gg(d, a, b, c, words[k + 14], 9, 3275163606);
      c = gg(c, d, a, b, words[k + 3], 14, 4107603335);
      b = gg(b, c, d, a, words[k + 8], 20, 1163531501);
      a = gg(a, b, c, d, words[k + 13], 5, 2850285829);
      d = gg(d, a, b, c, words[k + 2], 9, 4243563512);
      c = gg(c, d, a, b, words[k + 7], 14, 1735328473);
      b = gg(b, c, d, a, words[k + 12], 20, 2368359562);
      a = hh(a, b, c, d, words[k + 5], 4, 4294588738);
      d = hh(d, a, b, c, words[k + 8], 11, 2272392833);
      c = hh(c, d, a, b, words[k + 11], 16, 1839030562);
      b = hh(b, c, d, a, words[k + 14], 23, 4259657740);
      a = hh(a, b, c, d, words[k + 1], 4, 2763975236);
      d = hh(d, a, b, c, words[k + 4], 11, 1272893353);
      c = hh(c, d, a, b, words[k + 7], 16, 4139469664);
      b = hh(b, c, d, a, words[k + 10], 23, 3200236656);
      a = hh(a, b, c, d, words[k + 13], 4, 681279174);
      d = hh(d, a, b, c, words[k], 11, 3936430074);
      c = hh(c, d, a, b, words[k + 3], 16, 3572445317);
      b = hh(b, c, d, a, words[k + 6], 23, 76029189);
      a = hh(a, b, c, d, words[k + 9], 4, 3654602809);
      d = hh(d, a, b, c, words[k + 12], 11, 3873151461);
      c = hh(c, d, a, b, words[k + 15], 16, 530742520);
      b = hh(b, c, d, a, words[k + 2], 23, 3299628645);
      a = iRound(a, b, c, d, words[k], 6, 4096336452);
      d = iRound(d, a, b, c, words[k + 7], 10, 1126891415);
      c = iRound(c, d, a, b, words[k + 14], 15, 2878612391);
      b = iRound(b, c, d, a, words[k + 5], 21, 4237533241);
      a = iRound(a, b, c, d, words[k + 12], 6, 1700485571);
      d = iRound(d, a, b, c, words[k + 3], 10, 2399980690);
      c = iRound(c, d, a, b, words[k + 10], 15, 4293915773);
      b = iRound(b, c, d, a, words[k + 1], 21, 2240044497);
      a = iRound(a, b, c, d, words[k + 8], 6, 1873313359);
      d = iRound(d, a, b, c, words[k + 15], 10, 4264355552);
      c = iRound(c, d, a, b, words[k + 6], 15, 2734768916);
      b = iRound(b, c, d, a, words[k + 13], 21, 1309151649);
      a = iRound(a, b, c, d, words[k + 4], 6, 4149444226);
      d = iRound(d, a, b, c, words[k + 11], 10, 3174756917);
      c = iRound(c, d, a, b, words[k + 2], 15, 718787259);
      b = iRound(b, c, d, a, words[k + 9], 21, 3951481745);
      a = addUnsigned(a, aa);
      b = addUnsigned(b, bb);
      c = addUnsigned(c, cc);
      d = addUnsigned(d, dd);
    }
    const wordToHex = (value) => {
      let output = "";
      for (let i = 0; i <= 3; i++) {
        output += `0${(value >>> i * 8 & 255).toString(16)}`.slice(-2);
      }
      return output;
    };
    return `${wordToHex(a)}${wordToHex(b)}${wordToHex(c)}${wordToHex(d)}`;
  }
  async function fetchJson(url) {
    const response = await fetch(url, {
      credentials: "include"
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
  }
  async function getMixinKey() {
    var _a2, _b2, _c, _d, _e;
    if (mixinKeyCache) {
      return mixinKeyCache;
    }
    const json = await fetchJson(NAV_API);
    const wbiImg = (_a2 = json.data) == null ? undefined : _a2.wbi_img;
    const imgKey = ((_c = (_b2 = wbiImg == null ? undefined : wbiImg.img_url) == null ? undefined : _b2.split("/").pop()) == null ? undefined : _c.split(".")[0]) || "";
    const subKey = ((_e = (_d = wbiImg == null ? undefined : wbiImg.sub_url) == null ? undefined : _d.split("/").pop()) == null ? undefined : _e.split(".")[0]) || "";
    const raw = `${imgKey}${subKey}`;
    if (!raw) {
      throw new Error("无法获取 WBI 图片密钥");
    }
    mixinKeyCache = MIXIN_KEY_ENC_TAB.map((index) => raw[index] || "").join("").slice(0, 32);
    return mixinKeyCache;
  }
  async function encodeWbiParams(params) {
    const mixinKey = await getMixinKey();
    const signed = {
      ...params,
      wts: Math.floor(Date.now() / 1e3)
    };
    if (!signed.web_location) {
      signed.web_location = 1550101;
    }
    delete signed.w_rid;
    const search = new URLSearchParams();
    for (const key of Object.keys(signed).sort()) {
      search.append(key, String(signed[key]).replace(/[!'()*]/g, ""));
    }
    signed.w_rid = md5(`${search.toString()}${mixinKey}`);
    return signed;
  }
  function readVarint$1(buf, pos) {
    let result = 0n;
    let shift = 0n;
    while (pos < buf.length) {
      const byte = BigInt(buf[pos++]);
      result |= (byte & 0x7fn) << shift;
      if ((byte & 0x80n) === 0n) {
        return { value: result, pos };
      }
      shift += 7n;
    }
    return { value: result, pos };
  }
  function readBytes(buf, pos) {
    const lenResult = readVarint$1(buf, pos);
    const len = Number(lenResult.value);
    const start = lenResult.pos;
    const end = Math.min(start + len, buf.length);
    return {
      value: buf.slice(start, end),
      pos: end
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
      return readVarint$1(buf, pos).pos;
    }
    if (wireType === 1) {
      return Math.min(pos + 8, buf.length);
    }
    if (wireType === 2) {
      return readBytes(buf, pos).pos;
    }
    if (wireType === 5) {
      return Math.min(pos + 4, buf.length);
    }
    return buf.length;
  }
  function parseDmSegConfig(buf) {
    const data = {
      pageSize: 0,
      total: 0
    };
    let pos = 0;
    while (pos < buf.length) {
      const tagResult = readVarint$1(buf, pos);
      pos = tagResult.pos;
      const tag = Number(tagResult.value);
      const fieldNum = tag >> 3;
      const wireType = tag & 7;
      if (wireType === 0 && (fieldNum === 1 || fieldNum === 2)) {
        const valueResult = readVarint$1(buf, pos);
        if (fieldNum === 1) {
          data.pageSize = Number(valueResult.value);
        } else {
          data.total = Number(valueResult.value);
        }
        pos = valueResult.pos;
      } else {
        pos = skipField(buf, pos, wireType);
      }
    }
    return data;
  }
  function parseDmWebViewReply(arrayBuffer) {
    const buf = new Uint8Array(arrayBuffer);
    const data = {
      total: 0,
      count: 0,
      specialDmUrls: []
    };
    let pos = 0;
    while (pos < buf.length) {
      const tagResult = readVarint$1(buf, pos);
      pos = tagResult.pos;
      const tag = Number(tagResult.value);
      const fieldNum = tag >> 3;
      const wireType = tag & 7;
      if (fieldNum === 4 && wireType === 2) {
        const bytesResult = readBytes(buf, pos);
        data.total = parseDmSegConfig(bytesResult.value).total;
        pos = bytesResult.pos;
      } else if (fieldNum === 6 && wireType === 2) {
        const valueResult = readString(buf, pos);
        data.specialDmUrls.push(valueResult.value);
        pos = valueResult.pos;
      } else if (fieldNum === 8 && wireType === 0) {
        const valueResult = readVarint$1(buf, pos);
        data.count = Number(valueResult.value);
        pos = valueResult.pos;
      } else {
        pos = skipField(buf, pos, wireType);
      }
    }
    return data;
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
      weight: -1,
      action: "",
      pool: 0,
      idStr: "",
      attr: -1,
      uid: 0n
    };
    let pos = 0;
    while (pos < buf.length) {
      const tagResult = readVarint$1(buf, pos);
      pos = tagResult.pos;
      const tag = Number(tagResult.value);
      const fieldNum = tag >> 3;
      const wireType = tag & 7;
      if (wireType === 0) {
        const valueResult = readVarint$1(buf, pos);
        pos = valueResult.pos;
        if (fieldNum === 1) elem.id = valueResult.value;
        else if (fieldNum === 2) elem.progress = Number(valueResult.value);
        else if (fieldNum === 3) elem.mode = Number(valueResult.value);
        else if (fieldNum === 4) elem.fontsize = Number(valueResult.value);
        else if (fieldNum === 5) elem.color = Number(valueResult.value);
        else if (fieldNum === 8) elem.ctime = valueResult.value;
        else if (fieldNum === 9) elem.weight = Number(valueResult.value);
        else if (fieldNum === 11) elem.pool = Number(valueResult.value);
        else if (fieldNum === 13) elem.attr = Number(valueResult.value);
        else if (fieldNum === 14) elem.uid = valueResult.value;
      } else if (wireType === 2) {
        if (fieldNum === 6) {
          const valueResult = readString(buf, pos);
          elem.midHash = valueResult.value;
          pos = valueResult.pos;
        } else if (fieldNum === 7) {
          const valueResult = readString(buf, pos);
          elem.content = valueResult.value;
          pos = valueResult.pos;
        } else if (fieldNum === 10) {
          const valueResult = readString(buf, pos);
          elem.action = valueResult.value;
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
    if (buf.length === 2 && buf[0] === 16 && buf[1] === 1) {
      throw new Error("该视频已关闭弹幕");
    }
    while (pos < buf.length) {
      const tagResult = readVarint$1(buf, pos);
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
  async function fetchDmView(cid, aid) {
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
  async function fetchDmSegment(url, params) {
    const response = await fetch(`${url}?${new URLSearchParams(params)}`, {
      credentials: "include"
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return parseDmSegMobileReply(await response.arrayBuffer());
  }
  async function fetchSignedDmSegment(params) {
    try {
      const signedParams = await encodeWbiParams(params);
      return await fetchDmSegment(DM_SEG_API, signedParams);
    } catch (error) {
      console.warn("[弹幕下载] WBI 分片请求失败，回退旧接口", error);
      mixinKeyCache = "";
      return fetchDmSegment(DM_SEG_FALLBACK_API, params);
    }
  }
  async function fetchAllSegments(cid, aid, totalSegments, onStatus) {
    const allElems = [];
    for (let i = 1; i <= totalSegments; i++) {
      setStatus$1(onStatus, `下载中 ${i}/${totalSegments}`, true);
      const params = {
        type: "1",
        oid: String(cid),
        segment_index: String(i)
      };
      if (aid) {
        params.pid = String(aid);
      }
      try {
        const elems = await fetchSignedDmSegment(params);
        allElems.push(...elems);
        console.log(`[弹幕下载] 第 ${i}/${totalSegments} 段获取到 ${elems.length} 条`);
      } catch (error) {
        console.error(`[弹幕下载] 第 ${i} 段失败`, error);
      }
    }
    return allElems;
  }
  async function fetchSpecialDanmakus(urls) {
    const elems = [];
    for (const url of urls) {
      try {
        const response = await fetch(url, {
          credentials: "include"
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        elems.push(...parseDmSegMobileReply(await response.arrayBuffer()).map((elem) => ({
          ...elem,
          mode: elem.mode || 9,
          pool: elem.pool || 2
        })));
      } catch (error) {
        console.warn("[弹幕下载] 特殊弹幕获取失败", url, error);
      }
    }
    return elems;
  }
  function escapeXml(value) {
    return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
  }
  function elemId(elem) {
    if (elem.idStr) {
      return elem.idStr;
    }
    if (elem.id) {
      return elem.id.toString();
    }
    return `${elem.progress}:${elem.mode}:${elem.content}`;
  }
  function dedupeDanmakus(elems) {
    const seen = /* @__PURE__ */ new Set();
    const result = [];
    for (const elem of elems) {
      const key = elemId(elem);
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      result.push(elem);
    }
    return result.sort((a, b) => a.progress - b.progress);
  }
  function elemsToXml(elems, cid) {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<i>\n';
    xml += "<chatserver>chat.bilibili.com</chatserver>\n";
    xml += `<chatid>${escapeXml(cid || 0)}</chatid>
`;
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
  function getCurrentPageNumber() {
    const page = Number(new URL(window.location.href).searchParams.get("p") || "1");
    return Number.isFinite(page) && page > 0 ? page : 1;
  }
  function videoRefLabel(videoRef) {
    return videoRef.type === "aid" ? `av${videoRef.value}` : videoRef.value;
  }
  function parseVideoRef(url) {
    const bvMatch = url.match(/\/video\/(BV[a-zA-Z0-9]+)/);
    if (bvMatch) {
      return {
        type: "bvid",
        value: bvMatch[1]
      };
    }
    const avMatch = url.match(/\/video\/av(\d+)/i);
    if (avMatch) {
      return {
        type: "aid",
        value: avMatch[1]
      };
    }
    return null;
  }
  function infoFromInitialVideoState(videoRef) {
    var _a2, _b2;
    const state = window.__INITIAL_STATE__;
    const videoData = state == null ? undefined : state.videoData;
    if (!videoData) {
      return null;
    }
    const pageNumber = getCurrentPageNumber();
    const page = ((_a2 = videoData.pages) == null ? undefined : _a2[pageNumber - 1]) || ((_b2 = videoData.pages) == null ? undefined : _b2.find((item) => item.cid === videoData.cid));
    return {
      cid: (page == null ? undefined : page.cid) || videoData.cid,
      aid: videoData.aid,
      title: videoData.title || videoRefLabel(videoRef),
      longTitle: (page == null ? undefined : page.part) || "",
      duration: (page == null ? undefined : page.duration) || videoData.duration || 0
    };
  }
  async function fetchVideoData(videoRef) {
    var _a2, _b2;
    const localInfo = infoFromInitialVideoState(videoRef);
    if ((localInfo == null ? undefined : localInfo.cid) && (localInfo == null ? undefined : localInfo.aid)) {
      return localInfo;
    }
    const params = new URLSearchParams();
    params.set(videoRef.type, videoRef.value);
    const json = await fetchJson(`${VIDEO_VIEW_API}?${params}`);
    if (json.code !== 0 || !json.data) {
      throw new Error(json.message || "无法获取视频信息");
    }
    const pageNumber = getCurrentPageNumber();
    const page = ((_a2 = json.data.pages) == null ? undefined : _a2[pageNumber - 1]) || ((_b2 = json.data.pages) == null ? undefined : _b2[0]) || {};
    return {
      cid: page.cid || json.data.cid,
      aid: json.data.aid,
      title: json.data.title || videoRefLabel(videoRef),
      longTitle: page.part || "",
      duration: page.duration || json.data.duration || 0
    };
  }
  async function getText(url) {
    const response = await fetch(url, {
      credentials: "include"
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.text();
  }
  function firstJsonScript(html, pattern) {
    const match = html.match(pattern);
    return match ? JSON.parse(match[1]) : null;
  }
  async function fetchInfo(ep) {
    var _a2, _b2, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o;
    const html = await getText(`https://www.bilibili.com/bangumi/play/${ep}/`);
    try {
      const json = firstJsonScript(html, /const playurlSSRData = (\{.*?\})\s*<\/script>/s) || firstJsonScript(html, /const playurlSSRData = (\{.*?\})\s*;/s);
      const epInfo = (_c = (_b2 = (_a2 = json == null ? void 0 : json.data) == null ? void 0 : _a2.result) == null ? void 0 : _b2.play_view_business_info) == null ? void 0 : _c.episode_info;
      const ogvInfo = (_f = (_e = (_d = json == null ? void 0 : json.data) == null ? void 0 : _d.result) == null ? void 0 : _e.supplement) == null ? void 0 : _f.ogv_episode_info;
      if ((epInfo == null ? void 0 : epInfo.cid) && (epInfo == null ? void 0 : epInfo.aid)) {
        return {
          cid: epInfo.cid,
          aid: epInfo.aid,
          title: (ogvInfo == null ? void 0 : ogvInfo.index_title) || epInfo.index_title || ep,
          longTitle: (ogvInfo == null ? void 0 : ogvInfo.long_title) || epInfo.long_title || "",
          duration: Number(epInfo.duration || (ogvInfo == null ? void 0 : ogvInfo.duration) || 0)
        };
      }
    } catch (error) {
      console.warn("[弹幕下载] playurlSSRData 解析失败，尝试 __NEXT_DATA__", error);
    }
    try {
      const json = firstJsonScript(html, /<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);
      const queries = ((_i = (_h = (_g = json == null ? void 0 : json.props) == null ? void 0 : _g.pageProps) == null ? void 0 : _h.dehydratedState) == null ? void 0 : _i.queries) || [];
      const seasonData = (_k = (_j = queries.find((query) => {
        var _a3, _b3;
        return (_b3 = (_a3 = query.state) == null ? void 0 : _a3.data) == null ? void 0 : _b3.seasonInfo;
      })) == null ? void 0 : _j.state) == null ? void 0 : _k.data;
      const playData = (_m = (_l = queries.find((query) => {
        var _a3, _b3;
        return (_b3 = (_a3 = query.state) == null ? void 0 : _a3.data) == null ? void 0 : _b3.playInfo;
      })) == null ? void 0 : _l.state) == null ? void 0 : _m.data;
      const episodes = ((_o = (_n = seasonData == null ? void 0 : seasonData.seasonInfo) == null ? void 0 : _n.mediaInfo) == null ? void 0 : _o.episodes) || [];
      const epId = ep.startsWith("ep") ? ep.replace("ep", "") : "";
      const epData = episodes.find((item) => String(item.id) === epId) || episodes[0] || {};
      const playInfo = (playData == null ? void 0 : playData.playInfo) || (seasonData == null ? void 0 : seasonData.playInfo) || {};
      if ((playInfo.cid || epData.cid) && (playInfo.aid || epData.aid)) {
        return {
          cid: playInfo.cid || epData.cid,
          aid: playInfo.aid || epData.aid,
          title: epData.share_copy || epData.index_title || ep,
          longTitle: epData.long_title || "",
          duration: Number(playInfo.duration || epData.duration || 0)
        };
      }
    } catch (error) {
      console.warn("[弹幕下载] __NEXT_DATA__ 解析失败", error);
    }
    throw new Error("无法解析番剧页面信息");
  }
  function estimateTotalSegments(info) {
    var _a2, _b2, _c, _d;
    const duration = Number((info == null ? undefined : info.duration) || ((_b2 = (_a2 = window.__INITIAL_STATE__) == null ? undefined : _a2.videoData) == null ? undefined : _b2.duration) || ((_d = (_c = window.__INITIAL_STATE__) == null ? undefined : _c.mediaInfo) == null ? undefined : _d.duration) || 0);
    return duration ? Math.max(1, Math.floor(duration / SEGMENT_SECONDS) + 1) : 1;
  }
  function safeFileName(name) {
    return (name || "danmaku").replace(/[\\/:*?"<>|]/g, "_");
  }
  async function getCurrentBiliVideoInfo() {
    const url = window.location.href;
    const epMatch = url.match(/\/bangumi\/play\/(ep\d+|ss\d+)/);
    const videoRef = parseVideoRef(url);
    if (epMatch) {
      return fetchInfo(epMatch[1]);
    }
    if (videoRef) {
      return fetchVideoData(videoRef);
    }
    throw new Error("无法识别当前 B 站视频页面");
  }
  async function down_bili_danmu(onStatus) {
    let info;
    try {
      setStatus$1(onStatus, "获取视频信息...", true);
      info = await getCurrentBiliVideoInfo();
    } catch (error) {
      alert(`获取视频信息失败: ${error.message}`);
      return;
    }
    const title = info.longTitle ? `${info.title} - ${info.longTitle}` : info.title;
    console.log(`[弹幕下载] cid=${info.cid} aid=${info.aid} title=${title}`);
    let dmView = {
      total: 0,
      specialDmUrls: []
    };
    let totalSegments = estimateTotalSegments(info);
    try {
      setStatus$1(onStatus, "获取分段数...", true);
      dmView = await fetchDmView(info.cid, info.aid);
      if (dmView.total > 0) {
        totalSegments = dmView.total;
      }
      console.log(`[弹幕下载] 分段总数: ${totalSegments}`);
    } catch (error) {
      console.warn(`[弹幕下载] 获取分段数失败，使用估算分段数 ${totalSegments}`, error);
    }
    const normalElems = await fetchAllSegments(info.cid, info.aid, totalSegments, onStatus);
    const specialElems = await fetchSpecialDanmakus(dmView.specialDmUrls || []);
    const elems = dedupeDanmakus([...normalElems, ...specialElems]);
    console.log(`[弹幕下载] 共获取到 ${elems.length} 条弹幕`);
    if (elems.length === 0) {
      alert("未获取到任何弹幕，可能视频暂无弹幕、弹幕已关闭或接口受限");
      return;
    }
    const blob = new Blob([elemsToXml(elems, info.cid)], {
      type: "application/xml;charset=utf-8"
    });
    saveAs(blob, `${safeFileName(title)}.xml`);
    setStatus$1(onStatus, "下载弹幕", false);
  }
  var u8 = Uint8Array, u16 = Uint16Array, i32 = Int32Array;
  var fleb = new u8([
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    1,
    1,
    1,
    1,
    2,
    2,
    2,
    2,
    3,
    3,
    3,
    3,
    4,
    4,
    4,
    4,
    5,
    5,
    5,
    5,
    0,
    /* unused */
    0,
    0,
    /* impossible */
    0
  ]);
  var fdeb = new u8([
    0,
    0,
    0,
    0,
    1,
    1,
    2,
    2,
    3,
    3,
    4,
    4,
    5,
    5,
    6,
    6,
    7,
    7,
    8,
    8,
    9,
    9,
    10,
    10,
    11,
    11,
    12,
    12,
    13,
    13,
    /* unused */
    0,
    0
  ]);
  var clim = new u8([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]);
  var freb = function(eb, start) {
    var b = new u16(31);
    for (var i = 0; i < 31; ++i) {
      b[i] = start += 1 << eb[i - 1];
    }
    var r = new i32(b[30]);
    for (var i = 1; i < 30; ++i) {
      for (var j = b[i]; j < b[i + 1]; ++j) {
        r[j] = j - b[i] << 5 | i;
      }
    }
    return { b, r };
  };
  var _a = freb(fleb, 2), fl = _a.b, revfl = _a.r;
  fl[28] = 258, revfl[258] = 28;
  var _b = freb(fdeb, 0), revfd = _b.r;
  var rev = new u16(32768);
  for (var i = 0; i < 32768; ++i) {
    var x = (i & 43690) >> 1 | (i & 21845) << 1;
    x = (x & 52428) >> 2 | (x & 13107) << 2;
    x = (x & 61680) >> 4 | (x & 3855) << 4;
    rev[i] = ((x & 65280) >> 8 | (x & 255) << 8) >> 1;
  }
  var hMap = function(cd, mb, r) {
    var s = cd.length;
    var i = 0;
    var l = new u16(mb);
    for (; i < s; ++i) {
      if (cd[i])
        ++l[cd[i] - 1];
    }
    var le = new u16(mb);
    for (i = 1; i < mb; ++i) {
      le[i] = le[i - 1] + l[i - 1] << 1;
    }
    var co;
    {
      co = new u16(s);
      for (i = 0; i < s; ++i) {
        if (cd[i]) {
          co[i] = rev[le[cd[i] - 1]++] >> 15 - cd[i];
        }
      }
    }
    return co;
  };
  var flt = new u8(288);
  for (var i = 0; i < 144; ++i)
    flt[i] = 8;
  for (var i = 144; i < 256; ++i)
    flt[i] = 9;
  for (var i = 256; i < 280; ++i)
    flt[i] = 7;
  for (var i = 280; i < 288; ++i)
    flt[i] = 8;
  var fdt = new u8(32);
  for (var i = 0; i < 32; ++i)
    fdt[i] = 5;
  var flm = /* @__PURE__ */ hMap(flt, 9);
  var fdm = /* @__PURE__ */ hMap(fdt, 5);
  var shft = function(p) {
    return (p + 7) / 8 | 0;
  };
  var slc = function(v, s, e) {
    if (e == null || e > v.length)
      e = v.length;
    return new u8(v.subarray(s, e));
  };
  var ec = [
    "unexpected EOF",
    "invalid block type",
    "invalid length/literal",
    "invalid distance",
    "stream finished",
    "no stream handler",
    ,
    // determined by compression function
    "no callback",
    "invalid UTF-8 data",
    "extra field too long",
    "date not in range 1980-2099",
    "filename too long",
    "stream finishing",
    "invalid zip data"
    // determined by unknown compression method
  ];
  var err = function(ind, msg, nt) {
    var e = new Error(msg || ec[ind]);
    e.code = ind;
    if (Error.captureStackTrace)
      Error.captureStackTrace(e, err);
    if (!nt)
      throw e;
    return e;
  };
  var wbits = function(d, p, v) {
    v <<= p & 7;
    var o = p / 8 | 0;
    d[o] |= v;
    d[o + 1] |= v >> 8;
  };
  var wbits16 = function(d, p, v) {
    v <<= p & 7;
    var o = p / 8 | 0;
    d[o] |= v;
    d[o + 1] |= v >> 8;
    d[o + 2] |= v >> 16;
  };
  var hTree = function(d, mb) {
    var t = [];
    for (var i = 0; i < d.length; ++i) {
      if (d[i])
        t.push({ s: i, f: d[i] });
    }
    var s = t.length;
    var t2 = t.slice();
    if (!s)
      return { t: et, l: 0 };
    if (s == 1) {
      var v = new u8(t[0].s + 1);
      v[t[0].s] = 1;
      return { t: v, l: 1 };
    }
    t.sort(function(a, b) {
      return a.f - b.f;
    });
    t.push({ s: -1, f: 25001 });
    var l = t[0], r = t[1], i0 = 0, i1 = 1, i2 = 2;
    t[0] = { s: -1, f: l.f + r.f, l, r };
    while (i1 != s - 1) {
      l = t[t[i0].f < t[i2].f ? i0++ : i2++];
      r = t[i0 != i1 && t[i0].f < t[i2].f ? i0++ : i2++];
      t[i1++] = { s: -1, f: l.f + r.f, l, r };
    }
    var maxSym = t2[0].s;
    for (var i = 1; i < s; ++i) {
      if (t2[i].s > maxSym)
        maxSym = t2[i].s;
    }
    var tr = new u16(maxSym + 1);
    var mbt = ln(t[i1 - 1], tr, 0);
    if (mbt > mb) {
      var i = 0, dt = 0;
      var lft = mbt - mb, cst = 1 << lft;
      t2.sort(function(a, b) {
        return tr[b.s] - tr[a.s] || a.f - b.f;
      });
      for (; i < s; ++i) {
        var i2_1 = t2[i].s;
        if (tr[i2_1] > mb) {
          dt += cst - (1 << mbt - tr[i2_1]);
          tr[i2_1] = mb;
        } else
          break;
      }
      dt >>= lft;
      while (dt > 0) {
        var i2_2 = t2[i].s;
        if (tr[i2_2] < mb)
          dt -= 1 << mb - tr[i2_2]++ - 1;
        else
          ++i;
      }
      for (; i >= 0 && dt; --i) {
        var i2_3 = t2[i].s;
        if (tr[i2_3] == mb) {
          --tr[i2_3];
          ++dt;
        }
      }
      mbt = mb;
    }
    return { t: new u8(tr), l: mbt };
  };
  var ln = function(n, l, d) {
    return n.s == -1 ? Math.max(ln(n.l, l, d + 1), ln(n.r, l, d + 1)) : l[n.s] = d;
  };
  var lc = function(c) {
    var s = c.length;
    while (s && !c[--s])
      ;
    var cl = new u16(++s);
    var cli = 0, cln = c[0], cls = 1;
    var w = function(v) {
      cl[cli++] = v;
    };
    for (var i = 1; i <= s; ++i) {
      if (c[i] == cln && i != s)
        ++cls;
      else {
        if (!cln && cls > 2) {
          for (; cls > 138; cls -= 138)
            w(32754);
          if (cls > 2) {
            w(cls > 10 ? cls - 11 << 5 | 28690 : cls - 3 << 5 | 12305);
            cls = 0;
          }
        } else if (cls > 3) {
          w(cln), --cls;
          for (; cls > 6; cls -= 6)
            w(8304);
          if (cls > 2)
            w(cls - 3 << 5 | 8208), cls = 0;
        }
        while (cls--)
          w(cln);
        cls = 1;
        cln = c[i];
      }
    }
    return { c: cl.subarray(0, cli), n: s };
  };
  var clen = function(cf, cl) {
    var l = 0;
    for (var i = 0; i < cl.length; ++i)
      l += cf[i] * cl[i];
    return l;
  };
  var wfblk = function(out, pos, dat) {
    var s = dat.length;
    var o = shft(pos + 2);
    out[o] = s & 255;
    out[o + 1] = s >> 8;
    out[o + 2] = out[o] ^ 255;
    out[o + 3] = out[o + 1] ^ 255;
    for (var i = 0; i < s; ++i)
      out[o + i + 4] = dat[i];
    return (o + 4 + s) * 8;
  };
  var wblk = function(dat, out, final, syms, lf, df, eb, li, bs, bl, p) {
    wbits(out, p++, final);
    ++lf[256];
    var _a2 = hTree(lf, 15), dlt = _a2.t, mlb = _a2.l;
    var _b2 = hTree(df, 15), ddt = _b2.t, mdb = _b2.l;
    var _c = lc(dlt), lclt = _c.c, nlc = _c.n;
    var _d = lc(ddt), lcdt = _d.c, ndc = _d.n;
    var lcfreq = new u16(19);
    for (var i = 0; i < lclt.length; ++i)
      ++lcfreq[lclt[i] & 31];
    for (var i = 0; i < lcdt.length; ++i)
      ++lcfreq[lcdt[i] & 31];
    var _e = hTree(lcfreq, 7), lct = _e.t, mlcb = _e.l;
    var nlcc = 19;
    for (; nlcc > 4 && !lct[clim[nlcc - 1]]; --nlcc)
      ;
    var flen = bl + 5 << 3;
    var ftlen = clen(lf, flt) + clen(df, fdt) + eb;
    var dtlen = clen(lf, dlt) + clen(df, ddt) + eb + 14 + 3 * nlcc + clen(lcfreq, lct) + 2 * lcfreq[16] + 3 * lcfreq[17] + 7 * lcfreq[18];
    if (bs >= 0 && flen <= ftlen && flen <= dtlen)
      return wfblk(out, p, dat.subarray(bs, bs + bl));
    var lm, ll, dm, dl;
    wbits(out, p, 1 + (dtlen < ftlen)), p += 2;
    if (dtlen < ftlen) {
      lm = hMap(dlt, mlb), ll = dlt, dm = hMap(ddt, mdb), dl = ddt;
      var llm = hMap(lct, mlcb);
      wbits(out, p, nlc - 257);
      wbits(out, p + 5, ndc - 1);
      wbits(out, p + 10, nlcc - 4);
      p += 14;
      for (var i = 0; i < nlcc; ++i)
        wbits(out, p + 3 * i, lct[clim[i]]);
      p += 3 * nlcc;
      var lcts = [lclt, lcdt];
      for (var it = 0; it < 2; ++it) {
        var clct = lcts[it];
        for (var i = 0; i < clct.length; ++i) {
          var len = clct[i] & 31;
          wbits(out, p, llm[len]), p += lct[len];
          if (len > 15)
            wbits(out, p, clct[i] >> 5 & 127), p += clct[i] >> 12;
        }
      }
    } else {
      lm = flm, ll = flt, dm = fdm, dl = fdt;
    }
    for (var i = 0; i < li; ++i) {
      var sym = syms[i];
      if (sym > 255) {
        var len = sym >> 18 & 31;
        wbits16(out, p, lm[len + 257]), p += ll[len + 257];
        if (len > 7)
          wbits(out, p, sym >> 23 & 31), p += fleb[len];
        var dst = sym & 31;
        wbits16(out, p, dm[dst]), p += dl[dst];
        if (dst > 3)
          wbits16(out, p, sym >> 5 & 8191), p += fdeb[dst];
      } else {
        wbits16(out, p, lm[sym]), p += ll[sym];
      }
    }
    wbits16(out, p, lm[256]);
    return p + ll[256];
  };
  var deo = /* @__PURE__ */ new i32([65540, 131080, 131088, 131104, 262176, 1048704, 1048832, 2114560, 2117632]);
  var et = /* @__PURE__ */ new u8(0);
  var dflt = function(dat, lvl, plvl, pre, post, st) {
    var s = st.z || dat.length;
    var o = new u8(pre + s + 5 * (1 + Math.ceil(s / 7e3)) + post);
    var w = o.subarray(pre, o.length - post);
    var lst = st.l;
    var pos = (st.r || 0) & 7;
    if (lvl) {
      if (pos)
        w[0] = st.r >> 3;
      var opt = deo[lvl - 1];
      var n = opt >> 13, c = opt & 8191;
      var msk_1 = (1 << plvl) - 1;
      var prev = st.p || new u16(32768), head = st.h || new u16(msk_1 + 1);
      var bs1_1 = Math.ceil(plvl / 3), bs2_1 = 2 * bs1_1;
      var hsh = function(i2) {
        return (dat[i2] ^ dat[i2 + 1] << bs1_1 ^ dat[i2 + 2] << bs2_1) & msk_1;
      };
      var syms = new i32(25e3);
      var lf = new u16(288), df = new u16(32);
      var lc_1 = 0, eb = 0, i = st.i || 0, li = 0, wi = st.w || 0, bs = 0;
      for (; i + 2 < s; ++i) {
        var hv = hsh(i);
        var imod = i & 32767, pimod = head[hv];
        prev[imod] = pimod;
        head[hv] = imod;
        if (wi <= i) {
          var rem = s - i;
          if ((lc_1 > 7e3 || li > 24576) && (rem > 423 || !lst)) {
            pos = wblk(dat, w, 0, syms, lf, df, eb, li, bs, i - bs, pos);
            li = lc_1 = eb = 0, bs = i;
            for (var j = 0; j < 286; ++j)
              lf[j] = 0;
            for (var j = 0; j < 30; ++j)
              df[j] = 0;
          }
          var l = 2, d = 0, ch_1 = c, dif = imod - pimod & 32767;
          if (rem > 2 && hv == hsh(i - dif)) {
            var maxn = Math.min(n, rem) - 1;
            var maxd = Math.min(32767, i);
            var ml = Math.min(258, rem);
            while (dif <= maxd && --ch_1 && imod != pimod) {
              if (dat[i + l] == dat[i + l - dif]) {
                var nl = 0;
                for (; nl < ml && dat[i + nl] == dat[i + nl - dif]; ++nl)
                  ;
                if (nl > l) {
                  l = nl, d = dif;
                  if (nl > maxn)
                    break;
                  var mmd = Math.min(dif, nl - 2);
                  var md = 0;
                  for (var j = 0; j < mmd; ++j) {
                    var ti = i - dif + j & 32767;
                    var pti = prev[ti];
                    var cd = ti - pti & 32767;
                    if (cd > md)
                      md = cd, pimod = ti;
                  }
                }
              }
              imod = pimod, pimod = prev[imod];
              dif += imod - pimod & 32767;
            }
          }
          if (d) {
            syms[li++] = 268435456 | revfl[l] << 18 | revfd[d];
            var lin = revfl[l] & 31, din = revfd[d] & 31;
            eb += fleb[lin] + fdeb[din];
            ++lf[257 + lin];
            ++df[din];
            wi = i + l;
            ++lc_1;
          } else {
            syms[li++] = dat[i];
            ++lf[dat[i]];
          }
        }
      }
      for (i = Math.max(i, wi); i < s; ++i) {
        syms[li++] = dat[i];
        ++lf[dat[i]];
      }
      pos = wblk(dat, w, lst, syms, lf, df, eb, li, bs, i - bs, pos);
      if (!lst) {
        st.r = pos & 7 | w[pos / 8 | 0] << 3;
        pos -= 7;
        st.h = head, st.p = prev, st.i = i, st.w = wi;
      }
    } else {
      for (var i = st.w || 0; i < s + lst; i += 65535) {
        var e = i + 65535;
        if (e >= s) {
          w[pos / 8 | 0] = lst;
          e = s;
        }
        pos = wfblk(w, pos + 1, dat.subarray(i, e));
      }
      st.i = s;
    }
    return slc(o, 0, pre + shft(pos) + post);
  };
  var crct = /* @__PURE__ */ function() {
    var t = new Int32Array(256);
    for (var i = 0; i < 256; ++i) {
      var c = i, k = 9;
      while (--k)
        c = (c & 1 && -306674912) ^ c >>> 1;
      t[i] = c;
    }
    return t;
  }();
  var crc = function() {
    var c = -1;
    return {
      p: function(d) {
        var cr = c;
        for (var i = 0; i < d.length; ++i)
          cr = crct[cr & 255 ^ d[i]] ^ cr >>> 8;
        c = cr;
      },
      d: function() {
        return ~c;
      }
    };
  };
  var dopt = function(dat, opt, pre, post, st) {
    if (!st) {
      st = { l: 1 };
      if (opt.dictionary) {
        var dict = opt.dictionary.subarray(-32768);
        var newDat = new u8(dict.length + dat.length);
        newDat.set(dict);
        newDat.set(dat, dict.length);
        dat = newDat;
        st.w = dict.length;
      }
    }
    return dflt(dat, opt.level == null ? 6 : opt.level, opt.mem == null ? st.l ? Math.ceil(Math.max(8, Math.min(13, Math.log(dat.length))) * 1.5) : 20 : 12 + opt.mem, pre, post, st);
  };
  var mrg = function(a, b) {
    var o = {};
    for (var k in a)
      o[k] = a[k];
    for (var k in b)
      o[k] = b[k];
    return o;
  };
  var wbytes = function(d, b, v) {
    for (; v; ++b)
      d[b] = v, v >>>= 8;
  };
  function deflateSync(data, opts) {
    return dopt(data, opts || {}, 0, 0);
  }
  var fltn = function(d, p, t, o) {
    for (var k in d) {
      var val = d[k], n = p + k, op = o;
      if (Array.isArray(val))
        op = mrg(o, val[1]), val = val[0];
      if (ArrayBuffer.isView(val))
        t[n] = [val, op];
      else {
        t[n += "/"] = [new u8(0), op];
        fltn(val, n, t, o);
      }
    }
  };
  var te = typeof TextEncoder != "undefined" && /* @__PURE__ */ new TextEncoder();
  var td = typeof TextDecoder != "undefined" && /* @__PURE__ */ new TextDecoder();
  var tds = 0;
  try {
    td.decode(et, { stream: true });
    tds = 1;
  } catch (e) {
  }
  function strToU8(str, latin1) {
    var i;
    if (te)
      return te.encode(str);
    var l = str.length;
    var ar = new u8(str.length + (str.length >> 1));
    var ai = 0;
    var w = function(v) {
      ar[ai++] = v;
    };
    for (var i = 0; i < l; ++i) {
      if (ai + 5 > ar.length) {
        var n = new u8(ai + 8 + (l - i << 1));
        n.set(ar);
        ar = n;
      }
      var c = str.charCodeAt(i);
      if (c < 128 || latin1)
        w(c);
      else if (c < 2048)
        w(192 | c >> 6), w(128 | c & 63);
      else if (c > 55295 && c < 57344)
        c = 65536 + (c & 1023 << 10) | str.charCodeAt(++i) & 1023, w(240 | c >> 18), w(128 | c >> 12 & 63), w(128 | c >> 6 & 63), w(128 | c & 63);
      else
        w(224 | c >> 12), w(128 | c >> 6 & 63), w(128 | c & 63);
    }
    return slc(ar, 0, ai);
  }
  var exfl = function(ex) {
    var le = 0;
    if (ex) {
      for (var k in ex) {
        var l = ex[k].length;
        if (l > 65535)
          err(9);
        le += l + 4;
      }
    }
    return le;
  };
  var wzh = function(d, b, f, fn, u, c, ce, co) {
    var fl2 = fn.length, ex = f.extra, col = co && co.length;
    var exl = exfl(ex);
    wbytes(d, b, ce != null ? 33639248 : 67324752), b += 4;
    if (ce != null)
      d[b++] = 20, d[b++] = f.os;
    d[b] = 20, b += 2;
    d[b++] = f.flag << 1 | (c < 0 && 8), d[b++] = u && 8;
    d[b++] = f.compression & 255, d[b++] = f.compression >> 8;
    var dt = new Date(f.mtime == null ? Date.now() : f.mtime), y = dt.getFullYear() - 1980;
    if (y < 0 || y > 119)
      err(10);
    wbytes(d, b, y << 25 | dt.getMonth() + 1 << 21 | dt.getDate() << 16 | dt.getHours() << 11 | dt.getMinutes() << 5 | dt.getSeconds() >> 1), b += 4;
    if (c != -1) {
      wbytes(d, b, f.crc);
      wbytes(d, b + 4, c < 0 ? -c - 2 : c);
      wbytes(d, b + 8, f.size);
    }
    wbytes(d, b + 12, fl2);
    wbytes(d, b + 14, exl), b += 16;
    if (ce != null) {
      wbytes(d, b, col);
      wbytes(d, b + 6, f.attrs);
      wbytes(d, b + 10, ce), b += 14;
    }
    d.set(fn, b);
    b += fl2;
    if (exl) {
      for (var k in ex) {
        var exf = ex[k], l = exf.length;
        wbytes(d, b, +k);
        wbytes(d, b + 2, l);
        d.set(exf, b + 4), b += 4 + l;
      }
    }
    if (col)
      d.set(co, b), b += col;
    return b;
  };
  var wzf = function(o, b, c, d, e) {
    wbytes(o, b, 101010256);
    wbytes(o, b + 8, c);
    wbytes(o, b + 10, c);
    wbytes(o, b + 12, d);
    wbytes(o, b + 16, e);
  };
  function zipSync(data, opts) {
    if (!opts)
      opts = {};
    var r = {};
    var files = [];
    fltn(data, "", r, opts);
    var o = 0;
    var tot = 0;
    for (var fn in r) {
      var _a2 = r[fn], file = _a2[0], p = _a2[1];
      var compression = p.level == 0 ? 0 : 8;
      var f = strToU8(fn), s = f.length;
      var com = p.comment, m = com && strToU8(com), ms = m && m.length;
      var exl = exfl(p.extra);
      if (s > 65535)
        err(11);
      var d = compression ? deflateSync(file, p) : file, l = d.length;
      var c = crc();
      c.p(file);
      files.push(mrg(p, {
        size: file.length,
        crc: c.d(),
        c: d,
        f,
        m,
        u: s != fn.length || m && com.length != ms,
        o,
        compression
      }));
      o += 30 + s + exl + l;
      tot += 76 + 2 * (s + exl) + (ms || 0) + l;
    }
    var out = new u8(tot + 22), oe = o, cdl = tot - o;
    for (var i = 0; i < files.length; ++i) {
      var f = files[i];
      wzh(out, f.o, f, f.f, f.u, f.c.length);
      var badd = 30 + f.f.length + exfl(f.extra);
      out.set(f.c, f.o + badd);
      wzh(out, o, f, f.f, f.u, f.c.length, f.o, f.m), o += 16 + badd + (f.m ? f.m.length : 0);
    }
    wzf(out, o, files.length, cdl, oe);
    return out;
  }
  var _GM_xmlhttpRequest = /* @__PURE__ */ (() => typeof GM_xmlhttpRequest != "undefined" ? GM_xmlhttpRequest : undefined)();
  var _unsafeWindow = /* @__PURE__ */ (() => typeof unsafeWindow != "undefined" ? unsafeWindow : undefined)();
  const textDecoder = new TextDecoder();
  function toBytes(payload) {
    if (payload instanceof Uint8Array) {
      return payload;
    }
    if (payload instanceof ArrayBuffer) {
      return new Uint8Array(payload);
    }
    if (ArrayBuffer.isView(payload)) {
      return new Uint8Array(payload.buffer, payload.byteOffset, payload.byteLength);
    }
    throw new TypeError("Protobuf 数据必须是 ArrayBuffer 或 Uint8Array");
  }
  function readVarint(bytes, start) {
    let value = 0n;
    let shift = 0n;
    let position = start;
    while (position < bytes.length && shift < 70n) {
      const byte = BigInt(bytes[position++]);
      value |= (byte & 0x7fn) << shift;
      if ((byte & 0x80n) === 0n) {
        return { value, position };
      }
      shift += 7n;
    }
    throw new Error("无效的 Protobuf varint");
  }
  function decodeMessage(payload) {
    const bytes = toBytes(payload);
    const fields = [];
    let position = 0;
    while (position < bytes.length) {
      const keyResult = readVarint(bytes, position);
      const fieldNumber = Number(keyResult.value >> 3n);
      const wireType = Number(keyResult.value & 0x7n);
      position = keyResult.position;
      if (fieldNumber <= 0) {
        throw new Error("无效的 Protobuf 字段编号");
      }
      if (wireType === 0) {
        const valueResult = readVarint(bytes, position);
        fields.push({ number: fieldNumber, wireType, value: valueResult.value });
        position = valueResult.position;
        continue;
      }
      if (wireType === 1 || wireType === 5) {
        const size = wireType === 1 ? 8 : 4;
        const end = position + size;
        if (end > bytes.length) {
          throw new Error("Protobuf 固定长度字段不完整");
        }
        fields.push({ number: fieldNumber, wireType, data: bytes.slice(position, end) });
        position = end;
        continue;
      }
      if (wireType === 2) {
        const lengthResult = readVarint(bytes, position);
        const length = Number(lengthResult.value);
        if (!Number.isSafeInteger(length)) {
          throw new Error("Protobuf 字段长度超出安全范围");
        }
        const end = lengthResult.position + length;
        if (end > bytes.length) {
          throw new Error("Protobuf 字节字段不完整");
        }
        fields.push({
          number: fieldNumber,
          wireType,
          data: bytes.slice(lengthResult.position, end)
        });
        position = end;
        continue;
      }
      throw new Error(`暂不支持 Protobuf wire type ${wireType}`);
    }
    return fields;
  }
  function firstField(fields, number, wireType) {
    return fields.find((field) => field.number === number && field.wireType === wireType);
  }
  function fieldText(fields, number) {
    const field = firstField(fields, number, 2);
    return (field == null ? undefined : field.data) ? textDecoder.decode(field.data) : "";
  }
  function fieldVarint(fields, number) {
    var _a2;
    return (_a2 = firstField(fields, number, 0)) == null ? undefined : _a2.value;
  }
  function parseWebSubtitleReply(payload) {
    var _a2;
    const topFields = decodeMessage(payload);
    const data = (_a2 = firstField(topFields, 1, 2)) == null ? undefined : _a2.data;
    if (!data) {
      return [];
    }
    return decodeMessage(data).filter((field) => field.number === 3 && field.wireType === 2 && field.data).map((field) => {
      const fields = decodeMessage(field.data);
      const id = fieldVarint(fields, 1);
      const idStr = fieldText(fields, 2) || (id == null ? undefined : id.toString()) || "";
      return {
        id: (id == null ? undefined : id.toString()) || "",
        id_str: idStr,
        lan: fieldText(fields, 3),
        lan_doc: fieldText(fields, 4),
        subtitle_url: fieldText(fields, 5)
      };
    }).filter((track) => track.lan && track.subtitle_url);
  }
  function isAiSubtitle(track) {
    const language = String((track == null ? undefined : track.lan) || "").toLowerCase();
    const languageName = String((track == null ? undefined : track.lan_doc) || "");
    const subtitleUrl = String((track == null ? undefined : track.subtitle_url) || "").toLowerCase();
    const aiStatus = Number((track == null ? undefined : track.ai_status) || 0);
    const aiType = Number((track == null ? undefined : track.ai_type) || 0);
    return language.startsWith("ai-") || aiStatus !== 0 || aiType !== 0 || /(?:^|\W)ai(?:\W|$)|自动生成/i.test(languageName) || subtitleUrl.includes("aisubtitle.");
  }
  function trackKey(track) {
    const id = track.id_str || track.id;
    if (id !== undefined && id !== null && String(id)) {
      return `id:${id}`;
    }
    return `language:${track.lan || ""}:${track.lan_doc || ""}`;
  }
  function subtitleUrls(track) {
    return [...new Set([
      track == null ? undefined : track.subtitle_url,
      ...Array.isArray(track == null ? undefined : track.subtitle_urls) ? track.subtitle_urls : []
    ].map((url) => String(url || "").trim()).filter(Boolean))];
  }
  function mergeSubtitleTracks(...trackLists) {
    const tracks = /* @__PURE__ */ new Map();
    for (const list of trackLists) {
      for (const track of Array.isArray(list) ? list : []) {
        if (!track || !track.lan) {
          continue;
        }
        const key = trackKey(track);
        const previous = tracks.get(key) || {};
        const urls = [.../* @__PURE__ */ new Set([
          ...subtitleUrls(previous),
          ...subtitleUrls(track)
        ])];
        tracks.set(key, {
          ...previous,
          ...track,
          id_str: track.id_str || previous.id_str || "",
          lan_doc: track.lan_doc || previous.lan_doc || track.lan,
          subtitle_url: previous.subtitle_url || track.subtitle_url || urls[0] || "",
          subtitle_urls: urls
        });
      }
    }
    return [...tracks.values()].filter((track) => track.subtitle_urls.length > 0).sort((a, b) => {
      const typeOrder = Number(isAiSubtitle(a)) - Number(isAiSubtitle(b));
      return typeOrder || String(a.lan).localeCompare(String(b.lan));
    });
  }
  function srtTimestamp(seconds) {
    const milliseconds = Math.max(0, Math.round(Number(seconds || 0) * 1e3));
    const hours = Math.floor(milliseconds / 36e5);
    const minutes = Math.floor(milliseconds % 36e5 / 6e4);
    const secs = Math.floor(milliseconds % 6e4 / 1e3);
    const millis = milliseconds % 1e3;
    return [
      String(hours).padStart(2, "0"),
      String(minutes).padStart(2, "0"),
      String(secs).padStart(2, "0")
    ].join(":") + `,${String(millis).padStart(3, "0")}`;
  }
  function subtitlesToSrt(items) {
    if (!Array.isArray(items)) {
      throw new TypeError("字幕正文不是数组");
    }
    return items.map((item) => ({
      from: Math.max(0, Number((item == null ? undefined : item.from) || 0)),
      to: Math.max(0, Number((item == null ? undefined : item.to) || (item == null ? undefined : item.from) || 0)),
      content: String((item == null ? undefined : item.content) || "").replace(/\r\n?/g, "\n").trim()
    })).filter((item) => item.content).map((item, index) => {
      const end = Math.max(item.from, item.to);
      return `${index + 1}
${srtTimestamp(item.from)} --> ${srtTimestamp(end)}
${item.content}`;
    }).join("\n\n");
  }
  const PLAYER_SUBTITLE_API = "https://api.bilibili.com/x/player/wbi/v2";
  const WEB_SUBTITLE_API = "https://api.bilibili.com/x/v2/subtitle/web/view";
  const setStatus = (onStatus, text, disabled = false) => {
    if (typeof onStatus === "function") {
      onStatus(text, disabled);
    }
  };
  async function fetchLegacySubtitleTracks(info) {
    var _a2, _b2;
    const params = new URLSearchParams({
      aid: String(info.aid),
      cid: String(info.cid)
    });
    const response = await fetch(`${PLAYER_SUBTITLE_API}?${params}`, {
      credentials: "include"
    });
    if (!response.ok) {
      throw new Error(`旧字幕接口 HTTP ${response.status}`);
    }
    const json = await response.json();
    if (json.code !== 0) {
      throw new Error(json.message || `旧字幕接口错误 ${json.code}`);
    }
    return ((_b2 = (_a2 = json.data) == null ? undefined : _a2.subtitle) == null ? undefined : _b2.subtitles) || [];
  }
  async function fetchWebSubtitleTracks(info) {
    const params = new URLSearchParams({
      oid: String(info.cid),
      pid: String(info.aid),
      context_ext: JSON.stringify({ video_type: 1 }),
      type: "1",
      cur_production_type: "0",
      preferred_language: "ai-zh",
      playlist_switch: "0"
    });
    const response = await fetch(`${WEB_SUBTITLE_API}?${params}`, {
      credentials: "include",
      headers: {
        Accept: "application/octet-stream"
      }
    });
    if (!response.ok) {
      throw new Error(`新字幕接口 HTTP ${response.status}`);
    }
    const payload = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("json")) {
      const json = JSON.parse(new TextDecoder().decode(payload));
      throw new Error(json.message || `新字幕接口错误 ${json.code || "unknown"}`);
    }
    return parseWebSubtitleReply(payload);
  }
  async function fetchAllSubtitleTracks(info) {
    const results = await Promise.allSettled([
      fetchLegacySubtitleTracks(info),
      fetchWebSubtitleTracks(info)
    ]);
    const trackLists = [];
    for (const result of results) {
      if (result.status === "fulfilled") {
        trackLists.push(result.value);
      } else {
        console.warn("[字幕下载] 字幕轨道接口请求失败", result.reason);
      }
    }
    return mergeSubtitleTracks(...trackLists);
  }
  function normalizeSubtitleUrl(value) {
    const url = new URL(String(value || ""), window.location.href);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error(`不支持的字幕地址协议: ${url.protocol}`);
    }
    return url.href;
  }
  async function fetchSubtitleJsonWithPage(url) {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json"
      }
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
  }
  function fetchSubtitleJsonWithUserscript(url) {
    return new Promise((resolve, reject) => {
      _GM_xmlhttpRequest({
        method: "GET",
        url,
        headers: {
          Accept: "application/json"
        },
        responseType: "json",
        anonymous: true,
        timeout: 3e4,
        onload(response) {
          if (response.status < 200 || response.status >= 300) {
            reject(new Error(`HTTP ${response.status}`));
            return;
          }
          try {
            const json = response.response && typeof response.response !== "string" ? response.response : JSON.parse(response.responseText || response.response);
            resolve(json);
          } catch (error) {
            reject(new Error(`JSON 解析失败: ${error.message}`));
          }
        },
        onerror(response) {
          reject(new Error(response.error || response.statusText || "网络请求失败"));
        },
        ontimeout() {
          reject(new Error("请求超时"));
        }
      });
    });
  }
  async function fetchSubtitleJson(url) {
    try {
      return await fetchSubtitleJsonWithPage(url);
    } catch (pageError) {
      try {
        return await fetchSubtitleJsonWithUserscript(url);
      } catch (userscriptError) {
        throw new Error(`页面请求失败: ${pageError.message}; 跨域请求失败: ${userscriptError.message}`);
      }
    }
  }
  async function fetchSubtitleBody(track) {
    const urls = [...new Set([
      track.subtitle_url,
      ...Array.isArray(track.subtitle_urls) ? track.subtitle_urls : []
    ].filter(Boolean))];
    const failures = [];
    for (const value of urls) {
      let url;
      try {
        url = normalizeSubtitleUrl(value);
        const json = await fetchSubtitleJson(url);
        const body = Array.isArray(json) ? json : json.body;
        if (!Array.isArray(body) || body.length === 0) {
          throw new Error("字幕正文为空");
        }
        return body;
      } catch (error) {
        failures.push(`${url ? new URL(url).host : "无效地址"}: ${error.message}`);
      }
    }
    throw new Error(`${track.lan_doc || track.lan} 字幕下载失败 (${failures.join("; ")})`);
  }
  function subtitleFileName(track, index, usedNames) {
    const type = isAiSubtitle(track) ? "AI" : "CC";
    const language = safeFileName(track.lan_doc || track.lan || `轨道-${index + 1}`);
    const baseName = `${String(index + 1).padStart(2, "0")}-${type}-${language}`;
    let fileName = `${baseName}.srt`;
    let suffix = 2;
    while (usedNames.has(fileName)) {
      fileName = `${baseName}-${suffix++}.srt`;
    }
    usedNames.add(fileName);
    return fileName;
  }
  function selectSubtitleTracks(tracks) {
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      const dialog = document.createElement("div");
      const header = document.createElement("div");
      const title = document.createElement("strong");
      const selectionLabel = document.createElement("label");
      const selectAll = document.createElement("input");
      const list = document.createElement("div");
      const footer = document.createElement("div");
      const count = document.createElement("span");
      const cancel = document.createElement("button");
      const download = document.createElement("button");
      overlay.className = "bili-utils-subtitle-dialog-overlay";
      dialog.setAttribute("role", "dialog");
      dialog.setAttribute("aria-modal", "true");
      dialog.setAttribute("aria-labelledby", "bili-utils-subtitle-dialog-title");
      title.id = "bili-utils-subtitle-dialog-title";
      title.textContent = "选择字幕";
      selectAll.type = "checkbox";
      selectionLabel.append(selectAll, document.createTextNode("全选"));
      cancel.type = "button";
      cancel.textContent = "取消";
      download.type = "button";
      Object.assign(overlay.style, {
        position: "fixed",
        inset: "0",
        zIndex: "2147483647",
        display: "grid",
        placeItems: "center",
        padding: "16px",
        background: "rgba(0, 0, 0, 0.48)"
      });
      Object.assign(dialog.style, {
        display: "flex",
        flexDirection: "column",
        width: "min(460px, calc(100vw - 32px))",
        maxHeight: "min(640px, calc(100vh - 32px))",
        overflow: "hidden",
        color: "var(--text1, #18191c)",
        background: "var(--bg1, #fff)",
        border: "1px solid var(--line_regular, #e3e5e7)",
        borderRadius: "8px",
        boxShadow: "0 12px 36px rgba(0, 0, 0, 0.24)"
      });
      Object.assign(header.style, {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "16px",
        padding: "16px 18px"
      });
      Object.assign(title.style, {
        minWidth: "0",
        fontSize: "18px",
        lineHeight: "24px"
      });
      Object.assign(selectionLabel.style, {
        display: "inline-flex",
        alignItems: "center",
        flexShrink: "0",
        gap: "6px",
        fontSize: "13px",
        cursor: "pointer"
      });
      selectAll.style.accentColor = "#fb7299";
      Object.assign(list.style, {
        overflowY: "auto",
        borderTop: "1px solid var(--line_regular, #e3e5e7)",
        borderBottom: "1px solid var(--line_regular, #e3e5e7)"
      });
      Object.assign(footer.style, {
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        flexWrap: "wrap",
        gap: "10px",
        minHeight: "64px",
        padding: "12px 18px"
      });
      Object.assign(count.style, {
        marginRight: "auto",
        color: "var(--text3, #9499a0)",
        fontSize: "13px"
      });
      const checkboxes = tracks.map((track, index) => {
        const row = document.createElement("label");
        const checkbox = document.createElement("input");
        const details = document.createElement("span");
        const name = document.createElement("span");
        const code = document.createElement("span");
        const type = document.createElement("span");
        checkbox.type = "checkbox";
        checkbox.dataset.index = String(index);
        checkbox.style.accentColor = "#fb7299";
        name.textContent = track.lan_doc || track.lan || `轨道 ${index + 1}`;
        code.textContent = track.lan || "";
        type.textContent = isAiSubtitle(track) ? "AI" : "普通";
        Object.assign(row.style, {
          display: "grid",
          gridTemplateColumns: "20px minmax(0, 1fr) auto",
          alignItems: "center",
          gap: "10px",
          minHeight: "56px",
          padding: "8px 18px",
          borderBottom: index === tracks.length - 1 ? "none" : "1px solid var(--line_regular, #e3e5e7)",
          cursor: "pointer"
        });
        Object.assign(details.style, {
          display: "flex",
          flexDirection: "column",
          minWidth: "0",
          gap: "2px"
        });
        Object.assign(name.style, {
          overflowWrap: "anywhere",
          fontSize: "14px",
          lineHeight: "20px"
        });
        Object.assign(code.style, {
          color: "var(--text3, #9499a0)",
          fontSize: "12px",
          lineHeight: "18px"
        });
        Object.assign(type.style, {
          minWidth: "40px",
          padding: "2px 7px",
          color: isAiSubtitle(track) ? "#00aeec" : "#2ac864",
          background: isAiSubtitle(track) ? "rgba(0, 174, 236, 0.1)" : "rgba(42, 200, 100, 0.1)",
          borderRadius: "4px",
          fontSize: "12px",
          lineHeight: "18px",
          textAlign: "center"
        });
        details.append(name, code);
        row.append(checkbox, details, type);
        list.appendChild(row);
        return checkbox;
      });
      for (const button of [cancel, download]) {
        Object.assign(button.style, {
          height: "34px",
          minWidth: "76px",
          padding: "0 14px",
          borderRadius: "4px",
          fontSize: "14px",
          cursor: "pointer"
        });
      }
      Object.assign(cancel.style, {
        color: "var(--text2, #61666d)",
        background: "transparent",
        border: "1px solid var(--line_regular, #c9ccd0)"
      });
      Object.assign(download.style, {
        color: "#fff",
        background: "#fb7299",
        border: "1px solid #fb7299"
      });
      const updateSelection = () => {
        const selectedCount = checkboxes.filter((checkbox) => checkbox.checked).length;
        selectAll.checked = selectedCount === checkboxes.length;
        selectAll.indeterminate = selectedCount > 0 && selectedCount < checkboxes.length;
        count.textContent = `已选 ${selectedCount}/${tracks.length}`;
        download.textContent = selectedCount > 0 ? `下载所选 (${selectedCount})` : "下载所选";
        download.disabled = selectedCount === 0;
        download.style.opacity = download.disabled ? "0.5" : "1";
        download.style.cursor = download.disabled ? "not-allowed" : "pointer";
      };
      let settled = false;
      const finish = (selected) => {
        if (settled) {
          return;
        }
        settled = true;
        document.removeEventListener("keydown", handleKeyDown, true);
        overlay.remove();
        resolve(selected);
      };
      const handleKeyDown = (event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          finish([]);
        }
      };
      checkboxes.forEach((checkbox) => checkbox.addEventListener("change", updateSelection));
      selectAll.addEventListener("change", () => {
        checkboxes.forEach((checkbox) => {
          checkbox.checked = selectAll.checked;
        });
        updateSelection();
      });
      cancel.addEventListener("click", () => finish([]));
      download.addEventListener("click", () => {
        finish(tracks.filter((_, index) => checkboxes[index].checked));
      });
      overlay.addEventListener("click", (event) => {
        if (event.target === overlay) {
          finish([]);
        }
      });
      document.addEventListener("keydown", handleKeyDown, true);
      header.append(title, selectionLabel);
      footer.append(count, cancel, download);
      dialog.append(header, list, footer);
      overlay.appendChild(dialog);
      document.body.appendChild(overlay);
      updateSelection();
      selectAll.focus();
    });
  }
  async function down_bili_subtitle(onStatus) {
    try {
      setStatus(onStatus, "获取视频信息...", true);
      const info = await getCurrentBiliVideoInfo();
      const title = info.longTitle ? `${info.title} - ${info.longTitle}` : info.title;
      setStatus(onStatus, "获取字幕轨道...", true);
      const tracks = await fetchAllSubtitleTracks(info);
      if (tracks.length === 0) {
        throw new Error("未获取到字幕。AI 字幕需要登录 B 站，且播放器字幕菜单中存在 AI 字幕轨道");
      }
      const normalCount = tracks.filter((track) => !isAiSubtitle(track)).length;
      const aiCount = tracks.length - normalCount;
      console.log(`[字幕下载] 获取到 ${normalCount} 条普通字幕轨道、${aiCount} 条 AI 字幕轨道`);
      setStatus(onStatus, "选择字幕...", true);
      const selectedTracks = await selectSubtitleTracks(tracks);
      if (selectedTracks.length === 0) {
        return;
      }
      let completed = 0;
      const results = await Promise.allSettled(selectedTracks.map(async (track) => {
        const body = await fetchSubtitleBody(track);
        const srt = subtitlesToSrt(body);
        if (!srt) {
          throw new Error(`${track.lan_doc || track.lan} 字幕转换结果为空`);
        }
        completed += 1;
        setStatus(onStatus, `下载字幕 ${completed}/${selectedTracks.length}`, true);
        return { track, srt };
      }));
      const downloaded = results.filter((result) => result.status === "fulfilled").map((result) => result.value);
      const failed = results.filter((result) => result.status === "rejected");
      for (const result of failed) {
        console.warn("[字幕下载] 字幕正文下载失败", result.reason);
      }
      if (downloaded.length === 0) {
        throw new Error("所有字幕轨道均下载失败，签名地址可能已过期，请重试");
      }
      setStatus(onStatus, "打包字幕...", true);
      const files = {};
      const usedNames = /* @__PURE__ */ new Set();
      downloaded.forEach(({ track, srt }, index) => {
        files[subtitleFileName(track, index, usedNames)] = strToU8(`\uFEFF${srt}`);
      });
      const archive = zipSync(files, { level: 6 });
      const blob = new Blob([archive], { type: "application/zip" });
      saveAs(blob, `${safeFileName(title)} - 字幕.zip`);
      if (failed.length > 0) {
        alert(`已下载 ${downloaded.length}/${selectedTracks.length} 条字幕轨道，其余轨道下载失败，详情见控制台`);
      }
    } catch (error) {
      console.error("[字幕下载] 下载失败", error);
      alert(`下载字幕失败: ${error.message}`);
    }
  }
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
  const DM_DOWNLOAD_BUTTON_CLASS = "bili-utils-dm-download";
  const SUBTITLE_DOWNLOAD_BUTTON_CLASS = "bili-utils-subtitle-download";
  interceptor();
  createButton();
  createSubtitleButton();
  function updateButton(button, text, disabled) {
    button.textContent = text;
    button.disabled = disabled;
    button.style.opacity = disabled ? "0.6" : "1";
    button.style.cursor = disabled ? "not-allowed" : "pointer";
  }
  function isBiliPage() {
    return window.location.href.includes("bilibili");
  }
  function isVqqPage() {
    return window.location.href.includes("v.qq.com");
  }
  function createButton() {
    const button = document.createElement("button");
    button.className = DM_DOWNLOAD_BUTTON_CLASS;
    updateButton(button, "下载弹幕", false);
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
    if (isBiliPage()) {
      setupBiliButton(button);
      return;
    }
    if (isVqqPage()) {
      setupVqqButton(button);
      return;
    }
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
    document.body.appendChild(button);
  }
  function createSubtitleButton() {
    if (!isBiliPage()) {
      return;
    }
    const button = document.createElement("button");
    button.className = SUBTITLE_DOWNLOAD_BUTTON_CLASS;
    updateButton(button, "下载字幕", false);
    button.addEventListener("click", async () => {
      const setStatus2 = (text, disabled) => updateButton(button, text, disabled);
      try {
        await down_bili_subtitle(setStatus2);
      } finally {
        setStatus2("下载字幕", false);
      }
    });
    setupBiliButton(button);
  }
  function styleInlineButton(button, options = {}) {
    Object.assign(button.style, {
      position: "static",
      transform: "none",
      zIndex: "auto",
      height: options.height || "22px",
      minWidth: "64px",
      margin: options.margin || "0 6px 0 8px",
      padding: "0 8px",
      backgroundColor: options.backgroundColor || "#fb7299",
      color: "#fff",
      border: "none",
      borderRadius: "4px",
      boxShadow: "none",
      fontSize: "12px",
      lineHeight: options.height || "22px",
      whiteSpace: "nowrap",
      verticalAlign: "middle"
    });
  }
  function styleBiliButton(button) {
    styleInlineButton(button);
  }
  function mountBiliButton(button) {
    const dmRoot = document.querySelector(".bpx-player-dm-root");
    const dmSwitch = dmRoot == null ? undefined : dmRoot.querySelector(".bpx-player-dm-switch");
    if (!dmRoot || !dmSwitch) {
      return false;
    }
    styleBiliButton(button);
    if (button.parentElement !== dmRoot || button.nextElementSibling !== dmSwitch) {
      dmSwitch.insertAdjacentElement("beforebegin", button);
    }
    return true;
  }
  function setupBiliButton(button) {
    if (mountBiliButton(button)) {
      return;
    }
    const observer = new MutationObserver(() => {
      if (mountBiliButton(button)) {
        observer.disconnect();
      }
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }
  function styleVqqButton(button) {
    styleInlineButton(button, {
      height: "28px",
      margin: "0 6px 0 0",
      backgroundColor: "#14A3FF"
    });
  }
  function mountVqqButton(button) {
    const barrageControl = document.querySelector(".barrage-control-v2");
    const barrageSwitch = barrageControl == null ? undefined : barrageControl.querySelector(".barrage-switch");
    if (!barrageControl || !barrageSwitch) {
      return false;
    }
    styleVqqButton(button);
    if (button.parentElement !== barrageControl || button.nextElementSibling !== barrageSwitch) {
      barrageSwitch.insertAdjacentElement("beforebegin", button);
    }
    return true;
  }
  function setupVqqButton(button) {
    if (mountVqqButton(button)) {
      return;
    }
    const observer = new MutationObserver(() => {
      if (mountVqqButton(button)) {
        observer.disconnect();
      }
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

})(saveAs);