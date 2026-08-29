const REQUIRED_EVENT_TYPES = [
    "authentication",
    "process_execution",
    "credential_access",
    "network_connection",
    "data_exfiltration",
];

const validateConfiguration = (config) => {
    const errors = [];

    if (!config || typeof config !== "object" || Array.isArray(config))
        return {
            valid: false,
            errors: ["Request body must be a JSON object",],
        };

    if (config.scenario !== "credential_theft")
        errors.push("scenario must be credential_theft");

    if (!Number.isInteger(config.users) || config.users < 1)
        errors.push("users must be a positive integer");

    if (!Number.isInteger(config.devices) || config.devices < 1)
        errors.push("devices must be a positive integer");

    if (!Number.isInteger(config.events) || config.events < 5)
        errors.push("events must be at least 5");

    if (!Number.isInteger(config.seed))
        errors.push("seed must be an integer");

    return {
        valid: errors.length === 0,
        errors,
    };
};

const validateScenario = (scenario, config) => {
    const errors = [];

    // Count invariants
    if (scenario.users.length !== config.users)
        errors.push(`Expected ${config.users} users, got ${scenario.users.length}`);

    if (scenario.devices.length !== config.devices)
        errors.push(`Expected ${config.devices} devices, got ${scenario.devices.length}`);

    if (scenario.events.length !== config.events)
        errors.push(`Expected ${config.events} events, got ${scenario.events.length}`);

    // Unique IDs
    const userIds = new Set(
        scenario.users.map((user) => user.id),
    );

    const deviceIds = new Set(
        scenario.devices.map((device) => device.id),
    );

    const eventIds = new Set(
        scenario.events.map((event) => event.id),
    );

    if (userIds.size !== scenario.users.length)
        errors.push("User IDs must be unique");

    if (deviceIds.size !== scenario.devices.length)
        errors.push("Device IDs must be unique");

    if (eventIds.size !== scenario.events.length)
        errors.push("Event IDs must be unique");

    // Event reference (user and device)
    for (const event of scenario.events){
        if (!userIds.has(event.actor_user_id))
            errors.push(`Event ${event.id} references unknown user ${event.actor_user_id}`);

        if (!deviceIds.has(event.device_id))
            errors.push(`Event ${event.id} references unknown device ${event.device_id}`);
    }

    // Timestamp validity and ordering
    const timestamps = scenario.events.map(
        (event) => new Date(event.timestamp),
    );

    for (let i = 0; i < timestamps.length; i++){
        if (Number.isNaN(timestamps[i].getTime()))
            errors.push(`Event ${scenario.events[i].id} has an invalid timestamp`);
    }

    for (let i = 1; i < timestamps.length; i++){
        if (timestamps[i].getTime() < timestamps[i - 1].getTime()){
            errors.push("Events must be chronologically ordered");
            break;
        }
    }

    // Required attack chain events
    const eventByType = new Map();

    for (const event of scenario.events){
        if (!eventByType.has(event.type))
            eventByType.set(event.type, []);

        eventByType.get(event.type).push(event);
    }

    for (const type of REQUIRED_EVENT_TYPES) {
        if (!eventByType.has(type))
            errors.push(`Missing required event type: ${type}`,);
    }

    // Attack chain order
    const firstEvent = (type) => {
        return eventByType.get(type)?.[0];
    }

    const authentication = firstEvent("authentication");

    const processExecution = firstEvent("process_execution");

    const credentialAccess = firstEvent("credential_access");

    const networkConnection = firstEvent("network_connection");

    const dataExfiltration = firstEvent("data_exfiltration");

    if (
        authentication && 
        processExecution &&
        credentialAccess &&
        networkConnection &&
        dataExfiltration
    ) {
        const authTime = new Date(authentication.timestamp).getTime();

        const processTime = new Date(processExecution.timestamp).getTime();

        const credentialTime = new Date(credentialAccess.timestamp).getTime();

        const networkTime = new Date(networkConnection.timestamp).getTime();

        const exfiltrationTime = new Date(dataExfiltration.timestamp).getTime();

        if (processTime <= authTime)
            errors.push("Process execution must occur after authentication");

        if (credentialTime <= processTime)
            errors.push("Credential access must occur after process execution");

        if (networkTime <= credentialTime)
            errors.push("Network connection must occur after credential access");

        if (exfiltrationTime <= networkTime)
            errors.push("Data exfiltration must occur after network connection");
    }

    return {
        valid: errors.length === 0,
        errors
    };
};

export { validateConfiguration, validateScenario };