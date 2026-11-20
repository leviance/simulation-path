#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 5
#endif
#include "markup/window.hpp"
#include "style/skin.hpp"

// Đổi stylesheet của cùng bàn quan sát, không thay solver Boids.
int main(int argc, char** argv) {
    return tiny::run<tiny::CssTool>(argc, argv, "69 / Flock Observatory - TinyCSS");
}
