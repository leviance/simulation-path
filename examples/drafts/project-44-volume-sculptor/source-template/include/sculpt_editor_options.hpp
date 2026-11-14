#pragma once

#include "sculpt_brush.hpp"
#include "sculpt_gl.hpp"
#include <charconv>

namespace sculpt {

struct EditorOptions {
    int samples{128};
    int seconds{};
    bool hidden{}, verify{}, verifyEdits{}, verifyFiles{}, verifySlice{}, verifyScene{}, verifyProducts{}, plane{}, showSlice{}, traceInput{}, benchmark{};
    std::filesystem::path capture, load;
    Brush startingBrush;
    float brushDepth{};
};

inline int editorInteger(std::string_view text, int minimum, int maximum) {
    int result{};
    const auto parsed = std::from_chars(text.data(), text.data() + text.size(), result);
    if (parsed.ec != std::errc{} || parsed.ptr != text.data() + text.size() || result < minimum || result > maximum)
        throw std::invalid_argument("Invalid integer option");
    return result;
}

inline float editorRealOption(std::string_view text, float minimum, float maximum) {
    float result{};
    const auto parsed = std::from_chars(text.data(), text.data() + text.size(), result);
    if (parsed.ec != std::errc{} || parsed.ptr != text.data() + text.size() || !std::isfinite(result) || result < minimum || result > maximum)
        throw std::invalid_argument("Invalid finite numeric option");
    return result;
}

inline EditorOptions parseEditorOptions(int argc, char** argv) {
    EditorOptions result;
#if LAB_CHECKPOINT >= 12
    bool benchmarkOptionsOnly = true;
#endif
    for (int index = 1; index < argc; ++index) {
        const std::string_view option = argv[index];
#if LAB_CHECKPOINT >= 12
        if (option != "--benchmark" && option != "--grid" && option != "--hidden")
            benchmarkOptionsOnly = false;
#endif
        const auto next = [&]() -> std::string_view {
            if (index + 1 >= argc)
                throw std::invalid_argument("Missing option value");
            return argv[++index];
        };
        if (option == "--grid")
            result.samples = editorInteger(next(), 32, 192);
        else if (option == "--seconds")
            result.seconds = editorInteger(next(), 1, 120);
        else if (option == "--hidden")
            result.hidden = true;
#if LAB_CHECKPOINT >= 12
        else if (option == "--benchmark")
            result.benchmark = true;
#endif
        else if (option == "--verify")
            result.verify = true;
        else if (option == "--verify-edits")
            result.verifyEdits = true;
#if LAB_CHECKPOINT >= 11
        else if (option == "--verify-files")
            result.verifyFiles = true;
#endif
        else if (option == "--verify-slice") {
            result.verifySlice = true;
            result.showSlice = true;
        } else if (option == "--verify-scene")
            result.verifyScene = true;
        else if (option == "--verify-products")
            result.verifyProducts = true;
        else if (option == "--trace-input")
            result.traceInput = true;
        else if (option == "--radius")
            result.startingBrush.radius = editorRealOption(next(), 0.03F, 0.6F);
        else if (option == "--strength")
            result.startingBrush.strength = editorRealOption(next(), 0.01F, 0.8F);
        else if (option == "--depth")
            result.brushDepth = editorRealOption(next(), -1, 1);
        else if (option == "--subtract")
            result.startingBrush.mode = BrushMode::subtract;
        else if (option == "--plane")
            result.plane = true;
        else if (option == "--show-slice")
            result.showSlice = true;
        else if (option == "--capture")
            result.capture = pathFromUtf8(next());
#if LAB_CHECKPOINT >= 11
        else if (option == "--load")
            result.load = pathFromUtf8(next());
#endif
        else
            throw std::invalid_argument("Unknown sculpt option");
    }
#if LAB_CHECKPOINT >= 12
    if (result.benchmark && !benchmarkOptionsOnly)
        throw std::invalid_argument("Benchmark uses a fixed workload; only --grid and --hidden may accompany --benchmark");
#endif
    if (!result.capture.empty() && (result.verifyEdits || result.verifyFiles || result.verifyScene || result.verifyProducts))
        throw std::invalid_argument("Editing/file/scene/product fixtures cannot capture frames; run capture separately");
    if (result.verifyEdits && result.plane)
        throw std::invalid_argument("Editing fixtures require the sphere field preset");
    if (result.verifyFiles && (result.plane || result.verifyEdits))
        throw std::invalid_argument("File fixtures require their own unedited sphere preset");
    if ((result.verifyEdits || result.verifyFiles) && (result.verify || result.verifySlice))
        throw std::invalid_argument("Editing/file fixtures run separately from analytic/slice fixtures");
    if (result.verifyScene && (result.samples != 128 || result.plane || result.verify || result.verifySlice || result.verifyEdits || result.verifyFiles))
        throw std::invalid_argument("Scene lifecycle fixture starts at 128 samples and runs separately");
    if (result.verifyProducts && (result.plane || result.verify || result.verifySlice || result.verifyEdits || result.verifyFiles || result.verifyScene))
        throw std::invalid_argument("Brush product fixtures require their own sphere preset and run separately");
    if (!result.load.empty() && (result.plane || result.verify || result.verifyEdits || result.verifyFiles || result.verifySlice || result.verifyScene || result.verifyProducts))
        throw std::invalid_argument("Analytic field fixtures cannot validate an arbitrary loaded field");
    if (result.hidden && !result.verify && !result.verifyEdits && !result.verifyFiles && !result.verifySlice && !result.verifyScene && !result.verifyProducts && !result.benchmark && result.capture.empty() && result.seconds == 0)
        throw std::invalid_argument("Hidden run needs a finite verify/capture/seconds condition");
    return result;
}

} // namespace sculpt
