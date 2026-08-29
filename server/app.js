import { Hono } from "hono";
import * as scenarioController from "./scenarioController.js";

const app = new Hono();

app.get("/health", scenarioController.health);

app.post("/api/scenarios", scenarioController.create);
app.get("/api/scenarios/:id", scenarioController.readOne);

export default app;