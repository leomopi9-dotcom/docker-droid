# Android.mk for QEMU JNI wrapper

LOCAL_PATH := $(call my-dir)

include $(CLEAR_VARS)

LOCAL_MODULE := qemu_jni
LOCAL_SRC_FILES := qemu_jni.c
LOCAL_LDLIBS := -llog -landroid
LOCAL_CFLAGS := -Wall -Wextra -O2

include $(BUILD_SHARED_LIBRARY)
