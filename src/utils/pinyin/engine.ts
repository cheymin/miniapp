// 本地拼音输入引擎（不依赖 Rime）。
//
// 结构参考 Loli tools_keyboard 的本地兜底实现：
//   - 音节表 -> 单字候选
//   - 内置词 + 用户词频 -> 整词候选
//   - 全拼 / 首字母缩写 / 前缀补全
// 用户词频写入框架 storage，不落文件。

import { PINYIN_SYLLABLES, MAX_SYLLABLE_LENGTH } from './table';

export interface UserWord {
    word: string;
    pinyin: string;
    freq: number;
}

const STORAGE_KEY = 'cheymin_keyboard_words';
const MAX_USER_WORDS = 400;

// 常用词表：整词候选的兜底。pinyin 用空格分词。
const BUILTIN_WORDS: string[][] = [
    ['你好', 'ni hao'],
    ['您好', 'nin hao'],
    ['我们', 'wo men'],
    ['你们', 'ni men'],
    ['他们', 'ta men'],
    ['什么', 'shen me'],
    ['怎么', 'zen me'],
    ['为什么', 'wei shen me'],
    ['可以', 'ke yi'],
    ['一起', 'yi qi'],
    ['今天', 'jin tian'],
    ['明天', 'ming tian'],
    ['昨天', 'zuo tian'],
    ['现在', 'xian zai'],
    ['时间', 'shi jian'],
    ['天气', 'tian qi'],
    ['谢谢', 'xie xie'],
    ['好的', 'hao de'],
    ['中国', 'zhong guo'],
    ['大家', 'da jia'],
    ['晚上', 'wan shang'],
    ['早上', 'zao shang'],
    ['文化', 'wen hua'],
    ['知道', 'zhi dao'],
    ['觉得', 'jue de'],
    ['手机', 'shou ji'],
    ['电脑', 'dian nao'],
    ['帮我', 'bang wo'],
    ['请问', 'qing wen'],
    ['一下', 'yi xia'],
    ['搜索', 'sou suo'],
    ['打开', 'da kai'],
    ['关闭', 'guan bi'],
    ['设置', 'she zhi'],
    ['图片', 'tu pian'],
    ['视频', 'shi pin'],
    ['音乐', 'yin yue'],
    ['文件', 'wen jian'],
    ['应用', 'ying yong'],
    ['翻译', 'fan yi'],
    ['写一篇', 'xie yi pian'],
    ['介绍一下', 'jie shao yi xia'],
    ['帮我写', 'bang wo xie'],
    ['怎么办', 'zen me ban'],
    ['没关系', 'mei guan xi'],
    ['对不起', 'dui bu qi'],
    ['早上好', 'zao shang hao'],
    ['晚安', 'wan an'],
    ['吃饭', 'chi fan'],
    ['睡觉', 'shui jiao'],
    ['学习', 'xue xi'],
    ['工作', 'gong zuo'],
    ['朋友', 'peng you'],
    ['喜欢', 'xi huan'],
    ['需要', 'xu yao'],
    ['问题', 'wen ti'],
    ['因为', 'yin wei'],
    ['所以', 'suo yi'],
    ['但是', 'dan shi'],
    ['而且', 'er qie'],
    ['然后', 'ran hou'],
    ['已经', 'yi jing'],
    ['正在', 'zheng zai'],
    ['没有', 'mei you'],
    ['不是', 'bu shi'],
    ['一个', 'yi ge'],
    ['这个', 'zhe ge'],
    ['那个', 'na ge'],
    ['哪里', 'na li'],
    ['这里', 'zhe li'],
    ['非常', 'fei chang'],
    ['高兴', 'gao xing'],
    ['帮助', 'bang zhu'],
    ['希望', 'xi wang'],
    ['开始', 'kai shi'],
    ['结束', 'jie shu'],
    ['输入法', 'shu ru fa'],
    ['拼音', 'pin yin'],
    ['键盘', 'jian pan'],
    ['候选', 'hou xuan'],
    ['图库', 'tu ku'],
    ['相册', 'xiang ce'],
    ['播放器', 'bo fang qi'],
    ['文件管理', 'wen jian guan li'],
    ['设置', 'she zhi'],
    ['更新', 'geng xin'],
    ['北京', 'bei jing'],
    ['上海', 'shang hai'],
    ['深圳', 'shen zhen'],
    ['广州', 'guang zhou'],
    ['电影', 'dian ying'],
    ['游戏', 'you xi'],
    ['微信', 'wei xin'],
    ['电话', 'dian hua'],
    ['名字', 'ming zi'],
    ['学校', 'xue xiao'],
    ['公司', 'gong si'],
    ['老师', 'lao shi'],
    ['学生', 'xue sheng'],
    ['同学', 'tong xue'],
    ['妈妈', 'ma ma'],
    ['爸爸', 'ba ba'],
    ['孩子', 'hai zi'],
    ['总结', 'zong jie'],
    ['解释', 'jie shi'],
    ['推荐', 'tui jian'],
    ['告诉我', 'gao su wo'],
    ['有没有', 'you mei you'],
    ['润色', 'run se'],
    ['生成', 'sheng cheng'],
    ['修改', 'xiu gai'],
    ['帮我翻译', 'bang wo fan yi'],
    ['写作文', 'xie zuo wen'],
    ['优化', 'you hua'],
];

