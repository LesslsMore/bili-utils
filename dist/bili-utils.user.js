// ==UserScript==
// @name         bilibili、腾讯视频弹幕下载
// @namespace    https://github.com/LesslsMore/bili-utils
// @version      0.2.2
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
  const setStatus = (onStatus, text, disabled = false) => {
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
    var _a, _b, _c, _d, _e;
    if (mixinKeyCache) {
      return mixinKeyCache;
    }
    const json = await fetchJson(NAV_API);
    const wbiImg = (_a = json.data) == null ? undefined : _a.wbi_img;
    const imgKey = ((_c = (_b = wbiImg == null ? undefined : wbiImg.img_url) == null ? undefined : _b.split("/").pop()) == null ? undefined : _c.split(".")[0]) || "";
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
  function readVarint(buf, pos) {
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
    const lenResult = readVarint(buf, pos);
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
      return readVarint(buf, pos).pos;
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
      const tagResult = readVarint(buf, pos);
      pos = tagResult.pos;
      const tag = Number(tagResult.value);
      const fieldNum = tag >> 3;
      const wireType = tag & 7;
      if (wireType === 0 && (fieldNum === 1 || fieldNum === 2)) {
        const valueResult = readVarint(buf, pos);
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
      const tagResult = readVarint(buf, pos);
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
        const valueResult = readVarint(buf, pos);
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
      setStatus(onStatus, `下载中 ${i}/${totalSegments}`, true);
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
  function infoFromInitialVideoState(bv) {
    var _a, _b;
    const state = window.__INITIAL_STATE__;
    const videoData = state == null ? undefined : state.videoData;
    if (!videoData) {
      return null;
    }
    const pageNumber = getCurrentPageNumber();
    const page = ((_a = videoData.pages) == null ? undefined : _a[pageNumber - 1]) || ((_b = videoData.pages) == null ? undefined : _b.find((item) => item.cid === videoData.cid));
    return {
      cid: (page == null ? undefined : page.cid) || videoData.cid,
      aid: videoData.aid,
      title: videoData.title || bv,
      longTitle: (page == null ? undefined : page.part) || "",
      duration: (page == null ? undefined : page.duration) || videoData.duration || 0
    };
  }
  async function fetchVideoData(bv) {
    var _a, _b;
    const localInfo = infoFromInitialVideoState(bv);
    if ((localInfo == null ? undefined : localInfo.cid) && (localInfo == null ? undefined : localInfo.aid)) {
      return localInfo;
    }
    const params = new URLSearchParams({
      bvid: bv
    });
    const json = await fetchJson(`${VIDEO_VIEW_API}?${params}`);
    if (json.code !== 0 || !json.data) {
      throw new Error(json.message || "无法获取视频信息");
    }
    const pageNumber = getCurrentPageNumber();
    const page = ((_a = json.data.pages) == null ? undefined : _a[pageNumber - 1]) || ((_b = json.data.pages) == null ? undefined : _b[0]) || {};
    return {
      cid: page.cid || json.data.cid,
      aid: json.data.aid,
      title: json.data.title || bv,
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
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o;
    const html = await getText(`https://www.bilibili.com/bangumi/play/${ep}/`);
    try {
      const json = firstJsonScript(html, /const playurlSSRData = (\{.*?\})\s*<\/script>/s) || firstJsonScript(html, /const playurlSSRData = (\{.*?\})\s*;/s);
      const epInfo = (_c = (_b = (_a = json == null ? void 0 : json.data) == null ? void 0 : _a.result) == null ? void 0 : _b.play_view_business_info) == null ? void 0 : _c.episode_info;
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
        var _a2, _b2;
        return (_b2 = (_a2 = query.state) == null ? void 0 : _a2.data) == null ? void 0 : _b2.seasonInfo;
      })) == null ? void 0 : _j.state) == null ? void 0 : _k.data;
      const playData = (_m = (_l = queries.find((query) => {
        var _a2, _b2;
        return (_b2 = (_a2 = query.state) == null ? void 0 : _a2.data) == null ? void 0 : _b2.playInfo;
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
    var _a, _b, _c, _d;
    const duration = Number((info == null ? undefined : info.duration) || ((_b = (_a = window.__INITIAL_STATE__) == null ? undefined : _a.videoData) == null ? undefined : _b.duration) || ((_d = (_c = window.__INITIAL_STATE__) == null ? undefined : _c.mediaInfo) == null ? undefined : _d.duration) || 0);
    return duration ? Math.max(1, Math.floor(duration / SEGMENT_SECONDS) + 1) : 1;
  }
  function safeFileName(name) {
    return (name || "danmaku").replace(/[\\/:*?"<>|]/g, "_");
  }
  async function down_bili_danmu(onStatus) {
    const url = window.location.href;
    const epMatch = url.match(/\/bangumi\/play\/(ep\d+|ss\d+)/);
    const bvMatch = url.match(/\/video\/(BV[a-zA-Z0-9]+)/);
    let info;
    try {
      setStatus(onStatus, "获取视频信息...", true);
      if (epMatch) {
        info = await fetchInfo(epMatch[1]);
      } else if (bvMatch) {
        info = await fetchVideoData(bvMatch[1]);
      } else {
        alert("无法识别当前 B 站视频页面");
        return;
      }
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
      setStatus(onStatus, "获取分段数...", true);
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