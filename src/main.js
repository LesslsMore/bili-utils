import {down_bili_danmu} from './bili.js';
import {down_bili_subtitle} from './bili-subtitle.js';
import {interceptor} from './interceptor';
import {down_vqq_danmu} from './vqq.js';

const DM_DOWNLOAD_BUTTON_CLASS = 'bili-utils-dm-download';
const SUBTITLE_DOWNLOAD_BUTTON_CLASS = 'bili-utils-subtitle-download';

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
                await down_vqq_danmu();
            }
        } finally {
            setStatus('下载弹幕', false);
        }
    });

    if (isBiliPage()) {
        setupBiliButton(button);
        return;
    }

    if (isVqqPage()) {
        setupVqqButton(button);
        return;
    }

    Object.assign(button.style, {
        position: 'fixed',
        left: '10px',
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: '9999',
        padding: '10px 20px',
        backgroundColor: '#fb7299',
        color: '#fff',
        border: 'none',
        borderRadius: '5px',
        boxShadow: '0 2px 5px rgba(0, 0, 0, 0.2)',
        fontSize: '14px',
        lineHeight: '1.4',
    });
    document.body.appendChild(button);
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

function styleVqqButton(button) {
    styleInlineButton(button, {
        height: '28px',
        margin: '0 6px 0 0',
        backgroundColor: '#14A3FF',
    });
}

function mountVqqButton(button) {
    const barrageControl = document.querySelector('.barrage-control-v2');
    const barrageSwitch = barrageControl?.querySelector('.barrage-switch');
    if (!barrageControl || !barrageSwitch) {
        return false;
    }

    styleVqqButton(button);
    if (button.parentElement !== barrageControl || button.nextElementSibling !== barrageSwitch) {
        barrageSwitch.insertAdjacentElement('beforebegin', button);
    }
    return true;
}

function setupVqqButton(button) {
    if (mountVqqButton(button)) {
        return;
    }

    const observer = new MutationObserver(() => {
        if (mountVqqButton(button)) {
            observer.disconnect();
        }
    });

    observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
    });
}
