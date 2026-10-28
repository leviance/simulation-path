#include "viewer-application.hpp"
#include "viewer-bootstrap.hpp"
#include <string>

// Source của từng checkpoint là một chương trình độc lập; không cần link project khác.
int main(int argc, char** argv) {
#if LAB_CHECKPOINT >= 3
    return lab::runViewerApplication(argc, argv);
#else
    if (argc > 2 || (argc == 2 && std::string(argv[1]) != "--smoke")) {
        return EXIT_FAILURE;
    }
    return lab::runViewerBootstrap(argc == 2);
#endif
}