interface PreparedWord {
    word: string;
    plain: string;
    initials: string;
    segments: string[];
    builtinOrder: number;
    freq: number;
}

let prepared: PreparedWord[] | null = null;
let userWords: UserWord[] = [];
let storageLoaded = false;
let saveTimer: any = null;

function prepareBuiltin(): PreparedWord[] {
    return BUILTIN_WORDS.map((item, index) => {
        const segments = item[1].split(' ');
        return {
            word: item[0],
            plain: segments.join(''),
            initials: segments.map((seg) => seg.charAt(0)).join(''),
            segments,
            builtinOrder: index,
            freq: 0,
        };
    });
}

export function normalizePinyinInput(input: string): string {
    return (input || '')
        .toLowerCase()
        .replace(/ü/g, 'v')
        .replace(/[^a-z]/g, '');
}

export function derivePinyinInitials(input: string): string {
    return (input || '')
        .split(/\s+/)
        .filter(Boolean)
        .map((item) => item.charAt(0))
        .join('');
}

/** 尽量把一个拼音串切成音节；末尾允许出现未完成音节。 */
export function segmentPinyin(input: string): { syllables: string[]; partial: string } {
    const value = normalizePinyinInput(input);
    const syllables: string[] = [];
    let index = 0;
    while (index < value.length) {
        let matched = '';
        const max = Math.min(MAX_SYLLABLE_LENGTH, value.length - index);
        for (let len = max; len >= 1; len -= 1) {
            const candidate = value.substr(index, len);
            if (PINYIN_SYLLABLES[candidate]) {
                matched = candidate;
                break;
            }
        }
        if (!matched) {
            return { syllables, partial: value.slice(index) };
        }
        syllables.push(matched);
        index += matched.length;
    }
    return { syllables, partial: '' };
}

/** 找出所有以 partial 开头的音节，用于首字母/半截拼音的候选。 */
function syllablesStartingWith(partial: string): string[] {
    if (!partial) { return []; }
    const keys = Object.keys(PINYIN_SYLLABLES);
    return keys.filter((key) => key.indexOf(partial) === 0);
}

function charsOf(syllable: string, limit: number): string[] {
    const raw = PINYIN_SYLLABLES[syllable] || '';
    return raw.split('').slice(0, limit);
}

function buildCombos(syllables: string[], limit: number): string[] {
    if (!syllables.length) { return []; }
    const pools = syllables.map((syllable) => charsOf(syllable, 3));
    const result: string[] = [];
    const walk = (depth: number, current: string) => {
        if (result.length >= limit) { return; }
        if (depth >= pools.length) {
            result.push(current);
            return;
        }
        for (const ch of pools[depth]) {
            if (result.length >= limit) { return; }
            walk(depth + 1, current + ch);
        }
    };
    walk(0, '');
    return result;
}

function wordScore(item: PreparedWord, input: string, initials: string, allowInitials: boolean): number {
    let score = item.freq * 1000;
    if (item.plain === input) {
        score += 600;
    } else if (item.plain.indexOf(input) === 0) {
        score += 460;
    } else if (allowInitials && initials && item.initials === initials) {
        score += 320;
    } else if (allowInitials && initials && item.initials.indexOf(initials) === 0) {
        score += 220;
    } else if (input.length >= 2 && item.plain.indexOf(input) >= 0) {
        score += 80;
    } else {
        return -1;
    }
    return score - item.builtinOrder;
}

