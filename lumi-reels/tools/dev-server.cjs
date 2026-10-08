/* Dependency-free HTTP preview; production needs only the built index.html. */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname,'..');
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json','.md':'text/plain; charset=utf-8'};
const args = process.argv.slice(2), portFlag=args.indexOf('--port'), hostFlag=args.indexOf('--host');
const port = Number(portFlag >= 0 ? args[portFlag+1] : process.env.PORT || 4173);
const host = hostFlag >= 0 ? args[hostFlag+1] : '0.0.0.0';
http.createServer((req,res)=>{
  try {
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const name=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
    if(!name.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
    if(!fs.existsSync(name)||!fs.statSync(name).isFile()){res.writeHead(404);res.end('Not found');return;}
    res.writeHead(200,{'Content-Type':mime[path.extname(name)]||'application/octet-stream','Cache-Control':'no-store'});
    fs.createReadStream(name).pipe(res);
  }catch(_){res.writeHead(400);res.end('Bad request');}
}).listen(port,host,()=>console.log('LUMI REELS preview on port '+port));
