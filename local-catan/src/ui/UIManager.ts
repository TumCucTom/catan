import { GameEngine } from '../game/GameEngine'
import { GameRenderer } from './GameRenderer'
import { GamePhase, ResourceType } from '../game/types'

export class UIManager {
    private gameEngine: GameEngine
    private renderer: GameRenderer

    constructor(gameEngine: GameEngine, renderer: GameRenderer) {
        this.gameEngine = gameEngine
        this.renderer = renderer
    }

    async init(): Promise<void> {
        try {
            this.updatePlayerInfo()
            this.updateCurrentPlayer()
            this.updateDiceDisplay()
            this.updateRollDistribution()
            this.setupActions()
            this.setupPlacementHandlers()
            console.log('UI Manager initialized successfully')
        } catch (error) {
            console.error('Failed to initialize UI:', error)
            throw error
        }
    }

    private setupPlacementHandlers(): void {
        this.renderer.setPlacementCallback((type: string, id: number, vertexId?: number) => {
            this.handlePlacement(type, id, vertexId)
        })
    }

    private handlePlacement(type: string, id: number, vertexId?: number): void {
        const state = this.gameEngine.getState()
        const currentPlayer = this.gameEngine.getCurrentPlayer()
        let success = false

        try {
            if (type === 'settlement') {
                success = this.gameEngine.buildSettlement(id, currentPlayer.id)
            } else if (type === 'city') {
                success = this.gameEngine.buildCity(id, currentPlayer.id)
            } else if (type === 'road') {
                success = this.gameEngine.buildRoad(id, currentPlayer.id, vertexId)
            }

            if (success) {
                // Redraw the board to show the new placement
                this.renderer.drawBoard()
                this.updateUI()
            } else {
                alert(`Cannot place ${type} here. Check game rules.`)
            }
        } catch (error) {
            alert((error as Error).message)
        }
    }

    private updatePlayerInfo(): void {
        const container = document.getElementById('player-info')
        if (!container) return

        const state = this.gameEngine.getState()
        const currentPlayer = this.gameEngine.getCurrentPlayer()

        container.innerHTML = state.players.map((player, index) => {
            const isActive = index === state.currentPlayerIndex
            const resources = Array.from(player.resources.entries())
                .filter(([resource]) => resource !== ResourceType.Desert)
                .map(([resource, count]) => `${resource}: ${count}`)
                .join(', ')

            return `
                <div class="player ${isActive ? 'active' : ''}">
                    <div class="player-name">${player.name} (${player.color})</div>
                    <div class="player-resources">${resources}</div>
                    <div class="player-vp">VP: ${player.victoryPoints}</div>
                </div>
            `
        }).join('')
    }

    private updateCurrentPlayer(): void {
        const container = document.getElementById('current-player')
        if (!container) return

        const player = this.gameEngine.getCurrentPlayer()
        const state = this.gameEngine.getState()

        let phaseText = state.phase
        if (state.initialPlacementPhase) {
            phaseText = `Initial Placement - Round ${state.initialPlacementRound}`
        }

        container.innerHTML = `
            <div style="font-size: 18px; font-weight: bold; margin-bottom: 10px;">
                Current Player
            </div>
            <div style="font-size: 24px; color: ${this.getColorHex(player.color)};">
                ${player.name}
            </div>
            <div style="margin-top: 10px; font-size: 14px;">
                Phase: ${phaseText}
            </div>
        `
    }

    private getColorHex(color: string): string {
        const colors: Record<string, string> = {
            'red': '#ff0000',
            'blue': '#0000ff',
            'orange': '#ffa500',
            'white': '#ffffff'
        }
        return colors[color] || '#cccccc'
    }

