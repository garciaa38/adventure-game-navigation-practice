const http = require('http');
const fs = require('fs');

const { Player } = require('./game/class/player');
const { World } = require('./game/class/world');

const worldData = require('./game/data/basic-world-data');
const { runInNewContext } = require('vm');

let player;
let world = new World();
world.loadWorld(worldData);

const server = http.createServer((req, res) => {

  /* ============== ASSEMBLE THE REQUEST BODY AS A STRING =============== */
  let reqBody = '';
  req.on('data', (data) => {
    reqBody += data;
  });

  req.on('end', () => { // After the assembly of the request body is finished
    /* ==================== PARSE THE REQUEST BODY ====================== */
    if (reqBody) {
      req.body = reqBody
        .split("&")
        .map((keyValuePair) => keyValuePair.split("="))
        .map(([key, value]) => [key, value.replace(/\+/g, " ")])
        .map(([key, value]) => [key, decodeURIComponent(value)])
        .reduce((acc, [key, value]) => {
          acc[key] = value;
          return acc;
        }, {});
    }

    /* ======================== ROUTE HANDLERS ========================== */
    // Phase 1: GET /
    if (req.method === 'GET' && req.url === '/') {
      const newPlayer = fs.readFileSync('./views/new-player.html', 'utf-8');
      const resBody = newPlayer
        .replace(/#{availableRooms}/g, world.availableRoomsToString());
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html');
      return res.end(resBody);
    }
    // Phase 2: POST /player
    if (req.method === 'POST' && req.url === '/player') {
      const {name, roomId} = req.body;
      const startingRoom = world.rooms[roomId];
      player = new Player(name, startingRoom);

      res.statusCode = 302;
      res.setHeader('Location', `/rooms/${startingRoom}`);
      return res.end();
    }

    // Phase 3: GET /rooms/:roomId
    if (req.method === 'GET' && req.url.startsWith('/rooms/')) {
      const urlParts = req.url.split('/');
      if (urlParts.length === 3) {
        const roomId = urlParts[2];
        const roomTemp = fs.readFileSync('./views/room.html');
        const resBody = roomTemp
          .replace(/#{roomName}/g, player.currentRoom.name)
          .replace(/#{inventory}/g, req.body.player.items)
          .replace(/#{roomItems}/g, req.body.room.items)
          .replace(/#{exits}/g, req.body.room.exits);

          if (req.body.player.currentRoom !== roomId) {
            res.statusCode = 302;
            res.setHeader('Location', `/rooms/${req.body.player.currentRoom}`, "UTF-8");
            return res.end();
          }

          res.statusCode = 200;
          res.setHeader('Content-Type', 'text/html');
          res.end(resBody);

      }
    }

    // Phase 4: GET /rooms/:roomId/:direction

    // Phase 5: POST /items/:itemId/:action

    // Phase 6: Redirect if no matching route handlers
  })
});

const port = 5000;

server.listen(port, () => console.log('Server is listening on port', port));
