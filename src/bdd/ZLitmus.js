// ---------------------------------------------------------------------------------------------------------------------
// Copyright (c) 2025 - current, L.P. Cornelius Dol.
// ---------------------------------------------------------------------------------------------------------------------

import { Litmus } from "./Litmus.js";



const   EXPECT_FAILED       = 2
,       EXPECT_PASSED       = 6
,       FAIL_FAST           = true
,       OUTPUT_PASSING      = true
,       VAL_FALSE           = false
,       VAL_TRUE            = true

let     test                = new Litmus({ outputPass: true, failFast: true, diag: false })

// *********************************************************************************************************************

Stage1: {
    test.batch("A Litmus test batch consists of a nested structure",{
        "NOTE 1": "This batch has "+EXPECT_FAILED+" deliberate failures to visually confirm that failures are reported correctly.",
        "NOTE 2": "Notes are specified with string values.",
        "Object values are recursed and objects can be nested to any level for grouping and readability": {
            "Function values are executed as tests": {
                "The first function"                                : () => {},
                "The second function"                               : () => {},
                "The third function"                                : () => {},
                "The fourth function"                               : () => {},
                },
            "Problems with Litmus itself throw LitmusError"         : () => { test.fails("LitmusError",test.valEQ,0,1) },
            "LitmusError subclasses Error": () => {
                let literr  = new test.LitmusError("NotAnError","LitmusError should be an instance of Error!");
                test.valEQ(VAL_TRUE, (literr instanceof Error));
                },
            },
        });
    // Note: No way to test that these conditions throw apart from allowing them to fail.
    test.batch("The test structure has to be correct",{
        "Empty groups are considered a failure.": {
            },
        "Blank test descriptions are considered a failure": {
            ""                                                      : () => {},
            },
        },OUTPUT_PASSING,!FAIL_FAST);
    test.batch("The Litmus general functions provide information about tests",{
        "Ensure correct information about tests" : {
            "Expected value ANYFNC matches any function"            : () => test.valEQ(test.ANYFNC      , ()=>{}),
            "The total tests failed can be retrieved"               : () => test.valEQ(EXPECT_FAILED    , test.totalFailed()),
            "The total tests passed can be retrieved"               : () => test.valEQ(EXPECT_PASSED    , test.totalPassed()),
            },
        });
    }

// *********************************************************************************************************************

if(test.totalFailed()!=EXPECT_FAILED) { test.exitEngine(1); }                                                           // Want to fail-fast here so later failures aren't accidentally hidden

// *********************************************************************************************************************

