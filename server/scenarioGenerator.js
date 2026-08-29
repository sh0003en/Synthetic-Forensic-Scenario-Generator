import { createRandom } from "./randomSeed.js";
import { validateScenario } from "./scenarioValidator.js";

const USER_ROLES = [
    "employee",
    "administrator",
    "contractor"
];

const OPERATING_SYSTEMS = [
    "Windows",
    "macOS",
    "Linux"
];

const BACKGROUND_EVENT_TYPES = [
    "authentication",
    "process_execution",
    "network_connection"
];

const ATTACK_CHAIN = [
    "authentication",
    "process_execution",
    "credential_access",
    "network_connection",
    "data_exfiltration"
];

const BASE_TIMESTAMP = Date.UTC(2026, 0, 1, 10, 0, 0);

const generateUsers = (count, random) => {
    const users = [];

    for (let i = 1; i <= count; i++) {
        users.push({
            id: `user-${String(i).padStart(3, "0")}`,
            username: `user${String(i).padStart(3, "0")}`,
            role: random.pick(USER_ROLES)
        });
    }

    return users;
};

const generateDevices = (count, random) => {
    const devices = [];

    for (let i = 1; i <= count; i++) {
        devices.push({
            id: `device-${String(i).padStart(3, "0")}`,
            hostname: `WORKSTATION-${String(i).padStart(2, "0")}`,
            os: random.pick(OPERATING_SYSTEMS)
        });
    }

    return devices;
};

const createEvent = ({
    id,
    type,
    timestamp,
    user,
    device,
    details,
    chainStep = null
}) => {
    return {
        id,
        type,
        timestamp,
        actor_user_id: user.id,
        device_id: device.id,
        chain_step: chainStep,
        details
    };
};

const generateAttackChain = (
    users,
    devices,
    random
) => {
    return ATTACK_CHAIN.map((type, index) => {
        const user = random.pick(users);
        const device = random.pick(devices);

        const timestamp = new Date(BASE_TIMESTAMP + index * 60_000).toISOString();

        let details;

        switch (type){
            case "authentication":
                details = {
                    method: "password",
                    result: "success"
                };
                break;

            case "process_execution":
                details = {
                    process: "browser.exe"
                };
                break;

            case "credential_access":
                details = {
                    method: "browser_credential_store"
                };
                break;

            case "network_connection":
                details = {
                    destination: "203.0.113.10",
                    protocol: "HTTPS"
                };
                break;

            case "data_exfiltration":
                details = {
                    destination: "203.0.113.10",
                    bytes: 4096
                };
                break;
        }

        return createEvent({
            id: `event-${String(index + 1).padStart(3, "0")}`,
            type,
            timestamp,
            user,
            device,
            chainStep: index + 1,
            details
        });
    });
};

const generateBackgroundEvent = ({
    id,
    index,
    users,
    devices,
    random
}) => {
    const type = random.pick(BACKGROUND_EVENT_TYPES);

    const user = random.pick(users);
    const device = random.pick(devices);

    const timestamp = new Date(
        BASE_TIMESTAMP + index * 60_000
    ).toISOString();

    return createEvent({
        id,
        type,
        timestamp,
        user,
        device,
        details: {}
    });
};

const generateScenario = (config) => {
    const random = createRandom(config.seed);

    const users = generateUsers(
        config.users,
        random
    );

    const devices = generateDevices(
        config.devices,
        random
    );

    const events = generateAttackChain(
        users,
        devices,
        random
    );

    for (
        let i = events.length;
        i < config.events;
        i++
    ) {
        events.push(
            generateBackgroundEvent({
                id: `event-${String(i + 1).padStart(3, "0")}`,
                index: i,
                users,
                devices,
                random
            })
        );
    }

    const scenario = {
        type: "credential_theft",
        seed: config.seed,
        users,
        devices,
        events
    };

    const validation = validateScenario(
        scenario,
        config
    );

    if (!validation.valid){
        throw new Error(`Generated scenario failed validation: ${validation.errors.join("; ")}`);
    }

    return scenario;
};

export { generateScenario };