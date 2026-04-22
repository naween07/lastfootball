import http from "http";
const PORT = process.env.PORT || 3000;
const START_TIME = Date.now();
const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", uptime: Math.floor((Date.now() - START_TIME) / 1000) }));
    return;
  }
  res.writeHead(200);
  res.end("LastFootball is running");
});
server.listen(PORT, () => console.log(`Listening on ${PORT}`));
