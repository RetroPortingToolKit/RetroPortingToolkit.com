import React from 'react';
import {Composition} from 'remotion';
import {Showcase} from './Showcase';

export const VideoRoot: React.FC = () => (
  <Composition
    id="RetroPortingToolkitShowcase"
    component={Showcase}
        durationInFrames={450}
    fps={30}
    width={1920}
    height={1080}
  />
);
