// ---------------------------------------------------------------------------------------------------------------------
// Build Script: See documentation for Ultraviolet Build Tool (UBT).
// ---------------------------------------------------------------------------------------------------------------------

"use strict";

let     log

// *********************************************************************************************************************
// SETUP AND TEARDOWN
// *********************************************************************************************************************

export function setup(ctx,ubt) {
    log = ubt.log;

    ctx.build.dumpOnError = false;
    ctx.docFolder = ubt.fsInfo(ctx.prjFolder,"doc/");

    ubt.buildSequence(packagePrimary  ,[ buildProject ]);
    ubt.buildSequence(packageFinal    ,[ buildProject, packagePrimary, packageSecondary ]);

    ubt.createFolders(ctx.project.wrkFolder);
    }

export function teardown(ctx,ubt) {
    ubt.deleteFolders(ctx.project.wrkFolder);
    //*/log();
    //*/log(ubt.objString("Build Context: ",ctx)); log();
    }

// *********************************************************************************************************************
// BUILD ACTIONS
// *********************************************************************************************************************

export async function buildFile(ctx,ubt) {
    if(ctx.file.nameExt===".java") {
        await ubt.compileJava(ctx.file);
        await ubt.runJavaTests(ctx.file);
        }
    if(ctx.file.nameExt===".js") {
        await ubt.validateJs(ctx.file);
        await ubt.runJsTests(ctx.file);
        }
    }

export async function buildFolder(ctx,ubt) {
    await ubt.deleteFiles(ubt.findFiles(ctx.folder,"*.class"   ));
    await ubt.compileJava(ubt.findFiles(ctx.folder,"!(Z)*.java"));
    await ubt.validateJs (ubt.findFiles(ctx.folder,"!(Z)*.js"  ));
    if(ctx.action==="folder") {
        await ubt.runJavaTests(ubt.findFiles(ctx.folder,"!(Z)*.java"));
        await ubt.runJsTests  (ubt.findFiles(ctx.folder,"!(Z)*.js"  ));
        }
    }

export async function buildProject(ctx,ubt) {
    if(ctx.action==="packageFinal") {
        ubt.heading2("Update Version & Build");
        await ubt.runJava(`${ctx.build.binFolder}SourceBuild.jar`, [
            "VERSION",
            `${ctx.project.srcFolder}Version.txt`,
            `${ctx.project.srcFolder}...`,
            ], { noLog: true });
        }

    ubt.heading2("Build and validate all files");
    await ubt.validateJs (ubt.findFiles(ctx.srcFolder,"**/!(Z)*.js"  ));
    }

export async function packagePrimary(ctx,ubt) {
    }

export async function packageSecondary(ctx,ubt) {
    let ver = await ubt.runJava(`${ctx.build.binFolder}SourceBuild.jar`, [
        "DISPLAY",
        `${ctx.project.srcFolder}Version.txt`,
        `$VERSION$`,
        ], { noLog: true, returnOutput: true });

    ubt.heading3("Generate JavaScript Doc");
    await ubt.generateDoc(`${ctx.project.wrkFolder}Documentation.zip`,[
        `${ctx.prjFolder}README.md`,
        `${ctx.prjFolder}LICENSE.md`,
        `${ctx.prjFolder}src/ubt/+`,
        `${ctx.prjFolder}src/bdd/+`,
        `${ctx.prjFolder}src/utl/+`,
        ],{
        idxLevel    : 3,
        title       : "Ultraviolet Build Tool",
        version     : `${ver}`,
        srcExclude  : "$*,*Help.*,LintRules*.json,Version.js,Z*,cfg/*,bin/closure,bin/proguard",
        tgtVerify   : `${ctx.docFolder}`,
        });
    }

export async function packageFinal(_ctx,_ubt) {
    // Recompile and execute both packaging steps
    log("Packaging completed. Merge branch to `release`.");
    }

// *********************************************************************************************************************
