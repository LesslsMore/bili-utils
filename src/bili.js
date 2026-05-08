import saveAs from 'file-saver';

const DM_VIEW_API = 'https://api.bilibili.com/x/v2/dm/web/view';
const DM_SEG_API = 'https://api.bilibili.com/x/v2/dm/wbi/web/seg.so';
const DM_SEG_FALLBACK_API = 'https://api.bilibili.com/x/v2/dm/web/seg.so';
const NAV_API = 'https://api.bilibili.com/x/web-interface/nav';
const VIDEO_VIEW_API = 'https://api.bilibili.com/x/web-interface/view';

const SEGMENT_SECONDS = 360;
const MIXIN_KEY_ENC_TAB = [
    46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35,
    27, 43, 5, 49, 33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13,
    37, 48, 7, 16, 24, 55, 40, 61, 26, 17, 0, 1, 60, 51, 30, 4,
    22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36, 20, 34, 44, 52,
];

let mixinKeyCache = '';

const setStatus = (onStatus, text, disabled = false) => {
    if (typeof onStatus === 'function') {
        onStatus(text, disabled);
    }
};

function addUnsigned(x, y) {
    return (x + y) >>> 0;
}

function rotateLeft(value, shift) {
    return (value << shift) | (value >>> (32 - shift));
}

function md5Round(func, a, b, c, d, x, shift, ac) {
    return addUnsigned(rotateLeft(addUnsigned(addUnsigned(a, func(b, c, d)), addUnsigned(x, ac)), shift), b);
}

