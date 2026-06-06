Documentation Generator
------------------------------------------------------------------------------------------------------------------------

Generic documentation generation for JavaScript, Text and JSON configuration files, using markdown.

JavaScript and JSON use documentation comments delimited by /** ... */, following the same form as JavaDoc.  Like
JavaDoc, if the comment lines all start with. ` * ` they are stripped.  Leading whitespace indentation in comments is
removed from all lines until at least one line has no whitespace.

JavaScript function names are extracted by detecting, within three non-blank lines, a line of one of the following
formats. Arguments and inline spaces are ignored.

  - `exported.xxx=
  - `function xxx(...)`
  - `xxx:function(...)`

Usage: `java -jar DocGen.jar [{option} | {input-path}]...`

Options are permitted anywhere on the command line after the executable JAR file:

    -help                                 Print this help and exit.
    -help.changelog                       Print the changelog and exit.
    -help.template                        Print the built-in default template(s) and exit.

    -idx.level:{1 - 6}                    Header level to index (default 3).
    -idx.content:{filename}               Source markdown for index content text in each input folder.
    -idx.function                         Index level for functions extracted from code (default 3).

    -ovw.content:{filename}               Source markdown for optional overview content text in each input folder. Inserted
                                          at the beginning of the folder's documentation file.

    -mkd.timeout:{1 - 1,000,000}          Markdown processing timeout in seconds (default 60).

    -all.exclude:{filter}[,...]           All file exclude filters (default *.exe,*.jar,*.log,*.zip,Thumbs.db*,.DS_Store).

    -src.include:{filter}[,...]           Source file include filters (default *.json,*.js,*.md,*.txt).
    -src.exclude:{filter}[,...]           Source file exclude filters specifications (defaults to none).

    -extra.folder:{folder}[,...]          Extra folders to include (default blank).
    -extra.include:{filter}[,...]         Extra file include filters (default *.gif,*.jpg,*.png).
    -extra.exclude:{filter}[,...]         Extra file exclude filters (default blank).

    -sub.{name}:{value}                   Define a global substitution.
    -subFallback                          Define that a global substitution should be used as a fallback for the final
                                          field in a list of substitutions.

    -tab:{1 - 10}                         Tab expansion width (default 4).

    -tgt:{archive}                        Target archive (default Documentation.zip).
    -tgt:index:{basename}                 Target base name for index file (default `index`).
    -tgt:style:{basename}                 Target base name for style file (default `style`).
    -tgt.verify[:{folder}]                Verify target archive, optionally extracting to folder.

    -tpt.style:{file}                     Style template file (default internal styles).
    -tpt.style.add:{file}                 Style additions template file.
    -tpt.body:{file}                      HTML body template file (default is the internal HTML template).
    -tpt.index:{file}                     HTML index template file (default is the internal HTML template).

Command line parameters and options can be provided in a file by specifying the filename with a leading `@`.


###### Input Paths

Each input-path may be a folder or single file. If the path ends with "/+" it is processed recursively, breadth first.

Each processed file processed produces a separate HTML document in the target archive. All input files are protected
from being processed more than once. Input files in each folder are sorted by their name before being processed and if
the name begins with digits and a dash these are stripped off for the documentation file.

Using a combination of input-path arguments, a considered filename convention and sequencing digits provide a flexible
means of controlling the index sequence without needing to specify every document individually.

Text files are processed as a single Markdown file. JSON files are processed for documentation comments. Other files are
ignored.

Files found by searching (as opposed to directly specified as input sources) are only processed if they are not filtered
out. Filters are only applied to input files, not folders or extra files.


###### Extra Folders & Files

The extra folder list specifies folders (using wildcards like filters) which will cause the folder and everything in it
to be unconditionally added to the archive ***without filtering***.

The extra file include/exclude filters are applied to files encountered when searching input paths if they are not
selected as source files.


###### Filters

Filters use a simple wildcarding concept where `*` = zero+ anything; `?` = one of anything, `_`=one+ whitespace or
underscore. If the filter includes a slash it is matched against the path, otherwise it is matched only against the base
file name. A double asterisk `**` indicates to match across path segments, so `**/doc/**` will match every file within a
folder named doc.

The path used for matching filters is the subpath under the source root specified on the command line, normalized with
slash separators.

The all-files filter is applied to all file system paths traversed, while the source file filters and extra file filters
are applied only to files.

Filters are not applied to folders or files specified explicitly as an input path.


###### Output Files

Each output file added to the archive is created from the specified template. The template must have exactly one special
substitution marker named `{{}}$DocGenContent}}`.

The output index uses headings to infer content structure. The default template makes level 1 headings into visual block
separators and then emits each successive heading as plain links indented to their relative level until the next level 1
heading. Control of how many heading levels emit into the index is given with `-idx.level`.

The output content treats headings semantically consistently with the index, but visually using level 1 heading as the
page title and level 2 heading as visual block separators, which reflects the sematic reality that the page as a whole
is logically one level below the index.

Each input path which is a folder may contain an index content file which is emitted into the index whenever that path
becomes current; this provides a mechanism to include section titles and summary information into the index. Be brief
with this data (usually a title will suffice) since the index may be included in a framed document with the index as a
side bar (though that could use CSS to hide all parts of the index text which are not headings).


###### Documentation Markdown

Documentation must be in Markdown format, with HTML tags permitted. The following enhancements to standard Markdown are
supported:

  * Abbreviations like PHP Markdown Extra.
  * Autolinking like GitHub.
  * Definition lists like PHP Markdown Extra.
  * Fenced code blocks (using `````)
  * Smart beautification of `...`, `--`, `---` and quotes.
  * Strike-through using ~~xxxxx~~
  * Tables like MultiMarkdown.

Headings are used to generated hyperlinks for the index page. By default heading level 1 is not displayed in the page
content (controlled by the page template), but is used only to produce sections on the index page. Heading levels 2 and
3 are used for the index page line and heading levels 4 - 6 are reserved for use within the page body.

Note that for a file-level comment in a JSON file the entire file must be wrappered with `{...}` because the comment is
associated with the next object found at the same level as the comment.


###### Substitutions

Substitutions are performed on the comment text before markdown processing and can be of either links or values.

###### Value Substitutions

Value substitutions take their values from command line arguments or from the JSON data of the file in which the marker
occurs (bearing in mind that this parser knows nothing of the ultimate structure of the data). Substitutions may
provide an explicit index for arrays.

Each value substitution marker is a list of colon separated values, with each value being a compound field name and an
optional substring specification, optionally terminated by a quoted constant value. If no value can be resolved an
exception is thrown.

When resolving the JSON data value each element in a compound name represents an element in the structure; for
simplicity indexes are not supported. The JSON structure is searched starting from the element to which the
documentation comment is associated and then working upwards to the root. This support is designed to be a common-case
convenience, not a be-all and end-all, which would be unusably complex.

If the substitution offset is negative it's taken from the end of the value. If the length is negative the substring
extends left from the offset. The final substring is forced to fall within the bounds of the value being substituted.

###### Global Substitution Defaults

    Name                                Description/Value (Quotes indicate literal value)
    ----------------------------------- --------------------------------------------------------------------------------
    $date                               Today's date in YYYY-MM-DD format.
    $file.next                          Relative path to the next file; blank for the last file.
    $file.next.link                     HTML link to the next file (with textand class  "next"); blank for the last file.
    $file.prev                          Relative path to the previous file; blank for the first file.
    $file.prev.link                     HTML link to the previous file (with text and class "prev"); blank for the first file.
    $owner                              "".
    $root                               Relative path to the documentation root (cannot be overridden).
    $root.index                         Relative path to the documentation root index (cannot be overridden).
    $root.style                         Relative path to the documentation root style (cannot be overridden).
    $title                              "Configuration Documentation"

    $css.bg                             The page background.
    $css.fg                             The page foreground.
    $css.flair                          Highlight color, used sparingly to impart a bit of color ot the page.
    $css.panel                          Panel background, used to offset a section from the main background.
    $css.hover                          Link hover color.
    $css.link                           Link color.
    $css.max-width                      The maximum page width.
    $css.p-align                        Paragraph text alignment.

###### Value Substitution Examples

    Marker                              Effect
    ----------------------------------- --------------------------------------------------------------------------------
    {{}}name}}                            `name` in the JSON data or throw an exception.
    {{}}name:""}}                         `name` in the JSON data or "".
    {{}}name:$global:""}}                 `name` in the JSON data, `global` from the command line, or "".
    {{}}name,10:""}}                      `name` as above and extract all characters from offset 10, or "".
    {{}}name,-10:""}}                     `name` as above and extract all characters from offset length-10, or "".
    {{}}name,10,3:""}}                    `name` as above and extract 3 characters from offset 10, or "".
    {{}}name,-10,3:""}}                   `name` as above and extract 3 characters from offset length-10, or "".
    {{}}a.b.name}}                        `name` in structure `b` in structure `a` or throw an exception.
    {{}}a.b[1].name:""}}                  `name` in the second structure `b` in structure `a` or "".
    {{}}$date}}                           Today's date.


###### Link Substitutions

Link substitution markers have a leading `@` or `#` and are transformed into Markdown style links. The content of the
marker is normalized into a label and reference and then substituted as [label](reference). The leading `@` indicates a
document link while the leading `#` indicates a fragment link in the current document.

A label value can be supplied using a `|` separator, in the form {{}}label | link}}; if a label is supplied that text is
used unchanged. The `|` is searched for from the end of the marker; that is, it's the last bar in the content text.

The link can be specified as a document path, fragment ID or descriptive text. A document link starting with a `/` is
prefixed with the current root path, allowing quick linking to documents from the logical root of the  documentation-set.

Document references have spaces changed to `-` and `.html` appended. ID references are reduced to `A-Za-z0-9` with all
other characters reduced to a single `-`, then are converted to lower case.

Labels, when not explicitly provided have any leading relative path and trailing index removed, `-` and `/` changed to
space and are then processed to insert a space before any uppercase character to separate words, or after a run of
uppercase characters to separate acronyms. Note that duplicate identifiers within a document are auto-indexed, so a
trailing `-nnn` is assumed to be an index and is not included as part of the label.

Link Substitution Examples

    Marker                                Literal Result
    ------------------------------------- ------------------------------------------------------------------------------
    {{}}#List Role Tasks}}                [List Role Tasks](#list-role-tasks)
    {{}}#Add Role Task}}                  [Add Role Task](#add-role-task)
    {{}}#Remove Role Task}}               [Remove Role Task](#remove-role-task)
    {{}}#List Role Users}}                [List Role Users](#list-role-users)
    {{}}#Add Role User}}                  [Add Role User](#add-role-user)
    {{}}#Remove Role User}}               [Remove Role User](#remove-role-user)
    {{}}#Example 1}}                      [Example 1](#example-1)
    {{}}#Example-2}}                      [Example 2](#example-2)
    {{}}#RestHTTPServer}}                 [Rest HTTP Server](#resthttpserver)
    {{}}@/General}}                       [General](../General.html)
    {{}}@/General#Code Examples}}         [General](../General.html#code-examples)
    {{}}@../General}}                     [General](../General.html)
    {{}}@General Information | /General}} [General Information](../General.html)
    {{}}@../wcp/Authentication}}          [wcp Authentication](../wcp/Authentication.html)
    {{}}@Alt Text|../wcp/Authentication}} [Alt Text](../wcp/Authentication.html)
    {{}}@Admin Role}}                     [Admin Role](Admin-Role.html)
    {{}}@Admin-Role}}                     [Admin Role](Admin-Role.html)
    {{}}@RestHTTPServer}}                 [Rest HTTP Server](RestHTTPServer.html)
