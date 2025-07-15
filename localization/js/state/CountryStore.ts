import {StoreObject, GenericObjectStore} from "../../../../stemjs/src/state/Store";

export class Country extends StoreObject {
    declare id: number;
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
}

const ALL_COUNTRIES_PLACEHOLDER = new Country({id: 0, name: "All Countries", isCode: "-"});
const NO_COUNTRY_PLACEHOLDER = (noneName: string) => new Country({id: -1, name: noneName, isoCode: "-"});

const COUNTRY_COMPARATOR = (a: Country, b: Country): number => {
    if (a.name > b.name) {
        return 1;
    }
    return -1;
};

class CountryStoreClass extends GenericObjectStore<Country> {
    allWithNone(noneName: string = "None"): any[] {
         return [
            NO_COUNTRY_PLACEHOLDER(noneName),
            ...Array.from(this.all()).sort(COUNTRY_COMPARATOR)
        ];
    }

    getCountriesFromIds(countriesIds: Set<number> | number[], allCountries: boolean = true): any[] {
        const countries: (Country | null)[] = [];
        for (const countryId of countriesIds) {
            countries.push(CountryStore.get(countryId));
        }
        const result = countries.filter((c) => c !== null).sort(COUNTRY_COMPARATOR);
        if (allCountries) {
            result.unshift(ALL_COUNTRIES_PLACEHOLDER);
        }
        return result;
    }
}

export const CountryStore = new CountryStoreClass("country", Country);
