import saveAs from 'file-saver';
import {strToU8, zipSync} from 'fflate';
import {GM_xmlhttpRequest} from '$';
import {getCurrentBiliVideoInfo, safeFileName} from './bili.js';
import {
    isAiSubtitle,
    mergeSubtitleTracks,
    parseWebSubtitleReply,
    subtitlesToSrt,
} from './bili-subtitle-core.js';

const PLAYER_SUBTITLE_API = 'https://api.bilibili.com/x/player/wbi/v2';
const WEB_SUBTITLE_API = 'https://api.bilibili.com/x/v2/subtitle/web/view';

const setStatus = (onStatus, text, disabled = false) => {
    if (typeof onStatus === 'function') {
        onStatus(text, disabled);
    }
};

async function fetchLegacySubtitleTracks(info) {
    const params = new URLSearchParams({
        aid: String(info.aid),
        cid: String(info.cid),
    });
    const response = await fetch(`${PLAYER_SUBTITLE_API}?${params}`, {
        credentials: 'include',
    });
    if (!response.ok) {
        throw new Error(`旧字幕接口 HTTP ${response.status}`);
    }

    const json = await response.json();
    if (json.code !== 0) {
        throw new Error(json.message || `旧字幕接口错误 ${json.code}`);
    }

    return json.data?.subtitle?.subtitles || [];
}

async function fetchWebSubtitleTracks(info) {
    const params = new URLSearchParams({
        oid: String(info.cid),
        pid: String(info.aid),
        context_ext: JSON.stringify({video_type: 1}),
        type: '1',
        cur_production_type: '0',
        preferred_language: 'ai-zh',
        playlist_switch: '0',
    });
    const response = await fetch(`${WEB_SUBTITLE_API}?${params}`, {
        credentials: 'include',
        headers: {
            Accept: 'application/octet-stream',
        },
    });
    if (!response.ok) {
        throw new Error(`新字幕接口 HTTP ${response.status}`);
    }

    const payload = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('json')) {
        const json = JSON.parse(new TextDecoder().decode(payload));
        throw new Error(json.message || `新字幕接口错误 ${json.code || 'unknown'}`);
    }

    return parseWebSubtitleReply(payload);
}

async function fetchAllSubtitleTracks(info) {
    const results = await Promise.allSettled([
        fetchLegacySubtitleTracks(info),
        fetchWebSubtitleTracks(info),
    ]);
    const trackLists = [];

    for (const result of results) {
        if (result.status === 'fulfilled') {
            trackLists.push(result.value);
        } else {
            console.warn('[字幕下载] 字幕轨道接口请求失败', result.reason);
        }
    }

    return mergeSubtitleTracks(...trackLists);
}

function normalizeSubtitleUrl(value) {
    const url = new URL(String(value || ''), window.location.href);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new Error(`不支持的字幕地址协议: ${url.protocol}`);
    }
    return url.href;
}

async function fetchSubtitleJsonWithPage(url) {
    const response = await fetch(url, {
        headers: {
            Accept: 'application/json',
        },
    });
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
}

function fetchSubtitleJsonWithUserscript(url) {
    return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
            method: 'GET',
            url,
            headers: {
                Accept: 'application/json',
            },
            responseType: 'json',
            anonymous: true,
            timeout: 30000,
            onload(response) {
                if (response.status < 200 || response.status >= 300) {
                    reject(new Error(`HTTP ${response.status}`));
                    return;
                }

                try {
                    const json = response.response && typeof response.response !== 'string'
                        ? response.response
                        : JSON.parse(response.responseText || response.response);
                    resolve(json);
                } catch (error) {
                    reject(new Error(`JSON 解析失败: ${error.message}`));
                }
            },
            onerror(response) {
                reject(new Error(response.error || response.statusText || '网络请求失败'));
            },
            ontimeout() {
                reject(new Error('请求超时'));
            },
        });
    });
}

async function fetchSubtitleJson(url) {
    try {
        return await fetchSubtitleJsonWithPage(url);
    } catch (pageError) {
        try {
            return await fetchSubtitleJsonWithUserscript(url);
        } catch (userscriptError) {
            throw new Error(`页面请求失败: ${pageError.message}; 跨域请求失败: ${userscriptError.message}`);
        }
    }
}

async function fetchSubtitleBody(track) {
    const urls = [...new Set([
        track.subtitle_url,
        ...(Array.isArray(track.subtitle_urls) ? track.subtitle_urls : []),
    ].filter(Boolean))];
    const failures = [];

    for (const value of urls) {
        let url;
        try {
            url = normalizeSubtitleUrl(value);
            const json = await fetchSubtitleJson(url);
            const body = Array.isArray(json) ? json : json.body;
            if (!Array.isArray(body) || body.length === 0) {
                throw new Error('字幕正文为空');
            }
            return body;
        } catch (error) {
            failures.push(`${url ? new URL(url).host : '无效地址'}: ${error.message}`);
        }
    }

    throw new Error(`${track.lan_doc || track.lan} 字幕下载失败 (${failures.join('; ')})`);
}

