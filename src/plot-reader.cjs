import {Utils} from './utils.cjs';
import $ from 'jquery';
import {I18N} from './I18N.cjs';

class PlotReader {
    path;
    options;
    validLocalization = {CN: true, TW: true, EN: true, JP: true, KR: true, TH: true};
    titleList;
    entryPoint;
    mappings;
    groups;
    visited;
    playState = 0; // 0 未激活，1 正在播放，2 等待用户输入，3 当前入点剧情播放已结束
    nextGID;
    currentEntry;
    entry;
    localize;
    remoteCharacters;

    constructor(path, options) {
        this.path = path;
        this.options = options;
        this.localize = new I18N(options['LANG']);
    }

    async load() {
        try {
            this.titleList = [];
            this.entryPoint = [];
            this.mappings = new Map();
            this.groups = new Map();
            this.visited = new Map();
            this.remoteCharacters = new Map();
            await this.localize.init();
            await $.getJSON(this.path, (data) => {
                $.each(data, (key, info) => {
                    console.log(key, info);
                    if (key === 'custom') {
                        for (let i in info) {
                            this.remoteCharacters.set(info[i]['CharacterId'], info[i]);
                        }
                    }
                    if (key === 'title') {
                        for (let i in info) {
                            this.titleList.push(info[i]);
                            if (!info[i]['TextCn']) this.validLocalization['CN'] = false;
                            if (!info[i]['TextTw']) this.validLocalization['TW'] = false;
                            if (!info[i]['TextEn']) this.validLocalization['EN'] = false;
                            if (!info[i]['TextJp']) this.validLocalization['JP'] = false;
                            if (!info[i]['TextKr']) this.validLocalization['KR'] = false;
                            if (!info[i]['TextTh']) this.validLocalization['TH'] = false;
                        }
                    }
                    if (key === 'content') {
                        for (let i in info) {
                            if (info[i]['MessageCondition'] === 'FavorRankUp') {
                                this.entryPoint.push(info[i]);
                            }
                            this.mappings.set(info[i]['Id'], info[i]);
                            if (this.groups.has(info[i]['MessageGroupId'])) {
                                let cur = [...this.groups.get(info[i]['MessageGroupId']), info[i]];
                                this.groups.set(info[i]['MessageGroupId'], cur);
                            } else {
                                this.groups.set(info[i]['MessageGroupId'], [info[i]]);
                            }
                        }
                    }
                });
            });
            if (this.validLocalization[this.options['LANG']] === undefined || !this.validLocalization[this.options['LANG']]) {
                console.warn(`Invalid language key or unsupported translation ${this.options['LANG']}! Switched to JP`);
                this.options['LANG'] = 'JP';
            }
        } catch (e) {
           console.error(e.message);
        }
    }

    play(entry) {
        console.log(this.path, this.options);
        this.load().then(async () => {
            if (entry >= this.entryPoint.length) {
                throw new Error(`Requesting for entrypoint #${entry} out of bound [0,${this.entryPoint.length - 1}]!`);
            }
            this.nextGID = this.entryPoint[entry]['MessageGroupId'];
            this.currentEntry = this.entryPoint[entry]['MessageGroupId'];
            this.entry = entry;
            await this.resume().catch((GID) => this.cleanup(GID, 1, 2));
        });
    }

    markAsClicked(GID, oBID, nBID) {
        if (oBID === nBID) return;
        let buttonGroup = document.getElementById(`selector ${GID}`);
        if (buttonGroup !== null) {
            document.getElementById(`button ${nBID}`).removeAttribute('data-unselected');
            document.getElementById(`button ${nBID}`).setAttribute('data-selected', '');
            if (oBID !== -1) {
                document.getElementById(`button ${oBID}`).removeAttribute('data-selected');
                document.getElementById(`button ${oBID}`).setAttribute('data-unselected', '');
            }
        }
    }

