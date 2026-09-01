import React from 'react';
import {
  AbsoluteFill,
  Img,
  OffthreadVideo,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

const ink = '#f4f4f2';
const muted = '#b7b7b1';
const accent = '#a96cff';
const font = 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

const fade = (frame: number, duration: number, edge = 16) =>
  interpolate(frame, [0, edge, duration - edge, duration], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

const Eyebrow: React.FC<{children: React.ReactNode}> = ({children}) => (
  <div style={{fontSize: 28, fontWeight: 700, letterSpacing: 5, textTransform: 'uppercase', color: accent}}>
    {children}
  </div>
);

const BrowserFrame: React.FC<{src: string; dark?: boolean}> = ({src, dark = false}) => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, 150], [1.045, 1], {extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{backgroundColor: dark ? '#050505' : '#e9e9e7', overflow: 'hidden'}}>
      <Img src={staticFile(src)} style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${scale})`}} />
    </AbsoluteFill>
  );
};

const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{fontFamily: font, color: ink}}>
      <BrowserFrame src="site-home.png" dark />
      <AbsoluteFill style={{backgroundColor: '#000', opacity: interpolate(frame, [0, 18, 118, 135], [1, 0, 0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}} />
    </AbsoluteFill>
  );
};

const gameplay = [
  {name: 'Tomba!', platform: 'PlayStation', file: 'tomba.mp4', color: '#f06aa6'},
  {name: 'Super Mario World', platform: 'Super Nintendo', file: 'super-mario-world.mp4', color: '#9768ff'},
  {name: 'Sonic the Hedgehog 2', platform: 'Sega Genesis', file: 'sonic-the-hedgehog-2.mp4', color: '#4aa4c2'},
  {name: 'Metroid Prime Hunters', platform: 'Nintendo DS', file: 'metroid-prime-hunters.mp4', color: '#4caa70'},
] as const;

const GameplayBeat: React.FC<{name: string; platform: string; file: string; color: string; duration: number}> = ({name, platform, file, color, duration}) => {
  const frame = useCurrentFrame();
  const opacity = fade(frame, duration, 12);
  const scale = interpolate(frame, [0, duration], [1.04, 1], {extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{fontFamily: font, color: ink, backgroundColor: '#000', opacity}}>
      <OffthreadVideo
        src={`https://retroportingtoolkit.com/previews/${file}`}
        muted
        style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${scale})`}}
      />
      <AbsoluteFill style={{background: 'linear-gradient(180deg, transparent 42%, rgba(0,0,0,.82) 100%)'}} />
      <div style={{position: 'absolute', left: 100, bottom: 80}}>
        <div style={{display: 'inline-flex', padding: '10px 18px', borderRadius: 999, backgroundColor: color, fontSize: 22, fontWeight: 750}}>{platform}</div>
        <div style={{fontSize: 66, fontWeight: 780, letterSpacing: -2.5, marginTop: 18}}>{name}</div>
      </div>
      <div style={{position: 'absolute', right: 92, bottom: 92, fontSize: 24, color: 'rgba(255,255,255,.72)'}}>Native community port</div>
    </AbsoluteFill>
  );
};

const Catalog: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = fade(frame, 165, 14);
  return (
    <AbsoluteFill style={{fontFamily: font, color: '#171717', opacity}}>
      <BrowserFrame src="site-games.png" />
      <AbsoluteFill style={{background: 'linear-gradient(90deg, rgba(245,245,243,.97) 0%, rgba(245,245,243,.86) 39%, rgba(245,245,243,.08) 70%)'}} />
      <div style={{position: 'absolute', left: 120, top: 310, width: 640, transform: `translateY(${interpolate(frame, [0, 20], [24, 0], {extrapolateRight: 'clamp'})}px)`}}>
        <Eyebrow>Explore the catalog</Eyebrow>
        <div style={{fontSize: 82, lineHeight: 1.02, fontWeight: 780, letterSpacing: -4, marginTop: 26}}>See what already runs.</div>
        <div style={{fontSize: 30, lineHeight: 1.45, color: '#555', marginTop: 30}}>Games, platforms, documentation, and the source projects behind every port.</div>
      </div>
    </AbsoluteFill>
  );
};

const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const reveal = spring({frame, fps, config: {damping: 16, stiffness: 110}});
  return (
    <AbsoluteFill style={{fontFamily: font, backgroundColor: '#090909', color: ink, alignItems: 'center', justifyContent: 'center'}}>
      <div style={{position: 'absolute', width: 760, height: 760, borderRadius: '50%', background: 'radial-gradient(circle, rgba(169,108,255,.20), transparent 66%)', transform: `scale(${.8 + reveal * .2})`}} />
      <div style={{display: 'flex', alignItems: 'center', gap: 28, transform: `translateY(${24 - reveal * 24}px)`, opacity: reveal}}>
        <div style={{width: 92, height: 92, borderRadius: '50%', backgroundColor: ink, color: '#111', display: 'grid', placeItems: 'center', fontSize: 58, fontWeight: 850}}>R</div>
        <div>
          <div style={{fontSize: 68, fontWeight: 780, letterSpacing: -3}}>retroportingtoolkit.com</div>
          <div style={{fontSize: 28, color: muted, marginTop: 12}}>Bring classic console games to modern hardware.</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const Showcase: React.FC = () => (
  <AbsoluteFill style={{backgroundColor: '#000'}}>
    <Sequence from={0} durationInFrames={135}><Intro /></Sequence>
    {gameplay.map((game, index) => (
      <Sequence key={game.file} from={120 + index * 90} durationInFrames={102}>
        <GameplayBeat {...game} duration={102} />
      </Sequence>
    ))}
    <Sequence from={474} durationInFrames={165}><Catalog /></Sequence>
    <Sequence from={615} durationInFrames={105}><Outro /></Sequence>
  </AbsoluteFill>
);
