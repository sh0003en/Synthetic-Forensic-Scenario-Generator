import { describe, expect, test } from "vitest";
import { generateScenario } from "../server/scenarioGenerator.js";

const config = {
    scenario: "credential_theft",
    users: 2,
    devices: 2,
    events: 25,
    seed: 42,
};

describe("Scenario Generator", () => {
    test("generates the requested number of users", () => {
        const scenario = generateScenario(config);

        expect(scenario.users).toHaveLength(2);
    });

    test("generates the requested number of devices", () => {
        const scenario = generateScenario(config);

        expect(scenario.devices).toHaveLength(2);
    });

    test("generates the requested number of events", () => {
        const scenario = generateScenario(config);

        expect(scenario.events).toHaveLength(25);
    });

    test("generates deterministic output for the same seed", () => {
        const first = generateScenario(config);
        const second = generateScenario(config);

        expect(second).toEqual(first);
    });

    test("generates different output for different seeds", () => {
        const first = generateScenario({
            ...config,
            seed: 42,
        });

        const second = generateScenario({
            ...config,
            seed: 99,
        });

        expect(second).not.toEqual(first);
    });

    test("generates unique user IDs", () => {
        const scenario = generateScenario(config);

        const ids = scenario.users.map(
            (user) => user.id,
        );

        expect(new Set(ids).size).toBe(ids.length);
    });

    test("generates unique device IDs", () => {
        const scenario = generateScenario(config);

        const ids = scenario.devices.map(
            (device) => device.id,
        );

        expect(new Set(ids).size).toBe(ids.length);
    });

    test("generates unique event IDs", () => {
        const scenario = generateScenario(config);

        const ids = scenario.events.map(
            (event) => event.id,
        );

        expect(new Set(ids).size).toBe(ids.length);
    });
});

test("contains all required attack-chain event types", () => {
    const scenario = generateScenario(config);

    const types = scenario.events.map(
        (event) => event.type,
    );

    expect(types).toContain("authentication");
    expect(types).toContain("process_execution");
    expect(types).toContain("credential_access");
    expect(types).toContain("network_connection");
    expect(types).toContain("data_exfiltration");
});

test("attack-chain events occur in the required order", () => {
    const scenario = generateScenario(config);

    const types = scenario.events.map(
        (event) => event.type,
    );

    const authentication =
        types.indexOf("authentication");

    const processExecution =
        types.indexOf("process_execution");

    const credentialAccess =
        types.indexOf("credential_access");

    const networkConnection =
        types.indexOf("network_connection");

    const dataExfiltration =
        types.indexOf("data_exfiltration");

    expect(authentication)
        .toBeLessThan(processExecution);

    expect(processExecution)
        .toBeLessThan(credentialAccess);

    expect(credentialAccess)
        .toBeLessThan(networkConnection);

    expect(networkConnection)
        .toBeLessThan(dataExfiltration);
});

test("events are chronologically ordered", () => {
    const scenario = generateScenario(config);

    for (let i = 1; i < scenario.events.length; i++) {
        const previous = new Date(
            scenario.events[i - 1].timestamp,
        );

        const current = new Date(
            scenario.events[i].timestamp,
        );

        expect(current.getTime())
            .toBeGreaterThanOrEqual(
                previous.getTime(),
            );
    }
});

test("every event references an existing user and device", () => {
    const scenario = generateScenario(config);

    const userIds = new Set(
        scenario.users.map((user) => user.id),
    );

    const deviceIds = new Set(
        scenario.devices.map((device) => device.id),
    );

    for (const event of scenario.events) {
        expect(userIds.has(event.actor_user_id))
            .toBe(true);

        expect(deviceIds.has(event.device_id))
            .toBe(true);
    }
});