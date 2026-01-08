import { GameState, GamePhase, Player, Vertex, Edge, ResourceType } from './types'

export class InitialPlacementManager {
    private state: GameState
    private placementsPerPlayer: Map<number, { settlements: number, roads: number }> = new Map()

    constructor(state: GameState) {
        this.state = state
        // Initialize placement tracking
        this.state.players.forEach(player => {
            this.placementsPerPlayer.set(player.id, { settlements: 0, roads: 0 })
        })
    }

    getState(): GameState {
        return this.state
    }

    canPlaceSettlement(vertexId: number, playerId: number): boolean {
        const vertex = this.state.vertices[vertexId]
        const player = this.state.players[playerId]
        const placements = this.placementsPerPlayer.get(playerId)!

        // Check if it's the current player's turn
        if (this.state.currentPlayerIndex !== playerId) {
            return false
        }

        // In round 1, player can place 1 settlement (settlements = 0), then must place road
        if (this.state.initialPlacementRound === 1) {
            if (placements.settlements >= 1) {
                // Already placed settlement - must place road first before next settlement
                return false
            }
        } else {
            // Round 2: player needs 2 settlements total
            if (placements.settlements >= 2) {
                return false // Already placed both settlements
            }
            // In round 2, player should have 1 settlement and 1 road from round 1
            // If they've placed their 2nd settlement, must place road before advancing
            // But they can't place a 3rd settlement, so this check is handled above
            // The key is: if settlements = 1 and roads = 1, they can place 2nd settlement
            // If settlements = 2 and roads = 1, they must place road (handled in canPlaceRoad)
        }

        // Check if vertex is already occupied
        if (vertex.building !== null) {
            return false
        }

        // In initial placement, distance rule is enforced (no settlement within 2 edges)
        return this.checkDistanceRule(vertexId)
    }

    canPlaceRoad(edgeId: number, playerId: number, vertexId: number): boolean {
        const edge = this.state.edges[edgeId]
        const player = this.state.players[playerId]
        const placements = this.placementsPerPlayer.get(playerId)!

        // Check if it's the current player's turn
        if (this.state.currentPlayerIndex !== playerId) {
            return false
        }

        // In round 1, player must have placed settlement first
        // In round 2, player must have placed settlement first
        if (this.state.initialPlacementRound === 1) {
            if (placements.settlements < 1) {
                return false // Must place settlement first
            }
            if (placements.roads >= 1) {
                return false // Already placed road this round
            }
        } else {
            if (placements.settlements < 2) {
                return false // Must place second settlement first
            }
            if (placements.roads >= 2) {
                return false // Already placed both roads
            }
        }

        // Check if edge is already occupied
        if (edge.road !== null) {
            return false
        }

        // Road must be connected to a settlement the player just placed
        // Check if EITHER vertex of this edge has the player's settlement
        const vertex1 = this.state.vertices[edge.vertex1]
        const vertex2 = this.state.vertices[edge.vertex2]
        
        // Road is valid if either vertex has the player's settlement
        const connectsToSettlement = 
            (vertex1.building === 'settlement' && vertex1.playerColor === player.color) ||
            (vertex2.building === 'settlement' && vertex2.playerColor === player.color)
        
        if (!connectsToSettlement) {
            return false
        }

        // Edge connects to at least one vertex with the player's settlement
        return true
    }

    placeInitialSettlement(vertexId: number, playerId: number): boolean {
        if (!this.canPlaceSettlement(vertexId, playerId)) {
            return false
        }

        const vertex = this.state.vertices[vertexId]
        const player = this.state.players[playerId]
        const placements = this.placementsPerPlayer.get(playerId)!

        // Place settlement
        vertex.building = 'settlement'
        vertex.playerColor = player.color
        player.settlements++
        player.victoryPoints++
        placements.settlements++

        // Give resources from adjacent hexes (only in round 2)
        if (this.state.initialPlacementRound === 2) {
            this.giveInitialResources(vertexId, playerId)
        }

        return true
    }

    placeInitialRoad(edgeId: number, playerId: number, vertexId: number): boolean {
        if (!this.canPlaceRoad(edgeId, playerId, vertexId)) {
            return false
        }

        const edge = this.state.edges[edgeId]
        const player = this.state.players[playerId]
        const placements = this.placementsPerPlayer.get(playerId)!

        // Place road
        edge.road = player.color
        player.roads++
        placements.roads++

        return true
    }

