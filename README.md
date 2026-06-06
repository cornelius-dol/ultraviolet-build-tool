Ultaviolet Build Tool (UBT)
========================================================================================================================

A JavaScript package to provide cross-platfom build support. A complete, self-contained, extensible project to support
building any project using any tools. It includes an optional BDD test harness for JavaScript.

Current support:

  - Java
  - JavaScript
  - Packaging
  - Translation Extraction
  - Documentation
  - Testing (JavaScript only)

Overview of UBT
------------------------------------------------------------------------------------------------------------------------

Currently written for *Deno* the package is designed to shield developers from Deno's specifics in order to preserve the
possibility of migrating to other JS Runtimes. The reasons that Deno was chosen is primarily for it's smart built-in
package caching, and for the community general eschewing of "nano" packages consisting of single and/or trivial
functions.

The system is executed by running the `UbtEngine` with the *Deno* JavaScript Runtime. The engine takes two arguments:

  1. The build action, and
  2. Either a file or folder on which the build action should operate.

The engine then sets up the build context with information about the file system and tools, invokes setup functions,
then the build action function, then teardown functions. By means of a sequence set up in the the script's setup
function dependency build functions can be invoked first.

The only prerequisite information needed to launch the tool is the location of the build tool folder itself and at least
one file named `!UbtEnv.js` at the apex of the programming folder. The tool is normally launched from an editor that
automatically plugs in the name of a file or folder. Each action can take a file name from which the relevant folder
will be derived; some actions can take a folder, whether that's a source folder or the project folder.

For example, a command line might look like (noting that all filenames should be specified with '/' separators):

    deno run --allow-all ~/dev/build/ubt/UbtEngine.js buildFile --file ~/dev/v360/java/src/com/venue360/admin/GetAllCountries.java
    deno run --allow-all ~/dev/build/ubt/UbtEngine.js buildFolder --folder ~/dev/v360/java/src/com/venue360/admin/

The design intent of the system is to automatically discover the root of the development tree by searching up from the
folder provided as an argument looking for scripts named `!UbtBuild.js` and `UbtEnv.js`. The first `!UbtBuild.js` marks
the folder of the project and is executed to accomplish the build. The topmost `!UbtEnv.js` marks the "apex" of the
development tree and all `!UbtEnv.js` scripts discovered are executed in top-down order for setup and bottom-up order
for teardown.

The goal for build scripts is to be as isolated as reasonable from any specifics of *Deno*. This isolation is important
to protect developers from Deno lock-in; however, individual builds may leverage Deno directly providing detail,
including working code, is communicated to the team maintaining UBT. The programmer should bear in mind that any
dependency on `Deno` becomes the project's responsibility should a JS Runtime platform change be made.

Implementation Details
------------------------------------------------------------------------------------------------------------------------

The apex environment script (and there may be multiple others) need not actually contain anything; it's purpose is
twofold: first to mark the apex folder and second to optionally perform any global setup and teardown actions, including
overriding any specific properties of the programming context. It may provide a `setup()` and/or `teardown()`. What they
do is up to the individual programmer, but care must be taken that it does nothing that another programmer
necessarily needs to build any particular project.

Other, intermediate, `!UbtEnv.js` scripts may be used at any level, though there is little point in having one in a
project folder, as anything it does can (and should) be done by the `!UbtBuild.js` script. Anything done in the project
is most likely needed for all developers (there might conceivably be something unique the the developer, and then the
project or global git settings would have to exclude `!UbtEnv.js` scripts).

Default File System Structure
------------------------------------------------------------------------------------------------------------------------

The engine makes numerous default assumptions about the structure of the programming tree, but all of these can be
overridden by one or more `UbtEnv.js` scripts in the tree structure above the project being acted upon. This defaults
are a reasonable default for programmers which has proven itself without locking any given programmer to any specific
structure.

