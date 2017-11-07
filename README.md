## todolint
Lets you check projects for TODOs, FIXMEs, and other tags.

### Install:
```
npm install todolint
```

### Usage:
```
cd your_project
todolint
```

### Configuration:
`todolint` reads configuration from a file in the same directory it is run named `.todolintrc.json`. An example of the file is shown at the end of this documentation. All fields in the file are optional.

### .todolintrc.json Options:
* **root:** The base directory where `todolint` will scan recursively. Defaults to the current directory.
* **ignore:** An array of glob patterns that will match directories or files to be ignored. Defaults to an empty array.
* **tags:** An array of tag objects to scan for with the following required structure:
    * **name:** The name of the tag.
    * **regex:** The regular expression used to identify the tag. Matches of the regular expression in a file are replaced from the beginning of the line to the end of the match with the label for this tag.
    * **label:** The label shown in the command's output for a given tag.
    * **style:** An array of [chalk](https://www.npmjs.com/package/chalk) styles to be applied to the tag and message (e.g. `["red", "bgBlue", "underline", "bold"]`). Defaults to an empty array.
* **warn:** An object defining the warning behavior for the command with the following options:
    * **limit:** The number of messages to allow before showing a warning. Defaults to no limit.
    * **tags:** An array of tag names. Only the tag names included will contribute to the warning count. Defaults to all tags.
    * **message:** The message to display when a warning is given. Defaults to a message indicating there are more items than the warn limit.
    * **fail:** A boolean that indicates whether the command should return a failure status if a warning is given. Defaults to false.

### Usage with gulp:
While `todolint` does not support gulp directly with streams, it does offer a callback option. To use with gulp, you can do the following:

```
var todolint = require('todolint');
gulp.task('todolint', function (done) {
    todolint(done);
});
```

### Example .todolintrc.json:
```
{
    "root": "test",
    "warn": {
        "limit": 4,
        "tags": [ "TODO", "FIXME", "HACK", "BUG", "XXX" ],
        "message": "",
        "fail": true
    },
    "tags": [
        {
            "name": "TODO",
            "regex": "TODO",
            "label": "✓ TODO",
            "style": ["cyan"]
        },
        {
            "name": "NOTE",
            "regex": "NOTE",
            "label": "✐ NOTE",
            "style": ["green"]
        },
        {
            "name": "FIXME",
            "regex": "FIXME",
            "label": "⚠ FIXME",
            "style": ["red"]
        },
        {
            "name": "BUG",
            "regex": "BUG",
            "label": "☠ BUG",
            "style": ["white", "bgRed", "underline"]
        },
        {
            "name": "HACK",
            "regex": "HACK",
            "label": "✄ HACK",
            "style": ["yellow"]
        },
        {
            "name": "XXX",
            "regex": "XXX",
            "label": "✗ XXX",
            "style": ["black", "bgYellow"]
        }
    ],
    "ignore": [
        ".git",
        "node_modules",
        "*.swp"
    ]
}
```
