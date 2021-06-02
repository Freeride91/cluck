import React, { useEffect, useState } from "react";
import { AudioContext } from "standardized-audio-context";
import worker from "./worker.js";
import WebWorker from "./workerSetup";
import Clucker from "./components/Clucker";
import styled from "styled-components";

const audioCtx = new AudioContext();
let LOOKAHEAD = 25.0; // How frequently to call scheduling function (in milliseconds)

function App() {
  const WorkerRef = React.useRef();
  const [isLoading, setIsLoading] = useState(true);
  const [mTicks, setMTicksick] = useState(null);

  const fetchAudioBufferByUrl = async (url) => {
    const data = await fetch(url, { mode: "no-cors" });
    const arrayBuffer = await data.arrayBuffer();
    const decodedAudio = await audioCtx.decodeAudioData(arrayBuffer);
    return decodedAudio;
  };

  useEffect(() => {
    const setDocHeight = () => {
      let vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty("--vh", `${vh}px`);
    };

    setDocHeight();

    window.addEventListener("orientationchange", () => {
      setDocHeight();
    });

    window.addEventListener("resize", () => {
      setDocHeight();
    });

    WorkerRef.current = new WebWorker(worker);
    WorkerRef.current.postMessage({ interval: LOOKAHEAD });

    let ticks = null;
    async function fetchData() {
      let ch1 = await fetchAudioBufferByUrl("./cluck_hi1.mp3");
      let ch2 = await fetchAudioBufferByUrl("./cluck_hi2.mp3");
      let c2 = await fetchAudioBufferByUrl("./cluck2.mp3");
      let c3 = await fetchAudioBufferByUrl("./cluck2.mp3");
      let c4 = await fetchAudioBufferByUrl("./cluck4.mp3");
      let tick = await fetchAudioBufferByUrl("./tick_sweet.mp3");

      ticks = {
        ch1,
        ch2,
        c2,
        c3,
        c4,
        tick,
      };
    }
    fetchData().then(() => {
      setMTicksick(ticks);
      setIsLoading(false);
    });
  }, []);

  const schedulePlaySound = (buffer, time, gainVal = 0.6) => {
    let source = audioCtx.createBufferSource();

    let gainNode = audioCtx.createGain();
    gainNode.gain.value = gainVal;

    source.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    source.buffer = buffer;
    source.start(time);
  };

  return (
    <>
      {isLoading ? (
        <Loading>
          <h1>loading...</h1>
        </Loading>
      ) : (
        <Clucker workerRef={WorkerRef} audioCtx={audioCtx} mTicks={mTicks} schedulePlaySound={schedulePlaySound} />
      )}
    </>
  );
}

export default App;

const Loading = styled.div`
  height: 90vh;
  display: flex;
  justify-content: center;
  align-items: center;
`;
