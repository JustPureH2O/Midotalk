class Utils {
    static sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    static toUpperCamel(str) {
        return str[0].toUpperCase() + str.slice(1).toLowerCase();
    }

    static {

    }
}

export {
    Utils
}
