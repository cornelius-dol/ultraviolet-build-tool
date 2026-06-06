Source Build
------------------------------------------------------------------------------------------------------------------------

A source update build utility, largely still useful to update the version and/or build stamp for a project.

Usage:

    java -jar SourceBuild.jar BUILD   <update dir/file> [<secondary dir/file>...]
    java -jar SourceBuild.jar VERSION <update dir/file> [<secondary dir/file>...]
    java -jar SourceBuild.jar DISPLAY <file> [<output-template>]

Use `BUILD` to update build strings in a directory or file

  - If the directory or file ends with "+" then the entire tree is processed

Use `VERSION` to update version and build strings in directory or file

  - If the directory or file ends with "+" then the entire tree is processed

Use `DISPLAY` to display the version and/or build using the supplied template

  - Useful for extracting the version/build into an environment variable
  - Default template: $VERSION$-$BUILD$

Template Substitution Values

    $VERSION$           Extracted version.
    $BUILD$             Extracted build.
    $DATE$              Date on which program is run.
    $DATESTAMP$         Date/Time stamp on which program is run.
    $TIME$              Time at which program is run.
    $TIMESTAMP$         Timestamp at which program is run.

###### Options

    -individual         Each file is only updated if it, specifically, has changed (for JavaScript, etc). Note that with
                        this option, secondary folders/files will be ignored.
