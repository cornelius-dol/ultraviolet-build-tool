// ---------------------------------------------------------------------------------------------------------------------
// Copyright (c) 2025 - current, L.P. Cornelius Dol.
// ---------------------------------------------------------------------------------------------------------------------

/// Build Processing Engine
/// ====================================================================================================================
///
/// Universal Build Tool engine to control the execution of a build script, with automatic detection and set up of then
/// build environment. Build scripts do not interact with this module, rather it is the command line script.
///
/// <span class="status-stable">Module Status: </span>

import * as stdFlags        from "jsr:@std/flags";
import { UbtApi }           from "./UbtApi.js";
import { UbtError }         from "./UbtError.js";

const ctx       = {}
,     api       = new UbtApi(ctx)
,     log       = api.log;

let bldModule   = null
,   envModules  = []
,   strTime     = Date.now();

// *********************************************************************************************************************
// MAIN
// *********************************************************************************************************************

try {
    let stscod = 0;

    logProgress("Started");
    await init();

    const bldFunction = bldModule?.[ctx.action];

    if(!bldModule) {
        stscod = (await invokeOldBatchFile()).code;
        }
    else if(!bldFunction) {
        log(`The action function '${ctx.action}()' is not implemented by build script.`);
        }
    else {
        for(let envmod of [...envModules].reverse()) {
            // deno-lint-ignore no-await-in-loop
            await envmod.setup?.(ctx,api);
            }

        SetDerivedFolders: {
            ctx.build.bddFolder   ??= api.fsInfo(ctx.bldFolder  ,"bdd/"),
            ctx.build.binFolder   ??= api.fsInfo(ctx.bldFolder  ,"bin/"),
            ctx.build.cfgFolder   ??= api.fsInfo(ctx.bldFolder  ,"cfg/"),
            ctx.build.libFolder   ??= api.fsInfo(ctx.bldFolder  ,"lib/"),
            ctx.build.ubtFolder   ??= api.fsInfo(ctx.bldFolder  ,"ubt/"),

            ctx.project.bldFolder ??= api.fsInfo(ctx.prjFolder  ,"bld/"),
            ctx.project.binFolder ??= api.fsInfo(ctx.prjFolder  ,"bin/"),
            ctx.project.libFolder ??= api.fsInfo(ctx.prjFolder  ,"lib/");
            ctx.project.srcFolder ??= api.fsInfo(ctx.prjFolder  ,"src/");
            ctx.project.tgtFolder ??= ctx.project.srcFolder;
            ctx.project.tstFolder ??= api.fsInfo(ctx.tstFolder  , ctx.prjFolder.name);
            ctx.project.wrkFolder ??= api.fsInfo(ctx.prjFolder  ,"zbuild/");

            ctx.git.gitFolder     ??= api.fsInfo(ctx.sdkFolder  ,"git/");
            ctx.java.jdkFolder    ??= api.fsInfo(api.resolveJdkFolder(17));
            ctx.java.jreFolder    ??= api.fsInfo(api.resolveJdkFolder(21));
            ctx.js.jsrFolder      ??= api.fsInfo(ctx.sdkFolder  ,"deno/"),
            ctx.maven.jreFolder   ??= api.fsInfo(api.resolveJdkFolder(17));
            ctx.maven.mvnFolder   ??= api.fsInfo(ctx.sdkFolder  ,"maven/");
            }

        await bldModule.setup?.(ctx,api);
        let fir = true;
        for(let fnc of api.buildSequence(bldFunction)) {
            (fir ? fir = false : log());
            logActionTitle(fnc);
            // deno-lint-ignore no-await-in-loop
            await fnc(ctx,api);
            }
        await bldModule.teardown?.(ctx,api);

        for(let envmod of envModules) {
            // deno-lint-ignore no-await-in-loop
            await envmod.teardown?.(ctx,api);
            }
        }
    logProgress("Completed");
    Deno.exit(stscod);
    }
catch(err) {
    err = UbtError.wrap(err);
    log();
    log();
    log((err.optional?.noTrace ? (err.name + ": " + err.message + ".") : err));

    if(!err.code.startsWith("RunTests")) {
        log();                                                                                                          // because exceptions interrupt normal flow
        heading("Error Information & Diagnostics "+(!ctx?.build?.dumpOnError ? "(Use `ctx.build.dumpOnError: true` for more detail)" : ""));
        for(let dtl of err.optional.detail) {
            log();                                                                                                      // because exceptions interrupt normal flow
            log(dtl.indexOf("\n")==-1 ? api.wrapText(dtl) : dtl);
            }
        if(ctx?.build?.dumpOnError) {
            log();                                                                                                      // because exceptions interrupt normal flow
            log(api.objString("Build API: ",Object.keys(api).sort()));
            log();
            log(api.objString("Build Args: ",Object.values(Deno.args)));
            log();
            log(api.objString("Build Context: ",ctx));
            }
        }

    logProgress("Failed");
    Deno.exit(99);
    }

// *********************************************************************************************************************
// PRIVATE FUNCTIONS
// *********************************************************************************************************************

