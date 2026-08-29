const scenarios = new Map();

const create = (id, config) => {
    const record = {
        id,
        status: "pending",
        config,
        scenario: null,
        error: null
    };

    scenarios.set(id, record);

    return record;
};

const findById = (id) => {
    return scenarios.get(id);
};

const update = (id, updates) => {
    const scenario = scenarios.get(id);

    if (!scenario) return null;

    Object.assign(scenario, updates);

    return scenario;
};

export { create, findById, update };