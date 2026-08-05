const textDecoder = new TextDecoder();

function toBytes(payload) {
    if (payload instanceof Uint8Array) {
        return payload;
    }
    if (payload instanceof ArrayBuffer) {
        return new Uint8Array(payload);
    }
    if (ArrayBuffer.isView(payload)) {
        return new Uint8Array(payload.buffer, payload.byteOffset, payload.byteLength);
    }
    throw new TypeError('Protobuf 数据必须是 ArrayBuffer 或 Uint8Array');
}

function readVarint(bytes, start) {
    let value = 0n;
    let shift = 0n;
    let position = start;

    while (position < bytes.length && shift < 70n) {
        const byte = BigInt(bytes[position++]);
        value |= (byte & 0x7fn) << shift;
        if ((byte & 0x80n) === 0n) {
            return {value, position};
        }
        shift += 7n;
    }

    throw new Error('无效的 Protobuf varint');
}

function decodeMessage(payload) {
    const bytes = toBytes(payload);
    const fields = [];
    let position = 0;

    while (position < bytes.length) {
        const keyResult = readVarint(bytes, position);
        const fieldNumber = Number(keyResult.value >> 3n);
        const wireType = Number(keyResult.value & 0x7n);
        position = keyResult.position;

        if (fieldNumber <= 0) {
            throw new Error('无效的 Protobuf 字段编号');
        }

        if (wireType === 0) {
            const valueResult = readVarint(bytes, position);
            fields.push({number: fieldNumber, wireType, value: valueResult.value});
            position = valueResult.position;
            continue;
        }

        if (wireType === 1 || wireType === 5) {
            const size = wireType === 1 ? 8 : 4;
            const end = position + size;
            if (end > bytes.length) {
                throw new Error('Protobuf 固定长度字段不完整');
            }
            fields.push({number: fieldNumber, wireType, data: bytes.slice(position, end)});
            position = end;
            continue;
        }

        if (wireType === 2) {
            const lengthResult = readVarint(bytes, position);
            const length = Number(lengthResult.value);
            if (!Number.isSafeInteger(length)) {
                throw new Error('Protobuf 字段长度超出安全范围');
            }
            const end = lengthResult.position + length;
            if (end > bytes.length) {
                throw new Error('Protobuf 字节字段不完整');
            }
            fields.push({
                number: fieldNumber,
                wireType,
                data: bytes.slice(lengthResult.position, end),
            });
            position = end;
            continue;
        }

        throw new Error(`暂不支持 Protobuf wire type ${wireType}`);
    }

    return fields;
}

function firstField(fields, number, wireType) {
    return fields.find((field) => field.number === number && field.wireType === wireType);
}

function fieldText(fields, number) {
    const field = firstField(fields, number, 2);
    return field?.data ? textDecoder.decode(field.data) : '';
}

function fieldVarint(fields, number) {
    return firstField(fields, number, 0)?.value;
}

function parseWebSubtitleReply(payload) {
    const topFields = decodeMessage(payload);
    const data = firstField(topFields, 1, 2)?.data;
    if (!data) {
        return [];
    }

    // data.field 3 is a track; track fields 3/4/5 are language, label, and signed URL.
    return decodeMessage(data)
        .filter((field) => field.number === 3 && field.wireType === 2 && field.data)
        .map((field) => {
            const fields = decodeMessage(field.data);
            const id = fieldVarint(fields, 1);
            const idStr = fieldText(fields, 2) || id?.toString() || '';

            return {
                id: id?.toString() || '',
                id_str: idStr,
                lan: fieldText(fields, 3),
                lan_doc: fieldText(fields, 4),
                subtitle_url: fieldText(fields, 5),
            };
        })
        .filter((track) => track.lan && track.subtitle_url);
}

function isAiSubtitle(track) {
    const language = String(track?.lan || '').toLowerCase();
    const languageName = String(track?.lan_doc || '');
    const subtitleUrl = String(track?.subtitle_url || '').toLowerCase();
    const aiStatus = Number(track?.ai_status || 0);
    const aiType = Number(track?.ai_type || 0);

    return language.startsWith('ai-')
        || aiStatus !== 0
        || aiType !== 0
        || /(?:^|\W)ai(?:\W|$)|自动生成/i.test(languageName)
        || subtitleUrl.includes('aisubtitle.');
}

function trackKey(track) {
    const id = track.id_str || track.id;
    if (id !== undefined && id !== null && String(id)) {
        return `id:${id}`;
    }
    return `language:${track.lan || ''}:${track.lan_doc || ''}`;
}

function subtitleUrls(track) {
    return [...new Set([
        track?.subtitle_url,
        ...(Array.isArray(track?.subtitle_urls) ? track.subtitle_urls : []),
    ]
        .map((url) => String(url || '').trim())
        .filter(Boolean))];
}

function mergeSubtitleTracks(...trackLists) {
    const tracks = new Map();

    for (const list of trackLists) {
        for (const track of Array.isArray(list) ? list : []) {
            if (!track || !track.lan) {
                continue;
            }

            const key = trackKey(track);
            const previous = tracks.get(key) || {};
            const urls = [...new Set([
                ...subtitleUrls(previous),
                ...subtitleUrls(track),
            ])];
            tracks.set(key, {
                ...previous,
                ...track,
                id_str: track.id_str || previous.id_str || '',
                lan_doc: track.lan_doc || previous.lan_doc || track.lan,
                subtitle_url: previous.subtitle_url || track.subtitle_url || urls[0] || '',
                subtitle_urls: urls,
            });
        }
    }

    return [...tracks.values()]
        .filter((track) => track.subtitle_urls.length > 0)
        .sort((a, b) => {
            const typeOrder = Number(isAiSubtitle(a)) - Number(isAiSubtitle(b));
            return typeOrder || String(a.lan).localeCompare(String(b.lan));
        });
}

function srtTimestamp(seconds) {
    const milliseconds = Math.max(0, Math.round(Number(seconds || 0) * 1000));
    const hours = Math.floor(milliseconds / 3600000);
    const minutes = Math.floor((milliseconds % 3600000) / 60000);
    const secs = Math.floor((milliseconds % 60000) / 1000);
    const millis = milliseconds % 1000;

    return [
        String(hours).padStart(2, '0'),
        String(minutes).padStart(2, '0'),
        String(secs).padStart(2, '0'),
    ].join(':') + `,${String(millis).padStart(3, '0')}`;
}

function subtitlesToSrt(items) {
    if (!Array.isArray(items)) {
        throw new TypeError('字幕正文不是数组');
    }

    return items
        .map((item) => ({
            from: Math.max(0, Number(item?.from || 0)),
            to: Math.max(0, Number(item?.to || item?.from || 0)),
            content: String(item?.content || '').replace(/\r\n?/g, '\n').trim(),
        }))
        .filter((item) => item.content)
        .map((item, index) => {
            const end = Math.max(item.from, item.to);
            return `${index + 1}\n${srtTimestamp(item.from)} --> ${srtTimestamp(end)}\n${item.content}`;
        })
        .join('\n\n');
}

export {
    isAiSubtitle,
    mergeSubtitleTracks,
    parseWebSubtitleReply,
    subtitlesToSrt,
};
