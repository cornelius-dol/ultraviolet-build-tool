// ---------------------------------------------------------------------------------------------------------------------
// Copyright (c) 2025 - current, L.P. Cornelius Dol.
// ---------------------------------------------------------------------------------------------------------------------

/// Rewrite Documentation Comments
/// ====================================================================================================================
///
/// Find and replace all `/** ... */` comments in a folder tree to use `///`, required for markdown in JDK-23's JavaDoc
/// utility, and allowed by our JavaScript documentation generator.

import * as stdFs           from "jsr:@std/fs";
import * as stdPath         from "jsr:@std/path";

export function RewriteJavaDoc()
{"use strict"; const EXPORTED=this,exported=(v,n,o)=>((o||EXPORTED)[n||v.name]=v);
// *********************************************************************************************************************
// STATE
// *********************************************************************************************************************

const   FILE                = false

const   log                 = console.log

function init() {
    }

// *********************************************************************************************************************
// PUBLIC API
// *********************************************************************************************************************

/// Process a set of folders.
exported(processFiles);
function processFiles(...glbs) {
        log(`Processing files for conversion to JDK-23 markdown comments.`);
        for(let glb of glbs) {
            let fildoc = 0;
            log(`. ${glb}`);
            for(let fil of findFiles(glb)) {
                let cmtcnt = processFile(fil);
                if(cmtcnt>0) {
                    log(`. . ${fil.path} – Comments: ${cmtcnt}.`);
                    fildoc++;
                    }
                }
            log(`. . Files Updated: ${fildoc}`);
            }
        }

function processFile(fil) {
    let cmtcnt =0;

    const lins = Deno.readTextFileSync(fil.path).split(/\r?\n\r?/gui);

    for(let xa = 0, len = lins.length; xa<len; xa++) {
        if(lins[xa].trim().startsWith("/**") && !lins[xa].trim().startsWith("/**/")) {
            let str = xa
            ,   idt = lins[xa].slice(0,lins[xa].indexOf('/'));

            cmtcnt += 1;
            for(let end = false; xa<len && !end; xa++) {
                let icc = lins[xa].indexOf("*/");                                                                        // index of comment close

                end = icc!==-1;

                // SPLIT LINE IF CLOSING COMMENT IS NOT AT THE END OF THE LINE
                if(icc!==-1 && lins[xa].slice(icc+2).trim()!=="") {
                    let cmt = idt + lins[xa].slice(0,icc+2)
                    ,   cod = idt + lins[xa].slice(icc+2).trim();
                    lins.splice(xa,1,cmt,cod);                                                                          // replace comment + code line with cmt line then code line
                    len++;
                    }

                let lin = lins[xa];

                // COMMENT STRUCTURE REFORMAT
                (lin===lins[xa]) && (lin = lin.replace(/^\W*[*]\W*$/ui      ,"///" ));                                  // *            => ///
                (lin===lins[xa]) && (lin = lin.replace(/^\W*$/ui            ,"///" ));                                  //              => ///
                (lin===lins[xa]) && (lin = lin.replace(/^\W*[/][*]+\W?/ui   ,"/// "));                                  // /** ...      => /// ...
                (lin===lins[xa]) && (lin = lin.replace(/^\W*[*]\W/ui        ,"/// "));                                  // * ...        => /// ...
                (lin===lins[xa]) && (lin = lin.replace(/^\W*/ui             ,"/// "));                                  // ...          => /// ...
                lin = lin.replace(/ *[*]+[/] *$/,"");                                                                   // remove trailing `*/`
                lin = lin.trim();

                // COMMENT TEXT FIXUPS
                lin = lin.replaceAll("<p>","").replaceAll("</p>","");
                if(lin.toLowerCase().startsWith("/// threading design : [") || lin.toLowerCase().startsWith("/// design type : [")) { // e.g. `* Threading Design : [ ] Single Threaded  [x] Threadsafe  [ ] Immutable  [ ] Isolated`
                    lin = lin
                    .       replaceAll(/[/]{3} [^\[]+/gui,"/// Threading Design: ")
                    .       replaceAll(/\[ \] [^\[]+/gui,"")
                    .       replaceAll(/\[x\] /gui," ")
                    .       replaceAll(/  +/gui," ");
                    }
                lin = lin.replace(/(@throws +[A-Za-z_]+)[/.(]([A-Za-z_]+[)]?)/,"$1 ($2)");

                lins[xa] = idt + lin;                                                                                   // replace line with indented, modified line
                }
            if(lins[str ]==="///") { xa--, len--; lins.splice(str,1); }                                                 // remove orphan line at start
            if(lins[xa-1]==="///") { xa--, len--; lins.splice(xa ,1); }                                                 // remove orphan line at end
            }
        }
    if(cmtcnt>0) {
        Deno.writeTextFileSync(fil.path+"$tmp",lins.join("\n"));
        Deno.removeSync(fil.path);
        Deno.renameSync(fil.path+"$tmp",fil.path);
        }
    return cmtcnt;
    }

// *********************************************************************************************************************
// CALLBACK/EVENT
// *********************************************************************************************************************

// *********************************************************************************************************************
// PRIVATE
// *********************************************************************************************************************

function findFiles(glb) {
    let apx     = (stdPath.isAbsolute(glb) ? "" : Deno.cwd())
    ,   pths    = [];

    for(let fse of stdFs.expandGlobSync(glb,{ root: apx, includeDirs: true, extended: true, globstar: true, caseInsensitive: true, followSymLinks: false })) {
        if(fse.isFile && !fse.isSymlink) {
            fse.path = fse.path.replaceAll("\\","/");
            pths.push(fse);
            }
        }
    return pths;
    }

function join(sep,...vals) {
    let tgt = "";
    sep  ??= "";
    vals ??= [];
    for(let val of vals) {
        if(Array.isArray(val)) {
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

// *********************************************************************************************************************
init();
return EXPORTED;
}
