// ---------------------------------------------------------------------------------------------------------------------
// Copyright (c) 2025 - current, L.P. Cornelius Dol.
// ---------------------------------------------------------------------------------------------------------------------

/// Test Environment
/// ====================================================================================================================
///
/// This is a simple wrapper around the environment access to try to limit dependence on the JSVM to this one place.
///
/// <span class="status-stable">Module Status: </span>

export function BddEnv()
{
"use strict";
const EXPORTED=this || {};                                                                                              // allow invocation with or without new

// *********************************************************************************************************************
// CONSTRUCTION
// *********************************************************************************************************************

function init() {                                                                                                       // self-contained init avoids leaking temp objects into module closure
    }

// *********************************************************************************************************************
// PUBLIC
// *********************************************************************************************************************

/// API
/// --------------------------------------------------------------------------------------------------------------------

/// Exit the JS engine.
///
///     stscod          Integer execution status code. 0=Success, 1+ is an error code. Permitted range is O/S dependent.
///     =>              This function does not return.
EXPORTED.exitEngine=
function exitEngine(stscod) {
    Deno.exit(stscod);
    }

/// Create an instance of a module loaded from a URL or the file system.
///
///     pthOrUrl        File system path or URL for script.
///     =>              undefined.
EXPORTED.createModule=
function createModule(pthOrUrl, ...args) {
    try {
        const mod = loadModule(pthOrUrl);
        const obj = new mod(...args);
        if(typeof(obj)!=="object") { throw Error("Loaded module is type '"+typeof(obj)+"' not type 'object'"); }
        return obj;
        }
    catch(err) { err.message += " (file="+pthOrUrl+", cwd="+Deno.cwd()+")"; throw err; }
    }

/// Load a function module instance from a URL or the file system.
///
///     pthOrUrl        File system path or URL for script.
///     =>              undefined.
EXPORTED.loadModule=loadModule;
function loadModule(pthOrUrl) {
    const mod = Function("return (" + loadFile(pthOrUrl) + ");")();
    if(typeof(mod)!=="function") { throw Error("Loaded module is type '"+typeof(mod)+"' not type 'function'"); }
    return mod;
    }

/// Load a file from a URL or the file system.
///
///     pthOrUrl        File system path or URL for script.
///     =>              The text of the file.
EXPORTED.loadFile=loadFile;
function loadFile(pthOrUrl) {
    let rsl =  resolve(pthOrUrl);
    try { return Deno.readTextFileSync(rsl); }
    catch(err) {
        err.message += " (requested=" + pthOrUrl + ", cwd=" + resolve("./") + ")";
        throw err;
        }
    }

// *********************************************************************************************************************
// PRIVATE UTILITY (CANNOT DEPEND ON EXTERNAL MODULES AT ALL)
// *********************************************************************************************************************

function resolve(pthOrUrl) {
    let pth = import.meta.resolve(pthOrUrl).replace("file://","");
    if(/^\/[A-Z]:\//.test(pth)) { pth = pth.slice(1); }                                                                 // check for /C:/ -- stupid Windows FS.
    return pth
    }

// *********************************************************************************************************************
init();
return EXPORTED;
}
