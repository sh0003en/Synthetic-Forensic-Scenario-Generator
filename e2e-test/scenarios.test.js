import request from "supertest";
import { describe, expect, test } from "vitest";
import app from "../server/app.js";
import { serve } from "@hono/node-server";

const server = serve({
    fetch: app.fetch,
    port: 0,
});

const validConfig = {
    scenario: "credential_theft",
    users: 2,
    devices: 2,
    events: 25,
    seed: 42,
};

const waitForCompletion = async (id) => {
    for (let i = 0; i < 20; i++) {
        const response = await request(server).get(`/api/scenarios/${id}`);
        if (response.body.status === "completed" || response.body.status === "failed") {
            return response;
        }
        await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error("Scenario did not complete in time");
};

describe("Health", () => {
    test("GET /health returns ok", async () => {
        const response = await request(server)
            .get("/health");

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ status: "ok" });
    });
});

describe("POST /api/scenarios", () => {
    test("creates a scenario and returns 202", async () => {
        const response = await request(server)
            .post("/api/scenarios")
            .send(validConfig);

        expect(response.status).toBe(202);
        expect(response.body.status).toBe("pending");
        expect(response.body.id).toBeDefined();
        expect(response.headers.location).toBeDefined();
    });

    test("rejects malformed JSON", async () => {
        const response = await request(server)
            .post("/api/scenarios")
            .set("Content-Type", "application/json")
            .send("not valid json{");

        expect(response.status).toBe(400);
        expect(response.body.error).toBe("invalid_json");
    });

    test("rejects invalid configuration", async () => {
        const response = await request(server)
            .post("/api/scenarios")
            .send({ ...validConfig, events: 2 });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe("invalid_configuration");
    });

    test("rejects unsupported scenario type", async () => {
        const response = await request(server)
            .post("/api/scenarios")
            .send({ ...validConfig, scenario: "malware" });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe("invalid_configuration");
    });
});

describe("GET /api/scenarios/:id", () => {
    test("returns 404 for unknown scenario", async () => {
        const response = await request(server)
            .get("/api/scenarios/does-not-exist");

        expect(response.status).toBe(404);
        expect(response.body.error).toBe("scenario_not_found");
    });

    test("transitions from pending to completed", async () => {
        const createResponse = await request(server)
            .post("/api/scenarios")
            .send(validConfig);

        expect(createResponse.status).toBe(202);

        const { id } = createResponse.body;

        const completed = await waitForCompletion(id);

        expect(completed.body.status).toBe("completed");
    });

    test("returns completed scenario with full data", async () => {
        const createResponse = await request(server)
            .post("/api/scenarios")
            .send(validConfig);

        const { id } = createResponse.body;
        const completed = await waitForCompletion(id);

        expect(completed.body.scenario).toBeDefined();
        expect(completed.body.scenario.users).toHaveLength(2);
        expect(completed.body.scenario.devices).toHaveLength(2);
        expect(completed.body.scenario.events).toHaveLength(25);
    });

    test("returns deterministic output for same seed", async () => {
        const first = await request(server)
            .post("/api/scenarios")
            .send(validConfig);

        const second = await request(server)
            .post("/api/scenarios")
            .send(validConfig);

        const firstCompleted = await waitForCompletion(first.body.id);
        const secondCompleted = await waitForCompletion(second.body.id);

        expect(firstCompleted.body.scenario.users).toEqual(secondCompleted.body.scenario.users);
        expect(firstCompleted.body.scenario.devices).toEqual(secondCompleted.body.scenario.devices);
        expect(firstCompleted.body.scenario.events).toEqual(secondCompleted.body.scenario.events);
    });
});