import { Server } from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import { eventManager, EventManager } from './event-manager.service';
import { UdpService } from './udp.service';
const { Position } = require('../../protos/protoFile_pb'); 


export class SocketService {
    private _server: Server;
    private _wsserver: WebSocketServer;
    private _eventManager: EventManager;

    constructor(server: Server) {
        this._server = server;
        this._wsserver = new WebSocket.Server({
            server: this._server
        });
        this._eventManager = eventManager;
    }

    onMessage(socket: IWebSocket) {
        return (socket_data: Object) => {
            let message;
            try {   
                let messageStr = socket_data.toString(); 
                if(messageStr[0] != "{") {
                    message = Position.deserializeBinary(socket_data).toObject();
                } else {
                    message = JSON.parse(messageStr);
                }
                try {
                    this._eventManager.handleEvents(socket, message);
                } catch (e: any) {
                    socket.send(JSON.stringify({
                        eventName: "ERROR",
                        message: e.message
                    }))
                }
            } catch (err) {
                console.log(err)
            }
        }
    }

    onClose(socket: IWebSocket) {
        return () => {
            try {
                this._eventManager.handleDisconnection(socket);
            } catch (e) {}
        }
    }

    public async setListeners(): Promise<void> {
        console.log('Sockets live!');
        this._wsserver.on('connection', (socket: WebSocket) => {
            let customSocket = this.setSocketIdentifiers(socket);
            customSocket.on('message', this.onMessage(customSocket));
            customSocket.on('close', this.onClose(customSocket));
        });
    }

    setSocketIdentifiers(socket: any): IWebSocket {
        if(!socket?._socket.user_id && !socket?._socket.isMpl) {
            throw new Error('Socket Info Missing');
        }

        Object.defineProperties(socket, {
            user_id: { get: function() { return this._socket.user_id }, set: function(user_id: string) { this._socket.user_id = user_id } },
            room_id: { get: function() { return this._socket.room_id }, set: function(room_id: string) { this._socket.room_id = room_id } },
        })

        if(socket.user_id) {
            console.log(`${socket.user_id} is connected!`);
        }
        
        return socket as IWebSocket;
    }
}

export interface ISocketInfo {
    user_id: string;
    room_id: string;
}

export interface IWebSocket extends WebSocket, ISocketInfo {}
