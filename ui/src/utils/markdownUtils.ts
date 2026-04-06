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

export function parseMarkdown(text: string): string {
    if (!text) return '';
    
    let result = text;
    
    result = result.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
        return `\n[代码]\n${code.trim()}\n[/代码]\n`;
    });
    
    result = result.replace(/`([^`]+)`/g, '[$1]');
    
    result = result.replace(/\*\*\*([^*]+)\*\*\*/g, '***$1***');
    result = result.replace(/\*\*([^*]+)\*\*/g, '**$1**');
    result = result.replace(/\*([^*]+)\*/g, '*$1*');
    
    result = result.replace(/___([^_]+)___/g, '___$1___');
    result = result.replace(/__([^_]+)__/g, '__$1__');
    result = result.replace(/_([^_]+)_/g, '_$1_');
    
    result = result.replace(/^#{1,6}\s+(.+)$/gm, '【$1】');
    
    result = result.replace(/^\*\s+(.+)$/gm, '• $1');
    result = result.replace(/^-\s+(.+)$/gm, '• $1');
    result = result.replace(/^\d+\.\s+(.+)$/gm, '  $1');
    
    result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)');
    
    result = result.replace(/&/g, '&amp;');
    result = result.replace(/</g, '&lt;');
    result = result.replace(/>/g, '&gt;');
    
    return result;
}

export function parseEmoji(text: string): string {
    if (!text) return '';
    
    const emojiMap: { [key: string]: string } = {
        ':)': '😊',
        ':-)': '😊',
        ':(': '😢',
        ':-(': '😢',
        ':D': '😀',
        ':-D': '😀',
        ';)': '😉',
        ';-)': '😉',
        ':P': '😛',
        ':-P': '😛',
        ':O': '😮',
        ':-O': '😮',
        ':|': '😐',
        ':-|': '😐',
        ':/': '😕',
        ':-/': '😕',
        '<3': '❤️',
        '</3': '💔',
        ':star:': '⭐',
        ':fire:': '🔥',
        ':check:': '✅',
        ':cross:': '❌',
        ':warning:': '⚠️',
        ':info:': 'ℹ️',
        ':question:': '❓',
        ':exclamation:': '❗',
        ':thumbsup:': '👍',
        ':thumbsdown:': '👎',
        ':clap:': '👏',
        ':rocket:': '🚀',
        ':bulb:': '💡',
        ':book:': '📖',
        ':computer:': '💻',
        ':phone:': '📱',
        ':email:': '📧',
        ':link:': '🔗',
        ':gear:': '⚙️',
        ':wrench:': '🔧',
        ':hammer:': '🔨',
        ':key:': '🔑',
        ':lock:': '🔒',
        ':unlock:': '🔓',
        ':eye:': '👁️',
        ':ear:': '👂',
        ':hand:': '✋',
        ':point_up:': '☝️',
        ':point_down:': '👇',
        ':point_left:': '👈',
        ':point_right:': '👉',
        ':ok:': '👌',
        ':victory:': '✌️',
        ':fist:': '✊',
        ':muscle:': '💪',
        ':pray:': '🙏',
        ':wave:': '👋',
        ':raised_hand:': '🖐️',
        ':writing:': '✍️',
        ':pencil:': '✏️',
        ':memo:': '📝',
        ':file:': '📄',
        ':folder:': '📁',
        ':chart:': '📊',
        ':graph:': '📈',
        ':calendar:': '📅',
        ':clock:': '🕐',
        ':alarm:': '⏰',
        ':stopwatch:': '⏱️',
        ':timer:': '⏲️',
        ':hourglass:': '⌛',
        ':sun:': '☀️',
        ':moon:': '🌙',
        ':star2:': '🌟',
        ':cloud:': '☁️',
        ':rain:': '🌧️',
        ':snow:': '❄️',
        ':lightning:': '⚡',
        ':rainbow:': '🌈',
        ':umbrella:': '☂️',
        ':flower:': '🌸',
        ':tree:': '🌳',
        ':apple:': '🍎',
        ':banana:': '🍌',
        ':pizza:': '🍕',
        ':cake:': '🎂',
        ':coffee:': '☕',
        ':tea:': '🍵',
        ':beer:': '🍺',
        ':wine:': '🍷',
        ':cocktail:': '🍹',
        ':gift:': '🎁',
        ':balloon:': '🎈',
        ':party:': '🎉',
        ':confetti:': '🎊',
        ':ribbon:': '🎀',
        ':heart:': '❤️',
        ':orange_heart:': '🧡',
        ':yellow_heart:': '💛',
        ':green_heart:': '💚',
        ':blue_heart:': '💙',
        ':purple_heart:': '💜',
        ':black_heart:': '🖤',
        ':white_heart:': '🤍',
        ':broken_heart:': '💔',
        ':sparkling_heart:': '💖',
        ':two_hearts:': '💕',
        ':heart_exclamation:': '❣️',
        ':kiss:': '💋',
        ':smile:': '😄',
        ':grin:': '😁',
        ':joy:': '😂',
        ':rofl:': '🤣',
        ':wink:': '😉',
        ':blush:': '😊',
        ':sunglasses:': '😎',
        ':heart_eyes:': '😍',
        ':kissing_heart:': '😘',
        ':thinking:': '🤔',
        ':neutral:': '😐',
        ':expressionless:': '😑',
        ':confused:': '😕',
        ':kissing:': '😗',
        ':kissing_smiling_eyes:': '😙',
        ':stuck_out_tongue:': '😛',
        ':stuck_out_tongue_winking_eye:': '😜',
        ':stuck_out_tongue_closed_eyes:': '😝',
        ':disappointed:': '😞',
        ':worried:': '😟',
        ':angry:': '😠',
        ':rage:': '😡',
        ':cry:': '😢',
        ':persevere:': '😣',
        ':triumph:': '😤',
        ':disappointed_relieved:': '😥',
        ':frowning:': '😦',
        ':anguished:': '😧',
        ':fearful:': '😨',
        ':weary:': '😩',
        ':sleepy:': '😪',
        ':tired_face:': '😫',
        ':grimacing:': '😬',
        ':sob:': '😭',
        ':open_mouth:': '😮',
        ':hushed:': '😯',
        ':cold_sweat:': '😰',
        ':scream:': '😱',
        ':astonished:': '😲',
        ':flushed:': '😳',
        ':sleeping:': '😴',
        ':dizzy_face:': '😵',
        ':no_mouth:': '😶',
        ':mask:': '😷',
        ':smile_cat:': '😸',
        ':joy_cat:': '😹',
        ':smiley_cat:': '😺',
        ':heart_eyes_cat:': '😻',
        ':smirk_cat:': '😼',
        ':kissing_cat:': '😽',
        ':pouting_cat:': '😾',
        ':crying_cat_face:': '😿',
        ':scream_cat:': '🙀'
    };
    
    let result = text;
    
    for (const [key, value] of Object.entries(emojiMap)) {
        result = result.split(key).join(value);
    }
    
    return result;
}

export function formatMessage(text: string): string {
    if (!text) return '';
    
    let result = parseMarkdown(text);
    result = parseEmoji(result);
    
    return result;
}
