import { defineComponent } from 'vue';

export type IndexOptions = {};

const APPS = [
    { key: 'ai',          icon: '🤖', label: 'AI' },
    { key: 'fileManager', icon: '📁', label: '文件' },
    { key: 'videoPlayer', icon: '🎬', label: '视频' },
    { key: 'shell',       icon: '⌨️', label: '终端' },
    { key: 'imageViewer', icon: '🖼️', label: '图片' },
    { key: 'update',      icon: '⬇️', label: '更新' },
];

const WEEK = ['日', '一', '二', '三', '四', '五', '六'];

const index = defineComponent({
    data() {
        return {
            $page: {} as FalconPage<IndexOptions>,
            version: '1.2.58',
            apps: APPS,
            row1: APPS.slice(0, 3),
            row2: APPS.slice(3, 6),
            unlocked: false,
            timeText: '',
            dateText: '',
            tickTimer: null as any,
            // 手势
            touchStartY: 0,
            touchStartX: 0,
            dragging: false,
        };
    },
    mounted() {
        this.$page.$npage.setSupportBack(true);
        this.$page.$npage.on('backpressed', () => {
            if (this.unlocked) this.unlocked = false;
        });
        this.updateClock();
        this.tickTimer = setInterval(() => this.updateClock(), 1000);
    },
    beforeDestroy() {
        if (this.tickTimer) clearInterval(this.tickTimer);
    },
    methods: {
        updateClock() {
            const d = new Date();
            const pad = (n: number) => n < 10 ? '0' + n : String(n);
            this.timeText = pad(d.getHours()) + ':' + pad(d.getMinutes());
            this.dateText = (d.getMonth() + 1) + '月' + d.getDate() + '日 周' + WEEK[d.getDay()];
        },
        onTouchStart(e: any) {
            if (this.unlocked) return;
            const t = e.touches && e.touches[0] ? e.touches[0] : e;
            this.touchStartY = t.clientY || t.pageY || 0;
            this.touchStartX = t.clientX || t.pageX || 0;
            this.dragging = true;
        },
        onTouchMove(e: any) {
            // 可以做视觉反馈，但 Falcon transform 可能不认，先跳过
        },
        onTouchEnd(e: any) {
            if (!this.dragging) return;
            this.dragging = false;
            const t = e.changedTouches && e.changedTouches[0] ? e.changedTouches[0] : e;
            const dy = (t.clientY || t.pageY || 0) - this.touchStartY;
            const dx = (t.clientX || t.pageX || 0) - this.touchStartX;
            // 上滑解锁：dy < -40 且竖直方向为主
            if (dy < -40 && Math.abs(dy) > Math.abs(dx)) {
                this.unlocked = true;
            }
        },
        go(item: typeof APPS[number]) { $falcon.navTo(item.key, {}); },
        goSettings() { $falcon.navTo('settings', {}); },
    }
});

export default index;
