/**
 * QEMU JNI Wrapper for Android
 * 
 * This provides native methods for controlling QEMU from Java/Kotlin.
 * The actual QEMU binary is loaded separately - this just manages the process.
 */

#include <jni.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <signal.h>
#include <fcntl.h>
#include <errno.h>
#include <android/log.h>

#define LOG_TAG "QemuJNI"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)
#define LOGD(...) __android_log_print(ANDROID_LOG_DEBUG, LOG_TAG, __VA_ARGS__)

// QEMU process handle structure
typedef struct {
    pid_t pid;
    int running;
    char data_dir[512];
    char pid_file[512];
    char log_file[512];
} QemuHandle;

// Global handles storage (simple approach - max 4 concurrent VMs)
#define MAX_HANDLES 4
static QemuHandle* handles[MAX_HANDLES] = {NULL};

static QemuHandle* get_handle(jlong handle_id) {
    if (handle_id >= 0 && handle_id < MAX_HANDLES) {
        return handles[handle_id];
    }
    return NULL;
}

static jlong allocate_handle() {
    for (int i = 0; i < MAX_HANDLES; i++) {
        if (handles[i] == NULL) {
            handles[i] = (QemuHandle*)calloc(1, sizeof(QemuHandle));
            if (handles[i]) {
                return (jlong)i;
            }
        }
    }
    return -1;
}

static void free_handle(jlong handle_id) {
    if (handle_id >= 0 && handle_id < MAX_HANDLES && handles[handle_id]) {
        free(handles[handle_id]);
        handles[handle_id] = NULL;
    }
}

/**
 * Initialize QEMU environment
 */
JNIEXPORT jboolean JNICALL
Java_com_dockerandroid_app_qemu_QemuModule_nativeInit(
    JNIEnv *env,
    jobject thiz,
    jstring data_dir
) {
    const char *dir = (*env)->GetStringUTFChars(env, data_dir, NULL);
    if (!dir) {
        LOGE("Failed to get data directory string");
        return JNI_FALSE;
    }

    LOGI("Initializing QEMU JNI with data dir: %s", dir);

    // Check if directory exists
    if (access(dir, F_OK) != 0) {
        LOGE("Data directory does not exist: %s", dir);
        (*env)->ReleaseStringUTFChars(env, data_dir, dir);
        return JNI_FALSE;
    }

    (*env)->ReleaseStringUTFChars(env, data_dir, dir);
    return JNI_TRUE;
}

/**
 * Create a QCOW2 disk image
 */
JNIEXPORT jboolean JNICALL
Java_com_dockerandroid_app_qemu_QemuModule_nativeCreateDisk(
    JNIEnv *env,
    jobject thiz,
    jstring path,
    jint size_mb
) {
    const char *disk_path = (*env)->GetStringUTFChars(env, path, NULL);
    if (!disk_path) {
        LOGE("Failed to get disk path string");
        return JNI_FALSE;
    }

    LOGI("Creating disk image: %s, size: %dMB", disk_path, size_mb);

    // Create a sparse file for the disk image
    FILE *fp = fopen(disk_path, "wb");
    if (!fp) {
        LOGE("Failed to create disk file: %s", strerror(errno));
        (*env)->ReleaseStringUTFChars(env, path, disk_path);
        return JNI_FALSE;
    }

    // Write QCOW2 header (simplified)
    // Magic: QFI\xfb
    unsigned char header[512] = {0};
    header[0] = 'Q';
    header[1] = 'F';
    header[2] = 'I';
    header[3] = 0xFB;
    
    // Version: 3
    header[4] = 0;
    header[5] = 0;
    header[6] = 0;
    header[7] = 3;
    
    // Size in bytes (big endian)
    uint64_t size_bytes = (uint64_t)size_mb * 1024 * 1024;
    for (int i = 0; i < 8; i++) {
        header[24 + i] = (size_bytes >> (56 - i * 8)) & 0xFF;
    }

    // Cluster bits: 16 (64KB clusters)
    header[20] = 0;
    header[21] = 0;
    header[22] = 0;
    header[23] = 16;

    fwrite(header, 1, sizeof(header), fp);
    fclose(fp);

    LOGI("Disk image created successfully");
    (*env)->ReleaseStringUTFChars(env, path, disk_path);
    return JNI_TRUE;
}

/**
 * Start QEMU process
 */