function md5(input) {
    const bytes = new TextEncoder().encode(input);
    const wordCount = ((((bytes.length + 8) >>> 6) + 1) * 16);
    const words = new Array(wordCount).fill(0);

    for (let i = 0; i < bytes.length; i++) {
        words[i >> 2] |= bytes[i] << ((i % 4) * 8);
    }
    words[bytes.length >> 2] |= 0x80 << ((bytes.length % 4) * 8);
    words[wordCount - 2] = (bytes.length * 8) >>> 0;
    words[wordCount - 1] = Math.floor((bytes.length * 8) / 0x100000000);

    let a = 0x67452301;
    let b = 0xefcdab89;
    let c = 0x98badcfe;
    let d = 0x10325476;

    const f = (x, y, z) => (x & y) | (~x & z);
    const g = (x, y, z) => (x & z) | (y & ~z);
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

        a = ff(a, b, c, d, words[k], 7, 0xd76aa478);
        d = ff(d, a, b, c, words[k + 1], 12, 0xe8c7b756);
        c = ff(c, d, a, b, words[k + 2], 17, 0x242070db);
        b = ff(b, c, d, a, words[k + 3], 22, 0xc1bdceee);
        a = ff(a, b, c, d, words[k + 4], 7, 0xf57c0faf);
        d = ff(d, a, b, c, words[k + 5], 12, 0x4787c62a);
        c = ff(c, d, a, b, words[k + 6], 17, 0xa8304613);
        b = ff(b, c, d, a, words[k + 7], 22, 0xfd469501);
        a = ff(a, b, c, d, words[k + 8], 7, 0x698098d8);
        d = ff(d, a, b, c, words[k + 9], 12, 0x8b44f7af);
        c = ff(c, d, a, b, words[k + 10], 17, 0xffff5bb1);
        b = ff(b, c, d, a, words[k + 11], 22, 0x895cd7be);
        a = ff(a, b, c, d, words[k + 12], 7, 0x6b901122);
        d = ff(d, a, b, c, words[k + 13], 12, 0xfd987193);
        c = ff(c, d, a, b, words[k + 14], 17, 0xa679438e);
        b = ff(b, c, d, a, words[k + 15], 22, 0x49b40821);

        a = gg(a, b, c, d, words[k + 1], 5, 0xf61e2562);
        d = gg(d, a, b, c, words[k + 6], 9, 0xc040b340);
        c = gg(c, d, a, b, words[k + 11], 14, 0x265e5a51);
        b = gg(b, c, d, a, words[k], 20, 0xe9b6c7aa);
        a = gg(a, b, c, d, words[k + 5], 5, 0xd62f105d);
        d = gg(d, a, b, c, words[k + 10], 9, 0x02441453);
        c = gg(c, d, a, b, words[k + 15], 14, 0xd8a1e681);
        b = gg(b, c, d, a, words[k + 4], 20, 0xe7d3fbc8);
        a = gg(a, b, c, d, words[k + 9], 5, 0x21e1cde6);
        d = gg(d, a, b, c, words[k + 14], 9, 0xc33707d6);
        c = gg(c, d, a, b, words[k + 3], 14, 0xf4d50d87);
        b = gg(b, c, d, a, words[k + 8], 20, 0x455a14ed);
        a = gg(a, b, c, d, words[k + 13], 5, 0xa9e3e905);
        d = gg(d, a, b, c, words[k + 2], 9, 0xfcefa3f8);
        c = gg(c, d, a, b, words[k + 7], 14, 0x676f02d9);
        b = gg(b, c, d, a, words[k + 12], 20, 0x8d2a4c8a);

        a = hh(a, b, c, d, words[k + 5], 4, 0xfffa3942);
        d = hh(d, a, b, c, words[k + 8], 11, 0x8771f681);
        c = hh(c, d, a, b, words[k + 11], 16, 0x6d9d6122);
        b = hh(b, c, d, a, words[k + 14], 23, 0xfde5380c);
        a = hh(a, b, c, d, words[k + 1], 4, 0xa4beea44);
        d = hh(d, a, b, c, words[k + 4], 11, 0x4bdecfa9);
        c = hh(c, d, a, b, words[k + 7], 16, 0xf6bb4b60);
        b = hh(b, c, d, a, words[k + 10], 23, 0xbebfbc70);
        a = hh(a, b, c, d, words[k + 13], 4, 0x289b7ec6);
        d = hh(d, a, b, c, words[k], 11, 0xeaa127fa);
        c = hh(c, d, a, b, words[k + 3], 16, 0xd4ef3085);
        b = hh(b, c, d, a, words[k + 6], 23, 0x04881d05);
        a = hh(a, b, c, d, words[k + 9], 4, 0xd9d4d039);
        d = hh(d, a, b, c, words[k + 12], 11, 0xe6db99e5);
        c = hh(c, d, a, b, words[k + 15], 16, 0x1fa27cf8);
        b = hh(b, c, d, a, words[k + 2], 23, 0xc4ac5665);

        a = iRound(a, b, c, d, words[k], 6, 0xf4292244);
        d = iRound(d, a, b, c, words[k + 7], 10, 0x432aff97);
        c = iRound(c, d, a, b, words[k + 14], 15, 0xab9423a7);
        b = iRound(b, c, d, a, words[k + 5], 21, 0xfc93a039);
        a = iRound(a, b, c, d, words[k + 12], 6, 0x655b59c3);
        d = iRound(d, a, b, c, words[k + 3], 10, 0x8f0ccc92);
        c = iRound(c, d, a, b, words[k + 10], 15, 0xffeff47d);
        b = iRound(b, c, d, a, words[k + 1], 21, 0x85845dd1);
        a = iRound(a, b, c, d, words[k + 8], 6, 0x6fa87e4f);
        d = iRound(d, a, b, c, words[k + 15], 10, 0xfe2ce6e0);
        c = iRound(c, d, a, b, words[k + 6], 15, 0xa3014314);
        b = iRound(b, c, d, a, words[k + 13], 21, 0x4e0811a1);
        a = iRound(a, b, c, d, words[k + 4], 6, 0xf7537e82);
        d = iRound(d, a, b, c, words[k + 11], 10, 0xbd3af235);
        c = iRound(c, d, a, b, words[k + 2], 15, 0x2ad7d2bb);
        b = iRound(b, c, d, a, words[k + 9], 21, 0xeb86d391);

        a = addUnsigned(a, aa);
        b = addUnsigned(b, bb);
        c = addUnsigned(c, cc);
        d = addUnsigned(d, dd);
    }

    const wordToHex = (value) => {
        let output = '';
        for (let i = 0; i <= 3; i++) {
            output += (`0${((value >>> (i * 8)) & 255).toString(16)}`).slice(-2);
        }
        return output;
    };

    return `${wordToHex(a)}${wordToHex(b)}${wordToHex(c)}${wordToHex(d)}`;
}

async function fetchJson(url) {
    const response = await fetch(url, {
        credentials: 'include',
    });
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    return response.json();
}

async function getMixinKey() {
    if (mixinKeyCache) {
        return mixinKeyCache;
    }

    const json = await fetchJson(NAV_API);
    const wbiImg = json.data?.wbi_img;
    const imgKey = wbiImg?.img_url?.split('/').pop()?.split('.')[0] || '';
    const subKey = wbiImg?.sub_url?.split('/').pop()?.split('.')[0] || '';
    const raw = `${imgKey}${subKey}`;

    if (!raw) {
        throw new Error('无法获取 WBI 图片密钥');
    }

    mixinKeyCache = MIXIN_KEY_ENC_TAB
        .map((index) => raw[index] || '')
        .join('')
        .slice(0, 32);

    return mixinKeyCache;
}

