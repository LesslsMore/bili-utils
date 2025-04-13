import { defineConfig } from 'vite';
import monkey, { cdn }  from 'vite-plugin-monkey';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/main.js',
      userscript: {
        name: 'bilibili 视频弹幕下载',
        namespace: 'https://github.com/LesslsMore/bili-utils',
        version: '0.1.1',
        author: 'lesslsmore',
        license: 'MIT',
        description: 'bilibili 视频弹幕下载，支持各类视频弹幕下载，包括需要会员的视频以及需要大会员的番剧',
        icon: 'https://i0.hdslb.com/bfs/static/jinkela/long/images/favicon.ico',
        match: ['*://*.bilibili.com/bangumi/*', '*://*.bilibili.com/video/*'],
      },
      build: {
        externalGlobals: {
          'file-saver': cdn.jsdelivr('saveAs', 'dist/FileSaver.min.js'),
        },
      },
    }),
  ],
});
