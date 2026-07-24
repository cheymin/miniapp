import { defineComponent } from 'vue';
import { showError, showSuccess } from '../../components/ToastMessage';
import { openSoftKeyboard } from '../../utils/softKeyboardUtils';
import { dbGet, dbSet } from '../../utils/database';

export type BrowserOptions = {};

interface Bookmark {
    name: string;
    url: string;
}

const STORAGE_KEY = 'browser_bookmarks';

const browser = defineComponent({
    data() {
        return {
            $page: {} as FalconPage<BrowserOptions>,
            currentUrl: '',
            pageTitle: '浏览器',
            showMenu: false,
            bookmarks: [] as Bookmark[],
            quickLinks: [
                { name: '百度', url: 'http://www.baidu.com' },
                { name: '必应', url: 'http://www.bing.com' },
                { name: '知乎', url: 'http://www.zhihu.com' },
                { name: '微博', url: 'http://m.weibo.cn' },
            ],
        };
    },

    mounted() {
        this.$page.$npage.setSupportBack(true);
        this.$page.$npage.on('backpressed', this.onBack);
        this.loadBookmarks();
    },

    methods: {
        onBack() {
            if (this.showMenu) {
                this.showMenu = false;
                return;
            }
            if (this.currentUrl) {
                this.currentUrl = '';
                this.pageTitle = '浏览器';
                return;
            }
            this.$page.finish();
        },

        goBack() {
            this.onBack();
        },

        toggleMenu() {
            this.showMenu = !this.showMenu;
        },

        inputUrl() {
            openSoftKeyboard(
                () => this.currentUrl,
                (value) => {
                    let url = value.trim();
                    if (!url) return;
                    if (!url.startsWith('http://') && !url.startsWith('https://')) {
                        url = 'http://' + url;
                    }
                    this.currentUrl = '';
                    this.$forceUpdate();
                    setTimeout(() => {
                        this.currentUrl = url;
                        this.pageTitle = url.replace(/^https?:\/\//, '').split('/')[0];
                        this.showMenu = false;
                    }, 50);
                }
            );
        },

        visitLink(url: string) {
            this.currentUrl = '';
            this.$forceUpdate();
            setTimeout(() => {
                this.currentUrl = url;
                this.pageTitle = url.replace(/^https?:\/\//, '').split('/')[0];
                this.showMenu = false;
            }, 50);
        },

        reload() {
            if (!this.currentUrl) return;
            const url = this.currentUrl;
            this.currentUrl = '';
            this.$forceUpdate();
            setTimeout(() => {
                this.currentUrl = url;
            }, 50);
        },

        goHome() {
            this.currentUrl = '';
            this.pageTitle = '浏览器';
            this.showMenu = false;
        },

        addBookmark() {
            if (!this.currentUrl) {
                showError('当前无页面可收藏');
                return;
            }
            openSoftKeyboard(
                () => this.pageTitle,
                (value) => {
                    const name = value.trim() || this.pageTitle;
                    this.bookmarks.push({ name, url: this.currentUrl });
                    this.saveBookmarks();
                    showSuccess('已收藏: ' + name);
                }
            );
        },

        deleteBookmark(idx: number) {
            this.bookmarks.splice(idx, 1);
            this.saveBookmarks();
        },

        loadBookmarks() {
            try {
                const data = dbGet(STORAGE_KEY);
                if (data) {
                    this.bookmarks = JSON.parse(data);
                }
            } catch (e) {}
        },

        saveBookmarks() {
            try {
                dbSet(STORAGE_KEY, JSON.stringify(this.bookmarks));
            } catch (e) {}
        },
    },
});

export default browser;
