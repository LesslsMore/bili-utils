import saveAs from 'file-saver'

async function down_bili_danmu() {
    let url = window.location.href

    // 匹配ep/ss格式
    let epMatch = url.match(/(ep\d+)/) || url.match(/(ss\d+)/);
    // 匹配BV格式
    let bvMatch = url.match(/video\/(BV\w+)/);

    if (epMatch) {
        const id = epMatch[1];
        console.log(id);
        const {cid, title, long_title} = await fetchInfo(id);
        await downloadFile(cid, `${title} - ${long_title}`);
    } else if (bvMatch) {
        const bv = bvMatch[1];
        console.log(bv);
        const {cid, title, long_title} = await fetchVideoData(bv);
        await downloadFile(cid, `${title}`);
    }
}

async function getText(url) {
    try {
        // 发送 GET 请求
        const response = await fetch(url);

        // 检查响应状态
        if (!response.ok) {
            throw new Error(`HTTP 错误: ${response.status}`);
        }

        // 返回响应文本
        return await response.text();
    } catch (error) {
        console.error("请求失败:", error);
        throw error; // 抛出错误以便外部处理
    }
}

async function fetchInfo(ep) {
    const data = await getText(`https://www.bilibili.com/bangumi/play/${ep}/`)
    const str = data.match(/const playurlSSRData = (\{.*?\}\n)/s)[1]

    const json = JSON.parse(str)
    // console.log(data)
    // console.log(str)
    console.log(json)
    const res = json.data
    // this.title = json.mediaInfo.title
    // this.cover = json.mediaInfo.cover
    // this.squareCover = json.mediaInfo.square_cover
    // this.aid = json.epInfo.aid
    // this.cid = json.epInfo.cid
    // this.videos = json.epList.map(async (it: any) => ({
    //     title: it.index_title,
    //     aid: it.aid,
    //     cid: it.cid,
    //     info: await new VideoInfo(it.aid).fetchInfo(),
    // }))
    // return this


    return {
        cid: res.result.play_view_business_info.episode_info.cid,
        long_title: res.result.supplement.ogv_episode_info.long_title,
        title: res.result.supplement.ogv_episode_info.index_title,
    }
}

async function fetchVideoData(id) {
    const data = await getText(`https://www.bilibili.com/video/${id}/`)
    const str = data.match(/window\.__INITIAL_STATE__=(.*);\(function\(\){/)[1]

    const res = JSON.parse(str)
    // console.log(data)
    // console.log(str)
    console.log(res)

    return {
        cid: res.videoData.cid,
        long_title: res.videoData.title,
        title: res.videoData.title,
    }
}

// 下载函数
async function downloadFile(cid, title) {
    // 构造 URL
    const url = `https://comment.bilibili.com/${cid}.xml`;

    try {
        // 发送 GET 请求获取文件内容
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP 错误: ${response.status}`);
        }

        // 将响应内容转换为 Blob
        const blob = await response.blob();

        // 使用 file-saver 保存文件
        saveAs(blob, `${title}.xml`);

        console.log("文件下载完成");
    } catch (error) {
        console.error("下载失败:", error.message);
    }
}

export {
    down_bili_danmu
}
