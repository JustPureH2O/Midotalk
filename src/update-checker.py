import os
import shutil
import cloudscraper
import json
import random
from deepdiff import DeepDiff

browser = ('chrome', 'firefox')
platform = ('windows', 'linux', 'android')
scraper = cloudscraper.create_scraper(browser={
    'browser': random.choice(browser),
    'platform': random.choice(platform),
    'mobile': False
})

def initScraper():
    scraper = cloudscraper.create_scraper(browser={
        'browser': random.choice(browser),
        'platform': random.choice(platform),
        'mobile': False
    })


def crawlStudentList():
    url = 'https://blue-archive.io/config/json/students.json'

    initScraper()
    res = scraper.get(url)
    res.encoding = 'utf-8'

    if res.status_code == 200:
        with open('./students_neo.json', 'w', encoding='utf-8') as tmp:
            tmp.write(json.dumps(json.loads(res.text), indent=2).encode('utf-8').decode('unicode-escape'))
            tmp.flush()
        f1, f2 = json.load(open('./students.json', 'r', encoding='utf-8')), json.load(
            open('./students_neo.json', 'r', encoding='utf-8'))
        changes = DeepDiff(f1, f2)
        if changes:
            shutil.copy2('./students_neo.json', './students.json')

        os.remove('./students_neo.json')
        return changes
    else:
        print('\033[91mList Request Failed with Code: {}\033[0m'.format(res.status_code))

    return {}


def downloadTalks(diff):
    entry = diff['iterable_item_added']
    for _0 in entry:
        if not os.path.exists('assets/{}'.format(entry[_0]['id'])):
            os.mkdir('assets/{}'.format(entry[_0]['id']))

        urlJson = 'https://blue-archive.io/config/json/momotalk/{}.json'.format(entry[_0]['id'])
        urlWebp = 'https://blue-archive.io/image/avatar_students/{}.webp'.format(entry[_0]['id'])
        initScraper()
        jdata = scraper.get(urlJson)
        jdata.encoding = 'utf-8'
        if jdata.status_code == 200:
            with open('./assets/{}/{}.json'.format(entry[_0]['id'], entry[_0]['id']), 'w', encoding='utf-8') as out:
                out.write(json.dumps(json.loads(jdata.text), indent=2).encode('utf-8').decode('unicode-escape'))
                out.flush()
        else:
            print('\033[91mFail to Fetch {}.json. Server Returns: {}\033[0m'.format(entry[_0]['id'], jdata.status_code))

        wdata = scraper.get(urlWebp)
        if wdata.status_code == 200:
            with open('./assets/{}/{}.webp'.format(entry[_0]['id'], entry[_0]['id']), 'w+b') as out:
                out.write(wdata.content)
                out.flush()
        else:
            print('\033[91mFail to Fetch {}.webp. Server Returns: {}\033[0m'.format(entry[_0]['id'], jdata.status_code))

def downloadSingle(id, json=False, webp=False):
    initScraper()
    if json:
        url = 'https://blue-archive.io/config/json/momotalk/{}.json'.format(id)
        data = scraper.get(url)
        data.encoding = 'utf-8'
        if data.status_code == 200:
            with open('./assets/{}/{}.json'.format(id, id), 'w', encoding='utf-8') as out:
                out.write(data.content)
                out.flush()
        else:
            print('\033[91mFail to Fetch {}.json. Server Returns: {}\033[0m'.format(id, data.status_code))

    if webp:
        url = 'https://blue-archive.io/config/json/momotalk/{}.webp'.format(id)
        data = scraper.get(url)
        if data.status_code == 200:
            with open('./assets/{}/{}.webp'.format(id, id), 'w') as out:
                out.write(data.content)
                out.flush()
        else:
            print('\033[91mFail to Fetch {}.webp. Server Returns: {}\033[0m'.format(id, data.status_code))

def regenerateI18N():
    lang = ('cn', 'jp', 'tw', 'th', 'kr', 'en')
    base = {
        'cn': {
            "button.nextChapter": "下一幕：{0}",
            "button.prevChapter": "上一幕：{0}",
            "button.skipStory": "继续",
            "button.gotoStory": "前往{0}的羁绊剧情",
            "label.reply": "回复",
            "label.story": "羁绊剧情",
        },
        'jp': {
            "button.nextChapter": "次回: {0}",
            "button.prevChapter": "前回: {0}",
            "button.skipStory": "続きを読む",
            "button.gotoStory": "{0}の絆ストーリへ",
            "label.reply": "返信",
            "label.story": "絆ストーリ",
        },
        'tw': {
            "button.nextChapter": "下一章: {0}",
            "button.prevChapter": "上一章: {0}",
            "button.skipStory": "繼續",
            "button.gotoStory": "前往{0}的羈絆劇情",
            "label.reply": "回覆",
            "label.story": "羈絆事件",
        },
        'th': {
            "button.nextChapter": "เกิด ขึ้น: {0}",
            "button.prevChapter": "ก่อน: {0}",
            "button.skipStory": "อ่านต่อ",
            "button.gotoStory": "ไปที่เหตุการณ์ความสัมพันธ์ของ {0}",
            "label.reply": "ตอบกลับ",
            "label.story": "เหตุการณ์ความสัมพันธ์",
        },
        'kr': {
            "button.nextChapter": "다음: {0}",
            "button.prevChapter": "이전: {0}",
            "button.skipStory": "계속",
            "button.gotoStory": "{0}의 관계 이벤트로 이동",
            "label.reply": "답장",
            "label.story": "관계 이벤트",
        },
        'en': {
            "button.nextChapter": "Next Chapter: {0}",
            "button.prevChapter": "Previous Chapter: {0}",
            "button.skipStory": "Continue",
            "button.gotoStory": "Go to {0}'s relationship story",
            "label.reply": "Reply",
            "label.story": "Relationship event",
        }
    }

    with open('./students.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
        for language in lang:
            with open('./assets/lang/{}.json'.format(language), 'w', encoding='utf-8') as out:
                for obj in data:
                    base[language]['student.{}'.format(obj['id'])] = obj['name'][language]

                out.write(json.dumps(base[language], indent=2).encode('utf-8').decode('unicode-escape'))
                out.flush()


if __name__ == '__main__':
    op = int(input("Operation: "))
    if op == 1:
        print('Perform Assets Check')
        files = os.listdir('./assets/')
        for file in files:
            if os.path.isdir(os.path.join(os.getcwd(), 'assets', file)) and file.isdigit():
                if not os.path.exists('./assets/{}/{}.json'.format(file, file)):
                    print('\033[91mDialog JSON Missing! Re-downloading...{}\033[0m'.format('./assets/{}/{}.json'.format(file, file)))
                    downloadSingle(file, json=True)
                elif not os.path.exists('./assets/{}/{}.webp'.format(file, file)):
                    print('\033[91mDialog AVATAR Missing! Re-downloading...{}\033[0m'.format('./assets/{}/{}.webp'.format(file, file)))
                    downloadSingle(file, webp=True)

    else:
        diff = crawlStudentList()
        if diff:
            print('Initiate Download Procedure')
            downloadTalks(diff)
            regenerateI18N()
        else:
            print('Everything is Up-to-date')
