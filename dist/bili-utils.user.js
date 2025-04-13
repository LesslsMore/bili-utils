// ==UserScript==
// @name         bilibili 视频弹幕下载
// @namespace    https://github.com/LesslsMore/bili-utils
// @version      0.1.1
// @author       lesslsmore
// @description  bilibili 视频弹幕下载，支持各类视频弹幕下载，包括需要会员的视频以及需要大会员的番剧
// @license      MIT
// @icon         https://i0.hdslb.com/bfs/static/jinkela/long/images/favicon.ico
// @match        *://*.bilibili.com/bangumi/*
// @match        *://*.bilibili.com/video/*
// @require      https://cdn.jsdelivr.net/npm/file-saver@2.0.5/dist/FileSaver.min.js
// ==/UserScript==

(function (saveAs) {
  'use strict';

  create_button();
  function create_button() {
    const button = document.createElement("button");
    button.textContent = "下载弹幕";
    button.style.position = "fixed";
    button.style.left = "10px";
    button.style.top = "50%";
    button.style.transform = "translateY(-50%)";
    button.style.zIndex = "9999";
    button.style.padding = "10px 20px";
    button.style.backgroundColor = "#fb7299";
    button.style.color = "#fff";
    button.style.border = "none";
    button.style.borderRadius = "5px";
    button.style.cursor = "pointer";
    button.style.boxShadow = "0 2px 5px rgba(0, 0, 0, 0.2)";
    button.addEventListener("click", async () => {
      await down_danmu();
    });
    document.body.appendChild(button);
  }
  async function down_danmu() {
    let url = window.location.href;
    let epMatch = url.match(/(ep\d+)/) || url.match(/(ss\d+)/);
    let bvMatch = url.match(/video\/(BV\w+)/);
    if (epMatch) {
      const id = epMatch[1];
      console.log(id);
      const { cid, title, long_title } = await fetchInfo(id);
      await downloadFile(cid, `${title} - ${long_title}`);
    } else if (bvMatch) {
      const bv = bvMatch[1];
      console.log(bv);
      const { cid, title, long_title } = await fetchVideoData(bv);
      await downloadFile(cid, `${title}`);
    }
  }
  async function getText(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP 错误: ${response.status}`);
      }
      return await response.text();
    } catch (error) {
      console.error("请求失败:", error);
      throw error;
    }
  }
  async function fetchInfo(ep) {
    const data = await getText(`https://www.bilibili.com/bangumi/play/${ep}/`);
    const str = data.match(/const playurlSSRData = (\{.*?\}\n)/s)[1];
    const json = JSON.parse(str);
    console.log(json);
    return {
      cid: json.result.play_view_business_info.episode_info.cid,
      long_title: json.result.play_view_business_info.episode_info.long_title,
      title: json.result.play_view_business_info.episode_info.title
    };
  }
  async function fetchVideoData(id) {
    const data = await getText(`https://www.bilibili.com/video/${id}/`);
    const str = data.match(/window\.__INITIAL_STATE__=(.*);\(function\(\){/)[1];
    const json = JSON.parse(str);
    console.log(json);
    return {
      cid: json.videoData.cid,
      long_title: json.videoData.title,
      title: json.videoData.title
    };
  }
  async function downloadFile(cid, title) {
    const url = `https://comment.bilibili.com/${cid}.xml`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP 错误: ${response.status}`);
      }
      const blob = await response.blob();
      saveAs(blob, `${title}.xml`);
      console.log("文件下载完成");
    } catch (error) {
      console.error("下载失败:", error.message);
    }
  }

})(saveAs);