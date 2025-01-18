import saveAs from 'file-saver'

create_button()

// await down_danmu()

function create_button() {
    // 创建悬浮按钮
    const button = document.createElement("button");
    button.textContent = "下载弹幕";
    button.style.position = "fixed";
    button.style.left = "10px"; // 距离左侧 10px
    button.style.top = "50%"; // 垂直居中
    button.style.transform = "translateY(-50%)"; // 垂直居中
    button.style.zIndex = "9999"; // 确保按钮在最上层
    button.style.padding = "10px 20px";
    button.style.backgroundColor = "#fb7299";
    button.style.color = "#fff";
    button.style.border = "none";
    button.style.borderRadius = "5px";
    button.style.cursor = "pointer";
    button.style.boxShadow = "0 2px 5px rgba(0, 0, 0, 0.2)";

    // 添加点击事件
    button.addEventListener("click", async () => {
        await down_danmu()
    });

    // 将按钮添加到页面中
    document.body.appendChild(button);
}

async function down_danmu() {
    let url = window.location.href

    let ep = url.match(/(ep\d+)/)[1]

    if (ep) {
        console.log(ep)
        const {cid, title, long_title} = await fetchInfo(ep)
        await downloadFile(cid, `${title} - ${long_title}`)
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
        cid: json.result.play_view_business_info.episode_info.cid,
        long_title: json.result.play_view_business_info.episode_info.long_title,
        title: json.result.play_view_business_info.episode_info.title,
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
