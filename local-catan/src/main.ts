import { GameEngine } from './game/GameEngine'
import { GameRenderer } from './ui/GameRenderer'
import { UIManager } from './ui/UIManager'

class LocalCatanGame {
    private gameEngine: GameEngine
    private renderer: GameRenderer
    private uiManager: UIManager

    constructor() {
        try {
            this.gameEngine = new GameEngine()
            this.renderer = new GameRenderer(this.gameEngine)
            this.uiManager = new UIManager(this.gameEngine, this.renderer)
            
            this.init().catch(err => {
                console.error('Failed to initialize game:', err)
                this.showError(err)
            })
        } catch (error) {
            console.error('Failed to create game:', error)
            this.showError(error as Error)
        }
    }

    private async init(): Promise<void> {
        try {
            await this.renderer.init()
            await this.uiManager.init()
            this.gameLoop()
        } catch (error) {
            console.error('Initialization error:', error)
            throw error
        }
    }

    private gameLoop(): void {
        const loop = () => {
            try {
                this.renderer.render()
            } catch (error) {
                console.error('Render error:', error)
            }
            requestAnimationFrame(loop)
        }
        loop()
    }

    private showError(error: Error): void {
        const errorDiv = document.createElement('div')
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(255, 0, 0, 0.9);
            color: white;
            padding: 20px;
            border-radius: 8px;
            z-index: 10000;
            max-width: 500px;
        `
        errorDiv.innerHTML = `
            <h2>Error Loading Game</h2>
            <p>${error.message}</p>
            <p style="font-size: 12px; margin-top: 10px;">Check the browser console for details.</p>
        `
        document.body.appendChild(errorDiv)
    }
}

// Start the game when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new LocalCatanGame()
    })
} else {
    new LocalCatanGame()
}