Default Folder        | Context Property        | Purpose
--------------------- | ----------------------- | -----------------------------------------------------------------------------------------------------------------------------------
`<something>`         | `apxFolder`             | The top-level for all development folders (location of topmost `!UbtEnv.js`).
`. build`             | `bldFolder`             | Build tools (can check out the build project from Git).
`. . bdd`             | `build.bddFolder`       | Support for JavaScript Behavior Driven Development tests.
`. . bin`             | `build.binFolder`       | Platform-independent build tools (usually Java).
`. . cfg`             | `build.cfgFolder`       | Build configuration files (linting, obfuscation, etc).
`. . lib`             | `build.libFolder`       | Build library packages.
`. . ubt`             | `build.ubtFolder`       | Universal Build Tool.
`. code`              | `cdeFolder`             | Folder for all projects.
`. . (project)`       | `prjFolder`             | Project being built, determined by presence of `~UbtBuild.js`.
`. . . bin`           | `project.binFolder`     | Project binary executables.
`. . . bld`           | `project.bldFolder`     | Project build artifacts to be committed.
`. . . lib`           | `project.libFolder`     | Project library packages.
`. . . src`           | `project.srcFolder`     | Project source files.
`. . . tgt`           | `project.tgtFolder`     | Project targets (for classes, native modules, etc).
`. . . zbuild`        | `project.wrkFolder`     | Work folder created and destroyed by build engine.
`. doc`               | `docFolder`             | Developer's documentation.
`. sdk`               | `sdkFolder`             | Software Development Kits and runtimes.
`. . deno`            | `js.jsrFolder`          | Deno JavaScript runtime.
`. . git`             | `git.gitFolder`         | Git folder.
`. . jdk-n`           | `java.jdkFolder`        | JDK folder(s), where *n* is the major version.
`. . jre`             | `java.jreFolder`        | Default folder for running tools.
`. . maven`           | `maven.mvnFolder`       | Maven home folder.
`. test`              | `tstFolder`             | Developer's test installations (*not* unit tests).
`. . (project)`       | `project.tstFolder`     | Developer's test installation for this project.
`w:/asdbld/archive`   | `arcFolder`             | Contains archives for versioned projects. (Deprecated for removal.)

**A Note About JDKs** : Newer JDK compilers are capable of targeting many prior Java versions. Projects may either use
the specific JDK for the target version, or use a later JDK version with the `--release nn` option. The most important
consideration is to consistently use the same JDK for any given project as different compilers may produce different
class bytecode. Unless otherwise necessary, projects should target LTS versions, JDK 8, 11, 17, 21, etc.

Build Action Functions
------------------------------------------------------------------------------------------------------------------------

A build script exports the following standardized, asynchronous functions, referred to as "Build Actions". These are
passed the build context and the `UbtApi` module which provides functions to support builds.

Action Function             | Purpose
--------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------
`buildFile(ctx,ubt)`        | Builds the specified file.
`buildFolder(ctx,ubt)`      | Builds all files which need building in the specified folder.
`buildProject(ctx,ubt)`     | Builds all files in the entire project.
`packagePrimary(ctx,ubt)`   | Packages any binaries as needed, such as building JARs or linking executables.
`packageSecondary(ctx,ubt)` | Packages any additional resources, builds documentation, etc.
`packageFinal(ctx,ubt)`     | Packages everything for the project and produces production/deployment artifacts.

Scripts are loaded as ES Modules and all build actions are asynchronous which is necessary for almost all system
interactions which could potentially block. This is largely an implementation side-effect and can be ignored using
`await` where required, coding the build script functionally and procedurally. It is not envisaged that any builds will
benefit sufficiently from parallel processing to be worth the added complication.

FsInfo - File System Information
------------------------------------------------------------------------------------------------------------------------

The `FsInfo` structure is an abstracted view over a file system entry which provides filesystem properties with a
specific path and useful subparts of the path. The path represents a folder if it exists *and* is a folder, or if it was
specified with a trailing '/'. `FsInfo` objects always use forward slash separators, even on Windows.

