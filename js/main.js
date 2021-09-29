const MIDI_UUID = "03b80e5a-ede8-4b33-a751-6ce34ec4c700";
const MIDI_CHARA_UUID = "7772e5db-3868-4112-a1a9-f2669d106bf3";
const KEYS = [
  "C",
  "^C",
  "D",
  "^D",
  "E",
  "F",
  "^F",
  "G",
  "^G",
  "A",
  "^A",
  "B",
  "^B",
];
const QUESTIONS = [
  ["C", "E", "G", "C'"],
  ["D", "F", "A", "D'"],
  ["E", "G", "B", "E'"],
  ["F", "A", "C'", "F'"],
];
const titleEl = document.getElementById("title");
const scoreEl = document.getElementById("score");
const clearEl = document.getElementById("clear");
const startButtonEl = document.getElementById("start");

class MidiGame {
  async startBLE() {
    let ble_options = {
      filters: [{ services: [MIDI_UUID] }],
    };
    try {
      this.connectedDevice = await navigator.bluetooth.requestDevice(
        ble_options
      );
      let server = await this.connectedDevice.gatt.connect();
      let service = await server.getPrimaryService(MIDI_UUID);
      await this.startBleMIDIService(service, MIDI_CHARA_UUID);
    } catch (err) {
      console.error(err);
    }
  }

  async startBleMIDIService(service, charUUID) {
    let characteristic = await service.getCharacteristic(charUUID);
    await characteristic.startNotifications();
    characteristic.addEventListener(
      "characteristicvaluechanged",
      this.onMIDIEvent.bind(this)
    );
  }

  onMIDIEvent(event) {
    let data = event.target.value;
    let out = [];
    for (let i = 0; i < data.buffer.byteLength; i++) {
      out.push(data.getUint8(i));
    }
    const isPress = out[4] !== 64;
    const key = KEYS[out[3] % 12];
    const octave = Math.floor(out[3] / 12);
    if (!isPress) return;

    this.pressCallback(key, octave);
  }

  render(key, octave) {
    const abcString = `
X: 1
M: 4/4
L: 1/4 
K: C
${key}|
`;
    this.visualObject = ABCJS.renderAbc(scoreEl, abcString, {
      responsive: "resize",
    })[0];
  }

  coloring(coloredIndex) {
    const voices = this.visualObject.lines[0].staff[0].voices[0];
    // reset color
    for (let i = 0; i < voices.length; i++) {
      const elemset = voices[i].abselem.elemset;
      for (let i = 0; i < elemset.length; i++) {
        elemset[i][0].classList.remove("red");
      }
    }
    // coloring
    const elemset = voices[coloredIndex].abselem.elemset;
    for (let i = 0; i < elemset.length; i++) {
      elemset[i][0].classList.add("red");
    }
  }

  async startQuestion(answer) {
    return new Promise((resolve) => {
      this.render(answer.join(""));
      let index = 0;
      this.coloring(index);
      this.pressCallback = (key, octave) => {
        if (answer[index] === this.normalizeKey(key, octave)) {
          index++;
          this.coloring(index);
          if (answer.length === index) {
            resolve();
          }
        }
      };
    });
  }

  normalizeKey(key, octave) {
    let answerKey = key;
    for (let i = octave; i < 5; i++) {
      answerKey = "," + answerKey;
    }
    for (let i = octave; i > 5; i--) {
      answerKey = answerKey + "'";
    }
    return answerKey;
  }

  async showClearText(text, clearAfterWait) {
    scoreEl.style.display = "none";
    clearEl.style.display = "";
    clearEl.textContent = text;
    await this.wait(3000);
    if (clearAfterWait) clearEl.style.display = "none";
  }

  async wait(millis) {
    return new Promise((resolve) => {
      setTimeout(resolve, millis);
    });
  }
}

startButtonEl.addEventListener("click", async () => {
  const md = new MidiGame();
  titleEl.style.display = "none";
  await md.startBLE();
  for (let i = 0; i < QUESTIONS.length; i++) {
    await md.startQuestion(QUESTIONS[i]);
    await md.showClearText("やったね！　せいこう！", true);
  }
  md.showClearText("ぜんぶできたね！　すごいね！", false);
});
