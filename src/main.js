
import {down_bili_danmu} from "./bili.js";


create_button()
import { interceptor } from './interceptor';
import {down_vqq_danmu} from "./vqq.js";

interceptor();

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
        const url = window.location.href
        if (url.includes('bilibili')){
            await down_bili_danmu()
        } else if (url.includes('v.qq.com')){
            await down_vqq_danmu()
        }
    });

    // 将按钮添加到页面中
    document.body.appendChild(button);
}
