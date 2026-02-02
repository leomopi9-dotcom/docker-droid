# Docker Droid - Development Roadmap

> 🚧 **Status**: Draft - To be refined after APK testing

## 📍 Current State (v0.1.0)

### ✅ Completed
- [x] React Native app structure (Expo SDK 54)
- [x] UI/UX with watercolor aesthetic design
- [x] Navigation (Bottom tabs + Stack)
- [x] Docker API client (full implementation)
- [x] Zustand state management
- [x] Native Android module (QemuModule.kt)
- [x] JNI wrapper (qemu_jni.c)
- [x] QEMU binaries from Limbo (arm64-v8a, armeabi-v7a)
- [x] BIOS/ROM files
- [x] GitHub Actions workflow for EAS Build

### ⏳ Pending Testing
- [ ] QEMU VM boot on real Android device
- [ ] Alpine Linux auto-setup
- [ ] Docker API accessibility
- [ ] Container lifecycle management
- [ ] Port forwarding verification
- [ ] WebView container access
- [ ] Terminal exec functionality
- [ ] Performance benchmarks

---

## 🗺️ Roadmap Phases

### Phase 1: Core Stability (v0.2.0)
**Goal**: Ensure basic QEMU + Docker functionality works reliably

**Tasks**:
1. **APK Testing & Bug Fixes**
   - Test on multiple devices (different RAM, CPU)
   - Fix QEMU boot issues
   - Verify Alpine auto-setup script
   - Test Docker daemon startup

2. **React Native ↔ Native Communication**
   - Improve event handling (state changes, logs)
   - Add proper error propagation
   - Implement retry mechanisms
   - Handle process lifecycle (app background/foreground)

3. **VM Management Improvements**
   - Proper VM state persistence
   - Graceful shutdown handling
   - Crash recovery
   - Disk image management

---

### Phase 2: Performance & Reliability (v0.3.0)
**Goal**: Optimize for mobile environment

**Tasks**:
1. **QEMU Optimization**
   - Tune CPU/memory settings for mobile
   - Implement adaptive resource allocation
   - Battery-aware performance modes
   - Thermal throttling handling

2. **Docker Optimization**
   - Limit concurrent containers
   - Memory limits per container
   - Image size recommendations
   - Auto-cleanup unused resources

3. **Network Optimization**
   - Stable port forwarding
   - Handle network changes (WiFi ↔ Mobile)
   - Connection retry logic
   - Offline mode improvements

---

### Phase 3: Custom Domain Engine (v0.4.0) 🔥
**Goal**: Turn Android into a portable web server with public access

**Architecture**:
```
┌─────────────────────────────────────────────────────────────┐
│                     DOCKER DROID                            │
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    │
│  │  Container  │    │  Container  │    │  Container  │    │
│  │  (Web App)  │    │  (API)      │    │  (DB)       │    │
│  │  :3000      │    │  :8080      │    │  :5432      │    │
│  └──────┬──────┘    └──────┬──────┘    └─────────────┘    │
│         │                  │                               │
│         └────────┬─────────┘                               │
│                  ▼                                          │
│  ┌─────────────────────────────────────────────────────┐  │
│  │              REVERSE PROXY (nginx)                   │  │
│  │  - Route by subdomain/path                          │  │
│  │  - SSL termination                                  │  │
│  │  - Load balancing                                   │  │
│  └──────────────────────┬──────────────────────────────┘  │
│                         │                                  │
│                         ▼                                  │
│  ┌─────────────────────────────────────────────────────┐  │
│  │              TUNNEL ENGINE                           │  │
│  │  Option A: ngrok (easy setup)                       │  │
│  │  Option B: Cloudflare Tunnel (free, reliable)       │  │
│  │  Option C: Custom VPS tunnel (full control)         │  │
│  └──────────────────────┬──────────────────────────────┘  │
│                         │                                  │
└─────────────────────────┼──────────────────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │   PUBLIC INTERNET     │
              │                       │
              │  myapp.ngrok.io       │
              │  myapp.example.com    │
              └───────────────────────┘
```

**Features**:
1. **Tunnel Options**
   - ngrok integration (easiest)
   - Cloudflare Tunnel (free, no port limits)
   - WireGuard to VPS (most flexible)

2. **Domain Management UI**
   - Add/remove custom domains
   - Subdomain routing per container
   - SSL certificate status
   - Traffic analytics

3. **Reverse Proxy (nginx)**
   - Auto-config based on containers
   - Path-based routing
   - WebSocket support
   - Rate limiting

4. **Implementation Approach**:
   ```
   React Native (UI)
        │
        ▼
   Native Module (TunnelModule.kt)
        │
        ├── ngrok binary (bundled)
        ├── cloudflared binary (optional)
        └── WireGuard integration
        │
        ▼
   Docker Container (nginx)
        │
        ▼
   Other Containers
   ```

