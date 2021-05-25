
import WebSocket from 'ws';
import http from 'http';
import { api } from '@controller/api';

export function createWsServer(server: http.Server) {
  const wss = new WebSocket.Server({ server });

  wss.on('connection', ws => {
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

  wss.on('close', () => {
    
  });

  return wss;
}
