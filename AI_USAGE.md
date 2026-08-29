# AI Usage

## AI Tools Used
Claude (Anthropic)

## Areas Assisted
- Generating the initial structure of `scenarioGenerator.js`, 
  `scenarioValidator.js`, `scenarioController.js`, and `scenarioRepository.js`
- Writing the README documentation
- Expanding the e2e test file to cover POST and GET endpoints
- Explaining design decisions and trade-offs

## Example of Independent Verification
Claude suggested using `seedrandom` as an npm package for deterministic 
generation. I rejected this in favour of a self-implemented Mulberry32 PRNG 
in `randomSeed.js`, as the assessment favours a small focused implementation 
with no unnecessary dependencies, and I can fully explain every line of the 
custom implementation.

Specifically, `seed >>> 0` converts the seed to an unsigned 32-bit integer 
for a safe initial state, `state += 0x6d2b79f5` advances the state using a 
Weyl sequence, and the `Math.imul` and XOR operations scramble the bits to 
produce a uniform float between 0 and 1. The `integer()` and `pick()` helpers 
wrap `next()` to avoid repeating index calculations throughout `scenarioGenerator.js`.

## Verification of Final Solution
All 34 automated tests pass across three test files covering generation logic, 
validation logic, and HTTP behaviour. I verified the scenario invariants by 
running `npm test` and confirming that unit tests check entity counts, unique 
IDs, referential integrity, timestamp ordering, and attack-chain sequencing. 
I also manually tested the API endpoints using the running service to confirm 
correct HTTP status codes and response shapes.