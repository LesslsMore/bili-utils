import saveAs from 'file-saver'

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

async function down_vqq_danmu() {
    const payload = localStorage.getItem('payload');
    const segment_index = localStorage.getItem('segment_index');
    const vid = JSON.parse(payload).vid
    await fetchAndMergeBarrages(JSON.parse(segment_index), vid)
}

async function fetchAndMergeBarrages(segmentsData, vid) {
    const baseUrl = `https://dm.video.qq.com/barrage/segment/${vid}/`;
    const allBarrages = [];

    const segmentNames = Object.values(segmentsData).map(s => s.segment_name);

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

    const result = {barrage_list: allBarrages};
    console.log(`总共获取到 ${allBarrages.length} 条弹幕`);

    // 转换为 Bilibili XML 格式
    const xmlContent = convertToBilibiliXML(allBarrages);

    // 保存为 XML 文件
    const blob = new Blob([xmlContent], {
        type: 'application/xml;charset=utf-8'
    });
    saveAs(blob, `${vid}.xml`);

    return result;
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
