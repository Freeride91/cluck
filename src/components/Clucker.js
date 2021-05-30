import React, { Component } from "react";
import { ReactComponent as Rooster } from "../assets/rooster.svg";
import { ReactComponent as Play } from "../assets/play.svg";
import { ReactComponent as Pause } from "../assets/pause.svg";
import styled from "styled-components";
import { withStyles } from "@material-ui/core/styles";
import Slider from "@material-ui/core/Slider";

//-----------------------------------------------------------------------------
// WebAudio Stuff
let notesInQueue = []; // the notes that have been put into the web audio, and may or may not have played yet. {noteIndex, time}
let lastNoteDrawnIndex = -1;

let unlocked = false;
let SCHEDULEAHEADTIME = 0.07; // How far ahead to schedule audio (sec), This is calculated from LOOKAHEAD, and overlaps with next interval (in case the timer is late)
let nextNoteTIME = 0.0; // when the next note is due.
let metronomeCounter = 0;
let highChanger = false;

export class Clucker extends Component {
  constructor(props) {
    super(props);

    this.requestAnimationFrameRef = React.createRef();

    this.state = {
      isPlaying: false,
      tempo: 130,
      division: 4,
    };
  }

  initializationOnMount = async () => {
    this.props.workerRef.current.onmessage = (e) => {
      if (e.data === "tick") {
        this.workerTick_ScheduleSoundHere();
      } else console.log("message: " + e.data);
    };
  };

  componentDidMount() {
    this.initializationOnMount();
  }

  suspendContext = () => {
    this.props.audioCtx.suspend();
  };
  resumeContext = () => {
    this.props.audioCtx.resume();
  };

  // play silent buffer to unlock the audio
  unlockAudioBuffer = () => {
    let buffer = this.props.audioCtx.createBuffer(1, 1, 44100);
    let sourceNode = this.props.audioCtx.createBufferSource();
    sourceNode.buffer = buffer;
    sourceNode.start(this.props.audioCtx.currentTime + 0.2);
    unlocked = true;
  };

  nextNoteTimeSetup = () => {
    let secondsPerBeat = 60.0 / this.state.tempo; // this picks up the CURRENT tempo value to CALC
    nextNoteTIME += 0.5 * secondsPerBeat;
  };

  workerTick_ScheduleSoundHere = () => {
    const { division } = this.state;
    const { schedulePlaySound, mTicks } = this.props;

    // while there are notes that will need to play before the next interval, schedule them and --> nextNoteTimeSetup();
    while (nextNoteTIME < this.props.audioCtx.currentTime + SCHEDULEAHEADTIME) {
      if (division === -1) {
        if (metronomeCounter === 0) schedulePlaySound(mTicks.tick, nextNoteTIME, 0.8);
        if (metronomeCounter === 2) schedulePlaySound(mTicks.tick, nextNoteTIME, 0.8);

        metronomeCounter++;

        if (metronomeCounter % 4 === 0) metronomeCounter = 0;

        this.nextNoteTimeSetup();
        return;
      }

      // HIGH LONG NOTE :D
      if (metronomeCounter === 0 && division !== 0) {
        schedulePlaySound(highChanger ? mTicks.ch1 : mTicks.ch2, nextNoteTIME, highChanger ? 0.8 : 0.7);
        highChanger = !highChanger;
      }

      if (metronomeCounter === 0 && division === 0) {
        schedulePlaySound(mTicks.c3, nextNoteTIME, 0.8);
      }

      if (metronomeCounter === 2) schedulePlaySound(mTicks.c2, nextNoteTIME, 0.8);
      if (metronomeCounter === 4) schedulePlaySound(mTicks.c3, nextNoteTIME, 0.8);
      if (metronomeCounter === 6) schedulePlaySound(mTicks.c4, nextNoteTIME, 0.8);

      metronomeCounter++;

      if (division === 3 && metronomeCounter % 6 === 0) metronomeCounter = 0;
      if (division === 4 && metronomeCounter % 8 === 0) metronomeCounter = 0;
      if (division === 0 && metronomeCounter % 8 === 0) metronomeCounter = 0;

      this.nextNoteTimeSetup();
    }
  };

  //MAIN WORKER START FUNCTION
  playStartTheWorker = () => {
    if (!unlocked) {
      this.unlockAudioBuffer();
    }

    if (!this.state.isPlaying) {
      this.setState({ isPlaying: true });
      // to start a little bit later, to prepare the browser
      nextNoteTIME = this.props.audioCtx.currentTime + 0.3;
      this.props.workerRef.current.postMessage("start");
    }
  };

  stopPlaying = () => {
    this.props.workerRef.current.postMessage("stop");
    this.setState({ isPlaying: false });
  };

