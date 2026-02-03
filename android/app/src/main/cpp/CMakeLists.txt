cmake_minimum_required(VERSION 3.18)
project(qemu_jni LANGUAGES C)

# Set the library name
add_library(qemu_jni SHARED
    ${CMAKE_SOURCE_DIR}/../jni/qemu_jni.c
)

# Android log lib
find_library(log-lib log)

# Include directories
include_directories(${CMAKE_SOURCE_DIR}/../jni)

# C flags
target_compile_options(qemu_jni PRIVATE -fPIC -O2)

# Link libraries
target_link_libraries(qemu_jni ${log-lib})

# Ensure library is built for supported ABIs
set_target_properties(qemu_jni PROPERTIES
    LIBRARY_OUTPUT_DIRECTORY ${CMAKE_SOURCE_DIR}/../libs/${ANDROID_ABI}
)