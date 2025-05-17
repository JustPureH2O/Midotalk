import {PlotReader} from './plot-reader.cjs';
import {queryByName} from './query.cjs';

let options = {
    SPEED: 1,
    LANG: 'CN',
    ENTRY: 0,
    REMOTE: false,
    REMOTE_FILE: null,
}

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
