#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 7
#endif
#include "markup/window.hpp"
#include "script/tool.hpp"

// Script chỉ điều khiển bàn quan sát; bước thời gian và thuật toán Boids vẫn chạy bằng C++.
int main(int argc, char** argv) {
    return tiny::run<ink::ScriptTool>(argc, argv, "72 / Flock Observatory - TinyScript");
}