Stage2: {
    test.batch("A Litmus test is validated to ensure tests are correct",{
        "A test fails if it throws an exception"                    : () => { test.fails("Error"      , () => { throw new Error("This failure is expected!"); }); },
        "A test fails if it does not return undefined"              : () => { test.fails("LitmusError", () => { test.fails(() => { return "This should've been <undefined>"; }) }); },
        "Check exception for fails() with no args"                  : () => { test.fails("LitmusError", () => { test.fails(); }) },
        "Check exception for fails() with 1 arg"                    : () => { test.fails("LitmusError", () => { test.fails(1); }) },
        "Check exception for fails() with 2 args"                   : () => { test.fails("LitmusError", () => { test.fails(1,2); }) },
        "Check exception for fails() with 2 args, first invalid"    : () => { test.fails("LitmusError", () => { test.fails(1,Error); }) },
        "Check exception for fails() with 2 args, second invalid"   : () => { test.fails("LitmusError", () => { test.fails("Error",2); }) },
        "Check exception for objEQ() with differing keys"           : () => { test.fails("LitmusError", () => { test.objEQ({ a:1, b:[2,3,4], c:{ d:["6","7"] }},{ aa: 1, bb:[ 2, 3, 4], cc:{ dd:["6" ,"7" ] }},"check is annotated"); }) },
        "Check exception for objEQ() with differing values"         : () => { test.fails("LitmusError", () => { test.objEQ({ a:1, b:[2,3,4], c:{ d:["6","7"] }},{ a :11, b :[22,33,44], c :{ d :["66","77"] }},"check is annotated"); }) },
        "Check exception for typeEQ()"                              : () => { test.fails("LitmusError", () => { test.typeEQ([], {}, "check is annotated"); }) },
        "Check exception for valEQ()"                               : () => { test.fails("LitmusError", () => { test.valEQ(  1,  2, "check is annotated"); }) },
        "Check exception for valEQ() (pattern)"                     : () => { test.fails("LitmusError", () => { test.valEQ(/A/,"B", "check is annotated"); }) },
        "Check exception for valNE()"                               : () => { test.fails("LitmusError", () => { test.valNE(  1,  1, "check is annotated"); }) },
        "Check exception for valLT()"                               : () => { test.fails("LitmusError", () => { test.valLT(  1,  1, "check is annotated"); }) },
        "Check exception for valLE()"                               : () => { test.fails("LitmusError", () => { test.valLE(  1,  2, "check is annotated"); }) },
        "Check exception for valGT()"                               : () => { test.fails("LitmusError", () => { test.valGT(  1,  1, "check is annotated"); }) },
        "Check exception for valGE()"                               : () => { test.fails("LitmusError", () => { test.valGE(  2,  1, "check is annotated"); }) },
        });

    test.batch("The Litmus fails function is used to verify conditions under which a function throws",{
        "Ensure LitmustFailure is thrown as expected" : {
            "Specific LitmusError for no args"                      : () => test.fails("LitmusError[TooFewArgs]"            ,test.fails                                                 ),
            "Specific LitmusError for 1 arg"                        : () => test.fails("LitmusError[TooFewArgs]"            ,test.fails,1                                               ),
            "Specific LitmusError for arg1 not a string"            : () => test.fails("LitmusError[TypeMismatch]"          ,test.fails,1                ,2                             ),
            "Specific LitmusError for arg2 not a function"          : () => test.fails("LitmusError[TypeMismatch]"          ,test.fails,"Error"          ,2                             ),
            "Specific LitmusError on wrong exception"               : () => test.fails("LitmusError[IncorrectException]"    ,test.fails,"LitmusError"    ,() => { throw new Error(""); }),
            "Specific LitmusError on wrong exception code"          : () => test.fails("LitmusError[IncorrectException]"    ,test.fails,"LitmusError.ABC",test.valEQ,0,1                ),
            },
        "Ensure exceptions are trapped and identified correctly" : {
            "This test throws Error"                                : () => test.fails("Error"        ,()    => { throw new Error("Oops");          }                                       ),
            "This test throws Error[Test]"                          : () => test.fails("Error[Test]"  ,()    => { throw new Error("[Test] Oops");   }                                       ),
            "This test throws its first argument"                   : () => test.fails("string"       ,(err) => { throw err;                        },"Arg1"                                ),
            },
        });

    test.batch("Litmus provides type and deep-object comparison functions to streamline testing",{
        "typeEQ() checks two values for being the same type": {
            "array     EQ array    "                                : () => test.typeEQ ([]       ,[]       ),
            "boolean   EQ boolean  "                                : () => test.typeEQ (VAL_TRUE ,VAL_FALSE),
            "bigdec    EQ bigdec   "                                : () => test.typeEQ (1        ,2        ),
            "bigint    EQ bigint   "                                : () => test.typeEQ (BigInt(1),BigInt(2)),
            "function  EQ function "                                : () => test.typeEQ (()=>{}   ,()=>{}   ),
            "number    EQ number   "                                : () => test.typeEQ (1        ,2        ),
            "object    EQ object   "                                : () => test.typeEQ ({a:1}    ,{b:2}    ),
            "string    EQ string   "                                : () => test.typeEQ ("1"      ,"2"      ),
            "struct    EQ struct   "                                : () => test.typeEQ ({a:1}    ,{b:2}    ),
            "null      EQ null     "                                : () => test.typeEQ (null     ,null     ),
            "undefined EQ undefined"                                : () => test.typeEQ (undefined,undefined),
            "array     not EQ boolean  "                            : () => test.fails("LitmusError",test.typeEQ,[]       ,VAL_FALSE),
            "boolean   not EQ bigdec   "                            : () => test.fails("LitmusError",test.typeEQ,VAL_TRUE ,2        ),
            "bigdec    not EQ bigint   "                            : () => test.fails("LitmusError",test.typeEQ,1        ,BigInt(2)),
            "bigint    not EQ function "                            : () => test.fails("LitmusError",test.typeEQ,BigInt(1),()=>{}   ),
            "function  not EQ number   "                            : () => test.fails("LitmusError",test.typeEQ,()=>{}   ,2        ),
            "number    not EQ object   "                            : () => test.fails("LitmusError",test.typeEQ,1        ,{b:2}    ),
            "object    not EQ string   "                            : () => test.fails("LitmusError",test.typeEQ,{a:1}    ,"2"      ),
            "string    not EQ struct   "                            : () => test.fails("LitmusError",test.typeEQ,"1"      ,{b:2}    ),
            "struct    not EQ null     "                            : () => test.fails("LitmusError",test.typeEQ,{a:1}    ,null     ),
            "null      not EQ undefined"                            : () => test.fails("LitmusError",test.typeEQ,null     ,undefined),
            "undefined not EQ array    "                            : () => test.fails("LitmusError",test.typeEQ,undefined,[]       ),
            "object    not EQ array    (when same contents)"        : () => test.fails("LitmusError",test.typeEQ,{0:"X"}  ,["X"]    ),
            },

        "objEQ() checks strict, deep equality of two objects or arrays": {
            "Objects with equal values pass"                        : () =>                          test.objEQ({ a:1,b:{ e:1.1,f:[ 1,2,3,4 ]},c:3     }, { a:1,b:{ e:1.1,f:[ 1,2,3,4 ]},c:3 }),
            "Objects with unequal values fail"                      : () => test.fails("LitmusError",test.objEQ,{ a:3,b:{ e:1.1,f:[ 1,2,3,4 ]},c:1     }, { a:1,b:{ e:1.1,f:[ 1,2,3,4 ]},c:3 }),
            "Missing keys fail"                                     : () => test.fails("LitmusError",test.objEQ,{ a:1,b:{ e:1.1,f:[ 1,2,3,4 ]},        }, { a:1,b:{ e:1.1,f:[ 1,2,3,4 ]},c:3 }),
            "Added keys fail"                                       : () => test.fails("LitmusError",test.objEQ,{ a:1,b:{ e:1.1,f:[ 1,2,3,4 ]},c:3,d:4 }, { a:1,b:{ e:1.1,f:[ 1,2,3,4 ]},c:3 }),
            "Objects don't equal arrays"                            : () => test.fails("LitmusError",test.objEQ,[ "A","B","C" ]                         , { 0:"A",1:"B",2:"C" }               ),
            "Arrays with equal values"                              : () =>                          test.objEQ([ 1,[ 2.1,{ 0:1,1:2,2:3 },2.3 ],3   ]   , [ 1,[ 2.1,{ 0:1,1:2,2:3 },2.3 ],3 ] ),
            "Arrays with unequal values fail"                       : () => test.fails("LitmusError",test.objEQ,[ 3,[ 2.1,{ 0:1,1:2,2:3 },2.3 ],1   ]   , [ 1,[ 2.1,{ 0:1,1:2,2:3 },2.3 ],3 ] ),
            "Missing indices fail"                                  : () => test.fails("LitmusError",test.objEQ,[ 1,[ 2.1,{ 0:1,1:2,2:3 },2.3 ]     ]   , [ 1,[ 2.1,{ 0:1,1:2,2:3 },2.3 ],3 ] ),
            "Added indices fail"                                    : () => test.fails("LitmusError",test.objEQ,[ 1,[ 2.1,{ 0:1,1:2,2:3 },2.3 ],3,4 ]   , [ 1,[ 2.1,{ 0:1,1:2,2:3 },2.3 ],3 ] ),
            "Arrays don't equal objects"                            : () => test.fails("LitmusError",test.objEQ,{ 0:"A",1:"B",2:"C" }                   , [ "A","B","C" ]                     ),
            },
        });

    test.batch("Litmus provides value comparison functions to streamline testing",{
        "valBTW() checks that a test result is inclusively between two values": {
            "Lower-bound values pass"                               : () =>                          test.valBTW(2,3, 2    ),
            "Mid-range values pass"                                 : () =>                          test.valBTW(2,3, 2.5  ),
            "Upper-bound values pass"                               : () =>                          test.valBTW(2,3, 3    ),
            "Low values fail"                                       : () => test.fails("LitmusError",test.valBTW,2,3, 1    ),
            "High values fail"                                      : () => test.fails("LitmusError",test.valBTW,2,3, 4    ),
            "Mismatched types fail"                                 : () => test.fails("LitmusError",test.valBTW,2,3, "2.5"),
            },

        "valEQ() checks that a test result is strictly equal to an expected value": {
            "Strictly equal values pass"                            : () => test.valEQ(VAL_TRUE ,VAL_TRUE),
            "Loosely equal values fail"                             : () => test.fails("LitmusError",test.valEQ ,1     ,VAL_TRUE),
            "Unequal values fail"                                   : () => test.fails("LitmusError",test.valEQ ,VAL_FALSE ,VAL_TRUE),
            },
        "valNE() checks that a test result is not strictly equal to an expected value": {
            "Strictly inequal values pass"                          : () => test.valNE(VAL_FALSE, VAL_TRUE),
            "Loosely equal values pass"                             : () => test.valNE(1    , VAL_TRUE),
            "Strictly equal values fail"                            : () => test.fails("LitmusError",test.valNE ,VAL_TRUE  ,VAL_TRUE),
            },

        "valLT() checks that a test result is not strictly less-than an expected value": {
            "Lessor values pass"                                    : () => test.valLT(2    , 1),
            "Equal values fail"                                     : () => test.fails("LitmusError",test.valLT, 2 ,2     ),
            "Greater values fail"                                   : () => test.fails("LitmusError",test.valLT, 2 ,3     ),
            "Mismatched types fail"                                 : () => test.fails("LitmusError",test.valLT, 2 ,"1"   ),
            },
        "valLE() checks that a test result is not strictly less-than or equal an expected value": {
            "Lessor values pass"                                    : () => test.valLE(2, 1),
            "Equal values pass"                                     : () => test.valLE(2, 2),
            "Greater values fail"                                   : () => test.fails("LitmusError",test.valLE, 2 ,3     ),
            "Mismatched types fail"                                 : () => test.fails("LitmusError",test.valLE, 2 ,"1"   ),
            },
        "valGT() checks that a test result is not strictly greater-than an expected value": {
            "Greater values pass"                                   : () => test.valGT(2, 3) ,
            "Equal values fail"                                     : () => test.fails("LitmusError",test.valGT, 2 ,2     ),
            "Lessor values fail"                                    : () => test.fails("LitmusError",test.valGT, 2 ,1     ),
            "Mismatched types fail"                                 : () => test.fails("LitmusError",test.valGT, 2 ,"3"   ),
            },
        "valGE() checks that a test result is not strictly greater-than or equal an expected value": {
            "Greater values pass"                                   : () => test.valGE(2, 3),
            "Equal values pass"                                     : () => test.valGE(2, 2),
            "Mismatched types fail"                                 : () => test.fails("LitmusError",test.valGE, 2 ,"3"   ),
            "Lessor values fail"                                    : () => test.fails("LitmusError",test.valGE, 2 ,1     ),
            },
        });
    }

// *********************************************************************************************************************

test.logTotals(test.totalFailed()!=EXPECT_FAILED ? "but expected "+EXPECT_FAILED+" to fail." : "as expected.");
if(test.totalFailed()!=EXPECT_FAILED) { test.exitEngine(1); }                                                               // NB: other test suites would test if(failed)
