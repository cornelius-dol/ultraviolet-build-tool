// ---------------------------------------------------------------------------------------------------------------------
// Copyright (c) 2025 - current, L.P. Cornelius Dol.
// ---------------------------------------------------------------------------------------------------------------------

/// Build Support API
/// ====================================================================================================================
///
/// The build API provides all functions needed by a build script to compile and package a project.
///
/// The purpose of the functions provided herein is to simplify common build actions and protect projects from any
/// specifics on the JavaScript runtime. Developers should feel free to offer suggestions for commonly needed functions
/// in order to save work in other projects. For a submission to have the best chance of being accepted, the developer
/// should create a function as needed by their build, and attempt to define it in such a way that it is well designed
/// for general use.
///
/// <span class="status-stable">Module Status: </span>

import * as stdFs           from "jsr:@std/fs";
import * as stdPath         from "jsr:@std/path";

import { UbtError }         from "./UbtError.js";

export function UbtApi(ctx)
{"use strict";
const EXPORTED={}; function exported(val,nam,obj){(obj||EXPORTED)[nam||val.name]=val;return val}
//**********************************************************************************************************************

const   CONSOLE_WRAP        = 120
,       DFT_TRUE            = true
,       FILE                = false
,       FOLDER              = true
,       INDENT              = true
,       PATH_DELIM          = stdPath.DELIMITER || stdPath.delimiter                                                    // fallback is for older Deno releases
,       ULID_B32            = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"

const   pipeline            = {}

let     allowBlankLine      = true

// *********************************************************************************************************************

function init() {                                                                                                       // self-contained init avoids leaking temp objects into module closure
    }

// *********************************************************************************************************************
// BUILD FUNCTIONS
// *********************************************************************************************************************

/// ## Async Build Operations

/// Compile one or more Java sources.
///
/// ------------------- | ----------------------------------------------------------------------------------------------
/// srcfils             | Single or array of `String` or `FsInfo` specifying source files to compile.
/// opts {              ||
/// . jdkArgs           | Arguments for the JDK's compiler. Default: `ctx.jdkArgs`.
/// . jdkFolder         | Folder for the JDK. Default: `ctx.jdkFolder`.
/// . classpath         | Classpath. The project source and target folders are included on the classpath automatically.
/// . lint              | One of: `None`, `Normal`, `Lax`, `Strict`, `All`, or a custom set of java lint options. Default: `ctx.java.lint`.
/// . maxErrors         | Maximum number of errors to show. Default: `ctx.maxErrors || 100`.
/// . maxSources        | Maximum number of source files to compile at one time. Default: `ctx.maxSources || 100`.
/// . srcFolder         | Source folder for Java. Default: `ctx.java.srcFolder`, `ctx.project.srcFolder`.
/// . tgtFolder         | Target folder for Java. Default: `ctx.tgtFolder`.
/// . cwd               | Current working directory when command is run. Defaults to project folder.
/// . logCommand        | Whether to log the O/S command used. Default: `false`.
/// . noLog             | Whether to suppress log-action messages. Default: `false`.
/// . discardOutput     | Whether to discard the command output as a string. Default: `false`.
/// . returnOutput      | Whether to return the command output as a string. Default: `false`.
/// . }                 ||
/// =>                  | `undefined`
///
/// The compiler is that specified by `opts.jdkFolder` or by `ctx.java.jdkFolder`. JDK arguments may be specified by
/// `opts.jdkArgs` or `ctx.java.jdkArgs`. Bear in mind that the JDK `--release` argument can change the targeted
/// release.
///
/// Any relative elements of the classpath will be resolved against the project folder if specified by `opts.classpath`
/// argument, the apex folder if specified by `ctx.java.classpath`, and the build library folder if specified by
/// `ctx.build.classpath`. The project source and target folders are included on the classpath automatically.
///
/// Source lists can be conveniently built using {{#findFiles|function-findFiles}}.
///
/// A custom set of lint options is specified as a CSV, per javac; for example `all,-classfile,-serial`. Using a curated
/// set is recommended as these will be adapted as the options evolve.
exported      (compileJava);
async function compileJava(srcfils,opts={}) {
    if((srcfils = arrayNoFalsey(srcfils)).length) try {
        const   ctxjva  = ctx.java
        ,       ctxprj  = ctx.project;

        let     srcfdr  = (opts.srcFolder || ctxjva.srcFolder || ctxprj.srcFolder)
        ,       tgtfdr  = (opts.tgtFolder || ctxjva.tgtFolder || ctxprj.tgtFolder)
        ,       cp1     = classpathResolve(ctx.prjFolder,opts.classpath)
        ,       cp2     = classpathResolve(ctx.apxFolder,ctxjva.classpath)
        ,       cp3     = classpathResolve(ctx.prjFolder,"lib/*")
        ,       cp4     = classpathResolve(ctx.prjFolder,"lib/ref/*")
        ,       clp     = classpathDedupe(join(PATH_DELIM,(tgtfdr!==srcfdr ? tgtfdr : null),srcfdr,cp1,cp2,cp3,cp4))
        ,       cwd     = fsInfo(opts.cwd || ctx.prjFolder)                                                            // allow string or FsInfo argument
        ,       enc     = "UTF-8"
        ,       jdkargs =       (opts.jdkArgs    || ctxjva.jdkArgs    || [])
        ,       jdkfdr  = fsInfo(opts.jdkFolder  || ctxjva.jdkFolder)
        ,       lnt     =       (opts.lint       || ctxjva.lint       || "Normal")
        ,       mxe     =       (opts.maxErrors  || ctxjva.maxErrors  || 100)
        ,       mxs     =       (opts.maxSources || ctxjva.maxSources || 100);

        switch(lnt.toLowerCase()) {
            case "none"   : { lnt = "none";                                                     } break;
            case "lax"    : { lnt = "all,-serial,-classfile,-options,-rawtypes,-unchecked";     } break;
            case "normal" : { lnt = "all,-serial,-classfile,-options,-rawtypes";                } break;
            case "strict" : { lnt = "all,-serial";                                              } break;
            case "all"    : { lnt = "all";                                                      } break;
            default       : { /* no default */                                                  } break;
            }

        if(!jdkfdr?.exists) {
            throw new UbtError("JdkNotFound",`JDK folder specified by ${opts.jdkFolder ? "`opts.jdkFolder`" : "`ctxjva.jdkFolder`"} does not exist: ${jdkfdr}`, { noTrace: true });
            }

        let     ioa
        ,       logargs = [];
        if((ioa=jdkargs.indexOf("--release"))!=-1) { logargs.push(jdkargs[ioa],jdkargs[ioa+1]); }
        if((ioa=jdkargs.indexOf("--source" ))!=-1) { logargs.push(jdkargs[ioa],jdkargs[ioa+1]); }
        if((ioa=jdkargs.indexOf("--target" ))!=-1) { logargs.push(jdkargs[ioa],jdkargs[ioa+1]); }

        if(!opts.noLog) { log(objString(`Compile Java (${join(" ",subpath(jdkfdr).slice(0,-1),logargs)}): `,subpathObject(srcfils,srcfdr))); }
        srcfils = srcfils.map((fil) => subpath(resolveFsi(fil,srcfdr),cwd));
        while(srcfils.length) {
            let cur = srcfils.slice(0,(mxs));
            await runCmd(jdkfdr + "bin/javac",[
                ...jdkargs      ,
                "-encoding"     , enc,
                `-Xlint:${lnt}` ,
                "-Xmaxerrs"     , mxe,
                "-cp"           , clp,
                "-sourcepath"   , srcfdr.path,
                "-s"            , srcfdr.path,
                "-d"            , tgtfdr.path,
                ...cur          ,
                ],cwd,"JavaCompile","Java compilation failed",opts.logCommand,opts.returnOutput,opts.discardOutput);
            srcfils = srcfils.slice(cur.length);
            }
        return 0;
        }
    catch(err) {
        err = UbtError.wrap(err);
        opts && err.optional.detail.push(objString("Command Options: ",opts));
        throw err;
        }
    }

/// Compile one or more JavaScript sources.
///
/// ------------------- | ----------------------------------------------------------------------------------------------
/// srcfils             | Single or array of `String` or `FsInfo` specifying source files to compile.
/// opts {              ||
/// . noWarn            | Array of compiler warning to suppress.
/// . wrapperFile       | File in which to wrap the compiler output, using `%output%` as a placeholder for the output.
/// . logCommand        | Whether to log the O/S command used. Default: `false`.
/// . noLog             | Whether to suppress progress messages. Default: `false`.
/// . discardOutput     | Whether to discard the command output as a string. Default: `false`.
/// . returnOutput      | Whether to return the command output as a string. Default: `false`.
/// . }                 ||
/// =>                  | `undefined`
///
/// The compiler used is the Closure Compiler from Google, provided as part of this build project, and periodically
/// updated (approximately once a year). It's primary purpose is maximal minimization and obfuscation of the source.
///
/// Options are also passed to the underlying call to {{#runJava}} and all options for that are permitted.
///
/// Source lists can be conveniently built using {{#findFiles|function-findFiles}}.
exported      (compileJavaScript);
async function compileJavaScript(srcfils,tgtfil,opts={}) {
    if((srcfils = arrayNoFalsey(srcfils)).length) try {
        const ctxjvs = ctx.js
        ,     ctxprj = ctx.project;

        let cplver  = "v2025-0407"
        ,   srcfdr  = (opts.srcFolder || ctxjvs.srcFolder || ctxprj.srcFolder)
        ,   wrnoff  = (opts.noWarn || []).map((nam) => (["--jscomp_off",nam])).flat()
        ,   wrpfil  = (opts.wrapperFile ? [ `--output_wrapper_file`, opts.wrapperFile ] : []);

        if(!opts.noLog) { log(objString(`Compile JavaScript (${cplver}): `,subpathObject(srcfils,srcfdr))); }
        await runJava(`${ctx.bldFolder}bin/closure/compiler-${cplver}.jar`,[
            `--charset`                     , `UTF-8`,
            `--compilation_level`           , `SIMPLE_OPTIMIZATIONS`,
            `--dependency_mode`             , `NONE`,
            `--process_closure_primitives`  , `false`,
            `--rewrite_polyfills`           , `false`,
            `--emit_use_strict`,
            `--strict_mode_input`,
            `--third_party`,
            ...wrpfil,
            ...wrnoff,
            `--js_output_file`              , tgtfil,
            `--js`                          , ...srcfils.map((fil)=>(fil?.path ?? fil)),
            ],{
            noLog                           : true,
            ...opts
            });
        }
    catch(err) {
        err = UbtError.wrap(err);
        opts && err.optional.detail.push(objString("Command Options: ",opts));
        throw err;
        }
    }

/// Create a JAR or ZIP archive using the JDK jar tool.
///
/// ------------------- | ----------------------------------------------------------------------------------------------
/// arc                 | Path of the archive to creatge. May be a`String` or `FsInfo`. Required.
/// spcs \\[{           | Array of specifications for files to add. Required.
/// . folder            | Folder from which to include files; files will be archived with paths relative to this.
/// . glob              | Glob string specifying subfolders and files to include.
/// . }]                ||
/// opts {              ||
/// . deleteInputFiles  | Whether to delete the input files after successfully building the archive. Default: `false`. USE WITH CARE!
/// . jdkArgs           | Arguments for the JDK's compiler. Default: `ctx.jdkArgs`.
/// . jdkFolder         | Folder for the JDK. Default: `ctx.jdkFolder`.
/// . manifestFile      | Path or `FsInfo` for the manifest file.
/// . proguardFile      | Path or `FsInfo` for the ProGuard file, implicitly indicating that the JAR should be obfuscated.
/// . keepUnobfuscated  | Whether to keep the unobfuscated file after obfuscating.
/// . logCommand        | Whether to log the O/S command used. Default: `false`.
/// . noLog             | Whether to suppress progress messages. Default: `false`.
/// . discardOutput     | Whether to discard the command output as a string. Default: `false`.
/// . returnOutput      | Whether to return the command output as a string. Default: `false`.
/// . }                 ||
/// =>                  | `undefined`
///
/// This function defers to [#runJdkTool|function-runJdkTool], passing the options received to that function.
///
/// The type of archive is derived from the supplied extension. Specifying a manifest and/or obfuscation config is only
/// allowed for a JAR file. If obfuscation is specified, the JAR is renamed to a temporary name and passed as the first
/// `-injar` for Proguard to process into the original name specified and the original JAR deleted. The original
/// file may be retained, if desired, with the temporary name.
///
/// The following folders are mapped for substitution in Proguard's configuration:
///
/// ------------------- | ----------------------------------------------------------------------------------------------
/// APXFDR              | `ctx.apxFolder`
/// BLDFDR              | `ctx.bldFolder`
/// CDEFDR              | `ctx.cdeFolder`
/// JDKFDR              | `ctx.java.jdkFolder`
/// LIBFDR              | `ctx.project.libFolder`
/// PRJFDR              | `ctx.prjFolder`
/// SDKFDR              | `ctx.sdkFolder`
/// WRKFDR              | `ctx.project.wrkFolder`
///
exported      (createArchive);
async function createArchive(arc,spcs,opts={}) {
    function jarSpec(fdr,glb) {
        fdr = fsInfo(fdr);
        let jcd = ctx.apxFolder.path                                                                                    // JAR commands are run with this cwd=apxFolder
        ,   pth = (fdr.path.startsWith(jcd) ? fdr.path.slice(jcd.length) : fdr.path);
        return findFiles(fdr,glb).map((fil) => ["-C", pth,fil.path.substring(fdr.path.length)]);
        }

    arc    = fsInfo(arc);
    opts.proguardFile ??= opts.proguardConfig;                                                                          // backward compat.

    let mnf     = resolveFsi(opts.manifestFile,ctx.prjFolder)
    ,   pgd     = resolveFsi(opts.proguardFile,ctx.prjFolder)
    ,   fillst  = []
    ,   spclst  = [];

    if((opts.manifestFile || opts.proguardFile) && arc.nameExt!==".jar") {
        throw new UbtError("InvalidOption","Can only specify `manifestFile` and `proguardFile` with JAR files");
        }
    if(opts.manifestFile && !mnf?.exists) {
        throw new UbtError("FileNotFound","Java manifest file was not found (file=" + mnf + ")");
        }
    if(opts.proguardFile && !pgd?.exists) {
        throw new UbtError("FileNotFound","ProGuard config file was not found (file=" + pgd + ")");
        }

    !opts.noLog && log(`Create Archive: ${arc}`);

    let tmp     = fsInfo(arc.parent + arc.nameBase + "-" + ulid() + arc.nameExt)
    ,   args;

    deleteFiles(tmp,{ noLog: true });
    if(opts.manifestFile) {
        if(!opts.noLog) { log(`. Manifest: ${subpath(opts.manifestFile)}`); }
        await runJdkTool("jar",[ "-cfm", tmp, mnf ], {...opts, cwd: ctx.apxFolder, noLog: true });
        args = [ "-uf", tmp ];
        }
    else {
        args = [ "-cf", tmp ];
        }
    if(arc.nameExt===".zip") { args[0] += "M"; }

    for(let spc of spcs) {
        let jarspc = jarSpec(spc.folder,spc.glob);
        if(!opts.noLog) { log(`. Files: ${subpath(spc.folder)} + ${spc.glob} -- Files: ${jarspc.length}`); }
        spclst.push(...jarspc);                                                                                         // [ ["-C","folder-path","archive-path"], ... ]
        fillst.push(...jarspc.map((spc) => ((ctx.apxFolder + spc[1] + spc[2]).replaceAll("\\","/"))));                  // [ "/<apex-path>/folder-path/archive-path", ... ]
        }
    if(fillst.length==0) { throw new UbtError("NoFilesFound","No files matched the specifications given"); }

    if(!opts.noLog) { log(`. Packing: ${fillst.length} file(s)`); }
    for(let asl = spclst, cnt; asl.length>0; asl = asl.slice(cnt)) {                                                    // process in blocks to avoid overlong command line.
        // deno-lint-ignore no-await-in-loop
        let lmt = Math.min(asl.length,100);
        for(cnt = 1; cnt<lmt && asl[cnt][1]===asl[cnt-1][1]; cnt+=1) {;}                                                // up to 100 files with matching root folder
        await runJdkTool("jar", [ ...args, ...asl.slice(0,cnt).flat() ], { ...opts, cwd: ctx.apxFolder, noLog: true });
        args[0] = "-uf";                                                                                                // switch to updating (change -cfM to -uf)
        }

    deleteFiles(arc,{ noLog: true });
    if(opts.proguardFile) {
        !opts.noLog && (log(`. Process ${tmp.name} to ${arc}`));
        await runJava(`${ctx.build.binFolder}proguard/ProGuard.jar`,[
            "-injars"               , tmp.path+"(!**/Z*)",
            `@${ctx.build.cfgFolder}ProGuard-GlobalOptions.txt`,
            `@${pgd}`,
            "-outjars"              , arc.path,
            ],{
            jreFolder               : fsInfo(opts.jdkFolder || ctx.java.jdkFolder),                                     // proguard must use the *compiler* JDK for consistency with JDK classes
            jreArgs: [
                // UBT Folders                                                                                          // Old Property Name
                // ----------------------------------------------                                                       // ----------------------------
                `-DAPXFDR=${ctx.apxFolder}`,                                                                            // PROGRAMMING
                `-DBLDFDR=${ctx.bldFolder}`,                                                                            // PROGRAMMING_BLD
                `-DCDEFDR=${ctx.cdeFolder}`,                                                                            // PROGRAMMING_COD
                `-DJDKFDR=${ctx.java.jdkFolder}`,                                                                       // PROGRAMMING_JDK
                `-DLIBFDR=${ctx.project.libFolder}`,                                                                    // PROGRAMMING_LIB
                `-DPRJFDR=${ctx.prjFolder}`,                                                                            // PROGRAMMING_CRT
                `-DSDKFDR=${ctx.sdkFolder}`,                                                                            // PROGRAMMING_SDK
                `-DSRCFDR=${ctx.project.srcFolder}`,
                `-DTGTFDR=${ctx.project.tgtFolder}`,
                `-DWRKFDR=${ctx.project.wrkFolder}`,                                                                    // DISTRO
                ],
            noLog                   : true,
            ...opts,
            });
        if(!opts.keepUnobfuscated) {
            deleteFiles(tmp,{ noLog: true });
            }
        }
    else {
        !opts.noLog && log(`. Move ${tmp.name} to ${arc}`);
        copyFiles(tmp,arc,{ move: true, noLog: true });
        }
    if(opts.deleteInputFiles && fillst.length) {
        !opts.noLog && log(`. Deleting input files (${fillst.length} files).`);
        deleteFiles(fillst,{ noLog: true });
        }
    !opts.noLog && log(". Done.");
    return fillst;
    }

/// Generate documentation from JavaScript source files and JSON configuration files.
///
/// ------------------- | ----------------------------------------------------------------------------------------------
/// tgt                 | Target archive file. Required.
/// args[]              | Arguments for the DocGen tool. Use `java -jar build/bin/DocGen.jar -help` for details.
/// opts {              ||
/// . idxLevel          | Index level, 1 - 3. Default: 3.
/// . idxContent        | Name of index file. Default: "!index.txt".
/// . srcExclude        | Exclude source list. Default: "Z*".
/// . subTitle          | Title substitution: "Developer Documentation".
/// . subCompany        | Company Name substition. Default: "DolHub Software Engineering".
/// . owner             | Software Owner. Default: "".
/// . subVer            | Version substitution. Default: "1.0".
/// . tgtVerify         | Folder to unpack documentation to for verification. Default: ctx.wrkFolder+"doc".
/// . jreArgs           | Arguments for the JRE. Default: `ctx.jreArgs`.
/// . jreFolder         | Folder for the JRE. Default: `ctx.jreFolder`.
/// . logCommand        | Whether to log the O/S command used. Default: `false`.
/// . noLog             | Whether to suppress progress messages. Default: `false`.
/// . discardOutput     | Whether to discard the command output as a string. Default: `false`.
/// . returnOutput      | Whether to return the command output as a string. Default: `false`.
/// . }                 ||
/// =>                  | `undefined`
///
exported      (generateDoc);
async function generateDoc(tgt,args=[],opts={}) {
    !opts.noLog && log(`Generate Documentation: ${tgt}`);
    await runJava(ctx.build.binFolder+"DocGen.jar",[
        `-idx.level:${opts.idxLevel     ??= 3}`,
        `-idx.content:${opts.idxContent ??= "!index.txt"}`,
        `-src.exclude:${opts.srcExclude ??= "Z*"}`,
        `-sub.title:${opts.title        ??= "DolHub Software Engineering"}`,
        `-sub.owner:${opts.owner        ??= ""}`,
        `-sub.subtitle:${opts.subTitle  ??= "Developer Documentation"}`,
        `-sub.ver:${opts.version        ??= "1.0"}`,
        `-tgt.verify:${opts.tgtVerify   ??= ctx.wrkFolder+"doc"}`,
        `-tgt:${tgt}`,
        ...args,
        ],{
        jreFolder: resolveJdkFolder(15),                                                                                // markdown engine uses old Java internal classes
        jreArgs: ["--illegal-access=permit"],
        noLog                           : true,
        ...opts,
        });
    }

/// Generate documentation from Java source files.
///
/// ------------------- | ----------------------------------------------------------------------------------------------
/// tgt                 | The target file for the archive.
/// pkgs                | One or more package names from which to extract documentation.
/// opts {              ||
/// . classpath         | Class file locations to add to the source, target, and context classpaths.
/// . documentTitle     | Document title. Default: "Java Package Documentation".
/// . outFolder         | Output folder path. Default `ctx.wrkFolder` + `"javadoc/"`.
/// . overview          | Overview file, relative to the project root. Optional.
/// . sourcepath        | Source file locations to add to the source folder.
/// . srcFolder         | Source folder path. Default `ctx.java.srcFolder`, then `ctx.project.srcFolder`.
/// . tgtFolder         | Target folder path. Default `ctx.java.tgtFolder`, then `ctx.project.tgtFolder`.
/// . windowTitle       | Window title. Default: `opts.documentTitle`, then `ctx.prjFolder.path`.
/// . }                 ||
/// =>                  | `undefined`
///
/// Documention is generated using the new built in support for MarkDown introduced in Java 23, and therefore expects
/// the LTS JDK 25 to be present. This requires `sdk/jdk-25`.
///
/// This function defers to [#runJdkTool()|function-runJdkTool], passing the options to that function.
exported      (generateJavaDoc);
async function generateJavaDoc(tgt, pkgs, opts={}) {
    if(!isType(tgt,FsInfo) && !isType(tgt,String)) {
        throw new UbtError("BadArg",`As of 2024-06-05 generateJavaDoc() requires arg 1 to be a target archive name (value=${tgt}, type=${typeof(tgt)}`);
        }
    if(!isType(pkgs,Array) && !isType(pkgs,String)) {
        throw new UbtError("BadArg",`As of 2024-06-05 generateJavaDoc() requires arg 2 to be a package name or array thereof (value=${pkgs}, type=${typeof(pkgs)}`);
        }
    tgt    = fsInfo(tgt);
    pkgs   = arrayNoFalsey(pkgs);
    try {
        let ctxbld  = ctx.build
        ,   ctxjva  = ctx.java
        ,   ctxprj  = ctx.project
        ,   cssfil  = fsInfo(opts.cssFile   || fsInfo(ctxbld.cfgFolder,"JavaDoc.css"))
        ,   srcfdr  = fsInfo(opts.srcFolder || ctxjva.srcFolder || ctxprj.srcFolder)
        ,   tgtfdr  = fsInfo(opts.tgtFolder || ctxjva.tgtFolder || ctxprj.tgtFolder)
        ,   outfdr  = fsInfo(opts.outFolder || fsInfo(ctxprj.wrkFolder,"javadoc/"))
        ,   cp1     = classpathResolve(ctx.prjFolder,opts.classpath)
        ,   cp2     = classpathResolve(ctx.apxFolder,ctxjva.classpath)
        ,   cp3     = classpathResolve(ctx.prjFolder,"lib/*")
        ,   cp4     = classpathResolve(ctx.prjFolder,"lib/ref/*")
        ,   clspth  = classpathDedupe(join(PATH_DELIM,tgtfdr,cp1,cp2,cp3,cp4))
        ,   srcpth  = classpathDedupe(join(PATH_DELIM,srcfdr,classpathResolve(ctx.prjFolder,opts.sourcepath)))
        ,   enc     = "UTF-8";

        createFolders(outfdr);
        await runJdkTool("javadoc",[
            "-doctitle"         , opts.documentTitle || "Java Package Documentation",
            "-windowtitle"      , opts.windowTitle   || opts.documentTitle || ctx.prjFolder.path,
            // -----------------
            "-author"           ,
            "-encoding"         , enc,
            "-nodeprecated"     ,
            "-quiet"            ,
            "-version"          ,
            // -----------------
            "--add-stylesheet"  , cssfil,
            "--class-path"      , clspth,
            "--source-path"     , srcpth,
            "-d"                , outfdr,
            ...(opts.overview ? ["-overview", opts.overview] : []),
            // -----------------
            ...(pkgs.length>0 ? ["-subpackages", pkgs.flat().join(":")] : findFiles([ctx.project.srcFolder,"**/*.java"])),
            ],{
            ...opts,
            jdkFolder: resolveJdkFolder(25) || resolveJdkFolder(24) || resolveJdkFolder(23),                            // markdown support added in JDK 23; use JDK 25-23 LTS if available
            jdkArgs: [ ...(opts.jdkArgs || []), "--illegal-access=permit" ],
            });
        await createArchive(tgt, [
            { folder: outfdr, glob: "**/*" },
            ]);
        }
    catch(err) {
        // NB: no need to dump command line; this calls runJdkTool
        throw UbtError.wrap(err);
        }
    }

/// Run git command.
///
/// ------------------- | ----------------------------------------------------------------------------------------------
/// cmd                 | Name of git command (e.g. push, pull, commit, etc). Required.
/// args                | Arguments to pass to the program. Defaults to `[]`
/// opts {              ||
/// . gitFolder         | Git folder. Defaults to `ctx.git.gitFolder`.
/// . cwd               | Current working directory when command is run. Defaults to project folder.
/// . logCommand        | Whether to log the O/S command used. Default: `false`.
/// . noLog             | Whether to suppress progress messages. Default: `false`.
/// . discardOutput     | Whether to discard the command output as a string. Default: `false`.
/// . returnOutput      | Whether to return the command output as a string. Default: `false`.
/// . }                 ||
exported      (runGit);
async function runGit(cmd,args = [],opts = {}) {
    try {
        const ctxgit = ctx.git
        ,     gitfdr = fsInfo(opts.gitFolder || ctxgit.gitFolder);

        if(!gitfdr?.exists) {
            throw new UbtError("GitNotFound",`GIT folder specified by ${opts.gitFolder ? "`opts.gitFolder`" : "`ctx.git.gitFolder`"} does not exist: ${gitfdr}`, { noTrace: true });
            }

        if(!opts.noLog) { log(objString(`Run GIT Command (${subpathArray(gitfdr)}): ${cmd} `,args.map((arg)=>(arg.toString())))); }
        return await runCmd(`${gitfdr}bin/git`,[
            `${cmd}`,
            ...args,
            ],opts.cwd,"GitTool",`GIT command '${cmd}' failed`,opts.logCommand,opts.returnOutput,opts.discardOutput);
        }
    catch(err) {
        err = UbtError.wrap(err);
        opts && err.optional.detail.push(objString("Command Options: ",opts));
        throw err;
        }
    }

/// Run a Java program, either class or JAR.
///
/// ------------------- | ----------------------------------------------------------------------------------------------
/// pgm                 | Program to run, either the path of a JAR or the fully qualified name of a class.
/// args                | Arguments to pass to the program.
/// opts {              ||
/// . jreFolder         | Folder of the JRE to use. Defaults to `ctx.java.jreFolder`.
/// . jreArgs           | Arguments for the JRE. Defaults to `ctx.java.jreArgs`.
/// . srcFolder         | Source folder for classpth. Defaults to `ctx.java.srcFolder`, then `ctx.project.srcFolder`.
/// . tgtFolder         | Target folder for classpth. Defaults to `ctx.java.tgtFolder`, then `ctx.project.tgtFolder`.
/// . classpath         | Classpath. The project source, target, and 'lib/*' folders are included on the classpath automatically.
/// . cwd               | Current working directory when command is run. Defaults to project folder.
/// . logCommand        | Whether to log the O/S command used. Default: `false`.
/// . noLog             | Whether to suppress progress messages. Default: `false`.
/// . discardOutput     | Whether to discard the command output as a string. Default: `false`.
/// . returnOutput      | Whether to return the command output as a string. Default: `false`.
/// . }                 ||
/// =>                  | `undefined`
///
/// Any relative elements of the classpath will be resolved against the project folder if specified by `opts.classpath`
/// argument, the apex folder if specified by `ctx.java.classpath`, and the build library folder if specified by
/// `ctx.build.classpath`.
exported      (runJava);
async function runJava(pgm,args=[],opts={}) {
    try {
        const   ctxjva  = ctx.java
        ,       ctxprj  = ctx.project
        ,       jrefdr  = fsInfo(opts.jreFolder || ctxjva.jreFolder)
        ,       jreargs =       (opts.jreArgs   || ctxjva.jreArgs   || [])
        ,       srcfdr  = fsInfo(opts.srcFolder || ctxjva.srcFolder || ctxprj.srcFolder)
        ,       tgtfdr  = fsInfo(opts.tgtFolder || ctxjva.tgtFolder || ctxprj.tgtFolder);

        let     cp1     = classpathResolve(ctx.prjFolder,opts.classpath)
        ,       cp2     = classpathResolve(ctx.prjFolder,ctxjva.classpath)
        ,       cp3     = classpathResolve(ctx.prjFolder,"lib/*")
        ,       cp4     = classpathResolve(ctx.prjFolder,"lib/ref/*")
        ,       clp     = classpathDedupe(join(PATH_DELIM,tgtfdr,srcfdr,cp1,cp2,cp3,cp4));

        if(!jrefdr?.exists) {
            throw new UbtError("JreNotFound",`JRE folder specified by ${opts.jreFolder ? "`opts.jreFolder`" : "`ctx.java.jreFolder`"} does not exist: ${jrefdr}`, { noTrace: true });
            }

        clp = (clp ? ["-cp",clp] : []);
        pgm = pgm.toString();                                                                                           // convert FsInfo to path

        if(!opts.noLog) { log(objString(`Run Java Tool (${subpathArray(jrefdr)}): ${pgm}: `,(args.length ? args.map((arg)=>(arg.toString())) : null))); }
        return await runCmd(jrefdr + "bin/java",[
            "-Dnative.encoding=UTF-8",
            "-Dsun.stdout.encoding=UTF-8",
            ...jreargs,
            ...clp,
            ...(pgm.endsWith(".jar") ? [ "-jar",resolveFsi(pgm,ctx.build.binFolder) ] : [ pgm ]),
            ...(args || []),
            ],opts.cwd,"JavaProgram",`Java program failed (${pgm})`,opts.logCommand,opts.returnOutput,opts.discardOutput);
        }
    catch(err) {
        err = UbtError.wrap(err);
        opts && err.optional.detail.push(objString("Command Options: ",opts));
        throw err;
        }
    }

/// Run Java unit tests.
///
/// ------------------- | ----------------------------------------------------------------------------------------------
/// fils                | Source files to compile and run.
/// args                | Arguments to pass to the programs.
/// opts {              ||
/// . srcFolder         | Source folder for classpth. Defaults to `ctx.java.srcFolder`, then `ctx.project.srcFolder`.
/// . }                 ||
/// =>                  | `undefined`
///
/// Currently this simply compiles and runs the specified classes. Unit tests are expected to begin with a `Z` and all
/// classes in the project beginning with `Z` will be deleted before compiling.
///
/// This function defers to [#runJava()|function-runJava], passing the arguments and options to that function.
exported      (runJavaTests);
async function runJavaTests(fils,args=[],opts={}) {
    deleteFiles(findFiles(ctx.prjFolder, "**/Z*.class"));
    if((fils = arrayNoFalsey(fils)).length) try {
        const   ctxjva  = ctx.java
        ,       ctxprj  = ctx.project;

        let     srcfdr  = fsInfo(opts.srcFolder || ctxjva.srcFolder || ctxprj.srcFolder)
        ,       tgtfdr  = fsInfo(opts.tgtFolder || ctxjva.tgtFolder || ctxprj.tgtFolder);

        fils = arrayNoFalsey(fils.map((fil) => {
            let fsi = resolveFsi(fil,srcfdr);
            if(fsi.name[0]!=="Z") {
                fsi = fsInfo(fsi.parent,("Z" + fsi.name));
                }
            return (fsi.exists && fsi.isFile ? fsi : null);
            }));
        for(let fil of fils) {
            log();
            heading2(`Run Tests for ${subpath(fil)}`);
            // deno-lint-ignore no-await-in-loop
            await compileJava(fil,Object.create({},opts,{ noLog: true }));
            // deno-lint-ignore no-await-in-loop
            await runJava(fil,args,{
                noLog                   : true,
                ...opts,
                });
            }
        }
    catch(err) {
        // NB: no need to add command line; this calls runJava
        throw UbtError.wrap(err);
        }
    finally {
        log();
        deleteFiles(findFiles(ctx.prjFolder, "**/Z*.class"));
        }
    }

/// Run a native JDK tool.
///
/// ------------------- | ----------------------------------------------------------------------------------------------
/// pgm                 | Name of program to run (without the extension on Windows).
/// args                | Arguments to pass to the program.
/// opts {              ||
/// . jdkFolder         | JRE folder. Defaults to `ctx.java.jdkFolder`.
/// . cwd               | Current working directory when command is run. Defaults to project folder.
/// . logCommand        | Whether to log the O/S command used. Default: `false`.
/// . noLog             | Whether to suppress progress messages. Default: `false`.
/// . discardOutput     | Whether to discard the command output as a string. Default: `false`.
/// . returnOutput      | Whether to return the command output as a string. Default: `false`.
/// . }                 ||
///
/// Take care to ensure any tool used is provided for all JDK distributions used by any developer, and at least Linux,
/// Mac, and Windows.
exported      (runJdkTool);
async function runJdkTool(pgm,args=[],opts={}) {
    try {
        const ctxjva = ctx.java
        ,     jdkfdr = fsInfo(opts.jdkFolder || ctxjva.jdkFolder);

        if(!jdkfdr?.exists) {
            throw new UbtError("JreNotFound",`JRE folder specified by ${opts.jdkFolder ? "`opts.jdkFolder`" : "`ctx.java.jdkFolder`"} does not exist: ${jdkfdr}`, { noTrace: true });
            }

        if(!opts.noLog) { log(objString(`Run JDK Tool (${subpathArray(jdkfdr)}): ${pgm} `,args.map((arg)=>(arg.toString())))); }
        return await runCmd(`${jdkfdr}bin/${pgm}`,[
            ...(args || []),
            ],opts.cwd,"JdkTool",`JDK tool '${pgm}' failed`,opts.logCommand,opts.returnOutput,opts.discardOutput);
        }
    catch(err) {
        err = UbtError.wrap(err);
        opts && err.optional.detail.push(objString("Command Options: ",opts));
        throw err;
        }
    }

/// Run JavaScript unit tests with the BDD package loaded.
///
/// ------------------- | ----------------------------------------------------------------------------------------------
/// fils                | Script files to run.
/// args                | Arguments to pass to the programs.
/// opts {              ||
/// . jsrFolder         | JavaScript Runtime folder. Defaults to `ctx.js.jsrFolder`.
/// . srcFolder         | Source folder. Defaults to `ctx.js.srcFolder`, then `ctx.project.srcFolder`.
/// . imports {         ||
/// . . (prefix)        | URL for folder.
/// . . }               ||
/// . cwd               | Current working directory when command is run. Defaults to project folder.
/// . logCommand        | Whether to log the O/S command used. Default: `false`.
/// . discardOutput     | Whether to discard the command output as a string. Default: `false`.
/// . returnOutput      | Whether to return the command output as a string. Default: `false`.
/// . }                 ||
/// =>                  | `undefined`
///
/// Imports are a map of string path prefixes to URLs which serve as the root for that path. Prefixes can be absolute or
/// relative paths and are match case-sensitively. The default imports are:
///
///     "/$apx/" : `file:///${ctx.apxFolder}`,
///     "/$bdd/" : `file:///${ctx.build.bddFolder}`,
///     "/$cwd/" : `file:///${fil.parent}`,
///     "/$lib/" : `file:///${ctx.build.libFolder}`,
///     "/$prj/" : `file:///${ctx.prjFolder}`,
///     "/$ubt/" : `file:///${ctx.build.ubtFolder}`,
exported      (runJsTests);
async function runJsTests(fils,args=[],opts={}) {
    let tmpfil;

    if((fils = arrayNoFalsey(fils)).length) try {
        const ctxjvs = ctx.js
        ,     ctxprj = ctx.project;

        let jsrfdr  = (opts.jsrFolder || ctxjvs.jsrFolder)
        ,   srcpth  = resolveFsi((opts.srcFolder || ctxjvs.srcFolder || ctxprj.srcFolder),ctx.prjFolder);

        fils = fils.map((fil) => {
            fil = fsInfo(resolveFsi(fil,srcpth));
            if(fil.name[0]!=="Z") {
                fil = fsInfo(resolveFsi(("Z" + fil.name),fil.parent));
                if(!fil.exists) {
                    fil = fsInfo(resolveFsi(("Z-" + fil.name.slice(1)),fil.parent));
                    if(!fil.exists) {
                        fil = null;
                        }
                    }
                }
            return fil;
            }).filter((elm) => (!!elm));

        tmpfil = await Deno.makeTempFile({ prefix: "UBT-ImportMap-", suffix: ".json", });
        for(let fil of fils) {
            log();
            heading2(`Run Tests for ${subpath(fil)}`);
            writeFileText(tmpfil,JSON.stringify({
                "imports": Object.assign({
                    "/$apx/" : `file:///${ctx.apxFolder}`,
                    "/$bdd/" : `file:///${ctx.build.bddFolder}`,
                    "/$cwd/" : `file:///${fil.parent}`,
                    "/$lib/" : `file:///${ctx.build.libFolder}`,
                    "/$prj/" : `file:///${ctx.prjFolder}`,
                    },(opts.imports || {})),
                 }));
            // deno-lint-ignore no-await-in-loop
            return await runCmd(jsrfdr + "deno",[
                "run",
                "--allow-all"   ,
                "--log-level"   ,"info",
                `--import-map=${tmpfil}`,
                fil.path,
                ...(args || []),
                ],opts.cwd,"RunTests","JavaScript tests failed",opts.logCommand,opts.returnOutput,opts.discardOutput);
            }
        }
    catch(err) {
        err = UbtError.wrap(err);
        opts && err.optional.detail.push(objString("Command Options: ",opts));
        throw err;
        }
    finally {
        try { tmpfil && deleteFiles(tmpfil); } catch(err) { log(`Warning: Failed to remove temporary file: ${tmpfil}`); }
        }
    }

/// Run a maven command.
///
/// ------------------- | ----------------------------------------------------------------------------------------------
/// cmd                 | Name of maven command (e.g. clean, compile, package, etc). Required.
/// args                | Arguments to pass to the program. Defaults to `[]`
/// opts {              ||
/// . mvnFolder         | Maven home folder. Defaults to `ctx.maven.mvnFolder`.
/// . jreFolder         | JRE folder. Defaults to `ctx.maven.jreFolder`, then to `ctx.java.jreFolder`.
/// . logCommand        | Whether to log the O/S command used. Default: `false`.
/// . noLog             | Whether to suppress progress messages. Default: `false`.
/// . discardOutput     | Whether to discard the command output as a string. Default: `false`.
/// . returnOutput      | Whether to return the command output as a string. Default: `false`.
/// . }                 ||
exported      (runMaven);
async function runMaven(cmd,args = [],opts = {}) {
    try {
        const ctxmvn = ctx.maven
        ,     mvnfdr = fsInfo(opts.mvnFolder || ctxmvn.mvnFolder)
        ,     jrefdr = fsInfo(opts.jreFolder   || ctxmvn.jreFolder   || ctx.java.jreFolder)
        ,     plxjar = findFiles(`${mvnfdr}boot/`,"plexus-classworlds-*.jar")[0]?.path;

        if(!mvnfdr?.exists) {
            throw new UbtError("MavenNotFound",`Maven folder specified by "opts.mvnFolder || ctx.maven.mvnFolder" does not exist: ${mvnfdr}`, { noTrace: true });
            }
        if(!jrefdr?.exists) {
            throw new UbtError("MavenJreNotFound",`Maven JRE folder specified by "opts.jreFolder || ctx.maven.jreFolder || ctx.java.jreFolder" does not exist: ${jrefdr}`, { noTrace: true });
            }

        if(!opts.noLog) { log(objString(`Run Maven Command (${subpathArray(mvnfdr)}): ${cmd} `,args.map((arg)=>(arg.toString())))); }
        return await runJava("org.codehaus.plexus.classworlds.launcher.Launcher", [
            cmd,
            ...args,
            ],{
            ...opts,
            jreArgs: [
                `-Dmaven.home=${mvnfdr.path.slice(0,-1)}`,
                `-Dmaven.multiModuleProjectDirectory=${ctx.prjFolder.path.slice(0,-1)}`,
                `-Dclassworlds.conf=${mvnfdr}bin/m2.conf`,
                `-Dlibrary.jansi.path=${mvnfdr}lib/jansi-native`,
                ],
            jreFolder: jrefdr,
            classpath: plxjar,
            noLog    : true,
            });
        }
    catch(err) {
        err = UbtError.wrap(err);
        opts && err.optional.detail.push(objString("Command Options: ",opts));
        throw err;
        }
    }

/// Validate JavaScript files (using {{@Deno lint|https://deno.land/manual/tools/linter}}).
///
/// ------------------- | ----------------------------------------------------------------------------------------------
/// fils                | Script files to run.
/// opts {              ||
/// . jsrFolder         | JavaScript Runtime folder. Defaults to `ctx.js.jsrFolder`.
/// . srcFolder         | Source folder. Defaults to `ctx.js.srcFolder`, then `ctx.project.srcFolder`.
/// . lint              | One of: `None`, `Normal`, `Lax`, `Strict`, `All`, or a custom lint file per `Deno lint`. Default: `ctx.js.lint`.
/// . compactOutput     | Whether to emit compact linting output messages. Default: `ctx.js.compactOutput`.
/// . cwd               | Current working directory when command is run. Defaults to project folder.
/// . logCommand        | Whether to log the O/S command used. Default: `false`.
/// . noLog             | Whether to suppress progress messages. Default: `false`.
/// . discardOutput     | Whether to discard the command output as a string. Default: `false`.
/// . returnOutput      | Whether to return the command output as a string. Default: `false`.
/// . }                 ||
/// =>                  | `undefined`
///
/// A custom set of lint options is specified as a path or `FsInfo`. Using a curated set is recommended as these will be
/// adapted as the options evolve.
exported      (validateJs);
async function validateJs(srcfils,opts={}) {
    if((srcfils = arrayNoFalsey(srcfils)).length) try {
        const ctxjvs = ctx.js
        ,     ctxprj = ctx.project;

        let jsrfdr  = fsInfo(opts.jsrFolder || ctxjvs.jsrFolder)
        ,   srcfdr  = (opts.srcFolder || ctxjvs.srcFolder || ctxprj.srcFolder)
        ,   lnt     = (opts.lint || ctxjvs.lint || "Default")
        ,   cmpout  = (opts.compactOutput || ctxjvs.compactOutput ? "--compact" : null)
        ,   somskp  = false
        ,   topfdr  = srcfils[0].parent;

        srcfils = arrayNoFalsey(srcfils.map((fil) => {
            if(fsInfo(fil+".no-validate").exists) {                                                                     // check file itself
                somskp = true;
                return null;
                }
            for(let fdr = fsInfo(fil.parent),lmt=100; fdr!=null && fdr.path!==ctx.prjFolder.path && (lmt-=1)>0; fdr = fsInfo(fdr.parent)) {
                if(fsInfo(fdr,".no-validate").exists || fsInfo(fdr.parent,fdr.name+".no-validate").exists) {
                    somskp = true;
                    return null;
                    }
                }
            return resolveFsi(fil,srcfdr);
            }));
        switch(String(lnt).toLowerCase()) {
            case "none"   : { lnt = fsInfo(ctx.build.cfgFolder,"LintRules-None.json");   } break;
            case "lax"    : { lnt = fsInfo(ctx.build.cfgFolder,"LintRules-Lax.json");    } break;
            case "normal" : { lnt = fsInfo(ctx.build.cfgFolder,"LintRules-Normal.json"); } break;
            case "strict" : { lnt = fsInfo(ctx.build.cfgFolder,"LintRules-Strict.json"); } break;
            case "all"    : { lnt = fsInfo(ctx.build.cfgFolder,"LintRules-All.json");    } break;
            default       : { lnt = fsInfo(lnt);                                         } break;
            }

        if(!srcfils.length) {
            log(`Validate JavaScript (Deno ${Deno.version.deno})`);
            log(`.  All files in ${subpath(topfdr,srcfdr)} marked '.no-validate'.`);
            }
        else {
            if(!opts.noLog) { log(objString(`Validate JavaScript (Deno ${Deno.version.deno}${somskp ? "; some folders/files marked '.no-validate'" : ""}): `,subpathObject(srcfils,srcfdr))); }
            return await runCmd(jsrfdr + "deno",[
                "lint",
                cmpout,
                "--quiet",
                "--config", lnt,
                ...srcfils,
                ],opts.cwd,"DenoLint","JavaScript validation failed",opts.logCommand,opts.returnOutput,opts.discardOutput);
            }
        }
    catch(err) {
        err = UbtError.wrap(err);
        opts && err.optional.detail.push(objString("Command Options: ",opts));
        throw err;
        }
    }

/// ## Sync Build Functions

// *********************************************************************************************************************
// FILEYSTEM UTILITY
// *********************************************************************************************************************

/// Specify, or remove, a sequence of prerequisite functions to be executed before a build action.
///
/// ------------------- | ----------------------------------------------------------------------------------------------
/// bldfnc              | The build function for which to get or set the prerequisite function list.
/// prqfncs             | The list of functions, null to delete, or omit to get the current list.
/// =>                  | The current sequence if getting, or a reference to this API if setting.
///
/// Prequisite functions are executed before the specified build function and allow other build actions or functions to
/// always be executed before any specific build action. This can allow, for example, all files to be recompiled before
/// packaging them into a JAR file. Note that *any* function exported from the build script can be set as a prereq.
exported(buildSequence);
function buildSequence(bldfnc,prqfncs) {
    if(typeof(bldfnc)!=="function") {
        throw new UbtError("[BadArg]","buildSequence arg 1 must be a function");
        }
    else if(prqfncs===undefined) {
        return (pipeline[bldfnc.name] || [bldfnc]);
        }
    else {
        pipeline[bldfnc.name] = (prqfncs || []).concat(bldfnc);
        return EXPORTED;
        }
    }

/// Copy one or more build artifacts to the folders listed in file `!UbtBuild.target-folder`. Each line in the file is
/// is either: (a) a comment starting with `#`, `*`, or `//*/`; (b) a source group enclosed in square brackets, e.g.
/// `bin/`; or (c) a target folder template; or (d) A temporary target folder template starting with an empty-comment
/// marker, `/**/`.
///
/// ------------------- | ----------------------------------------------------------------------------------------------
/// srcfdr              | The folder from which to copy, and to use in source group matching.
/// glb                 | The filename glob pattern to match. **NB: This pattern will be deleted from each target!**
/// ctx                 | The build context, against which substitutions in the target folders are resolved.
/// opts                | Copy options.
/// . noLog             | Whether to suppress progress messages. Default: `false`.
/// . targetList        | Specifies the target list file or the folder containing it. Defaults to `<ctx.prjFolder>/!UbtBuild.target-folder`.
/// . targetClear       | Indicates that the target folder should first be cleared. Defaults to `true`, as this is usually what is needed.
/// =>                  | The current sequence if getting, or a reference to this API if setting.
///
/// Groups are matched to a source path with ends with the group name.
///
/// Template substitutions are represented by `{{}}some.name}}` and reference values in the supplied context. Custom
/// values can be easily added using the spread syntax `{ ...ctx, custom: "X" }`.
///
/// This is purely a convenience for developers; if a target folder it missing it is reported, but does not fail the
/// build as different developers may or may not have particular targets on their system.
///
/// Example Build Script:
///
///     ubt.heading2("Copy Artifacts to Other Projects");
///     ubt.copyArtifacts(khufdr+"bin/","**"                    ,{ ...ctx });
///     ubt.copyArtifacts(khufdr+"nls/","**/RolePlay?(-??).json",{ ...ctx });
///
/// Example Target Folder File:
///
///     [bin/]
///         {{}}cdeFolder}}rlp400v3/src/web/rlpdr/bin/
///     ##  {{}}cdeFolder}}skdme/src/web/staff
///     ##  {{}}cdeFolder}}v360/website/rlpdr/bin/
///
///     [nls/]
///         {{}}cdeFolder}}rlp400v3/src/cfg/nls/
///     ##  {{}}cdeFolder}}skdme/src/cfg/nls/
///     ##  {{}}cdeFolder}}v360/config/nls/
exported(copyArtifacts);
function copyArtifacts(srcfdr,glb,ctx,opts={}) {
    srcfdr = fsInfo(srcfdr);
    let cpylst  = (opts.targetList ? fsInfo(opts.targetList) : fsInfo(ctx.prjFolder))
    ,   tottgt  = 0
    ,   totfdr  = 0
    ,   totfil  = 0
    ,   tgtfdrs = [];

    cpylst.isFolder && (cpylst = fsInfo(cpylst,"!UbtBuild.target-folder"));

    if(!opts.noLog) { log(`Copy artifacts in ${subpath(srcfdr,ctx.prjFolder)}${glb} to targets in ${subpath(cpylst,ctx.prjFolder)}:`); }

    readFileText(cpylst)
    . split(/[\n]/)
    . reduce((add,lin) => {
        lin = lin.trim();
        lin.startsWith("/**/") && (lin = lin.slice(4).trim());
        if(lin && !lin.startsWith("//*/") &&  !lin.match(/^(#|\*)/)) {                                                  // not a comment line (allowing for our special //*/ commenting of /**/
            if(lin.startsWith("[") && lin.endsWith("]")) {                                                              // source path group
                lin = lin.slice(1,-1).trim();
                if(srcfdr.path.endsWith(lin)) { add = true;  tgtfdrs.length=0; }                                        // correct to reset tgtfdrs
                else                          { add = false;                   }
                }
            else if(add) {
                lin = lin.replaceAll("\\","/");
                lin = resolveTemplate(lin,ctx);
                if(!lin.endsWith("/")) {
                    lin += "/";
                    }
                tgtfdrs.push(fsInfo(lin));
                }
            }
        return add;
        },DFT_TRUE);

    if(tgtfdrs.length==0) {
        if(!opts.noLog) { log(`. No targets specified for source folder, or all such targets commented out. (Folder=${srcfdr})`); }
        return;
        }

    for(let tgtfdr of tgtfdrs) {
        log(`. Target: ${tgtfdr}`);
        if(!tgtfdr.path.startsWith(ctx.apxFolder)) {
            throw new UbtError("InvalidTarget",`Copy target not within development root folder: ${tgtfdr}`);
            }
        else if(!tgtfdr.exists) {
            log(`. . SKIP missing target: ${tgtfdr}`);
            }
        else try {
            if(opts.targetClear) {
                log(`. . Delete ${tgtfdr}${glb}`);
                deleteFiles(findFiles(tgtfdr,glb));
                }

            let srcfils = findFiles(srcfdr,glb);
            for(let srcfil of srcfils) {
                let subpth = subpath(srcfil,srcfdr);
                log(`. . ${subpth}`);
                let cpyres = copyFiles(srcfil,(tgtfdr + subpth),{ noLog: true });
                totfdr += cpyres.folders;
                totfil += cpyres.files;
                }
            tottgt += 1;
            }
        catch(err) {
            if(err.code!=="NotFound") { throw err; }
            log(`Did not find ${cpylst}`);
            }
        }
    log(`. Copied: Targets=${tottgt}, Folders=${totfdr}, Files=${totfil}.`);
    }

/// Copy one or more files to one or more targets, optionally moving them.
///
/// ------------------- | ----------------------------------------------------------------------------------------------
/// srcs                | The list of files and folders from which to copy.
/// tgts                | The list of files and folders to which to copy.
/// opts {              ||
/// . move              | Whether to move the files instead of copying them. Default: `false`.
/// . recurse           | Whether to recurse into subfolders. Default: `false`.
/// . replace           | Whether to ***entirely*** replace target folders. Default: `false`.
/// . noLog             | Whether to suppress progress messages. Default: `false`.
/// . }                 ||
/// => {                ||
/// . files             | The number of files copied.
/// . folders           | The number of subfolders copied (that is, excluding any folders given in `srcs`).
/// . }                 ||
///
/// If the `move` option is specified, this function attempts to use a file-system move first; if this fails for any
/// reason, the function falls back to doing a copy/delete for all remaining files at the current level and below. This
/// cleanly handles copying between different disks while efficiently renaming and moving files within the same disk.
///
/// When multiple targets are specified, the targets are iterated and the sources are copied to each one in turn. In
/// addition, the move option is not actioned while copying and the source files are removed at the conclusion of all
/// copying instead.
exported(copyFiles);
function copyFiles(srcs,tgts,opts={}) {
    let tot = { files: 0, folders: 0 };

    srcs = fsInfoArray(srcs);
    tgts = fsInfoArray(tgts);

    function copy_move(srcfsis,tgtfsi,rcs,mov,tot) {
        createFolders(tgtfsi.isFolder ? tgtfsi : tgtfsi.parent);
        for(let srcfsi of srcfsis) {
            if(!srcfsi.isFolder) {
                let srcpth = srcfsi.path, tgtpth = tgtfsi.path+(tgtfsi.isFolder ? srcfsi.name : "");
                deleteFiles(tgtpth);
                if(mov) try {
                    Deno.renameSync(srcpth,tgtpth);
                    }
                catch(err) {
                    mov = false;
                    }
                if(!mov) {
                    Deno.copyFileSync(srcpth,tgtpth);
                    }
                tot.files += 1;
                }
            else if(rcs) {
                copy_move(searchFs(srcfsi,"*"),fsInfo(tgtfsi.path,srcfsi.name+"/"),rcs,mov,tot);
                tot.folders += 1;
                }
            }
        }

    for(let tgt of tgts) {
        if(!opts.noLog) { log(wrapText(`${opts.move ? "Move" : "Copy"} ${subpathArray(srcs).join(", ")} => ${subpath(tgt)}`)); }

        if(opts.replace && tgt.exists) {
            deletePath(tgt);
            }
        if(!tgt.isFolder && (srcs.length>1 || srcs[0].isFolder)) {
            throw new UbtError("InvalidTarget","Copy source must be a single file if copy target is not a folder");
            }

        copy_move(srcs,tgt,opts.recurse,(opts.move && tgts.length==1),tot);
        if(opts.move) {
            for(let fsi of srcs) { deletePath(fsi); }
            }
        }
    if(opts.printTotals) {
        log(`. Copied: Folders=${tot.folders}, Files=${tot.files}.`);
        }
    return tot;
    }

/// Create folders, including any needed intermediaries.
///
/// ------------------- | ----------------------------------------------------------------------------------------------
/// fdrs                | The list of folders to create.
/// =>                  | `undefined`
exported(createFolders);
function createFolders(fdrs) {
    for(let fsi of fsInfoArray(fdrs)) {
        fsi = fsInfo(fsi);                                                                                              // refresh stats
        !fsi.exists && Deno.mkdirSync(fsi.path, { recursive: true });
        fsi.exists = true;
        }
    }

/// Delete one or more files.
///
/// ------------------- | ----------------------------------------------------------------------------------------------
/// pths                | The list of files to delete.
/// =>                  | `undefined`
///
/// Files may be specified as either strings or `FsInfo` objects.
exported(deleteFiles);
function deleteFiles(fils) {
    for(let fsi of fsInfoArray(fils)) { deletePath(fsi.path,FILE); }
    }

/// Delete one or more folders, including their contents, recursively.
///
/// ------------------- | ----------------------------------------------------------------------------------------------
/// pths                | The list of folders to delete.
/// =>                  | `undefined`
///
/// Folders may be specified as either strings or `FsInfo` objects.
exported(deleteFolders);
function deleteFolders(fdrs) {
    for(let fsi of fsInfoArray(fdrs)) { deletePath(fsi.path,FOLDER); }
    }

/// Find files matching a {{@glob pattern|!overview#file-system-globs}}.
///
/// ------------------- | ----------------------------------------------------------------------------------------------
/// fdr                 | The folder to search.
/// glb                 | The glob pattern.
/// =>                  | A list of `FsInfo` matching the search pattern.
///
/// Keep in mind that to match files in subfolders the pattern must include a *globstar* path element must be specified.
/// For example, to match all Java source files in the tree rooted at `fdr` use `findFiles(fdr,"**\/*.java")`.
exported(findFiles);
function findFiles(fdr,glb) {
    return searchFs(fdr,glb,FILE);
    }

/// Find folders matching a {{@glob pattern|!overview#file-system-globs}}.
///
/// ------------------- | ----------------------------------------------------------------------------------------------
/// fdr                 | The folder to search.
/// glb                 | The glob pattern.
/// =>                  | A list of `FsInfo` matching the search pattern.
///
/// Keep in mind that to match files in subfolders the pattern must include a *globstar* path element must be specified.
/// For example, to match all Java source files in the tree rooted at `fdr` use `findFiles(fdr,"**\/*.java")`.
exported(findFolders);
function findFolders(fdr,glb) {
    return searchFs(fdr,glb,FOLDER);
    }

/// Create (or update) an `FsInfo` object for the specified path, optionally with additional subpath segments.
///
/// ------------------- | ----------------------------------------------------------------------------------------------
/// pth                 | The principle path. If already an FsInfo it's state values will be updated.
/// subs                | Zero or more segments to join with the path.
/// =>                  | An `FsInfo` representing the assembled path.
///
/// The `FsInfo` object is just a convenient description of a path utilized by the build system with properties that are
/// useful for file manipulation. The path separator is always a slash, regardless of OS.
///
/// If `pth` is `null` or `undefined` *and* no subpaths are specified, the orignal argument is returned. If `pth` is
/// already an `FsInfo` *and* no subpaths are specified, the original argument is returned after refreshing the object's
/// status. To explicitly create a new object pass `FsInfo.path` to this function.
///
/// Folders are always described with a trailing `/` so that concatenation with subpath elements is straight forward.
/// This also removes any ambiguity of intent with paths that do not (yet) exist and of appearance when viewed.
///
/// Any subpath elements supplied are joined with the path with one, and only one separator in between, regardless of
/// existing separator characters at the start/end of any given string. That is, `fsInfo("/a/","/b","c/","/d")` creates
/// an object representing `"/a/b/c/d"`. Blank, null, or undefined subpath arguments are ignored.
exported(fsInfo);
function fsInfo(pth,...subs) {
    if(pth===undefined) {
        throw new UbtError("BadArg","Path for fsInfo cannot be undefined");
        }
    if(!pth && subs.length!=0) {
        throw new UbtError("BadArg","Path for fsInfo cannot be null when the subpaths argument is provided");
        }
    if(!pth && subs.length==0) {
        return null;
        }
    if(isType(pth,FsInfo) && subs.length==0) {
        return Object.assign(pth, fsState(pth.path,pth.isFolder));
        }

    let fdr = false
    ,   inf;

    if(subs.length>0) {
        if(isType(pth,FsInfo) && !pth.isFolder) { pth = pth.parent; }
        pth = joinPath("/",pth,...subs);                                                                                // join removes leading/trailing seps from all args
        }

    pth = String(pth);
    if(pth.endsWith("/") || pth.endsWith(stdPath.SEP)) {
        fdr = true;
        }
    pth = stdPath.normalize(stdPath.resolve(pth)).replaceAll("\\","/");

    let ios = pth.lastIndexOf("/");
    let nam = pth.slice(ios+1);
    let iod = nam.lastIndexOf(".");

    inf          = new FsInfo(fsState(pth,fdr));
    inf.name     = nam;
    inf.nameBase = (iod > 0 ? nam.slice(0, iod) : nam);
    inf.nameExt  = (iod > 0 ? nam.slice(iod)    : "" );
    inf.path     = (pth + (!pth.endsWith("/") && inf.isFolder ? "/" :""));
    inf.parent   = (nam.length!=0 ? pth.slice(0,ios+1) : null);
    inf.toString = ()=>(inf.path);
    return inf;                                                                                                         // not return {...}; must be type FsInfo
    }

function fsState(pth,fdr) {
    try {
        let { isDirectory, isFile, isSymlink, size, mtime } = Deno.statSync(pth);
        return { exists: true, isFolder: isDirectory, isFile, isSymlink, size, modified: dateTimeZ(mtime) };
        }
    catch(err) {
        if(!isType(err,Deno.errors.NotFound)) {
            throw err;
            }
        return { exists: false, isFolder: fdr, isFile: !fdr, isSymlink: false, size: 0, modified: dateTimeZ(new Date(0)) };
        }
    }


/// Resolve the JDK folder for a specific JDK version based on the context settings, allowing different projects to
/// target different JDK versions.
///
/// ------------------- | ----------------------------------------------------------------------------------------------
/// ver                 | Required JDK version. NB: Support is implemented for padding 1 digit to 2, and 2 digits to three.
/// =>                  | `FsInfo` for the JDK.
///
/// Generally, a non-standard JDK version is only needed for running specific tools. At present that includes some tools
/// that use libraries depending on old pre-JDK-11 APIs that have been disallowed.
exported(resolveJdkFolder);
function resolveJdkFolder(ver) {
    ver = ""+ver;
    if(!ver.match(/^\d+$/)) {
        throw new UbtError("BadArg","JDK version must be a whole number, e.g. 8, 11, 17, 21");
        }

    let tptctx = {...ctx,ver}
    ,   fdr = fsInfo(resolveTemplate(ctx.java.jdkFolderTpt,tptctx))
    ,   orgver = ver
    ,   orgfdr = fdr;

    if(ver.length==1 && !fdr.exists) {                                                                                  // allow, e.g., JDK 8 to be in folder JDK-08
        ver = "0" + ver;
        fdr = fsInfo(resolveTemplate(ctx.java.jdkFolderTpt,tptctx));
        }
    if(!fdr.exists && ver.length==2) {                                                                                  // allow, e.g., JDK 8 to be in folder JDK-008
        ver = "0" + ver;
        fdr = fsInfo(resolveTemplate(ctx.java.jdkFolderTpt,tptctx));
        }
    if(!fdr.exists) {
        throw new UbtError("JdkNotFound",`JDK folder for version ${orgver} does not exist (resolved against ${ctx.java.jdkFolderTpt} with up to 2 leading zeros)`);
        }

    return fdr;
    }

/// Read bytes from a file.
///
/// ------------------- | ----------------------------------------------------------------------------------------------
/// pth                 | Either a string path, `FsInfo` path, or URL.
/// =>                  | {{@Uint8Array|https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array.html}} array of the file contents.
exported(readFileData);
function readFileData(pth) {
    pth = fsInfo(pth);
    try        { return Deno.readFileSync(pth.path); }
    catch(err) { throw UbtError.wrap(err);           }
    }

/// Read text from a UTF-8 encoded file.
///
/// ------------------- | ----------------------------------------------------------------------------------------------
/// pth                 | Either a string path, `FsInfo` path, or URL.
/// =>                  | String of the file contents.
exported(readFileText);
function readFileText(pth) {
    pth = fsInfo(pth);
    try        { return Deno.readTextFileSync(pth.path); }
    catch(err) { throw UbtError.wrap(err);               }
    }

/// Write bytes to a file.
///
/// ------------------- | ----------------------------------------------------------------------------------------------
/// pth                 | Either a string path, `FsInfo` path, or URL.
/// dta                 | The data to write, as a {{@Uint8Array|https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array.html}}.
/// opts {              ||
/// . append            | If true, append instead of overwriting.
/// . create            | If true, create the file if needed.
/// . createNew         | If true, do *not* overwrite an existing file.
/// . mode              | Unix permissions applied to file, whether new or existing.
/// . }                 ||
/// =>                  | `undefined`.
exported(writeFileData);
function writeFileData(pth,dta) {
    pth = fsInfo(pth);
    try        { Deno.writeFileSync(pth.path,dta); pth.exists = true; }
    catch(err) { throw UbtError.wrap(err);                            }
    }

/// Write text to a UTF-8 encoded file.
///
/// ------------------- | ----------------------------------------------------------------------------------------------
/// pth                 | Either a string path, `FsInfo` path, or URL.
/// txt                 | File contents.
/// opts {              ||
/// . append            | If true, append instead of overwriting.
/// . create            | If true, create the file if needed.
/// . createNew         | If true, do *not* overwrite an existing file.
/// . mode              | Unix permissions applied to file, whether new or existing.
/// . }                 ||
/// =>                  | `undefined`.
exported(writeFileText);
function writeFileText(pth,txt,opts) {
    pth = fsInfo(pth);
    try        { Deno.writeTextFileSync(pth.path,txt,opts); pth.exists = true; }
    catch(err) { throw UbtError.wrap(err);                                     }
    }

// *********************************************************************************************************************
// PUBLIC UTILITY FUNCTIONS
// *********************************************************************************************************************

/// ## Sync Utility Functions

/// Alert use to something which must be done before proceeding. Arguments are passed to the engine `alert` function.
/// This utility handles blank-line logging properly.
exported(alert);
function alert(...args) {
    allowBlankLine = true;
    return globalThis.alert(...args);
    }

/// Confirm an action, returning true or false. Arguments are passed to the engine `confirm` function.
/// This utility handles blank-line logging properly.
exported(confirm);
function confirm(...args) {
    allowBlankLine = true;
    return globalThis.confirm(...args);
    }

/// Format a date to local time to human-readable ISO8601 string.
///
/// ------------------- | ----------------------------------------------------------------------------------------------
/// dat                 | A date object. Default: Current date/time.
/// =>                  | Formatted date.
exported(dateTime);
function dateTime(dat) {
    return (dat ?? new Date()).toLocaleString("sv");
    }

/// Format a date to a UTC (Zulu time) ISO8601 string.
///
/// ------------------- | ----------------------------------------------------------------------------------------------
/// dat                 | A date object. Default: Current date/time.
/// =>                  | Formatted date.
exported(dateTimeZ);
function dateTimeZ(dat) {
    return (dat ?? new Date()).toISOString();
    }

/// Deeply resolve a compound property within the supplied object.
///
/// ------------------- | ----------------------------------------------------------------------------------------------
/// obj                 | Object from which a value is to be extracted.
/// key                 | Property key, e.g. `"a.b.c"`.
/// dft                 | Value to use if property cannot be located.
/// =>                  | The property value.
///
/// This is useful for easily extracting configured values from a nested object where all you have is the string name.
/// In code it is more succinct, and performant to just use `let val = obj.a.b.c;`.
///
/// Example:
///
///     let val = ubt.deepProp(obj,"a.b.c");                // => value or undefined
///     let val = ubt.deepProp(obj,"a.b.c","Default");      // => value or "Default"
exported(deepProp);
function deepProp(obj,key,dft) {
    return (key && key.split(".").reduce((tgt,prp)=>(tgt?.[prp]),obj)) ?? dft;
    }

/// UbtError constructor
///
/// Refer to {{@UbtError}} for details.
exported(Error);
function Error(...args) {
    return new UbtError(...args);
    }

/// Emit a level-1 heading.
///
/// ------------------- | ----------------------------------------------------------------------------------------------
/// txt                 | The heading text.
/// =>                  | `undefined`.
exported(heading1);
function heading1(txt) {
    log();
    log(txt);
    log("=".repeat(CONSOLE_WRAP));
    log();
    }

/// Emit a level two heading.
///
/// ------------------- | ----------------------------------------------------------------------------------------------
/// txt                 | The heading text.
/// =>                  | `undefined`.
exported(heading2);
function heading2(txt) {
    log();
    log(txt);
    log("-".repeat(CONSOLE_WRAP));
    log();
    }

/// Emit a level-3 heading.
///
/// ------------------- | ----------------------------------------------------------------------------------------------
/// txt                 | The heading text.
/// =>                  | `undefined`.
exported(heading3);
function heading3(txt) {
    log();
    log(txt);
    log("~".repeat(txt.length));
    log();
    }

/// Log console output with special handling to prevent multiple blank lines. Blank lines can be forced by explicitly
/// specifying `"\n"` in an argument.
exported(log);
function log(...args) {
    if((args.length===0 && allowBlankLine) || (args.length==1 && args[0]==="")) {
        console.log();
        allowBlankLine = false;
        }
    else for(let arg of args) {
        for(let seg of String(arg).split("\n")) {
            console.log(seg);
            }
        allowBlankLine = true;
        }
    }

/// Convert an object (including an array) into a readble, multiline, reasonbly compact JSON-like string.
///
/// ------------------- | ----------------------------------------------------------------------------------------------
/// lbl                 | Label for the output.
/// obj_arr             | Either an object or array to convert to a string.
/// =>                  | `undefined`.
///
/// Use for emitting build data of interest to the programmer doing the build. The format is a hard-wrapped humane
/// JSON.
exported(objString);
function objString(lbl,obj_arr) {
    if(obj_arr==null) {
        return lbl.replace(/:? *$/,"");
        }
    else {
        let lins = [];
        objDump(obj_arr,lins,lbl,"",!INDENT);
        return lins.join("\n");
        }
    }

/// Prompt for a value, returning that value. Arguments are passed to the engine `prompt` function.
/// This utility handles blank-line logging properly.
exported(prompt);
function prompt(...args) {
    allowBlankLine = true;
    return globalThis.prompt(...args);
    }

/// Resolve a string template against values in a context object.
///
/// Template substitutions are represented by `{{}}some.name}}`, reference values in the supplied context, and may be
/// dotted nested names. Custom values can be easily added using the spread syntax, e.g. `{ ...ctx, custom: "X" }`. To
/// assist with debugging, substitutions which cannot be resolved remain in the string as `{{}}some.name}}`.
///
/// ------------------- | ----------------------------------------------------------------------------------------------
/// tpt                 | Template string.
/// ctx                 | UBT context object.
/// fbk                 | Fallback value for missing values. Default: The substitution text.
/// =>                  | The resolved string.
///
/// Example:
///
///     ubt.resolveTemplate("{{}}prjFolder}}x/{{}}special}}/z",{ ...ctx, special: "y" }); // => /path/to/project/x/y/z
exported(resolveTemplate);
function resolveTemplate(tpt,ctx,fbk) {
    return tpt.replace(/[{][{][^{}]*[}][}]/g, (mat) => deepProp(ctx,mat.slice(2,-2),fbk ?? mat));
    }

/// Create a ULID (Unique Lexographically-sortable ID).
///
/// Usefule for generating temporary filenames, and similar.
///
/// ------------------- | ----------------------------------------------------------------------------------------------
/// =>                  | The generated UlID.
///
/// Example:
///
///     ubt.ulid();     // => "01KTW2735GEQH18JWYXA9NSNDY"
exported(ulid);
function ulid() {
    let ts  = Date.now();
    let out = "";
    for (let xa = 9; xa >= 0; xa -= 1) { out  = ULID_B32[ts & 31] + out; ts = Math.floor(ts / 32); }
    for (let xa = 0; xa < 16; xa += 1) { out += ULID_B32[Math.floor(Math.random() * 32)];          }
    return out;
    }

/// Create a V4 UUID.
///
/// ------------------- | ----------------------------------------------------------------------------------------------
/// b64                 | If true, return a base64-encoded string. Otherwise, return a hyphen-separated hex string.
/// =>                  | The generated UUID.
///
/// Example:
///
///     ubt.uuidV4();      // => "3f2504e0-4f89-11d3-9a0c-0305e82c3301"
///     ubt.uuidV4(true);  // => "q1fPz-9T0u2sX8vQe7n5A"
exported(uuidV4);
function uuidV4(b64) {
    let bytes = crypto.getRandomValues(new Uint8Array(16));

    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    if (b64) {
        return btoa(String.fromCharCode(...bytes)).replaceAll("+","-").replaceAll("/","_").replaceAll("=","");
        }
    else {
        let hex = Array.from(bytes, (byt) => byt.toString(16).padStart(2, '0')).join('');
        return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
        }
    }

/// Wrap a text string to fit within the standard console width (currently 120 columns).
///
/// ------------------- | ----------------------------------------------------------------------------------------------
/// txt                 | Text to wrap.
/// =>                  | The wrapped text.
///
/// Example:
///
///     ubt.log(ubt.wrapText(aLongString));
exported(wrapText);
function wrapText(txt) {
    let pfx = ""
    ,   wrp = "";

    txt = txt.replaceAll("\\n"," ");
    while(txt) {
        let seg = txt.slice(0,(CONSOLE_WRAP - pfx.length));
        wrp!=="" && (wrp += "\n" + pfx);
        wrp += seg;
        txt = txt.slice(seg.length);
        pfx = ">> ";
        }
    return wrp;
    }

// *********************************************************************************************************************
// PRIVATE UTILITY
// *********************************************************************************************************************

function arrayNoFalsey(mbearr) {
    return (!mbearr ? [] : !Array.isArray(mbearr) ? [mbearr] : mbearr).filter((elm) => (!!elm));
    }

function classpathDedupe(clspth) {
    return [...new Set(clspth.split(";"))].join(";");
    }

function classpathResolve(roofdr,clspth) {
    if(!roofdr || !clspth) {
        return "";
        }
    else {
        return clspth.split(";").filter((pth) => (!!pth.trim())).map((pth) => {
            let fsi, sfx;
            if(pth.endsWith("*")) {                                                                                     // allow trailing *
                fsi = resolveFsi(pth.slice(0,-1),roofdr);
                sfx = "*";
                }
            else {
                fsi = resolveFsi(pth,roofdr);
                sfx = "";
                }
            return (fsi.exists ? (fsi + sfx) : null);
            }).join(PATH_DELIM);
        }
    }

function compareNbrStr(v1,v2) {
    let n1 = Number(v1), nan1 = isNaN(n1)
    ,   n2 = Number(v2), nan2 = isNaN(n2);

    return ( nan1 !== nan2 ? (nan1 ? -1  : 1)
        :    nan1          ? (v1=String(v1).toLowerCase(), v2=String(v2).toLowerCase(), (v1==v2 ? 0 : v1<v2 ? -1 : 1))
        :                    (n1==n2 ? 0 : n1<n2 ? -1 : 1)
        );
    }

//async function delay(ms) {
//    await new Promise((res) => setTimeout(res,ms));
//    }

function deletePath(pth, fdr) {
    try {
        pth = fsInfo(pth);
        fdr = (fdr==null ? pth.isFolder : fdr);
        if(pth.exists && pth.isFolder===fdr) {
            Deno.removeSync(pth.path,{ recursive: fdr });
            pth.exists = false;
            }
        }
    catch(err) {
        if(!isType(err,Deno.errors.NotFound)) { throw err; }
        }
    }

function ensureArr(arg) {
    return (isType(arg,Array) ? arg : [arg]);
    }

function fsInfoArray(mbearr) {
    return arrayNoFalsey(mbearr).map((elm) => resolveFsi(elm,ctx.folder));
    }

//function isExt(fsi,ext) {
//    return (fsi.nameExt===ext);
//    }

function isType(val,typ) {
    switch(typeof(val)) {
        case "boolean"  : { return typ===Boolean;   }
        case "bigint"   : { return typ===BigInt;    }
        case "function" : { return typ===Function;  }
        case "number"   : { return typ===Number;    }
        case "string"   : { return typ===String;    }
        case "symbol"   : { return typ===Symbol;    }
        case "undefined": { return typ===undefined; }
        default: {
            return ((Array.isArray(val) && typ===Array)
                ||  (val instanceof typ)
                ||  (typ===Object)
                );
            }
        }
    }

function join(sep,...vals) {
    let tgt = "";
    sep  ??= "";
    vals ??= [];
    for(let val of vals) {
        if(isType(val,Array)) {
            val = join(sep,...val);
            }
        val = String(val || "").trim();
        if(sep) {
            while(tgt.endsWith  (sep)) { tgt = tgt.slice(0,-1); }
            while(val.startsWith(sep)) { val = val.slice(1);    }
            }
        if(val) {
            if(sep && tgt.length>0) { tgt += sep; }
            tgt += val;
            }
        }
    return tgt;
    }

function joinPath(sep,...vals) {
    return (String(vals[0]).startsWith(sep) ? sep : "") + join(sep,vals);
    }

function objDump(obj_arr,lins,curlin,ind) {
    let arr = Array.isArray(obj_arr)
    ,   bkt = (arr ? "[]" : "{}")
    ,   fir = true;

    function append(...txts) {
        for(let txt of txts) {
            txt = String(txt);
            if(txt==="\n") {
                if(curlin) { lins.push(curlin); curlin = ""; }
                }
            else if(txt.trim()) {
                if(!curlin) { curlin = ind; }
                curlin += txt;
                while(curlin.length>CONSOLE_WRAP) { lins.push(curlin.slice(0,CONSOLE_WRAP)); curlin = ind + curlin.slice(CONSOLE_WRAP); }
                }
            }
        }

    function valueOf(val) {
        if(!isType(val,Array) && !isType(val,Object)) {
            if     (isType(val,Function)) { val = (val.name||"anon")+"()"; }
            else if(isType(val,String  )) { val = '"' + val + '"';         }
            else                          { val = String(val);             }
            }
        return val;
        }

    if((arr && obj_arr.length===0) || (!arr && Object.keys(obj_arr).length===0)) {
        append(bkt,"\n");
        }
    else {
        let keys = new Set(Object.keys(obj_arr)
                         .filter((key) => (valueOf(obj_arr[key])!=null))
                         .sort(compareNbrStr));

        append(bkt[0],"\n");
        if(ind.length<80) { ind += "    "; }
        for(let key of [...keys]) {
            let val = valueOf(obj_arr[key]);
            if(!isType(val,Object)) {
                fir = false;
                append((curlin && !fir ? ", " : ""),(!arr ? (key + ": ") : ""),val);
                keys.delete(key);
                }
            }
        for(let key of [...keys]) {
            let val = valueOf(obj_arr[key]);
            if(isType(val,FsInfo)) {
                fir = false;
                append("\n",(!arr ? (key + ": ") : ""));
                curlin = objDump(val,lins,curlin,ind);
                keys.delete(key);
                }
            }
        for(let key of [...keys]) {
            let val = valueOf(obj_arr[key]);
            if(isType(val,Object)) {
                fir = false;
                append("\n",(!arr ? (key + ": ") : ""));
                curlin = objDump(val,lins,curlin,ind);
                keys.delete(key);
                }
            }
        append("\n",bkt[1],"\n");
        }
    return "";
    }

function resolveFsi(pth,bas) {
    if(!pth || isType(pth,FsInfo)) {
        return pth;
        }
    if(bas?.path) { bas = bas.path; }
    return (fsInfo(stdPath.isAbsolute(pth) ? pth : joinPath("/",bas,pth)));
    }

async function runCmd(pgm,args,cwd,errpfx,errmsg,logcmd,rtnoup,dscoup) {
    cwd = fsInfo(cwd || ctx.prjFolder).path;                                                                            // allow string, FsInfo, or null argument

    args = arrayNoFalsey(args).map((elm) => String(elm));
    if(logcmd) {
        log(wrapText("Command Line: " + pgm + ' "' + args.map((arg)=>(arg.toString())).join("\" \"") + '"'));
        log(wrapText("Current Dir : " + cwd));
        }
    try {
        let cmd,prc;
        if     (rtnoup) { cmd = new Deno.Command(pgm, { args, cwd, stdout: "piped", stderr: "piped" }); }
        else if(dscoup) { cmd = new Deno.Command(pgm, { args, cwd, stdout: "piped"                  }); }
        else            { cmd = new Deno.Command(pgm, { args, cwd                                   }); }
        prc = cmd.spawn();
        let [ sts, out ] = await Promise.all([ prc.status, prc.output() ]);
        if(!sts.success) {
            throw new UbtError(`${errpfx||"DenoRun"}${sts.code}`,errmsg, { noTrace: !logcmd });
            }
        if(rtnoup) {
            let dec = new TextDecoder();
            return join("\n",[dec.decode(out.stdout), dec.decode(out.stderr)]);
            }
        else if(!dscoup) {
            allowBlankLine = true;                                                                                      // assuming at lease some command output
            }
        }
    catch(err) {
        throw UbtError.wrap(err,{
            detail: [
                "Command Line: " + pgm + ' "' + args.map((arg)=>(arg.toString())).join("\" \"") + '"',
                "Current Dir: " + cwd
                ]
            });
        }
    }

function searchFs(pth,glb,incdir) {
    let pthglb  = joinPath("/",pth,glb)
    ,   apx     = (stdPath.isAbsolute(pthglb) ? "" : ctx.prjFolder.path)
    ,   pths    = [];

    for(let fse of stdFs.expandGlobSync(pthglb,{ root: apx, includeDirs: true, extended: true, globstar: true, caseInsensitive: true })) {
        if(incdir===undefined || incdir===fse.isDirectory) { pths.push(fse.path); }
        }
    return fsInfoArray(pths);
    }

function subpath(pth,fdr) {
    pth = String(pth);
    fdr = fsInfo(fdr || ctx.prjFolder || ctx.apxFolder);
    return (pth.startsWith(fdr?.path)          ? pth.slice(fdr.path.length          )
        :   pth.startsWith(ctx.prjFolder.path) ? pth.slice(ctx.prjFolder.path.length)
        :   pth.startsWith(ctx.apxFolder.path) ? pth.slice(ctx.apxFolder.path.length)
        :                                        pth);
    }

function subpathArray(mbearr,fdr) {
    return fsInfoArray(mbearr).map((fsi) => subpath(fsi,fdr));
    }

function subpathObject(mbearr) {
    return subpathArray(mbearr).reduce((tgt,pth) => {
        let [fdr = "", fil = ""] = pth.split(/([^/]+$)/);
        (tgt[fdr] ??= []).push(fil);
        return tgt;
        },{});
    }

// *********************************************************************************************************************
// TYPED OBJECTS
// *********************************************************************************************************************

function FsInfo(prps) { Object.assign(this,prps); }

// *********************************************************************************************************************
init();
return EXPORTED;
}
