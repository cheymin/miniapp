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
import frame01 from '../../images/loading/01.png';
import frame02 from '../../images/loading/02.png';
import frame03 from '../../images/loading/03.png';
import frame04 from '../../images/loading/04.png';
import frame05 from '../../images/loading/05.png';
import frame06 from '../../images/loading/06.png';
import frame07 from '../../images/loading/07.png';
import frame08 from '../../images/loading/08.png';
import frame09 from '../../images/loading/09.png';
import frame10 from '../../images/loading/10.png';
import frame11 from '../../images/loading/11.png';
import frame12 from '../../images/loading/12.png';
import frame13 from '../../images/loading/13.png';
import frame14 from '../../images/loading/14.png';
import frame15 from '../../images/loading/15.png';
import frame16 from '../../images/loading/16.png';
import frame17 from '../../images/loading/17.png';
import frame18 from '../../images/loading/18.png';
import frame19 from '../../images/loading/19.png';
import frame20 from '../../images/loading/20.png';
import frame21 from '../../images/loading/21.png';
import frame22 from '../../images/loading/22.png';
import frame23 from '../../images/loading/23.png';
import frame24 from '../../images/loading/24.png';
import frame25 from '../../images/loading/25.png';
import frame26 from '../../images/loading/26.png';
import frame27 from '../../images/loading/27.png';

let loadingInstance: any = null;

export function showLoading() {
    if (loadingInstance) { loadingInstance.show(); }
}

export function hideLoading() {
    if (loadingInstance) { loadingInstance.hide(); }
}

const Loading = defineComponent({
    data() {
        return {
            isVisible: false,
            frames: [
                frame01, frame02, frame03, frame04, frame05, frame06, frame07,
                frame08, frame09, frame10, frame11, frame12, frame13, frame14,
                frame15, frame16, frame17, frame18, frame19, frame20, frame21,
                frame22, frame23, frame24, frame25, frame26, frame27
            ],
        };
    },

    mounted() { loadingInstance = this; },

    methods: {
        show() { this.isVisible = true; },
        hide() { this.isVisible = false; },
    }
});

export default Loading;
