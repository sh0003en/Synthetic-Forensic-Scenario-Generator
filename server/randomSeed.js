const createRandom = (seed) => {
    let state = seed >>> 0;

    const next = () => {
        state += 0x6d2b79f5;
        let v = state;
        v = Math.imul(v ^ (v >>> 15), v | 1);
        v ^= v + Math.imul(v ^ (v >>> 7), v | 61);
        return ((v ^ (v >>> 14)) >>> 0) / 4294967296;
    };
    const integer = (min, max) => Math.floor(next() * (max - min + 1)) + min;
    const pick = (array) => array[integer(0, array.length - 1)];

    return { next, integer, pick };
};

export { createRandom };