// ---------------------------------------------------------------------------------------------------------------------
// Copyright (c) 2025 - current, L.P. Cornelius Dol.
// ---------------------------------------------------------------------------------------------------------------------

import { Litmus } from "../bdd/Litmus.js";
import { UbtApi } from "./UbtApi.js";

const   BASE64              = true
,       FAIL_FAST           = true
,       OUTPUT_PASSING      = true

let {
    batch,
    exitEngine,
    logTotals,
    totalFailed,
    test,
    valEQ,
    }       = new Litmus({ outputPass: false, diag: false });

let ubt = new UbtApi();

batch("The UBT API offers numerous utility functions to facilitate builds.",{
    "ulid produces ULIDs": {
        [`Base32 (${ubt.ulid()})`]                          : () => { valEQ(26,ubt.ulid().length); },
        },
    "uuidV4 produces version 4 UUIDs": {
        [`In HEX (${ubt.uuidV4()})`]                        : () => { valEQ(36,ubt.uuidV4().length); },
        [`In URL Safe Base64 (${ubt.uuidV4(BASE64)})`]      : () => { valEQ(22,ubt.uuidV4(BASE64).length); },
        },
    },OUTPUT_PASSING,!FAIL_FAST);

logTotals();
if(totalFailed()) { exitEngine(1); }                                                                                    // Want to fail-fast here so later failures aren't accidentally hidden
