# Addenda

Numbered changes made after the kit was written. Brandon's notes from the planning chat arrive here.

- Files are named `NNN-topic.md`, starting at `001`.
- An addendum beats every kit file on its own topic. A higher number beats a lower one.
- The Builder reads every addendum at the start of every task and after every compaction, and when a phase begins.
- The Builder never writes or edits an addendum. It logs how it applied each one in `kit/PROGRESS.md`.
- If an addendum asks for changes to a unit that is already finished, the Builder makes them and runs rounds on that unit inside `quality.maxRoundsPerUnit` and the clock. There is no stop for it.

| No. | File | What it changes |
| --- | --- | --- |
| 001 | `001-private-repo-and-music.md` | The repo is private, so the voice, the sounds and the music are committed. The music's use is settled and is never raised as a question |