    async resume(flag = 0, GID = this.nextGID) {
        return new Promise(async (resolve, reject) => {
            if (this.playState !== 2 && this.playState !== 0) {
                console.warn(`Cannot resume playing. Player status is ${this.playState}`);
                reject(GID);
            }
            await this.playPart(GID, flag).then(res => {
                this.nextGID = res === undefined ? this.entry === this.entryPoint.length - 1 ? 0 : this.entryPoint[this.entry + 1] : res[0];
                this.playState = 2;
                if (res !== undefined) {
                    for (let i of res[1]) {
                        if (res[2]) {
                            document.getElementById(`button ${i['Id']}`).addEventListener("click", () => {
                                if (this.playState !== 1) {
                                    let oBID = this.findStateClicked(i['MessageGroupId']);
                                    this.markAsClicked(i['MessageGroupId'], oBID, i['Id']);
                                    let ret = this.addStory(res[1]);
                                    if (ret !== undefined) {
                                        for (let j of ret[1]) {
                                            if (!document.getElementsByClassName(`suitable-button ${j['Id']}`).length) continue;
                                            document.getElementsByClassName(`suitable-button ${j['Id']}`)[0].addEventListener("click", () => {
                                                this.resume(0, j['NextGroupId']);
                                            });
                                        }
                                    }
                                }
                            });
                        } else {
                            if (document.getElementById(`button ${i['Id']}`) === null) continue;
                            document.getElementById(`button ${i['Id']}`).addEventListener("click", () => {
                                if (this.playState !== 1) {
                                    let oBID = this.findStateClicked(i['MessageGroupId']);
                                    let stat = this.cleanup(i['MessageGroupId'], oBID, i['Id']);
                                    this.markAsClicked(i['MessageGroupId'], oBID, i['Id']);
                                    if (stat) this.resume(0, i['NextGroupId']).catch((GID) => this.cleanup(GID, 1, 2));
                                }
                            });
                        }
                    }
                } else this.drawFooterWidgets();
            });
            resolve(GID);
        });
    }

    drawFooterWidgets() {
        let container = document.getElementById('container');
        if (this.nextGID) {
            container.insertAdjacentHTML("beforeend", `<div class="end"><span class="endtxt">To Be Continued ${this.entry + 1}/${this.entryPoint.length}</span></div>`);
        } else {
            container.insertAdjacentHTML("beforeend", `<div class="end"><span class="endtxt">The End</span></div>`);
        }
        container.insertAdjacentHTML("beforeend", `<div class="footer" id="footer"></div>`);
        let footer = document.getElementById('footer');
        let baseURL = window.location.origin + window.location.pathname;
        let params = new URLSearchParams(window.location.search);
        if (this.entry > 0) {
            if (params.get('entry') !== null) params.set('entry', parseInt(this.entry) - 1);
            else params.append('entry', parseInt(this.entry) - 1);
            footer.insertAdjacentHTML("beforeend", `<div data-left class="suitable-button" onclick="window.location.href='${baseURL + '?' + params.toString()}'">${this.localize.translate('button.prevChapter', this.titleList[this.entry - 1][`Text${Utils.toUpperCamel(this.options['LANG'])}`])}</div>`);
        }
        if (this.entry < this.entryPoint.length - 1) {
            if (params.get('entry') !== null) params.set('entry', parseInt(this.entry) + 1);
            else params.append('entry', parseInt(this.entry) + 1);
            footer.insertAdjacentHTML("beforeend", `<div data-right class="suitable-button" onclick="window.location.href='${baseURL + '?' + params.toString()}'">${this.localize.translate('button.nextChapter', this.titleList[this.entry + 1][`Text${Utils.toUpperCamel(this.options['LANG'])}`])}</div>`);
        }
    }

    findStateClicked(GID) {
        let ret = -1;
        for (let child of this.groups.get(GID)) {
            if (document.getElementById(`button ${child['Id']}`) === null) continue;
            if (document.getElementById(`button ${child['Id']}`).hasAttribute('data-selected')) {
                ret = child['Id'];
                break;
            }
        }
        return ret;
    }

    async playPart(id, special) {
        this.playState = 1;
        return new Promise(async resolve => {
            if (this.entry < this.entryPoint.length - 1 && id >= this.entryPoint[this.entry + 1]['MessageGroupId']) resolve(undefined);
            if (!this.groups.has(id)) resolve(undefined);

            if (this.groups.has(id)) {
                let curGroup = this.groups.get(id);
                let nxtGroup = this.groups.get(curGroup[curGroup.length - 1]['NextGroupId']);
                let lastMID = 0;
                let flag = true;
                let tmp = special ? curGroup : undefined;
                while (!special && curGroup && curGroup[0]['MessageCondition'] !== 'Answer') {
                    if (this.visited.get(id)) break;
                    if (curGroup[0]['MessageCondition'] === 'FavorRankUp' && curGroup[0]['MessageGroupId'] !== this.currentEntry) break;
                    if (parseInt(curGroup[curGroup.length - 1]['FavorScheduleId']) > 0) flag = false;
                    await this.addGroup(curGroup).then(res => {
                        if (!flag) tmp = curGroup;
                        lastMID = res;
                        curGroup = nxtGroup;
                        if (nxtGroup !== undefined) nxtGroup = this.groups.get(curGroup[curGroup.length - 1]['NextGroupId']);
                    });
                    if (!flag) break;
                }
                let ret;
                if (!special && curGroup && curGroup[0]['MessageCondition'] === 'Answer') ret = this.addOptions(curGroup);
                if (this.visited.get(id) || special || !flag) ret = this.addStory(tmp);
                if (ret && ret[2]) this.visited.set(ret[0], true);
                resolve(ret);
            }
        });
    }

