
import WebSocket from 'ws';
import http from 'http';
import { api } from '@controller/api';

function noop() {}

export function createWsServer(server: http.Server) {
  const wss = new WebSocket.Server({ server });

  wss.on('connection', ws => {
/*
    (<any>ws).isAlive = true;
    ws.on('pong', () => {
      (<any>ws).isAlive = true;
    });
*/
    ws.on('message', async (data) => {
      const ret = await api.apiController.wsEntry(ws, `${data}`);
      try {
        ws.send(JSON.stringify(ret));
      } catch (e) {
        console.log('ws send failed.', e);
      }
    });

    ws.on('close', () => {
      api.apiController.closeConnection(ws);
    })
  });
/*
  const interval = setInterval(() => {
    wss.clients.forEach(ws => {
      if ((<any>ws).isAlive === false) return ws.terminate();

      (<any>ws).isAlive = false;
      ws.ping(noop);
    });
  }, 30000);
*/
  wss.on('close', () => {
    //clearInterval(interval);
  });

  return wss;
}
