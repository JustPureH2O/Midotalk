import {PlotReader} from './plot-reader.cjs';
import {queryByName} from './query.cjs';

let options = {
    SPEED: 1,
    LANG: 'CN',
    ENTRY: 0,
    REMOTE: false,
    REMOTE_FILE: null,
}

let ascii_art = 'Powered by\n' +
    '                   __            __              ___    __         \n' +
    ' /\'\\_/`\\   __     /\\ \\          /\\ \\__          /\\_ \\  /\\ \\        \n' +
    '/\\      \\ /\\_\\    \\_\\ \\     ___ \\ \\ ,_\\     __  \\//\\ \\ \\ \\ \\/\'\\    \n' +
    '\\ \\ \\__\\ \\\\/\\ \\   /\'_` \\   / __`\\\\ \\ \\/   /\'__`\\  \\ \\ \\ \\ \\ , <    \n' +
    ' \\ \\ \\_/\\ \\\\ \\ \\ /\\ \\L\\ \\ /\\ \\L\\ \\\\ \\ \\_ /\\ \\L\\.\\_ \\_\\ \\_\\ \\ \\\\`\\  \n' +
    '  \\ \\_\\\\ \\_\\\\ \\_\\\\ \\___,_\\\\ \\____/ \\ \\__\\\\ \\__/.\\_\\/\\____\\\\ \\_\\ \\_\\\n' +
    '   \\/_/ \\/_/ \\/_/ \\/__,_ / \\/___/   \\/__/ \\/__/\\/_/\\/____/ \\/_/\\/_/\n' +
    '                                                                   \n' +
    'by JustPureH2O. COMMERCIAL DERIVATION IS PROHIBITED!\nThis player is open-source at https://github.com/JustPureH2O/Midotalk';
console.log(ascii_art);

const ARGS = new URLSearchParams(window.location.search);
let name = 'kisaki';
if (ARGS.get('name') !== null) name = ARGS.get('name');
name = queryByName(name);
if (ARGS.get('remote') !== null) {
    options['REMOTE'] = true;
    options['REMOTE_FILE'] = ARGS.get('remote');
}
if (ARGS.get('speed') !== null) options['SPEED'] = parseFloat(ARGS.get('speed'));
if (ARGS.get('lang') !== null) options['LANG'] = ARGS.get('lang').toUpperCase();
if (ARGS.get('entry') !== null) options['ENTRY'] = parseInt(ARGS.get('entry'));
const Player = new PlotReader(options['REMOTE'] ? options['REMOTE_FILE'] : name, options);
Player.play(options['ENTRY']);
