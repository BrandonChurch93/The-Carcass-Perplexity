import sys, json, subprocess
import numpy as np
from faster_whisper import WhisperModel

model = WhisperModel(sys.argv[1], device='cpu', compute_type='int8')
for path in sys.argv[2:]:
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-nostdin', '-i', path, '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    x = np.frombuffer(raw, dtype=np.float32)
    segs, info = model.transcribe(x, language='en', beam_size=5, word_timestamps=True, condition_on_previous_text=False, temperature=0.0)
    words = []
    text = ''
    for s in segs:
        text += s.text
        for w in s.words:
            words.append([w.word.strip(), round(w.start, 2), round(w.end, 2), round(w.probability, 2)])
    print(json.dumps(dict(file=path, text=text.strip(), words=words)))
