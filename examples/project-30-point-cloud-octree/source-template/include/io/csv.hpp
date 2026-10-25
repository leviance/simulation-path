#pragma once
// CSV v1: header id,x,y,z; mét, dấu chấm thập phân, ID uint32 duy nhất.
#include "model/dataset.hpp"
#include <charconv>
#include <iomanip>
#include <istream>
#include <limits>
#include <locale>
#include <ostream>
#include <string>
#include <string_view>
#include <unordered_set>

namespace survey {
inline constexpr std::size_t maximumCsvBytes = 16 * 1024 * 1024;

inline bool csvLine(std::istream& input, std::string& line, std::size_t& bytes) {
    line.clear();
    char character{};
    while (input.get(character)) {
        ++bytes;
        if (bytes > maximumCsvBytes) {
            throw std::runtime_error("CSV byte/line budget exceeded");
        }
        if (character == '\n') {
            break;
        }
        line.push_back(character);
        if (line.size() > 512) {
            throw std::runtime_error("CSV line budget exceeded");
        }
    }
    if (input.bad()) {
        throw std::runtime_error("CSV read failed");
    }
    if (!line.empty() && line.back() == '\r') {
        line.pop_back();
    }
    if (line.size() > 511) {
        throw std::runtime_error("CSV line budget exceeded");
    }
    return !line.empty() || !input.eof();
}

template <class Number>
inline Number csvNumber(std::string_view token) {
    Number value{};
    const auto parsed = std::from_chars(token.data(), token.data() + token.size(), value);
    if (parsed.ec != std::errc{} || parsed.ptr != token.data() + token.size()) {
        throw std::runtime_error("Invalid CSV number");
    }
    return value;
}

// [snippet:readCsv]
inline std::vector<Point> readCsv(std::istream& input) {
#if LAB_CHECKPOINT >= 1
    std::size_t bytes = 0;
    std::string line;
    if (!csvLine(input, line, bytes) || line != "id,x,y,z") {
        throw std::runtime_error("Expected CSV header id,x,y,z");
    }
    std::vector<Point> points;
    std::unordered_set<std::uint32_t> ids;
    std::size_t row = 1;
    while (csvLine(input, line, bytes)) {
        ++row;
        try {
            std::array<std::string_view, 4> fields{};
            std::size_t start = 0;
            for (std::size_t field = 0; field < 4; ++field) {
                const auto end = line.find(',', start);
                if ((field < 3 && end == std::string::npos) || (field == 3 && end != std::string::npos)) {
                    throw std::runtime_error("Expected exactly four fields");
                }
                std::size_t length = line.size() - start;
                if (end != std::string::npos) {
                    length = end - start;
                }
                fields[field] = std::string_view(line).substr(start, length);
                start += length + 1;
            }
            Point point{csvNumber<std::uint32_t>(fields[0]), {csvNumber<double>(fields[1]), csvNumber<double>(fields[2]), csvNumber<double>(fields[3])}};
            if (!finite(point.position) || std::max({std::abs(point.position.x), std::abs(point.position.y), std::abs(point.position.z)}) > 10000) {
                throw std::runtime_error("Coordinate must be finite, within +/-10000 metres");
            }
            if (points.size() >= maximumPoints || !ids.insert(point.id).second) {
                throw std::runtime_error("Duplicate ID or point budget exceeded");
            }
            points.push_back(point);
        } catch (const std::exception& error) {
            throw std::runtime_error("CSV row " + std::to_string(row) + ": " + error.what());
        }
    }
    return points;
#else
    static_cast<void>(input);
    return {};
#endif
}

// [/snippet:readCsv]

// [snippet:writeCsv]
inline void writeCsv(std::ostream& output, const std::vector<Point>& points) {
    output.imbue(std::locale::classic());
    output << std::setprecision(std::numeric_limits<double>::max_digits10);
    output << "id,x,y,z\n";
    for (const Point& point : points) {
        output << point.id << ',' << point.position.x << ',' << point.position.y << ',' << point.position.z << '\n';
    }
    if (!output) {
        throw std::runtime_error("CSV write failed");
    }
}

// [/snippet:writeCsv]
} // namespace survey