async function init() {
    let args    = stdFlags.parse(Deno.args)
    ,   acnarg  = args._[0]
    ,   filarg  = api.fsInfo(args.file ?? null)
    ,   fdrarg  = api.fsInfo(args.folder ?? null)
    ,   envscrs = []
    ,   bldscr
    ,   apxfdr, bldfdr, prjfdr, sdkfdr;

    if(!acnarg) {
        throw new UbtError("UBT_BadArgs","Must specify the action function as the first argument");
        }
    if((!filarg && !fdrarg) || (filarg && fdrarg)) {
        throw new UbtError("UBT_BadArgs",`Must specify either '--file' or '--folder' (but not both)`);
        }
    if(filarg && !filarg.isFile) {
        throw new UbtError("UBT_BadArgs",`File specified with '--file' is not a file (${filarg})`);
        }
    if(fdrarg && !fdrarg.isFolder) {
        throw new UbtError("UBT_BadArgs",`Folder specified with '--folder' is not a fdr (${fdrarg})`);
        }
    if(!fdrarg) {
        fdrarg = api.fsInfo(filarg.parent);
        }

    for(let fdr = fdrarg; fdr; fdr = api.fsInfo(fdr.parent)) {
        let fil;
        if((fil = api.fsInfo(fdr,"!UbtEnv.js")).exists) {
            apxfdr = fdr;
            envscrs.push(fil);
            }
        if(!prjfdr && ((fil = api.fsInfo(fdr,"!UbtBuild.js")).exists || api.fsInfo(fdr,"!create.bat").exists)) {
            prjfdr = fdr;
            bldscr = fil;
            }
        }
    if(!apxfdr) {
        throw new UbtError("ApexFolderNotFound",`Could not locate apex folder by searching for highest !UbtEnv.js starting from '${fdrarg}'`);
        }
    if(!prjfdr) {
        throw new UbtError("ProjectFolderNotFound",`Could not locate project folder by searching for first !UbtBuild.js starting from '${fdrarg}'`);
        }

    sdkfdr = api.fsInfo(apxfdr,"sdk/"),
    bldfdr = import.meta.url.slice(import.meta.url.indexOf("://")+3)
    if(/^\/[A-Z]:\//.test(bldfdr)) { bldfdr = bldfdr.slice(1); }                                                        // stupid Windows FS -- check for /C:/.
    bldfdr = bldfdr.slice(0,bldfdr.lastIndexOf("/")+1).replace(/(src\/ubt\/|ubt\/$)/,"");
    bldfdr = api.fsInfo(bldfdr);

    Deno.chdir(apxfdr.path);
    Object.assign(ctx,{
        action          : acnarg,
        file            : filarg,
        folder          : fdrarg,
        apxFolder       : apxfdr,
        arcFolder       : api.fsInfo(apxfdr,"archive/"),
        bldFolder       : bldfdr,
        cdeFolder       : api.fsInfo(apxfdr,"code/"),
        docFolder       : api.fsInfo(apxfdr,"documentation/"),
        prjFolder       : prjfdr,
        tstFolder       : api.fsInfo(apxfdr,"test/"),
        sdkFolder       : api.fsInfo(apxfdr,"sdk/"),
        // derived folders are resolved after environment is set up
        build: {
            dumpOnError : false,
            noTruncate  : false,
            },
        git: {
            },
        java: {
            jdkArgs     : [],
            jdkFolderTpt: "{{sdkFolder.path}}jdk-{{ver}}/",
            jreArgs     : [],
            lint        : "Normal",
            maxErrors   : 10,
            classpath   : "",
            },
        js: {
            compactOutput: true,
            lint        : "Normal",
            },
        maven: {
            },
        project: {
            },
        //scriptData: {},                                                                                               // s/never be necessary
        });

    if(bldscr && bldscr.exists) {                                                                                       // only if !UbtBuild.js found
        for(let envscr of envscrs) {
            // deno-lint-ignore no-await-in-loop
            envModules.push(await import(`file:///${envscr}`));
            }
        bldModule = await import(`file:///${bldscr}`);
        }
    }

async function invokeOldBatchFile() {
    // BACKWARD COMPATIBILITY WITH OLD WINDOWS BATCH FILE BUILD SYSTEM.
    let tgt =( ctx.action==="packageFinal"     ? "DISTRIBUTION"
             : ctx.action==="packageSecondary" ? "PACKAGE"
             : ctx.action==="packagePrimary"   ? "ARCHIVE"
             : ctx.action==="buildProject"     ? "ALLRELATED"
             : ctx.action==="buildFolder"      ? "*"
             :                                   ctx.file?.nameBase || "!!BadToolInvocation!!")
    ,   args = [
            "!create",
            ctx.folder.path.replaceAll("/","\\").replace(/\\+$/, ""),
            tgt,
            ]
    ,   cmd = new Deno.Command(`${ctx.apxFolder}!DEVTOOL.bat`, { args });
    log(`Build task falling back to old batch script:\n  => ${args.join(" ")}\n`);
    return cmd.spawn().status;
    }

function logProgress(stg) {
    let str = (stg==="Started")
    ,   end = (stg==="Completed" || stg==="Failed")
    ,   emj = (stg==="Failed" ? "⛔ " : stg==="Completed" ? "✅ " : "")
    ,   elp = (end ? ` after ${((Date.now() - strTime) / 1000).toFixed(3)} seconds` : "");

    if(!str) { log(); }
    heading(`${emj}Build Task: ${stg} at ${api.dateTime()}${elp}`);
    if(!end) { log(); }
    }

function heading(txt) {
    log("*".repeat(120));
    log(txt);
    log("*".repeat(120));
    }

function logActionTitle(fnc) {
    api.heading1(`Build Action: ${fnc.name}()`);
    }

// *********************************************************************************************************************
