import React, { Component } from "react";
import { ReactComponent as Rooster } from "../assets/rooster.svg";
import { ReactComponent as Bmc } from "../assets/bmc.svg";
import styled from "styled-components";
import { withStyles } from "@material-ui/core/styles";
import Slider from "@material-ui/core/Slider";
import { faPlayCircle, faStopCircle } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

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
      firstStart: false,
      isPlaying: false,
      tempo: 130,
      division: 4,
      counter: 0,
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

      if (metronomeCounter % 2 === 0) {
        this.setState({ counter: metronomeCounter / 2 });
        console.log("set");
      }
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
    metronomeCounter = 0;
    if (!this.state.firstStart) {
      this.setState({ firstStart: true });
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
      <MainContainer className="noselect">
        <ContentWrap>
          <RoosterContainer>
            <Rooster height={"100%"} />
            {this.state.isPlaying && (
              <>
                {this.state.counter === 0 && <div className="cluck1">Cluck!</div>}
                {this.state.counter === 1 && <div className="cluck2">Cluck!</div>}
                {this.state.counter === 2 && <div className="cluck3">Cluck!</div>}
                {this.state.counter === 3 && <div className="cluck4">Cluck!</div>}
              </>
            )}
          </RoosterContainer>
          <h1>Cluck-tronome</h1>
          <h2>by András Polyák</h2>
          <br />

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
            {/* <BeatButton isActive={this.state.division === -1} onClick={() => this.setState({ division: -1 })}>
              UnCluck
            </BeatButton> */}
          </BeatsWrapper>

          <Unmute started={this.state.firstStart && "started"}>Unmute your device!</Unmute>

          {!this.state.isPlaying ? (
            <FaRoundButton onClick={() => this.playStartTheWorker()}>
              <div className="cluckhere">Cluck Here</div> <FontAwesomeIcon className="bgwhite" icon={faPlayCircle} />
            </FaRoundButton>
          ) : (
            <FaRoundButton onClick={() => this.stopPlaying()}>
              <div className="cluckhere">Un-Cluck</div> <FontAwesomeIcon className="bgwhite" icon={faStopCircle} />
            </FaRoundButton>
          )}

          <BmcWrapper>
            <div className="laugh">If you laughed, </div>

            <a href="https://www.buymeacoffee.com/andrew91" target="_blank" rel="noopener noreferrer">
              <Bmc height={30} className="mr-4 ml-4" />
            </a>
          </BmcWrapper>
        </ContentWrap>
        <Footer>
          <FooterContainer>
            <FooterElement>
              my vocal warmup app -&nbsp;
              <StyledLink href="https://vocalroutine.com" target="_blank">
                vocalroutine.com
              </StyledLink>
            </FooterElement>
            <FooterElement>
              web development & about -&nbsp;
              <StyledLink href="http://polyakandras.hu" target="_blank">
                polyakandras.hu
              </StyledLink>
            </FooterElement>
          </FooterContainer>
        </Footer>
      </MainContainer>
    );
  }
}

export default Clucker;

const BmcWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;

  .laugh {
    font-weight: 300;
    color: #4d4d4d;
    font-family: "Kalam", cursive;
    font-family: "Montserrat", sans-serif;
    font-size: 17px;
    margin-top: 4px;
  }

  a {
    display: flex;
    align-items: center;
    justify-content: center;
    /* border: 1px solid #efd956; */
    border-radius: 8px;
    padding: 5px 8px;
    margin-left: 8px;
  }

  padding: 0;
  margin: 30px auto 0;
  text-align: center;

  a {
    text-decoration: none;
  }

  @media (max-width: 580px) {
    margin-top: 20px;
  }
  @media (max-width: 400px) {
    margin-top: 16px;
    margin-bottom: 20px;
  }
`;

const MainContainer = styled.div`
  position: relative;
  min-height: 100vh;
  min-height: calc(var(--vh, 1vh) * 100);

  h1 {
    text-align: center;
    color: #333;
    font-family: "Sigmar One", cursive;
    @media (max-width: 400px) {
      font-size: 28px;
    }
  }

  h2 {
    font-size: 22px;
    text-align: center;
    font-weight: 400;
    color: #4d4d4d;
    font-family: "Kalam", cursive;
    margin-top: -7px;
  }
