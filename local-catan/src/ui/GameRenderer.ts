import { Application, Graphics, Container, Text, TextStyle } from 'pixi.js'
import { GameEngine } from '../game/GameEngine'
import { Hex, Vertex, Edge, PlayerColor } from '../game/types'

export class GameRenderer {
    private app: Application
    private gameEngine: GameEngine
    private hexGraphics: Map<number, Graphics> = new Map()
    private vertexGraphics: Map<number, Graphics> = new Map()
    private edgeGraphics: Map<number, Graphics> = new Map()
    private placementMenu: Container | null = null
    private onPlacementSelected?: (type: string, id: number, vertexId?: number) => void

    constructor(gameEngine: GameEngine) {
        this.gameEngine = gameEngine
    }

    async init(): Promise<void> {
        const canvas = document.getElementById('game-canvas') as HTMLCanvasElement
        if (!canvas) {
            throw new Error('Canvas element not found. Make sure index.html has #game-canvas element.')
        }

        try {
            // PixiJS v7 initialization - pass options directly to constructor
            this.app = new Application({
                view: canvas,
                width: window.innerWidth,
                height: window.innerHeight,
                backgroundColor: 0x2d5016,
                antialias: true,
                resolution: window.devicePixelRatio || 1,
                autoDensity: true
            })

            window.addEventListener('resize', () => {
                this.app.renderer.resize(window.innerWidth, window.innerHeight)
                // Redraw board on resize
                this.drawBoard()
            })

            this.drawBoard()
            console.log('Game renderer initialized successfully')
        } catch (error) {
            console.error('Failed to initialize PixiJS:', error)
            throw new Error(`Failed to initialize renderer: ${error}`)
        }
    }

    drawBoard(): void {
        // Clear existing graphics
        this.hexGraphics.forEach(g => g.destroy())
        this.vertexGraphics.forEach(g => g.destroy())
        this.edgeGraphics.forEach(g => g.destroy())
        this.hexGraphics.clear()
        this.vertexGraphics.clear()
        this.edgeGraphics.clear()
        this.app.stage.removeChildren()

        const state = this.gameEngine.getState()
        
        // Calculate board bounds to center it properly
        let minX = Infinity, maxX = -Infinity
        let minY = Infinity, maxY = -Infinity
        
        state.hexes.forEach(hex => {
            minX = Math.min(minX, hex.x)
            maxX = Math.max(maxX, hex.x)
            minY = Math.min(minY, hex.y)
            maxY = Math.max(maxY, hex.y)
        })
        
        const boardWidth = maxX - minX
        const boardHeight = maxY - minY
        const boardCenterX = (minX + maxX) / 2
        const boardCenterY = (minY + maxY) / 2
        
        const screenCenterX = this.app.screen.width / 2
        const screenCenterY = this.app.screen.height / 2
        
        const offsetX = screenCenterX - boardCenterX
        const offsetY = screenCenterY - boardCenterY

        console.log(`Drawing board at center: ${screenCenterX}, ${screenCenterY}`)
        console.log(`Board bounds: ${minX}, ${minY} to ${maxX}, ${maxY}`)
        console.log(`Board center: ${boardCenterX}, ${boardCenterY}`)
        console.log(`Offset: ${offsetX}, ${offsetY}`)
        console.log(`Hexes to draw: ${state.hexes.length}`)

        // Draw hexes
        state.hexes.forEach(hex => {
            const hexGraphic = this.drawHex(hex, offsetX, offsetY)
            this.hexGraphics.set(hex.id, hexGraphic)
            this.app.stage.addChild(hexGraphic)
        })

        // Draw vertices (placement spots and buildings)
        // Calculate vertex positions from hex positions
        this.calculateVertexPositions(state.hexes, offsetX, offsetY)
        
        // Connect edges to vertices based on proximity
        this.connectEdgesToVertices(state.vertices, state.edges)
        
        // Assign ports to border edges (only once, after vertices and edges are positioned)
        const hasPorts = state.edges.some(e => e.port !== undefined && e.port !== null)
        if (!hasPorts) {
            this.gameEngine.assignPorts()
        }
        
        state.vertices.forEach(vertex => {
            const vertexGraphic = this.drawVertex(vertex, offsetX, offsetY)
            this.vertexGraphics.set(vertex.id, vertexGraphic)
            this.app.stage.addChild(vertexGraphic)
        })

        // Draw edges (roads and placement spots)
        state.edges.forEach(edge => {
            const edgeGraphic = this.drawEdge(edge, offsetX, offsetY)
            this.edgeGraphics.set(edge.id, edgeGraphic)
            this.app.stage.addChild(edgeGraphic)
        })

        // Draw ports (on border edges, with lines to vertices)
        state.edges.forEach(edge => {
            if (edge.port) {
                const portGraphic = this.drawPort(edge, offsetX, offsetY)
                this.app.stage.addChild(portGraphic)
            }
        })

        console.log('Board drawn successfully')
    }

