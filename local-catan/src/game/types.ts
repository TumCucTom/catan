// Core Catan game types based on official rules

export enum ResourceType {
    Brick = 'brick',
    Wood = 'wood',
    Sheep = 'sheep',
    Wheat = 'wheat',
    Ore = 'ore',
    Desert = 'desert' // Not a resource, but a tile type
}

export enum DevelopmentCardType {
    Knight = 'knight',
    VictoryPoint = 'victoryPoint',
    RoadBuilding = 'roadBuilding',
    YearOfPlenty = 'yearOfPlenty',
    Monopoly = 'monopoly'
}

export enum PlayerColor {
    Red = 'red',
    Blue = 'blue',
    Orange = 'orange',
    White = 'white'
}

export interface Player {
    id: number
    name: string
    color: PlayerColor
    resources: Map<ResourceType, number>
    developmentCards: DevelopmentCardType[]
    victoryPoints: number
    settlements: number
    cities: number
    roads: number
    longestRoad: number
    knights: number
    hasLongestRoad: boolean
    hasLargestArmy: boolean
}

export interface Hex {
    id: number
    x: number
    y: number
    resourceType: ResourceType
    numberToken: number | null // 2-12, null for desert
    hasRobber: boolean
}

export interface Vertex {
    id: number
    x: number
    y: number
    building: 'settlement' | 'city' | null
    playerColor: PlayerColor | null
}

export interface Edge {
    id: number
    vertex1: number
    vertex2: number
    road: PlayerColor | null
    port?: ResourceType | '3:1' // Port on this edge (connects to vertex1 and vertex2)
}

export interface GameState {
    players: Player[]
    currentPlayerIndex: number
    phase: GamePhase
    hexes: Hex[]
    vertices: Vertex[]
    edges: Edge[]
    diceRolled: boolean
    lastDiceRoll: number | null
    lastDie1: number | null // Individual die values
    lastDie2: number | null
    rollHistory: Map<number, number> // Distribution: sum -> count
    bank: Map<ResourceType, number>
    developmentCardDeck: DevelopmentCardType[]
    longestRoadPlayer: number | null
    largestArmyPlayer: number | null
    longestRoadLength: number
    largestArmySize: number
    turnNumber: number
    initialPlacementPhase: boolean
    initialPlacementRound: number // 1 or 2
}

export enum GamePhase {
    InitialPlacement = 'initialPlacement',
    RollingDice = 'rollingDice',
    MainPhase = 'mainPhase',
    Trading = 'trading',
    Building = 'building',
    EndTurn = 'endTurn',
    GameOver = 'gameOver'
}

// Official Catan resource distribution
export const RESOURCE_DISTRIBUTION = {
    [ResourceType.Brick]: 3,
    [ResourceType.Wood]: 4,
    [ResourceType.Sheep]: 4,
    [ResourceType.Wheat]: 4,
    [ResourceType.Ore]: 3,
    [ResourceType.Desert]: 1
}

// Number token distribution (2-12, excluding 7)
export const NUMBER_TOKENS = [
    2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12
]

// Classic 4-player board layout (19 hexes)
export const CLASSIC_BOARD_LAYOUT = [
    // Row 1: 3 hexes
    { row: 0, cols: [0, 1, 2] },
    // Row 2: 4 hexes
    { row: 1, cols: [0, 1, 2, 3] },
    // Row 3: 5 hexes
    { row: 2, cols: [0, 1, 2, 3, 4] },
    // Row 4: 4 hexes
    { row: 3, cols: [0, 1, 2, 3] },
    // Row 5: 3 hexes
    { row: 4, cols: [0, 1, 2] }
]