  render() {
    return (
      <MainContainer>
        <ContentWrap>
          <Rooster height={200} />
          <h1>Cluck-tronome</h1>
          <h2>by András Polyák</h2>
          <br />
          {/* <White> */}
          <TempoBpmWrapper>
            {this.state.tempo}
            <span className="bpm">BPM</span>
          </TempoBpmWrapper>
          <SliderWrapper>
            <PrettoSlider
              min={60}
              max={200}
              step={2}
              value={this.state.tempo}
              onChange={(e, value) => {
                if (value !== this.state.tempo) {
                  this.setState({
                    tempo: value,
                  });
                }
              }}
            />
          </SliderWrapper>
          {/* </White> */}
          <BeatsWrapper>
            <BeatButton isActive={this.state.division === 0} onClick={() => this.setState({ division: 0 })}>
              None
            </BeatButton>
            <BeatButton isActive={this.state.division === 3} onClick={() => this.setState({ division: 3 })}>
              3/4
            </BeatButton>
            <BeatButton isActive={this.state.division === 4} onClick={() => this.setState({ division: 4 })}>
              4/4
            </BeatButton>
            <BeatButton isActive={this.state.division === -1} onClick={() => this.setState({ division: -1 })}>
              UnCluck
            </BeatButton>
          </BeatsWrapper>
          <br />
          <br />
          {!this.state.isPlaying ? (
            <RoundButton onClick={() => this.playStartTheWorker()}>
              <SvgWrapper>
                <Play height={40} fill={"#fff"} />
              </SvgWrapper>
            </RoundButton>
          ) : (
            <RoundButton onClick={() => this.stopPlaying()}>
              <Pause height={40} fill={"#fff"} />
            </RoundButton>
          )}
        </ContentWrap>
        <Footer>
          &copy; &nbsp; <b>2021</b>
          <StyledLink href="http://polyakandras.hu" target="_blank">
            &nbsp;
            <b>
              <u>polyakandras.hu</u>
            </b>
          </StyledLink>
        </Footer>
      </MainContainer>
    );
  }
}

export default Clucker;

const MainContainer = styled.div`
  position: relative;
  min-height: 100vh;

  h1 {
    text-align: center;
    color: #333;
    font-family: "Sigmar One", cursive;
  }

  h2 {
    font-size: 22px;
    text-align: center;
    font-weight: 400;
    color: #4d4d4d;
    font-family: "Indie Flower", cursive;
    font-family: "Kalam", cursive;
    margin-top: -4px;
  }
`;

const ContentWrap = styled.div`
  padding-bottom: 2.5rem; /* Footer height */
  padding-top: 30px;

  max-width: 90%;
  margin: 0 auto;

  display: flex;
  flex-direction: column;
  justify-content: center;
`;

const Footer = styled.footer`
  position: absolute;
  bottom: 0;
  width: 100%;
  height: 2.5rem;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;

  border-top: 1px solid #dedede;

  font-family: "Montserrat", sans-serif;
  font-weight: 400;
`;

const StyledLink = styled.a`
  color: #0071bd;
  text-decoration: none;
`;

const SliderWrapper = styled.div`
  margin: 4px auto 0;
  width: 100%;
  max-width: 600px;
`;

const PrettoSlider = withStyles({
  root: {
    color: "#003a60",
    height: 0,
    // padding: "4px 4px",
    marginBottom: "4px",
  },
  thumb: {
    height: 22,
    width: 22,
    backgroundColor: "#fff",
    border: "2px solid currentColor",
    marginTop: -6,
    marginLeft: -12,
    "&:focus, &:hover, &$active": {
      boxShadow: "inherit",
    },
  },
  active: {},
  valueLabel: {
    left: "calc(-50% + 4px)",
  },
  track: {
    height: 10,
    borderRadius: 4,
  },
  rail: {
    height: 10,
    borderRadius: 4,
  },
})(Slider);

const RoundButton = styled.button`
  height: 70px;
  width: 70px;

  padding: 20px;
  margin: 4px auto;

  background-color: #f45d5d;
  color: white;
  font-size: 18px;
  font-weight: bold;
  text-transform: uppercase;

  border: none;
  text-decoration: none;
  border-radius: 50%;

  display: flex;
  align-items: center;
  justify-content: center;
`;

const SvgWrapper = styled.div`
  padding-left: 9px;
  padding-top: 4px;
`;

const TempoBpmWrapper = styled.div`
  margin: 22px 0 0 0;
  text-align: center;
  color: #333;
  font-family: "Montserrat", sans-serif;
  font-size: 50px;

  .bpm {
    font-size: 30px;
  }
`;

const BeatsWrapper = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr;
  gap: 4px;

  margin: 36px auto 12px;

  width: 100%;
  max-width: 600px;
`;

const BeatButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;

  font-family: "Montserrat", sans-serif;
  font-weight: 400;

  cursor: pointer;

  border-radius: 5px;

  border: 1px solid #5d5d5d;
  padding: 10px;

  background: ${(props) => (props.isActive ? "#d1e1f3" : "#fff")};
  font-weight: ${(props) => props.isActive && 600};
`;
