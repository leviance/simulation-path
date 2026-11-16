#pragma once
#include <stdexcept>

namespace water3 {
// A failed fence or driver timeout is fatal. UI handlers must not swallow it and resume work.
// [snippet fatal-gpu-error]
class GpuBatchError : public std::runtime_error {
    public:
    explicit GpuBatchError(const char* message)
        : std::runtime_error(message) {}
};

// [/snippet fatal-gpu-error]
} // namespace water3
