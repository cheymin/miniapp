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

export type PvzOptions = {};

const ROWS = 5;
const COLS = 9;

interface Cell {
    plant: string;
    zombie: string;
    bullet: boolean;
    zombieHp: number;
    plantTimer: number;
}

const PLANT_TYPES = [
    { icon: 'S', name: '向日葵', cost: 50, type: 'sunflower' },
    { icon: 'P', name: '豌豆射手', cost: 100, type: 'peashooter' },
    { icon: 'W', name: '坚果墙', cost: 50, type: 'wall' },
    { icon: 'S2', name: '双发射手', cost: 200, type: 'double' },
    { icon: 'B', name: '寒冰射手', cost: 175, type: 'ice' }
];

const ZOMBIE_TYPES = [
    { icon: 'Z', name: '普通僵尸', hp: 3, speed: 1 },
    { icon: 'C', name: '路障僵尸', hp: 6, speed: 1 },
    { icon: 'B', name: '铁桶僵尸', hp: 10, speed: 1 }
];

const pvz = defineComponent({
    data() {
        return {
            $page: {} as FalconPage<PvzOptions>,
            grid: [] as Cell[][],
            sun: 99999,
            wave: 0,
            maxWave: 10,
            selectedPlant: -1,
            plantTypes: PLANT_TYPES,
            gameOver: false,
            gameWon: false,
            isPaused: false,
            gameTimer: null as any,
            tickCount: 0,
            zombiesInWave: 0,
            zombiesSpawned: 0
        };
    },

    mounted() {
        this.$page.$npage.setSupportBack(true);
        this.$page.$npage.on("backpressed", () => {
            this.stopGame();
            $falcon.navBack();
        });
        this.initGrid();
        this.startGame();
    },

    beforeDestroy() {
        this.stopGame();
    },

    methods: {
        initGrid() {
            this.grid = [];
            for (let r = 0; r < ROWS; r++) {
                const row: Cell[] = [];
                for (let c = 0; c < COLS; c++) {
                    row.push({ plant: '', zombie: '', bullet: false, zombieHp: 0, plantTimer: 0 });
                }
                this.grid.push(row);
            }
        },

        startGame() {
            this.sun = 99999;
            this.wave = 0;
            this.gameOver = false;
            this.gameWon = false;
            this.isPaused = false;
            this.tickCount = 0;
            this.zombiesInWave = 0;
            this.zombiesSpawned = 0;
            this.initGrid();
            this.nextWave();
            this.gameTimer = setInterval(() => {
                if (!this.isPaused && !this.gameOver) {
                    this.gameTick();
                }
            }, 800);
        },

        stopGame() {
            if (this.gameTimer) {
                clearInterval(this.gameTimer);
                this.gameTimer = null;
            }
        },

        restartGame() {
            this.stopGame();
            this.startGame();
        },

        togglePause() {
            this.isPaused = !this.isPaused;
        },

        nextWave() {
            this.wave++;
            this.zombiesSpawned = 0;
            this.zombiesInWave = 2 + this.wave;
            if (this.wave > this.maxWave) {
                this.gameWon = true;
                this.gameOver = true;
            }
        },

        selectPlant(idx: number) {
            if (this.selectedPlant === idx) {
                this.selectedPlant = -1;
            } else {
                this.selectedPlant = idx;
            }
        },

        placePlant(rowIdx: number, colIdx: number) {
            if (this.selectedPlant < 0 || this.gameOver) return;
            const cell = this.grid[rowIdx][colIdx];
            if (cell.plant) return;

            const plant = PLANT_TYPES[this.selectedPlant];

            cell.plant = plant.icon;
            cell.plantTimer = 0;
        },

        gameTick() {
            this.tickCount++;

            // Sun from sky
            if (this.tickCount % 8 === 0) {
                this.sun += 25;
            }

            // Plant actions
            for (let r = 0; r < ROWS; r++) {
                for (let c = 0; c < COLS; c++) {
                    const cell = this.grid[r][c];
                    if (!cell.plant) continue;

                    cell.plantTimer++;

                    // Sunflower produces sun
                    if (cell.plant === 'S' && cell.plantTimer % 6 === 0) {
                        this.sun += 25;
                    }

                    // Peashooter shoots
                    if ((cell.plant === 'P' || cell.plant === 'S2' || cell.plant === 'B') && cell.plantTimer % 3 === 0) {
                        // Check if zombie in this row
                        let hasZombieInRow = false;
                        for (let cc = c + 1; cc < COLS; cc++) {
                            if (this.grid[r][cc].zombie) { hasZombieInRow = true; break; }
                        }
                        if (hasZombieInRow) {
                            cell.bullet = true;
                        }
                    }
                }
            }

            // Move bullets
            for (let r = 0; r < ROWS; r++) {
                for (let c = COLS - 1; c >= 0; c--) {
                    const cell = this.grid[r][c];
                    if (!cell.bullet) continue;

                    cell.bullet = false;

                    // Hit zombie in next cell or further
                    let hit = false;
                    for (let cc = c + 1; cc < COLS; cc++) {
                        if (this.grid[r][cc].zombie) {
                            this.grid[r][cc].zombieHp--;
                            if (this.grid[r][cc].zombieHp <= 0) {
                                this.grid[r][cc].zombie = '';
                                this.grid[r][cc].zombieHp = 0;
                            }
                            hit = true;
                            break;
                        }
                    }

                    // Move bullet forward if not hit
                    if (!hit && c + 1 < COLS) {
                        this.grid[r][c + 1].bullet = true;
                    }
                }
            }

            // Double shooter shoots second bullet
            for (let r = 0; r < ROWS; r++) {
                for (let c = 0; c < COLS; c++) {
                    const cell = this.grid[r][c];
                    if (cell.plant === 'S2' && cell.plantTimer % 3 === 1) {
                        let hasZombieInRow = false;
                        for (let cc = c + 1; cc < COLS; cc++) {
                            if (this.grid[r][cc].zombie) { hasZombieInRow = true; break; }
                        }
                        if (hasZombieInRow && c + 1 < COLS) {
                            this.grid[r][c + 1].bullet = true;
                        }
                    }
                }
            }

            // Move zombies
            for (let r = 0; r < ROWS; r++) {
                for (let c = 0; c < COLS; c++) {
                    const cell = this.grid[r][c];
                    if (!cell.zombie) continue;

                    // Zombie attacks plant
                    if (c > 0 && this.grid[r][c - 1].plant) {
                        // Attack every 2 ticks
                        if (this.tickCount % 2 === 0) {
                            this.grid[r][c - 1].plant = '';
                            this.grid[r][c - 1].plantTimer = 0;
                        }
                    } else if (c > 0 && this.tickCount % 2 === 0) {
                        // Move left
                        const targetCell = this.grid[r][c - 1];
                        if (!targetCell.zombie) {
                            targetCell.zombie = cell.zombie;
                            targetCell.zombieHp = cell.zombieHp;
                            cell.zombie = '';
                            cell.zombieHp = 0;
                        }
                    }

                    // Zombie reached home
                    if (c === 0 && !this.grid[r][0].plant) {
                        this.gameOver = true;
                    }
                }
            }

            // Spawn zombies
            if (this.zombiesSpawned < this.zombiesInWave && this.tickCount % 3 === 0) {
                this.spawnZombie();
            }

            // Check wave complete
            if (this.zombiesSpawned >= this.zombiesInWave) {
                let anyZombie = false;
                for (let r = 0; r < ROWS; r++) {
                    for (let c = 0; c < COLS; c++) {
                        if (this.grid[r][c].zombie) { anyZombie = true; break; }
                    }
                    if (anyZombie) break;
                }
                if (!anyZombie) {
                    this.nextWave();
                }
            }
        },

        spawnZombie() {
            const row = Math.floor(Math.random() * ROWS);
            let zombieType;
            if (this.wave <= 3) {
                zombieType = ZOMBIE_TYPES[0]; // Normal
            } else if (this.wave <= 6) {
                zombieType = ZOMBIE_TYPES[Math.random() < 0.6 ? 0 : 1]; // Normal + Cone
            } else {
                const rand = Math.random();
                if (rand < 0.4) zombieType = ZOMBIE_TYPES[0];
                else if (rand < 0.75) zombieType = ZOMBIE_TYPES[1];
                else zombieType = ZOMBIE_TYPES[2];
            }

            const cell = this.grid[row][COLS - 1];
            if (!cell.zombie) {
                cell.zombie = zombieType.icon;
                cell.zombieHp = zombieType.hp;
                this.zombiesSpawned++;
            }
        }
    }
});

export default pvz;
