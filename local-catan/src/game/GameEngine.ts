import { GameState, GamePhase, Player, ResourceType, PlayerColor, Hex, Vertex, Edge, NUMBER_TOKENS, RESOURCE_DISTRIBUTION } from './types'
import { InitialPlacementManager } from './InitialPlacement'

export class GameEngine {
    private state: GameState
    private initialPlacement: InitialPlacementManager | null = null

    constructor() {
        this.state = this.initializeGame()
        if (this.state.initialPlacementPhase) {
            this.initialPlacement = new InitialPlacementManager(this.state)
        }
    }

    getState(): GameState {
        return { ...this.state }
    }

    getCurrentPlayer(): Player {
        return this.state.players[this.state.currentPlayerIndex]
    }

    isInitialPlacementPhase(): boolean {
        return this.state.initialPlacementPhase
    }

    getInitialPlacementStatus(playerId: number): { settlements: number, roads: number } | null {
        if (this.initialPlacement) {
            return this.initialPlacement.getCurrentPlacementStatus(playerId)
        }
        return null
    }

    private initializeGame(): GameState {
        // Create 4 players
        const players: Player[] = [
            this.createPlayer(0, 'Player 1', PlayerColor.Red),
            this.createPlayer(1, 'Player 2', PlayerColor.Blue),
            this.createPlayer(2, 'Player 3', PlayerColor.Orange),
            this.createPlayer(3, 'Player 4', PlayerColor.White)
        ]

        // Initialize bank
        const bank = new Map<ResourceType, number>()
        Object.entries(RESOURCE_DISTRIBUTION).forEach(([resource, count]) => {
            if (resource !== ResourceType.Desert) {
                bank.set(resource as ResourceType, count * 19) // Enough for game
            }
        })

        // Create board
        const { hexes, vertices, edges } = this.createBoard()

        // Shuffle development cards
        const developmentCardDeck = this.createDevelopmentCardDeck()

        return {
            players,
            currentPlayerIndex: 0,
            phase: GamePhase.InitialPlacement, // Start with initial placement phase
            hexes,
            vertices,
            edges,
            diceRolled: false,
            lastDiceRoll: null,
            lastDie1: null,
            lastDie2: null,
            rollHistory: new Map<number, number>(), // Distribution: sum -> count
            bank,
            developmentCardDeck,
            longestRoadPlayer: null,
            largestArmyPlayer: null,
            longestRoadLength: 5, // Minimum for longest road
            largestArmySize: 3, // Minimum for largest army
            turnNumber: 0,
            initialPlacementPhase: true,
            initialPlacementRound: 1 // Round 1: forward order, Round 2: reverse order
        }
    }

    private createPlayer(id: number, name: string, color: PlayerColor): Player {
        const resources = new Map<ResourceType, number>()
        Object.values(ResourceType).forEach(resource => {
            if (resource !== ResourceType.Desert) {
                resources.set(resource, 0)
            }
        })

        return {
            id,
            name,
            color,
            resources,
            developmentCards: [],
            victoryPoints: 0,
            settlements: 0,
            cities: 0,
            roads: 0,
            longestRoad: 0,
            knights: 0,
            hasLongestRoad: false,
            hasLargestArmy: false
        }
    }

