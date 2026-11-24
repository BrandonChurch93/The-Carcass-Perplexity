# Flows

The things a visitor does on the published build. `npm run flows` replays them in a fresh browser against the hosted copy after every publish and fails if one breaks. It reads the address of `index.html` from `--url`, or from `out/work/host/url.txt`.

| No. | Flow | Passes when |
| --- | --- | --- |
| 1 | Open the start page | It answers, the title is "The Carcass", and it shows one play control and one quiet "Review page" link |
| 2 | Play the film | The control and the link hide on the click, and the canvas shows a lit picture |
| 3 | Open the review page | The heading and the sections are there and every picture has loaded |
| 4 | Listen and watch on the review page | Every sound file and every film on the page answers a request for its first bytes |
| 5 | Go from the review page to the film and to the card loop | "Play the film as it stands" leads to `./index.html` and "Play the card loop" leads to `./index.html?mode=loop` |
| 6 | Play the card loop | The canvas shows a lit picture and keeps running |
| 7 | Nothing fails on the way | No console error and no failed request in any of the flows above |

The run also prints whether a page there can `fetch()` a text file and a picture, since the engine loads its assets that way. Screenshots of each flow go to `out/work/host/`.

`capture` mode is not a visitor's flow. The harness drives it, and `npm run still` and `npm run determinism` test it.