    private drawHex(hex: Hex, offsetX: number, offsetY: number): Graphics {
        const graphic = new Graphics()
        const size = 60
        // Use the offset to center the board
        const x = hex.x + offsetX
        const y = hex.y + offsetY

        // Hex color based on resource
        const colors: Record<string, number> = {
            'brick': 0x8b4513,
            'wood': 0x228b22,
            'sheep': 0x90ee90,
            'wheat': 0xffd700,
            'ore': 0x708090,
            'desert': 0xf4a460
        }

        const color = colors[hex.resourceType] || 0xcccccc

        // Draw hexagon using PixiJS v7 API
        graphic.beginFill(color)
        graphic.lineStyle(2, 0x000000)
        graphic.drawPolygon([
            x, y - size,
            x + size * 0.866, y - size * 0.5,
            x + size * 0.866, y + size * 0.5,
            x, y + size,
            x - size * 0.866, y + size * 0.5,
            x - size * 0.866, y - size * 0.5
        ])
        graphic.endFill()

        // Draw number token
        if (hex.numberToken !== null && typeof hex.numberToken === 'number') {
            // Draw token background circle
            graphic.beginFill(0xffffff)
            graphic.drawCircle(x, y, 18)
            graphic.endFill()
            
            // Draw token border
            graphic.lineStyle(2, 0x000000)
            graphic.drawCircle(x, y, 18)
            graphic.lineStyle(0) // Reset line style
            
            // Draw number text - PixiJS v7 Text constructor
            const numberValue = hex.numberToken
            const tokenStyle = new TextStyle({
                fontSize: 20,
                fill: numberValue === 6 || numberValue === 8 ? 0xff0000 : 0x000000,
                fontWeight: 'bold',
                fontFamily: 'Arial, sans-serif'
            })
            // Create text with string explicitly
            const numberString = String(numberValue)
            const tokenText = new Text(numberString, tokenStyle)
            tokenText.anchor.set(0.5)
            tokenText.x = x
            tokenText.y = y
            graphic.addChild(tokenText)
        }

        // Draw robber
        if (hex.hasRobber) {
            graphic.beginFill(0x000000)
            graphic.drawCircle(x, y, 15)
            graphic.endFill()
        }

        return graphic
    }

    private connectEdgesToVertices(vertices: Vertex[], edges: Edge[]): void {
        // Connect edges to vertices based on proximity
        // Each edge should connect two vertices that are close together
        const hexSize = 60
        const maxEdgeLength = hexSize * 1.2 // Maximum distance for an edge
        
        let edgeIndex = 0
        
        for (let i = 0; i < vertices.length && edgeIndex < edges.length; i++) {
            const v1 = vertices[i]
            
            // Find nearby vertices to connect
            for (let j = i + 1; j < vertices.length && edgeIndex < edges.length; j++) {
                const v2 = vertices[j]
                const dx = v2.x - v1.x
                const dy = v2.y - v1.y
                const distance = Math.sqrt(dx * dx + dy * dy)
                
                // If vertices are close enough, they might share an edge
                // In a hex grid, edges connect vertices that are about hexSize apart
                if (distance > hexSize * 0.8 && distance < hexSize * 1.2) {
                    edges[edgeIndex].vertex1 = v1.id
                    edges[edgeIndex].vertex2 = v2.id
                    edgeIndex++
                }
            }
        }
    }

