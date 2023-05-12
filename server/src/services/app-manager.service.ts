import express from "express";
import { createServer, IncomingMessage, Server } from 'http';
import { parse } from "url";
import internal from "stream";

export class AppManagerService {
    private _app: express.Express;
    private _server: Server;

    constructor(app: express.Express) {
        this._app = app;
        this._server = createServer(this._app);
        this.start()
    }

    start() {
        this._server.listen(7000, () => console.log(`Listening on port 7000`));
        this.setServerListeners();
    }

    async onUpgrade(req: IncomingMessage, socket: internal.Duplex & { user_id: string }, head: Buffer) {
        const query = parse(req.url ?? "", true).query;
        if(query.user) {
            socket.user_id = `${query['user']}`;
        } else {
            socket.destroy();
        }
    }

    setServerListeners() {
        this._server.on('upgrade', this.onUpgrade);
    }

    get http_server() {
        return this._server;
    }
}