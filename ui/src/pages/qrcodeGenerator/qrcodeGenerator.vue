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
    <scroller class="scroll-area" scroll-direction="vertical" :show-scrollbar="true">
      <div class="section">
        <text class="section-title">二维码生成器</text>
        
        <div class="item">
          <text class="item-text">输入内容</text>
        </div>
        
        <div class="input-area">
          <text class="input-display">{{ inputText || '点击输入文本...' }}</text>
        </div>
        
        <div class="button-row">
          <text class="btn btn-primary" @click="inputFromKeyboard">输入文本</text>
          <text class="btn" @click="generateQRCode">生成二维码</text>
        </div>
      </div>
      
      <div v-if="qrCodePath" class="section">
        <text class="section-title">生成的二维码</text>
        
        <div class="qrcode-display">
          <image :src="qrCodePath" class="qrcode-image" resize="contain" />
        </div>
        
        <div class="button-row">
          <text class="btn" @click="saveQRCode">保存</text>
          <text class="btn" @click="shareQRCode">分享</text>
        </div>
      </div>
      
      <div class="section">
        <text class="section-title">历史记录</text>
        
        <div v-if="history.length > 0">
          <div v-for="(item, index) in history" :key="index" class="history-item" @click="loadFromHistory(index)">
            <text class="history-text">{{ item.text }}</text>
            <text class="history-time">{{ item.time }}</text>
          </div>
        </div>
        <div v-else class="empty-state">
          <text class="empty-text">暂无历史记录</text>
        </div>
      </div>
      
      <div class="section">
        <text class="section-title">使用说明</text>
        <text class="instruction-text">1. 点击"输入文本"按钮输入要生成二维码的内容</text>
        <text class="instruction-text">2. 点击"生成二维码"按钮生成二维码图片</text>
        <text class="instruction-text">3. 可以保存或分享生成的二维码</text>
        <text class="instruction-text">4. 历史记录会自动保存</text>
      </div>
    </scroller>
    
    <Loading />
    <ToastMessage />
  </div>
</template>

<style lang="less" scoped>
@import url('qrcodeGenerator.less');
</style>

<script>
import qrcodeGenerator from './qrcodeGenerator';
import Loading from '../../components/Loading.vue';
import ToastMessage from '../../components/ToastMessage.vue';
export default {
  ...qrcodeGenerator,
  components: {
    Loading,
    ToastMessage
  }
};
</script>
