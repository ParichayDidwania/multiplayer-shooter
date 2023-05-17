import { IWebSocket } from "./socket.service";

export class EventManager {
    handleEvents(socket: IWebSocket, message: any, socketList: Set<IWebSocket>) {
        switch(message.event_name) {
            case "POSITION":
                for(let receiver of socketList) {
                    if(receiver.user_id != socket.user_id) {
                        receiver.send(JSON.stringify(message));
                    }
                }
                break;

            case  "SHOOT":
                for(let receiver of socketList) {
                    if(receiver.user_id != socket.user_id) {
                        receiver.send(JSON.stringify(message));
                    }
                }
                break;
        }
    }
}