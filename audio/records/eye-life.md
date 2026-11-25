## eye-life
Made by: tools/sound.mjs, POST https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_192, model eleven_text_to_sound_v3
Text or description: "A few quiet sips and gentle laps at the edge of a still lake, then single drips falling back into the water, plip, plip, and two or three slow soft steps on wet pebbles. Sparse and calm, with silence between the sounds."
Settings: duration_seconds 8, prompt_influence 0.5, loop not sent (the default is false), output format mp3_44100_192, no seed (the endpoint takes none)
Takes: 2 made, take 1 kept with a fault. Take 1 was kept with a fault. The Builder's verdict names a fault: No steps and no drips: neither listener call names either, and the picture shows sloshing without a pause for all 8 seconds. One call hears liquid swished in a mouth, the other a washing machine. The Eye is still water and near silence..
Measured: 8.00 s, -46.3 LUFS, true peak -21.78 dB, 2 channels, 0.01 s of silence at the head and 0.06 s at the tail, no clipping as returned. As filed: 7.96 s, gain 33.79 dB, -16.12 LUFS, true peak -1.94 dB, 48000 Hz, 16 bit
The listener: call 1: "I can hear someone loudly swishing liquid back and forth inside their mouth." call 2: "Water splashing and sloshing as if it's in a washing machine."
Date: 2026-11-25

Files: audio/kept/sounds/eye/eye-life.wav
Cue: a spot in eye, described in audio/cues/eye-life.json
Level chain: silence cut to 20 ms at each end with a fade of 10 ms in and 50 ms out, then a gain toward -16 LUFS and a limiter that holds the true peak at or under -1.5 dB, no dither
Take 1: 8.00 s, -46.3 LUFS, true peak -21.78 dB, 2 channels, 0.01 s of silence at the head and 0.06 s at the tail, no clipping as returned. As filed: 7.96 s, gain 33.79 dB, -16.12 LUFS, true peak -1.94 dB. Take 1 was kept with a fault. The Builder's verdict names a fault: No steps and no drips: neither listener call names either, and the picture shows sloshing without a pause for all 8 seconds. One call hears liquid swished in a mouth, the other a washing machine. The Eye is still water and near silence..
Take 2: 8.00 s, -42.44 LUFS, true peak -22.31 dB, 2 channels, 0.49 s of silence at the head and 1.44 s at the tail, no clipping as returned. As filed: 6.11 s, gain 28.66 dB, -16.43 LUFS, true peak -1.94 dB. Rejected. The Builder's verdict names a fault: Reads as a person drinking: both listener calls hear loud slurping as from a cup, and one also hears a swallow, a voiced sigh and a cartoon water drop. No steps..