    private createBoard(): { hexes: Hex[], vertices: Vertex[], edges: Edge[] } {
        const hexes: Hex[] = []
        const vertices: Vertex[] = []
        const edges: Edge[] = []

        // Create hexes with resources
        const resources = [
            ResourceType.Brick, ResourceType.Brick, ResourceType.Brick,
            ResourceType.Wood, ResourceType.Wood, ResourceType.Wood, ResourceType.Wood,
            ResourceType.Sheep, ResourceType.Sheep, ResourceType.Sheep, ResourceType.Sheep,
            ResourceType.Wheat, ResourceType.Wheat, ResourceType.Wheat, ResourceType.Wheat,
            ResourceType.Ore, ResourceType.Ore, ResourceType.Ore,
            ResourceType.Desert
        ]

        // Shuffle resources
        const shuffledResources = this.shuffleArray([...resources])
        const shuffledNumbers = this.shuffleArray([...NUMBER_TOKENS])

        let hexId = 0
        let numberIndex = 0

        // Classic Catan board layout: 3-4-5-4-3 hex pattern
        // Proper hex coordinates using pointy-top hex grid with offset coordinates
        const hexSize = 60
        const hexWidth = hexSize * Math.sqrt(3) // Width of a hex (√3 * size)
        const hexHeight = hexSize * 1.5 // Vertical spacing between hex rows

        // Classic Catan board layout using offset coordinates
        // For pointy-top hexes with odd-r offset:
        // - Even rows (0, 2, 4): x = col * hexWidth
        // - Odd rows (1, 3): x = (col + 0.5) * hexWidth
        // - All rows: y = row * hexHeight
        const layout = [
            // Row 0: 3 hexes (top row) - even row, no offset
            { row: 0, cols: [1, 2, 3] },
            // Row 1: 4 hexes (offset row) - odd row, offset by 0.5
            { row: 1, cols: [0, 1, 2, 3] },
            // Row 2: 5 hexes (center row) - even row, no offset
            { row: 2, cols: [0, 1, 2, 3, 4] },
            // Row 3: 4 hexes (offset row) - odd row, offset by 0.5
            { row: 3, cols: [0, 1, 2, 3] },
            // Row 4: 3 hexes (bottom row) - even row, no offset
            { row: 4, cols: [1, 2, 3] }
        ]

        layout.forEach(({ row, cols }) => {
            cols.forEach((col) => {
                const resource = shuffledResources[hexId]
                const numberToken = resource === ResourceType.Desert ? null : shuffledNumbers[numberIndex++]
                
                // Convert offset coordinates to pixel coordinates
                // For odd-r offset (pointy-top hexes):
                const isOddRow = row % 2 === 1
                const x = (col + (isOddRow ? 0.5 : 0)) * hexWidth
                const y = row * hexHeight
                
                hexes.push({
                    id: hexId++,
                    x,
                    y,
                    resourceType: resource,
                    numberToken,
                    hasRobber: resource === ResourceType.Desert
                })
            })
        })

        // Create vertices (simplified - would need proper hex math)
        let vertexId = 0
        for (let i = 0; i < 54; i++) {
            vertices.push({
                id: vertexId++,
                x: 0, // Will be calculated by renderer
                y: 0,
                building: null,
                playerColor: null
            })
        }

        // Create edges - will be properly connected after vertices are positioned
        // For now, create placeholder edges that will be connected by the renderer
        let edgeId = 0
        for (let i = 0; i < 72; i++) {
            edges.push({
                id: edgeId++,
                vertex1: 0,
                vertex2: 0,
                road: null
            })
        }
        
        // Note: Edges will be properly connected when vertices are positioned
        // This happens in GameRenderer.calculateVertexPositions()
        // Ports will be assigned after vertices are positioned

        return { hexes, vertices, edges }
    }

