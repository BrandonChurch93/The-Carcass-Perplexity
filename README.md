# The Carcass

A narrated film of about three minutes. A grim voice walks through a land that should not exist: a strait under stone ribs, a lake of fire, a shelf that breathes, red salt flats, a ridge above the storm, a lake with no bottom. Then the camera rises without a cut, and the land is the body of a dead god.

Every frame is computed in three.js, one at a time, at 3840 x 2160 and 60 frames a second.

This repo holds the plan for the build and, once the build has run, the build itself.

## Where things are

| Path | What |
| --- | --- |
| `AGENTS.md` | The rules the build follows |
| `kit/` | The plan, file by file. Start with `kit/00-README.md` |
| `kit/10-KICKOFF.md` | For Brandon: how to start the build, the review stop, and every prompt |
| `config/showcase.json` | Every number the plan sets, the words of the narration and the list of approved pictures |
| `references/approved/` | The 34 approved pictures the build is held to |
| `references/drafts/` | The record of how the look was found |

## Status

The build is running. Its log is `kit/PROGRESS.md`, and that file is the place to look for where it stands.

- Watch: [the published build](https://www.perplexity.ai/computer/a/the-carcass-xp_kROepRIapoVuOG1cmNw). It opens on the film as it stands, and the "Review page" link at its foot leads to the newest pictures, the films, every narration clip and sound, and the card. It sits behind the owner's sign-in.
- Run it here: `npm ci`, then `npm run dev` for the player or `npm run build && npm run review` for the published form in `dist/`.
- Render: `npm run still -- --frame N` computes one frame. The commands of the harness are listed in `tools/README.md`.
- Sound: the music is in `audio/supplied/`, kept narration and sounds in `audio/kept/`, the mix in `audio/mix/`, and how each was made in `audio/records/`.
- The visitor's flows that are replayed after every publish are in `FLOWS.md`.
