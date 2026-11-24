# GhostBridge | Evidence properties: design

## Approach
Property-based testing with the Python standard library (`random.Random` with fixed seeds), not a framework: the project has no runtime or test dependencies and keeps it that way. Each property is a `unittest` test that generates hundreds of synthetic ledgers and checks one statement from the requirements for every one of them, with a `subTest(seed=…, case=…)` per input so a failure is reproducible.

## Files
| File | Role |
|---|---|
| `tests/test_properties.py` | Generators and the properties (R1 to R5). |
| `tests/helpers/js_oracle.mjs` | Reads one JSON job on stdin, runs the browser engine (`append`, `verify`, `correlate`, `checkReceipt`) and prints one JSON result. Used for R5. |
| `.kiro/hooks/evidence-properties-on-save.json` | PostFileSave hook (R6). |
| `.kiro/hooks/run-evidence-properties.mjs` | Bounded runner: `python -m unittest tests.test_properties tests.test_power`, 55 s limit, one JSON log line outside the repository. |

## Generators
- Events use the four synthetic devices and every compatible event type, timestamps spread over 400 to 1500 s, so windows overlap.
- Durations and gaps land exactly on a limit, or one second either side of it, about a third of the time (`near()`), because the rule's edges are where bugs hide.
- Tampering: change one recorded value so it really differs (duration ± 1, the seconds of `at`, or the id), swap two rows, delete a row, or edit and recompute every later hash (a careful forger).

## Oracles
- Correlation: the rule as written (300 s window, strictly after, hold ≥ 120 s), as literals in the test file.
- Chain: the independent verifier, which shares no code with the engines.
- Cross-implementation: the other implementation.

## Checking the tests themselves
Faults injected one at a time into the Python correlator, in memory only (window 301, hold 119, hold 121), must each make the correlation properties fail. Result at the time of writing: each fault caught, 23 to 36 failing random cases per fault.

## Relation to existing tests
`tests/property.test.mjs` already covers the browser engine through the Signal Forge (400 random configurations, the exhaustive 290–310 × 115–125 neighbourhood, monotonicity, tampering before reconstruction). This spec adds the Python side, the independent verifier, receipts, and agreement between the three.
