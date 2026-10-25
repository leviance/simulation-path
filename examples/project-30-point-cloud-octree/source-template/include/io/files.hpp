#pragma once
// Export tạo file mới, không tự ghi đè dữ liệu người học.
#include "csv.hpp"
#include "survey/statistics.hpp"
#include <filesystem>
#include <fstream>

namespace survey {
inline std::vector<Point> readCloudFile(const std::filesystem::path& path) {
    if (std::filesystem::file_size(path) > maximumCsvBytes) {
        throw std::runtime_error("CSV exceeds 16 MiB");
    }
    std::ifstream input(path, std::ios::binary);
    if (!input) {
        throw std::runtime_error("Cannot open CSV: " + path.string());
    }
    return readCsv(input);
}

inline void writeNewCloudFile(const std::filesystem::path& path, const std::vector<Point>& points) {
    if (std::filesystem::exists(path)) {
        throw std::runtime_error("File exists; choose another output path");
    }
    std::ofstream output(path, std::ios::binary);
    if (!output) {
        throw std::runtime_error("Cannot create CSV: " + path.string());
    }
    writeCsv(output, points);
    output.close();
    if (!output) {
        throw std::runtime_error("CSV flush/close failed");
    }
}

inline std::vector<Point> openDefaultCloud() {
    std::filesystem::create_directories(".runtime");
    const std::filesystem::path path = ".runtime/room-100000.csv";
    if (!std::filesystem::exists(path)) {
        writeNewCloudFile(path, makeRoom(100000));
    }
    auto points = readCloudFile(path);
    if (points.size() != 100000) {
        throw std::runtime_error("Default room CSV must contain 100000 points; use --input for other datasets");
    }
    return points;
}

// [snippet:exportSelection]
inline std::filesystem::path exportSelection(const std::vector<Point>& points, const Result& selected) {
#if LAB_CHECKPOINT >= 8
    std::filesystem::create_directories(".runtime");
    for (std::size_t suffix = 1; suffix <= 10000; ++suffix) {
        const std::filesystem::path path = ".runtime/selection-" + std::to_string(suffix) + ".csv";
        if (!std::filesystem::exists(path)) {
            writeNewCloudFile(path, selectedPoints(points, selected));
            return path;
        }
    }
    throw std::runtime_error("Export file budget exhausted");
#else
    static_cast<void>(points);
    static_cast<void>(selected);
    throw std::runtime_error("Export is introduced in lesson 08");
#endif
}

// [/snippet:exportSelection]
} // namespace survey
