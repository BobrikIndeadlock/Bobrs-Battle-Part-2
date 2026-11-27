"""Build the Deadlock-only GitHub Pages artifact from the game's approved assets."""

import json
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ONLINE = ROOT / 'online-deadlock'
STYLES = (
    'deadlock-altar.css', 'deadlock-finale.css', 'deadlock.css',
    'deadlock-sound.css', 'altar-details.css', 'palette.css', 'coin.css',
)
ASSETS = (
    'media/deadlock/portraits.js',
    'media/images/altar-header.jpg',
    'media/images/coin-artemon.jpg',
    'media/images/coin-makarych.jpg',
    'media/images/deadlock-draft-background.jpg',
    'media/images/deadlock-finale-background.jpg',
    'media/cards/makarych.png',
    'media/cards/artemon.png',
    'media/throne/fog-haze.webp',
    'media/throne/fog-floor.webp',
    'code/js/deadlock-atmosphere.js',
)

def replace_once(source, original, replacement):
    if source.count(original) != 1:
        raise ValueError(f'Deadlock source changed at {original[:90]!r}')
    return source.replace(original, replacement, 1)

def build(output):
    original_html = (ROOT / 'index.html').read_text(encoding='utf-8')
    begin = original_html.index('<div aria-label="Вторая фаза: драфт героев Deadlock" id="dlPhase">')
    end = original_html.index('<script src="media/deadlock/portraits.js">', begin)
    markup = original_html[begin:end]
    for index, captain in enumerate(('makarych', 'artemon')):
        markup = replace_once(markup, f'id="dlCap{index}"/>',
                              f'id="dlCap{index}" src="media/cards/{captain}.png" alt="{("Макарыч", "Артемон")[index]}">')
    template = (ONLINE / 'index.html').read_text(encoding='utf-8')
    styles = {f'code/css/{style}' for style in STYLES}
    links = '\n  '.join(f'<link rel="stylesheet" href="code/css/{style}">' for style in STYLES)
    template = replace_once(template, '<!-- DEADLOCK_STYLES -->', links)
    template = replace_once(template, '<!-- DEADLOCK_VIEW -->', markup)

    controller = (ROOT / 'code/js/deadlock-draft.js').read_text(encoding='utf-8')
    order, heroes = [re.search(r'const ' + name + r'=(\[[^\n]+\]);', controller)[1]
                     for name in ('order', 'names')]
    local_draft = (ROOT / 'code/js/first-draft.js').read_text(encoding='utf-8')
    players = json.loads(re.search(r'const baseCharacters=(\[[^\n]+\]);', local_draft)[1])
    if len(players) != 10 or any(
        not re.fullmatch(r'preset-\d+', p['id']) or not re.fullmatch(r'media/cards/[a-z]+\.png', p['image'])
        for p in players
    ):
        raise ValueError('The offline roster must contain ten approved cards')

    controller = replace_once(controller, 'if(animating||history.some(x=>x.id===h.id))return;',
                              "if(!onlineAllowed('move')||history.some(x=>x.id===h.id))return;")
    controller = replace_once(controller, "const className='dl-hero'+",
                              "const className='dl-hero'+(!onlineAllowed('move')?' online-locked':'')+")
    controller = replace_once(controller, 'const disabled=animating||!!usedBy;',
                              "const disabled=!onlineAllowed('move')||!!usedBy;")
    controller = replace_once(controller, "$('dlConfirm').disabled=animating||selected===null",
                              "$('dlConfirm').disabled=!onlineAllowed('move')||selected===null")
    start = controller.index(" $('dlFlip').onclick=()=>{")
    coin_logic = controller.index(" const coin=coinModel,animationName=", start)
    controller = controller[:start] + ''' function playCoin(result) {
 if(flipping||coinResult!==null)return Promise.resolve();
 flipping=true;
 coinResult=result;
 const heads=result==='heads';place1=heads?1:0;
 return new Promise(resolve=>{
''' + controller[coin_logic:]
    old_coin_finish = """coin.className='dl-coin '+coinResult;flipping=false;$('dlCoinResult').textContent=heads?'ОРЁЛ! АРТЕМОН — МЕСТО 1':'РЕШКА! МАКАРЫЧ — МЕСТО 1';$('dlFlip').style.display='none';$('dlEnter').style.display='';sound(65,.8)"""
    controller = replace_once(controller, old_coin_finish, 'flipping=false;showCoinResult();sound(65,.8);resolve()')
    controller = replace_once(controller, " };\n $('dlEnter').onclick=", " });\n }\n $('dlEnter').onclick=")
    close = controller.rindex('})();')
    controller = controller[:close] + (ONLINE / 'view.js').read_text(encoding='utf-8') + controller[close:]

    files = styles | set(ASSETS) | {p['image'] for p in players}
    for css in styles:
        style = (ROOT / css).read_text(encoding='utf-8')
        for url in re.findall(r'url\(["\']?\.\./\.\./(media/[^\s"\')]+)', style):
            files.add(url)
    files.update(str(path.relative_to(ROOT)) for path in (ROOT / 'media/draft').glob('*.webp'))
    files.update('online-deadlock/' + file for file in (
        'room.css', 'room.mjs', 'rules.mjs', 'peerjs.min.js', 'PEERJS-LICENSE.txt',
    ))
    output.mkdir(parents=True, exist_ok=False)
    for file in sorted(files):
        target = output / file
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(ROOT / file, target)
    (output / 'index.html').write_text(template, encoding='utf-8')
    (output / 'code/js/deadlock-draft.js').write_text(controller, encoding='utf-8')
    data = 'export const order = ' + order + ';\nexport const heroNames = ' + heroes + ';\n'
    data += 'export const players = ' + json.dumps(players, ensure_ascii=False) + ';\n'
    (output / 'online-deadlock/draft-data.mjs').write_text(data, encoding='utf-8')
    (output / '.nojekyll').touch()

if __name__ == '__main__':
    build(Path(sys.argv[1]))
