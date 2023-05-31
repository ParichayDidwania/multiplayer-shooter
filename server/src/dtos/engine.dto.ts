export enum Team {
    NONE = 'NONE',
    COUNTER_TERRORIST = 'COUNTER_TERRORIST',
    TERRORIST = 'TERRORIST'
}

export enum ConnectionStatus {
    CONNECTED = 'CONNECTED',
    DISCONNECTED = 'DISCONNECTED'
}

export type User = {
    uid: string,
    pos_x: number,
    pos_y: number,
    angle: number,
    health: number,
    team: Team,
    isAlive: boolean
    isAdmin: boolean,
    status: ConnectionStatus,
    shots: Shot[],
    spawn: UserSpawnPoint
}

export type Bomb = {
    x: number, 
    y: number,
    isPicked: {
        value: boolean,
        by?: string
    },
    isPlanted: boolean,
    isDiffused: boolean,
    isExploded: boolean
}

export enum State {
    CREATED = 'CREATED',
    MATCH_STARTED = 'MATCH_STARTED',
    MATCH_ENDED = 'MATCH_ENDED'
}

export type UserSpawnPoint = {
    x: number,
    y: number,
    angle: number,
}

export type SpawnPoint = {
    x: number,
    y: number,
    angle: number,
    isTaken: boolean,
    by: undefined | string
}

export type SpawnPoints = {
    COUNTER_TERRORIST: SpawnPoint[],
    TERRORIST: SpawnPoint[]
}

export type Shot = {
    id: number,
    x: number,
    y: number,
    angle: number,
    timestamp: number
}

export type Round = {
    id: number,
    winner?: Team
}

export type Room = {
    state: State,
    users: Record<string, User>,
    rounds: Round[],
    isBombPlanted: boolean,
    spawnPoints: SpawnPoints,
    current_round: number,
    current_round_start_timestamp: number,
    current_round_bomb_plant_timestamp: number,
    bomb: Bomb,
    timer?: any
}

export type Rooms = Record<string, Room>;

export enum GAMECONSTANTS {
    TIME_LIMIT = 120, // In Seconds,
    MAX_HEALTH = 100,
    MAX_BULLET_BUFFER = 10,
    BULLET_VELOCITY = 500,
    HIT_REG_RADIUS = 50,
    SHOT_DAMAGE = 25,
    TEAM_SIZE = 5,
    MAX_ROUNDS = 5,
    ROUND_TIME = 62,
    BOMB_TIMER = 31
}

export const bombCoords = {
    x: 1700,
    y: 1700
}

export const SPAWNS = {
    COUNTER_TERRORIST: [
        { x: 330, y: 125, angle: Math.PI, isTaken: false, by: undefined },
        { x: 430, y: 125, angle: Math.PI, isTaken: false, by: undefined },
        { x: 530, y: 125, angle: Math.PI, isTaken: false, by: undefined },
        { x: 630, y: 125, angle: Math.PI, isTaken: false, by: undefined },
        { x: 730, y: 125, angle: Math.PI, isTaken: false, by: undefined }
    ],
    TERRORIST: [
        { x: 1800, y: 1800, angle: -1 * Math.PI, isTaken: false, by: undefined },
        { x: 1700, y: 1800, angle: -1 * Math.PI, isTaken: false, by: undefined },
        { x: 1600, y: 1800, angle: -1 * Math.PI, isTaken: false, by: undefined },
        { x: 1500, y: 1800, angle: -1 * Math.PI, isTaken: false, by: undefined },
        { x: 1400, y: 1800, angle: -1 * Math.PI, isTaken: false, by: undefined }
    ]
}
