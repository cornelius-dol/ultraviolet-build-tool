// ---------------------------------------------------------------------------------------------------------------------
// Copyright (c) 2025 - current, L.P. Cornelius Dol.
// ---------------------------------------------------------------------------------------------------------------------

import { RewriteJavaDoc }   from "./RewriteJavaDoc.js";

const   mod                 = new RewriteJavaDoc({})

mod.processFiles(
    //"build/src/**/*.@(java|js)",
    //"work/code/webclu/src/**/!(lib|library)/*/*.@(java|js)",
    //"work/code/java/src/**/*.java",
    //"work/code/java/src/**/MiLogger.java",
    );
