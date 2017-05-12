import {GlobalState} from "State";
import {StoreObject, GenericObjectStore} from "Store";

class Country extends StoreObject {
    toString() {
        return this.name;
    }

    getIsoCode() {
        return this.isoCode;
    }

    getEmojiName() {
        return "flag_" + this.getIsoCode().toLowerCase()
    }
}

class CountryStoreClass extends GenericObjectStore {
    allWithNone() {
         return [
            {
                id: 0,
                name: "",
                toString: () => "None"
            },
            ...this.all().sort((a, b) => {
                if (a > b) {
                    return 1;
                }
                return -1;
            })
        ];
    }
}

let CountryStore = new CountryStoreClass("country", Country);


export {Country, CountryStore};