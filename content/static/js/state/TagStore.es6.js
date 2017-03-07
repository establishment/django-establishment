import {GlobalState} from "State";
import {StoreObject, GenericObjectStore} from "Store";

class Tag extends StoreObject {
    toString() {
        let result = this.name;
        let parent = this.getParent();
        if (parent) {
            result = parent + " - " + result;
        }
        return result;
    }

    getParent() {
        return TagStore.get(this.parentId);
    }

    getDepth() {
        let depth = -1;
        let tag = this;
        while (tag) {
            tag = tag.getParent();
            depth += 1;
        }
        return depth;
    }
}

let TagStore = new GenericObjectStore("tag", Tag);

TagStore.getTagByName = function(name) {
    if (!this._caseSensitiveCache) {
        this._caseSensitiveCache = new Map();
    }
    if (this._caseSensitiveCache.has(name)) {
        return this._caseSensitiveCache.get(name);
    }
    for (let tag of this.all()) {
        if (tag.name === name) {
            this._caseSensitiveCache.set(name, tag);
            return tag;
        }
    }
    return null;
};
TagStore.getTagByNameInsensitive = function(name) {
    let lowerCaseName = name.toLocaleLowerCase();
    if (!this._caseInsensitiveCache) {
        this._caseInsensitiveCache = new Map();
    }
    if (this._caseInsensitiveCache.has(lowerCaseName)) {
        return this._caseInsensitiveCache.get(lowerCaseName);
    }
    for (let tag of this.all()) {
        if (tag.name.toLocaleLowerCase() === lowerCaseName) {
            this._caseInsensitiveCache.set(name, tag);
            return tag;
        }
    }
    return null;
};

export {Tag, TagStore};