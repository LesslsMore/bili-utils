import {down_bili_danmu} from './bili.js';
import {interceptor} from './interceptor';
import {down_vqq_danmu} from './vqq.js';

interceptor();
createButton();

function updateButton(button, text, disabled) {
    button.textContent = text;
    button.disabled = disabled;
    button.style.opacity = disabled ? '0.6' : '1';
    button.style.cursor = disabled ? 'not-allowed' : 'pointer';
}

function createButton() {
    const button = document.createElement('button');
    updateButton(button, '下载弹幕', false);

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

    document.body.appendChild(button);
}
