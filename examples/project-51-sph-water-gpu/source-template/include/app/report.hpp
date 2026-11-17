#pragma once
#include "gpu/engine.hpp"
#include <fstream>
#include <iomanip>

namespace water51 {
// Report measured model and queue values, not an unverified workload label.

// [snippet report]
inline void writeReport(const Engine& e, const std::filesystem::path& file) {
    std::ostream* output = &std::cout;
    std::ofstream stream;
    if (!file.empty()) {
        stream.open(file);
        if (!stream)
            throw std::runtime_error("Cannot write report");
        output = &stream;
    }

    auto& out = *output;
    out << std::setprecision(10);
    out << "{\n";
    out << "  \"count\": " << e.model().count << ",\n";
    out << "  \"allocated\": " << e.model().count << ",\n";
    out << "  \"alive\": " << e.model().count << ",\n";
    out << "  \"updated\": " << e.meta().updated << ",\n";
    out << "  \"drawn\": " << e.model().count << ",\n";
    out << "  \"modelTime\": " << e.modelTime << ",\n";
    out << "  \"ticks\": " << e.ticks << ",\n";
    out << "  \"dt\": " << e.meta().dt << ",\n";
    out << "  \"massKg\": " << e.model().count * static_cast<double>(e.model().mass) << ",\n";
    out << "  \"rhoMin\": " << e.meta().minimumDensity << ",\n";
    out << "  \"rhoMax\": " << e.meta().maximumDensity << ",\n";
    out << "  \"leakage\": " << e.meta().leakage << ",\n";
    out << "  \"invalid\": " << e.meta().invalid << ",\n";
    out << "  \"flags\": " << e.meta().flags << ",\n";
    out << "  \"simulationBufferEstimate\": " << plannedBytes(e.model()) << ",\n";
    out << "  \"gpuBatchMs\": " << e.timing.total << ",\n";
    out << "  \"enqueueMs\": " << e.enqueueMs << ",\n";
    out << "  \"completionMs\": " << e.completionMs << ",\n";

    out << "  \"passesMs\": {";
    for (std::size_t i = 0; i < 5; ++i) {
        if (i > 0)
            out << ", ";
        out << '"' << phaseNames[i] << "\": " << e.timing.milliseconds[i];
    }
    out << "}\n}\n";
}

// [/snippet report]
} // namespace water51