`;

const ContentWrap = styled.div`
  padding-bottom: 2.5rem; /* Footer height */
  padding-top: 30px;

  @media (max-width: 1024px) {
    padding-top: 10px;
  }
  @media (max-width: 768px) {
    padding-bottom: 3.8rem; /* Footer height */
  }

  max-width: 90%;
  margin: 0 auto;

  display: flex;
  flex-direction: column;
  justify-content: center;
`;

const RoosterContainer = styled.div`
  position: relative;
  height: 200px;
  width: 100%;
  max-width: 400px;
  text-align: center;

  margin: 0 auto;

  @media (max-width: 580px) {
    height: 130px;
  }

  .cluck1 {
    position: absolute;
    top: 30px;
    right: 20px;
    font-family: "Kalam", cursive;
    font-size: 22px;
    font-weight: 400;
  }
  .cluck2 {
    position: absolute;
    top: 28px;
    right: 36px;
    font-family: "Kalam", cursive;
    font-size: 22px;
    font-weight: 400;
  }
  .cluck3 {
    position: absolute;
    top: 24px;
    right: 25px;
    font-family: "Kalam", cursive;
    font-size: 22px;
    font-weight: 400;
  }
  .cluck4 {
    position: absolute;
    top: 40px;
    right: 30px;
    font-family: "Kalam", cursive;
    font-size: 22px;
    font-weight: 400;
  }
`;

const Unmute = styled.div`
  color: #333;
  text-align: center;
  font-family: "Montserrat", sans-serif;
  font-size: 18px;
  font-weight: 400;
  height: 25px;
  opacity: 0;

  ${(props) => props.started === "started" && "animation: fadeOut 4s 0.4s both"};

  @media (max-width: 580px) {
    height: 16px;
    font-size: 16px;
  }
`;

const TempoBpmWrapper = styled.div`
  margin: 14px 0 -4px 0;

  @media (max-width: 580px) {
    margin-top: 0px;
  }

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
  grid-template-columns: 1fr 1fr 1fr;
  gap: 4px;

  margin: 20px auto 12px;

  @media (max-width: 580px) {
    margin-top: 10px;
  }

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

const SliderWrapper = styled.div`
  margin: 0 auto;
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

const FaRoundButton = styled.button`
  /* background: #a6c2da; */
  background: #3a90ca;
  color: #f45d5d;

  font-size: 50px;

  width: 100%;
  max-width: 600px;

  margin: 4px auto 0;

  @media (max-width: 580px) {
    font-size: 40px;
  }

  padding: 5px;
  padding-right: 0;

  border: none;
  border-radius: 16px;

  cursor: pointer;

  display: flex;
  align-items: center;
  justify-content: center;

  :hover {
    background: #0071bc;
    color: #f73636;
  }

  .bgwhite {
    border-radius: 50%;
    background: white;
    padding: 2px;
  }

  .cluckhere {
    font-family: "Sigmar One", cursive;
    margin-right: 16px;
    font-size: 40px;
    color: #fff;

    @media (max-width: 580px) {
      font-size: 30px;
    }
  }
`;

const Footer = styled.footer`
  position: absolute;
  bottom: 0;
  width: 100%;
  height: 2.5rem;
  @media (max-width: 768px) {
    height: 3.8rem;
  }
  background: white;

  font-family: "Montserrat", sans-serif;
  font-weight: bold;
  color: #ff3d3d;
`;

const FooterContainer = styled.div`
  margin: 0 auto;
  padding-right: 20px;
  height: 100%;

  display: flex;
  align-items: center;
  justify-content: flex-end;

  width: 100%;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-end;
    justify-content: center;
    font-size: 15px;
  }
  @media (max-width: 400px) {
    font-size: 14px;
  }
  @media (max-width: 350px) {
    font-size: 12px;
  }
`;

const FooterElement = styled.span`
  display: inline-block;

  margin-right: 20px;

  @media (max-width: 768px) {
    margin: 0;
    padding: 2px 0;
  }

  :last-of-type {
    margin-right: 0;
  }
`;

const StyledLink = styled.a`
  color: #005288;
  text-decoration: underline;
  font-weight: bold;
`;
