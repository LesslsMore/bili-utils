import {down_bili_danmu} from './bili.js';
import {down_bili_subtitle} from './bili-subtitle.js';
import {interceptor} from './interceptor';
import {down_vqq_danmu} from './vqq.js';

const DM_DOWNLOAD_BUTTON_CLASS = 'bili-utils-dm-download';
const SUBTITLE_DOWNLOAD_BUTTON_CLASS = 'bili-utils-subtitle-download';

// 必须在 createButton() 之前初始化：腾讯视频按钮首次挂载时会读取这个列表
const VQQ_INTRO_CONTAINER_SELECTORS = [
    '#MAIN_PAGE_CONTENT_ID > div.video-detail-intro-new > div.intro-detail-wrap > div > div.intro-tags.tags-wrap',
    '#MAIN_PAGE_CONTENT_ID .video-detail-intro-new .intro-tags.tags-wrap',
    '.video-detail-intro-new .intro-tags.tags-wrap',
    // 普通视频等页面结构不同，没有 tags 区域时退回到简介区域
    '#MAIN_PAGE_CONTENT_ID .video-detail-intro-new .intro-detail-wrap',
    '#MAIN_PAGE_CONTENT_ID .video-detail-intro-new',
];

interceptor();
createButton();
createSubtitleButton();

function updateButton(button, text, disabled) {
    button.textContent = text;
    button.disabled = disabled;
    button.style.opacity = disabled ? '0.6' : '1';
    button.style.cursor = disabled ? 'not-allowed' : 'pointer';
}

function isBiliPage() {
    return window.location.href.includes('bilibili');
}

function isVqqPage() {
    return window.location.href.includes('v.qq.com');
}

function createButton() {
    const button = document.createElement('button');
    button.className = DM_DOWNLOAD_BUTTON_CLASS;
    updateButton(button, '下载弹幕', false);

    button.addEventListener('click', async () => {
        const url = window.location.href;
        const setStatus = (text, disabled) => updateButton(button, text, disabled);

        try {
            if (url.includes('bilibili')) {
                await down_bili_danmu(setStatus);
            } else if (url.includes('v.qq.com')) {
                setStatus('下载中...', true);
                await down_vqq_danmu(setStatus);
            }
            setStatus('下载弹幕', false);
        } catch (error) {
            console.error('下载弹幕失败:', error);
            setStatus('下载失败', false);
            setTimeout(() => setStatus('下载弹幕', false), 3000);
        }
    });

    if (isBiliPage()) {
        setupBiliButton(button);
        return;
    }

    if (isVqqPage()) {
        // 腾讯视频部分内容有版权保护，播放器可能不会加载，按钮放在播放器外面，打开页面即可使用
        setupVqqButton(button);
        return;
    }

    styleFloatingButton(button);
    appendFloatingButton(button);
}

function findVqqIntroContainer() {
    for (const selector of VQQ_INTRO_CONTAINER_SELECTORS) {
        const container = document.querySelector(selector);
        if (container) {
            return container;
        }
    }
    return null;
}

function styleVqqButton(button) {
    Object.assign(button.style, {
        display: 'inline-flex',
        alignItems: 'center',
        alignSelf: 'center',
        height: '28px',
        margin: '0 0 0 8px',
        padding: '0 12px',
        backgroundColor: '#14A3FF',
        color: '#fff',
        border: 'none',
        borderRadius: '14px',
        boxShadow: 'none',
        fontSize: '13px',
        lineHeight: '28px',
        whiteSpace: 'nowrap',
        verticalAlign: 'middle',
    });
}

function mountVqqButton(button) {
    const container = findVqqIntroContainer();
    if (!container) {
        return false;
    }

    styleVqqButton(button);
    if (button.parentElement !== container) {
        container.appendChild(button);
    }
    return true;
}

function setupVqqButton(button) {
    mountVqqButton(button);

    // 腾讯视频是单页应用，简介区域可能被重新渲染，按钮被移除时自动补回
    const observer = new MutationObserver(() => {
        if (!button.isConnected) {
            mountVqqButton(button);
        }
    });

    observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
    });
}

function styleFloatingButton(button, backgroundColor = '#fb7299') {
    Object.assign(button.style, {
        position: 'fixed',
        left: '10px',
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: '9999',
        padding: '10px 20px',
        backgroundColor,
        color: '#fff',
        border: 'none',
        borderRadius: '5px',
        boxShadow: '0 2px 5px rgba(0, 0, 0, 0.2)',
        fontSize: '14px',
        lineHeight: '1.4',
    });
}

function appendFloatingButton(button) {
    (document.body || document.documentElement).appendChild(button);
}

function createSubtitleButton() {
    if (!isBiliPage()) {
        return;
    }

    const button = document.createElement('button');
    button.className = SUBTITLE_DOWNLOAD_BUTTON_CLASS;
    updateButton(button, '下载字幕', false);

    button.addEventListener('click', async () => {
        const setStatus = (text, disabled) => updateButton(button, text, disabled);

        try {
            await down_bili_subtitle(setStatus);
        } finally {
            setStatus('下载字幕', false);
        }
    });

    setupBiliButton(button);
}

function styleInlineButton(button, options = {}) {
    Object.assign(button.style, {
        position: 'static',
        transform: 'none',
        zIndex: 'auto',
        height: options.height || '22px',
        minWidth: '64px',
        margin: options.margin || '0 6px 0 8px',
        padding: '0 8px',
        backgroundColor: options.backgroundColor || '#fb7299',
        color: '#fff',
        border: 'none',
        borderRadius: '4px',
        boxShadow: 'none',
        fontSize: '12px',
        lineHeight: options.height || '22px',
        whiteSpace: 'nowrap',
        verticalAlign: 'middle',
    });
}

function styleBiliButton(button) {
    styleInlineButton(button);
}

function mountBiliButton(button) {
    const dmRoot = document.querySelector('.bpx-player-dm-root');
    const dmSwitch = dmRoot?.querySelector('.bpx-player-dm-switch');
    if (!dmRoot || !dmSwitch) {
        return false;
    }

    styleBiliButton(button);
    if (button.parentElement !== dmRoot || button.nextElementSibling !== dmSwitch) {
        dmSwitch.insertAdjacentElement('beforebegin', button);
    }
    return true;
}

function setupBiliButton(button) {
    if (mountBiliButton(button)) {
        return;
    }

    const observer = new MutationObserver(() => {
        if (mountBiliButton(button)) {
            observer.disconnect();
        }
    });

    observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
    });
}

