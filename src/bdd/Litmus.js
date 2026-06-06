// ---------------------------------------------------------------------------------------------------------------------
// Copyright (c) 2025 - current, L.P. Cornelius Dol.
// ---------------------------------------------------------------------------------------------------------------------


/// Litmus (Test Execution Module)
/// ====================================================================================================================
///
/// A light-weight module for declaratively describing and running tests on JavaScript code.
///
/// <span class="status-stable">Module Status: </span>
///
/// #### Arguments:
///
///     config          Configuration parameters. Will be deep frozen.
///
/// #### Config:
///
///     failText        Text value to emit before the description of the error for a failing test.
///     failFast        Whether to exit the JSVM at the end of a batch with failing tests.
///     outputPass      Whether to emit passing test descriptions.
///     diag            Whether to emit diagnostic detail *about* the tests, and emits stack traces for exceptions.
///
/// Failing tests must throw an exception. Testing for an exception which is expected can be done with {{#fails|function-fails}}.
///
/// If the use of Litmus is itself invalid, a LitmusError is thrown (type is LitmusError).
///
/// Each test **MUST** be individually runnable in parallel. Eventually support for doing parallel execution will be
/// implemented whereby the test output will be collated and emitted in the defined order, but {{#batch|function-batch}}
/// will execute all test cases concurrently. This may or may not be opt-in.
///
/// Note that some special type names are employed in this code for flexibility:
///
///   - `<container>` indicates any object of type `array` or `struct` (a basic JS container).
///   - `<function>` indicates any function.
///   - `<object>` indicates any JS object, that is `struct` or an "OO" or prototypical object.
///
/// Example Test Batch:
///
///     test.batch("A Litmus test batch consists of a nested structure",{
///         "NOTE 1": "This batch has "+expFailed+" deliberate failures to visually confirm that failures are reported correctly.",
///         "NOTE 2": "Notes are specified with string values.",
///         "Object values are recursed and objects can be nested to any level for grouping and readability": {
///             "Function values are executed as tests": {
///                 "The first function"                            : (log) => {},
///                 "The second function"                           : (log) => {},
///                 "The third function"                            : (log) => {},
///                 "The fourth function"                           : (log) => {},
///                 },
///             },
///         "These tests fail to ensure the primary test structure is correctly validated": {
///             "A test fails if it throws an exception"            : () => { throw  "This failure is expected!";       },
///             "A test fails if it does not return undefined"      : () => { return "This should've been <undefined>"; },
///             "Empty groups are considered a failure.": {
///                 },
///             "Descriptions must not be blank": {
///                 ""                                              : () => {},
///                 },
///             },
///         "These tests fail so the error messages can be visually verified": {
///             "Invoke fails() with no args"                       : () => { test.fails(); },
///             "Invoke fails() with 1 arg"                         : () => { test.fails(1); },
///             "Invoke fails() with 2 args"                        : () => { test.fails(1,2); },
///             "Invoke fails() with 2 args, first invalid"         : () => { test.fails(1,Error); },
///             "Invoke fails() with 2 args, second invalid"        : () => { test.fails("Error",2); },
///             "Invoke objEQ()"                                    : () => { test.objEQ({ a:1, b:[2,3,4], c:{ e:["6","7"] }}
///                                                                                     ,{ g:1, h:[2,3,4], i:{ k:["6","7"] }},"test is annotated with a note"); },
///             "Invoke typeEQ()"                                   : () => { test.typeEQ([],{},"test is annotated with a note"); },
///             "Invoke valEQ()"                                    : () => { test.valEQ(1,2   ,"test is annotated with a note"); },
///             "Invoke valNE()"                                    : () => { test.valNE(1,1   ,"test is annotated with a note"); },
///             "Invoke valLT()"                                    : () => { test.valLT(1,1   ,"test is annotated with a note"); },
///             "Invoke valLE()"                                    : () => { test.valLE(2,1   ,"test is annotated with a note"); },
///             "Invoke valGT()"                                    : () => { test.valGT(1,1   ,"test is annotated with a note"); },
///             "Invoke valGE()"                                    : () => { test.valGE(1,2   ,"test is annotated with a note"); },
///             },
///         },true);

