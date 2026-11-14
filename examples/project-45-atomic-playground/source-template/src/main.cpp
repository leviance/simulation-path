#include "atom_capabilities.hpp"
#include "atom_events.hpp"
#if LAB_CHECKPOINT >= 4
#include "atom_verify.hpp"
#endif
#include <iostream>

int main(int argc, char** argv) {
    try {
        // Keep finite-run diagnostics visible even if the graphics driver exits.
        std::cout << std::unitbuf;
        const auto options = atom::parseOptions(argc, argv);
        // Setup: keep the window/context alive longer than its GPU objects.
        atom::NativeWindow window(options.hidden);
        atom::GlApi gl;
        gl.loadAll();
        atom::validateCapabilities(gl);
        std::cout << "OpenGL " << gl.GetString(GL_VERSION) << '\n';
#if LAB_CHECKPOINT >= 4
        if (options.verify) {
            atom::MemoryBudget budget;
            atom::verifyGpu(gl, budget);
        }
#endif
        atom::Application app(gl, window, options);
        // Cleanup: stack unwinding releases app resources before the GL context.
        return app.run();
    } catch (const std::exception& error) {
        std::cerr << "Atomic Playground: " << error.what() << '\n';
        return 1;
    }
}
