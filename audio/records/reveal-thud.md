## reveal-thud
Made by: tools/sound.mjs, POST https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_192, model eleven_text_to_sound_v3
Text or description: "A single deep boom. One low soft impact heard from far away through rock, then a long low rumbling tail that fades to silence. Only one hit."
Settings: duration_seconds 5, prompt_influence 0.5, loop not sent (the default is false), output format mp3_44100_192, no seed (the endpoint takes none)
Takes: 2 made, take 2 kept with a fault. Take 2 was kept with a fault. The Builder's verdict names a fault: Three thumps inside the first half second by measure, at 0.10, 0.33 and 0.48 s, where the note asks for one thud. One listener call hears a single deep impact, the other clanking and slamming..
Measured: 5.00 s, -19.7 LUFS, true peak -0.74 dB, 2 channels, 0.09 s of silence at the head and 0.86 s at the tail, no clipping as returned. As filed: 4.09 s, gain 8.39 dB, -16.35 LUFS, true peak -1.94 dB, 48000 Hz, 16 bit
The listener: call 1: "Someone is clanking and slamming." call 2: "Here's a description of the audio: The recording features a single, deep, and heavily resonant metallic impact, similar to a large gong, a heavy bell, or a cinematic \"boom\" sound effect. It begins with a sudden, forceful strike and ends with a low-pitched, echoing fade-out."
Date: 2026-11-25

Files: audio/kept/sounds/reveal/reveal-thud.wav
Cue: a spot in reveal, described in audio/cues/reveal-thud.json
Level chain: silence cut to 20 ms at each end with a fade of 10 ms in and 50 ms out, then a gain toward -16 LUFS and a limiter that holds the true peak at or under -1.5 dB, no dither
Take 1: 5.00 s, -26.52 LUFS, true peak -1.28 dB, 2 channels, 0.12 s of silence at the head and 1.01 s at the tail, no clipping as returned. As filed: 3.91 s, gain 21.68 dB, -16.18 LUFS, true peak -1.94 dB. Rejected. The Builder's verdict names a fault: Not one beat: the first second holds five thumps (0.07, 0.27, 0.54, 0.68 and 0.96 s) and both listener calls hear a repeating heartbeat. The note asks for one deep distant thud..
Take 2: 5.00 s, -19.7 LUFS, true peak -0.74 dB, 2 channels, 0.09 s of silence at the head and 0.86 s at the tail, no clipping as returned. As filed: 4.09 s, gain 8.39 dB, -16.35 LUFS, true peak -1.94 dB. Take 2 was kept with a fault. The Builder's verdict names a fault: Three thumps inside the first half second by measure, at 0.10, 0.33 and 0.48 s, where the note asks for one thud. One listener call hears a single deep impact, the other clanking and slamming..
