import { useCallback, useEffect, useRef, useState } from 'react';
import { getCallState, sendSignals, GetCallStateOutputType } from 'zitejs/api';

const ICE = { iceServers: [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }] };
type Signal = { to: string; kind: string; payload: string };

export function useCallMesh(callId: string, me: string, onEnded: (status: string) => void) {
  const [state, setState] = useState<GetCallStateOutputType | null>(null);
  const [local, setLocal] = useState<MediaStream | null>(null);
  const [remotes, setRemotes] = useState<Record<string, MediaStream>>({});
  const [connectedAt, setConnectedAt] = useState<number | null>(null);
  const peers = useRef(new Map<string, RTCPeerConnection>());
  const pendingIce = useRef(new Map<string, RTCIceCandidateInit[]>());
  const outbox = useRef<Signal[]>([]);
  const localRef = useRef<MediaStream | null>(null);
  const endedRef = useRef(onEnded);
  endedRef.current = onEnded;

  const queue = (s: Signal) => outbox.current.push(s);

  const makePeer = useCallback((other: string) => {
    const existing = peers.current.get(other);
    if (existing) return existing;
    const pc = new RTCPeerConnection(ICE);
    localRef.current?.getTracks().forEach((t) => pc.addTrack(t, localRef.current!));
    pc.onicecandidate = (e) => {
      if (e.candidate) queue({ to: other, kind: 'candidate', payload: JSON.stringify(e.candidate.toJSON()) });
    };
    pc.ontrack = (e) => {
      setRemotes((r) => ({ ...r, [other]: e.streams[0] ?? new MediaStream([e.track]) }));
      setConnectedAt((c) => c ?? Date.now());
    };
    peers.current.set(other, pc);
    return pc;
  }, []);

  const dropPeer = (other: string) => {
    peers.current.get(other)?.close();
    peers.current.delete(other);
    setRemotes((r) => {
      const { [other]: _gone, ...rest } = r;
      return rest;
    });
  };

  const flushIce = async (other: string, pc: RTCPeerConnection) => {
    for (const c of pendingIce.current.get(other) ?? []) await pc.addIceCandidate(c).catch(() => {});
    pendingIce.current.delete(other);
  };

  const handleSignal = useCallback(async (s: { from: string; kind: string; payload: string }) => {
    const data = JSON.parse(s.payload);
    if (s.kind === 'offer') {
      const pc = makePeer(s.from);
      await pc.setRemoteDescription(data);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      queue({ to: s.from, kind: 'answer', payload: JSON.stringify(answer) });
      await flushIce(s.from, pc);
    } else if (s.kind === 'answer') {
      const pc = peers.current.get(s.from);
      if (pc && pc.signalingState === 'have-local-offer') {
        await pc.setRemoteDescription(data);
        await flushIce(s.from, pc);
      }
    } else if (s.kind === 'candidate') {
      const pc = peers.current.get(s.from);
      if (pc?.remoteDescription) await pc.addIceCandidate(data).catch(() => {});
      else pendingIce.current.set(s.from, [...(pendingIce.current.get(s.from) ?? []), data]);
    }
  }, [makePeer]);

  // Grab camera + mic once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: { facingMode: 'user' } });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => new MediaStream());
      }
      if (cancelled) return stream.getTracks().forEach((t) => t.stop());
      localRef.current = stream;
      setLocal(stream);
    })();
    return () => {
      cancelled = true;
      localRef.current?.getTracks().forEach((t) => t.stop());
      peers.current.forEach((pc) => pc.close());
      peers.current.clear();
    };
  }, []);

  // Poll call state + signals, and send queued signals
  useEffect(() => {
    if (!local) return;
    let stop = false;
    const tick = async () => {
      if (outbox.current.length) {
        const batch = outbox.current.splice(0);
        await sendSignals({ callId, signals: batch }).catch(() => outbox.current.unshift(...batch));
      }
      const s = await getCallState({ callId }).catch(() => null);
      if (!s || stop) return;
      setState(s);
      if (['Ended', 'Missed', 'Declined'].includes(s.status)) return endedRef.current(s.status);
      for (const sig of s.signals) await handleSignal(sig).catch(() => {});
      const joinedIds = s.joined.map((p) => p.id).filter((id) => id !== me);
      for (const other of joinedIds) {
        if (!peers.current.has(other) && me < other) {
          const pc = makePeer(other);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          queue({ to: other, kind: 'offer', payload: JSON.stringify(offer) });
        }
      }
      [...peers.current.keys()].filter((id) => !joinedIds.includes(id)).forEach(dropPeer);
    };
    const id = setInterval(tick, 1500);
    tick();
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [local, callId, me, handleSignal, makePeer]);

  return { state, local, remotes, connectedAt };
}
