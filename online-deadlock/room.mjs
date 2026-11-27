import { players } from './draft-data.mjs';
import { applyAction, moveAt, newDraft, permits, validDraft, validTeams } from './rules.mjs';

const $ = id => document.getElementById(id);
const version = 1;
const idPattern = /^[a-f0-9]{32}$/;
const token = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), byte =>
  byte.toString(16).padStart(2, '0')).join('');
export const roomToken = token;
const legacyGame = {
  view: window.DeadlockRoomView,
  initial: newDraft,
  valid: validDraft,
  validTeams,
  permits,
  apply: applyAction,
};

function launch() {
  if (!location.hash) return null;
  if (location.hash.length > 1024) throw new Error('Ссылка комнаты повреждена.');
  const query = new URLSearchParams(location.hash.slice(1));
  const teams = query.get('teams');
  const room = query.get('room');
  if (teams !== null && room === null) {
    let roster;
    try { roster = JSON.parse(teams); } catch {}
    if (!validTeams(roster)) throw new Error('Составы не получены. Откройте онлайн-режим из итогов первого драфта.');
    history.replaceState(null, '', location.pathname);
    return { side: 0, room: token(), teams: roster };
  }
  if (teams === null && idPattern.test(room ?? '')) return { side: 1, room };
  throw new Error('Ссылка комнаты повреждена.');
}

function seatKey(room) {
  const name = 'bobrs-deadlock-seat:' + room;
  const key = token();
  try {
    const saved = localStorage.getItem(name);
    if (idPattern.test(saved ?? '')) return saved;
    localStorage.setItem(name, key);
  } catch {
    // The current tab can still reconnect when storage is unavailable.
  }
  return key;
}

