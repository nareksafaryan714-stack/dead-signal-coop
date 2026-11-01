import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {WebSocketServer,WebSocket} from 'ws';
import {Room} from './simulation.mjs';
const root=path.resolve(fileURLToPath(new URL('../public/',import.meta.url)));
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.txt':'text/plain; charset=utf-8','.svg':'image/svg+xml','.png':'image/png'};
export function createGameServer(){
 const rooms=new Map(),connections=new Set();
 const server=http.createServer(async(req,res)=>{try{const u=new URL(req.url,'http://localhost');if(u.pathname==='/health'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:true,multiplayer:true}));return;}if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}const target=path.resolve(root,'.'+decodeURIComponent(u.pathname==='/'?'/index.html':u.pathname));if(!target.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}const info=await stat(target);if(!info.isFile())throw new Error('not found');res.writeHead(200,{'Content-Type':MIME[path.extname(target)]||'application/octet-stream','Cache-Control':target.includes('/vendor/')?'public, max-age=86400':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin'});res.end(req.method==='HEAD'?undefined:await readFile(target));}catch{res.writeHead(404);res.end('Not found');}});
 const wss=new WebSocketServer({noServer:true,maxPayload:4096,perMessageDeflate:false});
 server.on('upgrade',(req,socket,head)=>{let u;try{u=new URL(req.url,'http://localhost');}catch{socket.destroy();return;}if(u.pathname!=='/socket'||connections.size>=256){socket.write('HTTP/1.1 503 Service Unavailable\r\n\r\n');socket.destroy();return;}const origin=req.headers.origin;if(origin){try{if(new URL(origin).host!==req.headers.host){socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');socket.destroy();return;}}catch{socket.destroy();return;}}wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,req));});
 const send=(ws,data)=>{if(ws.readyState===WebSocket.OPEN){if(ws.bufferedAmount>256000){ws.close(1013,'Connection too slow');return;}ws.send(JSON.stringify(data));}};
 const broadcast=(room,data)=>{for(const ws of connections)if(ws.room===room)send(ws,data);};
 wss.on('connection',ws=>{connections.add(ws);ws.alive=true;ws.room=null;ws.player=null;ws.rate=0;ws.window=Date.now();ws.created=Date.now();ws.on('pong',()=>ws.alive=true);
  ws.on('message',raw=>{if(Date.now()-ws.window>=1000){ws.window=Date.now();ws.rate=0;}if(++ws.rate>90){ws.close(1008,'Too many messages');return;}let msg;try{msg=JSON.parse(raw.toString());if(!msg||typeof msg!=='object'||Array.isArray(msg))return;}catch{return;}
   try{if(msg.type==='ping'){send(ws,{type:'pong',sent:msg.sent});return;}
    if(msg.type==='create'||msg.type==='join'){if(ws.room)throw new Error('Ты уже в комнате.');let room,p;if(msg.type==='create'){if(rooms.size>=64)throw new Error('Все комнаты заняты. Попробуй позже.');const code=randomBytes(5).toString('hex').toUpperCase();room=new Room(code);p=room.addPlayer(msg.name);rooms.set(code,room);}else{const code=String(msg.code||'').trim().toUpperCase();if(!/^[A-F0-9]{10}$/.test(code))throw new Error('Проверь код комнаты — нужно 10 символов.');room=rooms.get(code);if(!room)throw new Error('Комната не найдена. Попроси друга создать новую.');if(msg.playerId&&msg.token)p=room.reconnect(msg.playerId,msg.token);else p=room.addPlayer(msg.name);}for(const other of connections)if(other!==ws&&other.room===room&&other.player===p.id){other.room=null;other.player=null;other.close(4001,'Connection replaced');}ws.room=room;ws.player=p.id;send(ws,{type:'welcome',id:p.id,token:p.token,code:room.code});broadcast(room,room.snapshot());return;}
    const room=ws.room;if(!room)return;
    if(msg.type==='input')room.setInput(ws.player,msg);
    if(msg.type==='action')room.action(ws.player,msg.action);
    if(msg.type==='start')room.start(ws.player);
    if(msg.type==='upgrade')room.choose(ws.player,msg.choice);
    if(msg.type==='leave'){room.leave(ws.player);ws.room=null;ws.player=null;send(ws,{type:'left'});broadcast(room,room.snapshot());}
   }catch(e){send(ws,{type:'error',message:e.message});}
  });
  ws.on('error',()=>{});ws.on('close',()=>{connections.delete(ws);if(ws.room){ws.room.disconnect(ws.player);broadcast(ws.room,ws.room.snapshot());}});
 });
 let tick=0;const interval=setInterval(()=>{for(const [code,room] of rooms){room.update(1/30);if(room.events.length){broadcast(room,{type:'events',events:room.events});room.events=[];}if(tick%2===0&&room.connected().length)broadcast(room,room.snapshot());if(!room.connected().length&&Date.now()-room.lastActive>60000)rooms.delete(code);}tick++;},1000/30);
 const heartbeat=setInterval(()=>{for(const ws of connections){if(!ws.alive||(!ws.room&&Date.now()-ws.created>60000)){ws.terminate();continue;}ws.alive=false;ws.ping();}},15000);
 async function close(){clearInterval(interval);clearInterval(heartbeat);for(const ws of connections)ws.terminate();await new Promise(r=>wss.close(r));await new Promise(r=>server.close(r));}
 return {server,rooms,connections,close};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])){const app=createGameServer();const port=Number(process.env.PORT||8787);app.server.listen(port,'0.0.0.0',()=>console.log(`Dead Signal: http://localhost:${port}`));for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>app.close().then(()=>process.exit(0)));}
