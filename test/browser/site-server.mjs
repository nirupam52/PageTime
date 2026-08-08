import { createServer } from 'node:http'

const server = createServer((_request, response) => {
  response.writeHead(200, { 'content-type': 'text/html' })
  response.end('<!doctype html><title>PageTime browser test</title>')
})

server.listen(0, '0.0.0.0', () => {
  const { port } = server.address()
  console.log(`Open http://localhost:${port} and http://127.0.0.1:${port} in the browser under test.`)
})
