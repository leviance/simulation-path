#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 6
#endif
#include "markup/window.hpp"

// Toàn bộ UI nằm cùng cửa sổ với đàn chim; không dùng WebView.
int main(int argc, char** argv) {
    return tiny::run<tiny::HtmlTool>(argc, argv, "68 / Flock Observatory - TinyHTML");
}
