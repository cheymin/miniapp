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

import { defineComponent } from 'vue';
import { openSoftKeyboard } from '../../utils/softKeyboardUtils';
import { checkPortal } from './detect.js'
import { panabit } from './panabit.js'

const STORAGE_KEY = 'wifiLogin_accounts'
const STATE_KEY = 'wifiLogin_state'

export type WifiLoginOptions = {};

export interface WifiState {
    status: 'idle' | 'checking' | 'free' | 'portal' | 'offline' | 'error'
    msg: string
    serverBase: string
    params: Record<string, string>
    ssid: string
}

const wifiLogin = defineComponent({
    data() {
        return {
            $page: {} as FalconPage<WifiLoginOptions>,
            status: 'idle' as WifiState['status'],
            statusMsg: '点击"检测网络"开始',
            serverBase: '',
            params: {} as Record<string, string>,
            username: '',
            password: '',
            remember: true,
            ssid: '',
            busy: false,
            heartbeatTimer: null as any,
            autoJumpCount: 0,
        }
    },

    mounted() {
        this.$page.$npage.setSupportBack(true)
        this.$page.$npage.on('backpressed', this.close)
        this.loadAccounts()
        this.detect()
    },

    beforeDestroy() {
        this.stopHeartbeat()
    },

    methods: {
        close() {
            this.stopHeartbeat()
            this.$page.finish()
        },

        async loadAccounts() {
            try {
                const raw = await $falcon.storage.get(STORAGE_KEY)
                const data = raw ? JSON.parse(raw) : { accounts: {}, ssid: '' }
                this.ssid = data.ssid || ''
                const acc = (this.ssid && data.accounts && data.accounts[this.ssid]) || {}
                this.username = acc.username || ''
                this.password = acc.password || ''
                this.remember = acc.remember !== false
            } catch (e) {
                console.error('[wifiLogin] loadAccounts error', e)
            }
        },

        async saveAccounts() {
            try {
                const raw = await $falcon.storage.get(STORAGE_KEY)
                const data = raw ? JSON.parse(raw) : { accounts: {}, ssid: '' }
                data.ssid = this.ssid
                data.accounts = data.accounts || {}
                if (this.remember && this.username) {
                    data.accounts[this.ssid] = {
                        username: this.username,
                        password: this.password,
                        remember: true,
                    }
                } else if (!this.remember) {
                    if (data.accounts[this.ssid]) delete data.accounts[this.ssid]
                }
                await $falcon.storage.set(STORAGE_KEY, JSON.stringify(data))
            } catch (e) {
                console.error('[wifiLogin] saveAccounts error', e)
            }
        },

        async detect() {
            if (this.busy) return
            this.busy = true
            this.status = 'checking'
            this.statusMsg = '正在检测网络...'
            this.stopHeartbeat()

            const result = await checkPortal({ timeout: 3.5 })

            if (result.status === 'free') {
                this.status = 'free'
                this.statusMsg = '当前网络无需登录'
                this.serverBase = ''
                this.params = {}
            } else if (result.status === 'offline') {
                this.status = 'offline'
                this.statusMsg = '无网络连接: ' + (result.error || '探测超时')
                this.serverBase = ''
                this.params = {}
            } else if (result.status === 'portal') {
                this.status = 'portal'
                this.serverBase = result.serverBase || ''
                this.params = result.params || {}
                this.ssid = this.ssid || 'current'
                this.statusMsg = '检测到认证页面: ' + (this.serverBase || '未知服务器')
                await this.saveAccounts()
                this.startHeartbeat()
            } else {
                this.status = 'error'
                this.statusMsg = '检测异常'
            }

            this.busy = false
        },

        async login() {
            if (this.busy || !this.serverBase) return
            if (!this.username || !this.password) {
                this.statusMsg = '请输入账号和密码'
                return
            }
            this.busy = true
            this.statusMsg = '正在登录...'

            const state: any = {}
            const res = await panabit.login(this.serverBase, {
                params: this.params,
                state: state,
                username: this.username,
                password: this.password,
                remember: this.remember,
            })

            if (res.ok) {
                this.status = 'free'
                this.statusMsg = '登录成功'
                await this.saveAccounts()
                this.startHeartbeat()
            } else {
                this.statusMsg = '登录失败: ' + (res.msg || '未知错误')
            }

            this.busy = false
        },

        async logout() {
            if (this.busy || !this.serverBase) return
            this.busy = true
            this.statusMsg = '正在下线...'
            const res = await panabit.logout(this.serverBase, { params: this.params })
            if (res.ok) {
                this.status = 'portal'
                this.statusMsg = '已下线，请重新登录'
                this.stopHeartbeat()
            } else {
                this.statusMsg = '下线失败: ' + (res.msg || '未知错误')
            }
            this.busy = false
        },

        startHeartbeat() {
            this.stopHeartbeat()
            this.heartbeatTimer = setInterval(async () => {
                if (this.status !== 'free' && this.status !== 'portal') return
                if (!this.serverBase) return
                try {
                    const res = await panabit.queryStat(this.serverBase, { params: this.params, state: {} })
                    if (res.ok && res.stat && res.stat !== 0) {
                        this.status = 'free'
                        this.statusMsg = '已认证'
                    }
                } catch (e) {
                    console.error('[wifiLogin] heartbeat error', e)
                }
            }, 30000)
        },

        stopHeartbeat() {
            if (this.heartbeatTimer) {
                clearInterval(this.heartbeatTimer)
                this.heartbeatTimer = null
            }
        },

        editUsername() {
            openSoftKeyboard(
                () => this.username,
                (v) => { this.username = v; this.$forceUpdate() }
            )
        },

        editPassword() {
            openSoftKeyboard(
                () => this.password,
                (v) => { this.password = v; this.$forceUpdate() }
            )
        },

        toggleRemember() {
            this.remember = !this.remember
            this.$forceUpdate()
        },
    }
})

export default wifiLogin
