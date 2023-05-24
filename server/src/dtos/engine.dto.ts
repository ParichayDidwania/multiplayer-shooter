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
    shots: Shot[]
}

export enum State {
    CREATED = 'CREATED',
    MATCH_STARTED = 'MATCH_STARTED',
    ROUND_STARTED = 'ROUND_STARTED',
    ROUND_ENDED = 'ROUND_ENDED',
    MATCH_ENDED = 'MATCH_ENDED'
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

export type Room = {
    state: State,
    users: Record<string, User>,
    round: number,
    isBombPlanted: boolean,
    spawnPoints: SpawnPoints,
}

export type Rooms = Record<string, Room>;

export enum GAMECONSTANTS {
    TIME_LIMIT = 120, // In Seconds,
    MAX_HEALTH = 100,
    MAX_BULLET_BUFFER = 10,
    BULLET_VELOCITY = 1000,
    HIT_REG_RADIUS = 50
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
