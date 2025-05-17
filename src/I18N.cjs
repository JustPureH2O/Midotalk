import $ from 'jquery';

class I18N {
    keyMap;
    lang;

    constructor(lang) {
        this.keyMap = new Map();
        this.lang = lang;
    }

    async init() {
        return new Promise(async resolve => {
            await $.getJSON(`./assets/lang/${this.lang.toLowerCase()}.json`).then(file => {
                $.each(file, (key, translation) => {
                    this.keyMap.set(key, translation);
                });
            });
            resolve(this.lang);
        })
    }

    translate(key, ...args) {
        let ret = this.keyMap.get(key);
        if (!args.length) return ret;
        for (let i = 0; i < args.length; i++) {
            ret = ret.replace(new RegExp(`\\{${i}\\}`, "g"), args[i]);
        }
        return ret;
    }
}

export {
    I18N
}