---

### Phase 4: UI/UX Polish (v0.5.0)
**Goal**: Premium user experience

**Tasks**:
1. **Onboarding Flow**
   - First-time setup wizard
   - Resource requirements check
   - Permission explanations

2. **Dashboard Improvements**
   - Real-time resource graphs
   - Container health indicators
   - Quick actions
   - Notifications

3. **Container Management**
   - Improved create container form
   - Environment variables editor
   - Volume mounting UI
   - Network configuration

4. **Animations & Feedback**
   - Skeleton loading states
   - Pull-to-refresh animations
   - Haptic feedback refinement
   - Transition animations

5. **Accessibility**
   - Screen reader support
   - High contrast mode
   - Font size scaling

---

### Phase 5: Advanced Features (v1.0.0)
**Goal**: Production-ready release

**Features**:
1. **Docker Compose Support**
   - Parse docker-compose.yml
   - Multi-container deployments
   - Dependency management

2. **Backup & Restore**
   - Export container configs
   - Volume backups
   - Full VM snapshots

3. **Monitoring & Logs**
   - Centralized log viewer
   - Resource usage history
   - Alert system

4. **Security**
   - Container isolation verification
   - Network security options
   - Secrets management

5. **Marketplace** (Future)
   - Pre-configured stacks
   - One-click deployments
   - Community templates

---

## 🏗️ Technical Challenges

### React Native ↔ Native Android Communication

```
┌─────────────────────────────────────────────────────────────┐
│                    REACT NATIVE                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  JavaScript Thread                                   │   │
│  │  - UI Logic                                         │   │
│  │  - State Management (Zustand)                       │   │
│  │  - API Calls (DockerAPI.ts)                        │   │
│  └──────────────────────┬──────────────────────────────┘   │
│                         │                                   │
│                    NativeModules                            │
│                         │                                   │
│  ┌──────────────────────▼──────────────────────────────┐   │
│  │  Bridge Thread                                       │   │
│  │  - Serialization (JSON)                             │   │
│  │  - Method calls                                     │   │
│  │  - Event emission                                   │   │
│  └──────────────────────┬──────────────────────────────┘   │
└─────────────────────────┼───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                    NATIVE ANDROID                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  QemuModule.kt                                       │   │
│  │  - VM lifecycle management                          │   │
│  │  - Process spawning                                 │   │
│  │  - File I/O                                         │   │
│  └──────────────────────┬──────────────────────────────┘   │
│                         │                                   │
│  ┌──────────────────────▼──────────────────────────────┐   │
│  │  JNI Layer (qemu_jni.c)                             │   │
│  │  - Low-level process control                        │   │
│  │  - Signal handling                                  │   │
│  └──────────────────────┬──────────────────────────────┘   │
│                         │                                   │
│  ┌──────────────────────▼──────────────────────────────┐   │
│  │  QEMU Process                                        │   │
│  │  - Alpine Linux VM                                  │   │
│  │  - Docker Engine                                    │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Key Considerations**:
1. **Async Communication**
   - All native calls are async via Promises
   - Events for real-time updates (logs, status)
   - Proper error handling across bridge

2. **Thread Safety**
   - Native operations on background threads
   - UI updates on main thread
   - Coroutines in Kotlin for async work

3. **State Synchronization**
   - Native module holds source of truth for VM state
   - React Native subscribes to state changes
   - Handle reconnection on app resume

4. **Resource Management**
   - Foreground service for background operation
   - Proper cleanup on app close
   - Memory pressure handling

---

## 📊 Testing Matrix

| Device | RAM | Android | Status |
|--------|-----|---------|--------|
| Pixel 6 | 8GB | 14 | Pending |
| Samsung S21 | 8GB | 13 | Pending |
| Xiaomi Note 10 | 6GB | 12 | Pending |
| Budget Phone | 4GB | 10 | Pending |
| Emulator | 4GB | 13 | Pending |

**Minimum Requirements** (Target):
- Android 7.0+ (API 24)
- 4GB RAM (2GB for VM)
- 5GB free storage
- ARM64 or ARM32 processor

---

## 📅 Timeline (Tentative)

| Phase | Target | Dependencies |
|-------|--------|--------------|
| Phase 1 | After testing | APK build success |
| Phase 2 | +2-3 weeks | Phase 1 complete |
| Phase 3 | +3-4 weeks | Phase 2 stable |
| Phase 4 | +2 weeks | Parallel with Phase 3 |
| Phase 5 | +4 weeks | All phases complete |

---

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

*Last updated: $(date +%Y-%m-%d)*