function subtitleFileName(track, index, usedNames) {
    const type = isAiSubtitle(track) ? 'AI' : 'CC';
    const language = safeFileName(track.lan_doc || track.lan || `轨道-${index + 1}`);
    const baseName = `${String(index + 1).padStart(2, '0')}-${type}-${language}`;
    let fileName = `${baseName}.srt`;
    let suffix = 2;

    while (usedNames.has(fileName)) {
        fileName = `${baseName}-${suffix++}.srt`;
    }
    usedNames.add(fileName);
    return fileName;
}

function selectSubtitleTracks(tracks) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        const dialog = document.createElement('div');
        const header = document.createElement('div');
        const title = document.createElement('strong');
        const selectionLabel = document.createElement('label');
        const selectAll = document.createElement('input');
        const list = document.createElement('div');
        const footer = document.createElement('div');
        const count = document.createElement('span');
        const cancel = document.createElement('button');
        const download = document.createElement('button');

        overlay.className = 'bili-utils-subtitle-dialog-overlay';
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-modal', 'true');
        dialog.setAttribute('aria-labelledby', 'bili-utils-subtitle-dialog-title');
        title.id = 'bili-utils-subtitle-dialog-title';
        title.textContent = '选择字幕';
        selectAll.type = 'checkbox';
        selectionLabel.append(selectAll, document.createTextNode('全选'));
        cancel.type = 'button';
        cancel.textContent = '取消';
        download.type = 'button';

        Object.assign(overlay.style, {
            position: 'fixed',
            inset: '0',
            zIndex: '2147483647',
            display: 'grid',
            placeItems: 'center',
            padding: '16px',
            background: 'rgba(0, 0, 0, 0.48)',
        });
        Object.assign(dialog.style, {
            display: 'flex',
            flexDirection: 'column',
            width: 'min(460px, calc(100vw - 32px))',
            maxHeight: 'min(640px, calc(100vh - 32px))',
            overflow: 'hidden',
            color: 'var(--text1, #18191c)',
            background: 'var(--bg1, #fff)',
            border: '1px solid var(--line_regular, #e3e5e7)',
            borderRadius: '8px',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.24)',
        });
        Object.assign(header.style, {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            padding: '16px 18px',
        });
        Object.assign(title.style, {
            minWidth: '0',
            fontSize: '18px',
            lineHeight: '24px',
        });
        Object.assign(selectionLabel.style, {
            display: 'inline-flex',
            alignItems: 'center',
            flexShrink: '0',
            gap: '6px',
            fontSize: '13px',
            cursor: 'pointer',
        });
        selectAll.style.accentColor = '#fb7299';
        Object.assign(list.style, {
            overflowY: 'auto',
            borderTop: '1px solid var(--line_regular, #e3e5e7)',
            borderBottom: '1px solid var(--line_regular, #e3e5e7)',
        });
        Object.assign(footer.style, {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            flexWrap: 'wrap',
            gap: '10px',
            minHeight: '64px',
            padding: '12px 18px',
        });
        Object.assign(count.style, {
            marginRight: 'auto',
            color: 'var(--text3, #9499a0)',
            fontSize: '13px',
        });

        const checkboxes = tracks.map((track, index) => {
            const row = document.createElement('label');
            const checkbox = document.createElement('input');
            const details = document.createElement('span');
            const name = document.createElement('span');
            const code = document.createElement('span');
            const type = document.createElement('span');

            checkbox.type = 'checkbox';
            checkbox.dataset.index = String(index);
            checkbox.style.accentColor = '#fb7299';
            name.textContent = track.lan_doc || track.lan || `轨道 ${index + 1}`;
            code.textContent = track.lan || '';
            type.textContent = isAiSubtitle(track) ? 'AI' : '普通';

            Object.assign(row.style, {
                display: 'grid',
                gridTemplateColumns: '20px minmax(0, 1fr) auto',
                alignItems: 'center',
                gap: '10px',
                minHeight: '56px',
                padding: '8px 18px',
                borderBottom: index === tracks.length - 1 ? 'none' : '1px solid var(--line_regular, #e3e5e7)',
                cursor: 'pointer',
            });
            Object.assign(details.style, {
                display: 'flex',
                flexDirection: 'column',
                minWidth: '0',
                gap: '2px',
            });
            Object.assign(name.style, {
                overflowWrap: 'anywhere',
                fontSize: '14px',
                lineHeight: '20px',
            });
            Object.assign(code.style, {
                color: 'var(--text3, #9499a0)',
                fontSize: '12px',
                lineHeight: '18px',
            });
            Object.assign(type.style, {
                minWidth: '40px',
                padding: '2px 7px',
                color: isAiSubtitle(track) ? '#00aeec' : '#2ac864',
                background: isAiSubtitle(track) ? 'rgba(0, 174, 236, 0.1)' : 'rgba(42, 200, 100, 0.1)',
                borderRadius: '4px',
                fontSize: '12px',
                lineHeight: '18px',
                textAlign: 'center',
            });

            details.append(name, code);
            row.append(checkbox, details, type);
            list.appendChild(row);
            return checkbox;
        });

        for (const button of [cancel, download]) {
            Object.assign(button.style, {
                height: '34px',
                minWidth: '76px',
                padding: '0 14px',
                borderRadius: '4px',
                fontSize: '14px',
                cursor: 'pointer',
            });
        }
        Object.assign(cancel.style, {
            color: 'var(--text2, #61666d)',
            background: 'transparent',
            border: '1px solid var(--line_regular, #c9ccd0)',
        });
        Object.assign(download.style, {
            color: '#fff',
            background: '#fb7299',
            border: '1px solid #fb7299',
        });

        const updateSelection = () => {
            const selectedCount = checkboxes.filter((checkbox) => checkbox.checked).length;
            selectAll.checked = selectedCount === checkboxes.length;
            selectAll.indeterminate = selectedCount > 0 && selectedCount < checkboxes.length;
            count.textContent = `已选 ${selectedCount}/${tracks.length}`;
            download.textContent = selectedCount > 0 ? `下载所选 (${selectedCount})` : '下载所选';
            download.disabled = selectedCount === 0;
            download.style.opacity = download.disabled ? '0.5' : '1';
            download.style.cursor = download.disabled ? 'not-allowed' : 'pointer';
        };

        let settled = false;
        const finish = (selected) => {
            if (settled) {
                return;
            }
            settled = true;
            document.removeEventListener('keydown', handleKeyDown, true);
            overlay.remove();
            resolve(selected);
        };
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                finish([]);
            }
        };

        checkboxes.forEach((checkbox) => checkbox.addEventListener('change', updateSelection));
        selectAll.addEventListener('change', () => {
            checkboxes.forEach((checkbox) => {
                checkbox.checked = selectAll.checked;
            });
            updateSelection();
        });
        cancel.addEventListener('click', () => finish([]));
        download.addEventListener('click', () => {
            finish(tracks.filter((_, index) => checkboxes[index].checked));
        });
        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) {
                finish([]);
            }
        });
        document.addEventListener('keydown', handleKeyDown, true);

        header.append(title, selectionLabel);
        footer.append(count, cancel, download);
        dialog.append(header, list, footer);
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        updateSelection();
        selectAll.focus();
    });
}

