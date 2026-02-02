# Docker Android - Agent Knowledge Base

## Project Overview

Docker Android is a React Native (Expo) application that enables running Docker containers on Android devices via QEMU virtualization. It runs Alpine Linux inside QEMU, which hosts Docker Engine.

## Repository Structure

```
project/docker/
├── android/                    # Native Android code (post-prebuild)
│   └── app/src/main/
│       ├── java/.../qemu/      # QEMU native module (Kotlin)
│       ├── jni/                # JNI C wrapper for QEMU
│       ├── jniLibs/            # Native libraries (QEMU binary)
│       └── assets/qemu/        # VM assets (Alpine setup)
├── client/                     # React Native frontend
│   ├── components/             # Reusable UI components
│   ├── screens/                # Screen components
│   ├── navigation/             # React Navigation v7
│   ├── store/                  # Zustand state management
│   ├── services/               # API services
│   │   ├── DockerAPI.ts        # Full Docker REST API client
│   │   └── QemuService.ts      # Native module bridge
│   ├── hooks/                  # Custom hooks (theme, etc.)
│   └── constants/              # Theme tokens, colors
├── server/                     # Express backend (optional)
└── shared/                     # Shared types (Drizzle schema)
```

## Tech Stack

- **React Native** 0.81 with Expo SDK 54
- **React Navigation** v7 (bottom tabs + native stack)
- **Zustand** for state management
- **Axios** for HTTP requests
- **TypeScript** throughout
- **Kotlin** for native Android modules
- **C** for JNI wrapper

## Key Files

### Native Module
- `android/app/src/main/java/.../qemu/QemuModule.kt` - Main QEMU control
- `android/app/src/main/java/.../qemu/QemuPackage.kt` - React Native package
- `android/app/src/main/java/.../qemu/QemuForegroundService.kt` - Background service
- `android/app/src/main/jni/qemu_jni.c` - JNI process management

### React Native Services
- `client/services/DockerAPI.ts` - Complete Docker API client with:
  - Container CRUD operations
  - Image management
  - Volume/Network operations
  - Exec for terminal
  - Streaming logs/stats
  
- `client/services/QemuService.ts` - Bridge to native module

### State Management
- `client/store/useDockerStore.ts` - Docker state (containers, images, etc.)
- `client/store/useQemuStore.ts` - VM state (status, logs, settings)
- `client/store/useSettingsStore.ts` - App settings (theme, API URL)

### UI Screens
- `HomeScreen.tsx` - Dashboard with VM status, stats
- `ContainersScreen.tsx` - Container list with swipe actions
- `ContainerDetailScreen.tsx` - Container info, logs, actions
- `ImagesScreen.tsx` - Image list, pull new images
- `TerminalScreen.tsx` - Interactive container terminal
- `WebViewScreen.tsx` - View container web apps
- `SettingsScreen.tsx` - App configuration

## Build Commands

```bash
# Install dependencies
npm install

# Start dev server
npm run expo:dev

# Generate Android native folder
npx expo prebuild --platform android

# Build debug APK
cd android && ./gradlew assembleDebug

# Build with EAS
eas build --platform android --profile preview
```

## Docker API Endpoints

The app targets Docker Engine API on `localhost:2375`. All methods are implemented:

- Containers: list, create, start, stop, restart, remove, logs, stats, exec
- Images: list, pull, remove, inspect
- Volumes: list, create, remove
- Networks: list, create, remove
- System: info, version, ping, prune

## QEMU Configuration

Default settings in `qemu-config.json`:
- RAM: 2048MB (configurable 512-4096)
- CPU: 2 cores (configurable 1-4)
- Disk: 10GB QCOW2

Port forwarding:
- 2375 → Docker API
- 2222 → SSH
- 8080 → HTTP
- 3000 → Node.js

## Development Notes

1. **QEMU Binary**: Bundled from Limbo Emulator v6.0.1 (QEMU 5.1.0)
   - Location: `android/app/src/main/jniLibs/`
   - Supported architectures: `arm64-v8a`, `armeabi-v7a`
   - Main binary: `libqemu-system-x86_64.so`
   - Dependencies: `libglib-2.0.so`, `libpixman-1.so`, `libSDL2.so`, etc.

2. **BIOS/ROM Files**: Required for QEMU emulation
   - Location: `android/app/src/main/assets/qemu/roms/`
   - Includes: `bios.bin`, `vgabios-*.bin`, keymaps, firmware
   - Auto-copied to app internal storage on first init

3. **Alpine ISO**: Download via `QemuService.downloadAlpineIso()` on first setup
   - Not bundled to keep APK size small (~50MB ISO)

4. **Mock Mode**: When VM not running, screens show simulated data for UI development

5. **Theme System**: Light/dark mode with mauve accent colors defined in `constants/theme.ts`

6. **Type Safety**: Full TypeScript types for Docker API responses

## QEMU Libraries (from Limbo)

| Library | Size (arm64) | Purpose |
|---------|--------------|---------|
| libqemu-system-x86_64.so | 13MB | QEMU emulator |
| libglib-2.0.so | 1.2MB | GLib dependency |
| libpixman-1.so | 440KB | Pixel manipulation |
| libSDL2.so | 1.2MB | Display/input |
| libcompat-musl.so | 132KB | C library compat |
| liblimbo.so | 14KB | Limbo helper |

## Common Tasks

### Add new Docker API method
1. Add method to `DockerAPI.ts`
2. Add corresponding store action in `useDockerStore.ts`
3. Use in screen component

### Modify VM settings
1. Update `qemu-config.json` for defaults
2. Update `QemuModule.kt` for native handling
3. Update `useQemuStore.ts` for React Native state

### Add new screen
1. Create screen in `client/screens/`
2. Add to navigation in `client/navigation/`
3. Add navigation types in `RootStackNavigator.tsx`
