import { players } from './draft-data.mjs';
import { applyAction, moveAt, newDraft, permits, validDraft, validTeams } from './rules.mjs';

const $ = id => document.getElementById(id);
const version = 1;
const maxJoinAttempts = 3;
const maxSignalRetries = 2;
const signalTimeout = 12000;
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
  // Supplying both IDs lets PeerJS open its WebSocket without fetching /peerjs/id.
  const peer = new window.Peer(host ? peerId : 'bobrs-guest-' + token());
  const myKey = host ? null : seatKey(room);
  let guestKey = null;
  let guestAcceptsRosters = false;
  let teams = initialTeams;
  let authority = host ? game.initial() : null;
  let link = null;
  let dialing = null;
  let retryTimer = 0;
  let joinAttempts = 0;
  let signalTimer = 0;
  let signalDeadline = 0;
  let signalRetries = 0;
  let signalStopped = false;
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

  function rostersFor(draft) {
    const ids = game.rosterIds?.(draft) ?? teams;
    return ids.map(team => team.map(id => players.find(player => player.id === id)));
  }

  async function render() {
    if (rendering || !opened) return;
    rendering = true;
    try {
      while (latest && latest !== shown) {
        const next = latest;
        const animate = shown !== null && next.rev === shown.rev + 1;
        await view.paint(shown, next, { animate, moveAt, rosters: rostersFor(next) });
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

  function showGame(draft) {
    if (opened) return;
    opened = true;
    if ($('roomLobby')) $('roomLobby').hidden = true;
    $('roomBar').hidden = false;
    view.open(rostersFor(draft), submit, allowed);
  }

  function snapshot(target) {
    // Older campaign clients expect an empty field and read the roster from draft.first.
    const rosters = game.rosterIds ? (guestAcceptsRosters ? game.rosterIds(authority) : []) : teams;
    send(target, 'state', { teams: rosters, draft: authority });
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

  function retry(reason) {
    if (host || blocked || stopped || signalStopped) return;
    if (joinAttempts >= maxJoinAttempts) {
      report(reason + ' Подключение остановлено после трёх попыток. Проверьте вкладку ведущего и обновите страницу.');
      return;
    }
    if (retryTimer) return;
    report(reason + ' Переподключаемся…');
    retryTimer = setTimeout(() => {
      retryTimer = 0;
      if (peer.disconnected) restoreSignal();
      else if (!connected() && !dialing && peer.open) dial();
    }, 2000);
  }

  function lost(connection, reason = 'Связь с ведущим прервана.') {
    if (link !== connection && dialing !== connection) return;
    if (link === connection) link = null;
    if (dialing === connection) dialing = null;
    ready = false;
    peerRev = -1;
    pending = false;
    refresh();
    if (signalStopped) {
      report('Связь с комнатой прервана. PeerJS недоступен. Обновите страницу для новой попытки.');
      return;
    }
    if (host) report('Артемон отключился. Ожидаем переподключения.');
    else retry(reason);
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
        guestAcceptsRosters = message.rosters === true;
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
    if (stopped || blocked || signalStopped || dialing || connected() || joinAttempts >= maxJoinAttempts) return;
    joinAttempts++;
    report(latest ? 'Восстанавливаем комнату…' : 'Устанавливаем связь с ведущим…');
    const connection = peer.connect(peerId, { reliable: true, serialization: 'json' });
    if (!connection) {
      retry('Сигнализация недоступна.');
      return;
    }
    dialing = connection;
    const expiry = setTimeout(() => {
      if (dialing !== connection) return;
      lost(connection, 'Канал WebRTC не открылся.');
      connection.close();
    }, 16000);
    connection.on('open', () => send(connection, 'hello', { key: myKey, rosters: Boolean(game.rosterIds) }));
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
      if (message.type !== 'state' || !game.valid(message.draft) || !game.validTeams(message.teams, message.draft)) return;
      if (!game.rosterIds && teams && JSON.stringify(teams) !== JSON.stringify(message.teams)) return;
      teams = message.teams;
      clearTimeout(expiry);
      clearTimeout(retryTimer);
      retryTimer = 0;
      link = connection;
      dialing = null;
      ready = true;
      joinAttempts = 0;
      showGame(message.draft);
      report('Макарыч подключён');
      receive(message.draft);
      if (game.waitForPeer && shown?.rev === message.draft.rev) {
        send(link, 'shown', { rev: shown.rev });
      }
    });
    connection.on('close', () => { clearTimeout(expiry); lost(connection); });
    connection.on('error', () => { lost(connection); connection.close(); });
  }

  function stopSignal(reason) {
    if (stopped || signalStopped) return;
    signalStopped = true;
    clearTimeout(signalTimer);
    clearTimeout(signalDeadline);
    clearTimeout(retryTimer);
    report(connected() ? reason + ' Текущий канал игры остаётся открыт.' :
      reason + ' Автоподключение остановлено. Обновите страницу для новой попытки.');
  }

  function watchSignal() {
    clearTimeout(signalDeadline);
    signalDeadline = setTimeout(() => {
      if (!peer.open) {
        stopSignal('PeerJS не подтвердил подключение за 12 секунд.');
        if (!peer.destroyed && !peer.disconnected) peer.disconnect();
      }
    }, signalTimeout);
  }

  function restoreSignal() {
    if (stopped || signalStopped || signalTimer || peer.destroyed) return;
    clearTimeout(signalDeadline);
    if (signalRetries >= maxSignalRetries) {
      stopSignal('Связь с сервером PeerJS не восстановилась.');
      return;
    }
    signalTimer = setTimeout(() => {
      signalTimer = 0;
      if (peer.disconnected && !peer.destroyed) {
        signalRetries++;
        try {
          watchSignal();
          peer.reconnect();
        } catch {
          stopSignal('Не удалось повторно открыть WebSocket PeerJS.');
        }
      }
    }, 1800 * (signalRetries + 1));
  }

  peer.on('open', () => {
    clearTimeout(signalDeadline);
    if (signalStopped) return;
    signalRetries = 0;
    if (host) {
      if (!connected()) report(guestKey ? 'Ожидаем переподключения Артемона' : 'Отправьте приглашение Артемону');
    } else dial();
  });
  peer.on('connection', connection => {
    if (host) registerGuest(connection);
    else connection.close();
  });
  peer.on('disconnected', () => {
    if (stopped || signalStopped) return;
    if (!connected()) report('Связь с PeerJS прервана. Восстанавливаем подключение…');
    restoreSignal();
  });
  peer.on('close', () => stopSignal('Соединение PeerJS закрыто.'));
  peer.on('error', error => {
    if (error.type === 'peer-unavailable' && !host) {
      if (dialing) {
        const candidate = dialing;
        lost(candidate, 'Ведущий комнаты пока недоступен.');
        candidate.close();
      } else if (!connected()) retry('Ведущий комнаты пока недоступен.');
      return;
    }
    if (error.type === 'network' || error.type === 'webrtc') return;
    if (['socket-error', 'socket-closed'].includes(error.type)) {
      stopSignal('WebSocket PeerJS не открылся (' + error.type + ').');
    } else if (['server-error', 'invalid-id', 'invalid-key', 'unavailable-id', 'browser-incompatible'].includes(error.type)) {
      stopSignal('Сервер PeerJS отклонил соединение (' + error.type + ').');
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
    clearTimeout(signalDeadline);
    peer.destroy();
  });

  watchSignal();
  if (host) {
    showGame(authority);
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