All build functions allow a path to be provided as either a string or an `FsInfo`. Many build functions, such as
`findFiles`, return `FsInfo` objects.


Property                | Description
----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------
*Pathname Related*     ||
`name`                  | Node name -- the "leaf" node.
`nameBase`              | Node name's base without the extension.
`nameExt`               | Node name's extenstion.
`parent`                | Parent path.
`path`                  | Full path.
*State of Node When `FsInfo` Was Created or Refreshed* ||
`exists`                | Whether the path exists
`isFile`                | Whether the path represents a file.
`isFolder`              | Whether the path represents a folder.
`isSymlink`             | Whether the path is a symlink.
`modified`              | The modification date/timestamp in ISO8601 format.
`size`                  | The size of the node, as a number.

Note that the file-system properties are accurate at the time the object is created and are not dynamically updated,
except when an `FsInfo` is used to create or delete a folder, where the exists flag is updated to match.

File System Globs
------------------------------------------------------------------------------------------------------------------------

Files are specified using Bash [extended glob syntax](https://www.linuxjournal.com/content/bash-extended-globbing).

Pattern                 | Description
----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------
`*`                     | Match zero or more characters.
`?`                     | Match exactly one character.
`?*`                    | Match one or more characters.
`[...]`                 | Match exactly one of a range of characters, using the same notation as a regex class.
`@(pattern-list)`       | Matches one occurrence of the given patterns.
`?(pattern-list)`       | Matches zero or one occurrence of the given patterns.
`*(pattern-list)`       | Matches zero or more occurrences of the given patterns.
`+(pattern-list)`       | Matches one or more occurrences of the given patterns.
`!(pattern-list)`       | Matches anything *except* one of the given patterns.

Patterns in a pattern list are separated by a vertical line character (e.g `@(*.class|*.exe)`).

Build Context Example
------------------------------------------------------------------------------------------------------------------------

The following dump shows an example context from a developer system, as of 2025-10-14. Note that all paths for folders
end with a `/`.

NB: All folders which are not at the root of the context are derived from from root folders by the engine *after*
environment script setup functions have run and before the build script setup runs. The are set by the engine only if
the specific folder is not already set. This allows environment scripts to override a root folder and have that
automatically take effect for all folders derived from it.

````
Build Context: {
    action: "buildFile"
    apxFolder: {
        exists: true, isFile: false, isFolder: true, isSymlink: false, modified: "2025-10-10T20:13:24.204Z", name: "pgmr
        ", nameBase: "pgmr", nameExt: "", parent: "D:/", path: "D:/pgmr/", size: 0, toString: anon()
        }
    arcFolder: {
        exists: true, isFile: false, isFolder: true, isSymlink: false, modified: "2025-09-20T01:03:37.285Z", name: "arch
        ive", nameBase: "archive", nameExt: "", parent: "D:/pgmr/", path: "D:/pgmr/archive/", size: 0, toString: anon()
        }
    bldFolder: {
        exists: true, isFile: false, isFolder: true, isSymlink: false, modified: "2025-10-15T00:59:22.305Z", name: "buil
        d", nameBase: "build", nameExt: "", parent: "D:/pgmr/", path: "D:/pgmr/build/", size: 0, toString: anon()
        }
    cdeFolder: {
        exists: true, isFile: false, isFolder: true, isSymlink: false, modified: "2025-09-22T22:28:52.337Z", name: "code
        ", nameBase: "code", nameExt: "", parent: "D:/pgmr/", path: "D:/pgmr/code/", size: 0, toString: anon()
        }
    docFolder: {
        exists: true, isFile: false, isFolder: true, isSymlink: false, modified: "2025-06-09T23:37:55.722Z", name: "doc"
        , nameBase: "doc", nameExt: "", parent: "D:/pgmr/", path: "D:/pgmr/doc/", size: 0, toString: anon()
        }
    file: {
        exists: true, isFile: true, isFolder: false, isSymlink: false, modified: "2025-10-15T01:00:07.885Z", name: "UbtA
        pi.js", nameBase: "UbtApi", nameExt: ".js", parent: "D:/pgmr/build/src/ubt/", path: "D:/pgmr/build/src/ubt/UbtAp
        i.js", size: 86442, toString: anon()
        }
    folder: {
        exists: true, isFile: false, isFolder: true, isSymlink: false, modified: "2025-10-14T00:20:59.765Z", name: "ubt"
        , nameBase: "ubt", nameExt: "", parent: "D:/pgmr/build/src/", path: "D:/pgmr/build/src/ubt/", size: 0, toString:
         anon()
        }
    prjFolder: {
        exists: true, isFile: false, isFolder: true, isSymlink: false, modified: "2025-10-15T01:00:12.159Z", name: "buil
        d", nameBase: "build", nameExt: "", parent: "D:/pgmr/", path: "D:/pgmr/build/", size: 0, toString: anon()
        }
    sdkFolder: {
        exists: true, isFile: false, isFolder: true, isSymlink: false, modified: "2025-10-10T23:08:24.618Z", name: "sdk"
        , nameBase: "sdk", nameExt: "", parent: "D:/pgmr/", path: "D:/pgmr/sdk/", size: 0, toString: anon()
        }
    tstFolder: {
        exists: true, isFile: false, isFolder: true, isSymlink: false, modified: "2025-10-09T20:51:47.001Z", name: "test
        ", nameBase: "test", nameExt: "", parent: "D:/pgmr/", path: "D:/pgmr/test/", size: 0, toString: anon()
        }
    build: {
        dumpOnError: true, noTruncate: false
        bddFolder: {
            exists: true, isFile: false, isFolder: true, isSymlink: false, modified: "2025-08-12T20:23:47.509Z", name: "
            bdd", nameBase: "bdd", nameExt: "", parent: "D:/pgmr/build/", path: "D:/pgmr/build/bdd/", size: 0, toString:
             anon()
            }
        binFolder: {
            exists: true, isFile: false, isFolder: true, isSymlink: false, modified: "2025-10-14T00:20:59.705Z", name: "
            bin", nameBase: "bin", nameExt: "", parent: "D:/pgmr/build/", path: "D:/pgmr/build/bin/", size: 0, toString:
             anon()
            }
        cfgFolder: {
            exists: true, isFile: false, isFolder: true, isSymlink: false, modified: "2025-07-25T03:06:30.697Z", name: "
            cfg", nameBase: "cfg", nameExt: "", parent: "D:/pgmr/build/", path: "D:/pgmr/build/cfg/", size: 0, toString:
             anon()
            }
        libFolder: {
            exists: true, isFile: false, isFolder: true, isSymlink: false, modified: "2025-10-14T00:11:56.475Z", name: "
            lib", nameBase: "lib", nameExt: "", parent: "D:/pgmr/build/", path: "D:/pgmr/build/lib/", size: 0, toString:
             anon()
            }
        ubtFolder: {
            exists: true, isFile: false, isFolder: true, isSymlink: false, modified: "2025-10-14T00:20:59.765Z", name: "
            ubt", nameBase: "ubt", nameExt: "", parent: "D:/pgmr/build/", path: "D:/pgmr/build/ubt/", size: 0, toString:
             anon()
            }
        }
    git: {
        gitFolder: {
            exists: true, isFile: false, isFolder: true, isSymlink: false, modified: "2025-09-30T18:41:24.683Z", name: "
            git", nameBase: "git", nameExt: "", parent: "D:/pgmr/sdk/", path: "D:/pgmr/sdk/git/", size: 0, toString: ano
            n()
            }
        }
    java: {
        classpath: "", jdkFolderTpt: "{{}}sdkFolder.path}}jdk-{{}}ver}}/", lint: "Normal", maxErrors: 10
        jdkFolder: {
            exists: true, isFile: false, isFolder: true, isSymlink: false, modified: "2025-06-11T00:57:20.697Z", name: "
            jdk-15", nameBase: "jdk-15", nameExt: "", parent: "D:/pgmr/sdk/", path: "D:/pgmr/sdk/jdk-15/", size: 0, toSt
            ring: anon()
            }
        jreFolder: {
            exists: true, isFile: false, isFolder: true, isSymlink: false, modified: "2025-06-11T00:26:50.037Z", name: "
            jdk-21", nameBase: "jdk-21", nameExt: "", parent: "D:/pgmr/sdk/", path: "D:/pgmr/sdk/jdk-21/", size: 0, toSt
            ring: anon()
            }
        jdkArgs: []
        jreArgs: []
        }
    js: {
        compactOutput: true, lint: "Normal"
        jsrFolder: {
            exists: true, isFile: false, isFolder: true, isSymlink: false, modified: "2025-10-10T23:50:41.755Z", name: "
            deno", nameBase: "deno", nameExt: "", parent: "D:/pgmr/sdk/", path: "D:/pgmr/sdk/deno/", size: 0, toString:
            anon()
            }
        }
    maven: {
        jreFolder: {
            exists: true, isFile: false, isFolder: true, isSymlink: false, modified: "2025-06-11T00:26:38.577Z", name: "
            jdk-17", nameBase: "jdk-17", nameExt: "", parent: "D:/pgmr/sdk/", path: "D:/pgmr/sdk/jdk-17/", size: 0, toSt
            ring: anon()
            }
        mvnFolder: {
            exists: true, isFile: false, isFolder: true, isSymlink: false, modified: "2025-07-13T01:30:34.000Z", name: "
            maven", nameBase: "maven", nameExt: "", parent: "D:/pgmr/sdk/", path: "D:/pgmr/sdk/maven/", size: 0, toStrin
            g: anon()
            }
        }
    project: {
        binFolder: {
            exists: true, isFile: false, isFolder: true, isSymlink: false, modified: "2025-10-14T00:20:59.705Z", name: "
            bin", nameBase: "bin", nameExt: "", parent: "D:/pgmr/build/", path: "D:/pgmr/build/bin/", size: 0, toString:
             anon()
            }
        bldFolder: {
            exists: false, isFile: false, isFolder: true, isSymlink: false, modified: "1970-01-01T00:00:00.000Z", name:
            "bld", nameBase: "bld", nameExt: "", parent: "D:/pgmr/build/", path: "D:/pgmr/build/bld/", size: 0, toString
            : anon()
            }
        libFolder: {
            exists: true, isFile: false, isFolder: true, isSymlink: false, modified: "2025-10-14T00:11:56.475Z", name: "
            lib", nameBase: "lib", nameExt: "", parent: "D:/pgmr/build/", path: "D:/pgmr/build/lib/", size: 0, toString:
             anon()
            }
        srcFolder: {
            exists: true, isFile: false, isFolder: true, isSymlink: false, modified: "2025-10-14T00:20:59.720Z", name: "
            src", nameBase: "src", nameExt: "", parent: "D:/pgmr/build/", path: "D:/pgmr/build/src/", size: 0, toString:
             anon()
            }
        tgtFolder: {
            exists: true, isFile: false, isFolder: true, isSymlink: false, modified: "2025-10-14T00:20:59.720Z", name: "
            src", nameBase: "src", nameExt: "", parent: "D:/pgmr/build/", path: "D:/pgmr/build/src/", size: 0, toString:
             anon()
            }
        tstFolder: {
            exists: false, isFile: true, isFolder: false, isSymlink: false, modified: "1970-01-01T00:00:00.000Z", name:
            "build", nameBase: "build", nameExt: "", parent: "D:/pgmr/test/", path: "D:/pgmr/test/build", size: 0, toStr
            ing: anon()
            }
        wrkFolder: {
            exists: true, isFile: false, isFolder: true, isSymlink: false, modified: "1970-01-01T00:00:00.000Z", name: "
            zbuild", nameBase: "zbuild", nameExt: "", parent: "D:/pgmr/build/", path: "D:/pgmr/build/zbuild/", size: 0,
            toString: anon()
            }
        }
    }
````

Developer Setup
------------------------------------------------------------------------------------------------------------------------

###### Instructions

Set up for a developer is typically straight-forward:

  1. Create the environment script named `UbtEnv.js` in the root programming folder ({{#template
     below|Environment-Script}}).
  2. For a brand-new set up, create the folder structure recommended below in your programming folder.
  3. For an existing set up that you want to retain, use the environment script `setup()` function to customize the
     context folders. If necessary, create other `UbtEnv.js` scripts in subfolders to adapt folders for those trees.
  4. Check out this build-tool repository into the build subfolder of your root programming folder.
  5. Download the <a href="https://github.com/denoland/deno/releases" target="_blank">latest version of Deno</a> to your
     sdk/deno folder. Deno is a single binary executable with no external dependencies and works on Linux, OSX, and
     Windows.
  6. Set up your editor's tools with the build command lines, or write O/S scripts to serve this purpose.

NB: The `build` project has two symlinks in the root to enable the project folder to be used for both building projects
and developing the build tools themselves. You may need to manually create these links depending on git config:

  - bdd => ./src/bdd
  - ubt => ./src/ubt

###### Build Tool Command Lines

These command lines assume that the environment variable `PROGRAMMING` has been set to the root of your programming tree
and show the syntax for the Windows command shell; for powershell use `$Env:PROGRAMMING` instead of `%PROGRAMMING%` and
for BASh use `$PROGRAMMING`.

````
~/dev/sdk/deno/deno run --no-npm --allow-all ~/dev/build/ubt/UbtEngine.js buildFile --file ${file}
~/dev/sdk/deno/deno run --no-npm --allow-all ~/dev/build/ubt/UbtEngine.js buildFolder --folder ${fileDirname}
~/dev/sdk/deno/deno run --no-npm --allow-all ~/dev/build/ubt/UbtEngine.js buildProject --folder ${workspaceFolder}
~/dev/sdk/deno/deno run --no-npm --allow-all ~/dev/build/ubt/UbtEngine.js packagePrimary --folder ${workspaceFolder}
~/dev/sdk/deno/deno run --no-npm --allow-all ~/dev/build/ubt/UbtEngine.js packageFinal --folder ${workspaceFolder}
````

###### Minimal Programming Folder Structure

````
build
code
  (folders for each project)
doc
sdk
  deno
  jdk-8
  jdk-11
  jdk-15
test
  (folders for test installations)
````

###### Templates

**Environment Script**

````
// UBT Environment Setup
"use strict"

// *********************************************************************************************************************
// SETUP AND TEARDOWN
// *********************************************************************************************************************

export async function setup(ctx,ubt) {
    }

export async function teardown(ctx,ubt) {
    }

// *********************************************************************************************************************
````

**Build Script**

An example build script follows which compiles Java sources and validates JS sources, and runs tests for both kinds of
files. No packaging is needed or done.

````
// ---------------------------------------------------------------------------------------------------------------------
// Build Script: See documentation for Ultraviolet Build Tool (UBT).
// ---------------------------------------------------------------------------------------------------------------------

"use strict";

let     log;

// *********************************************************************************************************************
// SETUP AND TEARDOWN
// *********************************************************************************************************************

export function setup(ctx,ubt) {
    log = ubt.log;
    ctx.build.dumpOnError = true;

    ubt.buildSequence(packagePrimary  ,[ buildProject ]);
    ubt.buildSequence(packageFinal    ,[ buildProject, packagePrimary, packageSecondary ]);

    ubt.createFolders(ctx.project.wrkFolder);
    }

export function teardown(ctx,ubt) {
    ubt.deleteFolders(ctx.project.wrkFolder);
    }

// *********************************************************************************************************************
// BUILD ACTIONS
// *********************************************************************************************************************

export async function buildFile(ctx,ubt) {
    if(ctx.file.nameExt===".java") {
        await ubt.compileJava(ctx.file);
        await ubt.runJavaTests(ctx.file);
        }
    if(ctx.file.nameExt===".js"  ) {
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
    log(`Delete ${ctx.prjFolder}**/*.class`);
    ubt.deleteFiles(ubt.findFiles(ctx.srcFolder,"*.class"));
    log("    - Done");
    await ubt.compileJava(ubt.findFiles(ctx.srcFolder,"**/!(Z)*.java"));
    await ubt.validateJs (ubt.findFiles(ctx.srcFolder,"**/!(Z)*.js"  ));
    }

export async function packagePrimary(ctx,ubt) {
    }

export async function packageSecondary(ctx,ubt) {
    }

export async function packageFinal(_ctx,_ubt) {
    }

// *********************************************************************************************************************
````

**Examples**

###### VSCode User Tasks (Complete)

The following VSCode configuration will set up all UBT compiles. Use `CTRL+SHIFT+P`, "Tasks: Open User Tasks".

Note that these tasks are merely conventions; any development team can execute whatever functions they want and
associate them with whatever hot-keys they want. But these are recommended as a minimal set so that all developers who
interact will have the same build options across all projects.

````
{
// See https://go.microsoft.com/fwlink/?LinkId=733558 for the documentation about the tasks.json format
"version": "2.0.0",

"presentation": {
    "clear"                 : true,
    "echo"                  : true,
    "focus"                 : true,
    "panel"                 : "shared",
    "reveal"                : "always",
    "showReuseMessage"      : false,
    },

"options": {
    "cwd"                   : "${workspaceFolder}" },

"tasks": [{
    // =================================================================================================================
    "label"                 : "Build File",
    "type"                  : "shell",
    "linux"                 : { "command": "${env:PROGRAMMING}/sdk/deno/deno" },
    "windows"               : { "command": "${env:PROGRAMMING}\\sdk\\deno\\deno" },
    "args"                  : [ "run","--no-npm","--allow-all","${env:PROGRAMMING}/build/ubt/UbtEngine.js","buildFile","--file","${file}" ],
    "options"               : { "cwd": "${fileDirname}" },
    "group"                 : { "kind": "build", "isDefault": true },
    "presentation"          : { "group": "build" },
    },{
    "label"                 : "Build Folder",
    "type"                  : "shell",
    "linux"                 : { "command": "${env:PROGRAMMING}/sdk/deno/deno" },
    "windows"               : { "command": "${env:PROGRAMMING}\\sdk\\deno\\deno" },
    "args"                  : [ "run","--no-npm","--allow-all","${env:PROGRAMMING}/build/ubt/UbtEngine.js","buildFolder","--folder","${fileDirname}" ],
    "options"               : { "cwd": "${fileDirname}" },
    "presentation"          : { "group": "build" },
    },{
    "label"                 : "Build Project",
    "type"                  : "shell",
    "linux"                 : { "command": "${env:PROGRAMMING}/sdk/deno/deno" },
    "windows"               : { "command": "${env:PROGRAMMING}\\sdk\\deno\\deno" },
    "args"                  : [ "run","--no-npm","--allow-all","${env:PROGRAMMING}/build/ubt/UbtEngine.js","buildProject","--folder","${fileDirname}" ],
    "options"               : { "cwd": "${fileDirname}" },
    "presentation"          : { "group": "build" },
    // =================================================================================================================
    },{
    // =================================================================================================================
    "label"                 : "Package Binaries",
    "type"                  : "shell",
    "linux"                 : { "command": "${env:PROGRAMMING}/sdk/deno/deno" },
    "windows"               : { "command": "${env:PROGRAMMING}\\sdk\\deno\\deno" },
    "args"                  : [ "run","--no-npm","--allow-all","${env:PROGRAMMING}/build/ubt/UbtEngine.js","packagePrimary","--folder","${fileDirname}" ],
    "options"               : { "cwd": "${workspaceFolder}" },
    "presentation"          : { "group": "build" },
    },{
    "label"                 : "Package Other",
    "type"                  : "shell",
    "linux"                 : { "command": "${env:PROGRAMMING}/sdk/deno/deno" },
    "windows"               : { "command": "${env:PROGRAMMING}\\sdk\\deno\\deno" },
    "args"                  : [ "run","--no-npm","--allow-all","${env:PROGRAMMING}/build/ubt/UbtEngine.js","packageSecondary","--folder","${fileDirname}" ],
    "options"               : { "cwd": "${workspaceFolder}" },
    "presentation"          : { "group": "build" },
    },{
    "label"                 : "Package Project",
    "type"                  : "shell",
    "linux"                 : { "command": "${env:PROGRAMMING}/sdk/deno/deno" },
    "windows"               : { "command": "${env:PROGRAMMING}\\sdk\\deno\\deno" },
    "args"                  : [ "run","--no-npm","--allow-all","${env:PROGRAMMING}/build/ubt/UbtEngine.js","packageFinal","--folder","${fileDirname}" ],
    "options"               : { "cwd": "${workspaceFolder}" },
    "presentation"          : { "group": "build" },
    // =================================================================================================================
    },{
    // =================================================================================================================
    "label"                 : "Run Variation 1",
    "type"                  : "shell",
    "linux"                 : { "command": "${env:PROGRAMMING}/sdk/deno/deno" },
    "windows"               : { "command": "${env:PROGRAMMING}\\sdk\\deno\\deno" },
    "args"                  : [ "run","--no-npm","--allow-all","${env:PROGRAMMING}/build/ubt/UbtEngine.js","runVariation1","--folder","${fileDirname}" ],
    "options"               : { "cwd": "${workspaceFolder}" },
    "presentation"          : { "group": "run-1" },
    },{
    "label"                 : "Run Variation 2",
    "type"                  : "shell",
    "linux"                 : { "command": "${env:PROGRAMMING}/sdk/deno/deno" },
    "windows"               : { "command": "${env:PROGRAMMING}\\sdk\\deno\\deno" },
    "args"                  : [ "run","--no-npm","--allow-all","${env:PROGRAMMING}/build/ubt/UbtEngine.js","runVariation2","--folder","${fileDirname}" ],
    "options"               : { "cwd": "${workspaceFolder}" },
    "presentation"          : { "group": "run-2" },
    },{
    "label"                 : "Run Variation 3",
    "type"                  : "shell",
    "linux"                 : { "command": "${env:PROGRAMMING}/sdk/deno/deno" },
    "windows"               : { "command": "${env:PROGRAMMING}\\sdk\\deno\\deno" },
    "args"                  : [ "run","--no-npm","--allow-all","${env:PROGRAMMING}/build/ubt/UbtEngine.js","runVariation3","--folder","${fileDirname}" ],
    "options"               : { "cwd": "${workspaceFolder}" },
    "presentation"          : { "group": "run-31" },
    // =================================================================================================================
    }],
}
````

The following config will associate the hot-keys CTRL-1 to CTRL-6 with the build tasks defined above. Use
`CTRL+SHIFT+P`, "Preferences: Open Keyboard Shortcuts (JSON)". Add the following shortcuts to your file.

````
[
    {
        "key": "ctrl+1",
        "command": "workbench.action.tasks.runTask",
        "args": "Build File",
        "when": "editorTextFocus",
    },{
        "key": "ctrl+2",
        "command": "workbench.action.tasks.runTask",
        "args": "Build Folder",
        "when": "editorTextFocus",
    },{
        "key": "ctrl+3",
        "command": "workbench.action.tasks.runTask",
        "args": "Build Project",
    },{
        "key": "ctrl+4",
        "command": "workbench.action.tasks.runTask",
        "args": "Package Binaries",
    },{
        "key": "ctrl+5",
        "command": "workbench.action.tasks.runTask",
        "args": "Package Other",
    },{
        "key": "ctrl+6",
        "command": "workbench.action.tasks.runTask",
        "args": "Package Project",
    }
]
````
