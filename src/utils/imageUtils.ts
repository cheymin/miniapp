// 图片地址与尺寸工具。
//
// 设备端图片由框架的 ImageLoader（curl）加载，使用要点参考 56dz/PenBili：
//   - <image> 必须给出明确的 width/height，否则不会按预期占位或加载；
//   - 协议相对地址要补成绝对地址；
//   - 固件的 CA 证书库可能不完整，必要时可把 https 降级为 http（forceHttp）。

export function normalizeImageUrl(url: string, forceHttp = false): string {
    const value = (url || '').trim();
    if (!value) { return ''; }

    // 本地绝对路径：Weex/Falcon 的 ImageLoader 需要 file:// 协议。
    if (value.startsWith('/')) {
        return `file://${value}`;
    }
    if (value.startsWith('//')) {
        return `http:${value}`;
    }
    if (forceHttp && /^https:/i.test(value)) {
        return `http:${value.slice('https:'.length)}`;
    }
    return value;
}

/**
 * 按原图宽高比计算显示高度，用于封面/缩略图占位。
 */
export function imageHeightForWidth(
    naturalWidth: number,
    naturalHeight: number,
    displayWidth: number,
    fallbackHeight = 0
): number {
    if (naturalWidth <= 0 || naturalHeight <= 0 || displayWidth <= 0) {
        return fallbackHeight;
    }
    return Math.round((displayWidth * naturalHeight) / naturalWidth);
}