    // Assign ports to border edges (called after vertices and edges are positioned)
    assignPorts(): void {
        // Find border edges (edges on the outer edge of the board)
        const borderEdges = this.findBorderEdges()
        
        if (borderEdges.length < 9) {
            console.warn(`Not enough border edges found (${borderEdges.length}), need 9 for ports`)
            return
        }

        // Port distribution: 5 specific resource ports (2:1) + 4 generic ports (3:1) = 9 total
        // Official Catan rules: one port for each resource type (Brick, Wood, Sheep, Wheat, Ore) + 4 generic
        const resourcePorts: ResourceType[] = [
            ResourceType.Brick,
            ResourceType.Wood,
            ResourceType.Sheep,
            ResourceType.Wheat,
            ResourceType.Ore
        ]
        
        // Create array with all 9 port types (5 resource + 4 generic)
        const allPortTypes: (ResourceType | '3:1')[] = [
            ...resourcePorts,
            '3:1', '3:1', '3:1', '3:1'
        ]
        
        // Shuffle all port types together so they're randomly distributed
        const shuffledPortTypes = this.shuffleArray([...allPortTypes])
        
        // Sort border edges by position around the board perimeter for fixed placement
        // This ensures ports are always in the same positions (evenly distributed)
        const sortedBorderEdges = this.sortEdgesByPerimeterPosition(borderEdges)
        
        // Place ports at fixed, evenly distributed intervals around the perimeter
        // This gives 9 fixed port positions
        const portCount = 9
        const interval = Math.floor(sortedBorderEdges.length / portCount)
        
        const fixedPortEdges: number[] = []
        for (let i = 0; i < portCount; i++) {
            const index = (i * interval) % sortedBorderEdges.length
            fixedPortEdges.push(sortedBorderEdges[index])
        }
        
        // Assign shuffled port types to fixed port positions
        // This randomizes which port type goes where, but keeps positions fixed
        for (let i = 0; i < portCount; i++) {
            const edgeId = fixedPortEdges[i]
            this.state.edges[edgeId].port = shuffledPortTypes[i]
        }
    }

    // Sort edges by their position around the board perimeter (clockwise from top)
    private sortEdgesByPerimeterPosition(edgeIds: number[]): number[] {
        const edgesWithPositions = edgeIds.map(edgeId => {
            const edge = this.state.edges[edgeId]
            const v1 = this.state.vertices[edge.vertex1]
            const v2 = this.state.vertices[edge.vertex2]
            
            // Calculate midpoint of edge
            const midX = (v1.x + v2.x) / 2
            const midY = (v1.y + v2.y) / 2
            
            // Calculate angle from board center
            const boardCenterX = this.getBoardCenterX()
            const boardCenterY = this.getBoardCenterY()
            const dx = midX - boardCenterX
            const dy = midY - boardCenterY
            
            // Calculate angle in radians (0 = right, increasing clockwise)
            // Adjust so 0 = top, increasing clockwise
            let angle = Math.atan2(dy, dx) + Math.PI / 2
            if (angle < 0) angle += 2 * Math.PI
            
            return { edgeId, angle, midX, midY }
        })
        
        // Sort by angle (clockwise from top)
        edgesWithPositions.sort((a, b) => a.angle - b.angle)
        
        return edgesWithPositions.map(e => e.edgeId)
    }

    // Get approximate board center for angle calculations
    private getBoardCenterX(): number {
        if (this.state.hexes.length === 0) return 0
        const xs = this.state.hexes.map(h => h.x)
        return (Math.min(...xs) + Math.max(...xs)) / 2
    }

    private getBoardCenterY(): number {
        if (this.state.hexes.length === 0) return 0
        const ys = this.state.hexes.map(h => h.y)
        return (Math.min(...ys) + Math.max(...ys)) / 2
    }

    // Find edges on the border of the board (edges connecting border vertices)
    private findBorderEdges(): number[] {
        const borderVertices = this.findBorderVertices()
        const borderVertexSet = new Set(borderVertices)
        const borderEdges: number[] = []
        
        // Find edges where both vertices are on the border
        this.state.edges.forEach((edge, edgeId) => {
            // Check if both vertices are border vertices
            if (borderVertexSet.has(edge.vertex1) && borderVertexSet.has(edge.vertex2)) {
                // Check if this edge is on the outer edge (both vertices are border)
                // and the edge doesn't have a road (to avoid placing ports on used edges)
                if (edge.road === null) {
                    borderEdges.push(edgeId)
                }
            }
        })
        
        return borderEdges
    }

