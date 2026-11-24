# The sound tool's API, as read on 2026-11-24

Read from the official ElevenLabs documentation by a lookup agent. No call was made for this record. UNKNOWN means the documentation did not say.

## Speech

`POST /v1/text-to-speech/{voice_id}`. The variant `/with-timestamps` takes the same request and returns JSON: `audio_base64`, `alignment` and `normalized_alignment`, each with `characters`, `character_start_times_seconds` and `character_end_times_seconds`.

- Query: `output_format` (default `mp3_44100_128`), `enable_logging`.
- Body: `text` (required); `model_id` (default `eleven_multilingual_v2`); `language_code`; `voice_settings`; `pronunciation_dictionary_locators` (at most 3); `seed` (0 to 4294967295, "Determinism is not guaranteed"); `previous_text`; `next_text`; `previous_request_ids` and `next_request_ids` (at most 3 each, they override the two text fields); `use_pvc_as_ivc`; `apply_text_normalization` (`auto`, `on`, `off`); `audio_effects`.
- `voice_settings` defaults: `stability` 0.5, `similarity_boost` 0.75, `style` 0, `use_speaker_boost` true, `speed` 1 (0.7 to 1.2), `clone_strength` (0 to 1, v4 professional clones only). Ranges of the first three: UNKNOWN.
- `output_format`: `mp3_22050_32`, `mp3_24000_48`, `mp3_44100_32`, `mp3_44100_64`, `mp3_44100_96`, `mp3_44100_128`, `mp3_44100_192`; `opus_48000_32` to `opus_48000_192`; `pcm_8000` to `pcm_48000`; `wav_8000` to `wav_48000`; `ulaw_8000`; `alaw_8000`.
- On the Creator plan: every MP3 format, `mp3_44100_192` included. PCM and WAV at 44.1 kHz need Pro or above. The help centre gives Creator PCM at 8, 16, 22.05 and 24 kHz. `pcm_32000`, `pcm_48000` and `wav_48000` on Creator: UNKNOWN.
- Response headers: `request-id`, `character-cost`.

## Speech models

Price is per 1,000 characters against a base of $0.08.

| Model | What it is | Characters a request | Price | Notes |
| --- | --- | --- | --- | --- |
| `eleven_v4` | Flagship, recommended for narration | 100,000 (the pricing FAQ says 10,000) | 1x | Settings: stability and similarity only, plus `clone_strength`. No style, no speed, no SSML. The stitching guide uses it with `previous_request_ids`. `seed`, `previous_text`, `next_text`: UNKNOWN |
| `eleven_v4_turbo` | Realtime | UNKNOWN | 0.5x | On this endpoint: UNKNOWN |
| `eleven_v3` | Older, expressive | 5,000 | 1x | No request stitching. No speed, similarity or speaker boost |
| `eleven_multilingual_v2` | Most stable on long form | 10,000 | 1x | Stability, similarity, style, speed and speaker boost all apply. Stitching works |
| `eleven_flash_v2_5`, `eleven_flash_v2` | Fast | 40,000, 30,000 | 0.5x | |

- Square-bracket delivery tags work on `eleven_v4`, `eleven_v4_turbo`, `eleven_v3` and `eleven_v3_conversational` only.
- The break tag, `<break time="1.5s" />`, at most 3 s: Multilingual v2 and the Flash models only.
- A pause in v4 and v3: ellipses, tags such as `[Pause]`, and the structure of the text.
- A slow, deep narrator: `eleven_v4`, a voice already made for that delivery, a delivery tag before the passage, ellipses for weight, lower stability for more expression. On v2: speed below 1.0, style 0.

## Sound effects

`POST /v1/sound-generation`.

- Query: `output_format`, as for speech.
- Body: `text` (required; the app stops at 450 characters, the API's limit is UNKNOWN); `duration_seconds` (0.5 to 30, omitted means the model decides); `prompt_influence` (0 to 1, default 0.3); `loop` (default false); `model_id`: `eleven_text_to_sound_v2` (the default, deprecated, removed 2027-03-01) or `eleven_text_to_sound_v3` (name it).
- Cost: 40 credits a second when the duration is given. The longest sound is 30 s. MP3 for every effect, WAV at 48 kHz for effects that do not loop.
- Describing a sound: the action, the setting and the atmosphere, not a category. An ambience is described as a continuous place, with `loop` true. An impact is short and concrete. A sequence is better made as separate sounds and joined. A higher `prompt_influence` is more literal.

## Transcription and alignment

- `POST /v1/speech-to-text`, multipart: `model_id` (`scribe_v3`, `scribe_v2`), `file`, `language_code`, `timestamps_granularity` (`none`, `word`, `character`), `tag_audio_events`, `diarize`, `temperature`, `seed` and more. The response has `text`, `language_code`, `words[]` with `text`, `type`, `start`, `end`, `logprob`, and `audio_duration_secs`.
- `POST /v1/forced-alignment`, multipart: `file` and `text`. It returns `characters[]`, `words[]` with `text`, `start`, `end`, and `loss`.

## Account

- `GET /v1/voices/{voice_id}`: `high_quality_base_model_ids`, `fine_tuning.state`, `verified_languages[].model_id`.
- `GET /v1/models`: `model_id`, `can_do_text_to_speech`, `can_use_style`, `can_use_speaker_boost`, `maximum_text_length_per_request`, `model_rates.character_cost_multiplier`.
- `GET /v1/user/subscription`: `tier`, `character_count`, `character_limit`.
- Creator limits: 5 requests at once on Multilingual v2, 10 on Flash, 20 for transcription, 6 for sound effects. For v4: UNKNOWN. HTTP 429 carries `rate_limit_exceeded` (back off) or `concurrent_limit_exceeded` (wait for running requests).
