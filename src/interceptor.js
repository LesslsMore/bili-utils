import {GM_cookie, unsafeWindow, monkeyWindow, GM_addElement} from '$';
import {get_api_info} from "./vqq.js";
// import {get_api_info} from "./api/bili.js";


function interceptor() {
    'use strict';

    // // 1. 拦截XHR请求
    // const originalXHROpen = XMLHttpRequest.prototype.open;
    // XMLHttpRequest.prototype.open = function(method, url) {
    //     if (url.includes('ads.com')) {
    //         console.log('屏蔽广告请求:', url);
    //         return; // 直接阻断请求
    //     }
    //     originalXHROpen.apply(this, arguments);
    // };

    // 2. 拦截Fetch请求
    const originalFetch = unsafeWindow.fetch;
    unsafeWindow.fetch = async function (input, init) {

        const response = await originalFetch(input, init);
        // 获取请求payload（如果存在）
        const payload = init?.body;
        const url = typeof input === 'string' ? input : input.url;
        // 精准匹配目标接口
        // console.log(`url: `, url)
        get_api_info(url, payload,response);
        return response;
    };
}

export {
    interceptor
}