    // Find vertices on the border of the board (adjacent to fewer hexes)
    private findBorderVertices(): number[] {
        const borderVertices: number[] = []
        const hexSize = 60
        
        // Calculate which vertices are on the border
        // Border vertices are those that are only adjacent to 1 or 2 hexes
        // (interior vertices are adjacent to 3 hexes)
        this.state.vertices.forEach((vertex, vertexId) => {
            if (vertex.x === 0 && vertex.y === 0) {
                // Skip uninitialized vertices
                return
            }
            
            // Count how many hexes this vertex is adjacent to
            let adjacentHexCount = 0
            this.state.hexes.forEach(hex => {
                for (let i = 0; i < 6; i++) {
                    const angle = (Math.PI / 3) * i - Math.PI / 2
                    const vx = hex.x + hexSize * Math.cos(angle)
                    const vy = hex.y + hexSize * Math.sin(angle)
                    
                    const dx = vertex.x - vx
                    const dy = vertex.y - vy
                    const distance = Math.sqrt(dx * dx + dy * dy)
                    
                    if (distance < 5) {
                        adjacentHexCount++
                        break
                    }
                }
            })
            
            // Border vertices are adjacent to 1 or 2 hexes
            if (adjacentHexCount <= 2) {
                borderVertices.push(vertexId)
            }
        })
        
        return borderVertices
    }

    private createDevelopmentCardDeck(): any[] {
        // Simplified - would include all dev cards
        return []
    }

    rollDice(): { die1: number, die2: number, total: number } {
        if (this.state.diceRolled) {
            throw new Error('Dice already rolled this turn')
        }

        // Roll two dice, each with values 1-6
        const die1 = Math.floor(Math.random() * 6) + 1
        const die2 = Math.floor(Math.random() * 6) + 1
        const total = die1 + die2

        // Store individual dice values
        this.state.diceRolled = true
        this.state.lastDiceRoll = total
        this.state.lastDie1 = die1
        this.state.lastDie2 = die2

        // Update roll history distribution
        const currentCount = this.state.rollHistory.get(total) || 0
        this.state.rollHistory.set(total, currentCount + 1)

        if (total === 7) {
            // Robber phase - players with >7 resources discard half
            this.handleRobberActivation()
            this.state.phase = GamePhase.MainPhase
        } else {
            // Distribute resources
            this.distributeResources(total)
            this.state.phase = GamePhase.MainPhase
        }

        return { die1, die2, total }
    }

    private distributeResources(diceRoll: number): void {
        // Find all hexes with this number token
        const matchingHexes = this.state.hexes.filter(
            hex => hex.numberToken === diceRoll && !hex.hasRobber
        )

        matchingHexes.forEach(hex => {
            // Find all vertices adjacent to this hex
            const adjacentVertices = this.getVerticesAdjacentToHex(hex.id)
            
            adjacentVertices.forEach(vertexId => {
                const vertex = this.state.vertices[vertexId]
                if (vertex.building !== null && vertex.playerColor !== null) {
                    const player = this.state.players.find(p => p.color === vertex.playerColor)
                    if (player && hex.resourceType !== ResourceType.Desert) {
                        // Give resources: 1 for settlement, 2 for city
                        const amount = vertex.building === 'city' ? 2 : 1
                        const currentAmount = player.resources.get(hex.resourceType) || 0
                        player.resources.set(hex.resourceType, currentAmount + amount)
                    }
                }
            })
        })
    }

    // Get vertices adjacent to a hex (vertices that are part of this hex)
    private getVerticesAdjacentToHex(hexId: number): number[] {
        const hex = this.state.hexes[hexId]
        const hexSize = 60
        const adjacentVertices: number[] = []
        
        // Find vertices that are close to this hex's corners
        // Each hex has 6 vertices at 60-degree intervals
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 2
            const vx = hex.x + hexSize * Math.cos(angle)
            const vy = hex.y + hexSize * Math.sin(angle)
            
            // Find the closest vertex
            let closestVertexId = -1
            let minDistance = Infinity
            
            this.state.vertices.forEach((vertex, index) => {
                const dx = vertex.x - vx
                const dy = vertex.y - vy
                const distance = Math.sqrt(dx * dx + dy * dy)
                if (distance < minDistance && distance < 5) { // Within 5 pixels
                    minDistance = distance
                    closestVertexId = index
                }
            })
            
            if (closestVertexId >= 0 && !adjacentVertices.includes(closestVertexId)) {
                adjacentVertices.push(closestVertexId)
            }
        }
        
