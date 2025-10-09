import { createServer } from "http";
import { readStream } from "./readStream.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
//import controller from "./controller.js"; --- IGNORE en attente du front ---

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const server = createServer(async (request, response) => {
    const { method, url } = request;

    if (method === "GET" && (url === "/" || url === "/index.html")) {
        const indexPath = path.join(__dirname, "index.html");

        fs.readFile(indexPath, (err, data) => {
            if (err) {
                response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
                response.end("Erreur lors du chargement de la page.");
            } else {
                response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
                response.end(data);
            }
        });
    }

    else if (method === "POST") {
        try {
            const raw = await readStream(request);
            const contentType = request.headers['content-type'] || '';
            let parsed = {};

            if (contentType.includes('application/json')) {
                parsed = JSON.parse(raw || '{}');
            // Ca veut dire encoder comme un formulaire
            } else if (contentType.includes('application/x-www-form-urlencoded') || contentType === '') {
                const params = new URLSearchParams(raw);
                for (const [k, v] of params.entries()) parsed[k] = v;
            } else {
                console.error('Type de contenu non géré :', contentType);
            }

            console.log('Corps parsé :', parsed);

            const usersPath = path.join(__dirname, 'file.json');
            let usersData = { users: [] };
            try {
                const file = fs.readFileSync(usersPath, 'utf8');
                usersData = JSON.parse(file);
            } catch (e) {
                console.error('Impossible de lire file.json', e);
            }

            const found = (usersData.users || []).some(u => u.identifiant === parsed.identifiant && u.mdp === parsed.mdp);

            response.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
            if (found) {
                response.end('True');
            } else {
                response.end('False');
            }

        } catch (err) {
            console.error('Erreur traitement POST', err);
            response.writeHead(500, { 'Content-Type': 'text/plain' });
            response.end('Erreur serveur');
        }
    }
    else {
        response.writeHead(404, { "Content-Type": "text/plain" });
        response.end("404 - Page non trouvée");
    }
});

const PORT = process.env.PORT || 8500;
server.listen(PORT, () => console.log(`✅ Le Serveur écoute : http://localhost:${PORT}/`));
