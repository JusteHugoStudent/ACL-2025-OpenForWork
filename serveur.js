console.log("Démarrage du serveur...");
import { createServer } from "http";
const server = createServer((request, response) => {
response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
response.write(`
<h1>Félicitations !</h1>
<p>Vous venez de créer votre premier serveur.</p>
<p>Vous cherchiez à accéder à la ressource <code>${request.url}</code> en
utilisant la méthode <code>${request.method}</code>.</p>`);
response.end();
});
const PORT = process.env.PORT || 8500;
server.listen(PORT, () => console.log(`Le Serveur écoute: http://localhost:${PORT}/`));