    async addGroup(group) {
        return new Promise(async resolve => {
            let container = document.getElementById("container");
            let ret = 0;
            let GID = group[0]['MessageGroupId'];
            let CHID = group[0]['CharacterId'];

            let useRemoteCharacter = this.remoteCharacters.has(CHID);
            let labelStr = useRemoteCharacter ? this.remoteCharacters.get(CHID)[`Text${Utils.toUpperCamel(this.options['LANG'])}`] : this.localize.translate(`student.${group[0]['CharacterId']}`);
            container.insertAdjacentHTML("beforeend", `<div class="unit" id="unit ${GID}"><img class="avatar" src="${useRemoteCharacter ? this.remoteCharacters.get(CHID)['Avatar'] : `./assets/${CHID}/${CHID}.webp`}" alt="1"><div class="box" id="box ${GID}"><div data-place class="student group">${labelStr}</div></div></div>`);
            for (let child of group) {
                ret = child['Id'];
                let box = document.getElementById(`box ${GID}`);
                box.insertAdjacentHTML("beforeend", `<div data-round class="message group textbox"><span class="text" id="${child['Id']}">……</span></div>`);
                await Utils.sleep(child['FeedbackTimeMillisec'] * (1.0 / parseFloat(this.options['SPEED'])));
                let inner = document.getElementById(`${child['Id']}`);
                if (child['MessageType'] === 'Text') inner.innerHTML = `${child[`Message${this.options['LANG']}`]}`;
                else if (child['MessageType'] === 'Image') {
                    let img = child['ImagePath'].substring(child['ImagePath'].lastIndexOf('/') + 1);
                    inner.innerHTML = "";
                    inner.insertAdjacentHTML("beforeend", `<div class="image-box"><img data-inline alt="Momotalk showcase" src="${useRemoteCharacter ? child['ImagePath'] : `./assets/${CHID}/${img}.png`}"</div>`)
                }
                await Utils.sleep(100);
            }
            resolve(ret);
        });
    }

    addOptions(group) {
        let container = document.getElementById("container");
        let ret = 0;
        let GID = group[0]['MessageGroupId'];
        let labelStr = this.localize.translate('label.reply');
        container.insertAdjacentHTML("beforeend", `<div class="unit" id="unit ${GID}"><div class="reply"><div class="info"><span class="status">${labelStr}</span></div><div class="selector" id="selector ${GID}"></div></div></div>`);
        let selector = document.getElementById(`selector ${GID}`);
        let flag = parseInt(group[group.length - 1]['FavorScheduleId']) > 0;
        for (let child of group) {
            ret = flag ? child['MessageGroupId'] : child['NextGroupId'];
            selector.insertAdjacentHTML("beforeend", `<div data-unselected class="button" id="button ${child['Id']}">${child[`Message${this.options['LANG']}`]}</div>`);
        }
        this.playState = 2;
        return [ret, group, flag];
    }

    addStory(group) {
        let container = document.getElementById("container");
        let CHID = group[0]['CharacterId'];
        let useRemoteCharacter = this.remoteCharacters.has(CHID);
        let labelStr = this.localize.translate('button.gotoStory', useRemoteCharacter ? this.remoteCharacters.get(CHID)[`Text${Utils.toUpperCamel(this.options['LANG'])}`] : this.localize.translate(`student.${CHID}`));
        let labelStr1 = this.localize.translate('label.story');
        let labelStr2 = this.localize.translate('button.skipStory');
        container.insertAdjacentHTML("beforeend", `<div class="unit" id="unit ${group[group.length - 1]['FavorScheduleId']}"><div data-right class="box"><div class="story"><div class="info"><span class="stat">${labelStr1}</span></div><div class="selector" id="selector ${group[0]['MessageGroupId']}"><div data-story class="button" id="button">${labelStr}</div></div></div><div class="suitable-button ${group[group.length - 1]['Id']}" id="button ${group[group.length - 1]['Id']}">${labelStr2}</div></div></div></div>`);
        this.playState = 2;
        return [group[group.length - 1]['NextGroupId'], group, false];
    }

    cleanup(GID, oBID, nBID) {
        console.log(oBID, nBID);
        if (oBID === nBID) return false;
        if (oBID === -1) return true;
        if (!this.groups.get(GID)[0]['unsure'] && this.mappings.get(oBID)['NextGroupId'] === this.mappings.get(nBID)['NextGroupId']) return false;
        let cur = document.getElementById(`unit ${GID}`);
        while (true) {
            if (cur.nextElementSibling === null) break;
            cur.nextElementSibling.remove();
        }
        return true;
    }
}

export {
    PlotReader
}
