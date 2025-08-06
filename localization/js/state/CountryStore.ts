import {globalStore, BaseStore} from "../../../../stemjs/src/state/Store";
import {isNotNull} from "../../../../stemjs/src/base/Utils";
import {StoreId} from "../../../../stemjs/src/state/State";

@globalStore
export class Country extends BaseStore("Country") {
    declare name: string;
    declare isoCode: string;

    toString(): string {
        return this.name;
    }

    getIsoCode(): string {
        return this.isoCode;
    }

    getEmojiName(): string {
        return "flag_" + this.getIsoCode().toLowerCase();
    }

    static allWithNone(noneName: string = "None") {
         return [
            NO_COUNTRY_PLACEHOLDER(noneName),
            ...Array.from(this.all()).sort(COUNTRY_COMPARATOR)
        ];
    }

    static getCountriesFromIds(countriesIds: Iterable<StoreId>, allCountries: boolean = true) {
        const countries: (Country | null)[] = [];
        for (const countryId of countriesIds) {
            countries.push(this.get(countryId));
        }
        const result = countries.filter(isNotNull).sort(COUNTRY_COMPARATOR);
        if (allCountries) {
            result.unshift(ALL_COUNTRIES_PLACEHOLDER);
        }
        return result;
    }
}

const ALL_COUNTRIES_PLACEHOLDER = new Country({id: 0, name: "All Countries", isCode: "-"});
const NO_COUNTRY_PLACEHOLDER = (noneName: string) => new Country({id: -1, name: noneName, isoCode: "-"});

const COUNTRY_COMPARATOR = (a: Country, b: Country): number => {
    if (a.name > b.name) {
        return 1;
    }
    return -1;
};
