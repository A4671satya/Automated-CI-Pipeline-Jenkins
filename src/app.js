// src/app.js
const http = require('http');

const requestListener = (req, res) => {
  res.writeHead(200);
  res.end(JSON.stringify({ message: "Hello from CI app" }));
}

const server = http.createServer(requestListener);

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

module.exports = { requestListener };

