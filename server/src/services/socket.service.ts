import { Server } from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import { EventManager } from './event-manager.service';

export class SocketService {
    private _server: Server;
    private _wsserver: WebSocketServer;
    private _eventManager: EventManager;

    constructor(server: Server) {
        this._server = server;
        this._wsserver = new WebSocket.Server({
            server: this._server
        });
        this._eventManager = new EventManager();
    }

    onMessage(socket: IWebSocket) {
        return (socket_data: Object) => {
            let message;
            try {   
                message = JSON.parse(socket_data.toString())
                this._eventManager.handleEvents(socket, message, this._wsserver.clients as Set<IWebSocket>);
            } catch (err) {}
        }
    }

    public async setListeners(): Promise<void> {
        console.log('Sockets live!');
        this._wsserver.on('connection', (socket: WebSocket) => {
            let customSocket = this.setSocketIdentifiers(socket);
            customSocket.on('message', this.onMessage(customSocket));
        });
    }

    setSocketIdentifiers(socket: any): IWebSocket {
        if(!socket?._socket.user_id && !socket?._socket.isMpl) {
            throw new Error('Socket Info Missing');
        }

        Object.defineProperties(socket, {
            user_id: { get: function() { return this._socket.user_id }, set: function(user_id: string) { this._socket.user_id = user_id } },
        })

        if(socket.user_id) {
            console.log(`${socket.user_id} is connected!`);
        }
        
        return socket as IWebSocket;
    }
}

export interface ISocketInfo {
    user_id: string;
}

export interface IWebSocket extends WebSocket, ISocketInfo {}
