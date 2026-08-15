# Garden Log

A personal garden-planning and tracking app for your phone, built with
[Expo](https://expo.dev) / React Native. Everything is stored locally on
your device — there's no account, no server, and no data leaves your phone
except when you explicitly export a backup or share a photo.

## Features

- **Garden beds & containers** — organize plants by bed, container, or row.
- **Plant records** — variety, species, source, planting/transplant/expected
  harvest dates, sun needs, spacing, watering and care notes, status
  (planned → seed starting → growing → flowering → harvesting → finished/dead).
- **Photos** — take a picture of a plant's tag/label or seed packet, and
  separately track progress photos and harvest photos over time.
- **Label OCR** — label photos are run through on-device text recognition
  (ML Kit) so you can pull the printed care instructions straight into the
  plant's notes instead of retyping them. Requires a dev/production build —
  see [OCR support](#ocr-support-label-photos) below.
- **Journal** — a dated timeline of notes per plant (watering, fertilizing,
  pests, disease, pruning, transplanting, weather, harvest, general notes).
- **Tasks & reminders** — one-off or recurring tasks (e.g. "water every 3
  days") with local push notifications when something's due.
- **Harvest log** — record what you picked and when, with a running total
  per plant.
- **Frost dates** — a place to jot your last spring / first fall frost dates
  for reference when planning.
- **Backup & restore** — export all your garden data to a JSON file (share
  it to Files, email, cloud storage, etc.) and restore it later. Photos can
  also optionally be copied to your phone's camera roll as a safety net,
  since the JSON backup only contains the records, not the image files.

## Tech stack

- [Expo](https://expo.dev) SDK 57 (React Native 0.86, React 19) with the
  new architecture enabled
- [Expo Router](https://docs.expo.dev/router/introduction/) (file-based
  navigation, in `app/`)
- [expo-sqlite](https://docs.expo.dev/versions/latest/sdk/sqlite/) for local
  storage (see `src/db/`)
- expo-camera / expo-image-picker / expo-image / expo-file-system for photo
  capture and storage
- expo-notifications for local task reminders
- `@react-native-ml-kit/text-recognition` for on-device label OCR
- TypeScript throughout, `strict` mode

## Getting started

```bash
npm install
npx expo start
```

Scan the QR code with the **Expo Go** app (iOS or Android) to run it on your
phone. Expo Go covers everything except label OCR (see below).

## OCR support (label photos)

On-device OCR uses a native module (`@react-native-ml-kit/text-recognition`)
that **Expo Go cannot load** — this is a normal limitation of Expo Go for
any package with native code, not a bug. The app is written to degrade
gracefully: in Expo Go, label photos still save fine, you just won't get
auto-extracted text, and you can type care notes manually instead.

To get OCR working on your phone, build a custom dev client once:

```bash
# Local build (needs Xcode for iOS / Android Studio for Android)
npx expo run:ios
# or
npx expo run:android

# ...or a cloud build via EAS (no Mac/Android Studio needed)
npx eas-cli build --profile development --platform ios
npx eas-cli build --profile development --platform android
```

After that, run `npx expo start --dev-client` and open the app from the
custom dev client you installed instead of Expo Go. Everything else about
the workflow (fast refresh, etc.) stays the same.

For a plain production build (App Store / Play Store), OCR works the same
way with no extra steps — `expo run` / `eas build --profile production`.

## Data & backups

All data lives in a local SQLite database on your device
(`src/db/migrations.ts` has the schema) and photo files live in the app's
document directory. **Nothing syncs to a server.** That means:

- If you delete the app, your data is gone. Use **Settings → Export Backup**
  regularly, especially before switching phones.
- The exported JSON backup contains all your plant/bed/journal/task/harvest
  records, but *not* the photo image bytes themselves (to keep the file
  small and dependency-free). Turn on **Settings → Save to camera roll** so
  photos are also copied to your phone's Photos app, which is normally
  already backed up by iCloud Photos / Google Photos.
- **Settings → Restore from Backup** fully replaces the current database
  with the contents of a chosen backup file — there's a confirmation prompt
  since it can't be undone.

## Project structure

```
app/                     Expo Router screens (file-based routes)
  (tabs)/                 Bottom tab screens: Garden, Plants, Beds, Tasks, Settings
  plants/, beds/, tasks/  Modal / detail screens (new, edit, detail)
  photo/[id].tsx           Full-screen photo viewer with OCR text + caption
src/
  db/                     SQLite schema, migrations, typed repositories
  components/             Shared UI (Screen, Button, Card, forms, etc.)
  hooks/                   e.g. useAddPlantPhoto (capture → persist → OCR → save)
  lib/                    theme, dates, photo storage, notifications, backup/export, OCR wrapper
```

## Permissions requested

- **Camera** — to photograph plant labels and take progress/harvest photos.
- **Photo library** — to pick existing photos, and to optionally save copies
  as a backup.
- **Notifications** — for task reminders (only requested when you enable a
  task reminder or the Settings toggle).

All of these are requested at the point of use, not on first launch.
