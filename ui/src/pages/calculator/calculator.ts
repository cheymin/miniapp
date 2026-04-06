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

export type CalculatorOptions = {};

const calculator = defineComponent({
    data() {
        return {
            $page: {} as FalconPage<CalculatorOptions>,
            
            expression: '' as string,
            result: '0' as string,
            history: [] as Array<{ expression: string; result: string }>,
            
            lastOperator: '' as string,
            lastNumber: '' as string,
            shouldResetExpression: false,
            
            isScientificMode: false as boolean,
            angleMode: 'deg' as 'deg' | 'rad'
        };
    },

    async mounted() {
        await this.loadHistory();
    },

    methods: {
        inputNumber(num: string) {
            if (this.shouldResetExpression) {
                this.expression = '';
                this.shouldResetExpression = false;
            }
            
            if (this.expression === '0' && num === '0') {
                return;
            }
            
            this.expression += num;
            this.calculatePreview();
        },

        inputOperator(op: string) {
            if (this.expression === '' && this.result !== '0') {
                this.expression = this.result;
            }
            
            const lastChar = this.expression.slice(-1);
            if (['+', '-', '*', '/', '%'].includes(lastChar)) {
                this.expression = this.expression.slice(0, -1);
            }
            
            this.expression += op;
            this.shouldResetExpression = false;
        },

        inputDecimal() {
            if (this.shouldResetExpression) {
                this.expression = '0';
                this.shouldResetExpression = false;
            }
            
            const parts = this.expression.split(/[\+\-\*\/\%]/);
            const lastPart = parts[parts.length - 1];
            
            if (!lastPart.includes('.')) {
                if (lastPart === '') {
                    this.expression += '0.';
                } else {
                    this.expression += '.';
                }
            }
        },

        toggleSign() {
            if (this.expression === '' && this.result !== '0') {
                const num = parseFloat(this.result);
                this.result = (-num).toString();
                return;
            }
            
            const lastNumMatch = this.expression.match(/-?\d+\.?\d*$/);
            if (lastNumMatch) {
                const lastNum = lastNumMatch[0];
                const startIndex = lastNumMatch.index || 0;
                const toggledNum = lastNum.startsWith('-') 
                    ? lastNum.substring(1) 
                    : '-' + lastNum;
                
                this.expression = this.expression.substring(0, startIndex) + toggledNum;
                this.calculatePreview();
            }
        },

        clear() {
            this.expression = '';
            this.result = '0';
            this.shouldResetExpression = false;
        },

        backspace() {
            if (this.shouldResetExpression) {
                this.clear();
                return;
            }
            
            this.expression = this.expression.slice(0, -1);
            this.calculatePreview();
        },

        calculate() {
            if (this.expression === '') return;
            
            try {
                const evalResult = this.evaluateExpression(this.expression);
                
                if (isNaN(evalResult) || !isFinite(evalResult)) {
                    this.result = '错误';
                } else {
                    this.result = this.formatNumber(evalResult);
                    
                    this.addToHistory(this.expression, this.result);
                    
                    this.shouldResetExpression = true;
                }
            } catch (error) {
                this.result = '错误';
            }
        },

        calculatePreview() {
            if (this.expression === '') {
                this.result = '0';
                return;
            }
            
            try {
                const evalResult = this.evaluateExpression(this.expression);
                
                if (!isNaN(evalResult) && isFinite(evalResult)) {
                    this.result = this.formatNumber(evalResult);
                }
            } catch (error) {
                // 预览计算失败，不显示错误
            }
        },

        formatNumber(num: number): string {
            if (Number.isInteger(num)) {
                return num.toString();
            }
            
            return parseFloat(num.toPrecision(10)).toString();
        },

        addToHistory(expression: string, result: string) {
            this.history.unshift({ expression, result });
            
            if (this.history.length > 20) {
                this.history.pop();
            }
            
            this.saveHistory();
        },

        loadHistoryItem(index: number) {
            const item = this.history[index];
            if (item) {
                this.expression = item.expression;
                this.result = item.result;
            }
        },

        async saveHistory() {
            try {
                await $falcon.jsapi.storage.setStorage({ 
                    key: 'calculator_history', 
                    data: JSON.stringify(this.history) 
                });
            } catch (error) {
                console.error('保存历史失败:', error);
            }
        },

        async loadHistory() {
            try {
                const result = await $falcon.jsapi.storage.getStorage({ key: 'calculator_history' });
                if (result && result.data) {
                    this.history = JSON.parse(result.data);
                }
            } catch (error) {
                console.error('加载历史失败:', error);
            }
        },
        
        toggleScientificMode() {
            this.isScientificMode = !this.isScientificMode;
        },
        
        inputFunction(func: string) {
            if (this.shouldResetExpression) {
                this.expression = '';
                this.shouldResetExpression = false;
            }
            
            let funcExpr = '';
            switch (func) {
                case 'sin':
                    funcExpr = 'sin(';
                    break;
                case 'cos':
                    funcExpr = 'cos(';
                    break;
                case 'tan':
                    funcExpr = 'tan(';
                    break;
                case 'log':
                    funcExpr = 'log(';
                    break;
                case 'ln':
                    funcExpr = 'ln(';
                    break;
                case 'sqrt':
                    funcExpr = 'sqrt(';
                    break;
                case 'pow':
                    funcExpr = '^(';
                    break;
                case 'pi':
                    funcExpr = 'π';
                    break;
                case 'e':
                    funcExpr = 'e';
                    break;
                case 'factorial':
                    funcExpr = 'factorial(';
                    break;
                default:
                    funcExpr = func + '(';
            }
            
            this.expression += funcExpr;
        },
        
        factorial(n: number): number {
            if (n < 0) return NaN;
            if (n === 0 || n === 1) return 1;
            if (n > 170) return Infinity;
            let result = 1;
            for (let i = 2; i <= n; i++) {
                result *= i;
            }
            return result;
        },
        
        evaluateExpression(expr: string): number {
            let sanitized = expr
                .replace(/π/g, Math.PI.toString())
                .replace(/e(?![x])/g, Math.E.toString())
                .replace(/sin\(/g, `Math.sin(${this.angleMode === 'deg' ? 'Math.PI/180*' : ''}`)
                .replace(/cos\(/g, `Math.cos(${this.angleMode === 'deg' ? 'Math.PI/180*' : ''}`)
                .replace(/tan\(/g, `Math.tan(${this.angleMode === 'deg' ? 'Math.PI/180*' : ''}`)
                .replace(/log\(/g, 'Math.log10(')
                .replace(/ln\(/g, 'Math.log(')
                .replace(/sqrt\(/g, 'Math.sqrt(')
                .replace(/\^\(/g, 'Math.pow(')
                .replace(/factorial\(/g, 'this.factorial(');
            
            try {
                const result = eval(sanitized);
                return typeof result === 'number' ? result : NaN;
            } catch (error) {
                throw new Error('Invalid expression');
            }
        },
        
        inputPi() {
            if (this.shouldResetExpression) {
                this.expression = '';
                this.shouldResetExpression = false;
            }
            this.expression += 'π';
        },
        
        inputE() {
            if (this.shouldResetExpression) {
                this.expression = '';
                this.shouldResetExpression = false;
            }
            this.expression += 'e';
        }
    }
});

export default calculator;
