import React, { Component } from "react";
import PropTypes from "prop-types";
import { autorun } from "mobx";
import { inject, observer } from "mobx-react";
import { Button, Card, CardActions, CardText, CardTitle } from "react-md";

import generateText from "./TextGenerator";

import "./CopyTrainer.css";

const PlayHiddenCard = inject("store")(
  observer(({ store, onShow }) => (
    <Card className="bottomRight">
      <CardTitle
        title="Listen"
        subtitle={store.morse.playing ? "Playing..." : "Waiting..."}
      />
      <CardText>
        <p>Decode the text and press 'Show' when ready</p>
      </CardText>
      <CardActions centered>
        <Button raised primary onClick={onShow}>
          Show
        </Button>
      </CardActions>
    </Card>
  ))
);
PlayHiddenCard.propTypes = {
  onShow: PropTypes.func.isRequired
};

const PlayVisibleCard = inject("store")(
  observer(({ store, text, onCorrect, onIncorrect }) => (
    <Card className="bottomRight">
      <CardTitle
        title="Listen"
        subtitle={store.morse.playing ? "Playing..." : "Waiting..."}
      />
      <CardText>
        <p>
          The text was: <b>{text}</b>
        </p>
      </CardText>
      <CardActions centered>
        <Button raised primary onClick={onCorrect}>
          Correct
        </Button>
        <Button raised primary onClick={onIncorrect}>
          Incorrect
        </Button>
      </CardActions>
    </Card>
  ))
);
PlayVisibleCard.propTypes = {
  text: PropTypes.string.isRequired,
  onCorrect: PropTypes.func.isRequired,
  onIncorrect: PropTypes.func.isRequired
};

const PlayText = inject("store", "morsePlayer")(
  observer(
    class PlayText extends Component {
      state = {
        hidden: true
      };

      playText = () => {
        const { morsePlayer, text } = this.props;
        const { hidden } = this.state;

        if (hidden) {
          this.playCount++;
        }
        morsePlayer.playString(text);
      };

      playLoop = () => {
        if (!this.props.store.morse.playing) {
          if (this.playCount === 0) {
            this.playText();
          } else {
            this.timeout = setTimeout(this.playText, 2000);
          }
        }
      };

      start = () => {
        this.playCount = 0;
        this.autorun = autorun(this.playLoop);
      };

      stop = () => {
        this.autorun();
        clearTimeout(this.timeout);
        this.props.morsePlayer.forceStop();
      };

      componentWillMount() {
        this.start();
      }

      componentWillUnmount() {
        this.stop();
      }

      componentWillReceiveProps(nextProps) {
        if (nextProps.text !== this.props.text) {
          this.stop();
          this.setState({ hidden: true });
        }
      }

      componentDidUpdate(prevProps, prevState) {
        if (prevProps.text !== this.props.text) {
          this.start();
        }
      }

      onResult = success => {
        this.stop();
        this.props.onResult(success, this.playCount);
      };

      render() {
        if (this.state.hidden) {
          return (
            <PlayHiddenCard onShow={() => this.setState({ hidden: false })} />
          );
        } else {
          return (
            <PlayVisibleCard
              text={this.props.text}
              onCorrect={() => this.onResult(true)}
              onIncorrect={() => this.onResult(false)}
            />
          );
        }
      }
    }
  )
);
PlayText.propTypes = {
  onResult: PropTypes.func.isRequired,
  text: PropTypes.string.isRequired
};

const PlayLoop = inject("store")(
  class PlayLoop extends Component {
    state = {
      text: "",
      pattern: ""
    };

    pickText = () => {
      const { text, pattern } = generateText(
        this.props.store.copyTrainer.producers,
        this.state.text
      );
      this.setState({ text, pattern });
    };

    componentDidMount() {
      this.pickText();
    }

    onResult = (success, count) => {
      this.props.store.copyTrainer.patternFeedback(
        this.state.pattern,
        success,
        count
      );
      this.pickText();
    };

    render() {
      const { text } = this.state;
      return <PlayText text={text} onResult={this.onResult} />;
    }
  }
);
PlayLoop.propTypes = {};

const Result = ({ r }) => r.ratio.toFixed(2);

const Producer = ({ p }) =>
  p
    ? p.entries().map(([k, v]) => (
        <li key={k}>
          {k}: <Result r={v} />
        </li>
      ))
    : "";

const CopyTrainer = inject("store", "morsePlayer")(
  observer(
    class CopyTrainer extends Component {
      state = {
        active: false
      };

      start = () => {
        this.setState({ active: true });
      };

      stop = () => {
        this.props.morsePlayer.forceStop();
        this.setState({ active: false });
      };

      render() {
        const { active } = this.state;
        const store = this.props.store.copyTrainer;

        var button;
        if (active) {
          button = (
            <Button raised primary onClick={this.stop}>
              Stop
            </Button>
          );
        } else {
          button = (
            <Button raised primary onClick={this.start}>
              Start
            </Button>
          );
        }
        var entries = [];
        for (let [k, v] of store.producers.entries()) {
          entries.push(
            <li key={k}>
              {k}:
              <ul>
                <Producer p={v} />
              </ul>
            </li>
          );
        }

        return (
          <div>
            <Card>
              <CardTitle title="Copy Trainer" />
              <CardActions centered>{button}</CardActions>
              <CardText>
                Results: <ul>{entries}</ul>
              </CardText>
            </Card>
            {active && <PlayLoop />}
          </div>
        );
      }
    }
  )
);

export default CopyTrainer;
