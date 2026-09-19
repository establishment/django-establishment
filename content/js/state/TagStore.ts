import {globalStore, BaseStore} from "../../../../stemjs/state/Store";
import {field} from "../../../../stemjs/state/StoreField";

@globalStore
export class Tag extends BaseStore("Tag") {
    static caseSensitiveCache?: Map<string, Tag>;
    static caseInsensitiveCache?: Map<string, Tag>;

    declare id: number;
    declare name: string;
    declare meta?: Record<string, unknown>;
    @field("self") parent?: Tag;

    toString(): string {
        let result = this.name;
        const parent = this.getParent();
        if (parent) {
            result = parent + " - " + result;
        }
        return result;
    }

    getParent(): Tag | null {
        return this.parent;
    }

    getDepth(): number {
        let depth = -1;
        let tag: Tag | null = this;
        while (tag) {
            tag = tag.getParent();
            depth += 1;
        }
        return depth;
    }

    static getTagByName(name: string): Tag | null {
        if (!this.caseSensitiveCache) {
            this.caseSensitiveCache = new Map();
        }
        if (this.caseSensitiveCache.has(name)) {
            return this.caseSensitiveCache.get(name) || null;
        }
        for (const tag of this.all()) {
            if (tag.name === name) {
                this.caseSensitiveCache.set(name, tag);
                return tag;
            }
        }
        return null;
    }

    static getTagByNameInsensitive(name: string): Tag | null {
        const lowerCaseName = name.toLocaleLowerCase();
        if (!this.caseInsensitiveCache) {
            this.caseInsensitiveCache = new Map();
        }
        if (this.caseInsensitiveCache.has(lowerCaseName)) {
            return this.caseInsensitiveCache.get(lowerCaseName) || null;
        }
        for (const tag of this.all()) {
            if (tag.name.toLocaleLowerCase() === lowerCaseName) {
                this.caseInsensitiveCache.set(name, tag);
                return tag;
            }
        }
        return null;
    }
}
