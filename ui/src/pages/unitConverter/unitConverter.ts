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
import { showError } from '../../components/ToastMessage';
import { openSoftKeyboard } from '../../utils/softKeyboardUtils';

export type UnitConverterOptions = {};

interface UnitType {
    name: string;
    units: { name: string; factor: number }[];
}

let debounceTimer: any = null;

const unitConverter = defineComponent({
    data() {
        return {
            $page: {} as FalconPage<UnitConverterOptions>,
            
            currentType: 0,
            inputValue: '',
            fromUnit: 0,
            toUnit: 0,
            result: '',
            isCalculating: false,
            
            unitTypes: [
                {
                    name: '长度',
                    units: [
                        { name: '毫米', factor: 0.001 },
                        { name: '厘米', factor: 0.01 },
                        { name: '米', factor: 1 },
                        { name: '千米', factor: 1000 },
                        { name: '英寸', factor: 0.0254 },
                        { name: '英尺', factor: 0.3048 },
                        { name: '码', factor: 0.9144 },
                        { name: '英里', factor: 1609.344 }
                    ]
                },
                {
                    name: '重量',
                    units: [
                        { name: '毫克', factor: 0.000001 },
                        { name: '克', factor: 0.001 },
                        { name: '千克', factor: 1 },
                        { name: '吨', factor: 1000 },
                        { name: '盎司', factor: 0.0283495 },
                        { name: '磅', factor: 0.453592 }
                    ]
                },
                {
                    name: '温度',
                    units: [
                        { name: '摄氏度', factor: 1 },
                        { name: '华氏度', factor: 1 },
                        { name: '开尔文', factor: 1 }
                    ]
                },
                {
                    name: '面积',
                    units: [
                        { name: '平方毫米', factor: 0.000001 },
                        { name: '平方厘米', factor: 0.0001 },
                        { name: '平方米', factor: 1 },
                        { name: '平方千米', factor: 1000000 },
                        { name: '公顷', factor: 10000 },
                        { name: '亩', factor: 666.667 }
                    ]
                },
                {
                    name: '体积',
                    units: [
                        { name: '毫升', factor: 0.000001 },
                        { name: '升', factor: 0.001 },
                        { name: '立方米', factor: 1 },
                        { name: '加仑(美)', factor: 0.00378541 }
                    ]
                },
                {
                    name: '时间',
                    units: [
                        { name: '秒', factor: 1 },
                        { name: '分钟', factor: 60 },
                        { name: '小时', factor: 3600 },
                        { name: '天', factor: 86400 },
                        { name: '周', factor: 604800 }
                    ]
                },
                {
                    name: '速度',
                    units: [
                        { name: '米/秒', factor: 1 },
                        { name: '千米/时', factor: 0.277778 },
                        { name: '英里/时', factor: 0.44704 },
                        { name: '节', factor: 0.514444 }
                    ]
                }
            ] as UnitType[]
        };
    },

    computed: {
        currentUnits(): { name: string; factor: number }[] {
            return this.unitTypes[this.currentType]?.units || [];
        }
    },

    watch: {
        inputValue() {
            this.debouncedConvert();
        },
        fromUnit() {
            this.debouncedConvert();
        },
        toUnit() {
            this.debouncedConvert();
        }
    },

    mounted() {
        this.$page.$npage.setSupportBack(true);
        this.$page.$npage.on("backpressed", this.handleBackPress);
        this.fromUnit = 0;
        this.toUnit = 1;
    },
    
    beforeDestroy() {
        this.$page.$npage.off("backpressed", this.handleBackPress);
    },

    methods: {
        handleBackPress() {
            $falcon.navBack();
        },
        
        selectType(index: number) {
            this.currentType = index;
            this.fromUnit = 0;
            this.toUnit = 1;
            this.result = '';
        },
        
        debouncedConvert() {
            if (debounceTimer) {
                clearTimeout(debounceTimer);
            }
            
            debounceTimer = setTimeout(() => {
                this.convert();
            }, 300);
        },

        inputValueChanged() {
            openSoftKeyboard(
                () => this.inputValue,
                (value) => {
                    this.inputValue = value;
                    this.$forceUpdate();
                },
                (value) => {
                    if (value && isNaN(parseFloat(value))) {
                        return '请输入有效的数字';
                    }
                    return undefined;
                }
            );
        },

        convert() {
            if (!this.inputValue || this.inputValue.trim() === '') {
                this.result = '';
                return;
            }

            const value = parseFloat(this.inputValue);
            if (isNaN(value)) {
                this.result = '请输入有效数字';
                return;
            }

            if (!isFinite(value)) {
                this.result = '数值超出范围';
                return;
            }

            const units = this.currentUnits;
            if (!units || units.length === 0) {
                this.result = '单位数据错误';
                return;
            }

            try {
                if (this.currentType === 2) {
                    this.result = this.convertTemperature(value, this.fromUnit, this.toUnit);
                } else {
                    const fromFactor = units[this.fromUnit]?.factor;
                    const toFactor = units[this.toUnit]?.factor;
                    
                    if (fromFactor === undefined || toFactor === undefined) {
                        this.result = '单位选择错误';
                        return;
                    }
                    
                    if (toFactor === 0) {
                        this.result = '除零错误';
                        return;
                    }
                    
                    const result = (value * fromFactor) / toFactor;
                    
                    if (!isFinite(result)) {
                        this.result = '计算结果超出范围';
                        return;
                    }
                    
                    this.result = this.formatNumber(result);
                }
            } catch (error) {
                console.error('转换错误:', error);
                this.result = '计算错误';
            }
        },

        convertTemperature(value: number, from: number, to: number): string {
            let celsius = value;
            
            if (from === 1) {
                celsius = (value - 32) * 5 / 9;
            } else if (from === 2) {
                celsius = value - 273.15;
            }
            
            let result = celsius;
            if (to === 1) {
                result = celsius * 9 / 5 + 32;
            } else if (to === 2) {
                result = celsius + 273.15;
            }
            
            return this.formatNumber(result);
        },

        formatNumber(num: number): string {
            if (!isFinite(num)) {
                return '无效结果';
            }
            
            if (num === 0) {
                return '0';
            }
            
            const absNum = Math.abs(num);
            
            if (absNum < 0.000001 || absNum > 999999999) {
                return num.toExponential(6);
            }
            
            if (absNum >= 1) {
                const fixed = num.toFixed(6);
                return parseFloat(fixed).toString();
            } else {
                const fixed = num.toFixed(8);
                return parseFloat(fixed).toString();
            }
        },

        swapUnits() {
            const temp = this.fromUnit;
            this.fromUnit = this.toUnit;
            this.toUnit = temp;
            this.convert();
        }
    }
});

export default unitConverter;
