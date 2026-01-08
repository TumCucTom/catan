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
            const result = this.gameEngine.rollDice()
            this.showDiceResult(result)
            this.updateUI()
        } catch (error) {
            alert((error as Error).message)
        }
    }

    private showDiceResult(value: number): void {
        const diceResult = document.getElementById('dice-result')
        const diceValue = document.getElementById('dice-value')
        if (diceResult && diceValue) {
            diceValue.textContent = value.toString()
            diceResult.classList.add('show')
        }
    }


    private endTurn(): void {
        this.gameEngine.endTurn()
        this.updateUI()
    }

    private updateUI(): void {
        this.updatePlayerInfo()
        this.updateCurrentPlayer()
        this.setupActions()
    }
}

