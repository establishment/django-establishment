import {globalStore, BaseStore} from "../../../../stemjs/state/Store";
import {isNotNull} from "../../../../stemjs/base/Utils";
import {StoreId} from "../../../../stemjs/state/State";

@globalStore
export class Country extends BaseStore("Country") {
    declare name: string;
    declare isoCode: string;
    declare phonePrefix?: string;

    toString(): string {
        return this.name;
    }

    getIsoCode(): string {
        return this.isoCode;
    }

    getEmojiName(): string {
        return "flag_" + this.getIsoCode().toLowerCase();
    }

    static comparator = (a: Country, b: Country): number => a.name > b.name ? 1 : -1;

    static allWithNone(noneName: string = "None") {
         return [
            NO_COUNTRY_PLACEHOLDER(noneName),
            this.all()
        ];
    }

    static getCountriesFromIds(countriesIds: Iterable<StoreId>, allCountries: boolean = true) {
        const countries: (Country | null)[] = [];
        for (const countryId of countriesIds) {
            countries.push(this.get(countryId));
        }
        const result = countries.filter(isNotNull).sort(Country.comparator);
        if (allCountries) {
            result.unshift(ALL_COUNTRIES_PLACEHOLDER);
        }
        return result;
    }
}

const ALL_COUNTRIES_PLACEHOLDER = new Country({id: 0, name: "All Countries", isCode: "-"});
const NO_COUNTRY_PLACEHOLDER = (noneName: string) => new Country({id: -1, name: noneName, isoCode: "-"});
