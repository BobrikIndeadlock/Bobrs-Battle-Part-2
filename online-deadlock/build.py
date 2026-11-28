"""Publish the full browser game and keep invitations from the original ZIP working."""

import json
import hashlib
import os
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ONLINE = ROOT / 'online-deadlock'
STYLES = (
    'deadlock-altar.css', 'deadlock-finale.css', 'deadlock.css',
    'deadlock-sound.css', 'altar-details.css', 'palette.css', 'coin.css', 'season-deadlock.css',
)
ASSETS = (
    'media/deadlock/portraits.js',
    'media/images/altar-header.jpg',
    'media/cards/makarych.png',
    'media/cards/artemon.png',
    'media/throne/fog-haze.webp',
    'media/throne/fog-floor.webp',
    'code/js/deadlock-atmosphere.js', 'code/js/season.js', 'code/js/season-atmosphere.js',
    'media/cards/pavel.png', 'media/cards/mishanya.png',
)

def replace_once(source, original, replacement):
    if source.count(original) != 1:
        raise ValueError(f'Deadlock source changed at {original[:90]!r}')
    return source.replace(original, replacement, 1)

def link_or_copy(source, target):
    try:
        os.link(source, target)
    except OSError:
        shutil.copyfile(source, target)

def build(output):
    original_html = (ROOT / 'index.html').read_text(encoding='utf-8')
    begin = original_html.index('<div aria-label="Вторая фаза: драфт героев Deadlock" id="dlPhase">')
    end = original_html.index('<script src="media/deadlock/portraits.js">', begin)
    markup = original_html[begin:end]
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
        not re.fullmatch(r'preset-\d+', p['id']) or not re.fullmatch(r'media/cards/[a-z-]+\.png', p['image'])
        for p in players
    ):
        raise ValueError('The offline roster must contain ten approved cards')

    controller = replace_once(controller, 'if(animating||history.some(x=>x.id===h.id))return;',
                              "if(!onlineAllowed('move')||history.some(x=>x.id===h.id))return;")
    controller = replace_once(controller, "const className='dl-hero'+",
                              "const className='dl-hero'+(roomTeams&&!onlineAllowed('move')?' online-locked':'')+")
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
    old_coin_finish = """coin.className='dl-coin '+coinResult;flipping=false;$('dlCoinResult').textContent=coinCaption(coinResult);$('dlFlip').style.display='none';$('dlEnter').style.display='';sound(65,.8)"""
    controller = replace_once(controller, old_coin_finish, 'flipping=false;showCoinResult();sound(65,.8);resolve()')
    controller = replace_once(controller, " };\n $('dlEnter').onclick=", " });\n }\n $('dlEnter').onclick=")
    controller = replace_once(controller, " $('dlEnter').onclick=()=>{if(flipping", """ $('dlFlip').onclick=()=>{
 if(flipping||coinResult!==null)return;
 const random=new Uint32Array(1);if(window.crypto?.getRandomValues)crypto.getRandomValues(random);else random[0]=Math.floor(Math.random()*4294967296);
 return playCoin((random[0]&1)===0?'heads':'tails');
 };
 $('dlEnter').onclick=()=>{if(flipping""")
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
        link_or_copy(ROOT / file, target)
    (output / 'deadlock.html').write_text(template, encoding='utf-8')
    (output / 'code/js/deadlock-draft.js').write_text(controller, encoding='utf-8')
    data = 'export const order = ' + order + ';\nexport const heroNames = ' + heroes + ';\n'
    data += 'export const players = ' + json.dumps(players, ensure_ascii=False) + ';\n'
    (output / 'online-deadlock/draft-data.mjs').write_text(data, encoding='utf-8')
    add_campaign(output, original_html)
    version_online_scripts(output)
    (output / '.nojekyll').touch()

