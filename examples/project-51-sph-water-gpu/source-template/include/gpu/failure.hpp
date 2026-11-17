#pragma once
#include <cstdlib>
#include <iostream>

namespace water51 {
// A stalled driver must not receive more GL work, including blocking cleanup calls.
// The OS releases this process's resources; already submitted GPU commands cannot be recalled.

[[noreturn]] inline void fatalGpu(const char* message) {
    std::cerr << "Fatal GPU failure: " << message << std::endl;
    std::_Exit(2);
}
} // namespace water51