function ensurePrepared(): PreparedWord[] {
    if (!prepared) { prepared = prepareBuiltin(); }
    return prepared;
}

function allWords(): PreparedWord[] {
    const base = ensurePrepared();
    const extra: PreparedWord[] = userWords.map((item, index) => {
        const segments = item.pinyin.split(' ').filter(Boolean);
        return {
            word: item.word,
            plain: segments.join(''),
            initials: segments.map((seg) => seg.charAt(0)).join(''),
            segments,
            builtinOrder: 10000 + index,
            freq: item.freq,
        };
    });
    return extra.concat(base);
}

/**
 * 生成候选词。返回去重后的候选列表。
 */
export function buildCandidates(input: string, limit = 24): string[] {
    const value = normalizePinyinInput(input);
    if (!value) { return []; }

    const { syllables, partial } = segmentPinyin(value);
    // 没有完整音节时，把整串输入当作首字母缩写来匹配词组。
    const allowInitials = syllables.length === 0;
    const initials = allowInitials ? value : '';
    const output: string[] = [];
    const seen: { [key: string]: boolean } = {};
    const push = (word: string) => {
        if (!word || seen[word] || output.length >= limit) { return; }
        seen[word] = true;
        output.push(word);
    };

    const scored = allWords()
        .map((item) => ({ item, score: wordScore(item, value, initials, allowInitials) }))
        .filter((entry) => entry.score >= 0)
        .sort((a, b) => b.score - a.score);

    // 输入正好是一个完整音节时，优先给单字（例如 ni -> 你）。
    if (syllables.length === 1 && !partial) {
        charsOf(syllables[0], 16).forEach(push);
        scored.slice(0, 10).forEach((entry) => push(entry.item.word));
        return output;
    }

    // 1. 整词候选
    scored.slice(0, 10).forEach((entry) => push(entry.item.word));

    // 2. 音节组合（多音节时按常用字拼）
    const combos = buildCombos(syllables, 12);
    combos.forEach(push);

    // 3. 单字候选
    if (syllables.length) {
        charsOf(syllables[syllables.length - 1], 16).forEach(push);
    }

    // 4. 末尾未完成音节：补全所有可能的音节，再取单字
    if (partial) {
        const tails = syllablesStartingWith(partial).slice(0, 6);
        tails.forEach((tail) => charsOf(tail, 8).forEach(push));
    }

    return output;
}

export async function loadUserWords(): Promise<void> {
    if (storageLoaded) { return; }
    storageLoaded = true;
    try {
        const result = await $falcon.jsapi.storage.getStorage({ key: STORAGE_KEY });
        const raw = (result && result.data) || '';
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                userWords = parsed
                    .filter((item) => item && typeof item.word === 'string' && typeof item.pinyin === 'string')
                    .slice(0, MAX_USER_WORDS);
            }
        }
    } catch {
        userWords = [];
    }
}

function scheduleSave() {
    if (saveTimer) { return; }
    saveTimer = setTimeout(() => {
        saveTimer = null;
        const data = JSON.stringify(userWords.slice(0, MAX_USER_WORDS));
        $falcon.jsapi.storage.setStorage({ key: STORAGE_KEY, data }).catch(() => undefined);
    }, 400);
}

export function recordUserWord(word: string, pinyin: string): void {
    const trimmed = (word || '').trim();
    if (!trimmed || trimmed.length > 12) { return; }
    const plain = normalizePinyinInput(pinyin);
    if (!plain) { return; }

    const existing = userWords.find((item) => item.word === trimmed);
    if (existing) {
        existing.freq += 1;
        existing.pinyin = pinyin;
    } else {
        userWords.unshift({ word: trimmed, pinyin, freq: 1 });
        if (userWords.length > MAX_USER_WORDS) {
            userWords = userWords.slice(0, MAX_USER_WORDS);
        }
    }
    scheduleSave();
}

export async function clearLearnedWords(): Promise<void> {
    userWords = [];
    scheduleSave();
    try {
        await $falcon.jsapi.storage.setStorage({ key: STORAGE_KEY, data: '[]' });
    } catch {
        // 忽略
    }
}

export function getLearnedWordCount(): number {
    return userWords.length;
}