    private setupActions(): void {
        const container = document.getElementById('actions')
        if (!container) {
            console.warn('Actions container not found')
            return
        }

        const state = this.gameEngine.getState()
        const player = this.gameEngine.getCurrentPlayer()

        container.innerHTML = ''

        if (state.phase === GamePhase.InitialPlacement) {
            const placementStatus = this.gameEngine.getInitialPlacementStatus(player.id)
            if (placementStatus) {
                const statusText = document.createElement('div')
                statusText.style.cssText = 'color: white; margin-bottom: 10px; text-align: center;'
                statusText.textContent = `Placement: ${placementStatus.settlements}/2 settlements, ${placementStatus.roads}/2 roads`
                container.appendChild(statusText)
            }

            const infoText = document.createElement('div')
            infoText.style.cssText = 'color: #ccc; margin-top: 10px; font-size: 12px; text-align: center;'
            if (state.initialPlacementRound === 1) {
                infoText.textContent = `Round 1: Click on the board to place your 1st settlement and road (forward order)`
            } else {
                infoText.textContent = `Round 2: Click on the board to place your 2nd settlement and road (reverse order)`
            }
            container.appendChild(infoText)
        } else if (state.phase === GamePhase.RollingDice && !state.diceRolled) {
            const rollButton = document.createElement('button')
            rollButton.textContent = 'Roll Dice'
            rollButton.onclick = () => this.rollDice()
            container.appendChild(rollButton)
        } else if (state.phase === GamePhase.MainPhase) {
            const infoText = document.createElement('div')
            infoText.style.cssText = 'color: #ccc; margin-top: 10px; font-size: 12px; text-align: center;'
            infoText.textContent = 'Click on the board to build settlements, cities, and roads'
            container.appendChild(infoText)

            const endTurnButton = document.createElement('button')
            endTurnButton.textContent = 'End Turn'
            endTurnButton.onclick = () => this.endTurn()
            container.appendChild(endTurnButton)
        } else {
            // Show phase info for other phases
            const phaseInfo = document.createElement('div')
            phaseInfo.style.cssText = 'color: white; padding: 10px;'
            phaseInfo.textContent = `Phase: ${state.phase}`
            container.appendChild(phaseInfo)
        }
    }

    private skipInitialPlacement(): void {
        // Skip to rolling dice phase
        const state = this.gameEngine.getState()
        // We need to add a method to GameEngine to skip initial placement
        // For now, just update the UI to show rolling dice
        this.updateUI()
    }

    private rollDice(): void {
        try {
            this.gameEngine.rollDice()
            this.updateUI()
        } catch (error) {
            alert((error as Error).message)
        }
    }

    private updateDiceDisplay(): void {
        const die1El = document.getElementById('die1')
        const die2El = document.getElementById('die2')
        if (!die1El || !die2El) return

        const state = this.gameEngine.getState()

        if (state.diceRolled && state.lastDie1 !== null && state.lastDie2 !== null) {
            // Dice rolled - show values in greyed out style
            die1El.textContent = state.lastDie1.toString()
            die2El.textContent = state.lastDie2.toString()
            die1El.className = 'dice-value rolled'
            die2El.className = 'dice-value rolled'
        } else {
            // Waiting to roll - show question marks in white
            die1El.textContent = '?'
            die2El.textContent = '?'
            die1El.className = 'dice-value waiting'
            die2El.className = 'dice-value waiting'
        }
    }

    private updateRollDistribution(): void {
        const container = document.getElementById('roll-distribution')
        if (!container) return

        const state = this.gameEngine.getState()
        const distribution = state.rollHistory

        // Create distribution display for sums 2-12
        let html = '<div style="font-weight: bold; margin-bottom: 8px; text-align: center;">Roll Distribution</div>'
        
        // Sums 2-6 and 8-12 (excluding 7)
        const sums = [2, 3, 4, 5, 6, 8, 9, 10, 11, 12]
        sums.forEach(sum => {
            const count = distribution.get(sum) || 0
            const percentage = distribution.size > 0 
                ? ((count / distribution.size) * 100).toFixed(1) 
                : '0.0'
            html += `
                <div style="display: flex; justify-content: space-between; margin: 4px 0; padding: 4px; background: rgba(255,255,255,0.1); border-radius: 4px;">
                    <span>${sum}:</span>
                    <span>${count} (${percentage}%)</span>
                </div>
            `
        })

        // Add 7 separately if it exists
        const count7 = distribution.get(7) || 0
        if (count7 > 0) {
            const percentage7 = ((count7 / distribution.size) * 100).toFixed(1)
            html += `
                <div style="display: flex; justify-content: space-between; margin: 4px 0; padding: 4px; background: rgba(255,0,0,0.2); border-radius: 4px;">
                    <span>7 (Robber):</span>
                    <span>${count7} (${percentage7}%)</span>
                </div>
            `
        }

        if (distribution.size === 0) {
            html += '<div style="text-align: center; color: #888; margin-top: 10px;">No rolls yet</div>'
        }

        container.innerHTML = html
    }


    private endTurn(): void {
        this.gameEngine.endTurn()
        this.updateUI()
    }

    private updateUI(): void {
        this.updatePlayerInfo()
        this.updateCurrentPlayer()
        this.updateDiceDisplay()
        this.updateRollDistribution()
        this.setupActions()
    }
}

