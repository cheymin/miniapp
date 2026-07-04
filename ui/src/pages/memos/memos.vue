<!--
 Copyright (C) 2025 Langning Chen

 This file is part of miniapp.

 miniapp is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 miniapp is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with miniapp.  If not, see <https://www.gnu.org/licenses/>.
-->

<template>
    <div class="container">
        <div class="header">
            <text class="title">备忘录</text>
            <text class="count">{{ searchMode ? ('找到 ' + filteredMemos.length + ' 条') : ('共 ' + memos.length + ' 条') }}</text>
            <text class="header-btn" @click="toggleSearch">{{ searchMode ? '取消' : '搜索' }}</text>
        </div>

        <div class="search-bar" v-if="searchMode">
            <text class="search-input" @click="onSearchInput">{{ searchQuery ? searchQuery : '点击输入关键词' }}</text>
            <text class="search-clear" v-if="searchQuery" @click="clearSearch">✕</text>
        </div>

        <scroller class="memo-list" scroll-direction="vertical" :show-scrollbar="true">
            <div class="list-inner">
                <div class="empty" v-if="filteredMemos.length === 0">
                    <text class="empty-text">{{ searchMode ? '没有匹配的备忘录' : '暂无备忘录，点击下方新建' }}</text>
                </div>

                <div v-for="memo in filteredMemos" :key="memo.id" class="memo-card">
                    <div class="memo-top">
                        <text class="memo-time">{{ formatTime(memo.updatedAt) }}</text>
                        <div class="memo-actions">
                            <text class="act edit" @click="onEdit(memo.id)">编辑</text>
                            <text class="act del" @click="onDelete(memo.id)">{{ pendingDeleteId === memo.id ? '确认?' : '删除' }}</text>
                        </div>
                    </div>
                    <text class="memo-content" @click="onEdit(memo.id)">{{ memo.content ? memo.content : '(空)' }}</text>
                </div>
            </div>
        </scroller>

        <div class="bottom-bar">
            <text class="new-btn" @click="onNew">+ 新建备忘录</text>
        </div>
    </div>
</template>

<style lang="less" scoped>
@import url('memos.less');
</style>

<script>
import memos from './memos';
export default memos;
</script>