export function openRoom({ side, room, teams: initialTeams, game = legacyGame, invitationKey = 'room' }) {
  const { view } = game;
  const peerId = (invitationKey === 'campaign' ? 'bobrs-campaign-' : 'bobrs-deadlock-') + room;
  if (typeof window.Peer !== 'function' || typeof RTCPeerConnection !== 'function') {
    throw new Error('Этот браузер не предоставил PeerJS или WebRTC. Откройте ссылку в браузере с WebRTC.');
  }

  const host = side === 0;
  const peer = new window.Peer(host ? peerId : undefined);
  const myKey = host ? null : seatKey(room);
  let guestKey = null;
  let teams = initialTeams;
  let authority = host ? game.initial() : null;
  let link = null;
  let dialing = null;
  let retryTimer = 0;
  let lastPacket = 0;
  let blocked = false;
  let stopped = false;
  let opened = false;
  let ready = false;
  let pending = false;
  let latest = null;
  let shown = null;
  let rendering = false;
  let peerRev = -1;

  const role = host ? 'Макарыч' : 'Артемон';
  const report = message => {
    const status = role + ' · ' + message;
    if ($('roomStatus').textContent !== status) $('roomStatus').textContent = status;
    if ($('lobbyStatus')) $('lobbyStatus').textContent = message;
  };
  const connected = () => ready && link?.open;
  const synced = () => !game.waitForPeer || !host || peerRev === authority.rev;
  const allowed = (kind, hero) => Boolean(connected() && !pending && !rendering && shown?.rev === latest?.rev &&
    synced() && game.permits(shown, side, kind, hero));

  function send(connection, type, data = {}) {
    if (!connection?.open) return false;
    try {
      connection.send({ v: version, type, ...data });
      return true;
    } catch {
      connection.close();
      return false;
    }
  }

  function refresh() {
    if (opened) view.refresh();
  }

  async function render() {
    if (rendering || !opened) return;
    rendering = true;
    try {
      while (latest && latest !== shown) {
        const next = latest;
        const animate = shown !== null && next.rev === shown.rev + 1;
        await view.paint(shown, next, { animate, moveAt });
        shown = next;
        if (host && next === authority) {
          const settled = game.settle?.(next);
          if (settled) publish(settled);
        }
        if (!host && game.waitForPeer) send(link, 'shown', { rev: shown.rev });
      }
    } catch (error) {
      pending = true;
      report('Не удалось отобразить драфт. Обновите страницу или переподключитесь.');
      console.error('Deadlock room render failed', error);
    } finally {
      rendering = false;
      refresh();
    }
  }

  function receive(draft) {
    if (!game.valid(draft) || (latest && draft.rev < latest.rev)) return;
    pending = false;
    if (!latest || draft.rev > latest.rev) latest = draft;
    void render();
    refresh();
  }

  function showGame() {
    if (opened) return;
    opened = true;
    if ($('roomLobby')) $('roomLobby').hidden = true;
    $('roomBar').hidden = false;
    const roster = teams.map(team => team.map(id => players.find(player => player.id === id)));
    view.open(roster, submit, allowed);
  }

  function snapshot(target) {
    send(target, 'state', { teams, draft: authority });
  }

  function accept(sideOfSender, action) {
    if (!connected()) return;
    const next = synced() && game.apply(authority, sideOfSender, action,
      () => (crypto.getRandomValues(new Uint8Array(1))[0] & 1) ? 'tails' : 'heads');
    if (next) publish(next);
    else {
      receive(authority);
      snapshot(link);
    }
  }

  function publish(next) {
    authority = next;
    receive(next);
    snapshot(link);
  }

  function submit(kind, hero) {
    if (!allowed(kind, hero)) return;
    pending = true;
    refresh();
    const action = { kind, hero, rev: latest.rev };
    if (host) accept(0, action);
    else if (!send(link, 'action', { action })) lost(link);
  }

  function retry(message) {
    if (host || blocked || stopped) return;
    report(message);
    if (retryTimer) return;
    retryTimer = setTimeout(() => {
      retryTimer = 0;
      if (peer.disconnected) restoreSignal();
      else if (!connected() && !dialing && peer.open) dial();
    }, 2000);
  }

  function lost(connection) {
    if (link !== connection && dialing !== connection) return;
    if (link === connection) link = null;
    if (dialing === connection) dialing = null;
    ready = false;
    peerRev = -1;
    pending = false;
    refresh();
    if (host) report('Артемон отключился. Ожидаем переподключения.');
    else retry('Связь с ведущим прервана. Переподключаемся…');
  }

  function reject(connection) {
    send(connection, 'occupied');
    setTimeout(() => connection.close(), 700);
  }

  function registerGuest(connection) {
    const expiry = setTimeout(() => {
      if (link !== connection) connection.close();
    }, 12000);
    connection.on('data', message => {
      if (message?.v !== version) return;
      if (message.type === 'hello') {
        if (!idPattern.test(message.key ?? '') || (guestKey !== null && guestKey !== message.key)) {
          reject(connection);
          return;
        }
        guestKey = message.key;
        const previous = link;
        link = connection;
        peerRev = -1;
        if (previous && previous !== connection) previous.close();
        clearTimeout(expiry);
        lastPacket = Date.now();
        ready = true;
        report('Артемон подключён');
        snapshot(connection);
        refresh();
        return;
      }
      if (link !== connection || !ready) return;
      lastPacket = Date.now();
      if (message.type === 'shown' && message.rev === authority.rev) {
        peerRev = message.rev;
        refresh();
      }
      if (message.type === 'action') accept(1, message.action);
    });
    connection.on('close', () => { clearTimeout(expiry); lost(connection); });
    connection.on('error', () => { lost(connection); connection.close(); });
  }

  function dial() {
    if (stopped || blocked || dialing || connected()) return;
    report(latest ? 'Восстанавливаем комнату…' : 'Устанавливаем связь с ведущим…');
    const connection = peer.connect(peerId, { reliable: true, serialization: 'json' });
    if (!connection) {
      retry('Сигнализация недоступна. Повторяем подключение…');
      return;
    }
    dialing = connection;
    const expiry = setTimeout(() => {
      if (dialing !== connection) return;
      lost(connection);
      connection.close();
      report('Канал WebRTC не открылся. Повторяем подключение…');
    }, 16000);
    connection.on('open', () => send(connection, 'hello', { key: myKey }));
    connection.on('data', message => {
      if (message?.v !== version || (link !== connection && dialing !== connection)) return;
      if (message.type === 'occupied') {
        blocked = true;
        clearTimeout(expiry);
        lost(connection);
        connection.close();
        report('Место Артемона занято. Для восстановления откройте ссылку в прежнем браузере.');
        return;
      }
      lastPacket = Date.now();
      if (message.type !== 'state' || !game.validTeams(message.teams) || !game.valid(message.draft)) return;
      if (teams && JSON.stringify(teams) !== JSON.stringify(message.teams)) return;
      teams = message.teams;
      clearTimeout(expiry);
      clearTimeout(retryTimer);
      retryTimer = 0;
      link = connection;
      dialing = null;
      ready = true;
      showGame();
      report('Макарыч подключён');
      receive(message.draft);
      if (game.waitForPeer && shown?.rev === message.draft.rev) {
        send(link, 'shown', { rev: shown.rev });
      }
    });
    connection.on('close', () => { clearTimeout(expiry); lost(connection); });
    connection.on('error', () => { lost(connection); connection.close(); });
  }

  let signalTimer = 0;
  function restoreSignal() {
    if (stopped || signalTimer || peer.destroyed) return;
    signalTimer = setTimeout(() => {
      signalTimer = 0;
      if (peer.disconnected && !peer.destroyed) peer.reconnect();
    }, 1800);
  }

  peer.on('open', () => {
    if (host) {
      if (!connected()) report(guestKey ? 'Ожидаем переподключения Артемона' : 'Отправьте приглашение Артемону');
    } else dial();
  });
  peer.on('connection', connection => {
    if (host) registerGuest(connection);
    else connection.close();
  });
  peer.on('disconnected', () => {
    if (!connected()) report('Связь с PeerJS прервана. Восстанавливаем подключение…');
    restoreSignal();
  });
  peer.on('error', error => {
    if (error.type === 'peer-unavailable' && !host) {
      if (dialing) {
        const candidate = dialing;
        lost(candidate);
        candidate.close();
      }
      retry('Ведущий комнаты пока недоступен. Повторяем подключение…');
      report('Ведущий комнаты пока недоступен. Повторяем подключение…');
      return;
    }
    if (connected()) return;
    if (peer.destroyed) {
      report('PeerJS не подключился (' + error.type + '). Обновите страницу для новой попытки.');
    } else {
      report('Ошибка PeerJS (' + error.type + '). Восстанавливаем подключение…');
      restoreSignal();
    }
  });

  const heartbeat = setInterval(() => {
    if (!connected()) return;
    if (Date.now() - lastPacket > 45000) {
      const dead = link;
      lost(dead);
      dead.close();
    } else send(link, 'pulse');
  }, 5000);
  window.addEventListener('pagehide', event => {
    if (event.persisted) return;
    stopped = true;
    clearInterval(heartbeat);
    clearTimeout(retryTimer);
    clearTimeout(signalTimer);
    peer.destroy();
  });

  if (host) {
    showGame();
    receive(authority);
    report('Подключаемся к PeerJS…');
    const invitation = new URL(location.href);
    invitation.hash = new URLSearchParams({ [invitationKey]: room }).toString();
    const input = $('inviteUrl');
    input.value = invitation.href;
    $('roomInvite').hidden = false;
    $('roomInvite').open = true;
    $('copyInvite').onclick = async () => {
      try {
        await navigator.clipboard.writeText(input.value);
        $('copyStatus').textContent = 'Ссылка скопирована.';
        $('roomInvite').open = false;
      } catch {
        input.focus();
        input.select();
        $('copyStatus').textContent = 'Скопируйте выделенную ссылку.';
      }
    };
  } else report('Подключаемся к PeerJS…');
}

try {
  const options = $('roomLobby') ? launch() : null;
  if (options) openRoom(options);
} catch (error) {
  $('lobbyStatus').textContent = error.message;
}