    private giveInitialResources(vertexId: number, playerId: number): void {
        const vertex = this.state.vertices[vertexId]
        const player = this.state.players[playerId]
        
        // Find hexes adjacent to this vertex and give resources
        const adjacentHexes = this.getHexesAdjacentToVertex(vertexId)
        
        adjacentHexes.forEach(hex => {
            if (hex.resourceType !== ResourceType.Desert && hex.numberToken !== null) {
                const resource = hex.resourceType
                const current = player.resources.get(resource) || 0
                player.resources.set(resource, current + 1)
            }
        })
    }

    // Get hexes adjacent to a vertex (hexes that have this vertex as a corner)
    private getHexesAdjacentToVertex(vertexId: number): any[] {
        const vertex = this.state.vertices[vertexId]
        const hexSize = 60
        const adjacentHexes: any[] = []
        
        // Find hexes where this vertex is close to one of their corners
        this.state.hexes.forEach(hex => {
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 3) * i - Math.PI / 2
                const vx = hex.x + hexSize * Math.cos(angle)
                const vy = hex.y + hexSize * Math.sin(angle)
                
                const dx = vertex.x - vx
                const dy = vertex.y - vy
                const distance = Math.sqrt(dx * dx + dy * dy)
                
                if (distance < 5) { // Within 5 pixels
                    adjacentHexes.push(hex)
                    break
                }
            }
        })
        
        return adjacentHexes
    }

    checkInitialPlacementComplete(): boolean {
        // Check if all players have placed 2 settlements and 2 roads
        for (const player of this.state.players) {
            const placements = this.placementsPerPlayer.get(player.id)!
            if (placements.settlements < 2 || placements.roads < 2) {
                return false
            }
        }
        return true
    }

    advanceToNextPlayer(): void {
        if (this.state.initialPlacementRound === 1) {
            // Round 1: forward order (0, 1, 2, 3)
            // After player 3 (index 2), next is player 4 (index 3)
            // After player 4 (index 3), move to round 2 starting with player 4
            if (this.state.currentPlayerIndex === 3) {
                // All players placed first settlement/road, move to round 2
                this.state.initialPlacementRound = 2
                // Stay on player 4 (index 3) for round 2
            } else {
                this.state.currentPlayerIndex = (this.state.currentPlayerIndex + 1) % 4
            }
        } else {
            // Round 2: reverse order (3, 2, 1, 0)
            // After player 4 (index 3), next is player 3 (index 2)
            // After player 3 (index 2), next is player 2 (index 1)
            // After player 2 (index 1), next is player 1 (index 0)
            // After player 1 (index 0), all done
            if (this.state.currentPlayerIndex === 0) {
                // All players placed second settlement/road, start game
                this.state.initialPlacementPhase = false
                this.state.phase = GamePhase.RollingDice
                this.state.currentPlayerIndex = 0 // Start with first player
            } else {
                this.state.currentPlayerIndex = (this.state.currentPlayerIndex - 1 + 4) % 4
            }
        }
    }

    getCurrentPlacementStatus(playerId: number): { settlements: number, roads: number } {
        return this.placementsPerPlayer.get(playerId) || { settlements: 0, roads: 0 }
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

    // Get all vertices within a certain edge distance
    private getVerticesWithinDistance(startVertexId: number, maxDistance: number): number[] {
        const visited = new Set<number>()
        const result: number[] = []
        const queue: Array<{ vertexId: number, distance: number }> = [{ vertexId: startVertexId, distance: 0 }]
        
        while (queue.length > 0) {
            const { vertexId, distance } = queue.shift()!
            
            if (visited.has(vertexId) || distance > maxDistance) {
                continue
            }
            
            visited.add(vertexId)
            result.push(vertexId)
            
            if (distance < maxDistance) {
                // Find all adjacent vertices (connected by edges)
                const adjacentVertices = this.getAdjacentVertices(vertexId)
                for (const adjVertexId of adjacentVertices) {
                    if (!visited.has(adjVertexId)) {
                        queue.push({ vertexId: adjVertexId, distance: distance + 1 })
                    }
                }
            }
        }
        
        return result
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
}

