import {coolStore, BaseStore} from "../../../../stemjs/src/state/StoreRewrite";

@coolStore
export class TagObject extends BaseStore("Tag") {
    static _caseSensitiveCache?: Map<string, TagObject>;
    static _caseInsensitiveCache?: Map<string, TagObject>;

    declare id: number;
    declare name: string;
    declare parentId?: number;

    toString(): string {
        let result = this.name;
        const parent = this.getParent();
        if (parent) {
            result = parent + " - " + result;
        }
        return result;
    }

    getParent(): TagObject | null {
        return TagObject.get(this.parentId);
    }

    getDepth(): number {
        let depth = -1;
        let tag: TagObject | null = this;
        while (tag) {
            tag = tag.getParent();
            depth += 1;
        }
        return depth;
    }

    static getTagByName(name: string): TagObject | null {
        if (!this._caseSensitiveCache) {
            this._caseSensitiveCache = new Map();
        }
        if (this._caseSensitiveCache.has(name)) {
            return this._caseSensitiveCache.get(name) || null;
        }
        for (const tag of this.all()) {
            if (tag.name === name) {
                this._caseSensitiveCache.set(name, tag);
                return tag;
            }
        }
        return null;
    }

    static getTagByNameInsensitive(name: string): TagObject | null {
        const lowerCaseName = name.toLocaleLowerCase();
        if (!this._caseInsensitiveCache) {
            this._caseInsensitiveCache = new Map();
        }
        if (this._caseInsensitiveCache.has(lowerCaseName)) {
            return this._caseInsensitiveCache.get(lowerCaseName) || null;
        }
        for (const tag of this.all()) {
            if (tag.name.toLocaleLowerCase() === lowerCaseName) {
                this._caseInsensitiveCache.set(name, tag);
                return tag;
            }
        }
        return null;
    }
}

export const Tag = TagObject;
export const TagStore = TagObject;