        return adjacentVertices
    }

    buildSettlement(vertexId: number, playerId: number): boolean {
        // If in initial placement phase, use initial placement manager
        if (this.state.initialPlacementPhase && this.initialPlacement) {
            const success = this.initialPlacement.placeInitialSettlement(vertexId, playerId)
            // Don't advance yet - wait for road placement
            return success
        }

        // Normal game phase
        const player = this.state.players[playerId]
        const vertex = this.state.vertices[vertexId]

        // Check if player has resources
        if (!this.canAffordSettlement(player)) {
            return false
        }

        // Check if vertex is valid (distance rule, not on another building)
        if (vertex.building !== null) {
            return false
        }

        // Check distance rule (no settlement within 2 edges)
        if (!this.checkDistanceRule(vertexId)) {
            return false
        }

        // Build settlement
        vertex.building = 'settlement'
        vertex.playerColor = player.color
        player.settlements++
        player.victoryPoints++

        // Pay resources
        this.payForSettlement(player)

        return true
    }

    buildCity(vertexId: number, playerId: number): boolean {
        const player = this.state.players[playerId]
        const vertex = this.state.vertices[vertexId]

        // Check if there's a settlement here
        if (vertex.building !== 'settlement' || vertex.playerColor !== player.color) {
            return false
        }

        // Check if player has resources
        if (!this.canAffordCity(player)) {
            return false
        }

        // Build city
        vertex.building = 'city'
        player.cities++
        player.settlements--
        player.victoryPoints++ // City is worth 2, settlement was worth 1, so +1

        // Pay resources
        this.payForCity(player)

        return true
    }

    buildRoad(edgeId: number, playerId: number, vertexId?: number): boolean {
        // If in initial placement phase, use initial placement manager
        if (this.state.initialPlacementPhase && this.initialPlacement && vertexId !== undefined) {
            const success = this.initialPlacement.placeInitialRoad(edgeId, playerId, vertexId)
            if (success) {
                // Check if player completed their turn (settlement + road for current round)
                const status = this.initialPlacement.getCurrentPlacementStatus(playerId)
                const round = this.state.initialPlacementRound
                
                // In round 1, player needs 1 settlement and 1 road
                // In round 2, player needs 2 settlements and 2 roads total
                if (round === 1) {
                    if (status.settlements >= 1 && status.roads >= 1) {
                        this.initialPlacement.advanceToNextPlayer()
                    }
                } else if (round === 2) {
                    if (status.settlements >= 2 && status.roads >= 2) {
                        this.initialPlacement.advanceToNextPlayer()
                    }
                }
            }
            return success
        }

        // Normal game phase
        const player = this.state.players[playerId]
        const edge = this.state.edges[edgeId]

        // Check if edge already has a road
        if (edge.road !== null) {
            return false
        }

        // Check if player has resources
        if (!this.canAffordRoad(player)) {
            return false
        }

        // Check if road is connected to player's existing road/settlement
        if (!this.isRoadConnected(edgeId, playerId)) {
            return false
        }

        // Build road
        edge.road = player.color
        player.roads++

        // Pay resources
        this.payForRoad(player)

        // Check for longest road
        this.updateLongestRoad()

        return true
    }

    private canAffordSettlement(player: Player): boolean {
        return (player.resources.get(ResourceType.Brick) || 0) >= 1 &&
               (player.resources.get(ResourceType.Wood) || 0) >= 1 &&
               (player.resources.get(ResourceType.Sheep) || 0) >= 1 &&
               (player.resources.get(ResourceType.Wheat) || 0) >= 1
    }

    private canAffordCity(player: Player): boolean {
        return (player.resources.get(ResourceType.Wheat) || 0) >= 2 &&
               (player.resources.get(ResourceType.Ore) || 0) >= 3
    }

    private canAffordRoad(player: Player): boolean {
        return (player.resources.get(ResourceType.Brick) || 0) >= 1 &&
               (player.resources.get(ResourceType.Wood) || 0) >= 1
    }

    private payForSettlement(player: Player): void {
        player.resources.set(ResourceType.Brick, (player.resources.get(ResourceType.Brick) || 0) - 1)
        player.resources.set(ResourceType.Wood, (player.resources.get(ResourceType.Wood) || 0) - 1)
        player.resources.set(ResourceType.Sheep, (player.resources.get(ResourceType.Sheep) || 0) - 1)
        player.resources.set(ResourceType.Wheat, (player.resources.get(ResourceType.Wheat) || 0) - 1)
    }

    private payForCity(player: Player): void {
        player.resources.set(ResourceType.Wheat, (player.resources.get(ResourceType.Wheat) || 0) - 2)
        player.resources.set(ResourceType.Ore, (player.resources.get(ResourceType.Ore) || 0) - 3)
    }

    private payForRoad(player: Player): void {
        player.resources.set(ResourceType.Brick, (player.resources.get(ResourceType.Brick) || 0) - 1)
        player.resources.set(ResourceType.Wood, (player.resources.get(ResourceType.Wood) || 0) - 1)
    }

    // Check if a road is connected to player's existing roads/settlements
    private isRoadConnected(edgeId: number, playerId: number): boolean {
        const edge = this.state.edges[edgeId]
        const player = this.state.players[playerId]
        
        // Check if either vertex has a building or connected road
        const v1 = this.state.vertices[edge.vertex1]
        const v2 = this.state.vertices[edge.vertex2]
        
        // Check if connected to player's settlement/city
        if ((v1.building !== null && v1.playerColor === player.color) ||
            (v2.building !== null && v2.playerColor === player.color)) {
            return true
        }
        
        // Check if connected to player's existing road
        const connectedEdges = this.getConnectedEdges(edgeId)
        for (const connectedEdgeId of connectedEdges) {
            const connectedEdge = this.state.edges[connectedEdgeId]
            if (connectedEdge.road === player.color) {
                return true
            }
        }
        
        return false
    }

    // Get edges connected to a given edge (share a vertex)
    private getConnectedEdges(edgeId: number): number[] {
        const edge = this.state.edges[edgeId]
        const connected: number[] = []
        
        // Find all edges that share a vertex with this edge
        this.state.edges.forEach((otherEdge, index) => {
            if (index !== edgeId) {
                if (otherEdge.vertex1 === edge.vertex1 || otherEdge.vertex1 === edge.vertex2 ||
                    otherEdge.vertex2 === edge.vertex1 || otherEdge.vertex2 === edge.vertex2) {
                    connected.push(index)
                }
            }
        })
        
        return connected
    }

    private updateLongestRoad(): void {
        // Calculate longest road for each player
        let longestPlayer: number | null = null
        let longestLength = 0
        
        this.state.players.forEach(player => {
            const length = this.calculateLongestRoad(player.id)
            if (length > longestLength) {
                longestLength = length
                longestPlayer = player.id
            } else if (length === longestLength && length >= 5) {
                // Tie goes to current holder, or first to reach 5
                if (this.state.longestRoadPlayer === player.id) {
                    longestPlayer = player.id
                }
            }
        })
        
        // Update longest road
        if (longestLength >= 5) {
            // Remove VP from previous holder
            if (this.state.longestRoadPlayer !== null) {
                const prevPlayer = this.state.players[this.state.longestRoadPlayer]
                if (prevPlayer.hasLongestRoad) {
                    prevPlayer.victoryPoints -= 2
                    prevPlayer.hasLongestRoad = false
                }
            }
            
            // Award VP to new holder
            if (longestPlayer !== null && longestPlayer !== this.state.longestRoadPlayer) {
                const newPlayer = this.state.players[longestPlayer]
                newPlayer.victoryPoints += 2
                newPlayer.hasLongestRoad = true
                this.state.longestRoadPlayer = longestPlayer
                this.state.longestRoadLength = longestLength
            }
        }
    }

    // Calculate the longest continuous road for a player
    private calculateLongestRoad(playerId: number): number {
        const player = this.state.players[playerId]
        const playerRoads = this.state.edges
            .map((edge, index) => ({ edge, index }))
            .filter(({ edge }) => edge.road === player.color)
            .map(({ index }) => index)
        
        if (playerRoads.length === 0) {
            return 0
        }
        
        // Find longest path using DFS
        let maxLength = 0
        const visited = new Set<number>()
        
        for (const startEdgeId of playerRoads) {
            if (!visited.has(startEdgeId)) {
                const length = this.findLongestPathFromEdge(startEdgeId, playerId, visited)
                maxLength = Math.max(maxLength, length)
            }
        }
        
        return maxLength
    }

    // Find longest path starting from an edge
    private findLongestPathFromEdge(edgeId: number, playerId: number, visited: Set<number>): number {
        visited.add(edgeId)
        const edge = this.state.edges[edgeId]
        let maxLength = 1
        
        // Try continuing from both vertices
        const vertices = [edge.vertex1, edge.vertex2]
        for (const vertexId of vertices) {
            const connectedEdges = this.getEdgesConnectedToVertex(vertexId)
            for (const nextEdgeId of connectedEdges) {
                if (nextEdgeId !== edgeId && 
                    !visited.has(nextEdgeId) &&
                    this.state.edges[nextEdgeId].road === this.state.players[playerId].color) {
                    const length = 1 + this.findLongestPathFromEdge(nextEdgeId, playerId, visited)
                    maxLength = Math.max(maxLength, length)
                }
            }
        }
        
        visited.delete(edgeId) // Backtrack
        return maxLength
    }

    // Get edges connected to a vertex
    private getEdgesConnectedToVertex(vertexId: number): number[] {
        const connected: number[] = []
        this.state.edges.forEach((edge, index) => {
            if (edge.vertex1 === vertexId || edge.vertex2 === vertexId) {
                connected.push(index)
            }
        })
        return connected
    }

    // Handle robber activation when 7 is rolled
    private handleRobberActivation(): void {
        // Players with more than 7 resources must discard half (rounded down)
        this.state.players.forEach(player => {
            const totalResources = Array.from(player.resources.values())
                .reduce((sum, count) => sum + count, 0)
            
            if (totalResources > 7) {
                const discardCount = Math.floor(totalResources / 2)
                // For now, discard randomly (in a real game, player chooses)
                this.discardResources(player, discardCount)
            }
        })
    }

    // Discard resources from a player (simplified - random discard)
    private discardResources(player: Player, count: number): void {
        const resources: ResourceType[] = []
        player.resources.forEach((amount, resource) => {
            for (let i = 0; i < amount; i++) {
                resources.push(resource)
            }
        })
        
        // Shuffle and discard
        const shuffled = this.shuffleArray(resources)
        const toDiscard = shuffled.slice(0, count)
        
        toDiscard.forEach(resource => {
            const current = player.resources.get(resource) || 0
            player.resources.set(resource, current - 1)
            // Return to bank
            const bankAmount = this.state.bank.get(resource) || 0
            this.state.bank.set(resource, bankAmount + 1)
        })
    }

    // Move robber to a new hex (called when player chooses)
    moveRobber(hexId: number): void {
        // Remove robber from current hex
        this.state.hexes.forEach(hex => {
            if (hex.hasRobber) {
                hex.hasRobber = false
            }
        })
        
        // Place robber on new hex
        const targetHex = this.state.hexes[hexId]
        if (targetHex && targetHex.resourceType !== ResourceType.Desert) {
            targetHex.hasRobber = true
        }
        
        // Player may steal one resource from a player with settlement/city adjacent
        // This would be handled by UI - for now just move the robber
    }

    endTurn(): void {
        this.state.diceRolled = false
        this.state.lastDie1 = null // Reset dice display
        this.state.lastDie2 = null
        this.state.currentPlayerIndex = (this.state.currentPlayerIndex + 1) % 4
        this.state.turnNumber++
        this.state.phase = GamePhase.RollingDice

        // Check for winner
        if (this.getCurrentPlayer().victoryPoints >= 10) {
            this.state.phase = GamePhase.GameOver
        }
    }

    private shuffleArray<T>(array: T[]): T[] {
        const shuffled = [...array]
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
        }
        return shuffled
    }

    // Check what can be placed at a vertex
    getVertexPlacementOptions(vertexId: number): string[] {
        const options: string[] = []
        const state = this.getState()
        const currentPlayer = this.getCurrentPlayer()
        const vertex = state.vertices[vertexId]

        if (state.initialPlacementPhase && this.initialPlacement) {
            // Initial placement phase
            if (this.initialPlacement.canPlaceSettlement(vertexId, currentPlayer.id)) {
                options.push('settlement')
            }
        } else {
            // Normal game phase
            if (vertex.building === null) {
                // Empty vertex - can build settlement if distance rule allows
                if (this.canAffordSettlement(currentPlayer) && this.checkDistanceRule(vertexId)) {
                    options.push('settlement')
                }
            } else if (vertex.building === 'settlement' && vertex.playerColor === currentPlayer.color) {
                // Player's settlement - can upgrade to city
                if (this.canAffordCity(currentPlayer)) {
                    options.push('city')
                }
            }
        }

        return options
    }

    // Check distance rule: settlements must be at least 2 edges apart
    // This means no building at distance 1 (adjacent vertices)
    private checkDistanceRule(vertexId: number): boolean {
        // Find all vertices at distance 1 (adjacent vertices)
        const adjacentVertices = this.getAdjacentVertices(vertexId)
        
        // Check if any adjacent vertex has a building
        for (const adjId of adjacentVertices) {
            const adjVertex = this.state.vertices[adjId]
            if (adjVertex.building !== null) {
                return false // Too close - only 1 edge away
            }
        }
        
        return true
    }

    // Get all vertices adjacent to a given vertex (connected by edges)
    private getAdjacentVertices(vertexId: number): number[] {
        const adjacent = new Set<number>()
        
        // Find all edges connected to this vertex
        for (const edge of this.state.edges) {
            if (edge.vertex1 === vertexId) {
                adjacent.add(edge.vertex2)
            } else if (edge.vertex2 === vertexId) {
                adjacent.add(edge.vertex1)
            }
        }
        
        return Array.from(adjacent)
    }

    // Check what can be placed at an edge
    getEdgePlacementOptions(edgeId: number, vertexId?: number): string[] {
        const options: string[] = []
        const state = this.getState()
        const currentPlayer = this.getCurrentPlayer()
        const edge = state.edges[edgeId]

        if (state.initialPlacementPhase && this.initialPlacement && vertexId !== undefined) {
            // Initial placement phase
            if (this.initialPlacement.canPlaceRoad(edgeId, currentPlayer.id, vertexId)) {
                options.push('road')
            }
        } else {
            // Normal game phase
            if (edge.road === null) {
                // Empty edge - can build road
                if (this.canAffordRoad(currentPlayer)) {
                    // Check if connected to player's road/settlement
                    if (this.isRoadConnected(edgeId, currentPlayer.id)) {
                        options.push('road')
                    }
                }
            }
        }

        return options
    }
}

