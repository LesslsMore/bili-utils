import {defineConfig} from 'vite';
import monkey, {cdn} from 'vite-plugin-monkey';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        monkey({
            entry: 'src/main.js',
            userscript: {
                name: 'bilibili 字幕、bilibili/腾讯视频弹幕下载',
                namespace: 'https://github.com/LesslsMore/bili-utils',
                version: '0.3.0',
                author: 'lesslsmore',
                license: 'MIT',
                description: '下载 bilibili 普通/AI 字幕，以及 bilibili、腾讯视频全量弹幕。',
                icon: 'https://i0.hdslb.com/bfs/static/jinkela/long/images/favicon.ico',
                connect: [
                    '*.hdslb.com',
                    'subtitle.bilibili.com',
                ],
                match: [
                    '*://*.bilibili.com/bangumi/*',
                    '*://*.bilibili.com/video/*',
                    'https://v.qq.com/x/cover/*'
                ],
            },
            build: {
                externalGlobals: {
                    'file-saver': cdn.jsdelivr('saveAs', 'dist/FileSaver.min.js'),
                },
            },
        }),
    ],
});