    private calculateVertexPositions(hexes: Hex[], offsetX: number, offsetY: number): void {
        const state = this.gameEngine.getState()
        const hexSize = 60
        const vertexPositions = new Map<string, { x: number, y: number, id: number }>()
        
        // Calculate vertex positions from hex centers
        // Each hex has 6 vertices at 60-degree intervals
        hexes.forEach(hex => {
            const centerX = hex.x
            const centerY = hex.y
            
            // Calculate 6 vertices around each hex
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 3) * i - Math.PI / 2 // Start from top
                const vx = centerX + hexSize * Math.cos(angle)
                const vy = centerY + hexSize * Math.sin(angle)
                
                // Round to avoid duplicate vertices (shared vertices between hexes)
                const roundedX = Math.round(vx * 10) / 10
                const roundedY = Math.round(vy * 10) / 10
                const key = `${roundedX},${roundedY}`
                
                if (!vertexPositions.has(key)) {
                    vertexPositions.set(key, { x: vx, y: vy, id: vertexPositions.size })
                }
            }
        })
        
        // Update vertex positions in state (only update existing vertices)
        const sortedVertices = Array.from(vertexPositions.values()).sort((a, b) => {
            if (Math.abs(a.y - b.y) < 1) return a.x - b.x
            return a.y - b.y
        })
        
        sortedVertices.forEach((pos, index) => {
            if (index < state.vertices.length) {
                state.vertices[index].x = pos.x
                state.vertices[index].y = pos.y
            }
        })
    }

    private drawVertex(vertex: Vertex, offsetX: number, offsetY: number): Graphics {
        const graphic = new Graphics()
        const x = offsetX + vertex.x
        const y = offsetY + vertex.y

        if (vertex.building === 'settlement') {
            const colors: Record<string, number> = {
                'red': 0xff0000,
                'blue': 0x0000ff,
                'orange': 0xffa500,
                'white': 0xffffff
            }
            graphic.beginFill(colors[vertex.playerColor || 'red'] || 0xcccccc)
            graphic.lineStyle(2, 0x000000)
            graphic.drawCircle(x, y, 10)
            graphic.endFill()
            
            // Make clickable if it's the current player's settlement (for city upgrade)
            const state = this.gameEngine.getState()
            const currentPlayer = this.gameEngine.getCurrentPlayer()
            if (vertex.playerColor === currentPlayer.color) {
                graphic.interactive = true
                graphic.cursor = 'pointer'
                graphic.on('pointerdown', () => {
                    this.handleVertexClick(vertex.id, x, y)
                })
            }
        } else if (vertex.building === 'city') {
            const colors: Record<string, number> = {
                'red': 0xff0000,
                'blue': 0x0000ff,
                'orange': 0xffa500,
                'white': 0xffffff
            }
            graphic.beginFill(colors[vertex.playerColor || 'red'] || 0xcccccc)
            graphic.lineStyle(2, 0x000000)
            graphic.drawRect(x - 12, y - 12, 24, 24)
            graphic.endFill()
        } else {
            // Draw placement spot (empty vertex) - like colonist.io
            graphic.beginFill(0xffffff, 0.3) // Semi-transparent white
            graphic.lineStyle(1, 0x888888, 0.5) // Semi-transparent gray border
            graphic.drawCircle(x, y, 6)
            graphic.endFill()
            
            // Make it interactive
            graphic.interactive = true
            graphic.cursor = 'pointer'
            graphic.on('pointerdown', () => {
                this.handleVertexClick(vertex.id, x, y)
            })
        }

        return graphic
    }

    private drawEdge(edge: Edge, offsetX: number, offsetY: number): Graphics {
        const graphic = new Graphics()
        const state = this.gameEngine.getState()
        
        // Get vertex positions for this edge
        const v1 = state.vertices[edge.vertex1]
        const v2 = state.vertices[edge.vertex2]
        const x1 = offsetX + v1.x
        const y1 = offsetY + v1.y
        const x2 = offsetX + v2.x
        const y2 = offsetY + v2.y
        
        if (edge.road) {
            const colors: Record<string, number> = {
                'red': 0xff0000,
                'blue': 0x0000ff,
                'orange': 0xffa500,
                'white': 0xffffff
            }
            // Draw road line
            graphic.lineStyle(4, colors[edge.road] || 0xcccccc)
            graphic.moveTo(x1, y1)
            graphic.lineTo(x2, y2)
        } else {
            // Draw placement spot for empty edge
            const midX = (x1 + x2) / 2
            const midY = (y1 + y2) / 2
            graphic.beginFill(0xffffff, 0.2)
            graphic.lineStyle(1, 0x888888, 0.3)
            graphic.drawCircle(midX, midY, 4)
            graphic.endFill()
            
            // Make it interactive
            graphic.interactive = true
            graphic.cursor = 'pointer'
            graphic.on('pointerdown', () => {
                this.handleEdgeClick(edge.id, midX, midY)
            })
        }
        return graphic
    }

    private drawPort(edge: Edge, offsetX: number, offsetY: number): Graphics {
        const graphic = new Graphics()
        const state = this.gameEngine.getState()
        
        // Get vertex positions for this edge
        const v1 = state.vertices[edge.vertex1]
        const v2 = state.vertices[edge.vertex2]
        const x1 = offsetX + v1.x
        const y1 = offsetY + v1.y
        const x2 = offsetX + v2.x
        const y2 = offsetY + v2.y
        
        // Port is positioned at the midpoint of the edge, but pushed outward
        const midX = (x1 + x2) / 2
        const midY = (y1 + y2) / 2
        
        // Calculate direction outward from board center
        const boardCenterX = this.app.screen.width / 2
        const boardCenterY = this.app.screen.height / 2
        const dx = midX - boardCenterX
        const dy = midY - boardCenterY
        const distance = Math.sqrt(dx * dx + dy * dy)
        const pushDistance = 40 // Distance to push port outward
        
        const portX = midX + (dx / distance) * pushDistance
        const portY = midY + (dy / distance) * pushDistance
        
        // Port colors
        const portColors: Record<string, number> = {
            'brick': 0x8b4513,
            'wood': 0x228b22,
            'sheep': 0x90ee90,
            'wheat': 0xffd700,
            'ore': 0x708090, // Slate gray for ore
            '3:1': 0x4169E1 // Royal blue for generic 3:1 ports (distinct from ore gray)
        }
        const portColor = portColors[edge.port!] || 0x888888
        
        // Draw lines from port to both vertices
        graphic.lineStyle(2, portColor, 0.6)
        graphic.moveTo(portX, portY)
        graphic.lineTo(x1, y1)
        graphic.moveTo(portX, portY)
        graphic.lineTo(x2, y2)
        
        // Draw port circle (bigger)
        graphic.beginFill(portColor, 0.9)
        graphic.drawCircle(portX, portY, 18) // Bigger size
        graphic.endFill()
        
        // Draw port border
        graphic.lineStyle(3, 0x000000)
        graphic.drawCircle(portX, portY, 18)
        graphic.lineStyle(0)
        
        // Add port text
        const portText = edge.port === '3:1' ? '3:1' : '2:1'
        const textStyle = new TextStyle({
            fontSize: 14,
            fill: 0xffffff,
            fontWeight: 'bold',
            fontFamily: 'Arial, sans-serif'
        })
        const text = new Text(portText, textStyle)
        text.anchor.set(0.5)
        text.x = portX
        text.y = portY
        graphic.addChild(text)
        
        return graphic
    }

    setPlacementCallback(callback: (type: string, id: number, vertexId?: number) => void): void {
        this.onPlacementSelected = callback
    }

    private handleVertexClick(vertexId: number, x: number, y: number): void {
        const options = this.gameEngine.getVertexPlacementOptions(vertexId)
        if (options.length > 0) {
            this.showPlacementMenu(options, x, y, (type: string) => {
                if (this.onPlacementSelected) {
                    this.onPlacementSelected(type, vertexId)
                }
            })
        }
    }

    private handleEdgeClick(edgeId: number, x: number, y: number): void {
        const state = this.gameEngine.getState()
        const edge = state.edges[edgeId]
        const currentPlayer = this.gameEngine.getCurrentPlayer()
        
        // Try both vertices to see which one allows road placement
        const options1 = this.gameEngine.getEdgePlacementOptions(edgeId, edge.vertex1)
        const options2 = this.gameEngine.getEdgePlacementOptions(edgeId, edge.vertex2)
        const options = [...new Set([...options1, ...options2])]
        
        if (options.length > 0) {
            this.showPlacementMenu(options, x, y, (type: string) => {
                if (this.onPlacementSelected) {
                    // For roads in initial placement, find which vertex has the settlement
                    // For normal game, either vertex works (connectivity is checked differently)
                    let vertexId = edge.vertex1
                    if (state.initialPlacementPhase) {
                        // Prefer the vertex with the player's settlement
                        const v1 = state.vertices[edge.vertex1]
                        const v2 = state.vertices[edge.vertex2]
                        if (v2.building === 'settlement' && v2.playerColor === currentPlayer.color) {
                            vertexId = edge.vertex2
                        } else if (v1.building === 'settlement' && v1.playerColor === currentPlayer.color) {
                            vertexId = edge.vertex1
                        }
                    }
                    this.onPlacementSelected(type, edgeId, vertexId)
                }
            })
        }
    }

    private showPlacementMenu(options: string[], x: number, y: number, onSelect: (type: string) => void): void {
        // Remove existing menu
        if (this.placementMenu) {
            this.app.stage.removeChild(this.placementMenu)
            this.placementMenu.destroy()
        }

        const menu = new Container()
        const menuWidth = 120
        const menuHeight = options.length * 40 + 20
        const padding = 10

        // Draw menu background
        const bg = new Graphics()
        bg.beginFill(0x2a2a2a, 0.95)
        bg.lineStyle(2, 0xffffff)
        bg.drawRoundedRect(-menuWidth / 2, -menuHeight - 20, menuWidth, menuHeight, 8)
        bg.endFill()
        menu.addChild(bg)

        // Draw options
        options.forEach((option, index) => {
            const optionY = -menuHeight - 10 + index * 40 + 20
            const optionRect = new Graphics()
            
            optionRect.beginFill(0x4a90e2, 0.8)
            optionRect.drawRoundedRect(-menuWidth / 2 + padding, optionY - 15, menuWidth - padding * 2, 30, 4)
            optionRect.endFill()
            
            // Add text
            const textStyle = new TextStyle({
                fontSize: 14,
                fill: 0xffffff,
                fontWeight: 'bold',
                fontFamily: 'Arial, sans-serif'
            })
            const text = new Text(option.charAt(0).toUpperCase() + option.slice(1), textStyle)
            text.anchor.set(0.5)
            text.x = 0
            text.y = optionY
            optionRect.addChild(text)
            
            // Make clickable
            optionRect.interactive = true
            optionRect.cursor = 'pointer'
            optionRect.on('pointerdown', () => {
                onSelect(option)
                this.hidePlacementMenu()
            })
            optionRect.on('pointerover', () => {
                optionRect.clear()
                optionRect.beginFill(0x5aa0f2, 0.9)
                optionRect.drawRoundedRect(-menuWidth / 2 + padding, optionY - 15, menuWidth - padding * 2, 30, 4)
                optionRect.endFill()
                optionRect.addChild(text)
            })
            optionRect.on('pointerout', () => {
                optionRect.clear()
                optionRect.beginFill(0x4a90e2, 0.8)
                optionRect.drawRoundedRect(-menuWidth / 2 + padding, optionY - 15, menuWidth - padding * 2, 30, 4)
                optionRect.endFill()
                optionRect.addChild(text)
            })
            
            menu.addChild(optionRect)
        })

        menu.x = x
        menu.y = y
        this.placementMenu = menu
        this.app.stage.addChild(menu)
    }

    private hidePlacementMenu(): void {
        if (this.placementMenu) {
            this.app.stage.removeChild(this.placementMenu)
            this.placementMenu.destroy()
            this.placementMenu = null
        }
    }

    render(): void {
        // Update graphics based on current game state
        const state = this.gameEngine.getState()
        
        // Update hexes (robber position)
        state.hexes.forEach(hex => {
            const graphic = this.hexGraphics.get(hex.id)
            if (graphic) {
                // Update robber visualization
            }
        })

        // Update vertices (buildings)
        state.vertices.forEach(vertex => {
            const graphic = this.vertexGraphics.get(vertex.id)
            if (graphic) {
                // Update building visualization
            }
        })

        // Update edges (roads)
        state.edges.forEach(edge => {
            const graphic = this.edgeGraphics.get(edge.id)
            if (graphic) {
                // Update road visualization
            }
        })
    }
}

