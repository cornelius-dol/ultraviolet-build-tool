NLS Assistant
------------------------------------------------------------------------------------------------------------------------

Usage: `java -jar NlsAssistant.jar {action} [{option} | {input-path}]...`

The action must be on the command line as the first non-option argument:

    PREVIEW                           Preview results of a CONVERT action without changing any source files.
    CONVERT                           Convert existing resources to wrap text with translation substitutions.
    EXTRACT                           Extract translations to an NLS configuration file namespace fragment.
    COMBINE                           Combine namespace fragments into final NLS configuration file.
    UPDATE                            Update existing translations to contain only those keys found in the base set.

The PREVIEW and CONVERT actions are largely once-off, designed for initial conversion of an existing project.

The EXTRACT and COMBINE actions are expected to run as part of a script to deploy translations. Generally each section
of the file tree is scanned and translations extracted to temporary files for that namespace. Then the resulting files
are combined into the base translation file. Note that the COMBINE action removes the files which are combined unless
told not to.

The UPDATE action performs a smart update of translation sets which have already undergone translation. It *overwrites*
the input files. The input files are written to a temporary file first and then renamed using the original filename so
that the existing file never ends up in a partially written state. Furthermore, if an empty input file is found, it will
be deleted, and a warning output.

Output files are formatted to maintain a reasonable standard of layout for easier human consumption and verification.

If any error is encountered, the program will exit with error code 2.

###### Options

Options are permitted anywhere on the command line after the executable JAR file:

    -help                               Print this help and exit.
    -help.changelog                     Print the changelog and exit.

    -src.include:{filter}[,...]         Source file include filters. Default: `*.html,*.java,*.js,*.mcf`.
    -src.exclude:{filter}[,...]         Source file exclude filters specifications. Default: none.

    -tgt:{filename}                     Target filename for output. Default: `*CONSOLE`. Not used by UPDATE.
    -backup:{folder}                    Backup root folder. Used only by CONVERT action.
    -deleteSource:true|false            Delete source files. Used only by COMBINE action. Default: `!diag && !debug`.

    -title                              Translation set title. Defaults to blank.
    -displayname                        Translation set display name. Defaults to `title`.
    -namespace                          Translation set namespace.
    -extract:xxx[,...]                  Translations to extract. Values: `fnc`, `sbs`, `pth`. Default: `fnc,sbs`.
    -extract.data.path:{path}[,...]     Path list for extracting data values which are translated.
    -base                               Translation update base.
    -locale                             Translation locales as a comma separated list. Default: `en`.

Command line parameters and options can be provided in a file by specifying the filename with a leading `@`.

Note that if `pth` is specified for `extract` it is assumed paths will be used for all files which support them. You
cannot extract from some such files with paths, and other with substitutions in the same pass.

###### Input Paths

Each input-path may be a directory or single file. If the path ends with "/+" it is processed recursively, breadth
first sorted in codepoint order.

All input files are protected from being processed more than once. Input files in each directory are sorted by their
name before being processed and if the name begins with digits and a dash these are stripped off for the documentation
file.

Files found by searching (as opposed to directly specified as input sources) are only processed if they are not filtered
out. Filters are only applied to files, not folders.


###### Backups

Backups are designed to preserve the original file across multiple runs of this command. If a backup location is
specified an ISO 8601 date/time stamped folder is created in that folder and then a subfolder corresponding to the input
argument. All modified files are first copied to that location using the relative file path from their input file root
as specified on the command line.

###### Filters

Filters use a simple wildcarding concept where `*` = zero+ of anything; `?` = one of anything, `_`=one+ of whitespace or
underscore.

Filters are not applied to folders or files specified explicitly as an input path.

If the filter includes a slash it is matched against the path, otherwise it is matched only against the base
file name. A double asterisk `**` indicates to match across path segments.

The path used for matching filters is the subpath under the source root specified on the command line, normalized with
slash separators. So `**/doc/**` will match every file within any folder named doc while `doc/**` will match every file
within any folder named doc immediately subordinate to an input path.

###### JSON Paths

Paths are hierarchical names in a nested structure, very like file systems. They are used to identify JSON values for
translation. This provides precise, and concise, extraction of values from JSON configuration.

Note that it is necessary for the entity which uses the configuration to subject the value to translation, using the
configured value as the translation key.

For example, RolePlayDR config uses: `-extract.data.path:/role/name,/role/group/name,/task/name`.
