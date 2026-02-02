cmake_minimum_required(VERSION 3.10.2)
project(docker_android_jni)

# Source file is located in ../jni/qemu_jni.c
add_library(qemu_jni SHARED ../jni/qemu_jni.c)

# Include JNI and Android log headers
include_directories(${CMAKE_SOURCE_DIR}/../jni)

find_library(log-lib log)

# Link with system log library
target_link_libraries(qemu_jni ${log-lib})

# Prevent symbol stripping for easier debugging
set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} -fvisibility=default")
