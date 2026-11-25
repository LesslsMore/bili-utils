import saveAs from 'file-saver'

const VQQ_BARRAGE_BASE_URL = 'https://dm.video.qq.com/barrage/base/'
const VQQ_BARRAGE_SEGMENT_URL = 'https://dm.video.qq.com/barrage/segment/'
const VQQ_SEGMENT_CONCURRENCY = 6

function get_api_info(url, payload, response) {
    if (url.includes('https://pbaccess.video.qq.com/trpc.barrage.custom_barrage.CustomBarrage/GetDMStartUpConfig')) {
        console.log('vqq', url, response);

        const cloned = response.clone();
        cloned.json().then(async data => {
            console.log('Fetch响应内容:', data);
            if (data && data.data && data.data.segment_index) {

                console.log('Fetch请求内容:', payload);
                localStorage.setItem('payload', payload);

                console.log(data.data.segment_index)
                localStorage.setItem('segment_index', JSON.stringify(data.data.segment_index));
            }
        });
    }
}

// 从页面 URL 中解析 vid，例如 /x/cover/mzc00200u6gslvo/u4103g6vo3e.html
function get_vid_from_url(url = window.location.href) {
    try {
        const parsed = new URL(url);
        const fromQuery = parsed.searchParams.get('vid');
        if (fromQuery) return fromQuery;

        const match = parsed.pathname.match(/\/([A-Za-z0-9]{6,})\.html?$/);
        return match ? match[1] : null;
    } catch (error) {
        return null;
    }
}

// 兼容旧流程：播放器请求 GetDMStartUpConfig 时拦截下来写入 localStorage 的数据
function get_stored_config() {
    const payload = localStorage.getItem('payload');
    const segmentIndex = localStorage.getItem('segment_index');
    if (!payload || !segmentIndex) return null;

    try {
        const {vid} = JSON.parse(payload);
        const segments = JSON.parse(segmentIndex);
        if (vid && segments && typeof segments === 'object' && Object.keys(segments).length) {
            return {vid, segments};
        }
    } catch (error) {
        console.warn('读取本地弹幕配置失败:', error);
    }

    return null;
}

// 直接请求弹幕基础接口，拿到完整的分片索引，不依赖播放器是否加载
async function fetch_segment_index(vid) {
    const response = await fetch(VQQ_BARRAGE_BASE_URL + vid);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    if (!data || !data.segment_index || !Object.keys(data.segment_index).length) {
        throw new Error('该视频没有可用的弹幕数据');
    }

    return data.segment_index;
}

async function request_segment(vid, segmentName, retries = 2) {
    const url = `${VQQ_BARRAGE_SEGMENT_URL}${vid}/${segmentName}`;
    let lastError;

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            return Array.isArray(data.barrage_list) ? data.barrage_list : [];
        } catch (error) {
            lastError = error;
            if (attempt < retries) {
                await new Promise(resolve => setTimeout(resolve, 300 * (attempt + 1)));
            }
        }
    }

    throw lastError;
}

async function down_vqq_danmu(setStatus = () => {}) {
    let vid = get_vid_from_url();
    let segments = null;

    if (vid) {
        try {
            segments = await fetch_segment_index(vid);
        } catch (error) {
            console.warn(`通过 vid ${vid} 获取弹幕索引失败:`, error);
        }
    }

    // URL 中没有 vid（例如封面页）或接口不可用时，回退到播放器拦截到的配置
    if (!segments) {
        const stored = get_stored_config();
        if (!stored) throw new Error('未找到弹幕数据，请确认当前页面是腾讯视频播放页');

        vid = stored.vid;
        segments = stored.segments;
    }

    await fetchAndMergeBarrages(segments, vid, setStatus);
}

async function fetchAndMergeBarrages(segmentsData, vid, setStatus = () => {}) {
    const segmentNames = Object.values(segmentsData)
        .sort((a, b) => Number(a.segment_start || 0) - Number(b.segment_start || 0))
        .map(segment => segment.segment_name)
        .filter(Boolean);

    const total = segmentNames.length;
    const allBarrages = [];
    const failedSegments = [];
    let cursor = 0;

    const worker = async () => {
        while (cursor < total) {
            const segmentName = segmentNames[cursor++];
            try {
                const list = await request_segment(vid, segmentName);
                allBarrages.push(...list);
            } catch (error) {
                console.error(`请求片段 ${segmentName} 失败:`, error);
                failedSegments.push(segmentName);
            }
            setStatus(`下载中 ${Math.min(cursor, total)}/${total}`, true);
        }
    };

    await Promise.all(
        Array.from({length: Math.min(VQQ_SEGMENT_CONCURRENCY, total)}, worker)
    );

    // 分段之间不重叠，这里仍按 id 去重，避免接口异常时写入重复弹幕
    const seen = new Set();
    const uniqueBarrages = allBarrages.filter(barrage => {
        const key = barrage.id || `${barrage.time_offset}:${barrage.content}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
    uniqueBarrages.sort((a, b) => parseInt(a.time_offset || 0) - parseInt(b.time_offset || 0));

    if (failedSegments.length) {
        console.warn(`有 ${failedSegments.length} 个片段下载失败:`, failedSegments);
    }
    console.log(`总共获取到 ${uniqueBarrages.length} 条弹幕`);

    const xmlContent = convertToBilibiliXML(uniqueBarrages);
    const blob = new Blob([xmlContent], {
        type: 'application/xml;charset=utf-8'
    });
    saveAs(blob, `${vid}.xml`);

    return {barrage_list: uniqueBarrages, failed_segments: failedSegments};
}

// 添加转换函数
function convertToBilibiliXML(barrageList) {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<i>\n';

    barrageList.forEach(barrage => {
        // 解析时间偏移（毫秒转秒）
        const timeOffset = parseInt(barrage.time_offset || "0") / 1000.0;

        // Bilibili弹幕格式: p="时间,模式,字体大小,颜色,时间戳,弹幕池,用户ID,弹幕ID"
        // 模式: 1-滚动 4-底部 5-顶部
        // 字体大小: 一般为16或25
        // 颜色: 十进制颜色值
        // 时间戳: 发送时间戳
        // 弹幕池: 0-普通 1-顶部 2-底部
        // 用户ID: 用户标识
        // 弹幕ID: 弹幕唯一标识

        const time = timeOffset;  // 时间偏移（秒）
        const type = 1;  // 模式: 1-滚动
        const fontSize = 25;  // 字体大小
        const color = 16777215;  // 颜色: 白色 (默认)
        const timestamp = barrage.create_time || '0';  // 时间戳
        const pool = 0;  // 弹幕池: 0-普通
        const userID = barrage.vuid || '';  // 用户ID
        const rowID = barrage.id || '';  // 弹幕ID
        const text = barrage.content || '';  // 弹幕内容

        // 转义特殊字符
        const escapedText = text.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');

        const pValue = `${time},${type},${fontSize},${color},${timestamp},${pool},${userID},${rowID}`;
        xml += `<d p="${pValue}">${escapedText}</d>\n`;
    });

    xml += '</i>';
    return xml;
}


export {
    get_api_info,
    down_vqq_danmu
}