def add_campaign(output, html):
    config_file = ROOT / 'code/js/season.js'
    config = json.loads(re.search(r'const season = ({.*?});', config_file.read_text(), re.S)[1])
    if config['movie']:
        movie = ROOT / config['movie']
        with movie.open('rb') as stream:
            header = stream.read(42)
        if movie.stat().st_size < 1024 or header.startswith(b'version https://git-lfs'):
            raise ValueError('The season film must be hydrated by Git LFS')

    bar = re.search(r'<aside id="roomBar"[^>]*>.*?</aside>', (ONLINE / 'index.html').read_text(), re.S)[0]
    html = replace_once(html, '<head>', """<head><meta name="referrer" content="no-referrer">
    <script>if (new URLSearchParams(location.hash.slice(1)).has('teams') ||
      new URLSearchParams(location.hash.slice(1)).has('room')) {
      location.replace('deadlock.html' + location.hash);
    }</script>""")
    html = replace_once(html, '</body>', bar + """
    <aside id="campaignMenu">
      <button type="button" id="campaignCreate">Играть по сети</button>
      <p id="campaignNotice" role="status"></p>
    </aside>
    <link rel="stylesheet" href="online-deadlock/room.css">
    <link rel="stylesheet" href="online-deadlock/campaign.css">
    <script src="online-deadlock/peerjs.min.js"></script>
    <script type="module" src="online-deadlock/campaign.mjs"></script>
    </body>""")
    (output / 'index.html').write_text(html, encoding='utf-8')

    first = (ROOT / 'code/js/first-draft.js').read_text(encoding='utf-8')
    first = replace_once(first, 'const randomInt=max=>{', 'const randomInt=max=>{if(actionRandom)return actionRandom()%max;')
    first = first.replace('onclick=()=>tapCard(', "onclick=()=>campaignDispatch('reveal',")
    first = first.replace('onclick=()=>choose(', "onclick=()=>campaignDispatch('choose',")
    first = replace_once(first, 'function tapCard(id){', 'async function tapCard(id){')
    first = replace_once(first, 'showCompare([c],true);return;', 'return showCompare([c],true);')
    first = replace_once(first, 'showCompare([...selectedPair],false,380);', 'return showCompare([...selectedPair],false,380);')
    first = replace_once(first, 'function showFinish(){', 'function showFinish(replayMovie=true){')
    first = replace_once(first, " movie.className='active';\n playMovie();",
                        " if(replayMovie){movie.className='active';playMovie()}else{closeMovie();finish.classList.add('visible');skipVsIntro()}")
    first = replace_once(first, "$('book').onclick=summon;$('restart').onclick=reset;",
                        "$('book').onclick=()=>campaignDispatch('summon');$('restart').onclick=()=>campaignDispatch('restart');")
    close = first.rindex('})();')
    first = first[:close] + (ONLINE / 'campaign-view.js').read_text(encoding='utf-8') + first[close:]
    (output / 'code/js/first-draft.js').write_text(first, encoding='utf-8')
    for area in ('code', 'media'):
        for source in (ROOT / area).rglob('*'):
            if source.is_file():
                target = output / source.relative_to(ROOT)
                if not target.exists():
                    target.parent.mkdir(parents=True, exist_ok=True)
                    link_or_copy(source, target)
    for name in ('campaign.css', 'campaign.mjs'):
        link_or_copy(ONLINE / name, output / 'online-deadlock' / name)

def version_online_scripts(output):
    # Pages caches individual files. Keep the controllers and the wire protocol in one build.
    modules = ('campaign.mjs', 'room.mjs', 'rules.mjs', 'draft-data.mjs')
    controllers = ('code/js/first-draft.js', 'code/js/deadlock-draft.js', 'code/js/season.js', 'code/js/season-atmosphere.js', 'code/js/captain-portraits.js')
    scripts = tuple(f'online-deadlock/{name}' for name in modules) + controllers
    digest = hashlib.sha256()
    for file in scripts:
        digest.update((output / file).read_bytes())
    revision = digest.hexdigest()[:16]
    for name in modules:
        module = output / 'online-deadlock' / name
        source = module.read_text(encoding='utf-8')
        for dependency in modules:
            source = source.replace(f"from './{dependency}'", f"from './{dependency}?v={revision}'")
        module.unlink()  # The original source can be hard-linked into the build directory.
        module.write_text(source, encoding='utf-8')
    for file in ('index.html', 'deadlock.html'):
        page = output / file
        html = page.read_text(encoding='utf-8')
        for script in scripts:
            html = html.replace(f'src="{script}"', f'src="{script}?v={revision}"')
        page.write_text(html, encoding='utf-8')

if __name__ == '__main__':
    build(Path(sys.argv[1]))
