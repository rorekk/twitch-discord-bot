const http = require("node:http")

const server = http.createServer((req, res) => {
  res.writeHead(200)
  res.end()
})

server.listen(process.env.PORT || 3000, () => {
  console.log("server started")
})
