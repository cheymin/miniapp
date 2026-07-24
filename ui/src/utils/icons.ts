// Copyright (C) 2025 Langning Chen
//
// This file is part of miniapp.
//
// miniapp is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// miniapp is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with miniapp.  If not, see <https://www.gnu.org/licenses/>.

export const icons: { [key: string]: string } = {
    // 应用入口
    ai: '🤖',
    chat: '💬',
    folder: '📁',
    image: '🖼️',
    eye: '👁️',
    music: '🎵',
    calculator: '🔢',
    'qr-code': '📱',
    repeat: '🔄',
    globe: '🌐',
    message: '💬',
    terminal: '⌨️',
    download: '⬇️',
    smartphone: '📱',
    settings: '⚙️',
    info: 'ℹ️',
    // 操作
    send: '📤',
    back: '◀️',
    plus: '➕',
    close: '❌',
    check: '✅',
    bell: '🔔',
    calendar: '📅',
    clock: '🕐',
    user: '👤',
    users: '👥',
    search: '🔍',
    edit: '✏️',
    trash: '🗑️',
    refresh: '🔄',
    wifi: '📶',
    battery: '🔋',
    volume: '🔊',
    moon: '🌙',
    sun: '☀️',
    star: '⭐',
    heart: '❤️',
    home: '🏠',
    menu: '☰',
    arrow_left: '←',
    arrow_right: '→',
    arrow_up: '↑',
    arrow_down: '↓',
    // 新增模块
    webdav: '☁️',
    cloud: '☁️',
    'cloud-upload': '⬆️',
    'cloud-download': '⬇️',
    backup: '💾',
    restore: '♻️',
    memos: '📝',
    note: '🗒️',
    'note-add': '➕',
    mic: '🎤',
    voice: '🎙️',
    install: '📦',
    package: '📦',
    file: '📄',
    'file-code': '📜',
    'file-image': '🖼️',
    'file-music': '🎵',
    'file-zip': '🗜️',
    link: '🔗',
    shield: '🛡️',
    palette: '🎨',
    photo: '🌄',
    list: '📋',
    tag: '🏷️',
    pin: '📌',
    bookmark: '🔖',
    copy: '📋',
    cut: '✂️',
    paste: '📋',
    save: '💾',
    open: '📂',
    stop: '⏹️',
    play: '▶️',
    pause: '⏸️',
    warn: '⚠️',
    question: '❓',
    lock: '🔒',
    unlock: '🔓',
    key: '🔑',
    sync: '🔄',
    upload: '📤',
    history: '🕰️',
    nav: '🧭',
    regen: '🔁',
    thinking: '💭',
    clipboard: '📋',
    doc: '📄',
    video: '🎬'
};

export function getIcon(name: string): string {
    return icons[name] || '📌';
}

// 图标主题色（用于彩色底块，提升视觉层次）
export function getIconColor(name: string): string {
    const colors: { [key: string]: string } = {
        ai: '#6366f1',
        chat: '#22c55e',
        folder: '#f59e0b',
        image: '#10b981',
        eye: '#3b82f6',
        music: '#ec4899',
        calculator: '#8b5cf6',
        'qr-code': '#06b6d4',
        repeat: '#f97316',
        globe: '#3b82f6',
        message: '#22c55e',
        terminal: '#1e293b',
        download: '#0ea5e9',
        smartphone: '#64748b',
        settings: '#6b7280',
        info: '#0ea5e9',
        webdav: '#0ea5e9',
        cloud: '#0ea5e9',
        backup: '#8b5cf6',
        restore: '#f97316',
        memos: '#eab308',
        note: '#f59e0b',
        mic: '#ef4444',
        voice: '#ef4444',
        install: '#10b981',
        package: '#10b981',
        file: '#64748b',
        link: '#3b82f6',
        palette: '#ec4899',
        photo: '#10b981',
        list: '#6366f1',
        bookmark: '#f59e0b',
        save: '#8b5cf6',
        stop: '#ef4444',
        play: '#22c55e',
        warn: '#f59e0b',
        key: '#eab308',
        sync: '#0ea5e9',
        upload: '#0ea5e9',
        history: '#64748b',
        nav: '#3b82f6',
        thinking: '#a855f7',
        video: '#ec4899',
        doc: '#64748b'
    };
    return colors[name] || '#6b7280';
}

// 模块入口图标（首页专用，统一外观）
export function getModuleIcon(name: string): { icon: string; color: string } {
    return { icon: getIcon(name), color: getIconColor(name) };
}
