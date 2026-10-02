# Tempus fugit · beta

A small, client-only classroom timing app built with TypeScript and Vite. No account, database, API key, or Threshold connection is needed.

## Run locally

Install Node.js 22.12 or newer (Node 24 LTS recommended). Open a terminal in this folder:

```sh
npm ci
npm run dev
```

Open the local address printed by Vite (normally http://127.0.0.1:5173). Keep the terminal running. Stop with Control-C.

## Use in class

- Choose **Edit class & rhythm** to change the class name, period length, movement names, instructions, and whole-minute durations (1–240).
- The default is 3 / 10 / 25 / 10 / 2 minutes. Changing period length does not redistribute movement times; the editor and teacher view show any difference.
- **Start class / Pause / Resume** control both clocks together.
- **Next movement** starts that movement with its full allocation, preserving total elapsed class time. When paused, Next stays paused.
- A movement reaching zero stays there, displays elapsed overtime, and waits for the teacher. The total clock keeps running, including movement overtime. When the period ends it also displays overtime; it never forces a transition.
- **Finish class** on the final movement freezes both clocks. **Reset** returns to the first movement after confirmation.
- **Student View** hides editing and the detailed agenda, enlarges the current movement and clocks, and retains Start/Pause and Next for the teacher. Use **Full screen** for projection. Teacher View returns to editing.
- Opening the editor pauses a running class. Cancel leaves it paused; saving starts a fresh class.
- Settings are saved only in this browser. Refreshing restores this tab’s class, current phase, clocks, and view for up to 12 hours after its last save. Running clocks include reload time; paused clocks stay paused. New tabs start fresh; closing and reopening a tab depends on browser session restoration. Recovery is local to this browser and address. Separate tabs and devices are independent.
- Timing uses elapsed timestamps rather than counting interval ticks, so a background tab catches up when rendered again. Time asleep counts as elapsed time; manually changing the device clock can affect timing. Keep the computer awake for projection.

## Room Level v0.1

Room Level shows a smoothed, relative microphone level as **QUIET / GOOD / LOUD**. The panel appears below Today’s rhythm in Teacher View and stays visible in Student View for projection. It works independently of the timers and movements.

1. Run the app locally as above and click **Enable microphone**. Allow microphone access when prompted by your browser or macOS.
2. Use the **Sensitivity** slider to suit the room and the MacBook’s position. Higher sensitivity raises the reading for the same sound.
3. Choose **Student View** and **Full screen** for projection.
4. Click **Disable microphone** to stop listening. Leaving the page also releases the microphone. Refreshing leaves it off and resets sensitivity to its default.

The display measures relative audio amplitude, **not calibrated dB SPL**. QUIET / GOOD / LOUD are fixed relative bands; they do not judge what is appropriate for a particular movement. Readings depend on microphone hardware, placement, and sensitivity.

Audio is processed entirely in this browser using `getUserMedia` and the Web Audio API. It is not recorded, saved, uploaded, or played through the speakers. Room Level makes no external API calls and uses no database. There is no logging, history, automatic warning, Threshold/Crossing integration, or movement-specific sound expectation.

Microphone access requires localhost (including the local address printed by Vite) or HTTPS. If access is denied, check browser and macOS microphone permissions and try again. If capture pauses or the microphone disconnects, disable and re-enable it. The existing optional timer chime may register on the microphone like any other room sound.

### Quick hands-on check

- Enable the microphone, speak, then pause; confirm the meter responds smoothly.
- Adjust sensitivity and check readability in Student View on the projector.
- Use Start/Pause and Next movement while listening; timer behavior should remain unchanged.
- Disable the microphone and confirm the browser’s microphone indicator clears.

The existing automated tests cover timing; microphone response and classroom sensitivity need hands-on testing on each computer.

## Test and production build

```sh
npm test
npm run build
npm run preview
```

The build is in `dist/`. Preview serves it locally. The timing tests cover pause/resume, background catch-up, manual advancement, overtime, completion, formatting, and invalid plans.

## Deploy with GitHub and Vercel

1. Create a GitHub repository and upload this folder's source files, including `package.json` and `package-lock.json`. Do not upload `node_modules/` or `dist/`.
2. In Vercel, choose **Add New → Project**, then import that repository.
3. Choose the **Vite** framework preset. If this folder is nested in your repository, select it as the Root Directory.
4. Set Build Command to `npm run build` and Output Directory to `dist`. No environment variables are needed.
5. Deploy and open the supplied URL. Further commits redeploy the app.

Vercel runs the timing tests before building each deployment.

Official references: [Vite guide](https://vite.dev/guide/), [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite).

## Future Threshold boundary

`model.ts` defines the versioned `ClassPlan` and `Movement` contracts and `validatePlan(unknown)`. A future adapter should map Threshold data into that contract, validate it, then pass the plan into the UI initialization in `main.ts`. Optional `source.classId` and `source.lessonId` allow provenance without coupling clocks to a service. IDs and movement colors remain stable when editing. Timing is a separate pure state model, with deterministic tests; presentation does not depend on network calls.

There is no API, authentication, cross-device sync, lesson write-back, or implemented integration. Do not put credentials in this browser bundle. If an integration later needs secrets, add an authenticated server boundary.

## Files

- `model.ts`: plan validation and independent clock state transitions.
- `main.ts`: UI, local settings, teacher/student views.
- `room-level.ts`: local microphone capture, relative level calculation, smoothing, sensitivity, and microphone cleanup.
- `style.css`: responsive and projection styling; system fonts, no remote assets.
- `model.test.ts`: deterministic timer tests.

### Repeat browser verification

With Google Chrome installed and `npm run dev` running on port 5173, run `node browser.mjs`. It checks real UI timing, overtime, editing, saved settings, view switching, reset, completion, and horizontal overflow at 375, 768, and 1440 pixels. Screenshots are written to `test-results/`. All checks passed during beta verification.

## Refresh recovery (v0.3.0)

Reset, saved edits, and class switches replace the recovery snapshot. Invalid or expired snapshots start fresh. Unsaved editor changes are discarded on reload. The Room Level microphone stays off after reload; enable it again explicitly. If chime is on, click **Continue & enable chime** after recovery to unlock browser audio. An already-expired phase does not replay its chime.