JNIEXPORT jlong JNICALL
Java_com_dockerandroid_app_qemu_QemuModule_nativeStart(
    JNIEnv *env,
    jobject thiz,
    jstring qemu_binary,
    jstring iso_path,
    jstring disk_path,
    jint ram_mb,
    jint cpu_cores,
    jstring ports
) {
    const char *binary = (*env)->GetStringUTFChars(env, qemu_binary, NULL);
    const char *iso = (*env)->GetStringUTFChars(env, iso_path, NULL);
    const char *disk = (*env)->GetStringUTFChars(env, disk_path, NULL);
    const char *port_str = (*env)->GetStringUTFChars(env, ports, NULL);

    if (!binary || !iso || !disk || !port_str) {
        LOGE("Failed to get string parameters");
        goto cleanup;
    }

    LOGI("Starting QEMU: binary=%s, iso=%s, disk=%s, ram=%dMB, cpus=%d",
         binary, iso, disk, ram_mb, cpu_cores);

    // Allocate handle
    jlong handle_id = allocate_handle();
    if (handle_id < 0) {
        LOGE("No free handle slots available");
        goto cleanup;
    }

    QemuHandle *handle = handles[handle_id];
    
    // Fork and exec QEMU
    pid_t pid = fork();
    
    if (pid < 0) {
        LOGE("Fork failed: %s", strerror(errno));
        free_handle(handle_id);
        handle_id = -1;
        goto cleanup;
    }
    
    if (pid == 0) {
        // Child process - exec QEMU
        char ram_arg[32];
        char smp_arg[32];
        snprintf(ram_arg, sizeof(ram_arg), "%dM", ram_mb);
        snprintf(smp_arg, sizeof(smp_arg), "%d", cpu_cores);

        // Build netdev argument with port forwarding
        char netdev_arg[512];
        snprintf(netdev_arg, sizeof(netdev_arg),
            "user,id=net0,%s", port_str);

        // Execute QEMU
        execlp(binary, binary,
            "-machine", "q35",
            "-cpu", "max",
            "-smp", smp_arg,
            "-m", ram_arg,
            "-cdrom", iso,
            "-drive", "file=%s,format=qcow2,if=virtio",
            "-boot", "d",
            "-netdev", netdev_arg,
            "-device", "virtio-net-pci,netdev=net0",
            "-display", "none",
            "-nographic",
            NULL);

        // If we get here, exec failed
        LOGE("Exec failed: %s", strerror(errno));
        _exit(1);
    }
    
    // Parent process
    handle->pid = pid;
    handle->running = 1;
    LOGI("QEMU started with PID: %d", pid);

cleanup:
    if (binary) (*env)->ReleaseStringUTFChars(env, qemu_binary, binary);
    if (iso) (*env)->ReleaseStringUTFChars(env, iso_path, iso);
    if (disk) (*env)->ReleaseStringUTFChars(env, disk_path, disk);
    if (port_str) (*env)->ReleaseStringUTFChars(env, ports, port_str);
    
    return handle_id;
}

/**
 * Stop QEMU process
 */
JNIEXPORT jboolean JNICALL
Java_com_dockerandroid_app_qemu_QemuModule_nativeStop(
    JNIEnv *env,
    jobject thiz,
    jlong handle_id
) {
    QemuHandle *handle = get_handle(handle_id);
    if (!handle) {
        LOGE("Invalid handle: %ld", (long)handle_id);
        return JNI_FALSE;
    }

    if (!handle->running) {
        LOGI("QEMU not running");
        return JNI_TRUE;
    }

    LOGI("Stopping QEMU PID: %d", handle->pid);

    // Try SIGTERM first
    if (kill(handle->pid, SIGTERM) == 0) {
        // Wait up to 5 seconds for graceful shutdown
        int status;
        for (int i = 0; i < 50; i++) {
            pid_t result = waitpid(handle->pid, &status, WNOHANG);
            if (result == handle->pid) {
                LOGI("QEMU exited gracefully");
                handle->running = 0;
                return JNI_TRUE;
            }
            usleep(100000); // 100ms
        }
    }

    // Force kill
    LOGI("Force killing QEMU");
    kill(handle->pid, SIGKILL);
    waitpid(handle->pid, NULL, 0);
    handle->running = 0;

    return JNI_TRUE;
}

/**
 * Get QEMU status
 * Returns: 0 = stopped, 1 = running, -1 = error
 */
JNIEXPORT jint JNICALL
Java_com_dockerandroid_app_qemu_QemuModule_nativeGetStatus(
    JNIEnv *env,
    jobject thiz,
    jlong handle_id
) {
    QemuHandle *handle = get_handle(handle_id);
    if (!handle) {
        return -1;
    }

    if (!handle->running) {
        return 0;
    }

    // Check if process is still running
    int status;
    pid_t result = waitpid(handle->pid, &status, WNOHANG);
    
    if (result == 0) {
        // Still running
        return 1;
    } else if (result == handle->pid) {
        // Process exited
        handle->running = 0;
        return 0;
    } else {
        // Error
        return -1;
    }
}

/**
 * Cleanup QEMU handle
 */
JNIEXPORT void JNICALL
Java_com_dockerandroid_app_qemu_QemuModule_nativeCleanup(
    JNIEnv *env,
    jobject thiz,
    jlong handle_id
) {
    QemuHandle *handle = get_handle(handle_id);
    if (!handle) {
        return;
    }

    // Make sure QEMU is stopped
    if (handle->running) {
        kill(handle->pid, SIGKILL);
        waitpid(handle->pid, NULL, 0);
    }

    free_handle(handle_id);
    LOGI("Handle %ld cleaned up", (long)handle_id);
}

/**
 * JNI_OnLoad - called when library is loaded
 */
JNIEXPORT jint JNI_OnLoad(JavaVM *vm, void *reserved) {
    LOGI("QEMU JNI library loaded");
    return JNI_VERSION_1_6;
}

/**
 * JNI_OnUnload - called when library is unloaded
 */
JNIEXPORT void JNI_OnUnload(JavaVM *vm, void *reserved) {
    LOGI("QEMU JNI library unloading");
    
    // Cleanup all handles
    for (int i = 0; i < MAX_HANDLES; i++) {
        if (handles[i]) {
            if (handles[i]->running) {
                kill(handles[i]->pid, SIGKILL);
            }
            free(handles[i]);
            handles[i] = NULL;
        }
    }
}
