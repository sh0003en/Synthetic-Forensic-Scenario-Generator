import { serve } from "@hono/node-server";
import app from "./app.js";

console.log(`Server running on http://localhost:3000`);

serve({ 
    fetch: app.fetch,
    port: 3000
});