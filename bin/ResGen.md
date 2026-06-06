Resource Generator
------------------------------------------------------------------------------------------------------------------------

Generic resource generator for JavaScript and CSS.

Usage: `java -jar ResGen.jar [{option} | {input-path}]...`

Options are permitted anywhere on the command line after the executable JAR file:

    -help                               Print this help and exit.
    -help.changelog                     Print the changelog and exit.

    -src.include:{filter}[,...]         Source file include filters (default *.css,*.js).
    -src.exclude:{filter}[,...]         Source file exclude filters specifications (defaults to none).

    -tgt:{filename}                     Target filename (default Script.js).

    -minimize                           Whether to apply minimization filter (default true).
    -collapseSpaces                     Whether to collapse spaces within lines (default true).
    -collapseLines                      Whether and how to collapse lines (default "Indented").

    -banner                             Banner template for the target file (default "").
    -header                             Header template for each input file (default "\n/* $FileName$ */\n").
    -footer                             Footer template for each input file (default "").

Command line parameters and options can be provided in a file by specifying the filename with a leading `@`.

Line collapse may be specified as any of: "true", "false", "None", "Blank", "Safe", "Indented", or "All". The value true
is mapped to "Indented" and false is mapped to "None". This is primarily for consistency with the HTTP server. The
"Indented" mode will collapse lines if the line is indented *or* it is considered always safe according to the file's
syntax. This means that indented lines should conformed to whatever requirements there are for being joined to the next
line when this mode is used.

Leading and trailing whitespace is always removed when minimizing.

###### Input Paths

Each input-path may be a directory or single file. If the path ends with "/+" it is processed recursively, breadth
first sorted in codepoint order.

All input files are protected from being processed more than once. Input files in each directory are sorted by their
name before being processed and if the name begins with digits and a dash these are stripped off for the documentation
file.

Using a combination of input-path arguments, a considered filename convention and sequencing digits provide a flexible
means of controlling the index sequence without needing to specify every document individually.

When minimizing lead/trailing whitespace is always removed.

Files found by searching (as opposed to directly specified as input sources) are only processed if they are not filtered
out. Filters are only applied to files, not folders.

###### Filters

Filters use a simple wildcarding concept where `*` = zero+ anything; `?` = one of anything, `_`=one+ whitespace or
underscore. If the filter includes a slash it is matched against the path, otherwise it is matched only against the base
file name. A double asterisk `**` indicates to match across path segments, so `**/doc/**` will match every file within
any folder named doc.

The path used for matching filters is the subpath under the source root specified on the command line, normalized with
slash separators.

Filters are not applied to folders or files specified explicitly as an input path.

###### String Templates

Several options specify ECMA encoded string templates.

These options can specify the following substitutions.

    Name                Description
    ------------------- ------------------------------------------------------------------------------------------------
    FilePath            The input file subpath from the input source root specified on the command line.
    FileName            The input file base name.
    FileNumber          The relative file number in the input file list.
