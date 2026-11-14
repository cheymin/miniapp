import { defineComponent } from 'vue';
import { normalizeImageUrl } from '../utils/imageUtils';

export default defineComponent({
    name: 'AppImage',
    props: {
        src: { type: String, default: '' },
        width: { type: Number, required: true },
        height: { type: Number, required: true },
        forceHttp: { type: Boolean, default: false },
        resize: { type: String, default: 'cover' },
    },
    computed: {
        resolvedSrc(): string {
            return normalizeImageUrl(this.src, this.forceHttp);
        },
        imageStyle(): Record<string, string> {
            return {
                width: `${this.width}px`,
                height: `${this.height}px`,
            };
        },
    },
});
