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
    ai: '🤖',
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
    arrow_down: '↓'
};

export function getIcon(name: string): string {
    return icons[name] || '📌';
}

export function getIconColor(name: string): string {
    const colors: { [key: string]: string } = {
        ai: '#6366f1',
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
        info: '#0ea5e9'
    };
    return colors[name] || '#6b7280';
}
