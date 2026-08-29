import { describe, expect, test } from "vitest";
import { generateScenario } from "../server/scenarioGenerator.js";
import {
    validateScenario,
    validateConfiguration,
} from "../server/scenarioValidator.js";

const config = {
    scenario: "credential_theft",
    users: 2,
    devices: 2,
    events: 25,
    seed: 42,
};

describe("Scenario Validator", () => {
    test("accepts a valid generated scenario", () => {
        const scenario = generateScenario(config);

        const result = validateScenario(
            scenario,
            config,
        );

        expect(result.valid).toBe(true);
        expect(result.errors).toEqual([]);
    });
});

test("rejects incorrect event count", () => {
    const scenario = generateScenario(config);

    scenario.events.pop();

    const result = validateScenario(
        scenario,
        config,
    );

    expect(result.valid).toBe(false);
});

test("rejects an event referencing an unknown user", () => {
    const scenario = generateScenario(config);

    scenario.events[0].actor_user_id =
        "user-does-not-exist";

    const result = validateScenario(
        scenario,
        config,
    );

    expect(result.valid).toBe(false);

    expect(
        result.errors.some((error) =>
            error.includes(
                "references unknown user",
            ),
        ),
    ).toBe(true);
});

test("rejects an event referencing an unknown device", () => {
    const scenario = generateScenario(config);

    scenario.events[0].device_id =
        "device-does-not-exist";

    const result = validateScenario(
        scenario,
        config,
    );

    expect(result.valid).toBe(false);

    expect(
        result.errors.some((error) =>
            error.includes(
                "references unknown device",
            ),
        ),
    ).toBe(true);
});

test("rejects events that are not chronologically ordered", () => {
    const scenario = generateScenario(config);

    scenario.events[3].timestamp =
        "2026-01-01T09:59:00.000Z";

    const result = validateScenario(
        scenario,
        config,
    );

    expect(result.valid).toBe(false);

    expect(result.errors).toContain(
        "Events must be chronologically ordered",
    );
});

test("rejects invalid attack-chain ordering", () => {
    const scenario = generateScenario(config);

    const processEvent = scenario.events.find(
        (event) => event.chain_step === 2,
    );

    const credentialEvent = scenario.events.find(
        (event) => event.chain_step === 3,
    );

    credentialEvent.timestamp =
        "2026-01-01T09:59:00.000Z";

    const result = validateScenario(
        scenario,
        config,
    );

    expect(result.valid).toBe(false);
});

test("generates the correct attack chain", () => {
    const scenario = generateScenario(config);

    const chain = scenario.events
        .filter((event) => event.chain_step !== null)
        .sort(
            (a, b) =>
                a.chain_step - b.chain_step,
        );

    expect(
        chain.map((event) => event.type),
    ).toEqual([
        "authentication",
        "process_execution",
        "credential_access",
        "network_connection",
        "data_exfiltration",
    ]);
});

describe("Configuration Validator", () => {
    test("accepts valid configuration", () => {
        const result =
            validateConfiguration(config);

        expect(result.valid).toBe(true);
        expect(result.errors).toEqual([]);
    });

    test("rejects unsupported scenario type", () => {
        const result = validateConfiguration({
            ...config,
            scenario: "malware",
        });

        expect(result.valid).toBe(false);
    });

    test("rejects zero users", () => {
        const result = validateConfiguration({
            ...config,
            users: 0,
        });

        expect(result.valid).toBe(false);
    });

    test("rejects zero devices", () => {
        const result = validateConfiguration({
            ...config,
            devices: 0,
        });

        expect(result.valid).toBe(false);
    });

    test("rejects fewer than five events", () => {
        const result = validateConfiguration({
            ...config,
            events: 4,
        });

        expect(result.valid).toBe(false);
    });

    test("rejects non-integer seed", () => {
        const result = validateConfiguration({
            ...config,
            seed: "42",
        });

        expect(result.valid).toBe(false);
    });
});