// ---------------------------------------------------------------------------------------------------------------------
// Copyright (c) 2025 - current, L.P. Cornelius Dol.
// ---------------------------------------------------------------------------------------------------------------------

/// Build Error Class
/// ========================================================================================================================
///
/// The Universal Build Tool error class defines an error with an error code and optional detail.
///
/// <span class="status-stable">Module Status: </span>

export class UbtError
extends Error
{
/// ### new UbtError(cod,msg,dtl)
///
/// Create a UbtError with the specified code, message, and optional detail.
constructor(cod, msg, dtl) {
    super("[" + cod + "] " + msg);
    this.name = "UbtError";
    this.code = cod;
    this.optional = dtl ?? {};
    this.optional.detail = (dtl?.detail ? [dtl.detail].flat().filter((elm) => (!!elm)) : []);
    }

/// ### wrap(err, dtl)
///
/// Wraps an error into a `UbtError`, retaining the original call stack, allowing optional detail to be added. The error
/// code is the name of the original error, the message is it's message or it string representation, and the optional
/// properties to add to the new error.
///
/// NB: If the error is *already* a `UbtError` the same error is returned, with the optional detail appended (if any).
static wrap(err, dtl) {
    if(!(err instanceof UbtError)) {
        let wrp = new UbtError(err.name,(err.message || String(err)),dtl);
        wrp.stack = err.stack;
        err = wrp;
        }
    else {
        err.optional.detail = err.optional.detail.concat((dtl?.detail ? [dtl.detail].flat().filter((elm) => (!!elm)) : []));
        }
    return err;
    }
}
