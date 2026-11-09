# Separate data terms

Contains information from Open Food Facts, which is made available here under
[Open Database License 1.0](https://opendatacommons.org/licenses/odbl/1-0/).
Copyright/database attribution: **Open Food Facts contributors**.
Individual database contents are under
[Database Contents License 1.0](https://opendatacommons.org/licenses/dbcl/1-0/).

The extracted/curated database in `src/lexicon/data.json` (and its compiled copy)
is a derivative lexical database released under ODbL 1.0, with its OFF contents
under DbCL 1.0. Keep these terms and attribution when redistributing it; MIT does
not override them. Source URLs, frozen commit, exact line anchors and original
file hashes are included in `src/lexicon/`. Curation selects nodes, omits known
incorrect or overly broad aliases, deduplicates, and adds factual regulatory
metadata and explicitly sourced missing terms. No OFF server implementation
code (which has a separate AGPL license) is copied into this package.

Basis: OFF's first-party [database licensing guide](https://openfoodfacts.github.io/openfoodfacts-server/api/tutorials/license-be-on-the-legal-side/).
This guide supplies the general database/content terms; there is no independent
MIT grant for the taxonomies. Do not describe the entire package's data as MIT.

The Korean lupin term uses Wikidata structured data under
[CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/), as documented in
[Wikidata Licensing](https://www.wikidata.org/wiki/Wikidata:Licensing).
Individual food names and jurisdictional facts transcribed from government
sources are factual terminology. Their source publications and artwork are not
copied or relicensed. Each term and regulatory entry identifies its source.
The combined lexical database remains available under ODbL above.

OFF product records retrieved during evaluation are not redistributed; only
aggregate statistics are included. Display attribution when using OFF data.
OFF photographs, if used in a future application, have separate
[CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) terms and may
contain packaging artwork with additional rights. No such images are included.
