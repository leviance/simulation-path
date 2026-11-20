#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 6
#endif
#include "flex/tool.hpp"
#include "markup/window.hpp"

// Cùng cây HTML và cùng stylesheet phải dùng được ở nhiều độ rộng.
int main(int argc, char** argv) {
    return tiny::run<tiny::FlexTool>(argc, argv, "70 / Flock Observatory - TinyFlex");
}