import { BddEnv } from "./BddEnv.js";

export function Litmus(config)
{
"use strict";
const EXPORTED=this || {};                                                                                              // allow invocation with or without new

const   log             = console.log                                                                                   // convenience
,       undef           = undefined                                                                                     // convenience

let     totFailed       = 0
,       totPassed       = 0

const   ANYVAL          = EXPORTED.ANYVAL = Symbol("*ANYVAL")
,       ANYARR          = EXPORTED.ANYARR = Symbol("*ANYARR")
,       ANYCON          = EXPORTED.ANYCON = Symbol("*ANYCON")
,       ANYFNC          = EXPORTED.ANYFNC = Symbol("*ANYFNC")
,       ANYNBR          = EXPORTED.ANYNBR = Symbol("*ANYNBR")
,       ANYOBJ          = EXPORTED.ANYOBJ = Symbol("*ANYOBJ")
,       ANYSTR          = EXPORTED.ANYSTR = Symbol("*ANYSTR")
,       ANYSTC          = EXPORTED.ANYSTC = Symbol("*ANYSTC")
,       DETAILED        = false

// *********************************************************************************************************************
// CONSTRUCTION
// *********************************************************************************************************************

function init() {                                                                                                       // self-contained init avoids leaking temp objects into module closure
    config              = config || {};
    config.failText     = (config.failText  !=null ? config.failText    : "    => [FAIL]");
    config.failFast     = (config.failFast  !=null ? config.failFast    : true );
    config.outputPass   = (config.outputPass!=null ? config.outputPass  : false);
    config.diag         = (config.diag      !=null ? config.diag        : false);
    objFreeze(config);
    Object.assign(EXPORTED,new BddEnv());
    }

// *********************************************************************************************************************
// API - GENERAL
// *********************************************************************************************************************

/// General API
/// --------------------------------------------------------------------------------------------------------------------

/// Run a test batch. A batch is a simple nested structure, each value can be a string, nested object, or test
/// function.
///
///     nam             Name of test batch. Required.
///     tsts            Object of tests, as a hierarchical map of labeled subobjects and functions.
///     outpas          Batch-level override for outputting pass results. Typically used only while writing a test batch.
///     faifst          Batch-level override for failing fast. Typically used only while writing a test batch.
///     =>              True if all tests passed, else false.
///
/// A test function is executed and it must either throw an exception or return `undefined`. A return value of any kind
/// is a failure and will be logged (this makes it easy to write an initially failing test). Failing tests are  logged
/// using their key as a descriptor along with the exception text.
EXPORTED.batch=batch;
function batch(nam,tsts,outpas,faifas) {
    let bchcnt;

    log("Test Batch: "+nam);
    bchcnt=doTests(tsts,"   ",(outpas!=null ? outpas : config.outputPass));                                             // NB: indent only 3 spaces due console.log inserting space between args.
    log();
    totPassed+=bchcnt.passed;
    totFailed+=bchcnt.failed;

    if((faifas!=null ? faifas : config.failFast) && bchcnt.failed>0) {
        throw new LitmusError("FailFast", "Exiting because fail-fast option is set");
        }
    return bchcnt.failed;
    }

/// Return the total tests passed of all tests run since module was created.
///
///     =>              Count of all tests passed.
EXPORTED.totalPassed=totalPassed;
function totalPassed() {
    return totPassed;
    }

/// Return the total tests failed of all tests run since module was created.
///
///     =>              Count of all tests failed.
EXPORTED.totalFailed=totalFailed;
function totalFailed() {
    return totFailed;
    }

/// Log the totals in a standard format.
///
///     add...          Any text arguments to log in addition.
EXPORTED.logTotals=logTotals;
function logTotals(...add) {
    log("Totals: Passed "+totalPassed()+", Failed "+totalFailed(),...add);
    }

// *********************************************************************************************************************
// API - CHECK RESULTS
// *********************************************************************************************************************

/// Assertion API
/// --------------------------------------------------------------------------------------------------------------------

/// Ensure that a function fails by throwing the specified exception. Note that this expects an exact match for the
/// exception; it does not traverse the prototype hierarchicy. Use this to verify exceptions are thrown as expected.
///
///     rqdnam          Name of the required exception. Required.
///     fnc             Function to test. Required.
///     ...args         Arguments to pass to `fnc`. Optional.
///     =>              An error message or `undefined`.
///
/// Coded exceptions are supported. These are identified as having a non-Object constructor and an code property. The
/// format for `rqdnam` is `"ExceptionName[Code]"`. For example, `"LitmusError[IncorrectResult]"`. Specifying the code
/// is optional.
///
/// Throws LitmusError with code:
///
///     NotFunction
///     NotString
///     BadArgCount
///     DidNotThrow
///     IncorrectException
EXPORTED.fails=fails;
function fails(rqdnam,fnc,...args) {
    let ret;

    checkArgs("fails",arguments,2,undef,[ANYSTR,ANYFNC]);                                                               // help detect misspecified test calls
    try { ret=fnc.call(null,...args); }
    catch(thr) {
        if(rqdnam!=null) {
            let thrtxt=thr.message || "";
            let thrcod=thr.code!=null ? thr.code : thrtxt.startsWith("[") ? thrtxt.substring(1,thrtxt.indexOf("]")) : "";
            let thrnam=valType(thr)+(thrcod && rqdnam.indexOf("[")!==-1 ? "["+thrcod+"]" : "");
            if(rqdnam!==thrnam) {
                if(config.diag) { console.log(thr.stack); }
                throw new LitmusError("IncorrectException","Function '"+valString(fnc)+"' did not throw '"+rqdnam+"' ("+thr+")");
                }
            }
        return undef;
        }
    throw new LitmusError("DidNotThrow","Function '"+valString(fnc)+"' did not throw (return="+valString(ret)+")");
    }

/// Ensure that the  own keys and values of a test result or array are strictly equal to the supplied object (recursively).
///
///     rqdval          The check value specified by the test code.
///     tstval          The result from the code under test.
///     =>              `undefined`.
EXPORTED.objEQ=objEQ;
function objEQ(rqdval,tstval,annotn) {
    checkArgs("objEQ",arguments,2,3,[ANYCON,ANYCON,ANYSTR],annotn);                                                     // help detect misspecified test calls

    typeEQ(rqdval,tstval,annotn);
    if(!equalsAny(rqdval,tstval) && !objEquals(rqdval,tstval)) { throwFailure("is not equal to",rqdval,tstval,annotn); }
    }

/// Ensure that two values have equal types.
///
///     rqdval          The check value specified by the test code.
///     tstval          The result from the code under test.
///     =>              `undefined`.
EXPORTED.typeEQ=typeEQ;
function typeEQ(rqdval,tstval,annotn) {
    checkArgs("typeEQ",arguments,2,3,[ANYVAL,ANYVAL,ANYSTR],annotn);                                                    // help detect misspecified test calls
    if(!equalsAny(rqdval,tstval) && valType(rqdval)!==valType(tstval)) {
        //throw new LitmusError("IncorrectType","The type of the test result is '"+valType(tstval)+"' not the required type '"+valType(rqdval)+"'"+(annotn ? " ("+annotn+")" : ""));
        throwFailure("is not the same type as",valType(rqdval),valType(tstval),annotn);
        }
    }

/// Check a test value is strictly between the supplied high/low values (inclusively).
///
///     rqdlow          The low value for test range specified by the test code.
///     rqdhgh          The high value for test range specified by the test code.
///     tstval          The result from the code under test.
///     =>              `undefined`.
EXPORTED.valBTW=valBTW;
function valBTW(rqdlow,rqdhgh,tstval,annotn) {
    checkArgs("valBTW",arguments,3,4,[ANYVAL,ANYVAL,ANYVAL,ANYSTR],annotn);                                             // help detect misspecified test calls
    typeEQ(rqdlow,tstval,annotn);
    typeEQ(rqdhgh,tstval,annotn);
    valGE (rqdlow,tstval,annotn);
    valLE (rqdhgh,tstval,annotn);
    }

/// Check a result value is strictly equal to the supplied value.
///
///     rqdval          The check value specified by the test code. This can be a `RegExp`; if so the second value is
///                     coerced to a String.
///     tstval          The result from the code under test.
///     =>              `undefined`.
EXPORTED.valEQ=valEQ;
function valEQ(rqdval,tstval,annotn) {
    checkArgs("valEQ",arguments,2,3,[ANYVAL,ANYVAL,ANYSTR],annotn);                                                     // help detect misspecified test calls
    if(rqdval instanceof RegExp) {
        if(!rqdval.test(String(tstval))) { throwFailure("is not equal to",rqdval,tstval,annotn); }
        }
    else {
        typeEQ(rqdval,tstval,annotn);
        if(!equalsAny(rqdval,tstval) && rqdval!==tstval) { throwFailure("is not equal to",rqdval,tstval,annotn); }
        }
    }

/// Check a result value is strictly not equal to the supplied value.
///
///     rqdval          The check value specified by the test code.
///     tstval          The result from the code under test.
///     =>              `undefined`.
EXPORTED.valNE=valNE;
function valNE(rqdval,tstval,annotn) {
    checkArgs("valNE",arguments,2,3,[ANYVAL,ANYVAL,ANYSTR],annotn);                                                     // help detect misspecified test calls
    if(equalsAny(rqdval,tstval) || rqdval===tstval) { throwFailure("is equal to",rqdval,tstval,annotn); }
    }

/// Check a result value is strictly  less-than.
///
///     rqdval          The check value specified by the test code.
///     tstval          The result from the code under test.
///     =>              `undefined`.
EXPORTED.valLT=valLT;
function valLT(rqdval,tstval,annotn) {
    checkArgs("valLT",arguments,2,3,[ANYVAL,ANYVAL,ANYSTR],annotn);                                                     // help detect misspecified test calls
    typeEQ(rqdval,tstval,annotn);
    if(tstval>=rqdval) { throwFailure("is not less than",rqdval,tstval,annotn); }
    }

/// Check a result value is strictly  less-than or equal.
///
///     rqdval          The check value specified by the test code.
///     tstval          The result from the code under test.
///     =>              `undefined`.
EXPORTED.valLE=valLE;
function valLE(rqdval,tstval,annotn) {
    checkArgs("valLE",arguments,2,3,[ANYVAL,ANYVAL,ANYSTR],annotn);                                                     // help detect misspecified test calls
    typeEQ(rqdval,tstval,annotn);
    if(tstval>rqdval) { throwFailure("is not less that or equal to",rqdval,tstval,annotn); }
    }

/// Check a result value is strictly  greater-than.
///
///     rqdval          The check value specified by the test code.
///     tstval          The result from the code under test.
///     =>              `undefined`.
EXPORTED.valGT=valGT;
function valGT(rqdval,tstval,annotn) {
    checkArgs("valGT",arguments,2,3,[ANYVAL,ANYVAL,ANYSTR],annotn);                                                     // help detect misspecified test calls
    typeEQ(rqdval,tstval,annotn);
    if(tstval<=rqdval) { throwFailure("is not greater than",rqdval,tstval,annotn); }
    }

/// Check a result value is strictly  greater-than or equal.
///
///     rqdval          The check value specified by the test code.
///     tstval          The result from the code under test.
///     =>              `undefined`.
EXPORTED.valGE=valGE;
function valGE(rqdval,tstval,annotn) {
    checkArgs("valGE",arguments,2,3,[ANYVAL,ANYVAL,ANYSTR],annotn);                                                     // help detect misspecified test calls
    typeEQ(rqdval,tstval,annotn);
    if(tstval<rqdval) { throwFailure("is not greater than or equal to",rqdval,tstval,annotn); }
    }

// *********************************************************************************************************************
// PRIVATE UTILITY (CANNOT DEPEND ON EXTERNAL MODULES AT ALL)
// *********************************************************************************************************************

function doTests(tsts,logpfx,outpas) {
    let pas=0,fai=0;

    function logidt(...args) {
        args = args.reduce((tgt,arg) => {
            if(isString(arg)) {
                let arr = arg.split("\n");
                tgt.push(arr.shift());
                for(arg of arr) { tgt.push("\n",logpfx,"   =>",arg); }
                }
            else {
                tgt.push(arg);
                }
            return tgt;
            },[logpfx]);
        log(...args);
        }

    Object.keys(tsts).forEach((key) => {
        let val=tsts[key];
        if(isString(val)) {
            logidt(key,":",val);
            return;
            }
        else if(!key) {
            if(!outpas) { logidt(key); }
            logidt(config.failText,"[IncorrectTest] Litmus test descriptions cannot be blank.");
            fai++;
            }
        else if(isStruct(val)) {
            logidt(key);
            let { passed: subpas, failed: subfai } = doTests(val,logpfx+"    ",outpas);
            pas+=subpas;
            fai+=subfai;
            }
        else if(isFunc(val)) {
            try {
                if(outpas) { logidt(key); }
                if(val(logidt)!==undef) { throw new LitmusError("IncorrectTest","Litmus tests must return `undefined`."); }
                pas++;
                }
            catch(thr) {
                let err=String(thr);
                if(!outpas) { logidt(key); }
                if(config.diag && !(thr instanceof LitmusError)) { log(thr); }
                logidt(config.failText,String(err));
                fai++;
                }
            }
        });
    if((pas+fai) == 0) {
        logidt(config.failText,"[IncorrectTest] No tests specified in group.");
        fai++;
        }
    if(fai) { logidt("Tests:",((pas+fai)+", Passed: "+pas+", Failed: "+fai+".")); }
    else    { logidt("Tests:",((pas+fai)+", Passed all."                      )); }
    return { passed: pas, failed: fai };
    }

function checkArgs(fncnam,args,min,max,typs,ann) {
    if(min!==undef && args.length<min) {
        throw new LitmusError("TooFewArgs" ,"Litmus function `" + fncnam + "` needs at least "+min+" arguments" + (ann ? " (" + ann + ")" : "") + ".");
        }
    if(max!==undef && args.length>max) {
        throw new LitmusError("TooManyArgs","Litmus function `" + fncnam + "` needs at most "+max+" arguments" + (ann ? " (" + ann + ")" : "") + ".");
        }
    if(typs && typs.length) {
        for(let xa=0; xa<typs.length; xa++) {
            let rqdtyp=typs[xa]
            ,   argval=args[xa]
            ,   argtyp=valType(argval);
            if(rqdtyp!==argtyp
            && !equalsAny(rqdtyp,argval)
            && !(argtyp==="undefined" && (min===undef || xa>=min))) {
                throw new LitmusError("TypeMismatch","Litmus function `"+fncnam+"` requires argument "+(xa+1)+" to be type '"+rqdtyp.toString()+"', not type '"+argtyp.toString()+"'" + (ann ? " (" + ann + ")" : "") + ".");
                }
            }
        }
    }

function isArray    (val) {          return      valType(val,!DETAILED) ==="array";                    }
function isContainer(val) { let typ; return (typ=valType(val,!DETAILED))==="array"  || typ==="struct"; }
function isFunc     (val) {          return      valType(val,!DETAILED) ==="function";                 }
function isNumber   (val) {          return      valType(val,!DETAILED) ==="number";                   }
function isObject   (val) { let typ; return (typ=valType(val,!DETAILED))==="object" || typ==="struct"; }
function isString   (val) {          return      valType(val,!DETAILED) ==="string";                   }
function isStruct   (val) {          return      valType(val,!DETAILED) ==="struct";                   }

function objEquals(objone,objtwo) {
    if(objtwo===objone                  )           { return true;  }
    if(objtwo===null  || objone===null  )           { return false; }
    if(objtwo===undef || objone===undef )           { return false; }
    if(valType(objtwo)!==valType(objone))           { return false; }

    for(let key of Object.keys(objone)) {
        let rqdval=objone[key], tstval=objtwo[key];

        if(!equalsAny(rqdval,tstval)) {
            if(isArray(tstval) || isObject(tstval) || isStruct(tstval)) {
                if(!objEquals(rqdval,tstval))           { return false; }
                }
            else {
                if(tstval!==rqdval)                     { return false; }
                }
            }
        }
    for(let key of Object.keys(objtwo)) {
        let rqdval=objone[key], tstval=objtwo[key];
        if(rqdval===undef && tstval!==undef)        { return false; }
        if(rqdval===null  && tstval!==null )        { return false; }
        }
    return true;
    }

function objFreeze(obj) {
    Object.freeze(obj);
    for(let val of Object.values(obj)) { (isArray(val) || isObject(val)) ? objFreeze(val) : undef; }
    return obj;
    }

function objString(obj) {
    let arr     = isArray(obj)
    ,   tgt     = (arr ? "[" : "{")

    if(arr) {
        for(let xa=0, lmt=obj.length; xa<lmt; xa+=1) {
            let val=obj[xa];
            if(tgt.length>1) { tgt+=", "; }
            tgt+=(isContainer(val) ? objString(val) : valString(val));
            }
        }
    else {
        for(let key of Object.keys(obj)) {
            let val=obj[key];
            if(val!==undefined) {                                                                                       // since we ignore UDF keys for comparison, don't report them in value strings
                if(tgt.length>1) { tgt+=", "; }
                tgt+=key+":"+(isContainer(val) ? objString(val) : valString(val));
                }
            }
        }
    return tgt+(arr ? "]" : "}");
    }

function valString(val) {
    let ptp,txt;

    return (val===null                            ? "NUL"
    :       val===undefined                       ? "UDF"
    :       isString   (val)                      ? '"' + val + '"'
    :       isFunc     (val)                      ? (val.name ? val.name : "<lamda>")+"()"
    :       isContainer(val)                      ? objString(val)
    :       (txt=String(val))==="[object Object]" ? "<object "+((ptp && ptp.constructor.name) || "unknown object")+">"
    :                                               txt);
    }

function valType(val,dtl) {
    let typ     = typeof(val),ptp;

    return (typ!=="object"                         ? typ
    :       val===null                             ? "null"
    :       val===undefined                        ? "undefined"
    :       val instanceof Array                   ? "array"
    :       val instanceof Boolean                 ? "boolean"
    :       val instanceof Number                  ? "number"
    :       val instanceof String                  ? "string"
    :       (ptp=Object.getPrototypeOf(val))==null
            || ptp.constructor===null
            || ptp.constructor===Object            ? "struct"
    :       (dtl!==false && ptp.constructor.name)  ? ptp.constructor.name
    :                                                "object");
    }

function throwFailure(conjnc,rqdval,tstval,annotn) {
    throw new LitmusError("IncorrectResult","Result " + conjnc + " the expected value." + (annotn ? " ("+annotn+")" : "")
    +   "\nExpected: " + valString(rqdval)
    +   "\nReceived: " + valString(tstval));
    }

function equalsAny(rqdval,tstval) {
    return (rqdval===ANYVAL
        ||  rqdval===ANYARR && isArray    (tstval)
        ||  rqdval===ANYCON && isContainer(tstval)
        ||  rqdval===ANYFNC && isFunc     (tstval)
        ||  rqdval===ANYNBR && isNumber   (tstval)
        ||  rqdval===ANYOBJ && isObject   (tstval)
        ||  rqdval===ANYSTR && isString   (tstval)
        ||  rqdval===ANYSTC && isStruct   (tstval)
        );
    }

// *********************************************************************************************************************
// EXCEPTIONS
// *********************************************************************************************************************

EXPORTED.LitmusError=LitmusError;
function LitmusError(errcod,errmsg) {
    this.code   = errcod || "NoErrorCode";
    this.message= errmsg || "No error message";
    this.name   = this.constructor.name + "[" + errcod + "]";
    this.stack  = function() { let stk=(new Error().stack||"\n"); return stk.substring(stk.indexOf("\n")+1); }();
    }
LitmusError.prototype=new Error();
LitmusError.prototype.constructor=LitmusError;

// *********************************************************************************************************************
init();
}