async function encodeWbiParams(params) {
    const mixinKey = await getMixinKey();
    const signed = {
        ...params,
        wts: Math.floor(Date.now() / 1000),
    };
    if (!signed.web_location) {
        signed.web_location = 1550101;
    }

    delete signed.w_rid;

    const search = new URLSearchParams();
    for (const key of Object.keys(signed).sort()) {
        search.append(key, String(signed[key]).replace(/[!'()*]/g, ''));
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
            return {value: result, pos};
        }
        shift += 7n;
    }

    return {value: result, pos};
}

function readBytes(buf, pos) {
    const lenResult = readVarint(buf, pos);
    const len = Number(lenResult.value);
    const start = lenResult.pos;
    const end = Math.min(start + len, buf.length);

    return {
        value: buf.slice(start, end),
        pos: end,
    };
}

function readString(buf, pos) {
    const result = readBytes(buf, pos);

    return {
        value: new TextDecoder().decode(result.value),
        pos: result.pos,
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
        total: 0,
    };
    let pos = 0;

    while (pos < buf.length) {
        const tagResult = readVarint(buf, pos);
        pos = tagResult.pos;

        const tag = Number(tagResult.value);
        const fieldNum = tag >> 3;
        const wireType = tag & 0x7;

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
        specialDmUrls: [],
    };
    let pos = 0;

    while (pos < buf.length) {
        const tagResult = readVarint(buf, pos);
        pos = tagResult.pos;

        const tag = Number(tagResult.value);
        const fieldNum = tag >> 3;
        const wireType = tag & 0x7;

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
        color: 0xffffff,
        midHash: '',
        content: '',
        ctime: 0n,
        weight: -1,
        action: '',
        pool: 0,
        idStr: '',
        attr: -1,
        uid: 0n,
    };
    let pos = 0;

    while (pos < buf.length) {
        const tagResult = readVarint(buf, pos);
        pos = tagResult.pos;

        const tag = Number(tagResult.value);
        const fieldNum = tag >> 3;
        const wireType = tag & 0x7;

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

    if (buf.length === 2 && buf[0] === 0x10 && buf[1] === 0x01) {
        throw new Error('该视频已关闭弹幕');
    }

    while (pos < buf.length) {
        const tagResult = readVarint(buf, pos);
        pos = tagResult.pos;

        const tag = Number(tagResult.value);
        const fieldNum = tag >> 3;
        const wireType = tag & 0x7;

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
        type: '1',
        oid: String(cid),
    });
    if (aid) {
        params.set('pid', String(aid));
    }

    const response = await fetch(`${DM_VIEW_API}?${params}`, {
        credentials: 'include',
    });
    if (!response.ok) {
        throw new Error(`dm/view HTTP ${response.status}`);
    }

    return parseDmWebViewReply(await response.arrayBuffer());
}

async function fetchDmSegment(url, params) {
    const response = await fetch(`${url}?${new URLSearchParams(params)}`, {
        credentials: 'include',
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
        console.warn('[弹幕下载] WBI 分片请求失败，回退旧接口', error);
        mixinKeyCache = '';
        return fetchDmSegment(DM_SEG_FALLBACK_API, params);
    }
}

async function fetchAllSegments(cid, aid, totalSegments, onStatus) {
    const allElems = [];

    for (let i = 1; i <= totalSegments; i++) {
        setStatus(onStatus, `下载中 ${i}/${totalSegments}`, true);

        const params = {
            type: '1',
            oid: String(cid),
            segment_index: String(i),
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
                credentials: 'include',
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            elems.push(...parseDmSegMobileReply(await response.arrayBuffer()).map((elem) => ({
                ...elem,
                mode: elem.mode || 9,
                pool: elem.pool || 2,
            })));
        } catch (error) {
            console.warn('[弹幕下载] 特殊弹幕获取失败', url, error);
        }
    }

    return elems;
}

function escapeXml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
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
    const seen = new Set();
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
    xml += '<chatserver>chat.bilibili.com</chatserver>\n';
    xml += `<chatid>${escapeXml(cid || 0)}</chatid>\n`;

    for (const elem of elems) {
        const timeSec = (elem.progress / 1000).toFixed(5);
        const id = elem.idStr || elem.id;
        const p = `${timeSec},${elem.mode},${elem.fontsize},${elem.color},${elem.ctime},${elem.pool},${elem.midHash},${id}`;
        xml += `<d p="${p}">${escapeXml(elem.content)}</d>\n`;
    }

    xml += '</i>';
    return xml;
}

function getCurrentPageNumber() {
    const page = Number(new URL(window.location.href).searchParams.get('p') || '1');
    return Number.isFinite(page) && page > 0 ? page : 1;
}

function infoFromInitialVideoState(bv) {
    const state = window.__INITIAL_STATE__;
    const videoData = state?.videoData;
    if (!videoData) {
        return null;
    }

    const pageNumber = getCurrentPageNumber();
    const page = videoData.pages?.[pageNumber - 1] || videoData.pages?.find((item) => item.cid === videoData.cid);

    return {
        cid: page?.cid || videoData.cid,
        aid: videoData.aid,
        title: videoData.title || bv,
        longTitle: page?.part || '',
        duration: page?.duration || videoData.duration || 0,
    };
}

async function fetchVideoData(bv) {
    const localInfo = infoFromInitialVideoState(bv);
    if (localInfo?.cid && localInfo?.aid) {
        return localInfo;
    }

    const params = new URLSearchParams({
        bvid: bv,
    });
    const json = await fetchJson(`${VIDEO_VIEW_API}?${params}`);
    if (json.code !== 0 || !json.data) {
        throw new Error(json.message || '无法获取视频信息');
    }

    const pageNumber = getCurrentPageNumber();
    const page = json.data.pages?.[pageNumber - 1] || json.data.pages?.[0] || {};

    return {
        cid: page.cid || json.data.cid,
        aid: json.data.aid,
        title: json.data.title || bv,
        longTitle: page.part || '',
        duration: page.duration || json.data.duration || 0,
    };
}

async function getText(url) {
    const response = await fetch(url, {
        credentials: 'include',
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
    const html = await getText(`https://www.bilibili.com/bangumi/play/${ep}/`);

    try {
        const json = firstJsonScript(html, /const playurlSSRData = (\{.*?\})\s*<\/script>/s)
            || firstJsonScript(html, /const playurlSSRData = (\{.*?\})\s*;/s);
        const epInfo = json?.data?.result?.play_view_business_info?.episode_info;
        const ogvInfo = json?.data?.result?.supplement?.ogv_episode_info;

        if (epInfo?.cid && epInfo?.aid) {
            return {
                cid: epInfo.cid,
                aid: epInfo.aid,
                title: ogvInfo?.index_title || epInfo.index_title || ep,
                longTitle: ogvInfo?.long_title || epInfo.long_title || '',
                duration: Number(epInfo.duration || ogvInfo?.duration || 0),
            };
        }
    } catch (error) {
        console.warn('[弹幕下载] playurlSSRData 解析失败，尝试 __NEXT_DATA__', error);
    }

    try {
        const json = firstJsonScript(html, /<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);
        const queries = json?.props?.pageProps?.dehydratedState?.queries || [];
        const seasonData = queries.find((query) => query.state?.data?.seasonInfo)?.state?.data;
        const playData = queries.find((query) => query.state?.data?.playInfo)?.state?.data;
        const episodes = seasonData?.seasonInfo?.mediaInfo?.episodes || [];
        const epId = ep.startsWith('ep') ? ep.replace('ep', '') : '';
        const epData = episodes.find((item) => String(item.id) === epId) || episodes[0] || {};
        const playInfo = playData?.playInfo || seasonData?.playInfo || {};

        if ((playInfo.cid || epData.cid) && (playInfo.aid || epData.aid)) {
            return {
                cid: playInfo.cid || epData.cid,
                aid: playInfo.aid || epData.aid,
                title: epData.share_copy || epData.index_title || ep,
                longTitle: epData.long_title || '',
                duration: Number(playInfo.duration || epData.duration || 0),
            };
        }
    } catch (error) {
        console.warn('[弹幕下载] __NEXT_DATA__ 解析失败', error);
    }

    throw new Error('无法解析番剧页面信息');
}

function estimateTotalSegments(info) {
    const duration = Number(info?.duration || window.__INITIAL_STATE__?.videoData?.duration || window.__INITIAL_STATE__?.mediaInfo?.duration || 0);
    return duration ? Math.max(1, Math.floor(duration / SEGMENT_SECONDS) + 1) : 1;
}

function safeFileName(name) {
    return (name || 'danmaku').replace(/[\\/:*?"<>|]/g, '_');
}

async function down_bili_danmu(onStatus) {
    const url = window.location.href;
    const epMatch = url.match(/\/bangumi\/play\/(ep\d+|ss\d+)/);
    const bvMatch = url.match(/\/video\/(BV[a-zA-Z0-9]+)/);

    let info;

    try {
        setStatus(onStatus, '获取视频信息...', true);

        if (epMatch) {
            info = await fetchInfo(epMatch[1]);
        } else if (bvMatch) {
            info = await fetchVideoData(bvMatch[1]);
        } else {
            alert('无法识别当前 B 站视频页面');
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
        specialDmUrls: [],
    };
    let totalSegments = estimateTotalSegments(info);
    try {
        setStatus(onStatus, '获取分段数...', true);
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
        alert('未获取到任何弹幕，可能视频暂无弹幕、弹幕已关闭或接口受限');
        return;
    }

    const blob = new Blob([elemsToXml(elems, info.cid)], {
        type: 'application/xml;charset=utf-8',
    });
    saveAs(blob, `${safeFileName(title)}.xml`);
    setStatus(onStatus, '下载弹幕', false);
}

export {
    down_bili_danmu,
};
