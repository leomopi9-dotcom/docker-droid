package com.dockerandroid.app.qemu

import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import kotlinx.coroutines.*
import java.io.*
import java.net.HttpURLConnection
import java.net.URL

class QemuModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "QemuModule"
        private const val MODULE_NAME = "QemuModule"
        
        // VM States
        const val VM_STATE_STOPPED = "stopped"
        const val VM_STATE_STARTING = "starting"
        const val VM_STATE_RUNNING = "running"
        const val VM_STATE_STOPPING = "stopping"
        const val VM_STATE_ERROR = "error"
        
        // Default QEMU configuration
        private const val DEFAULT_RAM_MB = 2048
        private const val DEFAULT_CPU_CORES = 2
        private const val DEFAULT_DISK_SIZE_MB = 10240 // 10GB
        
        // Port forwarding
        private const val DOCKER_API_PORT = 2375
        private const val SSH_PORT = 2222
        private const val WEB_PORT_START = 8080
    }

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var qemuProcess: Process? = null
    private var vmState: String = VM_STATE_STOPPED
    private var qemuDir: File? = null
    private var logReader: Job? = null

    // JNI Native methods - will be implemented in C
    private external fun nativeInit(dataDir: String): Boolean
    private external fun nativeCreateDisk(path: String, sizeMb: Int): Boolean
    private external fun nativeStart(
        qemuBinary: String,
        isoPath: String,
        diskPath: String,
        ramMb: Int,
        cpuCores: Int,
        ports: String
    ): Long
    private external fun nativeStop(handle: Long): Boolean
    private external fun nativeGetStatus(handle: Long): Int
    private external fun nativeCleanup(handle: Long)

    init {
        try {
            // Load QEMU dependencies from Limbo in correct order
            val limboLibs = listOf(
                "compat-musl",
                "glib-2.0",
                "pixman-1",
                "SDL2",
                "compat-SDL2-ext",
                "compat-SDL2-addons",
                "compat-limbo",
                "limbo"
            )
            
            for (lib in limboLibs) {
                try {
                    System.loadLibrary(lib)
                    Log.d(TAG, "Loaded library: lib$lib.so")
                } catch (e: UnsatisfiedLinkError) {
                    Log.w(TAG, "Optional library not loaded: lib$lib.so - ${e.message}")
                }
            }
            
            // Load our JNI wrapper
            System.loadLibrary("qemu_jni")
            Log.d(TAG, "Native JNI library loaded successfully")
        } catch (e: UnsatisfiedLinkError) {
            Log.w(TAG, "Native library not available, using Java fallback: ${e.message}")
        }
    }

    override fun getName(): String = MODULE_NAME

    override fun getConstants(): Map<String, Any> {
        return mapOf(
            "VM_STATE_STOPPED" to VM_STATE_STOPPED,
            "VM_STATE_STARTING" to VM_STATE_STARTING,
            "VM_STATE_RUNNING" to VM_STATE_RUNNING,
            "VM_STATE_STOPPING" to VM_STATE_STOPPING,
            "VM_STATE_ERROR" to VM_STATE_ERROR,
            "DEFAULT_RAM_MB" to DEFAULT_RAM_MB,
            "DEFAULT_CPU_CORES" to DEFAULT_CPU_CORES,
            "DOCKER_API_PORT" to DOCKER_API_PORT,
            "SSH_PORT" to SSH_PORT
        )
    }

    /**
     * Initialize QEMU environment - copies assets, creates directories
     */
    @ReactMethod
    fun initialize(promise: Promise) {
        scope.launch {
            try {
                Log.d(TAG, "Initializing QEMU environment...")
                
                val context = reactApplicationContext
                val dataDir = context.filesDir
                qemuDir = File(dataDir, "qemu").also { 
                    if (!it.exists()) it.mkdirs() 
                }

                // Copy Alpine ISO from assets if exists
                val isoFile = File(qemuDir, "alpine-virt.iso")
                if (!isoFile.exists()) {
                    try {
                        copyAssetToFile(context, "qemu/alpine-virt.iso", isoFile)
                        Log.d(TAG, "Copied Alpine ISO to ${isoFile.absolutePath}")
                    } catch (e: Exception) {
                        Log.w(TAG, "Alpine ISO not in assets, will need to download: ${e.message}")
                    }
                }

                // Copy setup script
                val setupScript = File(qemuDir, "alpine-setup.sh")
                if (!setupScript.exists()) {
                    createAlpineSetupScript(setupScript)
                }

                // Create disk image if not exists
                val diskFile = File(qemuDir, "alpine-disk.qcow2")
                if (!diskFile.exists()) {
                    Log.d(TAG, "Creating virtual disk...")
                    createDiskImage(diskFile, DEFAULT_DISK_SIZE_MB)
                }

                // Copy QEMU config
                val configFile = File(qemuDir, "qemu-config.json")
                if (!configFile.exists()) {
                    createQemuConfig(configFile)
                }
                
                // Copy BIOS/ROM files from assets
                val romsDir = File(qemuDir, "roms")
                if (!romsDir.exists()) {
                    romsDir.mkdirs()
                    copyAssetDirectory(context, "qemu/roms", romsDir)
                    Log.d(TAG, "Copied BIOS/ROM files to ${romsDir.absolutePath}")
                }

                // Find QEMU binary
                val qemuBinary = findQemuBinary()

                val result = Arguments.createMap().apply {
                    putBoolean("success", true)
                    putString("qemuDir", qemuDir?.absolutePath)
                    putString("isoPath", isoFile.absolutePath)
                    putString("diskPath", diskFile.absolutePath)
                    putBoolean("isoExists", isoFile.exists())
                    putBoolean("diskExists", diskFile.exists())
                    putBoolean("romsExists", romsDir.exists() && romsDir.listFiles()?.isNotEmpty() == true)
                    putBoolean("qemuBinaryExists", qemuBinary != null)
                    putString("qemuBinaryPath", qemuBinary?.absolutePath ?: "")
                    putString("architecture", Build.SUPPORTED_ABIS.firstOrNull() ?: "unknown")
                }

                withContext(Dispatchers.Main) {
                    promise.resolve(result)
                }
                
            } catch (e: Exception) {
                Log.e(TAG, "Initialization failed", e)
                withContext(Dispatchers.Main) {
                    promise.reject("INIT_ERROR", "Failed to initialize QEMU: ${e.message}", e)
                }
            }
        }
    }

    /**
     * Start the QEMU VM
     */
    @ReactMethod
    fun startVM(ramMb: Int, cpuCores: Int, promise: Promise) {
        scope.launch {
            try {
                if (vmState == VM_STATE_RUNNING || vmState == VM_STATE_STARTING) {
                    withContext(Dispatchers.Main) {
                        promise.reject("VM_ALREADY_RUNNING", "VM is already running or starting")
                    }
                    return@launch
                }

                updateVmState(VM_STATE_STARTING)
                Log.d(TAG, "Starting VM with ${ramMb}MB RAM and $cpuCores CPU cores")

                val qemuBinary = findQemuBinary()
                if (qemuBinary == null) {
                    throw Exception("QEMU binary not found. Please install QEMU binary.")
                }

                val isoFile = File(qemuDir, "alpine-virt.iso")
                val diskFile = File(qemuDir, "alpine-disk.qcow2")

                if (!isoFile.exists()) {
                    throw Exception("Alpine ISO not found at ${isoFile.absolutePath}")
                }

                // Build QEMU command
                val qemuArgs = buildQemuArgs(
                    qemuBinary = qemuBinary.absolutePath,
                    isoPath = isoFile.absolutePath,
                    diskPath = diskFile.absolutePath,
                    ramMb = ramMb,
                    cpuCores = cpuCores
                )

                Log.d(TAG, "QEMU command: ${qemuArgs.joinToString(" ")}")

                // Start QEMU process
                val processBuilder = ProcessBuilder(qemuArgs)
                    .directory(qemuDir)
                    .redirectErrorStream(true)
                
                qemuProcess = processBuilder.start()

                // Start log reader
                startLogReader()

                // Wait for Docker API to be available
                val dockerReady = waitForDockerApi(60) // 60 seconds timeout
                
                if (dockerReady) {
                    updateVmState(VM_STATE_RUNNING)
                    
                    val result = Arguments.createMap().apply {
                        putBoolean("success", true)
                        putString("state", VM_STATE_RUNNING)
                        putInt("dockerPort", DOCKER_API_PORT)
                        putInt("sshPort", SSH_PORT)
                    }
                    
                    withContext(Dispatchers.Main) {
                        promise.resolve(result)
                    }
                } else {
                    // VM started but Docker not ready - still considered running
                    updateVmState(VM_STATE_RUNNING)
                    
                    val result = Arguments.createMap().apply {
                        putBoolean("success", true)
                        putString("state", VM_STATE_RUNNING)
                        putBoolean("dockerReady", false)
                        putString("message", "VM started but Docker may need more time to initialize")
                    }
                    
                    withContext(Dispatchers.Main) {
                        promise.resolve(result)
                    }
                }

            } catch (e: Exception) {
                Log.e(TAG, "Failed to start VM", e)
                updateVmState(VM_STATE_ERROR)
                withContext(Dispatchers.Main) {
                    promise.reject("START_ERROR", "Failed to start VM: ${e.message}", e)
                }
            }
        }
    }

    /**
     * Stop the QEMU VM
     */
    @ReactMethod
    fun stopVM(promise: Promise) {
        scope.launch {
            try {
                if (vmState == VM_STATE_STOPPED) {
                    withContext(Dispatchers.Main) {
                        promise.resolve(Arguments.createMap().apply {
                            putBoolean("success", true)
                            putString("state", VM_STATE_STOPPED)
                        })
                    }
                    return@launch
                }

                updateVmState(VM_STATE_STOPPING)
                Log.d(TAG, "Stopping VM...")

                // Stop log reader
                logReader?.cancel()
                logReader = null

                // Try graceful shutdown first via QEMU monitor
                try {
                    sendQemuCommand("system_powerdown")
                    delay(5000) // Wait 5 seconds for graceful shutdown
                } catch (e: Exception) {
                    Log.w(TAG, "Graceful shutdown failed: ${e.message}")
                }

                // Force kill if still running
                qemuProcess?.let { process ->
                    if (process.isAlive) {
                        process.destroyForcibly()
                        process.waitFor()
                    }
                }
                qemuProcess = null

                updateVmState(VM_STATE_STOPPED)

                val result = Arguments.createMap().apply {
                    putBoolean("success", true)
                    putString("state", VM_STATE_STOPPED)
                }

                withContext(Dispatchers.Main) {
                    promise.resolve(result)
                }

            } catch (e: Exception) {
                Log.e(TAG, "Failed to stop VM", e)
                withContext(Dispatchers.Main) {
                    promise.reject("STOP_ERROR", "Failed to stop VM: ${e.message}", e)
                }
            }
        }
    }

    /**
     * Get current VM status
     */
    @ReactMethod
    fun getStatus(promise: Promise) {
        scope.launch {
            try {
                val isProcessAlive = qemuProcess?.isAlive ?: false
                
                // Check Docker API availability
                val dockerAvailable = if (isProcessAlive) {
                    checkDockerApi()
                } else {
                    false
                }

                val result = Arguments.createMap().apply {
                    putString("state", vmState)
                    putBoolean("isRunning", isProcessAlive)
                    putBoolean("dockerAvailable", dockerAvailable)
                    putInt("dockerPort", DOCKER_API_PORT)
                    putInt("sshPort", SSH_PORT)
                }

                withContext(Dispatchers.Main) {
                    promise.resolve(result)
                }

            } catch (e: Exception) {
                Log.e(TAG, "Failed to get status", e)
                withContext(Dispatchers.Main) {
                    promise.reject("STATUS_ERROR", "Failed to get VM status: ${e.message}", e)
                }
            }
        }
    }

    /**
     * Get VM logs
     */
    @ReactMethod
    fun getLogs(tail: Int, promise: Promise) {
        scope.launch {
            try {
                val logFile = File(qemuDir, "qemu.log")
                val logs = if (logFile.exists()) {
                    logFile.readLines().takeLast(tail).joinToString("\n")
                } else {
                    ""
                }

                val result = Arguments.createMap().apply {
                    putString("logs", logs)
                }

                withContext(Dispatchers.Main) {
                    promise.resolve(result)
                }

            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    promise.reject("LOG_ERROR", "Failed to get logs: ${e.message}", e)
                }
            }
        }
    }

    /**
     * Download Alpine Linux ISO
     */
    @ReactMethod
    fun downloadAlpineIso(promise: Promise) {
        scope.launch {
            try {
                val isoUrl = "https://dl-cdn.alpinelinux.org/alpine/v3.19/releases/x86_64/alpine-virt-3.19.1-x86_64.iso"
                val isoFile = File(qemuDir, "alpine-virt.iso")

                sendEvent("qemu_download_progress", Arguments.createMap().apply {
                    putInt("progress", 0)
                    putString("status", "starting")
                })

                downloadFile(isoUrl, isoFile) { progress ->
                    sendEvent("qemu_download_progress", Arguments.createMap().apply {
                        putInt("progress", progress)
                        putString("status", "downloading")
                    })
                }

                sendEvent("qemu_download_progress", Arguments.createMap().apply {
                    putInt("progress", 100)
                    putString("status", "complete")
                })

                val result = Arguments.createMap().apply {
                    putBoolean("success", true)
                    putString("path", isoFile.absolutePath)
                    putLong("size", isoFile.length())
                }

                withContext(Dispatchers.Main) {
                    promise.resolve(result)
                }

            } catch (e: Exception) {
                Log.e(TAG, "Failed to download Alpine ISO", e)
                withContext(Dispatchers.Main) {
                    promise.reject("DOWNLOAD_ERROR", "Failed to download Alpine ISO: ${e.message}", e)
                }
            }
        }
    }

    /**
     * Check if required files exist
     */
    @ReactMethod
    fun checkRequirements(promise: Promise) {
        scope.launch {
            try {
                val qemuBinary = findQemuBinary()
                val isoFile = File(qemuDir, "alpine-virt.iso")
                val diskFile = File(qemuDir, "alpine-disk.qcow2")

                val result = Arguments.createMap().apply {
                    putBoolean("qemuBinaryExists", qemuBinary != null)
                    putString("qemuBinaryPath", qemuBinary?.absolutePath ?: "")
                    putBoolean("alpineIsoExists", isoFile.exists())
                    putString("alpineIsoPath", isoFile.absolutePath)
                    putLong("alpineIsoSize", if (isoFile.exists()) isoFile.length() else 0)
                    putBoolean("diskImageExists", diskFile.exists())
                    putString("diskImagePath", diskFile.absolutePath)
                    putLong("diskImageSize", if (diskFile.exists()) diskFile.length() else 0)
                    putBoolean("allRequirementsMet", qemuBinary != null && isoFile.exists())
                }

                withContext(Dispatchers.Main) {
                    promise.resolve(result)
                }

            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    promise.reject("CHECK_ERROR", "Failed to check requirements: ${e.message}", e)
                }
            }
        }
    }

    // ============== Private Helper Methods ==============

    private fun buildQemuArgs(
        qemuBinary: String,
        isoPath: String,
        diskPath: String,
        ramMb: Int,
        cpuCores: Int
    ): List<String> {
        val biosDir = File(reactApplicationContext.filesDir, "qemu/roms")
        val args = mutableListOf(
            qemuBinary,
            "-machine", "q35",
            "-cpu", "max",
            "-smp", cpuCores.toString(),
            "-m", "${ramMb}M",
            "-cdrom", isoPath,
            "-drive", "file=$diskPath,format=qcow2,if=virtio",
            "-boot", "d",
            "-netdev", "user,id=net0,hostfwd=tcp::$DOCKER_API_PORT-:2375,hostfwd=tcp::$SSH_PORT-:22,hostfwd=tcp::8080-:80,hostfwd=tcp::8081-:8080,hostfwd=tcp::3000-:3000",
            "-device", "virtio-net-pci,netdev=net0",
            "-display", "none",
            "-daemonize",
            "-pidfile", "${qemuDir?.absolutePath}/qemu.pid",
            "-serial", "file:${qemuDir?.absolutePath}/qemu.log"
        )
        
        // Add BIOS path if available
        if (biosDir.exists()) {
            args.addAll(listOf("-L", biosDir.absolutePath))
        }
        
        return args
    }

    private fun findQemuBinary(): File? {
        val context = reactApplicationContext
        
        // Check in jniLibs
        val libDir = File(context.applicationInfo.nativeLibraryDir)
        val binaryNames = listOf(
            "libqemu-system-x86_64.so",
            "libqemu.so",
            "qemu-system-x86_64"
        )
        
        for (name in binaryNames) {
            val binary = File(libDir, name)
            if (binary.exists() && binary.canExecute()) {
                return binary
            }
        }

        // Check in assets extracted location
        val extractedBinary = File(qemuDir, "qemu-system-x86_64")
        if (extractedBinary.exists() && extractedBinary.canExecute()) {
            return extractedBinary
        }

        // Check system PATH (for development)
        val systemPaths = listOf(
            "/usr/bin/qemu-system-x86_64",
            "/usr/local/bin/qemu-system-x86_64"
        )
        for (path in systemPaths) {
            val binary = File(path)
            if (binary.exists() && binary.canExecute()) {
                return binary
            }
        }

        return null
    }

    private fun copyAssetToFile(context: Context, assetPath: String, outFile: File) {
        context.assets.open(assetPath).use { input ->
            FileOutputStream(outFile).use { output ->
                input.copyTo(output)
            }
        }
    }
    
    private fun copyAssetDirectory(context: Context, assetDir: String, outDir: File) {
        val assets = context.assets
        try {
            val files = assets.list(assetDir) ?: return
            
            for (filename in files) {
                val assetPath = "$assetDir/$filename"
                val outFile = File(outDir, filename)
                
                try {
                    // Try to open as file first
                    assets.open(assetPath).use { input ->
                        FileOutputStream(outFile).use { output ->
                            input.copyTo(output)
                        }
                    }
                    Log.d(TAG, "Copied asset: $assetPath")
                } catch (e: Exception) {
                    // If it fails, it might be a directory
                    val subDir = File(outDir, filename)
                    subDir.mkdirs()
                    copyAssetDirectory(context, assetPath, subDir)
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to copy asset directory $assetDir: ${e.message}")
        }
    }

    private fun createDiskImage(diskFile: File, sizeMb: Int) {
        // Create a sparse QCOW2-like file (simplified)
        // In production, use qemu-img or native JNI call
        diskFile.createNewFile()
        
        // Write minimal QCOW2 header
        RandomAccessFile(diskFile, "rw").use { raf ->
            // QCOW2 magic number
            raf.write(byteArrayOf(0x51, 0x46, 0x49, 0xFB.toByte())) // "QFI\xfb"
            // Version 3
            raf.writeInt(3)
            // Backing file offset (0 = no backing file)
            raf.writeLong(0)
            // Backing file size
            raf.writeInt(0)
            // Cluster bits (16 = 64KB clusters)
            raf.writeInt(16)
            // Size in bytes
            raf.writeLong(sizeMb.toLong() * 1024 * 1024)
            // Encryption method (0 = none)
            raf.writeInt(0)
            // L1 size
            raf.writeInt(0)
            // L1 table offset
            raf.writeLong(0)
            // Refcount table offset
            raf.writeLong(0)
            // Refcount table clusters
            raf.writeInt(0)
            // Snapshots
            raf.writeInt(0)
            // Snapshot offset
            raf.writeLong(0)
        }
        
        Log.d(TAG, "Created disk image at ${diskFile.absolutePath}")
    }

    private fun createAlpineSetupScript(scriptFile: File) {
        val script = """
            #!/bin/sh
            # Alpine Linux auto-setup script for Docker
            
            echo "Starting Alpine Docker setup..."
            
            # Setup networking
            setup-interfaces -a
            rc-service networking start
            
            # Update package repository
            apk update
            apk upgrade
            
            # Install Docker
            apk add docker docker-compose openrc
            
            # Enable and start Docker
            rc-update add docker boot
            rc-service docker start
            
            # Configure Docker to listen on TCP
            mkdir -p /etc/docker
            cat > /etc/docker/daemon.json << 'EOF'
            {
                "hosts": ["unix:///var/run/docker.sock", "tcp://0.0.0.0:2375"],
                "storage-driver": "overlay2",
                "log-driver": "json-file",
                "log-opts": {
                    "max-size": "10m",
                    "max-file": "3"
                }
            }
            EOF
            
            # Restart Docker with new config
            rc-service docker restart
            
            # Install commonly used tools
            apk add curl wget vim htop
            
            # Enable SSH
            apk add openssh
            rc-update add sshd
            rc-service sshd start
            
            # Set root password (for development)
            echo "root:docker" | chpasswd
            
            # Pull base images
            docker pull alpine:latest
            docker pull nginx:alpine
            
            echo "Alpine Docker setup complete!"
            echo "Docker API: http://localhost:2375"
            echo "SSH: port 22 (user: root, pass: docker)"
        """.trimIndent()

        scriptFile.writeText(script)
        scriptFile.setExecutable(true)
        Log.d(TAG, "Created Alpine setup script at ${scriptFile.absolutePath}")
    }

    private fun createQemuConfig(configFile: File) {
        val config = """
            {
                "version": "1.0",
                "machine": "q35",
                "cpu": "max",
                "defaultRam": $DEFAULT_RAM_MB,
                "defaultCpuCores": $DEFAULT_CPU_CORES,
                "ports": {
                    "docker": $DOCKER_API_PORT,
                    "ssh": $SSH_PORT,
                    "web": $WEB_PORT_START
                },
                "network": {
                    "type": "user",
                    "forwarding": true
                }
            }
        """.trimIndent()

        configFile.writeText(config)
        Log.d(TAG, "Created QEMU config at ${configFile.absolutePath}")
    }

    private suspend fun waitForDockerApi(timeoutSeconds: Int): Boolean {
        val startTime = System.currentTimeMillis()
        val timeoutMs = timeoutSeconds * 1000L

        while (System.currentTimeMillis() - startTime < timeoutMs) {
            if (checkDockerApi()) {
                return true
            }
            delay(2000) // Check every 2 seconds
        }
        return false
    }

    private fun checkDockerApi(): Boolean {
        return try {
            val url = URL("http://localhost:$DOCKER_API_PORT/_ping")
            val connection = url.openConnection() as HttpURLConnection
            connection.requestMethod = "GET"
            connection.connectTimeout = 2000
            connection.readTimeout = 2000
            
            val responseCode = connection.responseCode
            connection.disconnect()
            
            responseCode == 200
        } catch (e: Exception) {
            false
        }
    }

    private fun sendQemuCommand(command: String) {
        // Send command to QEMU monitor (via socket or other mechanism)
        // This is a placeholder - actual implementation depends on QEMU setup
        Log.d(TAG, "Sending QEMU command: $command")
    }

    private fun startLogReader() {
        logReader?.cancel()
        logReader = scope.launch {
            val logFile = File(qemuDir, "qemu.log")
            var lastPosition = 0L

            while (isActive && vmState == VM_STATE_RUNNING) {
                try {
                    if (logFile.exists() && logFile.length() > lastPosition) {
                        RandomAccessFile(logFile, "r").use { raf ->
                            raf.seek(lastPosition)
                            val newContent = StringBuilder()
                            var line: String?
                            while (raf.readLine().also { line = it } != null) {
                                newContent.append(line).append("\n")
                            }
                            lastPosition = raf.filePointer

                            if (newContent.isNotEmpty()) {
                                sendEvent("qemu_log", Arguments.createMap().apply {
                                    putString("log", newContent.toString())
                                })
                            }
                        }
                    }
                } catch (e: Exception) {
                    Log.w(TAG, "Error reading logs: ${e.message}")
                }
                delay(1000)
            }
        }
    }

    private fun updateVmState(newState: String) {
        vmState = newState
        sendEvent("qemu_state_change", Arguments.createMap().apply {
            putString("state", newState)
        })
    }

    private fun sendEvent(eventName: String, params: WritableMap) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            ?.emit(eventName, params)
    }

    private suspend fun downloadFile(urlString: String, outFile: File, onProgress: (Int) -> Unit) {
        withContext(Dispatchers.IO) {
            val url = URL(urlString)
            val connection = url.openConnection() as HttpURLConnection
            connection.connect()

            val fileLength = connection.contentLength
            var downloaded = 0L

            connection.inputStream.use { input ->
                FileOutputStream(outFile).use { output ->
                    val buffer = ByteArray(8192)
                    var bytesRead: Int
                    while (input.read(buffer).also { bytesRead = it } != -1) {
                        output.write(buffer, 0, bytesRead)
                        downloaded += bytesRead
                        val progress = ((downloaded * 100) / fileLength).toInt()
                        onProgress(progress)
                    }
                }
            }
        }
    }

    /**
     * Create a manual test crash log file in the same directory used by CrashHandler.
     * Returns { path } on success.
     */
    @ReactMethod
    fun createTestCrashLog(promise: Promise) {
        scope.launch {
            try {
                val dir = reactApplicationContext.getExternalFilesDir("crash_logs") ?: reactApplicationContext.filesDir
                dir?.mkdirs()
                val stamp = java.text.SimpleDateFormat("yyyy-MM-dd_HH-mm-ss", java.util.Locale.US).format(java.util.Date())
                val file = File(dir, "manual_test_${'$'}{stamp}.log")
                val content = buildString {
                    append("manual test log\n")
                    append("package: ${'$'}{reactApplicationContext.packageName}\n")
                    append("time: ${'$'}{stamp}\n\n")
                    append("This is a sample test crash log.\n")
                }
                file.writeText(content)
                Log.i(TAG, "Wrote test crash log to ${'$'}{file.absolutePath}")

                withContext(Dispatchers.Main) {
                    val result = Arguments.createMap().apply { putString("path", file.absolutePath) }
                    promise.resolve(result)
                }
            } catch (e: Exception) {
                Log.w(TAG, "Failed to write test crash log: ${e.message}")
                withContext(Dispatchers.Main) {
                    promise.reject("WRITE_FAILED", "Failed to write test crash log: ${e.message}", e)
                }
            }
        }
    }

    /**
     * Trigger a native RuntimeException immediately to test crash reporting.
     * This will kill the app and should be used only from a debug/test action.
     */
    @ReactMethod
    fun triggerNativeCrash() {
        throw RuntimeException("Manual test crash triggered by user via QemuModule.triggerNativeCrash()")
    }

    override fun invalidate() {
        super.invalidate()
        scope.cancel()
        logReader?.cancel()
        qemuProcess?.destroyForcibly()
    }
}