async function down_bili_subtitle(onStatus) {
    try {
        setStatus(onStatus, '获取视频信息...', true);
        const info = await getCurrentBiliVideoInfo();
        const title = info.longTitle ? `${info.title} - ${info.longTitle}` : info.title;

        setStatus(onStatus, '获取字幕轨道...', true);
        const tracks = await fetchAllSubtitleTracks(info);
        if (tracks.length === 0) {
            throw new Error('未获取到字幕。AI 字幕需要登录 B 站，且播放器字幕菜单中存在 AI 字幕轨道');
        }

        const normalCount = tracks.filter((track) => !isAiSubtitle(track)).length;
        const aiCount = tracks.length - normalCount;
        console.log(`[字幕下载] 获取到 ${normalCount} 条普通字幕轨道、${aiCount} 条 AI 字幕轨道`);

        setStatus(onStatus, '选择字幕...', true);
        const selectedTracks = await selectSubtitleTracks(tracks);
        if (selectedTracks.length === 0) {
            return;
        }

        let completed = 0;
        const results = await Promise.allSettled(selectedTracks.map(async (track) => {
            const body = await fetchSubtitleBody(track);
            const srt = subtitlesToSrt(body);
            if (!srt) {
                throw new Error(`${track.lan_doc || track.lan} 字幕转换结果为空`);
            }
            completed += 1;
            setStatus(onStatus, `下载字幕 ${completed}/${selectedTracks.length}`, true);
            return {track, srt};
        }));

        const downloaded = results
            .filter((result) => result.status === 'fulfilled')
            .map((result) => result.value);
        const failed = results.filter((result) => result.status === 'rejected');
        for (const result of failed) {
            console.warn('[字幕下载] 字幕正文下载失败', result.reason);
        }

        if (downloaded.length === 0) {
            throw new Error('所有字幕轨道均下载失败，签名地址可能已过期，请重试');
        }

        setStatus(onStatus, '打包字幕...', true);
        const files = {};
        const usedNames = new Set();
        downloaded.forEach(({track, srt}, index) => {
            files[subtitleFileName(track, index, usedNames)] = strToU8(`\uFEFF${srt}`);
        });
        const archive = zipSync(files, {level: 6});
        const blob = new Blob([archive], {type: 'application/zip'});
        saveAs(blob, `${safeFileName(title)} - 字幕.zip`);

        if (failed.length > 0) {
            alert(`已下载 ${downloaded.length}/${selectedTracks.length} 条字幕轨道，其余轨道下载失败，详情见控制台`);
        }
    } catch (error) {
        console.error('[字幕下载] 下载失败', error);
        alert(`下载字幕失败: ${error.message}`);
    }
}

export {
    down_bili_subtitle,
};
