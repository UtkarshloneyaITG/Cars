import { useEffect, useRef } from 'react';

const KEY_MAP = {
  w: 'throttle',
  arrowup: 'throttle',
  s: 'reverse',       // S key = reverse
  arrowdown: 'brake', // Arrow-Down = friction brake
  a: 'steer_left',
  arrowleft: 'steer_left',
  d: 'steer_right',
  arrowright: 'steer_right',
  ' ': 'handbrake',   // Space bar
};

export default function useGameInput(sendMessage, isRacing) {
  const keysRef = useRef({});
  const rafRef = useRef(null);
  const sendRef = useRef(sendMessage);
  const racingRef = useRef(isRacing);

  // Keep refs up to date
  useEffect(() => { sendRef.current = sendMessage; }, [sendMessage]);
  useEffect(() => { racingRef.current = isRacing; }, [isRacing]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();
      if (KEY_MAP[key]) {
        e.preventDefault();
        keysRef.current[key] = true;
      }
    };

    const handleKeyUp = (e) => {
      const key = e.key.toLowerCase();
      if (KEY_MAP[key]) {
        keysRef.current[key] = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const loop = () => {
      if (racingRef.current && sendRef.current) {
        const keys = keysRef.current;

        const throttle  = (keys['w'] || keys['arrowup'])   ? 1.0 : 0.0;
        const reverse   = keys['s']         ? 1.0 : 0.0;
        const brake     = keys['arrowdown'] ? 1.0 : 0.0;
        const handbrake = keys[' ']         ? 1.0 : 0.0;
        let steer = 0;
        if (keys['a'] || keys['arrowleft'])  steer -= 1;
        if (keys['d'] || keys['arrowright']) steer += 1;

        sendRef.current({
          type: 'input',
          throttle,
          reverse,
          brake,
          steer,
          handbrake,
        });
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  // Return current input state for any UI consumers
  const getInput = () => {
    const keys = keysRef.current;
    const throttle  = (keys['w'] || keys['arrowup']) ? 1.0 : 0.0;
    const reverse   = keys['s']         ? 1.0 : 0.0;
    const brake     = keys['arrowdown'] ? 1.0 : 0.0;
    const handbrake = keys[' ']         ? 1.0 : 0.0;
    let steer = 0;
    if (keys['a'] || keys['arrowleft'])  steer -= 1;
    if (keys['d'] || keys['arrowright']) steer += 1;
    return { throttle, reverse, brake, steer, handbrake };
  };

  return { getInput };
}
