# Docker Android

[![React Native](https://img.shields.io/badge/React%20Native-0.81-blue.svg)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-54-black.svg)](https://expo.dev/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

A React Native (Expo) application that runs Docker containers directly on Android devices. The app uses QEMU to run an Alpine Linux VM, which hosts Docker Engine, allowing full container management from your mobile device.

![Docker Android](./assets/images/icon.png)

## 🚀 Features

- **Full Docker Management**: Create, start, stop, restart, and remove containers
- **Image Management**: Pull, list, and remove Docker images
- **Container Monitoring**: Real-time logs and stats for running containers
- **WebView Integration**: View web applications running in containers
- **Terminal Access**: Interactive terminal for container exec
- **Volume & Network Management**: Create and manage Docker volumes and networks
- **VM Control**: Start/stop the Alpine Linux VM with customizable resources
- **Dark/Light Mode**: Beautiful UI with theme support
- **Offline Support**: Works with mock data when VM is not running

## 📱 Screenshots

| Home | Containers | Terminal |
|------|------------|----------|
| Dashboard with VM status | Container list with actions | Interactive terminal |

## 🛠️ Architecture

```
┌─────────────────────────────────────┐
│  React Native (JavaScript)          │
│  ├── Screens (Home, Containers...)  │
│  ├── Zustand Stores                 │
│  └── Docker API Client              │
└─────────────────────────────────────┘
              ↕ (Bridge)
┌─────────────────────────────────────┐
│  Native Module (Kotlin)             │
│  ├── QemuModule                     │
│  └── QemuForegroundService          │
└─────────────────────────────────────┘
              ↕ (JNI)
┌─────────────────────────────────────┐
│  QEMU Binary (ARM64)                │
│  └── Alpine Linux VM                │
│      └── Docker Engine              │
└─────────────────────────────────────┘
```

## 📋 Prerequisites

- **Node.js** 18+ 
- **Android Studio** with NDK installed (for native builds)
- **Android Device/Emulator** with Android 7.0+ (API 24+)
- **8GB+ RAM recommended** on device for running VM

## 🚀 Quick Start

### Development (Expo Go)

```bash
# Install dependencies
npm install

# Start development server
npm run expo:dev

# Or with explicit command
npx expo start
```

### Build APK

```bash
# Generate native Android folder
npx expo prebuild --platform android

# Build debug APK
cd android && ./gradlew assembleDebug

# Or use EAS Build
eas build --platform android --profile preview
```

## 📁 Project Structure

```
docker/
├── android/                    # Native Android code
│   └── app/src/main/
│       ├── java/.../qemu/      # QEMU native module
│       │   ├── QemuModule.kt   # Main native module
│       │   ├── QemuPackage.kt  # React Native package
│       │   └── QemuForegroundService.kt
│       ├── jni/                # JNI C code
│       │   ├── qemu_jni.c      # QEMU JNI wrapper
│       │   ├── Android.mk      # NDK build config
│       │   └── Application.mk
│       ├── jniLibs/            # Native libraries
│       │   └── arm64-v8a/      # QEMU binary goes here
│       └── assets/qemu/        # VM assets
│           ├── alpine-setup.sh # Auto-setup script
│           └── qemu-config.json
│
├── client/                     # React Native app
│   ├── components/             # Reusable UI components
│   ├── screens/                # Screen components
│   ├── navigation/             # React Navigation setup
│   ├── store/                  # Zustand state stores
│   ├── services/               # API services
│   │   ├── DockerAPI.ts        # Docker REST API client
│   │   └── QemuService.ts      # QEMU native bridge
│   ├── hooks/                  # Custom React hooks
│   └── constants/              # Theme and config
│
├── server/                     # Express.js backend (optional)
├── shared/                     # Shared types and schemas
├── app.json                    # Expo configuration
└── package.json
```

## 🔧 Configuration

### QEMU Settings

Edit `android/app/src/main/assets/qemu/qemu-config.json`:

```json
{
  "cpu": {
    "cores": { "default": 2 }
  },
  "memory": {
    "default": 2048
  }
}
```

### Docker API

The Docker API is exposed on `localhost:2375` when the VM is running. Configure in the app settings or via:

```typescript
import { useDockerStore } from "@/store/useDockerStore";
useDockerStore.getState().setDockerApiUrl("http://localhost:2375");
```

### Port Forwarding

Default port mappings:

| Host Port | Guest Port | Service |
|-----------|------------|---------|
| 2375 | 2375 | Docker API |
| 2222 | 22 | SSH |
| 8080 | 80 | HTTP |
| 3000 | 3000 | Node.js |

## 📦 Installing QEMU Binary

The QEMU binary is not included due to size. You have two options:

### Option 1: Extract from Limbo Emulator

1. Download [Limbo PC Emulator](https://github.com/limboemu/limbo) APK
2. Extract `libqemu-system-x86_64.so` from the APK
3. Place in `android/app/src/main/jniLibs/arm64-v8a/`

### Option 2: Compile from Source

```bash
# Clone QEMU
git clone https://github.com/qemu/qemu.git
cd qemu

# Configure for Android
./configure \
  --target-list=x86_64-softmmu \
  --cross-prefix=aarch64-linux-android- \
  --enable-system \
  --disable-user

# Build
make -j$(nproc)
```

## 📱 Usage

### Starting the VM

1. Open the app
2. Tap "Start VM" on the home screen
3. Wait for Alpine Linux to boot (~30-60 seconds)
4. Docker API becomes available

### Managing Containers

1. Go to Containers tab
2. Pull an image (e.g., `nginx:alpine`)
3. Create a new container
4. Start/stop containers as needed
5. View logs and stats

### Terminal Access

1. Open a container detail
2. Tap "Terminal" button
3. Execute commands in the container

## 🔒 Permissions

The app requires these Android permissions:

- `INTERNET` - Docker API communication
- `FOREGROUND_SERVICE` - Keep VM running in background
- `WAKE_LOCK` - Prevent CPU sleep
- `WRITE_EXTERNAL_STORAGE` - Store VM disk images

## 🐛 Troubleshooting

### VM Won't Start

- Check available RAM (need 2GB+ free)
- Verify QEMU binary is properly placed
- Check logcat for errors: `adb logcat | grep QEMU`

### Docker API Not Accessible

- Wait longer for Alpine to boot
- Check port forwarding in QEMU config
- Try: `curl http://localhost:2375/_ping`

### Slow Performance

- Reduce VM RAM allocation
- Use Alpine-based images
- Limit concurrent containers

## 📄 API Reference

### Docker API Endpoints

```typescript
// Container operations
docker.listContainers(all?: boolean)
docker.createContainer(config: CreateContainerConfig)
docker.startContainer(id: string)
docker.stopContainer(id: string, timeout?: number)
docker.removeContainer(id: string, force?: boolean)
docker.getContainerLogs(id: string, tail?: number)
docker.getContainerStats(id: string)

// Image operations
docker.listImages()
docker.pullImage(name: string, onProgress?: Function)
docker.removeImage(id: string, force?: boolean)

// System
docker.ping()
docker.getSystemInfo()
docker.getVersion()
```

### QEMU Service

```typescript
// VM operations
QemuService.initialize()
QemuService.startVM(ramMb: number, cpuCores: number)
QemuService.stopVM()
QemuService.getStatus()
QemuService.downloadAlpineIso()
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [QEMU](https://www.qemu.org/) - The amazing virtualization platform
- [Alpine Linux](https://alpinelinux.org/) - Lightweight Linux distribution
- [Docker](https://www.docker.com/) - Container platform
- [Limbo Emulator](https://github.com/limboemu/limbo) - Android QEMU implementation reference
- [Expo](https://expo.dev/) - React Native framework

## 📞 Support

- Create an issue for bugs
- Discussions for questions
- Wiki for guides

---

Made with ❤️ for Android developers who want Docker on mobile
