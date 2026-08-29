import crypto from "node:crypto";
import * as scenarioRepository from "./scenarioRepository.js";
import { validateConfiguration } from "./scenarioValidator.js";
import { generateScenario } from "./scenarioGenerator.js";

const health = (c) => {
    return c.json({ status: "ok" });
};

const create = async (c) => {
    let config;

    try {
        config = await c.req.json();
    } catch {
        return c.json(
            {
                error: "invalid_json",
                message: "Request body must contain valid JSON",
            }, 400
        );
    }

    const validation = validateConfiguration(config);

    if (!validation.valid){
        return c.json(
            {
                error: "invalid_configuration",
                message: validation.errors.join(", "),
            }, 400
        );
    }

    const id = `scenario-${crypto.randomUUID()}`;

    scenarioRepository.create(id, config);

    generateInBackground(id, config);

    return c.json(
        {
            id,
            status: "pending",
        }, 202,
        {
            Location: `/api/scenarios/${id}`
        }
    );
};

const readOne = (c) => {
    const id = c.req.param("id");

    const scenario = scenarioRepository.findById(id);

    if (!scenario){
        return c.json(
            {
                error: "scenario_not_found",
                message: `Scenario ${id} was not found`,
            }, 404
        );
    }

    return c.json(scenario);
};

const generateInBackground = async (id, config) => {
    try {
        scenarioRepository.update(id, {
            status: "running"
        });

        const scenario = generateScenario(config);

        scenarioRepository.update(id, {
            status: "completed",
            scenario
        });
    } catch (error){
        scenarioRepository.update(id, {
            status: "failed",
            error: error instanceof Error
                ? error.message
                : "Scenario generation failed"
        });
    }
};

export { health, create, readOne };