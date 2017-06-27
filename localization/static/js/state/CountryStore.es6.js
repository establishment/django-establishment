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

const ALL_COUNTRIES_PLACEHOLDER = {id: 0, name: "", toString: () => "All Countries"};
const NO_COUNTRY_PLACEHOLDER = {id: -1, name: "", toString: () => "None"};

const COUNTRY_COMPARATOR = (a, b) => {
    if (a.name > b.name) {
        return 1;
    }
    return -1;
};

class CountryStoreClass extends GenericObjectStore {
    allWithNone() {
         return [
            NO_COUNTRY_PLACEHOLDER,
            ...this.all().sort(COUNTRY_COMPARATOR)
        ];
    }

    getCountriesFromIds(countriesIds, allCountries=true) {
        let countries = [];
        for (let countryId of countriesIds) {
            countries.push(CountryStore.get(countryId));
        }
        let result = countries.sort(COUNTRY_COMPARATOR);
        if (allCountries) {
            result.unshift(ALL_COUNTRIES_PLACEHOLDER);
        }
        return result;
    }
}

const CountryStore = new CountryStoreClass("country", Country);


export {Country, CountryStore, ALL_COUNTRIES_PLACEHOLDER};