import { createServer } from "node:http";

const server = createServer((request, response) => {
  response.setHeader("content-type", "application/json");
  if (request.url?.startsWith("/auth/v1/user")) return response.end(JSON.stringify({ id: "member" }));
  if (request.url?.startsWith("/rest/v1/profiles")) return response.end(JSON.stringify([{ id: "member", role: "member" }]));
  if (request.url?.startsWith("/rest/v1/courses")) return response.end(JSON.stringify([]));
  response.end(JSON.stringify([]));
});
server.listen(54321, "127.0.0.1");
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.close(() => process.exit()));
