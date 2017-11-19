import { action, extendObservable } from 'mobx';
import 'seedrandom'

import { PRODUCERS } from '../TextProducers';


Math.seedrandom();

function weightedChoice(weights) {
  const weightSum = weights.reduce((sum, w) => sum + w)
  let choice = Math.floor(Math.random() * weightSum) + 1
  let idx = weights.length - 1
  while (choice > 0 && idx > 0) {
    choice -= weights[idx]
    idx -= 1
  }
  return idx
}

class ResultTracker {
  constructor() {
    this.success = 0;
    this.total = 0;
  }

  record(success, count) {
    this.total += count;
    if (success) {
      this.success++;
    }
  }

  get ratio() {
    if (this.total === 0) {
      return 0;
    } else {
      return this.success / this.total;
    }
  }

  get pickProbability() {
    return Math.sin(Math.PI * this.ratio);
  }
}

class CopyTrainerStore {
  constructor(rootStore) {
    this.rootStore = rootStore

    extendObservable(this, {
      repeaters: {}, // 1: resultTracker, 2: resultTracker, ...
      producers: {}, // 'letters': { 1: resultTracker }, 'words': { 1: resultTracker, 2: resultTracker }, ...
    })
  }

  getCandidates(results, bootstrap) {
    var candidates = {};
    if (!results) {
      return { [bootstrap]: 1 }
    }
    for (let k of Object.keys(results)) {
      candidates[k] = results[k].pickProbability;
    }
    if (!(bootstrap in candidates)) {
      candidates[bootstrap] = 1;
    }
    return candidates;
  }

  pickCandidate(candidates) {
    const k = Object.keys(candidates);
    const r = weightedChoice(Object.values(candidates));
    return k[r];
  }

  pickRepeater() {
    const candidates = this.getCandidates(this.repeaters, 2);
    return this.pickCandidate(candidates);
  }

  fillSlot(total, index) {
    // weighted candidates to fill the slot with
    var candidates = {};
    // values returned by each candidate
    var values = {};
    for (const [name, func] of Object.entries(PRODUCERS)) {
      let c = this.getCandidates(this.producers[name], 1);
      for (const [size, prob] of Object.entries(c)) {
        let val = func(parseInt(size, 10), total, index);
        // val is null if the producer doesn't work for these parameters
        if (val !== null) {
          const key = name + ":" + size;
          candidates[key] = prob;
          values[key] = val;
        }
      }
    }
    const winner = this.pickCandidate(candidates);    
    return { producer: winner, value: values[winner] };
  }

  generateText() {
    var text = "";
    const count = this.pickRepeater();
    var pattern = [ count ];
    for (let i = 0; i < count; i++) {
      const { producer, value } =  this.fillSlot(count, i);
      text += value;
      pattern.push(producer);
    }
    console.log("final text:", text, pattern);
    return { text, pattern };
  }

  recordFeedback(results, id, success, count) {
    var tracker;
    if (!(id in results)) {
      tracker = new ResultTracker();
      results[id] = tracker;
    } else {
      tracker = results[id];
    }
    tracker.record(success, count);
  }

  patternFeedback(pattern, success, count) {
    this.recordFeedback(this.repeaters, pattern[0], success, count);
    for (let i = 1; i < pattern.length; i++) {
      const [ producer, size ] = pattern[i].split(":");
      console.log(producer, size);
      if (!(producer in this.producers)) {
        this.producers[producer] = {};
      }
      this.recordFeedback(this.producers[producer], size, success, count);
    }
  }
}

export default CopyTrainerStore;
