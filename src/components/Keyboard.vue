<template>
    <div v-if="visible" class="kb">
        <div class="kb-head">
            <div class="kb-display">
                <scroller class="kb-display-scroll" scroll-direction="horizontal" :show-scrollbar="false">
                    <text :class="'kb-display-text' + (text ? '' : ' kb-display-placeholder')">{{ displayText }}</text>
                </scroller>
            </div>
            <text class="kb-close" @click="close">收起</text>
        </div>

        <div class="kb-cand">
            <text v-if="hasPinyin" class="kb-pinyin">{{ pinyinBuffer }}</text>
            <scroller class="kb-cand-scroll" scroll-direction="horizontal" :show-scrollbar="false">
                <div class="kb-cand-inner">
                    <text v-for="(item, index) in candidates" :key="index" class="kb-cand-item"
                        @click="selectCandidate(item)">{{ item }}</text>
                    <text v-if="!candidates.length" class="kb-cand-tip">{{ layout === 'cn' ? '拼音输入' : (layout === 'en' ? '英文输入' : '数字符号') }}</text>
                </div>
            </scroller>
        </div>

        <!-- 中文 / 英文：QWERTY -->
        <div v-if="layout === 'cn' || layout === 'en'" class="kb-keys">
            <div class="kb-row">
                <text v-for="ch in qwertyRows[0]" :key="ch" class="key" @click="onLetter(ch)">{{ displayKey(ch) }}</text>
            </div>
            <div class="kb-row kb-row-middle">
                <text v-for="ch in qwertyRows[1]" :key="ch" class="key" @click="onLetter(ch)">{{ displayKey(ch) }}</text>
            </div>
            <div class="kb-row">
                <text :class="'key key-fn' + (shifted ? ' key-fn-on' : '')" @click="toggleShift">⇧</text>
                <text v-for="ch in qwertyRows[2]" :key="ch" class="key" @click="onLetter(ch)">{{ displayKey(ch) }}</text>
                <text class="key key-fn" @touchstart.stop="bsTouchStart" @touchend.stop="bsTouchEnd"
                    @touchcancel.stop="bsTouchEnd" @click="bsClick">⌫</text>
            </div>
            <div class="kb-row kb-row-bottom">
                <text class="key key-fn2" @click="switchLayout('num')">123</text>
                <text class="key key-fn2" @click="switchLayout(layout === 'cn' ? 'en' : 'cn')">{{ layout === 'cn' ? '中' : '英' }}</text>
                <text class="key key-fn2" @click="onCommaOrPeriod(',')">，</text>
                <text class="key key-space" @click="onSpace">空格</text>
                <text class="key key-fn2" @click="onCommaOrPeriod('.')">。</text>
                <text class="key key-action" @click="onEnter">发送</text>
            </div>
        </div>

        <!-- 数字 -->
        <div v-else-if="layout === 'num'" class="kb-keys">
            <div v-for="(row, rowIndex) in numRows" :key="rowIndex" class="kb-row">
                <text v-for="ch in row" :key="ch" class="key key-num" @click="onSymbol(ch)">{{ ch }}</text>
            </div>
            <div class="kb-row kb-row-bottom">
                <text class="key key-fn2" @click="switchLayout('en')">ABC</text>
                <text class="key key-fn2" @click="switchSymbolPage">符</text>
                <text class="key key-space" @click="onSpace">空格</text>
                <text class="key key-fn" @touchstart.stop="bsTouchStart" @touchend.stop="bsTouchEnd"
                    @touchcancel.stop="bsTouchEnd" @click="bsClick">⌫</text>
                <text class="key key-action" @click="onEnter">发送</text>
            </div>
        </div>

        <!-- 符号 -->
        <div v-else class="kb-keys">
            <div v-for="(row, rowIndex) in symRows" :key="rowIndex" class="kb-row">
                <text v-for="ch in row" :key="rowIndex + '-' + ch" class="key key-num" @click="onSymbol(ch)">{{ ch }}</text>
            </div>
            <div class="kb-row kb-row-bottom">
                <text class="key key-fn2" @click="switchLayout('num')">123</text>
                <text class="key key-fn2" @click="switchLayout('cn')">中</text>
                <text class="key key-space" @click="onSpace">空格</text>
                <text class="key key-fn" @touchstart.stop="bsTouchStart" @touchend.stop="bsTouchEnd"
                    @touchcancel.stop="bsTouchEnd" @click="bsClick">⌫</text>
                <text class="key key-action" @click="onEnter">发送</text>
            </div>
        </div>
    </div>
</template>

<style lang="less" scoped>
@import url('Keyboard.less');
</style>

<script>
import Keyboard from './Keyboard';
export default Keyboard;
</script>
