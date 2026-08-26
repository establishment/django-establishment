var fs = require("fs");

let translationKeyMap = new Map();

function getTranslationKeyJson() {
    let keys = [];
    for (let translationKey of translationKeyMap.entries()) {
        keys.push({
            text: translationKey[0],
            locations: translationKey[1]
        });
    }
    return JSON.stringify(keys, null, 4);
}

function addKey(key, fileName, line, col) {
    if (!translationKeyMap.has(key)) {
        translationKeyMap.set(key, []);
    }
    translationKeyMap.get(key).push({
        file: fileName,
        line: line,
        col: col
    });
}

function cleanKeysFromFile(fileName) {
    for (let key of translationKeyMap.keys()) {
        translationKeyMap.set(key, translationKeyMap.get(key).filter(location => (location.file !== fileName)));
        if (!translationKeyMap.get(key).length) {
            translationKeyMap.delete(key);
        }
    }
}

function getEndlines(str) {
    let length = 0, last = -1;
    for (let i = 0; i < str.length; i += 1) {
        if (str[i] === "\n") {
            length += 1;
            last = i;
        }
    }
    return {length, last};
}

function translationKeyFinder(dirname, options) {
    let searchModules = options.searchModules;
    if (typeof searchModules === "string" || searchModules instanceof String) {
        searchModules = [searchModules];
    }
    let ignoreModules = options.ignoreModules;
    if (typeof ignoreModules === "string" || ignoreModules instanceof String) {
        ignoreModules = [ignoreModules];
    }
    if (searchModules && ignoreModules) {
        return "Improperly configured.";
    }
    return {
        name: "Translation Key Finder",
        transform: (source, id) => {
            let fileName = id.substr(id.indexOf(dirname) + dirname.length);
            let sourceCopy = source;

            let searchInFile = false;
            if (!searchModules) {
                searchInFile = true;
                if (ignoreModules) {
                    for (let ignoreModule of ignoreModules) {
                        if (fileName.indexOf(ignoreModule)) {
                            searchInFile = false;
                        }
                    }
                }
            } else {
                for (let searchModule of searchModules) {
                    if (fileName.indexOf(searchModule) !== -1) {
                        searchInFile = true;
                    }
                }
            }

            if (!searchInFile) {
                return;
            }

            cleanKeysFromFile(fileName);

            source = source.split("UI.T(");
            let endlines = getEndlines(source[0]);
            let line = 1 + endlines.length;
            let col = source[0].length - endlines.last;

            for (let i = 1; i < source.length; i += 1) {
                if (source[i].length && source[i][0] === "\"") {
                    let key = source[i].split("\"")[1];
                    addKey(key, fileName, line, col);
                }
                endlines = getEndlines(source[i]);
                line += endlines.length;
                col += 5;
                if (endlines.last === -1) {
                    col += source[i].length;
                } else {
                    col = source[i].length - endlines.last;
                }
            }
            let logFileName = id.substr(0, id.indexOf(dirname) + dirname.length) + "/translations.json";
            fs.writeFile(logFileName, getTranslationKeyJson(), () => {});
            return {
                code: sourceCopy,
            };
        }
    };
}

export default translationKeyFinder;
